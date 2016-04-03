DATABASE = 'flaskr.db'
SQL_SCHEMA = 'schema.sql'

DEBUG = True

SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'admin'

FILES_ROOT_DIRECTORY = 'x:/'
#FILES_ROOT_DIRECTORY = 'files'

# Files are ignored when any of the blacklisted file patterns can be found in the file path.
# Black-listed file patterns are case sensitive.
BLACKLISTED_FILE_PATH_PATTERNS = ['Thumbs.db', 'nytt/', 'unsorted/', 'TN_', 'privat/']

# If a file is not blacklisted a whitelisted test will be done.
# A file will be added if its path ends with any of the specified patterns.
# Specify an empty list to white-list all files (if not being black-listed before)
# Note: file path is made lower-case before scan (i.e. specify the file extension in lower-case).
WHITELISTED_FILE_EXTENSIONS = ['.jpg', '.png', '.bmp', '.gif', '.avi', '.mpg', '.mp4', '.mkv', '.mov']
