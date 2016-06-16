"""
This is the FileDB configuration file.
No other files needs be updated for using FileDB.
"""

SQL_SCHEMA = 'schema.sql'
DATABASE = 'flaskr.db'
DEBUG = True
SECRET_KEY = 'development key'

# Specify the network interface to be used by the FileDB web server:
# - '0.0.0.0': accessible via network
# - None: only accessible via localhost only
HOST = None

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

# Files are ignored when any of the blacklisted file patterns can be found in
# the file path. Black-listed file patterns are case sensitive.
BLACKLISTED_FILE_PATH_PATTERNS = ['TN_', 'Thumbs.db', 'nytt/', 'unsorted/',
                                  'privat/']

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
# location GPS position for automatically setting file nearby locations when
# adding files.
FILE_TO_LOCATION_MAX_DISTANCE = 300
