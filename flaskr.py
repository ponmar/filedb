import datetime
import re
import os
from contextlib import closing
import sqlite3
from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, jsonify, send_from_directory, make_response
import jpegfile
from config import *


# Create the application
app = Flask(__name__)
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


@app.route('/categories')
def app_categories():
    if not session.get('logged_in'):
        return redirect(url_for('app_index'))
    return render_template('categories.html')


@app.route('/about')
def app_about():
    if not session.get('logged_in'):
        return redirect(url_for('app_index'))
    return render_template('about.html')


@app.route('/person/<int:id>', methods=['GET'])
def app_person(id):
    return "TODO"


@app.route('/location/<int:id>', methods=['GET'])
def app_location(id):
    return "TODO"


@app.route('/tag/<int:id>', methods=['GET'])
def app_tag(id):
    return "TODO"


#
# API: add data
#

@app.route('/api/file', methods=['POST'])
def api_add_file():
    if not session.get('logged_in'):
        abort(401)
    path = get_form_str('path', request.form)
    description = get_form_str('description', request.form)
    if path is None:
        abort(409, 'No file path specified')
    if not add_file(path, description):
        abort(409, 'File not added')
    return 'OK'


@app.route('/api/directory', methods=['POST'])
def api_add_directory():
    if not session.get('logged_in'):
        abort(401)

    path = get_form_str('path', request.form)
    if path is None:
        abort(409, 'No directory path specified')

    directory_path = FILES_ROOT_DIRECTORY + '/' + path

    if not os.path.isdir(directory_path):
        abort(400, 'Specified path {} is not a directory within the {} directory'.format(path, FILES_ROOT_DIRECTORY))

    for new_file in os.listdir(directory_path):
        if not add_file(path + '/' + new_file):
            print 'Error'

    return 'OK'


@app.route('/api/import', methods=['POST'])
def api_import_files():
    if not session.get('logged_in'):
        abort(401)
    # Note: unicode is required to get unicode filename paths

    num_imported_files = 0
    num_not_imported_files = 0

    for root, directories, filenames in os.walk(unicode(FILES_ROOT_DIRECTORY)):
        for filename in filenames:
            filename_with_path = os.path.join(root, filename)
            #print filename_with_path

            # TODO: do the same path adjustments when adding file or directory (and do not duplicate code)
            # Note that unix style paths should be used internally
            filename_with_path = filename_with_path.replace('\\', '/')
            filename_in_wanted_directory = '/'.join(filename_with_path.split('/')[1:])

            #print 'Trying: [{}] [{}]'.format(filename_with_path, filename_in_wanted_directory)

            if add_file(filename_in_wanted_directory):
                print 'Imported file: ' + filename_in_wanted_directory
                num_imported_files += 1
            else:
                print 'Could not import file: ' + filename_with_path
                num_not_imported_files += 1

    return make_response(jsonify({'message': 'File import finished',
                                  'num_imported_files': num_imported_files,
                                  'num_not_imported_files': num_not_imported_files}),
                         201)


def add_file(path, file_description=None):
    # TODO: require certain directory separator ('/', not '\')
    # TODO: check that path within files directory (no .. etc)
    try:
        if file_is_blacklisted(path):
            print 'Ignored blacklisted file: ' + path
            return False

        if not file_is_whitelisted(path):
            print 'Ignored non-whitelisted file: ' + path
            return False

        file_path = FILES_ROOT_DIRECTORY + '/' + path

        # TODO: check that path not already in database

        if not os.path.isfile(file_path):
            abort(400, 'No file with path "{}" within the "{}" directory'.format(path, FILES_ROOT_DIRECTORY))

        if file_description == '':
            file_description = None

        file_datetime = None

        if jpegfile.is_jpeg_file(file_path):
            # Read date and time from jpeg exif information
            try:
                exif_file = jpegfile.JpegFile(file_path)
                file_datetime = exif_file.get_date_time()
            except IOError:
                # Note: for some reason this happens for some working JPEG files, so we should still add the file
                print 'Could not read JPEG file for extracting date and time information: ' + path

        if file_datetime is None:
            # Try to read date from sub-path (part of the path within the configured files directory)
            file_datetime = get_date_from_path(path)

        g.db.execute('insert into files (path, description, datetime) values (?, ?, ?)',
                     [path, file_description, file_datetime])
        g.db.commit()
        return True

    except sqlite3.IntegrityError:
        return False


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


def get_form_str(param_name, form, min_length = 1, max_length = 100):
    if param_name in form:
        param_value = form[param_name]
        if len(param_value) in range(min_length, max_length + 1):
            return param_value
    return None


@app.route('/api/person', methods=['POST'])
def api_add_person():
    if not session.get('logged_in'):
        abort(401)

    firstname = get_form_str('firstname', request.form)
    lastname = get_form_str('lastname', request.form)
    description = get_form_str('description', request.form)
    date_of_birth = get_form_str('dateofbirth', request.form)

    if firstname is None:
        abort(400, 'Person firstname not specified')

    if lastname is None:
        abort(400, 'Person lastname not specified')

    if date_of_birth is not None:
        try:
            # Required format: YYYY-MM-DD
            # This is just to verify the format of the string, so the returned datetime object is ignored
            datetime.datetime.strptime(date_of_birth, '%Y-%m-%d')
        except ValueError:
            abort(400, 'Invalid date of birth format')

    try:
        g.db.execute('insert into persons (firstname, lastname, description, dateofbirth) values (?, ?, ?, ?)',
                     [firstname, lastname, description, date_of_birth])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    # TODO: add created person id
    return make_response(jsonify({'message': 'Person created'}), 201)


