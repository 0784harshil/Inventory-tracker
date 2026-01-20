
import requests
import os
import configparser

# Load Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_K = os.path.join(BASE_DIR, 'config-k.ini')
c = configparser.ConfigParser()
c.read(FILE_K)
SUP = c['supabase']

URL = SUP.get('url')
KEY = SUP.get('key')
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

def debug():
    print("1. Inspecting 'transfers' columns explicitly...")
    res = requests.get(f"{URL}/rest/v1/transfers?select=*&limit=1", headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        if data:
            print(f"Transfers Keys: {list(data[0].keys())}")
    
    print("\n2. Checking 'transfer_items' table...")
    res2 = requests.get(f"{URL}/rest/v1/transfer_items?select=*&limit=1", headers=HEADERS)
    if res2.status_code == 200:
        data2 = res2.json()
        if data2:
            print(f"Transfer Items Sample: {data2[0]}")
        else:
            print("Transfer Items table exists but empty.")
    else:
        print(f"Transfer Items Error: {res2.status_code} {res2.text}")

if __name__ == "__main__":
    debug()
