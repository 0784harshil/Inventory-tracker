
import requests
import json

BASE_URL = "http://localhost:3000/api/inventory"
ITEM_NUM = "TEST-WEB-02"

# First, need to find the ID of the item.
# We can search via GET
print("Searching for item...")
res = requests.get(f"{BASE_URL}?search={ITEM_NUM}")
data = res.json()

if not data.get('items'):
    print("Item not found. Creating it...")
    # Create if missing (POST)
    payload = {
        "item_num": ITEM_NUM,
        "item_name": "Browser Test Item 2",
        "store_id": "STORE-H",
        "dept_id": "TEST",
        "item_type": 7,  # Sending as 7
        "in_stock": 100,
        "cost": 50.00,
        "price": 100.00
    }
    res = requests.post(BASE_URL, json=payload)
    print(f"POST status: {res.status_code}")
    print(f"POST response: {res.text}")
    print(res.json())
else:
    item_id = data['items'][0]['id']
    print(f"Item found: {item_id}")
    
    # PATCH
    print("Sending PATCH with item_type: 9")
    url = f"{BASE_URL}/{item_id}"
    payload = {
        "dept_id": "MISC"
    }
    res = requests.patch(url, json=payload)
    print(f"PATCH status: {res.status_code}")
    print(f"PATCH response: {res.text}")
