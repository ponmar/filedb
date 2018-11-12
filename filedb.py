import datetime
import math
import re
import os
import io
import zipfile
import time
from contextlib import closing
import sqlite3
from flask import Flask, request, g, abort, render_template, jsonify, send_from_directory, make_response, send_file
import jpegfile


ZIPFILE_COMMENT_MAX_LENGTH = 65535


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
    # Note that the root directory always ends with a slash
    return app.config['FILES_ROOT_DIRECTORY'] + internal_path


def get_file_directory_path(internal_path):
    last_slash_index = internal_path.rfind('/')
    if last_slash_index == -1:
        return ''
    return internal_path[:last_slash_index]


def is_hidden_path(internal_path):
    """Returns if the specified path includes a hidden directory or file."""
    return internal_path.startswith('.') or '/.' in internal_path


def path_is_visible(internal_path):
    return app.config['INCLUDE_HIDDEN_DIRECTORIES'] or not is_hidden_path(internal_path)

    
def files_root_dir_exists():
    return os.path.isdir(app.config['FILES_ROOT_DIRECTORY'])


def print_file_paths():
    db = connect_db()
    db.execute('PRAGMA foreign_keys = ON')
    cur = db.execute('select id, path from files')
    for row in cur.fetchall():
        print('{} ({})'.format(row[1], row[0]))
    db.close()


#
# Database handle for every request
#

@app.before_request
def before_request():
    g.db = connect_db()
    # Needed for each connection to turn on the CASCADE feature for foreign keys when removing rows from tables.
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
    return render_template('index.html', root_dir_exists=files_root_dir_exists())


@app.route('/files')
def app_files():
    cur = g.db.execute('select id, path, description, datetime from files order by path')
    files = [dict(id=row[0], path=row[1], description=row[2], datetime=row[3]) for row in cur.fetchall()]
    return render_template('files.html', files=files)


@app.route('/browse')
def app_browse():
    return render_template('browse.html')


@app.route('/birthdays')
def app_birthdays():
    return render_template('birthdays.html')


@app.route('/categorize')
def app_categorize_files():
    return render_template('categorize.html')


@app.route('/categories')
def app_categories():
    return render_template('categories.html')


@app.route('/help')
def app_help():
    return render_template('help.html')


@app.route('/fonts/<path:path>')
def app_fonts_route(path):
    return send_from_directory('static/fonts', path)


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


@app.route('/api/directory', methods=['POST'])
def api_add_directory():
    content = request.get_json(silent=True)
    path = content['path']

    if path is None or path == '':
        abort(409, 'No directory path specified')
    if path == '.' or path == './':
        abort(400, 'Invalid directory path specified')

    directory_abs_path = get_file_abs_path(path)
    if not os.path.isdir(directory_abs_path):
        abort(400, 'Specified path is not a directory')

    num_added_files = 0
    num_not_added_files = 0

    for filename in os.listdir(directory_abs_path):
        # TODO: if a slash is used as separator here it must be checked that the specified directory does not end
        #       with a slash?
        file_path = path + '/' + filename
        if path_is_visible(file_path):
            if add_file(file_path):
                num_added_files += 1
            else:
                num_not_added_files += 1

    return create_files_added_response(num_added_files, num_not_added_files)


@app.route('/api/import', methods=['POST'])
def api_import_files():
    num_imported_files = 0
    num_not_imported_files = 0

    # Note: os.walk requires a unicode directory path to return unicode encoded paths (automatic in Python 3 or later)
    for root, _, filenames in os.walk(app.config['FILES_ROOT_DIRECTORY']):
        for filename in filenames:
            filename_with_path = os.path.join(root, filename)
            filename_with_path = update_path(filename_with_path)

            # Remove root dir prefix from path
            filename_in_wanted_directory = filename_with_path[len(app.config['FILES_ROOT_DIRECTORY']):]

            if path_is_visible(filename_in_wanted_directory):
                if add_file(filename_in_wanted_directory):
                    app.logger.info('Imported file: ' + filename_in_wanted_directory)
                    num_imported_files += 1
                else:
                    app.logger.info('Import ignored file: ' + filename_in_wanted_directory)
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
    try:
        if '..' in path:
            # This is needed to avoid that files outside the configured root directory is added (and later read via the
            # API).
            app.logger.info("Ignored path ('..' not allowed): '" + path)
            return False

        if '\\' in path:
            app.logger.info("Ignored path (backslash instead of slash found): '" + path)
            return False

        if path_is_blacklisted(path):
            app.logger.info('Ignored file (blacklisted): ' + path)
            return False

        if not file_is_whitelisted(path):
            app.logger.info('Ignored file (non-whitelisted): ' + path)
            return False

        # Check if file already added before starting to parse possible Exif date etc.
        if g.db.execute("select count(*) from files where path=?", (path, )).fetchone()[0] > 0:
            app.logger.info('Ignored file (already added): ' + path)
            return False

        file_path = get_file_abs_path(path)

        if not os.path.isfile(file_path):
            app.logger.info('Ignored path (not a file): ' + file_path)
            return False

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
            add_file_near_locations(file_id, float(file_latitude), float(file_longitude))
        return True

    except sqlite3.IntegrityError:
        return False


