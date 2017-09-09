# README #

This is a project for storing meta-data for files. This is used at home for making my image and video collection searchable and for running slideshows.

### Categorization ###

Files are imported to a database via a web application. Categorizations like persons, locations and tags can be created and connected to imported files. Each categorization has its own details which can example be used to link to Google Maps or indicate person age in an image.

Exif data is parsed from JPEG images to automatically set available categorization data. No file or Exif data is modified via FileDB.

### Interfaces ###

All categorization data is stored in an internal database which is accessed via a Flask application (Python). The Flask application provides user friendly web pages and a HTTP API for doing tasks from other applications. The web pages uses the API from its Javascript code to fetch information and perform other tasks.

### Documentation ###

The release contains the following documentation:
* README with installation/upgrade notes and instructions for how to run the web application
* API documentation.
* Web application help page