from PIL import Image
from PIL.ExifTags import TAGS

DATE_AND_TIME_TAG_VALUE_LENGTH = len('YYYY:MM:DD HH:MM:SS')
# Note: there is also a DateTime (can be much later?) and DateTimeDigitized
DATE_TIME_TAG_NAME = 'DateTimeOriginal'


def is_jpeg_file(file_path):
    # Note: sometimes .JPG file extension is used instead of .jpg
    return file_path.lower().endswith('.jpg')


class JpegFile:
    def __init__(self, filename):
        self.__tags = {}

        image = Image.open(filename)
        info = image._getexif()
        if info is not None:
            for tag, value in info.items():
                decoded = TAGS.get(tag, tag)
                self.__tags[decoded] = value
        #print(str(self.__tags))

    def get_date_time(self):
        if DATE_TIME_TAG_NAME in self.__tags:
            # TODO: use regular expressions instead?
            date_time = self.__tags[DATE_TIME_TAG_NAME]
            if len(date_time) == DATE_AND_TIME_TAG_VALUE_LENGTH:
                # Change format from YYYY:MM:DD HH:MM -> YYYY-MM-DDTHH:MM:SS
                return '{}-{}-{}T{}'.format(date_time[:4], date_time[5:7], date_time[8:10], date_time[11:])
        return None
