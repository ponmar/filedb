import argparse
import time
import io
import requests
from decimal import *
import pygame
from pygame.locals import *

TITLE = 'FileDB slideshow'
FILEDB_QUERY = '{}/api/randomfile'
FILEDB_FILECONTENT = '{}/api/filecontent/{}'
DISPLAY_TIME = 5
STRETCH = False

def get_json(url):
    r = requests.get(url)
    if r.status_code != 200:
        print('Server returned status code {}'.format(r.status_code))
        return None
    return r.json()

def get_file(url):
    r = requests.get(url)
    if r.status_code != 200:
        print('Server returned status code {}'.format(r.status_code))
        return None
    return r.content
    
def get_random_file_url(filedb_base_url):
    json = get_json(FILEDB_QUERY.format(filedb_base_url))
    if json is None:
        return None
    return FILEDB_FILECONTENT.format(filedb_base_url, json['id'])

def load_image(image_data, screen_width, screen_height):
    image = pygame.image.load(io.BytesIO(image_data))
    width = image.get_width()
    height = image.get_height()
    if width < screen_width and STRETCH:
        height = height * (Decimal(screen_width)/Decimal(width))
        width = screen_width
        image = pygame.transform.scale(image, (width, height))
    if height < screen_height and STRETCH:
        width = width * (Decimal(screen_height)/Decimal(height))
        height = screen_height
        image = pygame.transform.scale(image, (width, height))
    if width > screen_width:
        height = height * (Decimal(screen_width)/Decimal(width))
        width = screen_width
        image = pygame.transform.scale(image, (width, height))
    if height > screen_height:
        width = width * (Decimal(screen_height)/Decimal(height))
        height = screen_height
        image = pygame.transform.scale(image, (width, height))
    return image, width, height
    
def run_slideshow(filedb_base_url):
    screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
    pygame.display.set_caption(TITLE)
    screen_width = screen.get_width()
    screen_height = screen.get_height()

    run = True
    while run:
        url = get_random_file_url(filedb_base_url)
        file_content = get_file(url)

        try:
            image, width, height = load_image(file_content, screen_width, screen_height)
            screen.fill(0)
            screen.blit(image, ((screen_width - width)/2, (screen_height - height)/2))
            pygame.display.update()

            t = time.time()
            goto_next = False
            while not goto_next and t + DISPLAY_TIME > time.time():
                for event in pygame.event.get():
                    if event.type == QUIT:
                        run = False
                        goto_next = True
                    elif event.type == KEYDOWN:
                        if event.key == K_SPACE or event.key == K_KP_ENTER or event.key == K_RETURN:
                            # Continue to next image
                            goto_next = True
                        if event.key == K_x or event.key == K_ESCAPE:
                            run = False
                            goto_next = True
                time.sleep(0.1)
        except pygame.error:
            print('Unable to load {}, trying next...'.format(url))

    pygame.quit()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=TITLE)
    parser.add_argument('filedbserverurl')
    args = parser.parse_args()
    run_slideshow(args.filedbserverurl)
