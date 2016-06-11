"""
This is the FileDB configuration file.
No other files needs be updated for using FileDB.
"""

DATABASE = 'flaskr.db'
SQL_SCHEMA = 'schema.sql'

DEBUG = True

SECRET_KEY = 'development key'

# These are the credentials needed to access the web application (and API).
USERNAME = 'admin'
PASSWORD = 'admin'

FILES_ROOT_DIRECTORY = 'x:/'
#FILES_ROOT_DIRECTORY = 'files'

# The root directory can be a mounted samba network share. Set this to True to
# make it possible to start before the network share is mounted.
# Note: it will not be possible to get file content or Exif data from JPEG images
# when the root directory is missing.
ALLOW_MISSING_ROOT_DIRECTORY = True

# Files are ignored when any of the blacklisted file patterns can be found in the file path.
# Black-listed file patterns are case sensitive.
BLACKLISTED_FILE_PATH_PATTERNS = ['TN_', 'Thumbs.db', 'nytt/', 'unsorted/', 'privat/']

# If a file is not blacklisted a whitelisted test will be done.
# A file will be added, during an import action, if its path ends with any of
# the specified patterns. Specify an empty list to white-list all files (if
# not being black-listed before)
# Note: file path is made lower-case before scan (i.e. specify the file
#       extension in lower-case).
WHITELISTED_FILE_EXTENSIONS = ['.jpg', '.png', '.bmp', '.gif', '.avi',
                               '.mpg', '.mp4', '.mkv', '.mov', '.pdf']
