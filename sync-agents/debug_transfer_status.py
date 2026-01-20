
import requests
import os
import configparser
import json
from datetime import datetime, timezone

# Load Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_K = os.path.join(BASE_DIR, 'config-k.ini')
c = configparser.ConfigParser()
c.read(FILE_K)
SUP = c['supabase']
URL = SUP.get('url')
KEY = SUP.get('key')
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

TID = "6ee0c5ef-4e1a-4360-b8eb-b1311f0a396e" # From logs

def try_status(status):
    print(f"Trying status: '{status}'...")
    payload = {
        "status": status,
        "shipped_at": datetime.now(timezone.utc).isoformat()
    }
    res = requests.patch(f"{URL}/rest/v1/transfers?id=eq.{TID}", headers=HEADERS, json=payload)
    if res.status_code == 204:
        print("   [SUCCESS] Accepted.")
        return True
    else:
        print(f"   [FAIL] {res.status_code} {res.text}")
        return False

def debug():
    # Candidates
    candidates = ["in_transit", "In-Transit", "shipped", "Shipped", "transit", "processing"]
    
    for s in candidates:
        if try_status(s):
            break
            
if __name__ == "__main__":
    debug()
