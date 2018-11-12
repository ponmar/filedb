import checkversion
import os
import argparse
import subprocess
import filedb


def validate_root_directory():
    root_dir = filedb.app.config['FILES_ROOT_DIRECTORY']
    if root_dir is None:
        print("Configuration error: FILES_ROOT_DIRECTORY not set")
        return False
    if '\\' in root_dir:
        print("Configuration error: FILES_ROOT_DIRECTORY contains backslash")
        return False
    if not root_dir.endswith('/'):
        print("Configuration error: FILES_ROOT_DIRECTORY does not end with a slash")
        return False
    return True


def mount_root_directory():
    cmd = filedb.app.config['FILES_ROOT_DIRECTORY_MOUNT_COMMAND']
    if cmd is not None:
        print('Mounting files root directory...')
        while subprocess.call(cmd, shell=True) != 0:
            print('Failed to mount network share, retrying...')
        print('Root directory mounted successfully')


def unmount_root_directory():
    cmd = filedb.app.config['FILES_ROOT_DIRECTORY_UMOUNT_COMMAND']
    if cmd is not None:
        print('Un-mounting files root directory...')
        if subprocess.call(cmd, shell=True) == 0:
            print('Root directory un-mounted successfully')
        else:
            print('Failed to un-mount root directory')


def can_start():
    is_dir = filedb.files_root_dir_exists()
    if not is_dir:
        print('Warning: configured root directory does not exist')
    return filedb.app.config['ALLOW_MISSING_ROOT_DIRECTORY'] or is_dir


def database_exists():
    return os.path.isfile(filedb.app.config['DATABASE'])
    

def main():
    """Runs the FileDB server side application."""

    parser = argparse.ArgumentParser(description='A file database and server application.')
    parser.add_argument('--initdb',
                        help='clean the database',
                        action='store_true')
    parser.add_argument('--configuration',
                        help='change configuration without updating config.py. Example: config.MyConfig')
    parser.add_argument('--print_files',
                        help='Print added files (used for debugging purposes only)',
                        action='store_true')
    args = parser.parse_args()

    if args.configuration:
        configuration_name = args.configuration
    else:
        from config import MY_CONFIG
        configuration_name = 'config.' + MY_CONFIG.__name__

    print('Loading configuration ' + configuration_name)
    filedb.app.config.from_object(configuration_name)

    if args.initdb:
        print('Cleaning database...')
        filedb.init_db()
        print('Done.')
    elif args.print_files:
        if database_exists():
            filedb.print_file_paths()
        else:
            print('Database not created')
    else:
        if database_exists():
            if validate_root_directory():
                try:
                    if not filedb.files_root_dir_exists():
                        mount_root_directory()
                    if can_start():
                        print('Starting the FileDB server...')
                        filedb.app.run(debug=filedb.app.config['DEBUG'],
                                       host=filedb.app.config['HOST'],
                                       port=filedb.app.config['PORT'],
                                       threaded=True)
                finally:
                    if filedb.files_root_dir_exists():
                        unmount_root_directory()
        else:
            print('Database not created')


if __name__ == "__main__":
    main()
