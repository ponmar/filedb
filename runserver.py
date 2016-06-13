import os
import argparse
import flaskr
import config


def validate_root_directory():
    is_dir = os.path.isdir(config.FILES_ROOT_DIRECTORY)
    if not is_dir:
        print('Warning: configured root directory is not a directory')
    return config.ALLOW_MISSING_ROOT_DIRECTORY or is_dir


def main():
    """Runs the FileDB server side application."""

    parser = argparse.ArgumentParser(description='A file database and server application.')
    parser.add_argument('--initdb', help='clean the database', action='store_true')
    args = parser.parse_args()

    if args.initdb:
        print('Cleaning database...')
        flaskr.init_db()
        print('Done.')
    else:
        if validate_root_directory():
            print('Starting the FileDB server...')
            #app.run(host='0.0.0.0')
            #app.debug = True
            flaskr.app.run(debug=True)


if __name__ == "__main__":
    main()
