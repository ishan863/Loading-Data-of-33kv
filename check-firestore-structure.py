import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Checking Firestore data structure...\n")

# Get one document to see structure
entries = db.collection('daily_entries').limit(1).get()

for entry in entries:
    data = entry.to_dict()
    print(f"Document ID: {entry.id}")
    print(f"\nFull structure:")
    print(f"PSS: {data.get('pssStation')}")
    print(f"Circle: {data.get('circle')}")
    print(f"Division: {data.get('division')}")
    print(f"Date: {data.get('date')}")
    
    print(f"\nFeeders structure:")
    feeders = data.get('feeders', {})
    
    for feeder_key, feeder_data in feeders.items():
        print(f"\n{feeder_key}:")
        print(f"  name: {feeder_data.get('name')}")
        print(f"  ptrNo: {feeder_data.get('ptrNo')}")
        
        # Check for voltage/current data
        print(f"  Keys in feeder: {list(feeder_data.keys())}")
        
        # Look for max voltage data
        if 'maxVoltage' in feeder_data:
            print(f"  maxVoltage: {feeder_data['maxVoltage']}")
        if 'minVoltage' in feeder_data:
            print(f"  minVoltage: {feeder_data['minVoltage']}")
        if 'maxCurrent' in feeder_data:
            print(f"  maxCurrent: {feeder_data['maxCurrent']}")
        if 'minCurrent' in feeder_data:
            print(f"  minCurrent: {feeder_data['minCurrent']}")
        
        break  # Just show first feeder
    
    break  # Just show first document
