import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

print("=" * 80)
print("📱 UPDATING PHONE NUMBERS IN DAILY_ENTRIES")
print("=" * 80)

# Mapping of OLD phone numbers to NEW phone numbers from users collection
PHONE_MAPPING = {
    '9876543211': '9124581417',  # KUNDUKELA
    '9876543212': '9124581419',  # MAJHAPADA
    '9876543213': '9124581418',  # SANKARA
    '9876543214': '9124581420',  # COLLEGE
    '9876543215': '9124581421',  # KARAMDIHI
    '9876543216': '9124581422',  # SUBDEGA
    '9876543217': '9124581423',  # BALISHANKARA
    '9876543218': '9124581340',  # SADAR
    '9876543219': '9124581425',  # THUMBAPALI
    '9876543220': '9124581427',  # KINJERKELA
    '9876543221': '9124581428',  # LEPHRIPARA
    '9876543222': '9124581430',  # SARGIPALI
    '9876543223': '8093078532',  # DARLIPALI
    '9876543224': '9124581423',  # MANGASPUR (GULTHA) - Note: Same as BALISHANKARA!
    '9876543225': '9124581433',  # GARJANBAHAL
    '9876543226': '809306117',   # BELAIMUNDA
    '9876543227': '8093061196',  # HEMGIR
    '9876543228': '7848953788',  # BANDEGA
}

print("\n📋 Phone Number Mapping:")
print("-" * 80)
for old, new in PHONE_MAPPING.items():
    print(f"{old} → {new}")

print("\n\n🔍 Searching for entries with old phone numbers...")
print("-" * 80)

# Get all daily_entries
entries = db.collection('daily_entries').stream()
total_entries = 0
updated_count = 0
skipped_count = 0

for doc in entries:
    total_entries += 1
    data = doc.to_dict()
    old_phone = data.get('phoneNumber')
    pss_station = data.get('pssStation')
    date = data.get('date')
    
    # Check if this phone needs updating
    if old_phone in PHONE_MAPPING:
        new_phone = PHONE_MAPPING[old_phone]
        
        # Update the document
        try:
            db.collection('daily_entries').document(doc.id).update({
                'phoneNumber': new_phone,
                'lastUpdated': datetime.now()
            })
            print(f"✅ Updated: {pss_station} | {date} | {old_phone} → {new_phone}")
            updated_count += 1
        except Exception as e:
            print(f"❌ Error updating {doc.id}: {e}")
    else:
        if old_phone and old_phone.startswith('91245') or old_phone.startswith('80930') or old_phone.startswith('78489'):
            # Already has new format
            skipped_count += 1
        else:
            print(f"⚠️ Unknown phone: {old_phone} for {pss_station} | {date}")

print("\n" + "=" * 80)
print("📊 UPDATE SUMMARY")
print("=" * 80)
print(f"Total entries checked: {total_entries}")
print(f"Entries updated: {updated_count}")
print(f"Entries already correct: {skipped_count}")
print(f"Entries with unknown phones: {total_entries - updated_count - skipped_count}")

print("\n\n🔍 Verifying updates...")
print("-" * 80)

# Check each PSS station to verify
for old_phone, new_phone in PHONE_MAPPING.items():
    # Check if any old phone numbers remain
    old_entries = db.collection('daily_entries').where('phoneNumber', '==', old_phone).limit(1).stream()
    old_count = len(list(old_entries))
    
    # Check new phone numbers
    new_entries = db.collection('daily_entries').where('phoneNumber', '==', new_phone).limit(1).stream()
    new_count = len(list(new_entries))
    
    if old_count > 0:
        print(f"⚠️ Still found entries with OLD phone: {old_phone}")
    elif new_count > 0:
        print(f"✅ Verified NEW phone: {new_phone} has entries")

print("\n" + "=" * 80)
print("✅ PHONE NUMBER UPDATE COMPLETE!")
print("=" * 80)
print("\n⚠️ IMPORTANT: Users must now login with their NEW phone numbers:")
print("-" * 80)
for old, new in list(PHONE_MAPPING.items())[:5]:
    print(f"  {old} → {new}")
print("  ... (and 13 more)")
