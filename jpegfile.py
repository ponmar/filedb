from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

DATE_AND_TIME_TAG_VALUE_LENGTH = len('YYYY:MM:DD HH:MM:SS')

# Note: there is also a DateTime (can be much later?) and DateTimeDigitized
DATE_TIME_TAG_NAME = 'DateTimeOriginal'
GPS_TAG = 'GPSInfo'


def is_jpeg_file(file_path):
    # Note: sometimes .JPG file extension is used instead of .jpg
    return file_path.lower().endswith('.jpg')


class JpegFile:
    def __init__(self, filename):
        """May raise IOError for some JPEG files."""
        self.__tags = {}

        image = Image.open(filename)
        info = image._getexif()
        if info is not None:
            for tag, value in info.items():
                decoded = TAGS.get(tag, tag)
                if decoded == GPS_TAG:
                    gps_data = {}
                    for subGpsValue in value:
                        sub_decoded = GPSTAGS.get(subGpsValue, subGpsValue)
                        gps_data[sub_decoded] = value[subGpsValue]
                    self.__tags[decoded] = gps_data
                else:
                    self.__tags[decoded] = value
        print(str(self.__tags))

    def get_date_time(self):
        if DATE_TIME_TAG_NAME in self.__tags:
            # TODO: use regular expressions instead?
            date_time = self.__tags[DATE_TIME_TAG_NAME]
            if len(date_time) == DATE_AND_TIME_TAG_VALUE_LENGTH:
                # Change format from YYYY:MM:DD HH:MM -> YYYY-MM-DDTHH:MM:SS
                return '{}-{}-{}T{}'.format(date_time[:4], date_time[5:7], date_time[8:10], date_time[11:])
        return None

    def get_gps_position(self):
        """Returns the latitude and longitude, if available, from the provided exif_data (obtained through get_exif_data above)"""
        lat = None
        lon = None

        if GPS_TAG in self.__tags:
            gps_info = self.__tags[GPS_TAG]

            gps_latitude = gps_info.get('GPSLatitude')
            gps_latitude_ref = gps_info.get('GPSLatitudeRef')
            gps_longitude = gps_info.get('GPSLongitude')
            gps_longitude_ref = gps_info.get('GPSLongitudeRef')

            if gps_latitude and gps_latitude_ref and gps_longitude and gps_longitude_ref:
                lat = self.__convert_to_degress(gps_latitude)
                if gps_latitude_ref != "N":
                    lat *= -1

                lon = self.__convert_to_degress(gps_longitude)
                if gps_longitude_ref != "E":
                    lon *= -1

        return lat, lon

    def __convert_to_degress(self, value):
        """Helper function to convert the GPS coordinates stored in the EXIF to degress in float format"""
        deg_num, deg_denom = value[0]
        d = float(deg_num) / float(deg_denom)

        min_num, min_denom = value[1]
        m = float(min_num) / float(min_denom)

        sec_num, sec_denom = value[2]
        s = float(sec_num) / float(sec_denom)

        return d + (m / 60.0) + (s / 3600.0)