def add_file_near_locations(file_id, file_latitude, file_longitude):
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


def update_path(path):
    # Internal paths should always use "/" as directory separator
    path = path.replace('\\', '/')

    # This is so that not both file ./file.jpg and file.jpg can be treated
    # as different files
    IGNORED_PREFIX = './'
    if path.startswith(IGNORED_PREFIX):
        path = path[len(IGNORED_PREFIX):]

    return path


@app.route('/api/exportzip', methods=['POST'])
def api_export_zip():
    content = request.get_json(silent=True)
    file_ids = content['files']

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
        comment = app.config['EXPORTED_ZIP_COMMENT']
        if len(comment) > ZIPFILE_COMMENT_MAX_LENGTH:
            comment = comment[:ZIPFILE_COMMENT_MAX_LENGTH]
        zf.comment = comment
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
    file_ids = content['files']
    return export_paths(file_ids, True)

    
@app.route('/api/exportpaths', methods=['POST'])
def api_export_paths():
    content = request.get_json(silent=True)
    file_ids = content['files']
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


@app.route('/api/exportm3u', methods=['POST'])
def api_export_m3u():
    content = request.get_json(silent=True)
    file_urls = get_file_urls(request.url_root, content['files'])
    m3u = '\n'.join(file_urls)
    resp = app.make_response(m3u)
    resp.mimetype = 'audio/x-mpegurl'
    return resp


@app.route('/api/exportpls', methods=['POST'])
def api_export_pls():
    content = request.get_json(silent=True)
    file_urls = get_file_urls(request.url_root, content['files'])
    pls = '[playlist]\nNumberOfEntries={}\n'.format(len(file_urls))
    for i in range(len(file_urls)):
        pls += 'File{}={}\n'.format(i+1, file_urls[i])
    return pls


def get_file_urls(url_root, file_ids):
    file_urls = []
    for file_id in file_ids:
        file_urls.append(url_root + 'api/filecontent/' + str(file_id))
    return file_urls


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


@app.route('/api/renamefiles', methods=['PUT'])
def api_rename_files():
    content = request.get_json(silent=True)
    source_file_ids = content['sourcefiles']
    destination_dir = content['destinationdir']

    # Note: an empty destination directory is valid when moving files to the top directory.
    if len(destination_dir) > 0 and not destination_dir.endswith('/'):
        destination_dir += '/'

    # TODO: validate destination directory (no .. etc.)

    try:
        for source_file_id in source_file_ids:
            file_path = g.db.execute('select path from files where id = ?', (source_file_id,)).fetchone()[0]
            # Note: this also works for files in the top directory
            file_filename = file_path.split('/')[-1]
            new_file_path = destination_dir + file_filename
            #print('Rename: ' + file_path + " -> " + new_file_path)
            g.db.execute("update files set path = ? where id = ?", (new_file_path, source_file_id))
        g.db.commit()
        files = get_file_dicts(source_file_ids)
    except sqlite3.IntegrityError:
        files = []

    return jsonify({"files": files})


@app.route('/api/filelocations', methods=['PUT'])
def api_update_file_locations():
    content = request.get_json(silent=True)
    file_ids = content['files']
    location_ids = content['locations']
    
    cursor = g.db.cursor()
    for file_id in file_ids:
        for location_id in location_ids:
            try:
                cursor.execute('insert into filelocations (fileid, locationid) values (?, ?)', (file_id, location_id))
            except sqlite3.IntegrityError:
                # Location already added to file
                pass
    
    g.db.commit()
    return '', 204

    
