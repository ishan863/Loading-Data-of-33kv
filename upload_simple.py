"""
Simple PSS Data Uploader using REST API
No service account needed - uses Web API directly
"""

import pandas as pd
import requests
import json
from datetime import datetime

# Firebase Web API Configuration
PROJECT_ID = "pss-loading-data"
API_KEY = "AIzaSyA0-z9_XylDuAg8NJkRaRchEqv-STt3IZc"
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

def upload_document(collection, doc_id, data):
    """Upload a document to Firestore using REST API"""
    url = f"{FIRESTORE_URL}/{collection}/{doc_id}"
    
    # Convert data to Firestore format
    fields = {}
    for key, value in data.items():
        if isinstance(value, str):
            fields[key] = {"stringValue": value}
        elif isinstance(value, bool):
            fields[key] = {"booleanValue": value}
        elif isinstance(value, int):
            fields[key] = {"integerValue": str(value)}
        elif isinstance(value, float):
            fields[key] = {"doubleValue": value}
        elif isinstance(value, list):
            array_values = []
            for item in value:
                if isinstance(item, str):
                    array_values.append({"stringValue": item})
            fields[key] = {"arrayValue": {"values": array_values}}
        elif value == "SERVER_TIMESTAMP":
            fields[key] = {"timestampValue": datetime.utcnow().isoformat() + "Z"}
    
    payload = {"fields": fields}
    
    response = requests.patch(
        url,
        params={"updateMask.fieldPaths": list(data.keys())},
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload)
    )
    
    return response.status_code == 200

def main():
    print("=" * 70)
    print("🚀 PSS Data Uploader (REST API)")
    print("=" * 70)
    
    # Read Excel - use absolute path
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file = os.path.join(script_dir, "33kv manpower format for loading data.xlsx")
    print(f"\n📖 Reading {excel_file}...")
    
    try:
        pss_df = pd.read_excel(excel_file, sheet_name=0)
        admin_df = pd.read_excel(excel_file, sheet_name=1)
        print(f"✅ Sheet 1: {len(pss_df)} PSS stations")
        print(f"✅ Sheet 2: {len(admin_df)} admins")
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return
    
    # Upload Admins
    print("\n👤 Uploading admins...")
    admin_count = 0
    for idx, row in admin_df.iterrows():
        try:
            phone = str(int(row['phone number']))
            name = row['pss/admin name']
            
            data = {
                'phone': phone,
                'name': name,
                'role': 'admin',
                'createdAt': 'SERVER_TIMESTAMP',
                'isActive': True
            }
            
            if upload_document('users', phone, data):
                print(f"   ✅ {name} ({phone})")
                admin_count += 1
            else:
                print(f"   ⚠️ Failed: {name}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Upload PSS Stations
    print("\n🏢 Uploading PSS stations...")
    pss_count = 0
    for idx, row in pss_df.iterrows():
        try:
            pss_name = row['PSS NAME']
            feeders = int(row['FEEDERS'])
            linemen = [n.strip() for n in str(row['LINEMAN']).split(',') if n.strip()]
            helpers = [n.strip() for n in str(row['HELPER']).split(',') if n.strip()]
            
            doc_id = pss_name.replace(' ', '_')
            data = {
                'name': pss_name,
                'code': pss_name[:3].upper(),
                'voltage': '33/11 kV',
                'feeders': feeders,
                'location': pss_name,
                'linemen': linemen,
                'helpers': helpers,
                'isActive': True,
                'createdAt': 'SERVER_TIMESTAMP'
            }
            
            if upload_document('pss_stations', doc_id, data):
                print(f"   ✅ {pss_name} ({len(linemen)} linemen, {len(helpers)} helpers)")
                pss_count += 1
            else:
                print(f"   ⚠️ Failed: {pss_name}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Upload Staff
    print("\n👷 Uploading staff users...")
    staff_count = 0
    for pss_idx, row in pss_df.iterrows():
        try:
            pss_name = row['PSS NAME']
            linemen = [n.strip() for n in str(row['LINEMAN']).split(',') if n.strip()]
            helpers = [n.strip() for n in str(row['HELPER']).split(',') if n.strip()]
            all_names = linemen + helpers
            
            for staff_idx, person in enumerate(all_names):
                phone = str(9100000000 + (pss_idx * 100) + staff_idx)
                staff_type = 'lineman' if person in linemen else 'helper'
                
                data = {
                    'phone': phone,
                    'name': person,
                    'role': 'staff',
                    'staffType': staff_type,
                    'pssStation': pss_name,
                    'names': all_names,
                    'createdAt': 'SERVER_TIMESTAMP',
                    'isActive': True
                }
                
                if upload_document('users', phone, data):
                    print(f"   ✅ {person} ({phone}) - {staff_type}")
                    staff_count += 1
                else:
                    print(f"   ⚠️ Failed: {person}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 70)
    print("🎉 UPLOAD COMPLETE!")
    print("=" * 70)
    print(f"✅ {admin_count} admins")
    print(f"✅ {pss_count} PSS stations")
    print(f"✅ {staff_count} staff users")
    print(f"✅ Total: {admin_count + staff_count} users")
    print(f"\n📱 Login with: {int(admin_df.iloc[0]['phone number'])}")
    print("=" * 70)

if __name__ == "__main__":
    main()
