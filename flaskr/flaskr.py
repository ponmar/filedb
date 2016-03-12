import sqlite3
from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, flash
from contextlib import closing

# Configuration
#DATABASE = '/tmp/flaskr.db'
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


def init_db():
    with closing(connect_db()) as db:
        with app.open_resource(SQL_SCHEMA, mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()


@app.before_request
def before_request():
    g.db = connect_db()


@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()


@app.route('/')
def show_files():
    cur = g.db.execute('select path, description from files order by id')
    files = cur.fetchall()
    return render_template('show_files.html', files=files)


@app.route('/file', methods=['POST'])
def add_file():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into files (path, description) values (?, ?)',
                     [request.form['path'], request.form['description']])
        g.db.commit()
        flash('File added')
    except sqlite3.IntegrityError:
        flash('File already added')
    return redirect(url_for('show_files'))


@app.route('/person', methods=['POST'])
def add_person():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into persons (name) values (?)',
                     [request.form['name']])
        g.db.commit()
        flash('Person added')
    except sqlite3.IntegrityError:
        flash('Person already added')
    return redirect(url_for('show_files'))


@app.route('/location', methods=['POST'])
def add_location():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into location (name) values (?)',
                     [request.form['name']])
        g.db.commit()
        flash('Location added')
    except sqlite3.IntegrityError:
        flash('Location already added')
    return redirect(url_for('show_files'))


@app.route('/tag', methods=['POST'])
def add_tag():
    if not session.get('logged_in'):
        abort(401)
    try:
        g.db.execute('insert into tag (name) values (?)',
                 [request.form['name']])
        g.db.commit()
        flash('Tag added')
    except sqlite3.IntegrityError:
        flash('Tag already added')
    return redirect(url_for('show_files'))


@app.route('/tag', methods=['DELETE'])
def remove_file():
    if not session.get('logged_in'):
        abort(401)
    # TODO
    return redirect(url_for('show_files'))


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
    #init_db()
