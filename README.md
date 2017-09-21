# README #

## About ##

This is a project for storing meta-data for files. This is used at home for making my image and video collection searchable and for running slideshows.

FileDB provides a web application, that adapts for mobile devices, and a HTTP API for doing tasks from other applications. The web application uses the API from its Javascript code to fetch and modify data.

Files are imported to a database via the web application. Categories like persons, locations and tags can be created and connected to imported files. Each category has its own details which can for example be used to link to Google Maps or indicate person age in an image.

Exif data is parsed from JPEG images to automatically set available categorization data. Files are not modified via FileDB.

## Download ##

Either download a specific release by finding the latest tag [here](https://bitbucket.org/pontusmarkstrom/filedb/downloads/?tab=tags), or use the master branch.

## Documentation ##

The release contains the following documentation:

* This README
* [Changelog](CHANGES.html)
* [API documentation](API.html)
* Web application help page (FileDB must be running to make it accessible)
* [Development notes](DESIGN.txt)

## Installation ##

Note that it is recommended to have a backup procedure for your collection of files before running FileDB (although FileDB itself does not modify your files).

FileDB pre-requisites:

- Python and pip (installation instructions depends on your OS)
- Flask (a web framework for running server-side code):

        pip install flask

- Pillow (for reading date, time and GPS location information from JPEG images):

        pip install pillow

When the pre-requisites are fulfilled, do the following:

- Edit configuration for your needs (see config.py)
- Create the database:

  **Warning!** This command removes all existing data from the FileDB database (don't run this command when the database is populated later).

        python runserver.py --initdb

- Decide your backup policy for your FileDB data (filedb.db)

## Upgrading ##

This chapter describes how to upgrade from an earlier version of FileDB.

- Download a new FileDB version
- Follow the installation chapter for the new FileDB version
- Copy your data (filedb.db) from the old FileDB directory to the new one

Note that the database format should not be changed in future FileDB revisions, but the configuration file (config.py) may be changed.

## Starting the FileDB Server ##

This section describes how to start the FileDB server with the Flask built-in HTTP server. Note that it is also possible to [deploy Flask applications (FileDB) to a WSGI server](http://flask.pocoo.org/docs/0.12/deploying/#deployment) (not yet tested).

Print help:

    python runserver.py --help

Start the server:

    python runserver.py

Note that your OS can be setup to run this command at startup. How to do this depends on your OS.

## Accessing the FileDB Web Application ##

Open [http://localhost:5000](http://localhost:5000) in a browser. Note that the port may vary depending on your configuration.

The web application may also be reached from the network via an external IP address if configured so.

## Accessing the FileDB API ##

The API is accessed via the same web server as the web application.

See the included [API documentation](API.html) for more details.


## Licenses ##

This project uses the [MIT license](LICENSE.txt).

jQuery is used by the web application for Ajax calls and DOM updates. It uses the [MIT license](https://jquery.org/license/).

Bootstrap is used by the web application for GUI layout. It uses the [MIT license](https://v4-alpha.getbootstrap.com/about/license/).

[Lightbox](http://lokeshdhakar.com/projects/lightbox2/), by Lokesh Dhakar, is used as a fullscreen image viewer. It uses the [MIT license](http://lokeshdhakar.com/projects/lightbox2/#license).
