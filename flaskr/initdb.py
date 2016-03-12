from contextlib import closing
import flaskr


def init_db():
    with closing(flaskr.connect_db()) as db:
        with flaskr.app.open_resource(flaskr.SQL_SCHEMA, mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()
