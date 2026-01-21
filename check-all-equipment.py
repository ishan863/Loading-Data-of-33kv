import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Checking ALL equipment types in Firestore...\n")

# Get one recent document
entries = db.collection('daily_entries').order_by('date', direction=firestore.Query.DESCENDING).limit(1).get()

for entry in entries:
    data = entry.to_dict()
    print(f"Document ID: {entry.id}")
    print(f"PSS: {data.get('pssStation')}")
    print(f"Date: {data.get('date')}")
    
    print(f"\n{'='*80}")
    print("ALL EQUIPMENT IN FEEDERS:")
    print(f"{'='*80}\n")
    
    feeders = data.get('feeders', {})
    
    # Sort and display all equipment
    for feeder_key in sorted(feeders.keys()):
        feeder_data = feeders[feeder_key]
        equipment_name = feeder_data.get('name', 'NO NAME')
        ptr_no = feeder_data.get('ptrNo', '')
        
        print(f"{feeder_key:20} -> {equipment_name:30} (PTR: {ptr_no})")
    
    print(f"\n{'='*80}")
    print(f"Total equipment count: {len(feeders)}")
    print(f"{'='*80}\n")
    
    # Check for I/C, PTR, Station, Battery
    has_ic = any('I/C' in feeders[k].get('name', '').upper() or 'IC' in feeders[k].get('name', '').upper() for k in feeders)
    has_ptr = any('PTR' in feeders[k].get('name', '').upper() for k in feeders)
    has_station = any('STATION' in feeders[k].get('name', '').upper() for k in feeders)
    has_battery = any('BATTERY' in feeders[k].get('name', '').upper() for k in feeders)
    
    print("Equipment Type Check:")
    print(f"  ✓ Has I/C (Incoming): {has_ic}")
    print(f"  ✓ Has PTR: {has_ptr}")
    print(f"  ✓ Has Station Transformer: {has_station}")
    print(f"  ✓ Has Battery Charger: {has_battery}")
    print(f"  ✓ Has 11kV Feeders: {any('11KV' in feeders[k].get('name', '').upper() or 'FEEDER' in k.upper() for k in feeders)}")
