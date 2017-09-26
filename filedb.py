import datetime
import math
import re
import os
import io
import zipfile
import time
from contextlib import closing
import sqlite3
from flask import Flask, request, session, g, url_for, \
     abort, render_template, jsonify, send_from_directory, make_response, \
     send_file
import jpegfile
from werkzeug.routing import BaseConverter
from makeunicode import u


# Create the application
app = Flask(__name__)


def connect_db():
    return sqlite3.connect(app.config['DATABASE'])


def init_db():
    with closing(connect_db()) as db:
        with app.open_resource(app.config['SQL_SCHEMA'], mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

        
def get_file_abs_path(internal_path):
    return app.config['FILES_ROOT_DIRECTORY'] + '/' + internal_path


def get_file_directory_path(internal_path):
    last_slash_index = internal_path.rfind('/')
    if last_slash_index == -1:
        return ''
    return internal_path[:last_slash_index]


def is_hidden_path(internal_path):
    """Returns if the specified path includes a hidden directory or file."""
    return internal_path.startswith('.') or '/.' in internal_path
    

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
    cur = g.db.execute('select id, path, description, datetime from files order by path')
    files = [dict(id=row[0], path=row[1], description=row[2], datetime=row[3]) for row in cur.fetchall()]
    return render_template('files.html', files=files)


@app.route('/browse')
def app_browse():
    return render_template('browse.html')


@app.route('/categorize')
def app_categorize_files():
    return render_template('categorize.html')


@app.route('/categories')
def app_categories():
    return render_template('categories.html')


@app.route('/help')
def app_help():
    return render_template('help.html')


@app.route('/images/<path:path>')
def app_images_route(path):
    # Needed to put Lightbox images in a custom path
    return send_from_directory('static/images', path)


#
# API: add data
#

@app.route('/api/file', methods=['POST'])
def api_add_file():
    content = request.get_json(silent=True)
    path = content['path']
    description = content['description']
    if path is None:
        abort(409, 'No file path specified')
    if not add_file(path, description):
        abort(409, 'File not added')
    return create_files_added_response(1, 0)


def listdir(path):
    for f in os.listdir(path):
        if app.config['INCLUDE_HIDDEN_DIRECTORIES'] or not is_hidden_path(f):
            yield f


@app.route('/api/directory', methods=['POST'])
def api_add_directory():
    content = request.get_json(silent=True)
    path = content['path']
    if path is None:
        abort(409, 'No directory path specified')
    directory_path = get_file_abs_path(path)

    if path == '' or path == '.' or path == './' or not os.path.isdir(directory_path):
        abort(400, 'Specified path {} is not a directory within the {} directory'.format(path, app.config['FILES_ROOT_DIRECTORY']))

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
    # Note: unicode is required to get unicode filename paths

    num_imported_files = 0
    num_not_imported_files = 0

    for root, directories, filenames in os.walk(u(app.config['FILES_ROOT_DIRECTORY'])):
        for filename in filenames:
            filename_with_path = os.path.join(root, filename)
            filename_with_path = update_path(filename_with_path)
            
            if app.config['INCLUDE_HIDDEN_DIRECTORIES'] or not is_hidden_path(filename_with_path):
                filename_in_wanted_directory = filename_with_path.split('/', 1)[1]

                if add_file(filename_in_wanted_directory):
                    app.logger.info('Imported file: ' + filename_in_wanted_directory)
                    num_imported_files += 1
                else:
                    app.logger.info('Could not import file: ' + filename_with_path)
                    num_not_imported_files += 1

    return create_files_added_response(num_imported_files, num_not_imported_files)


def create_files_added_response(num_added_files, num_not_added_files):
    return make_response(jsonify({'num_added_files': num_added_files,
                                  'num_not_added_files': num_not_added_files}),
                         201)


def add_file(path, file_description=None):
    """Add file to database if possible.
    path is the path within the root directory with / as separator.
    """
    # TODO: check that path within files directory (enough to fail if ".." is included?)
    try:
        if path_is_blacklisted(path):
            app.logger.info('Ignored blacklisted file: ' + path)
            return False

        if not file_is_whitelisted(path):
            app.logger.info('Ignored non-whitelisted file: ' + path)
            return False

        # Check if file already added before starting to parse possible Exif date etc.
        if g.db.execute("select count(*) from files where path=?", (path, )).fetchone()[0] > 0:
            app.logger.info('Ignored already added file: ' + path)
            return False

        file_path = get_file_abs_path(path)

        if not os.path.isfile(file_path):
            abort(400, 'No file with path "{}" within the "{}" directory'.format(path, app.config['FILES_ROOT_DIRECTORY']))

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
            location_latitude, location_longitude = parse_position(location_position)
            distance = get_gps_distance(file_latitude, file_longitude, location_latitude, location_longitude)
            if distance < app.config['FILE_TO_LOCATION_MAX_DISTANCE']:
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


def path_is_blacklisted(path):
    for pattern in app.config['BLACKLISTED_FILE_PATH_PATTERNS']:
        if path.find(pattern) != -1:
            return True
    return False


def file_is_whitelisted(file_path):
    if not app.config['WHITELISTED_FILE_EXTENSIONS']:
        return True

    file_path = file_path.lower()

    for pattern in app.config['WHITELISTED_FILE_EXTENSIONS']:
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


#@app.route('/api/exportzip', methods=['GET'])
@app.route('/api/exportzip', methods=['POST'])
def api_export_zip():
    content = request.get_json(silent=True)
    file_ids = content['files']
    #file_ids = [1, 2, 3]
    
    if app.config['EXPORTED_ZIP_MAX_NUM_FILES'] is not None and len(file_ids) > app.config['EXPORTED_ZIP_MAX_NUM_FILES']:
        abort(400, 'Too many files specified')
    
    cursor = g.db.cursor()
    cursor.execute('select path from files where id in (' + ','.join(str(x) for x in file_ids) + ')') # TODO: make separate argument to avoid sql injection

    file_paths = []
    for row in cursor.fetchall():
        file_path = row[0]
        file_paths.append(file_path)
    
    if len(file_paths) != len(file_ids):
        abort(400, 'Specified file ids not in database')
    
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        zf.comment = app.config['EXPORTED_ZIP_COMMENT']
        for file_path in file_paths:
            file_abs_path = get_file_abs_path(file_path)
            try:
                data = open(file_abs_path, 'rb').read()
                file_datetime = os.path.getmtime(file_abs_path)
                
                zip_info = zipfile.ZipInfo(file_path)
                zip_info.date_time = time.localtime(file_datetime)[:6]
                zip_info.compress_type = zipfile.ZIP_DEFLATED
                zf.writestr(zip_info, data)
            except IOError:
                abort(404, 'File not found: ' + file_abs_path)

    memory_file.seek(0)
    return send_file(memory_file, attachment_filename='files.zip', as_attachment=True)


@app.route('/api/exportabspaths', methods=['POST'])
def api_export_absolute_paths():
    content = request.get_json(silent=True)
    #print('JSON: ' + str(content))
    file_ids = content['files']
    #file_ids = [1, 2, 3]
    return export_paths(file_ids, True)

    
@app.route('/api/exportpaths', methods=['POST'])
def api_export_paths():
    content = request.get_json(silent=True)
    file_ids = content['files']
    #file_ids = [1, 2, 3]
    return export_paths(file_ids, False)


def export_paths(file_ids, absolute):
    cursor = g.db.cursor()
    cursor.execute('select path from files where id in (' + ','.join(str(x) for x in file_ids) + ')') # TODO: make separate argument to avoid sql injection
    file_paths = []
    for row in cursor.fetchall():
        if absolute:
            file_paths.append(get_file_abs_path(row[0]))
        else:
            file_paths.append(row[0])
    return '\n'.join(file_paths)


@app.route('/api/person', methods=['POST'])
def api_add_person():
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


def is_year_format(text):
    # Required format: YYYY
    try:
        datetime.datetime.strptime(text, '%Y')
        return True
    except ValueError:
        return False


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


def is_position(text):
    # Required format: <latitude> <longitude>
    return parse_position(text) is not None

        
def parse_position(text):
    # Required format: <latitude> <longitude>
    parts = text.split(' ')
    if len(parts) == 2:
        try:
            return float(parts[0]), float(parts[1])
        except ValueError:
            pass
    return None


@app.route('/api/location', methods=['POST'])
def api_add_location():
    content = request.get_json(silent=True)
    name = content['name']
    description = content['description']
    position = content['position']

    if name is None:
        abort(400, 'Location name not specified')

    if position is not None and not is_position(position):
        abort(400, 'Invalid position specified')

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
                cursor.execute("update files set description = ? where id = ?", (description, file_id))
            else:
                cursor.execute("update files set description = null where id = ?", (file_id,))

        if 'datetime' in content:
            datetime = content['datetime']
            if datetime is not None:
                if not is_year_format(datetime) and not is_date_format(datetime) and not is_date_and_time_format(datetime):
                    abort(400, 'Invalid datetime format')
                cursor.execute("update files set datetime = ? where id = ?", (datetime, file_id))
            else:
                cursor.execute("update files set datetime = null where id = ?", (file_id,))

        g.db.commit()

    except sqlite3.IntegrityError:
        abort(409)
    return make_response(get_file_json(file_id), 201)


@app.route('/api/person/<int:person_id>', methods=['PUT'])
def api_update_person(person_id):
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
            if not is_position(position):
                abort(400, 'Invalid position specified')
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
    try:
        g.db.execute('delete from files where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/directory', methods=['DELETE'])
def api_remove_directory():
    content = request.get_json(silent=True)
    directory_path = content['path']
    cur = g.db.execute('select id, path from files')
    files_to_remove = []
    for row in cur.fetchall():
        file_path = row[1]
        file_directory_path = get_file_directory_path(file_path)
        if directory_path == file_directory_path:
            file_id = row[0]
            #print('Remove {} {}'.format(file_id, file_path))
            files_to_remove.append(file_id)
    
    try:    
        for file_to_remove in files_to_remove:
            g.db.execute('delete from files where id = ?', (file_to_remove,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)

    return make_response(jsonify({'num_deleted_files': len(files_to_remove)}),
                         201)


@app.route('/api/person/<int:id>', methods=['DELETE'])
def api_remove_person(id):
    try:
        g.db.execute('delete from persons where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/location/<int:id>', methods=['DELETE'])
def api_remove_location(id):
    try:
        g.db.execute('delete from locations where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/tag/<int:id>', methods=['DELETE'])
def api_remove_tag(id):
    try:
        g.db.execute('delete from tags where id = ?', (id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


#
# API: get JSON with many items
#

@app.route('/api/directories', methods=['GET'])
def api_get_json_directories():
    """Returns the directories that files have been added from."""
    directories = set()
    cur = g.db.execute('select path from files')
    for row in cur.fetchall():
        path_parts = row[0].rsplit('/', 1)
        if len(path_parts) > 1:
            directories.add(path_parts[0])
                
    return jsonify(dict(directories=sorted(directories)))


@app.route('/api/fs_directories', methods=['GET'])
def api_get_json_fs_directories():
    """Returns all non-blacklisted directories within the configured root directory."""
    directories = []
    for root, _, _ in os.walk(u(app.config['FILES_ROOT_DIRECTORY'])):
        path = update_path(root)
        if path != app.config['FILES_ROOT_DIRECTORY']:
            if '/' in path:
                # Remove root dir prefix from path
                path = path.split('/', 1)[1]
            if not path_is_blacklisted(path):
                directories.append(path)

    return jsonify(dict(directories=directories))

    
@app.route('/api/randomfiles/<int(min=1, max=10):numfiles>', methods=['GET', 'POST'])
def api_get_json_random_files(numfiles):
    cursor = g.db.execute('select id from files order by random() limit {}'.format(numfiles))

    files = []
    for row in cursor.fetchall():
        file_json = get_file_dict(row[0])
        files.append(file_json)

    cursor = g.db.execute('select count(*) from files')
    total_num_files = cursor.fetchone()[0]
        
    return jsonify(dict(files=files, total_num_files=total_num_files))


@app.route('/api/files', methods=['GET'])
def api_get_json_files():
    """All specified arguments must match to return a specific file.

    To find files with either, for example, one specific person or one
    specific location; use two request to this API call and merge the result.
    """
    # All arguments are optional
    person_ids = None
    location_ids = None
    tag_ids = None
    path_regexp = None
    description_regexp = None
    datetime_regexp = None
        
    # TODO: input validation needed?
    # Note that request.args.get(...) returns an empty string if the value is empty in the URL
    if 'personids' in request.args:
        person_ids = request.args.get('personids')
    if 'locationids' in request.args:
        location_ids = request.args.get('locationids')
    if 'tagids' in request.args:
        tag_ids = request.args.get('tagids')    
    if 'pathregexp' in request.args:
        path_regexp = request.args['pathregexp']
    if 'descriptionregexp' in request.args:
        description_regexp = request.args['descriptionregexp']
    if 'datetimeregexp' in request.args:
        datetime_regexp = request.args['datetimeregexp']

    path_prog = None
    if path_regexp:
        path_prog = re.compile(path_regexp, re.IGNORECASE)

    description_prog = None
    if description_regexp:
        description_prog = re.compile(description_regexp, re.IGNORECASE)

    datetime_prog = None
    if datetime_regexp:
        print('received datetime_regexp')
        datetime_prog = re.compile(datetime_regexp, re.IGNORECASE)
    
    # TODO: optimize needed data depending on specified arguments?
    sub_queries = []
    if person_ids:
        sub_queries.append('select id, path, description, datetime from files inner join filepersons on files.id = filepersons.fileid where filepersons.personid in (' + person_ids + ')')
    if location_ids:
        sub_queries.append('select id, path, description, datetime from files inner join filelocations on files.id = filelocations.fileid where filelocations.locationid in (' + location_ids + ')')
    if tag_ids:
        sub_queries.append('select id, path, description, datetime from files inner join filetags on files.id = filetags.fileid where filetags.tagid in (' + tag_ids + ')')
       
    query = None
    if len(sub_queries) == 0:
        query = 'select id, path, description, datetime from files'
    else:
        query = ' intersect '.join(sub_queries)
    
    #print(query)
        
    cursor = g.db.execute(query)

    files = []
    for row in cursor.fetchall():
        if path_prog is not None and not path_prog.search(row[1]):
            continue
        if description_prog is not None:
            if row[2] is None or not description_prog.search(row[2]):
                continue
        if datetime_prog is not None:
            if row[3] is None or not datetime_prog.search(row[3]):
                continue

        file_json = get_file_dict(row[0])
        files.append(file_json)
    files.sort(key=lambda file: file['path'])
        
    cursor = g.db.execute('select count(*) from files')
    total_num_files = cursor.fetchone()[0]
        
    return jsonify(dict(files=files, total_num_files=total_num_files))

    
def get_order_str(args, valid_orderby_values):
    if 'orderby' not in args:
        return None
    orderby = args['orderby']
    if orderby not in valid_orderby_values:
        return None
    order = 'asc'
    if 'order' in args:
        order = args['order']
        if order not in ('asc', 'desc'):
            return None
    return ' order by {} {}'.format(orderby, order)


@app.route('/api/persons', methods=['GET'])
def api_get_json_persons():
    order_str = get_order_str(request.args, ('firstname', 'lastname', 'description', 'dateofbirth'))
    query = 'select id, firstname, lastname, description, dateofbirth from persons'
    if order_str is not None:
        query = query + order_str
    cur = g.db.execute(query)
    persons = [dict(id=row[0], firstname=row[1], lastname=row[2], description=row[3], dateofbirth=row[4]) for row in cur.fetchall()]

    return jsonify(dict(persons=persons))


@app.route('/api/locations', methods=['GET'])
def api_get_json_locations():
    order_str = get_order_str(request.args, ('name', 'description'))
    query = 'select id, name, description, position from locations'
    if order_str is not None:
        query = query + order_str
    cur = g.db.execute(query)
    locations = [dict(id=row[0], name=row[1], description=row[2], position=row[3]) for row in cur.fetchall()]

    return jsonify(dict(locations=locations))


@app.route('/api/tags', methods=['GET'])
def api_get_json_tags():
    order_str = get_order_str(request.args, ('name',))
    query = 'select id, name from tags'
    if order_str is not None:
        query = query + order_str
    cur = g.db.execute(query)
    tags = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

    return jsonify(dict(tags=tags))


#
# API: get JSON with one specific item
#

def get_file_dict(file_id):
    cur = g.db.execute('select id, path, description, datetime from files where id = ?', (file_id,))
    row = cur.fetchone()
    if row is None:
        return None

    cur = g.db.execute('select personid from filepersons where fileid = ?', (file_id,))
    person_ids = [filepersons_row[0] for filepersons_row in cur.fetchall()]

    cur = g.db.execute('select locationid from filelocations where fileid = ?', (file_id,))
    location_ids = [filelocations_row[0] for filelocations_row in cur.fetchall()]

    cur = g.db.execute('select tagid from filetags where fileid = ?', (file_id,))
    tag_ids = [filetags_row[0] for filetags_row in cur.fetchall()]

    return dict(id=row[0], path=row[1], description=row[2], datetime=row[3], persons=person_ids, locations=location_ids, tags=tag_ids)


def get_file_json(file_id):
    return jsonify(get_file_dict(file_id))


@app.route('/api/file/<int:id>', methods=['GET'])
def api_json_file_by_id(id):
    file_json = get_file_json(id)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/api/randomfile/', methods=['GET', 'POST'])
def api_random_json_file():
    cur = g.db.execute('select id from files order by random() limit 1')
    id = cur.fetchone()[0]
    file_json = get_file_json(id)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/api/person/<int:id>', methods=['GET'])
def api_get_json_person(id):
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
    cur = g.db.execute('select path from files where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    file_path = row[0]
    return send_from_directory(app.config['FILES_ROOT_DIRECTORY'], file_path)


@app.route('/api/thumbnail/<int:id>', methods=['GET'])
def api_create_file_thumbnail(id):
    """Note: this function reads data from files collection."""
    cur = g.db.execute('select path from files where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)

    size = app.config['DEFAULT_THUMBNAIL_SIZE']
        
    if 'width' in request.args:
        size = int(request.args.get('width')), size[1]

    if 'height' in request.args:
        size = size[0], int(request.args.get('height'))

    file_path = get_file_abs_path(row[0])
    thumbnail = jpegfile.JpegThumbnail(file_path, size)
    return send_file(thumbnail.get_data(), mimetype='image/jpeg')


@app.route('/api/fileconsistency', methods=['GET'])
def api_fileconsistency():
    missing_files = []
    cur = g.db.execute('select path, id from files')
    for file_path, file_id in cur.fetchall():
        file_path = get_file_abs_path(file_path)
        if not os.path.isfile(file_path):
            missing_files.append(get_file_dict(file_id))

    return jsonify(dict(missing_files=missing_files))


@app.route('/api/fileexif/<int:file_id>', methods=['GET'])
def api_get_json_file_exif(file_id):
    """Note: this function reads data from files collection."""
    cur = g.db.execute('select path from files where id = ?', (file_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    jpeg = jpegfile.JpegFile(get_file_abs_path(row[0]))
    return jsonify(jpeg.get_exif_data())


#
# Documentation outside the Flask static directory
#

@app.route('/API.html')
def doc_api():
    return send_from_directory('.', 'API.html')


@app.route('/CHANGES.html')
def doc_changes():
    return send_from_directory('.', 'CHANGES.html')
