import firebase_admin
from firebase_admin import credentials, firestore
import json

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("\n" + "="*100)
print(" COMPLETE FIRESTORE STRUCTURE CHECK - daily_entries Collection")
print("="*100 + "\n")

# Get latest document
entries = db.collection('daily_entries').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(1).get()

for entry in entries:
    data = entry.to_dict()
    
    print(f"📄 Document ID: {entry.id}")
    print(f"📅 Date: {data.get('date')}")
    print(f"🏢 PSS: {data.get('pssStation')}")
    print(f"👤 Staff: {data.get('staffName')}")
    
    print(f"\n{'-'*100}")
    print(" ALL TOP-LEVEL FIELDS IN DOCUMENT")
    print(f"{'-'*100}\n")
    
    # List all top-level keys
    for i, key in enumerate(sorted(data.keys()), 1):
        value = data[key]
        if isinstance(value, dict):
            print(f"{i:2}. {key:30} → dict ({len(value)} items)")
        elif isinstance(value, list):
            print(f"{i:2}. {key:30} → list ({len(value)} items)")
        else:
            print(f"{i:2}. {key:30} → {type(value).__name__}")
    
    print(f"\n{'-'*100}")
    print(" EQUIPMENT TYPE CHECK")
    print(f"{'-'*100}\n")
    
    # Check for each equipment type
    equipment_checks = [
        ('ic1', 'I/C-1 (Incoming Feeder 1)'),
        ('ic2', 'I/C-2 (Incoming Feeder 2)'),
        ('ptr1_33kv', 'PTR-1 33kV Side'),
        ('ptr2_33kv', 'PTR-2 33kV Side'),
        ('ptr1_11kv', 'PTR-1 11kV Side'),
        ('ptr2_11kv', 'PTR-2 11kV Side'),
        ('feeders', '11kV Feeders (Feeder-1 to Feeder-6)'),
        ('stationTransformer', 'Station Transformer'),
        ('charger', 'Battery Charger'),
    ]
    
    for field_name, description in equipment_checks:
        if field_name in data and data[field_name]:
            value = data[field_name]
            if isinstance(value, dict):
                keys = list(value.keys())
                print(f"✅ {description:45} → Found ({len(keys)} items)")
                if len(keys) <= 5:
                    for k in keys:
                        if isinstance(value[k], dict) and 'name' in value[k]:
                            print(f"     ├─ {k}: {value[k]['name']}")
                        else:
                            print(f"     ├─ {k}")
            else:
                print(f"✅ {description:45} → Found")
        else:
            print(f"❌ {description:45} → NOT FOUND")
    
    print(f"\n{'-'*100}")
    print(" FEEDERS DETAIL")
    print(f"{'-'*100}\n")
    
    if 'feeders' in data:
        feeders = data['feeders']
        for feeder_key in sorted(feeders.keys()):
            feeder = feeders[feeder_key]
            name = feeder.get('name', 'NO NAME')
            ptr = feeder.get('ptrNo', '-')
            print(f"  {feeder_key:15} → {name:35} (PTR: {ptr})")
    
    break  # Only show first document

print(f"\n{'='*100}\n")
