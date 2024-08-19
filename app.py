import os
import time
import io
import sqlite3
import logging
from PIL import Image
from flask import Flask, request, jsonify, render_template
import base64
import torch
import easyocr
from fuzzywuzzy import process
from colorama import Fore, Style, init

app = Flask(__name__)

init(autoreset=True)

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available())

ascii_art = " __     __            _____ _         ____  _     \n \\ \\   / /           / ____(_)       / __ \\| |    \n  \\ \\_/ /   _ ______| |  __ _ ______| |  | | |__  \n   \\   / | | |______| | |_ | |______| |  | | '_ \\ \n    | || |_| |      | |__| | |      | |__| | | | |\n    |_| \\__,_|       \\_____|_|       \\____/|_| |_|\n"

def search_card(query, limit=1):
    start_time = time.time()
    
    with sqlite3.connect('ygoprodeck.db') as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, type, race, atk, def, level,
                   cardmarket_price, tcgplayer_price, ebay_price, amazon_price, coolstuffinc_price, url
            FROM cards
        """)
        cards = cursor.fetchall()
        names = [row[1] for row in cards]
    
    best_match = process.extract(query, names, limit=limit)[0]
    
    for card in cards:
        if card[1] == best_match[0]:
            card_info = {
                "id": card[0],
                "name": card[1],
                "type": card[2],
                "race": card[3],
                "atk": card[4],
                "def": card[5],
                "level": card[6],
                "prices": {
                    "cardmarket_price": card[7],
                    "tcgplayer_price": card[8],
                    "ebay_price": card[9],
                    "amazon_price": card[10],
                    "coolstuffinc_price": card[11]
                },
                "url": card[12],
            }
            break
    
    elapsed_time = time.time() - start_time
    return best_match, card_info, elapsed_time

def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

def display_initialization_message():
    clear_console()
    print(f"{Fore.GREEN}{Style.BRIGHT}Initializing...{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}{Style.BRIGHT}Please scan a card using your phone.{Style.RESET_ALL}\n")

def display_card_info(response):
    clear_console()
    print(ascii_art)
    print(f"{Fore.YELLOW}{Style.BRIGHT}OCR Result: {Fore.WHITE}{response['OCR Result']}")
    print(f"\n{Fore.CYAN}{Style.BRIGHT}FUZZY SEARCH RESULT")
    print(f"{Fore.GREEN}Best Match: {Fore.WHITE}{response['Fuzzy Search']['Best Match']}")
    print(f"{Fore.GREEN}Match Percentage: {Fore.WHITE}{response['Fuzzy Search']['Match Percentage']}%")
    
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}CARD DETAILS")
    print(f"{Fore.RED}ID: {Fore.WHITE}{response['Card Details']['ID']}")
    print(f"{Fore.RED}Type: {Fore.WHITE}{response['Card Details']['Type']}")
    print(f"{Fore.RED}Race: {Fore.WHITE}{response['Card Details']['Race']}")
    
    if response['Card Details']['ATK']:
        print(f"{Fore.RED}ATK: {Fore.WHITE}{response['Card Details']['ATK']}")
    if response['Card Details']['DEF']:
        print(f"{Fore.RED}DEF: {Fore.WHITE}{response['Card Details']['DEF']}")
    if response['Card Details']['Level']:
        print(f"{Fore.RED}Level: {Fore.WHITE}{response['Card Details']['Level']}")
    
    print(f"\n{Fore.BLUE}{Style.BRIGHT}PRICES")
    for price_source, price in response['Card Details']['Prices'].items():
        print(f"{Fore.GREEN}{price_source.capitalize()}: {Fore.WHITE}{price}")
    
    print(f"\n{Fore.BLUE}{Style.BRIGHT}URL: {Fore.CYAN}{response['Card Details']['URL']}")
    print(f"\n{Fore.BLUE}Processing Time: {Fore.WHITE}{response['Processing Time']} seconds")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    try:
        data = request.json
        image_data = data['image'].split(',')[1]
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))

        ocr_result = reader.readtext(image, detail=0)
        ocr_text = ' '.join(ocr_result)
        
        best_match, card_info, elapsed_time = search_card(ocr_text)

        if best_match[1] < 90:
            clear_console()
            print(ascii_art)
            print(f"{Fore.RED}{Style.BRIGHT}Error: Card not recognized with sufficient accuracy. Match Percentage: {best_match[1]}%")
            return jsonify({'error': 'Card not recognized with sufficient accuracy.'}), 400
        
        response = {
            'OCR Result': ocr_text,
            'Fuzzy Search': {
                'Best Match': best_match[0],
                'Match Percentage': f"{best_match[1]}"
            },
            'Card Details': {
                'ID': card_info['id'],
                'Type': card_info['type'],
                'Race': card_info['race'],
                'ATK': card_info['atk'] if card_info['atk'] else '',
                'DEF': card_info['def'] if card_info['def'] else '',
                'Level': card_info['level'] if card_info['level'] else '',
                'Prices': {
                    'cardmarket_price': card_info['prices']['cardmarket_price'],
                    'tcgplayer_price': card_info['prices']['tcgplayer_price'],
                    'ebay_price': card_info['prices']['ebay_price'],
                    'amazon_price': card_info['prices']['amazon_price'],
                    'coolstuffinc_price': card_info['prices']['coolstuffinc_price']
                },
                'URL': card_info['url']
            },
            'Processing Time': f"{elapsed_time:.4f}"
        }
        
        display_card_info(response)
        
        return jsonify(response)
    except Exception as e:
        clear_console()
        print(f"{Fore.RED}{Style.BRIGHT}Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    display_initialization_message()
    app.run(host='0.0.0.0')
