import sqlite3
from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, flash, jsonify

# Configuration
DATABASE = 'flaskr.db'
SQL_SCHEMA = 'schema.sql'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'admin'

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
# HTML page with forms for testing some API functionality
#

@app.route('/')
def show_files():
    cur = g.db.execute('select path, description from files') # order by id
    files = [dict(path=row[0], description=row[1]) for row in cur.fetchall()]

    cur = g.db.execute('select name from persons')
    persons = [dict(name=row[0]) for row in cur.fetchall()]

    cur = g.db.execute('select name from locations')
    locations = [dict(name=row[0]) for row in cur.fetchall()]

    cur = g.db.execute('select name from tags')
    tags = [dict(name=row[0]) for row in cur.fetchall()]

    return render_template('debug.html', files=files, persons=persons, locations=locations, tags=tags)


#
# API: add data
#

@app.route('/file', methods=['POST'])
def add_file():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into files (path, description) values (?, ?)',
                     [request.form['path'], request.form['description']])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/person', methods=['POST'])
def add_person():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into persons (name) values (?)',
                     [request.form['name']])
        g.db.commit()
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/location', methods=['POST'])
def add_location():
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
def add_tag():
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
# API: modify data
#

# TODO: change from POST -> PUT?
@app.route('/add_file_person', methods=['POST'])
def add_file_person():
    if not session.get('logged_in'):
        abort(401)
    # TODO: get file_id or file_path from url
    # TODO: get person_id from path
    # TODO: insert into filepersons
    return 'OK'


# TODO: change from POST -> PUT?
@app.route('/add_file_location', methods=['POST'])
def add_file_location():
    if not session.get('logged_in'):
        abort(401)
    # TODO: get file_id or file_path from url
    # TODO: get person_id from path
    # TODO: insert into filepersons
    return 'OK'


# TODO: change from POST -> PUT?
@app.route('/add_file_tag', methods=['POST'])
def add_file_tag():
    if not session.get('logged_in'):
        abort(401)
    # TODO: get file_id or file_path from url
    # TODO: get person_id from path
    # TODO: insert into filepersons
    return 'OK'

#
# API: delete data
#

@app.route('/file', methods=['DELETE'])
def remove_file():
    if not session.get('logged_in'):
        abort(401)

    file_id = request.args.get('id')
    file_path = request.args.get('path')

    try:
        if file_id is not None:
            g.db.execute('delete from files where id = ?', (file_id,))
        elif file_path is not None:
            g.db.execute('delete from files where path = ?', (file_path,))
        else:
            abort(404)
    except sqlite3.IntegrityError:
        abort(409)

    return 'OK'


@app.route('/person', methods=['DELETE'])
def remove_person():
    if not session.get('logged_in'):
        abort(401)
    person_id = request.args.get('id')
    try:
        if person_id is not None:
            g.db.execute('delete from persons where id = ?', (person_id,))
        else:
            abort(404)
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/location', methods=['DELETE'])
def remove_location():
    if not session.get('logged_in'):
        abort(401)
    location_id = request.args.get('id')
    try:
        if location_id is not None:
            g.db.execute('delete from locations where id = ?', (location_id,))
        else:
            abort(404)
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


@app.route('/tag', methods=['DELETE'])
def remove_tag():
    if not session.get('logged_in'):
        abort(401)
    tag_id = request.args.get('id')
    try:
        if tag_id is not None:
            g.db.execute('delete from tags where id = ?', (tag_id,))
        else:
            abort(404)
    except sqlite3.IntegrityError:
        abort(409)
    return 'OK'


#
# API: get JSON with many items
#

@app.route('/files', methods=['GET'])
def get_json_files():
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
def get_json_persons():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name from persons')
    persons = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

    return jsonify(dict(persons=persons))


@app.route('/locations', methods=['GET'])
def get_json_locations():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name from locations')
    locations = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

    return jsonify(dict(locations=locations))


@app.route('/tags', methods=['GET'])
def get_json_tags():
    if not session.get('logged_in'):
        abort(401)

    cur = g.db.execute('select id, name from tags')
    tags = [dict(id=row[0], name=row[1]) for row in cur.fetchall()]

    return jsonify(dict(tags=tags))


#
# API: get JSON with one specific item
#

@app.route('/file', methods=['GET'])
def get_json_file():
    if not session.get('logged_in'):
        abort(401)

    file_id = request.args.get('id')
    file_path = request.args.get('path')

    row = None
    if file_id is not None:
        cur = g.db.execute('select id, path, description from files where id = ?', (file_id,))
        row = cur.fetchone()
    elif file_path is not None:
        cur = g.db.execute('select id, path, description from files where path = ?', (file_path,))
        row = cur.fetchone()
    if row is None:
        abort(404)

    if file_id is None:
        # Needed if the path argument was used in the URL
        file_id = row[0]

    cur = g.db.execute('select personid from filepersons where fileid = ?', (file_id,))
    persons = [filepersons_row[0] for filepersons_row in cur.fetchall()]

    cur = g.db.execute('select locationid from filelocations where fileid = ?', (file_id,))
    locations = [filelocations_row[0] for filelocations_row in cur.fetchall()]

    cur = g.db.execute('select tagid from filetags where fileid = ?', (file_id,))
    tags = [filetags_row[0] for filetags_row in cur.fetchall()]

    return jsonify( dict(id=row[0], path=row[1], description=row[2], persons=persons, locations=locations, tags=tags) )


@app.route('/person', methods=['GET'])
def get_json_person():
    if not session.get('logged_in'):
        abort(401)
    person_id = request.args.get('id')
    if person_id is None:
        abort(404)
    cur = g.db.execute('select id, name from persons where id = ?', (person_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


@app.route('/location', methods=['GET'])
def get_json_location():
    if not session.get('logged_in'):
        abort(401)
    location_id = request.args.get('id')
    if location_id is None:
        abort(404)
    cur = g.db.execute('select id, name from persons where id = ?', (location_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


@app.route('/tag', methods=['GET'])
def get_json_tag():
    if not session.get('logged_in'):
        abort(401)
    tag_id = request.args.get('id')
    if tag_id is None:
        abort(404)
    cur = g.db.execute('select id, name from tags where id = ?', (tag_id,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    return jsonify( dict(id=row[0], name=row[1]) )


#
# Auth
#

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.form['username'] != app.config['USERNAME']:
            error = 'Invalid username'
        elif request.form['password'] != app.config['PASSWORD']:
            error = 'Invalid password'
        else:
            session['logged_in'] = True
            flash('You were logged in')
            return redirect(url_for('show_files'))
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You were logged out')
    return redirect(url_for('show_files'))


if __name__ == '__main__':
    #app.run(host='0.0.0.0')
    #app.debug = True
    app.run()
