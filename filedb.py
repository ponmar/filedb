# from tutorial at https://dev.mysql.com/doc/connector-python/en/connector-python-example-ddl.html

import mysql.connector
from mysql.connector import errorcode

FILES_TABLE = (
    "CREATE TABLE `files` ("
    "  `path` varchar(255) NOT NULL,"
    "  `description` varchar(255),"
    "  PRIMARY KEY (`path`)"
    ") ENGINE=InnoDB")

PERSONS_TABLE = (
    "CREATE TABLE `persons` ("
    "  `name` varchar(255) NOT NULL,"
    "  PRIMARY KEY (`name`)"
    ") ENGINE=InnoDB")

LOCATIONS_TABLE = (
    "CREATE TABLE `locations` ("
    "  `name` varchar(255) NOT NULL,"
    "  PRIMARY KEY (`name`)"
    ") ENGINE=InnoDB")

FILEPERSONS_TABLE = (
    "CREATE TABLE `filepersons` ("
    "  `filepath` varchar(255) NOT NULL,"
    "  `personname` varchar(255) NOT NULL,"
    "  CONSTRAINT `filepath_ibfk_1` FOREIGN KEY (`filepath`) "
    "     REFERENCES `files` (`path`) ON DELETE CASCADE, "
    "  CONSTRAINT `filepath_ibfk_2` FOREIGN KEY (`personname`) "
    "     REFERENCES `persons` (`name`) ON DELETE CASCADE"
    ") ENGINE=InnoDB")

FILELOCATIONS_TABLE = (
    "CREATE TABLE `filelocations` ("
    "  `filepath` varchar(255) NOT NULL,"
    "  `locationname` varchar(255) NOT NULL,"
    "  CONSTRAINT `filelocations_ibfk_1` FOREIGN KEY (`filepath`) "
    "     REFERENCES `files` (`path`) ON DELETE CASCADE, "
    "  CONSTRAINT `filelocations_ibfk_2` FOREIGN KEY (`locationname`) "
    "     REFERENCES `locations` (`name`) ON DELETE CASCADE"
    ") ENGINE=InnoDB")

INSERT_FILE = "INSERT INTO files(path, description) VALUES('{}', '{}')"
INSERT_PERSON = "INSERT INTO persons(name) VALUES('{}')"
INSERT_LOCATION = "INSERT INTO locations(name) VALUES('{}')"
INSERT_FILEPERSON = "INSERT INTO filepersons(filepath, personname) VALUES ('{}', '{}')"
INSERT_FILELOCATION = "INSERT INTO filelocations(filepath, locationname) VALUES ('{}', '{}')"

FILES_QUERY = "SELECT path, description FROM files"
PERSONS_QUERY = "SELECT name FROM persons"
LOCATIONS_QUERY = "SELECT name FROM locations"


class MySqlWrapper:
    def __init__(self, user, password, host, database = None):
        if database is None:
            self.__cnx = mysql.connector.connect(user=user, password=password, host=host)
        else:
            self.__cnx = mysql.connector.connect(user=user, password=password, host=host, database=database)
        self.__cursor = self.__cnx.cursor()

    def create_database(self, database_name):
        try:
            self.__cnx.database = database_name
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_DB_ERROR:
                self.__create_database(self.__cursor)
                self.__cnx.database = database_name
            else:
                print(err)
                exit(1)

    def __create_database(self, database_name):
        try:
            self.__cursor.execute(
                "CREATE DATABASE {} DEFAULT CHARACTER SET 'utf8'".format(database_name))
        except mysql.connector.Error as err:
            print("Failed creating database: {}".format(err))
            exit(1)

    def drop_table(self, table_name):
        self.execute('DROP TABLE IF EXISTS `{}`'.format(table_name))

    def create_table(self, command):
        try:
            self.execute(command)
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
                print("already exists.")
            else:
                print(err.msg)

    def close(self):
        self.__cursor.close()
        self.__cnx.close()

    def execute(self, command, data = None):
        if data is None:
            print('Executing command "{}"'.format(command))
            self.__cursor.execute(command)
        else:
            print('Executing command "{}" with data "{}"'.format(command, data))
            self.__cursor.execute(command, data)

    def execute_with_result(self, command, data = None):
        self.execute(command, data)
        rows = []
        for row in self.__cursor:
            rows.append(row)
        return rows


class FileDatabase:
    def __init__(self, user, password, host, database):
        self.__user = user
        self.__password = password
        self.__host = host
        self.__database = database
        self.__db = None

    def close(self):
        self.__disconnect()

    def reset(self):
        self.__disconnect()
        self.__connect()
        self.__remove_tables()
        self.__create_tables()
        self.__connect()

    def add_person(self, name):
        self.__db.execute(INSERT_PERSON.format(name))

    def add_location(self, name):
        self.__db.execute(INSERT_LOCATION.format(name))

    def add_file(self, path, description = None):
        self.__db.execute(INSERT_FILE.format(path, description))

    def add_file_location(self, file_path, location_name):
        self.__db.execute(INSERT_FILELOCATION.format(file_path, location_name))

    def add_file_person(self, file_path, person_name):
        self.__db.execute(INSERT_FILEPERSON.format(file_path, person_name))

    def get_files(self):
        return self.__db.execute_with_result(FILES_QUERY)

    def get_persons(self):
        return self.__db.execute_with_result(PERSONS_QUERY)

    def get_locations(self):
        return self.__db.execute_with_result(LOCATIONS_QUERY)

    def __connect(self, use_database = True):
        self.__disconnect()
        if use_database:
            self.__db = MySqlWrapper(self.__user, self.__password, self.__host, self.__database)
        else:
            self.__db = MySqlWrapper(self.__user, self.__password, self.__host)

    def __disconnect(self):
        if self.__db is not None:
            self.__db.close()
            self.__db = None

    def __remove_tables(self):
        self.__db.drop_table('filelocations')
        self.__db.drop_table('filepersons')
        self.__db.drop_table('locations')
        self.__db.drop_table('persons')
        self.__db.drop_table('files')

    def __create_tables(self):
        self.__connect(False)
        self.__db.create_database(self.__database)
        self.__connect()
        self.__db.create_table(FILES_TABLE)
        self.__db.create_table(PERSONS_TABLE)
        self.__db.create_table(LOCATIONS_TABLE)
        self.__db.create_table(FILEPERSONS_TABLE)
        self.__db.create_table(FILELOCATIONS_TABLE)


def main():
    db = FileDatabase('eponmar', 'gurkor', '127.0.0.1', 'filedb')
    try:
        db.reset()

        db.add_file('test/myfile.jpg', 'An example')
        db.add_person('Pontus Markstrom')
        db.add_location('Linkoping')

        db.add_file_location('test/myfile.jpg', 'Linkoping')
        db.add_file_person('test/myfile.jpg', 'Pontus Markstrom')

        locations = db.get_locations()
        persons = db.get_persons()
        files = db.get_files()

        print("Locations: " + str(locations))
        print("Persons: " + str(persons))
        print("Files: " + str(files))

    finally:
        db.close()

if __name__ == "__main__":
    main()
