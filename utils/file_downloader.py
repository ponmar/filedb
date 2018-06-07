import requests
import argparse

TITLE = 'FileDB file downloader'
FILENAME = '{index:0>3}_{file_id}.jpg'
FILEDB_FILECONTENT_URL = '{}/api/filecontent/{}'


def get_file(url):
    r = requests.get(url)
    if r.status_code != requests.codes.ok:
        print('Server returned status code {}'.format(r.status_code))
        return None
    return r.content


def parse_file_ids(files_str):
    file_id_strs = files_str.split(';')
    file_ids = []
    for file_id_str in file_id_strs:
        if file_id_str:
            file_ids.append(int(file_id_str))
    return file_ids


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=TITLE)
    parser.add_argument('server', help='Example: http://localhost')
    parser.add_argument('files', help='Example: 20;3;2043')
    args = parser.parse_args()

    filename_index = 1
    for file_id in parse_file_ids(args.files):
        url = FILEDB_FILECONTENT_URL.format(args.server, file_id)
        file_content = get_file(url)
        if file_content is not None:
            filename = FILENAME.format(index=filename_index, file_id=file_id)
            with open(filename, 'wb') as f:
                f.write(file_content)
        else:
            print('Could not download ' + url)
        filename_index += 1
