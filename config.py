"""
This is the FileDB configuration file.
No other files needs be updated for using FileDB.
Select which configuration class to use at the bottom of this file.
"""


class DefaultConfig(object):
    """The default FileDB configuration. Create your own configuration by
    inheriting from this class. See examples at the end of this file.
    
    To simplify upgrading FileDB releases:
    DO NOT EDIT SETTINGS IN THIS CLASS!
    """

    # Do not change
    SQL_SCHEMA = 'filedb.sql'
    DATABASE = 'filedb.db'
    VERSION = open('VERSION.txt').read()

    # Set to True to restart webserver when files have been changed and change
    # the behavior of unhandled exceptions.
    DEBUG = False

    # This name is the title and heading for all webapp pages. Example:
    #TITLE = 'My Pictures'
    TITLE = 'FileDB-' + VERSION
    
    # The key used for signing cookies. This can for example be generated with:
    # os.urandom(24)
    SECRET_KEY = 'my random key'

    # Specify the network interface to be used by the FileDB web server:
    # - '0.0.0.0': accessible via network
    # - None: only accessible via localhost
    HOST = None
    
    # Specify the TCP port to run the webserver at
    PORT = 5000

    # These are the credentials needed to access the web application (and API).
    USERNAME = 'admin'
    PASSWORD = 'admin'

    # This is the root directory for where to add files from. Only files from
    # within this directory will be accessible via the web application and API.
    # A Samba network share can be mounted and be specified here.
    #FILES_ROOT_DIRECTORY = 'x:/'
    FILES_ROOT_DIRECTORY = 'files'

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
    BLACKLISTED_FILE_PATH_PATTERNS = ['TN_', 'Thumbs.db', 'nytt/', 'unsorted/']

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
    SECRET_KEY = 'development key'


class PontusConfig(DevelopmentConfig):
    """My own configuration"""
    FILES_ROOT_DIRECTORY = 'x:/'
    PORT = 80


# The configuration class to use. Specify any of the above classes.
MY_CONFIG = PontusConfig
