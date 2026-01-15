
import requests
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
url = config.get('supabase', 'url')
key = config.get('supabase', 'key')

headers = {'apikey': key, 'Authorization': f'Bearer {key}'}
res = requests.get(f'{url}/rest/v1/inventory?item_name=eq.DELETED', headers=headers)

items = res.json()
print(f"Items marked 'DELETED' in Cloud: {len(items)}")
for i in items:
    print(f"  - {i['item_num']} (Store: {i['store_id']})")
