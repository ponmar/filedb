import argparse
import flaskr

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='A file database and server application.')
    parser.add_argument('--initdb', help='clean the database', action='store_true')
    #parser.add_argument('--importdir', help='import a directory recursively')
    #parser.add_argument('--runserver', help='start the server with the specified root directory for files', default='files')
    args = parser.parse_args()

    if args.initdb:
        print('Cleaning database...')
        flaskr.init_db()
        print('Done.')
    else:
        print('Starting the FileDB server...')
        #app.run(host='0.0.0.0')
        #app.debug = True
        flaskr.app.run(debug=True)
