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

session = requests.Session()

def create_document(collection, doc_id, data):
    """Create a document in Firestore using REST API"""
    url = f"{base_url}/{collection}?documentId={doc_id}&key={API_KEY}"
    
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

print("\n" + "="*60)
print("📤 UPLOADING DATA TO FIRESTORE")
print("="*60)

# 1. Upload Admin User (only 1 admin)
print("\n📤 Uploading Admin user...")
admin_row = df_admin.iloc[0]  # Get first row (ADMIN01)
admin_phone = str(admin_row['phone number']).strip()
admin_name = str(admin_row['pss/admin name']).strip()

doc_id = f"admin_{admin_phone}"
admin_data = {
    "phoneNumber": admin_phone,
    "name": admin_name,
    "role": "admin",
    "pssStation": "ALL",
    "status": "active"
}

success, msg = create_document("users", doc_id, admin_data)
if success:
    print(f"  ✅ {admin_name} - {admin_phone}")
else:
    print(f"  ❌ {admin_name} - {msg}")

# 2. Upload PSS Stations + PSS Admin Users
print("\n📤 Uploading PSS Stations + PSS Admin Users...")
pss_count = 0

for idx, row in df_pss.iterrows():
    pss_name = str(row['PSS NAME']).strip()
    feeders = int(row['FEEDERS'])
    lineman_text = str(row['LINEMAN']).strip()
    helper_text = str(row['HELPER']).strip()
    
    # Split multiple names by comma
    linemen = [name.strip() for name in lineman_text.split(',')]
    helpers = [name.strip() for name in helper_text.split(',')]
    
    # Get PSS phone from admin data (skip first admin, use rest for PSS)
    pss_phone = str(df_admin.iloc[idx + 1]['phone number']).strip()
    
    # A. Create PSS Station document
    pss_doc_id = pss_name.lower().replace(' ', '-').replace('(', '').replace(')', '')
    pss_data = {
        "name": pss_name,
        "phoneNumber": pss_phone,
        "feeders": feeders,
        "linemen": linemen,
        "helpers": helpers,
        "status": "active"
    }
    
    success, msg = create_document("pss_stations", pss_doc_id, pss_data)
    if success:
        print(f"  ✅ PSS Station: {pss_name} ({feeders} feeders)")
        pss_count += 1
    else:
        print(f"  ❌ PSS Station: {pss_name} - {msg}")
    
    # B. Create PSS Admin User (shared login for all staff of this PSS)
    user_doc_id = f"pss_{pss_phone}"
    user_data = {
        "phoneNumber": pss_phone,
        "name": pss_name,  # PSS name
        "role": "staff",
        "pssStation": pss_name,
        "status": "active",
        "personnel": linemen + helpers  # All staff names for this PSS
    }
    
    success, msg = create_document("users", user_doc_id, user_data)
    if success:
        print(f"  ✅ PSS User Login: {pss_phone} (for {len(linemen + helpers)} staff)")
    else:
        print(f"  ❌ PSS User: {pss_phone} - {msg}")

print("\n" + "="*60)
print("📊 UPLOAD SUMMARY:")
print(f"  ✅ Admin Users: 1 (phone: {admin_phone})")
print(f"  ✅ PSS Stations: {pss_count}")
print(f"  ✅ PSS Login Numbers: {pss_count} (shared by staff)")
print(f"  📱 Total User Logins: {1 + pss_count}")
print("="*60)

print("\n🎯 HOW IT WORKS:")
print(f"  👨‍💼 Admin logs in with: {admin_phone}")
print(f"  👥 PSS staff log in with their PSS number:")
for idx, row in df_pss.iterrows():
    pss_name = str(row['PSS NAME']).strip()
    pss_phone = str(df_admin.iloc[idx + 1]['phone number']).strip()
    print(f"     - {pss_name}: {pss_phone}")
print(f"\n✅ After login, staff select their name from the list!")
print(f"🎉 Ready to test at http://localhost:8000")
