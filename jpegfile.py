from PIL import Image
from PIL.ExifTags import TAGS


class JpegFile:
    def __init__(self, filename):
        self.__tags = {}

        image = Image.open(filename)
        info = image._getexif()
        for tag, value in info.items():
            decoded = TAGS.get(tag, tag)
            self.__tags[decoded] = value
        #print(str(exif_file.__tags))

    def get_date_time(self):
        if 'DateTime' in self.__tags:
            return self.__tags['DateTime']
        return None
