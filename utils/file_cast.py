import argparse
import urllib
import urllib.request
import time
import pychromecast

TITLE = 'FileDB search result cast'
FILEDB_FILECONTENT_URL = '{}/api/filecontent/{}'
CONTENT_TYPES_TO_CAST = ['image/jpeg']
FILE_DELAY = 4


def parse_file_ids(files_str):
    file_id_strs = files_str.split(';')
    file_ids = []
    for file_id_str in file_id_strs:
        if file_id_str:
            file_ids.append(int(file_id_str))
    return file_ids


def get_content_type(url):
    try:
        with urllib.request.urlopen(url) as response:
            return response.info().get_content_type()
    except urllib.error.URLError:
        return None


def find_cast(name):
    for cc in pychromecast.get_chromecasts():
        if cc.name == name:
            return cc
    return None


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=TITLE)
    parser.add_argument('server', help='Example: http://192.168.0.29')
    parser.add_argument('device', help='Example: "Living Room"')
    parser.add_argument('files', help='Example: 20;3;2043')
    args = parser.parse_args()

    cast = find_cast(args.device)
    if not cast:
        print('No such cast device name: ' + args.device)
        exit(1)

    cast.wait()

    for file_id in parse_file_ids(args.files):
        url = FILEDB_FILECONTENT_URL.format(args.server, file_id)

        content_type = get_content_type(url)
        if content_type is None:
            print('Unable to get file content type from FileDB server')
            exit(1)
        elif content_type in CONTENT_TYPES_TO_CAST:
            cast.media_controller.play_media(url, content_type)
            cast.media_controller.block_until_active()
            time.sleep(FILE_DELAY)
        else:
            print('Ignored file with id {} due to content type {}'.format(file_id, content_type))
