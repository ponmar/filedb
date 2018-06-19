"""
This is the FileDB configuration file.
No other files needs be updated for using FileDB.
Select which configuration class to use at the bottom of this file.
"""


class DefaultConfig(object):
    """The default FileDB configuration. Create your own configuration by
    inheriting from this class. See examples at the end of this file.
    
    To simplify the FileDB upgrade process:
    DO NOT EDIT SETTINGS IN THIS CLASS!
    """

    # Do not change
    SQL_SCHEMA = 'filedb.sql'
    PROJECT_HOME = 'https://bitbucket.org/pontusmarkstrom/filedb'

    # The path to the FileDB database. Default is to have it within the FileDB
    # install directory, but it is possible to put it within the files root directory.
    # It is recommended to put the database on local storage for good performance.
    DATABASE = 'filedb.db'

    # Set to True to restart webserver when files have been changed and change
    # the behavior of unhandled exceptions.
    DEBUG = False

    # This name is the title and heading for all webapp pages. Example:
    # Example:
    #   TITLE = 'My Pictures'
    TITLE = 'FileDB'
     
    # Set to a byte string no longer than 65535.
    EXPORTED_ZIP_COMMENT = b'Exported by FileDB'
    
    # The maximum number of files in a Zip archive. Zip archives are created in
    # memory (not on disk), so a limit is needed. Set to None to ignore.
    EXPORTED_ZIP_MAX_NUM_FILES = 100
    
    # Specify the network interface to be used by the FileDB web server:
    #
    # Example for making FileDB accessible via all network interfaces:
    #   HOST = '0.0.0.0'
    #
    # Example for making FileDB accessible via localhost only:
    #   HOST = None
    HOST = None
    
    # Specify the TCP port to run the webserver at. Port 80 is not selected
    # because it is quite often occupied by another web server.
    PORT = 5000

    # This is the root directory for where to add files from. Only files from
    # within this directory will be accessible via the web application and API.
    # Slash (/) should be used as directory separator. The path shall include
    # an ending slash.
    #
    # Example with relative path:
    #   FILES_ROOT_DIRECTORY = '../../files/'
    #
    # Example with absolute path (Windows):
    #   FILES_ROOT_DIRECTORY = 'C:/Users/pontus/Pictures/
    #
    # Example with a mounted Samba network share (Windows):
    #   FILES_ROOT_DIRECTORY = 'x:/'
    #
    # Example with absolute path (Linux):
    #   FILES_ROOT_DIRECTORY = '/mnt/pictures/'
    #
    FILES_ROOT_DIRECTORY = None

    # Specify a mount command to run at startup if the root directory is missing.
    # Note that the 'net use' Windows command asks for username and password if it is not specified.
    #
    # Example (Windows):
    #   FILES_ROOT_DIRECTORY_MOUNT_COMMAND = r'net use x: \\my_computer\share\pictures'
    #
    # Example (Linux):
    #   FILES_ROOT_DIRECTORY_MOUNT_COMMAND = 'mount -t cifs -o user=pontus //nas/pictures /mnt/pictures'
    #
    FILES_ROOT_DIRECTORY_MOUNT_COMMAND = None

    # Specify an un-mount command to run when FileDB quits.
    #
    # Example (Windows):
    #   FILES_ROOT_DIRECTORY_UMOUNT_COMMAND = 'net use x: /delete'
    #
    # Example (Linux):
    #   FILES_ROOT_DIRECTORY_UMOUNT_COMMAND = 'umount /mnt/pictures'
    #
    FILES_ROOT_DIRECTORY_UMOUNT_COMMAND = None

    # Set this option to True to make it possible to start FileDB before the root
    # directory is available. This may be the case when mounting a Samba network
    # share.
    #
    # Note: it will not be possible to get file content or Exif data from JPEG
    # images when the root directory is missing.
    ALLOW_MISSING_ROOT_DIRECTORY = True

    # Set this option to True to be able to add files that begins with a dot.
    # Note that the hidden directory property in Windows is not used.
    INCLUDE_HIDDEN_DIRECTORIES = False

    # Files are ignored when any of the blacklisted file patterns can be found in
    # the file path. Black-listed file patterns are case sensitive.
    BLACKLISTED_FILE_PATH_PATTERNS = ['Thumbs.db', 'filedb.db']

    # If a file is not blacklisted a whitelisted test will be done. A file will be
    # added, during an import action, if its path ends with any of the specified
    # patterns. Specify an empty list to white-list all files (if not being
    # black-listed before).
    #
    # Note: file path is made lower-case before scan (i.e. specify the file
    #       extension in lower-case).
    WHITELISTED_FILE_EXTENSIONS = ['.jpg', '.png', '.bmp', '.gif', '.avi',
                                   '.mpg', '.mp4', '.mkv', '.mov', '.pdf']

    # The maximum distance, in meters, between a JPEG GPS position and a FileDB
    # location GPS position for automatically setting file locations when adding
    # files.
    FILE_TO_LOCATION_MAX_DISTANCE = 300

    # The thumbnail size used when no size is specified via the API.
    # The aspect ratio is kept, so the width or height may be less than what
    # is specified.
    DEFAULT_THUMBNAIL_SIZE = (196, 196)


class DevelopmentConfig(DefaultConfig):
    """Use this configuration when troubleshooting FileDB."""
    DEBUG = True


class MyConfig(DevelopmentConfig):
    """A custom configuration example."""
    DATABASE = '../filedb_db/filedb.db'
    FILES_ROOT_DIRECTORY = 'x:/'
    FILES_ROOT_DIRECTORY_MOUNT_COMMAND = r'net use x: \\nas\data1\bilder'
    FILES_ROOT_DIRECTORY_UMOUNT_COMMAND = 'net use x: /delete'
    PORT = 80
    HOST = '0.0.0.0'
    BLACKLISTED_FILE_PATH_PATTERNS = DevelopmentConfig.BLACKLISTED_FILE_PATH_PATTERNS + ['nytt', 'TN_']


# The configuration class to use. Specify any of the above classes.
MY_CONFIG = MyConfig
