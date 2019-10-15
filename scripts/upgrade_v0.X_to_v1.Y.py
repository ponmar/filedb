import sqlite3
import argparse
import os

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='FileDB upgrade script')
    parser.add_argument('database', help='Example: filedb.db')
    args = parser.parse_args()
    
    if not os.path.isfile(args.database):
        print('Database file not found: ' + args.database)
        exit(1)
    
    connection  = sqlite3.connect(args.database)
    cursor = connection.cursor()
    cursor.execute('ALTER TABLE files ADD COLUMN position text')
    cursor.execute('ALTER TABLE persons ADD COLUMN profilefileid integer references files(id) on delete set null')
    connection.close()

    print('Upgrade complete')