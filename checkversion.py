import sys

# PIP is included with Python >= 3.4.
# Flask requires Python 2.7 or >= 3.4.
# Pillow requires Python 2.7 or >= 3.4.
# PyChromecast requires Python >=3.4.

MIN_PYTHON = (3, 4)

if sys.version_info < MIN_PYTHON:
    sys.exit("Python %s.%s or later is required.\n" % MIN_PYTHON)
