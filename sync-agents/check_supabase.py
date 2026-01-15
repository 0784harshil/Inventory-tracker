
import requests
import os
from dotenv import load_dotenv

load_dotenv('deploy-store-h/config.ini')

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://xsyduihbgizgfvqucioq.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') 
STORE_ID = "STORE-H"

def check():
    print(f"Checking Supabase for Store: {STORE_ID}")
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    
    # Check count
    url = f"{SUPABASE_URL}/rest/v1/inventory?store_id=eq.{STORE_ID}&select=count"
    try:
        res = requests.get(url, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Range-Unit: {res.headers.get('Content-Range')}")
        # Supabase returns count in Content-Range header usually, or just list if no Prefer: count=exact
    except Exception as e:
        print(f"Error: {e}")

    # Fetch 1 item
    url = f"{SUPABASE_URL}/rest/v1/inventory?store_id=eq.{STORE_ID}&limit=1"
    res = requests.get(url, headers=headers)
    print(f"Items Response: {res.text}")

if __name__ == "__main__":
    check()
