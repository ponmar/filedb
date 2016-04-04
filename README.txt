Installation
============
1. Install Python and pip (installation instructions depends on your OS)
2. Install Flask (web server) and Pillow (for reading date and time from JPEG images):
   >pip install flask
   >pip install pillow
3. Edit configuration in config.py


Creating the database
=====================
python runserver.py --initdb


Import files recursively (optional)
===================================
* Start server
* Access /import URL (until button added on web page)


Starting the server
===================
python runserver.py --runserver <dir>


Backup
======
Decide how and when to backup your database (flaskr.db)
