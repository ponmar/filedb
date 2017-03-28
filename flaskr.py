import datetime
import math
import re
import os
from contextlib import closing
import sqlite3
from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, jsonify, send_from_directory, make_response
import jpegfile
from config import *
from werkzeug.routing import BaseConverter
from makeunicode import u


class IntListConverter(BaseConverter):
    regex = r'\d+(?:,\d+)*,?'

    def to_python(self, value):
        return [int(x) for x in value.split(',')]

    def to_url(self, value):
        return ','.join(str(x) for x in value)


# Create the application
app = Flask(__name__)
app.url_map.converters['int_list'] = IntListConverter
app.config.from_object(__name__)
app.config.from_envvar('FLASKR_SETTINGS', silent=True)


def connect_db():
    return sqlite3.connect(app.config['DATABASE'])


def init_db():
    with closing(connect_db()) as db:
        with app.open_resource(SQL_SCHEMA, mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()


#
# Database handle for every request
#

@app.before_request
def before_request():
    g.db = connect_db()
    # Needed for each connection to turn on the CASCADE feature for foreign leys when removing rows from tables.
    g.db.execute('PRAGMA foreign_keys = ON')


@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()


#
# Webapp
#

@app.route('/')
def app_index():
    return render_template('index.html')


@app.route('/files')
def app_files():
    if not session.get('logged_in'):
        return redirect(url_for('app_index'))
    cur = g.db.execute('select id, path, description, datetime from files order by path')
    files = [dict(id=row[0], path=row[1], description=row[2], datetime=row[3]) for row in cur.fetchall()]
    return render_template('files.html', files=files)


@app.route('/browse')
def app_browse():
    if not session.get('logged_in'):
        return redirect(url_for('app_index'))
    return render_template('browse.html')


@app.route('/categorize')
def app_categorize_files():
    return render_template('categorize.html')


@app.route('/categories')
def app_categories():
    if not session.get('logged_in'):
        return redirect(url_for('app_index'))
    return render_template('categories.html')


@app.route('/help')
def app_help():
    if not session.get('logged_in'):
        return redirect(url_for('app_index'))
    return render_template('help.html')


#
# API: add data
#

@app.route('/api/file', methods=['POST'])
def api_add_file():
    if not session.get('logged_in'):
        abort(401)
    path = get_path_from_form(request.form)
    description = get_form_str('description', request.form)
    if path is None:
        abort(409, 'No file path specified')
    if not add_file(path, description):
        abort(409, 'File not added')
    return create_files_added_response(1, 0)


def listdir(path):
    for f in os.listdir(path):
        if INCLUDE_HIDDEN_DIRECTORIES or not f.startswith('.'):
            yield f


@app.route('/api/directory', methods=['POST'])
def api_add_directory():
    if not session.get('logged_in'):
        abort(401)

    path = get_path_from_form(request.form)
    if path is None:
        abort(409, 'No directory path specified')

    directory_path = FILES_ROOT_DIRECTORY + '/' + path

    if path == '' or path == '.' or path == './' or not os.path.isdir(directory_path):
        abort(400, 'Specified path {} is not a directory within the {} directory'.format(path, FILES_ROOT_DIRECTORY))

    num_added_files = 0
    num_not_added_files = 0

    for new_file in listdir(directory_path):
        if add_file(path + '/' + new_file):
            num_added_files += 1
        else:
            num_not_added_files += 1

    return create_files_added_response(num_added_files, num_not_added_files)


@app.route('/api/import', methods=['POST'])
def api_import_files():
    if not session.get('logged_in'):
        abort(401)
    # Note: unicode is required to get unicode filename paths

    num_imported_files = 0
    num_not_imported_files = 0

    for root, directories, filenames in os.walk(u(FILES_ROOT_DIRECTORY)):
        for filename in filenames:
            filename_with_path = os.path.join(root, filename)
            filename_with_path = update_path(filename_with_path)
            filename_in_wanted_directory = '/'.join(filename_with_path.split('/')[1:])

            if add_file(filename_in_wanted_directory):
                app.logger.info('Imported file: ' + filename_in_wanted_directory)
                num_imported_files += 1
            else:
                app.logger.info('Could not import file: ' + filename_with_path)
                num_not_imported_files += 1

    return create_files_added_response(num_imported_files, num_not_imported_files)


def create_files_added_response(num_added_files, num_not_added_files):
    # TODO: remove message from JSON? It is no longer used by the javascript.
    return make_response(jsonify({'message': 'file(s) added',
                                  'num_added_files': num_added_files,
                                  'num_not_added_files': num_not_added_files}),
                         201)


def add_file(path, file_description=None):
    """Add file to database if possible.
    path is the path within the root directory with / as separator.
    """
    # TODO: check that path within files directory (enough to fail if ".." is included?)
    try:
        if file_is_blacklisted(path):
            app.logger.info('Ignored blacklisted file: ' + path)
            return False

        if not file_is_whitelisted(path):
            app.logger.info('Ignored non-whitelisted file: ' + path)
            return False

        file_path = FILES_ROOT_DIRECTORY + '/' + path

        # TODO: optimization: check that path not already in database before parsing Exif data etc.

        if not os.path.isfile(file_path):
            abort(400, 'No file with path "{}" within the "{}" directory'.format(path, FILES_ROOT_DIRECTORY))

        if file_description == '':
            file_description = None

        file_datetime = None
        file_latitude = None
        file_longitude = None

        if jpegfile.is_jpeg_file(file_path):
            # Read date and time from jpeg exif information
            try:
                jpeg = jpegfile.JpegFile(file_path)
                file_datetime = jpeg.get_date_time()
                file_latitude, file_longitude = jpeg.get_gps_position()
            except IOError:
                # Note: for some reason this happens for some working JPEG files, so the file should still be added
                app.logger.warning('Could not read Exif data from: ' + path)

        if file_datetime is None:
            # Try to read date from sub-path (part of the path within the configured files directory)
            file_datetime = get_date_from_path(path)

        cursor = g.db.cursor()
        cursor.execute('insert into files (path, description, datetime) values (?, ?, ?)',
                       [path, file_description, file_datetime])
        g.db.commit()

        if file_latitude is not None and file_longitude is not None:
            app.logger.info('Found GPS position in file: {} {}'.format(file_latitude, file_longitude))
            file_id = cursor.lastrowid
            add_file_location(file_id, float(file_latitude), float(file_longitude))
        return True

    except sqlite3.IntegrityError:
        return False


def add_file_location(file_id, file_latitude, file_longitude):
    cursor = g.db.execute('select id, position from locations')
    for row in cursor.fetchall():
        location_id = row[0]
        location_position = row[1]
        if location_position is not None:
            location_position_parts = location_position.split(' ')
            location_latitude = float(location_position_parts[0])
            location_longitude = float(location_position_parts[1])
            distance = get_gps_distance(file_latitude, file_longitude, location_latitude, location_longitude)
            if distance < FILE_TO_LOCATION_MAX_DISTANCE:
                try:
                    g.db.execute('insert into filelocations (fileid, locationid) values (?, ?)',
                                 (file_id, location_id))
                    g.db.commit()
                    app.logger.info('Nearby location set for file')

                except sqlite3.IntegrityError:
                    # File already connected to specified location
                    pass


def get_gps_distance(lat1, lon1, lat2, lon2):
    """Returns an approximated distance in meters between two GPS positions specified in longitude and latitude."""
    return math.sqrt(pow(lat1 - lat2, 2) + pow(lon1 - lon2, 2)) / 0.000008998719243599958


def get_date_from_path(path):
    match_obj = re.search(r'\d{4}-\d{2}-\d{2}', path)
    if match_obj:
        return match_obj.group()
    return None


def file_is_blacklisted(file_path):
    for pattern in BLACKLISTED_FILE_PATH_PATTERNS:
        if file_path.find(pattern) != -1:
            return True
    return False


def file_is_whitelisted(file_path):
    if not WHITELISTED_FILE_EXTENSIONS:
        return True

    file_path = file_path.lower()

    for pattern in WHITELISTED_FILE_EXTENSIONS:
        if file_path.endswith(pattern):
            return True

    return False


def get_form_str(param_name, form, min_length=1, max_length=100):
    if param_name in form:
        param_value = form[param_name]
        if len(param_value) in range(min_length, max_length + 1):
            return param_value
    return None


def get_path_from_form(form):
    path = get_form_str('path', form)
    if path is None:
        return None
    return update_path(path)


def update_path(path):
    # Internal paths should always use "/" as directory separator
    path = path.replace('\\', '/')

    # This is so that not both file ./file.jpg and file.jpg can be treated
    # as different files
    IGNORED_PREFIX = './'
    if path.startswith(IGNORED_PREFIX):
        path = path[len(IGNORED_PREFIX):]

    return path


@app.route('/api/person', methods=['POST'])
def api_add_person():
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    firstname = content['firstname']
    lastname = content['lastname']
    description = content['description']
    dateofbirth = content['dateofbirth']

    if firstname is None:
        abort(400, 'Person firstname not specified')
    if lastname is None:
        abort(400, 'Person lastname not specified')
    # Note: description is optional
    if dateofbirth is not None and not is_date_format(dateofbirth):
        abort(400, 'Invalid date of birth format')

    try:
        cursor = g.db.cursor()
        cursor.execute('insert into persons (firstname, lastname, description, dateofbirth) values (?, ?, ?, ?)',
                       [firstname, lastname, description, dateofbirth])
        g.db.commit()
        return make_response(get_person_json(cursor.lastrowid), 201)

    except sqlite3.IntegrityError:
        abort(409)


def is_date_format(text):
    # Required format: YYYY-MM-DD
    try:
        datetime.datetime.strptime(text, '%Y-%m-%d')
        return True
    except ValueError:
        return False


def is_date_and_time_format(text):
    # Required format: YYYY-MM-DDTHH:MM:SS
    try:
        datetime.datetime.strptime(text, '%Y-%m-%dT%H:%M:%S')
        return True
    except ValueError:
        return False


@app.route('/api/location', methods=['POST'])
def api_add_location():
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    name = content['name']
    description = content['description']
    position = content['position']

    if name is None:
        abort(400, 'Location name not specified')

    # TODO: validate position format if specified

    try:
        cursor = g.db.cursor()
        cursor.execute('insert into locations (name, description, position) values (?, ?, ?)',
                       [name, description, position])
        g.db.commit()
        return make_response(get_location_json(cursor.lastrowid), 201)
    except sqlite3.IntegrityError:
        abort(409)


@app.route('/api/tag', methods=['POST'])
def api_add_tag():
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    name = content['name']

    if name is None:
        abort(400, 'Tag name not specified')

    try:
        cursor = g.db.cursor()
        cursor.execute('insert into tags (name) values (?)', [name])
        g.db.commit()
        return make_response(get_tag_json(cursor.lastrowid), 201)
    except sqlite3.IntegrityError:
        abort(409)


#
# API: modify data (internally rows are deleted from tables, but in the API it looks like a file item is modified)
#

@app.route('/api/file/<int:file_id>', methods=['PUT'])
def api_update_file(file_id):
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    cursor = g.db.cursor()

    try:
        if 'persons' in content:
            person_ids = content['persons']
            cursor.execute('delete from filepersons where fileid = ?', (file_id,))
            for person_id in person_ids:
                cursor.execute('insert into filepersons (fileid, personid) values (?, ?)', (file_id, person_id))

        if 'locations' in content:
            location_ids = content['locations']
            cursor.execute('delete from filelocations where fileid = ?', (file_id,))
            for location_id in location_ids:
                cursor.execute('insert into filelocations (fileid, locationid) values (?, ?)', (file_id, location_id))

        if 'tags' in content:
            tag_ids = content['tags']
            cursor.execute('delete from filetags where fileid = ?', (file_id,))
            for tag_id in tag_ids:
                cursor.execute('insert into filetags (fileid, tagid) values (?, ?)', (file_id, tag_id))

        if 'description' in content:
            description = content['description']
            if description is not None:
                cursor.execute("update files set description = '" + description + "' where id = " + str(file_id))
            else:
                cursor.execute("update files set description = null where id = " + str(file_id))

        if 'datetime' in content:
            datetime = content['datetime']
            if datetime is not None:
                if not is_date_format(datetime) and not is_date_and_time_format(datetime):
                    abort(400, 'Invalid datetime format')
                cursor.execute("update files set datetime = '" + datetime + "' where id = " + str(file_id))
            else:
                cursor.execute("update files set datetime = null where id = " + str(file_id))

        g.db.commit()

    except sqlite3.IntegrityError:
        abort(409)
    return make_response(get_file_json(file_id), 201)


@app.route('/api/person/<int:person_id>', methods=['PUT'])
def api_update_person(person_id):
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    cursor = g.db.cursor()
    try:
        if 'firstname' in content:
            firstname = content['firstname']
            cursor.execute("update persons set firstname = ? where id = ?", (firstname, person_id))

        if 'lastname' in content:
            lastname = content['lastname']
            cursor.execute("update persons set lastname = ? where id = ?", (lastname, person_id))

        if 'description' in content:
            description = content['description']
            cursor.execute("update persons set description = ? where id = ?", (description, person_id))

        if 'dateofbirth' in content:
            dateofbirth = content['dateofbirth']
            if dateofbirth is not None and not is_date_format(dateofbirth):
                abort(400, 'Invalid date of birth format')
            cursor.execute("update persons set dateofbirth = ? where id = ?", (dateofbirth, person_id))

        g.db.commit()

    except sqlite3.IntegrityError:
        abort(409)

    person_dict = get_person_dict(person_id)
    if person_dict is None:
        abort(404)

    return make_response(jsonify(person_dict), 201)


@app.route('/api/location/<int:location_id>', methods=['PUT'])
def api_update_location(location_id):
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    cursor = g.db.cursor()
    try:
        if 'name' in content:
            name = content['name']
            cursor.execute("update locations set name = ? where id = ?", (name, location_id))

        if 'description' in content:
            description = content['description']
            cursor.execute("update locations set description = ? where id = ?", (description, location_id))

        if 'position' in content:
            position = content['position']
            # TODO: validate position format if specified
            cursor.execute("update locations set position = ? where id = ?", (position, location_id))

        g.db.commit()

    except sqlite3.IntegrityError:
        abort(409)

    location_dict = get_location_dict(location_id)
    if location_dict is None:
        abort(404)

    return make_response(jsonify(location_dict), 201)


@app.route('/api/tag/<int:tag_id>', methods=['PUT'])
def api_update_tag(tag_id):
    if not session.get('logged_in'):
        abort(401)

    content = request.get_json(silent=True)
    cursor = g.db.cursor()
    try:
        if 'name' in content:
            name = content['name']
            cursor.execute("update tags set name = ? where id = ?", (name, tag_id))

        g.db.commit()

    except sqlite3.IntegrityError:
        abort(409)

    tag_dict = get_tag_dict(tag_id)
    if tag_dict is None:
        abort(404)
    return make_response(jsonify(tag_dict), 201)


#
# API: delete data
#

@app.route('/api/file/<int:id>', methods=['DELETE'])
def api_remove_file(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from files where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/person/<int:id>', methods=['DELETE'])
def api_remove_person(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from persons where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/location/<int:id>', methods=['DELETE'])
def api_remove_location(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from locations where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/tag/<int:id>', methods=['DELETE'])
def api_remove_tag(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from tags where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


#
# API: get JSON with many items
#

# TODO: use int_list for personids, locationids and tagids?
@app.route('/api/files', methods=['GET'])
def api_get_json_files():
    if not session.get('logged_in'):
        abort(401)

    # TODO: input validation needed?
    person_ids = request.args.get('personids')
    location_ids = request.args.get('locationids')
    tag_ids = request.args.get('tagids')

    if person_ids is None:
        person_ids = ""
    if location_ids is None:
        location_ids = ""
    if tag_ids is None:
        tag_ids = ""

    query = 'select id from files '
    if person_ids:
        query += 'inner join filepersons on files.id = filepersons.fileid '
    if location_ids:
        query += 'inner join filelocations on files.id = filelocations.fileid '
    if tag_ids:
        query += 'inner join filetags on files.id = filetags.fileid '

    where_statements = []
    if person_ids:
        where_statements.append('filepersons.personid in (' + person_ids + ')')
    if location_ids:
        where_statements.append('filelocations.locationid in (' + location_ids + ')')
    if tag_ids:
        where_statements.append('filetags.tagid in (' + tag_ids + ')')

    if len(where_statements) > 0:
        query += 'where ' + ' and '.join(where_statements)

    cursor = g.db.execute(query)

    files = []
    for row in cursor.fetchall():
        file_json = get_file_dict(row[0])
        files.append(file_json)

    return jsonify(dict(files=files))


@app.route('/api/files_by_path/<path_regexp>', methods=['GET'])
def api_get_json_files_by_path(path_regexp):
    if not session.get('logged_in'):
        abort(401)

    prog = re.compile(path_regexp, re.IGNORECASE)
    files = []
    cur = g.db.execute('select id, path from files')
    
    for row in cur.fetchall():
        if prog.search(row[1]):
            files.append(get_file_dict(row[0]))
    
    return jsonify(dict(files=files))


@app.route('/api/files_by_description/<description_regexp>', methods=['GET'])
def api_get_json_files_by_description(description_regexp):
    if not session.get('logged_in'):
        abort(401)

    prog = re.compile(description_regexp, re.IGNORECASE)
    files = []
    cur = g.db.execute('select id, description from files')
    
    for row in cur.fetchall():
        file_description = row[1]
        if file_description is not None and prog.search(file_description):
            files.append(get_file_dict(row[0]))
    
    return jsonify(dict(files=files))


@app.route('/api/files_by_datetime/<datetime_regexp>', methods=['GET'])
def api_get_json_files_by_datetime(datetime_regexp):
    if not session.get('logged_in'):
        abort(401)

    prog = re.compile(datetime_regexp, re.IGNORECASE)
    files = []
    cur = g.db.execute('select id, datetime from files')
    
    for row in cur.fetchall():
        file_datetime = row[1]
        if file_datetime is not None and prog.search(file_datetime):
            files.append(get_file_dict(row[0]))
    
    return jsonify(dict(files=files))
    
@app.route('/api/persons', methods=['GET'])
def api_get_json_persons():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, firstname, lastname, description, dateofbirth from persons')
    persons = [dict(id=row[0], firstname=row[1], lastname=row[2], description=row[3], dateofbirth=row[4]) for row in cur.fetchall()]

    return jsonify(dict(persons=persons))


@app.route('/api/locations', methods=['GET'])
def api_get_json_locations():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name, description, position from locations')
    locations = [dict(id=row[0], name=row[1], description=row[2], position=row[3]) for row in cur.fetchall()]

    return jsonify(dict(locations=locations))


@app.route('/api/tags', methods=['GET'])
def api_get_json_tags():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name from tags')
    tags = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

    return jsonify(dict(tags=tags))


#
# API: get JSON with one specific item
#

def get_file_dict(file_id = None, file_path = None):
    row = None
    if file_id is not None:
        cur = g.db.execute('select id, path, description, datetime from files where id = ?', (file_id,))
        row = cur.fetchone()
    elif file_path is not None:
        cur = g.db.execute('select id, path, description, datetime from files where path = ?', (file_path,))
        row = cur.fetchone()

    if row is None:
        return None

    if file_id is None:
        # Needed if the path argument was used in the URL
        file_id = row[0]

    cur = g.db.execute('select personid from filepersons where fileid = ?', (file_id,))
    person_ids = [filepersons_row[0] for filepersons_row in cur.fetchall()]

    cur = g.db.execute('select locationid from filelocations where fileid = ?', (file_id,))
    location_ids = [filelocations_row[0] for filelocations_row in cur.fetchall()]

    cur = g.db.execute('select tagid from filetags where fileid = ?', (file_id,))
    tag_ids = [filetags_row[0] for filetags_row in cur.fetchall()]

    return dict(id=row[0], path=row[1], description=row[2], datetime=row[3], persons=person_ids, locations=location_ids, tags=tag_ids)


def get_file_json(file_id = None, file_path = None):
    return jsonify(get_file_dict(file_id, file_path))


@app.route('/api/file_by_path/<path>', methods=['GET'])
def api_json_file_by_path(path):
    if not session.get('logged_in'):
        abort(401)
    file_json = get_file_json(file_path=path)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/api/file/<int:id>', methods=['GET'])
def api_json_file_by_id(id):
    if not session.get('logged_in'):
        abort(401)
    file_json = get_file_json(file_id=id)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/api/person/<int:id>', methods=['GET'])
def api_get_json_person(id):
    if not session.get('logged_in'):
        abort(401)
    person_dict = get_person_dict(id)
    if person_dict is None:
        abort(404)
    return jsonify(person_dict)


def get_person_dict(person_id):
    cur = g.db.execute('select id, firstname, lastname, description, dateofbirth from persons where id = ?', (person_id,))
    row = cur.fetchone()
    if row is not None:
        return dict(id=row[0], firstname=row[1], lastname=row[2], description=row[3], dateofbirth=row[4])
    else:
        return None


def get_person_json(person_id):
    return jsonify(get_person_dict(person_id))


@app.route('/api/location/<int:id>', methods=['GET'])
def api_get_json_location(id):
    if not session.get('logged_in'):
        abort(401)

    location_dict = get_location_dict(id)
    if location_dict is None:
        abort(404)

    return jsonify(location_dict)


def get_location_dict(location_id):
    cur = g.db.execute('select id, name, description, position from locations where id = ?', (location_id,))
    row = cur.fetchone()
    if row is not None:
        return dict(id=row[0], name=row[1], description=row[2], position=row[3])
    else:
        return None


def get_location_json(location_id):
    return jsonify(get_location_dict(location_id))


@app.route('/api/tag/<int:id>', methods=['GET'])
def api_get_json_tag(id):
    if not session.get('logged_in'):
        abort(401)
    tag_dict = get_tag_dict(id)
    if tag_dict is None:
        abort(404)
    return jsonify(tag_dict)


def get_tag_dict(tag_id):
    cur = g.db.execute('select id, name from tags where id = ?', (tag_id,))
    row = cur.fetchone()
    if row is not None:
        return dict(id=row[0], name=row[1])
    else:
        return None


def get_tag_json(tag_id):
    return jsonify(get_tag_dict(tag_id))


@app.route('/api/filecontent/<int:id>', methods=['GET'])
def api_get_file_content(id):
    """Note: this function reads data from files collection."""
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select path from files where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    file_path = row[0]
    return send_from_directory(FILES_ROOT_DIRECTORY, file_path)


@app.route('/api/fileconsistency', methods=['GET'])
def api_fileconsistency():
    if not session.get('logged_in'):
        abort(401)
    missing_files = []
    cur = g.db.execute('select path, id from files')
    for file_path, file_id in cur.fetchall():
        file_path = FILES_ROOT_DIRECTORY + '/' + file_path
        if not os.path.isfile(file_path):
            missing_files.append(get_file_dict(file_id))

    return jsonify(dict(missing_files=missing_files))


@app.route('/api/fileexif/<int:file_id>', methods=['GET'])
def api_get_json_file_exif(file_id):
    """Note: this function reads data from files collection."""
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select path from files where id = ?', (file_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    file_path = FILES_ROOT_DIRECTORY + '/' + row[0]
    jpeg = jpegfile.JpegFile(file_path)
    return jsonify(jpeg.get_exif_data())


#
# Auth
#

def login(username, password):
    logged_in = app.config['USERNAME'] and password == app.config['PASSWORD']
    if logged_in:
        session['logged_in'] = True
    return logged_in


def logout():
    session.pop('logged_in', None)


@app.route('/app_login', methods=['POST'])
def app_login():
    login(request.form['username'],
          request.form['password'])
    return redirect(url_for('app_index'))


@app.route('/app_logout', methods=['GET'])
def app_logout():
    logout()
    return redirect(url_for('app_index'))


@app.route('/api/login', methods=['POST'])
def api_login():
    if not login(request.form['username'],
                 request.form['password']):
        abort(401)
    return "OK"


@app.route('/api/logout')
def api_logout():
    logout()
    return "OK"
