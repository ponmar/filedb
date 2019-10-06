import datetime
from io import BytesIO
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

# Note why the following Exif tags are not used:
# * DateTime: the date and time the file was changed (may be much later)
# * DateTimeDigitized: when the image was stored as digital data (when copied from a digital camera to the computer)
DATE_TIME_TAG_NAME = 'DateTimeOriginal'
GPS_TAG = 'GPSInfo'


def is_jpeg_file(file_path):
    # Note: sometimes .JPG file extension is used instead of .jpg
    return file_path.lower().endswith('.jpg')


class JpegFile:
    def __init__(self, filename):
        """Parses Exif data from a JPEG image.
        May raise IOError for broken JPEG files.
        """
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
                    value = gps_data
                self.__tags[decoded] = value

    def get_exif_data(self):
        """Get all parsed Exif data.
        Note: normally the get methods in this class should be used to get specific data.
        Note: values in the returned dictionary may contain bytes data that needs to be decoded depending on its use.
        """
        return self.__tags

    def get_date_time(self):
        """Get the date time in text format (YYYY-MM-DDTHH:MM:SS) from the parsed Exif, or None."""
        if DATE_TIME_TAG_NAME in self.__tags:
            try:
                # Check parsing and change format from "YYYY:MM:DD HH:MM" to "YYYY-MM-DDTHH:MM:SS".
                # The string "    :  :     :  :  " (set by a digital camera) should return None.
                # Note that this also handles the case when "0000:00:00 00:00:00" is used by some cameras.
                parsed_date_time = datetime.datetime.strptime(self.__tags[DATE_TIME_TAG_NAME], '%Y:%m:%d %H:%M:%S')
                return parsed_date_time.strftime('%Y-%m-%dT%H:%M:%S')
            except ValueError:
                # Date or time parse error, ignore
                pass
        return None

    def get_gps_position(self):
        """Returns the latitude and longitude, if available, from the parsed Exif data.
        Returns (None, None) when there is no GPS data available.
        """
        lat = None
        lon = None

        if GPS_TAG in self.__tags:
            gps_info = self.__tags[GPS_TAG]

            gps_latitude = gps_info.get('GPSLatitude')
            gps_latitude_ref = gps_info.get('GPSLatitudeRef')
            gps_longitude = gps_info.get('GPSLongitude')
            gps_longitude_ref = gps_info.get('GPSLongitudeRef')

            if gps_latitude and gps_latitude_ref and gps_longitude and gps_longitude_ref:
                lat = self.__convert_to_degrees(gps_latitude)
                if gps_latitude_ref != "N":
                    lat *= -1

                lon = self.__convert_to_degrees(gps_longitude)
                if gps_longitude_ref != "E":
                    lon *= -1

        return lat, lon

    def __convert_to_degrees(self, value):
        """Converts a GPS coordinate to degrees in float format."""
        deg_num, deg_denom = value[0]
        d = float(deg_num) / float(deg_denom)

        min_num, min_denom = value[1]
        m = float(min_num) / float(min_denom)

        sec_num, sec_denom = value[2]
        s = float(sec_num) / float(sec_denom)

        return d + (m / 60.0) + (s / 3600.0)


class JpegThumbnail:
    def __init__(self, filename, size=(128, 128), fix_orientation=False):
        image = Image.open(filename)

        if fix_orientation:
            try:
                image_exif = image._getexif()
                image_orientation = image_exif[274]
                if image_orientation in (2, '2'):
                    image = image.transpose(Image.FLIP_LEFT_RIGHT)
                elif image_orientation in (3, '3'):
                    image = image.transpose(Image.ROTATE_180)
                elif image_orientation in (4, '4'):
                    image = image.transpose(Image.FLIP_TOP_BOTTOM)
                elif image_orientation in (5, '5'):
                    image = image.transpose(Image.ROTATE_90).transpose(Image.FLIP_TOP_BOTTOM)
                elif image_orientation in (6, '6'):
                    image = image.transpose(Image.ROTATE_270)
                elif image_orientation in (7, '7'):
                    image = image.transpose(Image.ROTATE_270).transpose(Image.FLIP_TOP_BOTTOM)
                elif image_orientation in (8, '8'):
                    image = image.transpose(Image.ROTATE_90)
            except (KeyError, AttributeError, TypeError, IndexError):
                pass

        bytes_io = BytesIO()
        image.thumbnail(size)
        image.save(bytes_io, 'JPEG')
        bytes_io.seek(0)
        self.__data = bytes_io

    def get_data(self):
        return self.__data
