import sqlite3
import requests
import json
import os
import time

base_url = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'

def create_database():
    if os.path.exists('ygoprodeck.db'):
        os.remove('ygoprodeck.db')
    
    conn = sqlite3.connect('ygoprodeck.db')
    c = conn.cursor()
   
    c.execute('''
    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY,
        name TEXT,
        type TEXT,
        desc TEXT,
        race TEXT,
        archetype TEXT,
        atk INTEGER,
        def INTEGER,
        level INTEGER,
        attribute TEXT,
        scale INTEGER,
        linkval INTEGER,
        linkmarkers TEXT,
        cardmarket_price REAL,
        tcgplayer_price REAL,
        ebay_price REAL,
        amazon_price REAL,
        coolstuffinc_price REAL,
        url TEXT,
        full_json TEXT
    )
    ''')
   
    conn.commit()
    conn.close()

def insert_card_to_db(card_data):
    conn = sqlite3.connect('ygoprodeck.db')
    c = conn.cursor()
    c.execute('''
    INSERT INTO cards (id, name, type, desc, race, archetype, atk, def, level, attribute, scale, linkval, linkmarkers,
                       cardmarket_price, tcgplayer_price, ebay_price, amazon_price, coolstuffinc_price, url, full_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''',
    (
        card_data.get('id'),
        card_data.get('name'),
        card_data.get('type'),
        card_data.get('desc'),
        card_data.get('race'),
        card_data.get('archetype'),
        card_data.get('atk'),
        card_data.get('def'),
        card_data.get('level'),
        card_data.get('attribute'),
        card_data.get('scale'),
        card_data.get('linkval'),
        ','.join(card_data.get('linkmarkers', [])),
        card_data['card_prices'][0].get('cardmarket_price'),
        card_data['card_prices'][0].get('tcgplayer_price'),
        card_data['card_prices'][0].get('ebay_price'),
        card_data['card_prices'][0].get('amazon_price'),
        card_data['card_prices'][0].get('coolstuffinc_price'),
        card_data.get('ygoprodeck_url'),
        json.dumps(card_data)
    ))
   
    conn.commit()
    conn.close()

def fetch_and_store_all_cards():
    response = requests.get(base_url)
    all_cards = response.json()['data']
    for card in all_cards:
        insert_card_to_db(card)

start_time = time.time()

create_database()
fetch_and_store_all_cards()

end_time = time.time()
total_time = end_time - start_time

print(f"All card data has been added to the database.")
print(f"Total time taken: {total_time:.2f} seconds")