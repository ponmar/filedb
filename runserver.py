import os
import argparse
import filedb


def validate_root_directory():
    is_dir = os.path.isdir(filedb.app.config['FILES_ROOT_DIRECTORY'])
    if not is_dir:
        print('Warning: configured root directory is not a directory')
    return filedb.app.config['ALLOW_MISSING_ROOT_DIRECTORY'] or is_dir


def database_exists():
    return os.path.isfile(filedb.app.config['DATABASE'])
    

def main():
    """Runs the FileDB server side application."""

    parser = argparse.ArgumentParser(description='A file database and server application.')
    parser.add_argument('--initdb', help='clean the database', action='store_true')
    parser.add_argument('--configuration', help='change configuration without updating config.py')
    args = parser.parse_args()

    if args.initdb:
        print('Cleaning database...')
        filedb.init_db()
        print('Done.')
    else:
        configuration_name = None
        if args.configuration:
            configuration_name = args.configuration
        else:
            from config import MY_CONFIG
            configuration_name = 'config.' + MY_CONFIG.__name__
            
        print('Loading configuration ' + configuration_name)
        filedb.app.config.from_object(configuration_name)

        if database_exists():
            if validate_root_directory():
                print('Starting the FileDB server...')
                filedb.app.run(debug=filedb.app.config['DEBUG'], host=filedb.app.config['HOST'], port=filedb.app.config['PORT'])
        else:
            print('Database not created: ' + filedb.app.config['DATABASE'])


if __name__ == "__main__":
    main()
