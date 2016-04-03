DATABASE = 'flaskr.db'
SQL_SCHEMA = 'schema.sql'

DEBUG = True

SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'admin'

FILES_ROOT_DIRECTORY = 'x:/'
#FILES_ROOT_DIRECTORY = 'files'

# Black-listed file pattern in case sensitive.
BLACKLISTED_FILE_PATH_PATTERNS = ['Thumbs.db', 'nytt/', 'unsorted/', 'TN_', 'privat/']

# Specify an empty list to white-list all files (if not being black-listed before)
# File path is made lower-case before scan (i.e. specify the file extension in lower-case).
WHITELISTED_FILE_EXTENSIONS = ['.jpg', '.png', '.bmp', '.gif', '.avi', '.mpg', '.mp4']
