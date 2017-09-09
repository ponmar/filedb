# README #

This is a project for storing meta-data for files. This is used at home for making my image and video collection searchable and for running slideshows.

Files are imported to a database via a web application. Categories like persons, locations and tags can be created and connected to imported files. Each category has its own details which can example be used to link to Google Maps or indicate person age in an image.

Exif data is parsed from JPEG images to automatically set available categorization data. No file or Exif data is modified via FileDB.

## Interfaces ##

A Flask application provides user friendly web pages and a HTTP API for doing tasks from other applications. The web pages uses the API from its Javascript code to fetch information and perform other tasks.

## Documentation ##

The release contains the following documentation:

* This README
* API documentation
* Web application help page

## Installation ##

Note that it is recommended to have a backup procedure for your collection of files before running FileDB (although FileDB itself does not modify your files).

The first time you install FileDB the pre-requisites needs to be setup:

- Install Python and pip (installation instructions depends on your OS)
- Install Flask (a web server for running server-side code) and Pillow (for reading date and time from JPEG images) Python packages:
      pip install flask
      pip install pillow
  
When the pre-requisites are fulfilled, do the following:

- Edit configuration parameters in config.py. Configuration parameters are described in that file.
- Create the database:
  Warning! This command removes all existing data from the FileDB database (don't run this command when the database is populated later).
      python runserver.py --initdb
- Decide how and when to backup your FileDB data (filedb.db)

## Upgrading ##

This chapter describes how to upgrade from an earlier version of FileDB.

- Download the latest FileDB version from here
- Follow the installation chapter for the new FileDB (including updating the configuration parameters)
- Copy filedb.db from the old installation to the new installation

Note that the database format should not be changed in future FileDB revisions, but the configuration file (config.py) may be changed.

## Starting the Server ##

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

See the included API documentation for more details.