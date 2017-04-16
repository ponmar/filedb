import os
import argparse
import filedb
from config import MY_CONFIG


def validate_root_directory():
    is_dir = os.path.isdir(MY_CONFIG.FILES_ROOT_DIRECTORY)
    if not is_dir:
        print('Warning: configured root directory is not a directory')
    return MY_CONFIG.ALLOW_MISSING_ROOT_DIRECTORY or is_dir


def main():
    """Runs the FileDB server side application."""

    parser = argparse.ArgumentParser(description='A file database and server application.')
    parser.add_argument('--initdb', help='clean the database', action='store_true')
    args = parser.parse_args()

    if args.initdb:
        print('Cleaning database...')
        filedb.init_db()
        print('Done.')
    else:
        if validate_root_directory():
            print('Starting the FileDB server...')
            filedb.app.run(debug=MY_CONFIG.DEBUG, host=MY_CONFIG.HOST, port=MY_CONFIG.PORT)


if __name__ == "__main__":
    main()
