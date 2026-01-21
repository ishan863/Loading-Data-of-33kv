import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("\n" + "="*100)
print(" ALL PSS STATIONS AND THEIR EQUIPMENT")
print("="*100 + "\n")

# Get all unique PSS stations and their equipment
pss_equipment = defaultdict(set)

entries = db.collection('daily_entries').get()

for entry in entries:
    data = entry.to_dict()
    pss = data.get('pssStation')
    
    if not pss:
        continue
    
    # Check for I/C
    if data.get('ic1'):
        pss_equipment[pss].add('I/C-1')
    if data.get('ic2'):
        pss_equipment[pss].add('I/C-2')
    
    # Check for PTR
    if data.get('ptr1_33kv'):
        pss_equipment[pss].add('PTR-1 33kV')
    if data.get('ptr2_33kv'):
        pss_equipment[pss].add('PTR-2 33kV')
    if data.get('ptr1_11kv'):
        pss_equipment[pss].add('PTR-1 11kV')
    if data.get('ptr2_11kv'):
        pss_equipment[pss].add('PTR-2 11kV')
    
    # Check for feeders
    feeders = data.get('feeders', {})
    for feeder_key, feeder_data in feeders.items():
        feeder_name = feeder_data.get('name', feeder_key)
        pss_equipment[pss].add(feeder_name)
    
    # Check for Station Transformer
    if data.get('stationTransformer'):
        pss_equipment[pss].add('Station Transformer')
    
    # Check for Battery Charger
    if data.get('charger'):
        pss_equipment[pss].add('Battery Charger')

# Display organized list
for pss in sorted(pss_equipment.keys()):
    print(f"\n📍 {pss}")
    print("-" * 80)
    
    equipment_list = sorted(pss_equipment[pss])
    
    # Organize by type
    ic_list = [e for e in equipment_list if 'I/C' in e or 'IC' in e]
    ptr_list = [e for e in equipment_list if 'PTR' in e]
    feeder_list = [e for e in equipment_list if '11KV' in e.upper() or 'FEEDER' in e.upper()]
    station_list = [e for e in equipment_list if 'STATION' in e.upper() and 'TRANSFORMER' in e.upper()]
    battery_list = [e for e in equipment_list if 'BATTERY' in e.upper() or 'CHARGER' in e.upper()]
    
    if ic_list:
        print("  I/C (Incoming):")
        for e in ic_list:
            print(f"    • {e}")
    
    if ptr_list:
        print("  PTR (Transformer):")
        for e in ptr_list:
            print(f"    • {e}")
    
    if feeder_list:
        print(f"  11kV Feeders ({len(feeder_list)}):")
        for e in feeder_list:
            print(f"    • {e}")
    
    if station_list:
        print("  Station Equipment:")
        for e in station_list:
            print(f"    • {e}")
    
    if battery_list:
        print("  Battery:")
        for e in battery_list:
            print(f"    • {e}")
    
    print(f"  Total: {len(equipment_list)} equipment items")

print(f"\n{'='*100}")
print(f"Total PSS Stations: {len(pss_equipment)}")
print(f"{'='*100}\n")
