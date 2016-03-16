import sqlite3
from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, jsonify, send_from_directory
import datetime

# Configuration
DATABASE = 'flaskr.db'
SQL_SCHEMA = 'schema.sql'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'admin'
FILES_DIRECTORY = 'files'

# Create the application
app = Flask(__name__)
app.config.from_object(__name__)
app.config.from_envvar('FLASKR_SETTINGS', silent=True)


def connect_db():
    return sqlite3.connect(app.config['DATABASE'])


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


@app.route('/app_files')
def app_files():
    cur = g.db.execute('select id, path, description from files order by path')
    files = [dict(id=row[0], path=row[1], description=row[2]) for row in cur.fetchall()]
    return render_template('files.html', files=files)


@app.route('/browse')
def app_browse():
    return render_template('browse.html')


@app.route('/categories')
def app_categories():
    return render_template('categories.html')


@app.route('/about')
def app_about():
    return render_template('about.html')


#
# API: add data
#

@app.route('/file', methods=['POST'])
def api_add_file():
    if not session.get('logged_in'):
        abort(401)
    try:
        # TODO: check that file exists?
        # TODO: require certain directory separator ('/', not '\')
        g.db.execute('insert into files (path, description) values (?, ?)',
                     [request.form['path'], request.form['description']])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


# TODO: use function to check all values from forms
def get_form_str(param_name, min_length = 3, max_length = 50):
    if param_name in request.form:
        param_value = request.form[param_name]
        if len(param_value) in range(min_length, max_length+1):
            return param_value
    return None


@app.route('/person', methods=['POST'])
def api_add_person():
    if not session.get('logged_in'):
        abort(401)

    name = request.form['name']
    description = request.form['description']
    date_of_birth = None

    if 'dateofbirth' in request.form:
        dateofbirth_str = request.form['dateofbirth']
        if dateofbirth_str:
            try:
                # Required format: YYYY-MM-DD
                datetime.datetime.strptime(dateofbirth_str, '%Y-%m-%d')
            except ValueError:
                abort(404)
            date_of_birth = dateofbirth_str

    try:
        g.db.execute('insert into persons (name, description, dateofbirth) values (?, ?, ?)',
                     [name, description, date_of_birth])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/location', methods=['POST'])
def api_add_location():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into locations (name) values (?)',
                     [request.form['name']])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/tag', methods=['POST'])
def api_add_tag():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into tags (name) values (?)',
                 [request.form['name']])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


#
# API: modify data (internally rows are are deleted from tables, but in the API it looks like a file item is modified)
#

@app.route('/add_to_file', methods=['PUT'])
def api_add_file_person():
    if not session.get('logged_in'):
        abort(401)

    file_id = request.args.get('fileid')
    person_id = request.args.get('personid')
    location_id = request.args.get('locationid')
    tag_id = request.args.get('tagid')
    if file_id is None or (person_id is None and location_id is None and tag_id is None):
        abort(404)

    try:
        # TODO: use a transaction (all or nothing!)
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


@app.route('/remove_from_file', methods=['PUT'])
def api_remove_from_file():
    if not session.get('logged_in'):
        abort(401)
    file_id = request.args.get('fileid')
    person_id = request.args.get('personid')
    location_id = request.args.get('locationid')
    tag_id = request.args.get('tagid')
    if file_id is None or (person_id is None and location_id is None and tag_id is None):
        abort(404)
    try:
        # TODO: use a transaction (all or nothing!)
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

@app.route('/file/<int:id>', methods=['DELETE'])
def api_remove_file(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from files where id = ?', (id,))
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/person/<int:id>', methods=['DELETE'])
def api_remove_person(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from persons where id = ?', (id,))
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/location/<int:id>', methods=['DELETE'])
def api_remove_location(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from locations where id = ?', (id,))
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/tag/<int:id>', methods=['DELETE'])
def api_remove_tag(id):
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('delete from tags where id = ?', (id,))
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


#
# API: get JSON with many items
#

@app.route('/files', methods=['GET'])
def api_get_json_files():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, path, description from files')
    files = [dict(id=row[0], path=row[1], description=row[2]) for row in cur.fetchall()]

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


@app.route('/persons', methods=['GET'])
def api_get_json_persons():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name, description, dateofbirth from persons')
    persons = [dict(id=row[0], name=row[1], description=row[2], dateofbirth=row[3]) for row in cur.fetchall()]

    return jsonify(dict(persons=persons))


@app.route('/locations', methods=['GET'])
def api_get_json_locations():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name from locations')
    locations = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

    return jsonify(dict(locations=locations))


@app.route('/tags', methods=['GET'])
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
        cur = g.db.execute('select id, path, description from files where id = ?', (file_id,))
        row = cur.fetchone()
    elif file_path is not None:
        cur = g.db.execute('select id, path, description from files where path = ?', (file_path,))
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

    return jsonify( dict(id=row[0], path=row[1], description=row[2], personsids=person_ids, locationids=location_ids, tagids=tag_ids) )


@app.route('/file_by_path/<path>', methods=['GET'])
def api_json_file_by_path(path):
    if not session.get('logged_in'):
        abort(401)
    file_json = get_file_json(file_path=path)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/file/<int:id>', methods=['GET'])
def api_json_file_by_id(id):
    if not session.get('logged_in'):
        abort(401)
    file_json = get_file_json(file_id=id)
    if file_json is None:
        abort(404)
    return file_json


@app.route('/person/<int:id>', methods=['GET'])
def api_get_json_person(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select id, name, description, dateofbirth from persons where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1], description=row[2], dateofbirth=row[3]) )


@app.route('/location/<int:id>', methods=['GET'])
def api_get_json_location(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select id, name from locations where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


@app.route('/tag/<int:id>', methods=['GET'])
def api_get_json_tag(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select id, name from tags where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


@app.route('/filecontent/<int:id>', methods=['GET'])
def api_get_file_content(id):
    if not session.get('logged_in'):
        abort(401)
    cur = g.db.execute('select path from files where id = ?', (id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    file_path = row[0]
    return send_from_directory(FILES_DIRECTORY, file_path)


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


@app.route('/login', methods=['POST'])
def api_login():
    if not login(request.form['username'],
                 request.form['password']):
        abort(401)
    return "OK"


@app.route('/logout')
def api_logout():
    logout()
    return "OK"


if __name__ == '__main__':
    #app.run(host='0.0.0.0')
    #app.debug = True
    app.run()
