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

        self.__image = Image.open(filename)
        try:
            image_exif = self.__image._getexif()
            if image_exif is not None:
                for tag, value in image_exif.items():
                    decoded = TAGS.get(tag, tag)
                    if decoded == GPS_TAG:
                        gps_data = {}
                        for subGpsValue in value:
                            sub_decoded = GPSTAGS.get(subGpsValue, subGpsValue)
                            gps_data[sub_decoded] = value[subGpsValue]
                        value = gps_data
                    self.__tags[decoded] = value
        except AttributeError:
            # _getexif() attribute only available for jpeg images
            pass

    def create_fixed_orientation(self, image_type='JPEG'):
        bytes_io = BytesIO()
        reoriented_image = self.__reorient_image()
        reoriented_image.save(bytes_io, image_type)
        bytes_io.seek(0)
        return bytes_io

    def create_thumbnail(self, size=(128, 128), fix_orientation=True, image_type='JPEG'):
        thumbnail = self.__image
        if fix_orientation:
            thumbnail = self.__reorient_image()
        bytes_io = BytesIO()
        thumbnail.thumbnail(size, Image.ANTIALIAS)
        thumbnail.save(bytes_io, image_type)
        bytes_io.seek(0)
        return bytes_io

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

    def __reorient_image(self):
        try:
            image_exif = self.__image._getexif()
            image_orientation = image_exif[274]
            if image_orientation in (2, '2'):
                return self.__image.transpose(Image.FLIP_LEFT_RIGHT)
            elif image_orientation in (3, '3'):
                return self.__image.transpose(Image.ROTATE_180)
            elif image_orientation in (4, '4'):
                return self.__image.transpose(Image.FLIP_TOP_BOTTOM)
            elif image_orientation in (5, '5'):
                return self.__image.transpose(Image.ROTATE_90).transpose(Image.FLIP_TOP_BOTTOM)
            elif image_orientation in (6, '6'):
                return self.__image.transpose(Image.ROTATE_270)
            elif image_orientation in (7, '7'):
                return self.__image.transpose(Image.ROTATE_270).transpose(Image.FLIP_TOP_BOTTOM)
            elif image_orientation in (8, '8'):
                return self.__image.transpose(Image.ROTATE_90)
        except (KeyError, AttributeError, TypeError, IndexError):
            pass
        # Create a copy of the image to not modify the original data
        return self.__image.copy()
