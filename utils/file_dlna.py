import argparse
import urllib
import urllib.request
import time
try:
    import dlnap
except ImportError:
    print('Could not import required dlnap module. Please download from https://github.com/cherezov/dlnap/')
    exit(1)

TITLE = 'FileDB search result dlna playback'
FILEDB_FILECONTENT_URL = '{}/api/filecontent/{}'
CONTENT_TYPES_TO_PLAY = ['image/jpeg']
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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=TITLE)
    parser.add_argument('server', help='Example: http://192.168.0.29')
    parser.add_argument('device', help='Example: "Living Room"')
    parser.add_argument('files', help='Example: 20;3;2043')
    args = parser.parse_args()

    devices = dlnap.discover(args.device)
    if not devices:
        print('No such dlna device name: ' + args.device)
        exit(1)

    for file_id in parse_file_ids(args.files):
        url = FILEDB_FILECONTENT_URL.format(args.server, file_id)

        content_type = get_content_type(url)
        if content_type is None:
            print('Unable to get file content type from FileDB server')
            exit(1)
        elif content_type in CONTENT_TYPES_TO_PLAY:
            for device in devices:
                device.set_current_media(url=url)
                device.play()
            time.sleep(FILE_DELAY)
        else:
            print('Ignored file with id {} due to content type {}'.format(file_id, content_type))
