import requests
import json
import pandas as pd
import os

# Your Firebase config
PROJECT_ID = "pss-loading-data-4e817"
API_KEY = "AIzaSyCPN46YkG5NlOcZiTy3W748lDUKVWdq2Gg"

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
excel_path = os.path.join(script_dir, "33kv manpower format for loading data.xlsx")

print("🔄 Reading Excel file...")
df_pss = pd.read_excel(excel_path, sheet_name=0)  # PSS data
df_admin = pd.read_excel(excel_path, sheet_name=1)  # Admin data

print(f"✅ Found {len(df_pss)} PSS stations and {len(df_admin)} admins")

# Firestore REST API base URL
base_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

# Create a simple session without authentication
session = requests.Session()

def create_document(collection, doc_id, data):
    """Create a document in Firestore using REST API"""
    url = f"{base_url}/{collection}?documentId={doc_id}&key={API_KEY}"
    
    # Convert Python dict to Firestore format
    fields = {}
    for key, value in data.items():
        if isinstance(value, str):
            fields[key] = {"stringValue": value}
        elif isinstance(value, int):
            fields[key] = {"integerValue": str(value)}
        elif isinstance(value, float):
            fields[key] = {"doubleValue": value}
        elif isinstance(value, bool):
            fields[key] = {"booleanValue": value}
        elif isinstance(value, list):
            array_values = []
            for item in value:
                if isinstance(item, str):
                    array_values.append({"stringValue": item})
            fields[key] = {"arrayValue": {"values": array_values}}
    
    payload = {"fields": fields}
    
    try:
        response = session.post(url, json=payload)
        if response.status_code in [200, 201]:
            return True, "Success"
        else:
            return False, response.text
    except Exception as e:
        return False, str(e)

print("\n📤 Uploading Admin users...")
admin_success = 0
admin_failed = 0

for idx, row in df_admin.iterrows():
    phone = str(row['phone number']).strip()
    name = str(row['pss/admin name']).strip()
    
    doc_id = f"admin_{phone}"
    user_data = {
        "phoneNumber": phone,
        "name": name,
        "role": "admin",
        "pssStation": "ALL",
        "status": "active"
    }
    
    success, msg = create_document("users", doc_id, user_data)
    if success:
        admin_success += 1
        print(f"  ✅ {name} - {phone}")
    else:
        admin_failed += 1
        print(f"  ❌ {name} - {msg}")

print(f"\n✅ Admins: {admin_success} uploaded, {admin_failed} failed")

print("\n📤 Uploading PSS stations...")
pss_success = 0
pss_failed = 0

for idx, row in df_pss.iterrows():
    pss_name = str(row['PSS NAME']).strip()
    feeders = int(row['FEEDERS'])
    lineman = str(row['LINEMAN']).strip()
    helper = str(row['HELPER']).strip()
    
    doc_id = pss_name.lower().replace(' ', '-')
    pss_data = {
        "name": pss_name,
        "feeders": feeders,
        "linemen": [lineman],
        "helpers": [helper],
        "status": "active"
    }
    
    success, msg = create_document("pss_stations", doc_id, pss_data)
    if success:
        pss_success += 1
        print(f"  ✅ {pss_name}")
    else:
        pss_failed += 1
        print(f"  ❌ {pss_name} - {msg}")

print(f"\n✅ PSS Stations: {pss_success} uploaded, {pss_failed} failed")

print("\n📤 Uploading Staff users...")
staff_success = 0
staff_failed = 0
base_phone = 9100000000

for idx, row in df_pss.iterrows():
    pss_name = str(row['PSS NAME']).strip()
    lineman = str(row['LINEMAN']).strip()
    helper = str(row['HELPER']).strip()
    
    # Create lineman user
    lineman_phone = str(base_phone + staff_success)
    doc_id = f"staff_{lineman_phone}"
    lineman_data = {
        "phoneNumber": lineman_phone,
        "name": lineman,
        "role": "staff",
        "pssStation": pss_name,
        "designation": "Lineman",
        "status": "active"
    }
    
    success, msg = create_document("users", doc_id, lineman_data)
    if success:
        staff_success += 1
        print(f"  ✅ {lineman} (Lineman) - {lineman_phone}")
    else:
        staff_failed += 1
        print(f"  ❌ {lineman} - {msg}")
    
    # Create helper user
    helper_phone = str(base_phone + staff_success)
    doc_id = f"staff_{helper_phone}"
    helper_data = {
        "phoneNumber": helper_phone,
        "name": helper,
        "role": "staff",
        "pssStation": pss_name,
        "designation": "Helper",
        "status": "active"
    }
    
    success, msg = create_document("users", doc_id, helper_data)
    if success:
        staff_success += 1
        print(f"  ✅ {helper} (Helper) - {helper_phone}")
    else:
        staff_failed += 1
        print(f"  ❌ {helper} - {msg}")

print(f"\n✅ Staff Users: {staff_success} uploaded, {staff_failed} failed")

print("\n" + "="*60)
print("📊 UPLOAD SUMMARY:")
print(f"  Admins: {admin_success}/{len(df_admin)}")
print(f"  PSS Stations: {pss_success}/{len(df_pss)}")
print(f"  Staff: {staff_success}/{len(df_pss)*2}")
print(f"  Total: {admin_success + pss_success + staff_success} documents")
print("="*60)

if admin_success > 0:
    first_admin = df_admin.iloc[0]
    print(f"\n🎉 Login with phone: {first_admin['phone number']}")
