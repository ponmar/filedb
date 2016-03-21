import argparse
from flaskr import app
import initdb

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='A file database and server application.')
    parser.add_argument('--initdb', help='clean the database', action='store_true')
    parser.add_argument('--importdir', help='import a directory recursively')
    parser.add_argument('--runserver', help='start the server with the specified root directory for files', default='files')
    args = parser.parse_args()

    if args.initdb:
        print('Cleaning database...')
        initdb.init_db()
        print('Done.')
        exit(0)

    if args.importdir:
        print('Importing directory {}...'.format(args.importdir))
        # TODO: import files recursively
        print('Done.')
        exit(0)

    if args.runserver:
        print('Starting the FileDB server...')
        files_root_dir = args.runserver
        #app.run(host='0.0.0.0')
        #app.debug = True
        app.run(debug=True)
