"""Python example code for fetching data from FileDB.
Notes:
    - Install requests with "pip install requests" if needed.
"""
import requests

BASE_URL = 'http://localhost:5000/'


def get_json(url):
    r = requests.get(url)
    print(r.status_code)
    return r.json()


def find_item(item_id, json_list):
    for item in json_list:
        if item['id'] == item_id:
            return item
    return None


if __name__ == '__main__':
    files = get_json(BASE_URL + 'api/files')['files']
    persons = get_json(BASE_URL + 'api/persons')['persons']
    locations = get_json(BASE_URL + 'api/locations')['locations']
    tags = get_json(BASE_URL + 'api/tags')['tags']

    for file in files:
        file_path = file['path']
        file_description = file['description']
        file_date = file['datetime']
        file_person_names = []
        file_location_names = []
        file_tag_names = []

        for person_id in file['persons']:
            person = find_item(person_id, persons)
            if person is not None:
                file_person_names.append(person['name'])

        for location_id in file['locations']:
            location = find_item(location_id, locations)
            if location is not None:
                file_location_names.append(location['name'])

        for tag_id in file['tags']:
            tag = find_item(tag_id, tags)
            if tag is not None:
                file_tag_names.append(tag['name'])
