from PIL import Image
from PIL.ExifTags import TAGS

DATE_AND_TIME_TAG_VALUE_LENGTH = len('YYYY:MM:DD HH:MM:SS')
DATE_TIME_TAG_NAME = 'DateTime'


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
        if DATE_TIME_TAG_NAME in self.__tags:
            # TODO: use regular expressions instead?
            date_time = self.__tags[DATE_TIME_TAG_NAME]
            if len(date_time) == DATE_AND_TIME_TAG_VALUE_LENGTH:
                # Change format from YYYY:MM:DD HH:MM -> YYYY-MM-DDTHH:MM:SS
                return '{}-{}-{}T{}'.format(date_time[:4], date_time[5:7], date_time[8:10], date_time[11:])
        return None
