import firebase_admin
from firebase_admin import credentials, firestore
import json

# Initialize Firebase Admin
try:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Connected to Firestore\n")
except Exception as e:
    print(f"❌ Error connecting: {e}")
    print("\n⚠️ Make sure you have serviceAccountKey.json in this directory")
    print("Download it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key")
    exit(1)

print("=" * 80)
print("🔍 FIRESTORE DATA CHECK")
print("=" * 80)

# 1. Check PSS Stations
print("\n📍 1. PSS STATIONS COLLECTION:")
print("-" * 80)
try:
    pss_stations = db.collection('pss_stations').stream()
    count = 0
    for doc in pss_stations:
        count += 1
        data = doc.to_dict()
        print(f"\n=== {doc.id} ===")
        print(f"feeders: {data.get('feeders')} (type: {type(data.get('feeders')).__name__})")
        
        if isinstance(data.get('feeders'), (int, float)):
            print(f"  → Will generate {int(data.get('feeders'))} feeders")
        elif isinstance(data.get('feeders'), list):
            print(f"  → Array with {len(data.get('feeders'))} items")
        else:
            print(f"  ⚠️ Unknown format or missing!")
            
        print(f"linemen: {len(data.get('linemen', []))} entries")
        print(f"helpers: {len(data.get('helpers', []))} entries")
        print(f"Full document: {json.dumps(data, indent=2, default=str)}")
    
    if count == 0:
        print("❌ NO PSS STATIONS FOUND!")
        print("⚠️ You need to create pss_stations collection with PSS data")
except Exception as e:
    print(f"❌ Error reading pss_stations: {e}")

# 2. Check Users
print("\n\n👤 2. USERS COLLECTION:")
print("-" * 80)
try:
    users = db.collection('users').where('status', '==', 'active').stream()
    count = 0
    for doc in users:
        count += 1
        data = doc.to_dict()
        print(f"\n=== {doc.id} ===")
        print(f"phoneNumber: {data.get('phoneNumber')}")
        print(f"name: {data.get('name')}")
        print(f"pssStation: {data.get('pssStation')}")
        print(f"role: {data.get('role')}")
    
    if count == 0:
        print("❌ NO ACTIVE USERS FOUND!")
except Exception as e:
    print(f"❌ Error reading users: {e}")

# 3. Check Daily Entries
print("\n\n📊 3. DAILY ENTRIES COLLECTION (Last 10):")
print("-" * 80)
try:
    entries = db.collection('daily_entries').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10).stream()
    count = 0
    for doc in entries:
        count += 1
        data = doc.to_dict()
        print(f"\n=== {doc.id} ===")
        print(f"phoneNumber: {data.get('phoneNumber')}")
        print(f"pssStation: {data.get('pssStation')}")
        print(f"date: {data.get('date')}")
        print(f"staffName: {data.get('staffName')}")
        
        # Check feeders
        feeders = data.get('feeders')
        if feeders:
            print(f"\n🔌 FEEDERS: (type: {type(feeders).__name__})")
            if isinstance(feeders, dict):
                print(f"  Feeder count: {len(feeders)}")
                print(f"  Feeder names: {', '.join(feeders.keys())}")
                
                # Show first feeder
                if feeders:
                    first_key = list(feeders.keys())[0]
                    print(f"\n  First feeder ({first_key}):")
                    print(f"    {json.dumps(feeders[first_key], indent=4, default=str)}")
        else:
            print("\n⚠️ NO FEEDERS DATA!")
            # Check for flat fields
            flat_fields = [k for k in data.keys() if k.startswith('feeder')]
            if flat_fields:
                print(f"  ❌ FOUND FLAT FEEDER FIELDS: {', '.join(flat_fields[:5])}...")
                print("  This is the OLD WRONG structure!")
    
    if count == 0:
        print("❌ NO DAILY ENTRIES FOUND!")
except Exception as e:
    print(f"❌ Error reading daily_entries: {e}")

# 4. Check Kundukela specific
print("\n\n🏢 4. KUNDUKELA ENTRIES:")
print("-" * 80)
try:
    kundukela = db.collection('daily_entries').where('pssStation', '==', 'Kundukela').stream()
    phone_numbers = {}
    count = 0
    
    for doc in kundukela:
        count += 1
        data = doc.to_dict()
        phone = data.get('phoneNumber')
        date = data.get('date')
        
        if phone not in phone_numbers:
            phone_numbers[phone] = []
        phone_numbers[phone].append(date)
    
    print(f"Total Kundukela entries: {count}")
    print(f"\nBreakdown by phone number:")
    for phone, dates in phone_numbers.items():
        print(f"\nPhone: {phone}")
        print(f"  Submissions: {len(dates)}")
        print(f"  Dates: {', '.join(dates)}")
    
    if count == 0:
        print("❌ NO KUNDUKELA ENTRIES FOUND!")
except Exception as e:
    print(f"❌ Error checking Kundukela entries: {e}")

# 5. Test Feeder Logic
print("\n\n🧪 5. TEST DYNAMIC FEEDER LOGIC:")
print("-" * 80)
try:
    pss_stations = db.collection('pss_stations').stream()
    
    for doc in pss_stations:
        data = doc.to_dict()
        pss_name = doc.id
        feeders_config = data.get('feeders')
        
        print(f"\n=== {pss_name} ===")
        print(f"feeders config: {feeders_config} (type: {type(feeders_config).__name__})")
        
        # Simulate form-handler.js logic
        feeders_array = []
        if isinstance(feeders_config, (int, float)):
            feeders_array = list(range(1, int(feeders_config) + 1))
            print(f"✅ Generated: {feeders_array}")
            print(f"✅ Will show: Feeder 1 through Feeder {int(feeders_config)}")
        elif isinstance(feeders_config, list):
            feeders_array = list(range(1, len(feeders_config) + 1))
            print(f"✅ Generated from array length: {feeders_array}")
        else:
            feeders_array = [1, 2, 3, 4, 5, 6]
            print(f"⚠️ Unknown format, using fallback: {feeders_array}")
        
        print(f"Final feeder count: {len(feeders_array)}")
        
except Exception as e:
    print(f"❌ Error testing feeder logic: {e}")

print("\n" + "=" * 80)
print("✅ CHECK COMPLETE")
print("=" * 80)