@app.route('/api/filepersons', methods=['PUT'])
def api_update_file_persons():
    content = request.get_json(silent=True)
    file_ids = content['files']
    person_ids = content['persons']
    
    cursor = g.db.cursor()
    for file_id in file_ids:
        for person_id in person_ids:
            try:
                cursor.execute('insert into filepersons (fileid, personid) values (?, ?)', (file_id, person_id))
            except sqlite3.IntegrityError:
                # Person already added to file
                pass
    
    g.db.commit()
    return '', 204

    
@app.route('/api/filetags', methods=['PUT'])
def api_update_file_tags():
    content = request.get_json(silent=True)
    file_ids = content['files']
    tag_ids = content['tags']
    
    cursor = g.db.cursor()
    for file_id in file_ids:
        for tag_id in tag_ids:
            try:
                cursor.execute('insert into filetags (fileid, tagid) values (?, ?)', (file_id, tag_id))
            except sqlite3.IntegrityError:
                # Tag already added to file
                pass

    g.db.commit()
    return '', 204


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

@app.route('/api/file/<int:file_id>', methods=['DELETE'])
def api_remove_file(file_id):
    try:
        g.db.execute('delete from files where id = ?', (file_id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return '', 204


@app.route('/api/files', methods=['DELETE'])
def api_remove_files():
    content = request.get_json(silent=True)
    file_ids = content['files']

    try:
        for file_id in file_ids:
            g.db.execute('delete from files where id = ?', (file_id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return make_response(jsonify({'num_deleted_files': len(file_ids)}),
                         201)


@app.route('/api/directory', methods=['DELETE'])
def api_remove_files_in_directory():
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


@app.route('/api/person/<int:person_id>', methods=['DELETE'])
def api_remove_person(person_id):
    try:
        g.db.execute('delete from persons where id = ?', (person_id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return '', 204


@app.route('/api/location/<int:location_id>', methods=['DELETE'])
def api_remove_location(location_id):
    try:
        g.db.execute('delete from locations where id = ?', (location_id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return '', 204


@app.route('/api/tag/<int:tag_id>', methods=['DELETE'])
def api_remove_tag(tag_id):
    try:
        g.db.execute('delete from tags where id = ?', (tag_id,))
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return '', 204


@app.route('/api/filelocations', methods=['DELETE'])
def api_delete_file_locations():
    content = request.get_json(silent=True)
    file_ids = content['files']
    location_ids = content['locations']
    
    cursor = g.db.cursor()
    for file_id in file_ids:
        for location_id in location_ids:
            try:
                cursor.execute('delete from filelocations where fileid = ? and locationid = ?', (file_id, location_id))
            except sqlite3.IntegrityError:
                # No such location for this file
                pass
    
    g.db.commit()
    return '', 204


@app.route('/api/filepersons', methods=['DELETE'])
def api_delete_file_persons():
    content = request.get_json(silent=True)
    file_ids = content['files']
    person_ids = content['persons']
    
    cursor = g.db.cursor()
    for file_id in file_ids:
        for person_id in person_ids:
            try:
                cursor.execute('delete from filepersons where fileid = ? and personid = ?', (file_id, person_id))
            except sqlite3.IntegrityError:
                # No such person for this file
                pass
    
    g.db.commit()
    return '', 204


@app.route('/api/filetags', methods=['DELETE'])
def api_delete_file_tags():
    content = request.get_json(silent=True)
    file_ids = content['files']
    tag_ids = content['tags']
    
    cursor = g.db.cursor()
    for file_id in file_ids:
        for tag_id in tag_ids:
            try:
                cursor.execute('delete from filetags where fileid = ? and tagid = ?', (file_id, tag_id))
            except sqlite3.IntegrityError:
                # No such tag for this file
                pass

    g.db.commit()
    return '', 204


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
    """Returns all non-blacklisted directories within the configured root directory.
    Note: this function reads data from files collection.
    """
    directories = []
    # Note: os.walk requires a unicode directory path to return unicode encoded paths (automatic in Python 3 or later)
    for root, _, _ in os.walk(app.config['FILES_ROOT_DIRECTORY']):
        path = update_path(root)
        if path != app.config['FILES_ROOT_DIRECTORY']:
            if '/' in path:
                # Remove root dir prefix from path
                path = path.split('/', 1)[1]
            if not path_is_blacklisted(path) and path_is_visible(path):
                directories.append(path)
    directories.sort()

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


def get_order_str(args, available_columns):
    if 'orderby' not in args:
        return None
    orderby = args['orderby']
    columns = orderby.split(',')
    if len(columns) == 0:
        return None

    result = []

    for column in columns:
        parts = column.split(':')
        if len(parts) != 2:
            return None
        if parts[0] not in available_columns:
            return None
        if parts[1] not in ['asc', 'desc']:
            return None
        result.append(parts[0] + ' ' + parts[1])

    return ' order by ' + ', '.join(result)


@app.route('/api/files', methods=['POST'])
def api_get_json_files_from_ids():
    content = request.get_json(silent=True)
    file_ids = content['files']

    files = get_file_dicts(file_ids)
    files.sort(key=lambda file: file['path'])

    cursor = g.db.execute('select count(*) from files')
    total_num_files = cursor.fetchone()[0]

    return jsonify(dict(files=files, total_num_files=total_num_files))


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


def get_file_dicts(file_ids):
    file_dicts = []
    for file_id in file_ids:
        file_dict = get_file_dict(file_id)
        if file_dict is not None:
            file_dicts.append(file_dict)
    return file_dicts


def get_file_json(file_id):
    return jsonify(get_file_dict(file_id))


@app.route('/api/file/<int:file_id>', methods=['GET'])
def api_json_file_by_id(file_id):
    file_json = get_file_json(file_id)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/api/randomfile/', methods=['GET', 'POST'])
def api_random_json_file():
    cur = g.db.execute('select id from files order by random() limit 1')
    file_id = cur.fetchone()[0]
    file_json = get_file_json(file_id)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/api/person/<int:person_id>', methods=['GET'])
def api_get_json_person(person_id):
    person_dict = get_person_dict(person_id)
    if person_dict is None:
        abort(404)
    return jsonify(person_dict)


def get_person_dict(person_id):
    cur = g.db.execute('select id, firstname, lastname, description, dateofbirth from persons where id = ?', (person_id,))
    row = cur.fetchone()
    if row is not None:
        return dict(id=row[0], firstname=row[1], lastname=row[2], description=row[3], dateofbirth=row[4])
    return None


def get_person_json(person_id):
    return jsonify(get_person_dict(person_id))


@app.route('/api/location/<int:location_id>', methods=['GET'])
def api_get_json_location(location_id):
    location_dict = get_location_dict(location_id)
    if location_dict is None:
        abort(404)

    return jsonify(location_dict)


def get_location_dict(location_id):
    cur = g.db.execute('select id, name, description, position from locations where id = ?', (location_id,))
    row = cur.fetchone()
    if row is not None:
        return dict(id=row[0], name=row[1], description=row[2], position=row[3])
    return None


def get_location_json(location_id):
    return jsonify(get_location_dict(location_id))


@app.route('/api/tag/<int:tag_id>', methods=['GET'])
def api_get_json_tag(tag_id):
    tag_dict = get_tag_dict(tag_id)
    if tag_dict is None:
        abort(404)
    return jsonify(tag_dict)


def get_tag_dict(tag_id):
    cur = g.db.execute('select id, name from tags where id = ?', (tag_id,))
    row = cur.fetchone()
    if row is not None:
        return dict(id=row[0], name=row[1])
    return None


def get_tag_json(tag_id):
    return jsonify(get_tag_dict(tag_id))


@app.route('/api/filecontent/<int:file_id>', methods=['GET'])
def api_get_file_content(file_id):
    """Note: this function reads data from files collection."""
    cur = g.db.execute('select path from files where id = ?', (file_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    file_path = row[0]
    return send_from_directory(app.config['FILES_ROOT_DIRECTORY'], file_path)


@app.route('/api/thumbnail/<int:file_id>', methods=['GET'])
def api_create_file_thumbnail(file_id):
    """Note: this function reads data from files collection."""
    cur = g.db.execute('select path from files where id = ?', (file_id,))
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
    """Note: this function reads data from files collection."""
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
    exif_data = jpeg.get_exif_data()
    json_data = {}
    for key in exif_data:
        value = exif_data[key]
        if isinstance(value, bytes):
            # Try to decode bytes data, because jsonify can not handle bytes.
            # The specified encodings is what have been found so far in JPEG files.
            value = decode_bytes(value, ['utf-8', 'windows-1252'])

        json_data[key] = value

    return jsonify(json_data)


def decode_bytes(bytes_data, decodings):
    for decoding in decodings:
        try:
            return bytes_data.decode(decoding)
        except ValueError:
            pass
    return None


#
# Documentation outside the Flask static directory
#

@app.route('/API.html')
def doc_api():
    return send_from_directory('.', 'API.html')


@app.route('/CHANGES.html')
def doc_changes():
    return send_from_directory('.', 'CHANGES.html')