@app.route('/api/location', methods=['POST'])
def api_add_location():
    if not session.get('logged_in'):
        abort(401)

    name = get_form_str('name', request.form)
    if name is None:
        abort(400, 'Location name not specified')

    try:
        g.db.execute('insert into locations (name) values (?)', [name])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    # TODO: add created location id
    return make_response(jsonify({'message': 'Location created'}), 201)


@app.route('/api/tag', methods=['POST'])
def api_add_tag():
    if not session.get('logged_in'):
        abort(401)

    name = get_form_str('name', request.form)
    if name is None:
        abort(400, 'Tag name not specified')

    try:
        g.db.execute('insert into tags (name) values (?)', [name])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    # TODO: add created tag id
    return make_response(jsonify({'message': 'Tag created'}), 201)


#
# API: modify data (internally rows are are deleted from tables, but in the API it looks like a file item is modified)
#

@app.route('/api/add_to_file', methods=['PUT'])
def api_add_file_person():
    if not session.get('logged_in'):
        abort(401)

    file_id = request.args.get('fileid')
    person_id = request.args.get('personid')
    location_id = request.args.get('locationid')
    tag_id = request.args.get('tagid')

    if file_id is None:
        abort(400, 'File id not specified')
    if person_id is None and location_id is None and tag_id is None:
        abort(400, 'Person, location or tag id not specified')

    try:
        # TODO: use a transaction (all or nothing!) or require that only one thing is to be added to the file
        if person_id is not None:
            g.db.execute('insert into filepersons (fileid, personid) values (?, ?)', (file_id, person_id))
        if location_id is not None:
            g.db.execute('insert into filelocations (fileid, locationid) values (?, ?)', (file_id, location_id))
        if tag_id is not None:
            g.db.execute('insert into filetags (fileid, tagid) values (?, ?)', (file_id, tag_id))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/api/remove_from_file', methods=['PUT'])
def api_remove_from_file():
    if not session.get('logged_in'):
        abort(401)
    file_id = request.args.get('fileid')
    person_id = request.args.get('personid')
    location_id = request.args.get('locationid')
    tag_id = request.args.get('tagid')

    if file_id is None:
        abort(400, 'File id not specified')
    if person_id is None and location_id is None and tag_id is None:
        abort(400, 'Person, location or tag id not specified')

    try:
        # TODO: use a transaction (all or nothing!) or require that only one thing is to be added to the file
        if person_id is not None:
            g.db.execute('delete from filepersons where fileid = ? and personid = ?', (file_id, person_id))
        if location_id is not None:
            g.db.execute('delete from filelocations where fileid = ? and locationid = ?', (file_id, location_id))
        if tag_id is not None:
            g.db.execute('delete from filetags where fileid = ? and tagid = ?', (file_id, tag_id))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


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

    query = 'select id, path, description, datetime from files '
    if person_ids:
        query += 'inner join filepersons on files.id = filepersons.fileid '
    if location_ids:
        query += 'inner join filelocations on files.id = filelocations.fileid '
    if tag_ids:
        query += 'inner join filetags on files.id = filetags.fileid '

    where_statements = []
    if person_ids:
        where_statements.append('filepersons.personid in (' + person_ids + ')')
        query += 'where filepersons.personid in ({}) and filelocations.locationid in ({}) and filetags.tagid in ({})'
    if location_ids:
        where_statements.append('filelocations.locationid in (' + location_ids + ')')
        #query += 'where filepersons.personid in ({}) and filelocations.locationid in ({}) and filetags.tagid in ({})'
    if tag_ids:
        where_statements.append('filetags.tagid in (' + tag_ids + ')')

    if len(where_statements) > 0:
        query += 'where ' + ' and '.join(where_statements)

    print 'Query: ' + query
    cur = g.db.execute(query)

    files = [dict(id=row[0], path=row[1], description=row[2], datetime=row[3]) for row in cur.fetchall()]

    for file in files:
        file_id = file['id']

        cur = g.db.execute('select personid from filepersons where fileid = ?', (file_id,))
        persons = [filepersons_row[0] for filepersons_row in cur.fetchall()]
        file['persons'] = persons

        cur = g.db.execute('select locationid from filelocations where fileid = ?', (file_id,))
        locations = [filelocations_row[0] for filelocations_row in cur.fetchall()]
        file['locations'] = locations

        cur = g.db.execute('select tagid from filetags where fileid = ?', (file_id,))
        tags = [filetags_row[0] for filetags_row in cur.fetchall()]
        file['tags'] = tags

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

    cur = g.db.execute('select id, name from locations')
    locations = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

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

def get_file_json(file_id = None, file_path = None):
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

    return jsonify( dict(id=row[0], path=row[1], description=row[2], datetime=row[3], personsids=person_ids, locationids=location_ids, tagids=tag_ids) )


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
    cur = g.db.execute('select id, firstname, lastname, description, dateofbirth from persons where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], firstname=row[1], lastname=row[2], description=row[3], dateofbirth=row[4]) )


@app.route('/api/location/<int:id>', methods=['GET'])
def api_get_json_location(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select id, name from locations where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


@app.route('/api/tag/<int:id>', methods=['GET'])
def api_get_json_tag(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select id, name from tags where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


@app.route('/api/filecontent/<int:id>', methods=['GET'])
def api_get_file_content(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select path from files where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    file_path = row[0]
    print 'Trying: ' + file_path
    return send_from_directory(FILES_ROOT_DIRECTORY, file_path)


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
