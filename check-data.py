import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase
cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Check data
print("🔍 Checking Firestore data...\n")

entries = list(db.collection('daily_entries').limit(10).stream())
print(f"Total entries found: {len(entries)}\n")

if entries:
    print("Sample entries:")
    for i, entry in enumerate(entries[:3], 1):
        data = entry.to_dict()
        date = data.get('date')
        if hasattr(date, 'strftime'):
            date_str = date.strftime('%Y-%m-%d')
        else:
            date_str = str(date)
        
        pss = data.get('pssStation', 'N/A')
        feeders = data.get('feeders', {})
        
        print(f"{i}. Date: {date_str}, PSS: {pss}, Feeders: {len(feeders)}")
        
        if feeders:
            first_feeder = list(feeders.values())[0]
            print(f"   First feeder: {first_feeder.get('name', 'No name')}")
else:
    print("❌ NO DATA FOUND in 'daily_entries' collection!")
    print("\nPlease upload some data first using the Upload tab.")
