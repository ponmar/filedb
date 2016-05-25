Installation
============
1. Install Python and pip (installation instructions depends on your OS)
2. Install Flask (web server) and Pillow (for reading date and time from JPEG images):
   >pip install flask
   >pip install pillow
3. Edit configuration in config.py


Creating the database
=====================
Note! This command removes all existing data in the database if it already exists.
>python runserver.py --initdb


Starting the server
===================
>python runserver.py --runserver <dir>


Backup
======
Decide how and when to backup your database (flaskr.db)
