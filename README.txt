Installation
============
1. Install Python and pip
2. Install Flask (web server) and Pillow (for reading date and time from JPEG images):
   >pip install flask
   >pip install pillow
3. Edit configuration in flaskr.py


Creating the database
=====================
python runserver.py --initdb


Import files recursively (optional)
===================================
python runserver.py --importdir <dir>


Starting the server
===================
python runserver.py --runserver <dir>


Backup
======
Decide how and when to backup your database (flaskr.db)
