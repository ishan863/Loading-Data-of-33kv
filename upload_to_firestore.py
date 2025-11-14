"""
PSS Data Uploader to Firestore
Uploads Excel data directly to Firebase Firestore
"""

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
from datetime import datetime
import sys

# Firebase Configuration
FIREBASE_CONFIG = {
    "type": "service_account",
    "project_id": "pss-loading-data",
    "private_key_id": "",  # Will use default credentials
    "private_key": "",
    "client_email": "",
    "client_id": "",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Try to initialize with application default credentials
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": "pss-loading-data",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk@pss-loading-data.iam.gserviceaccount.com",
        })
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized successfully")
        return firestore.client()
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("\n💡 To fix this, you need to:")
        print("1. Go to Firebase Console → Project Settings → Service Accounts")
        print("2. Click 'Generate New Private Key'")
        print("3. Download the JSON file")
        print("4. Update this script with the credentials")
        sys.exit(1)

def read_excel_data(excel_file):
    """Read Excel file with 2 sheets"""
    try:
        print(f"📖 Reading Excel file: {excel_file}")
        
        # Read both sheets
        pss_df = pd.read_excel(excel_file, sheet_name=0)  # Sheet 1: PSS data
        admin_df = pd.read_excel(excel_file, sheet_name=1)  # Sheet 2: Admin data
        
        print(f"✅ Sheet 1 (PSS): {len(pss_df)} rows")
        print(f"✅ Sheet 2 (Admin): {len(admin_df)} rows")
        
        return pss_df, admin_df
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        sys.exit(1)

def upload_admins(db, admin_df):
    """Upload admin users to Firestore"""
    print("\n👤 Uploading admin users...")
    count = 0
    
    for idx, row in admin_df.iterrows():
        try:
            phone = str(int(row['phone number']))
            name = row['pss/admin name']
            
            doc_ref = db.collection('users').document(phone)
            doc_ref.set({
                'phone': phone,
                'name': name,
                'role': 'admin',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'isActive': True
            })
            
            count += 1
            print(f"   ✅ {name} ({phone})")
            
        except Exception as e:
            print(f"   ⚠️ Failed: {row.get('pss/admin name', 'Unknown')} - {e}")
    
    print(f"✅ Uploaded {count} admins")
    return count

def upload_pss_stations(db, pss_df):
    """Upload PSS stations to Firestore"""
    print("\n🏢 Uploading PSS stations...")
    count = 0
    
    for idx, row in pss_df.iterrows():
        try:
            pss_name = row['PSS NAME']
            feeders = int(row['FEEDERS'])
            linemen = [name.strip() for name in str(row['LINEMAN']).split(',') if name.strip()]
            helpers = [name.strip() for name in str(row['HELPER']).split(',') if name.strip()]
            
            doc_ref = db.collection('pss_stations').document()
            doc_ref.set({
                'name': pss_name,
                'code': pss_name[:3].upper(),
                'voltage': '33/11 kV',
                'feeders': feeders,
                'location': pss_name,
                'linemen': linemen,
                'helpers': helpers,
                'isActive': True,
                'createdAt': firestore.SERVER_TIMESTAMP
            })
            
            count += 1
            print(f"   ✅ {pss_name} ({feeders} feeders, {len(linemen)} linemen, {len(helpers)} helpers)")
            
        except Exception as e:
            print(f"   ⚠️ Failed: {row.get('PSS NAME', 'Unknown')} - {e}")
    
    print(f"✅ Uploaded {count} PSS stations")
    return count

def upload_staff_users(db, pss_df):
    """Upload staff users to Firestore"""
    print("\n👷 Uploading staff users...")
    count = 0
    
    for pss_idx, row in pss_df.iterrows():
        try:
            pss_name = row['PSS NAME']
            linemen = [name.strip() for name in str(row['LINEMAN']).split(',') if name.strip()]
            helpers = [name.strip() for name in str(row['HELPER']).split(',') if name.strip()]
            all_names = linemen + helpers
            
            for staff_idx, person_name in enumerate(all_names):
                phone = str(9100000000 + (pss_idx * 100) + staff_idx)
                staff_type = 'lineman' if person_name in linemen else 'helper'
                
                doc_ref = db.collection('users').document(phone)
                doc_ref.set({
                    'phone': phone,
                    'name': person_name,
                    'role': 'staff',
                    'staffType': staff_type,
                    'pssStation': pss_name,
                    'names': all_names,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                    'isActive': True
                })
                
                count += 1
                print(f"   ✅ {person_name} ({phone}) - {staff_type} @ {pss_name}")
                
        except Exception as e:
            print(f"   ⚠️ Failed for PSS {row.get('PSS NAME', 'Unknown')} - {e}")
    
    print(f"✅ Uploaded {count} staff users")
    return count

def create_sample_entry(db, admin_df, pss_df):
    """Create a sample data entry"""
    print("\n📊 Creating sample data entry...")
    
    try:
        first_admin_phone = str(int(admin_df.iloc[0]['phone number']))
        first_admin_name = admin_df.iloc[0]['pss/admin name']
        first_pss = pss_df.iloc[0]['PSS NAME']
        today = datetime.now().strftime('%Y-%m-%d')
        
        doc_ref = db.collection('daily_entries').document()
        doc_ref.set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'date': today,
            'pssStation': first_pss,
            'personnelName': first_admin_name,
            'submittedBy': first_admin_phone,
            'submittedAt': firestore.SERVER_TIMESTAMP,
            
            # Sample 127-column data
            'ic1_33kv_voltage_r': 33.5, 'ic1_33kv_voltage_y': 33.4, 'ic1_33kv_voltage_b': 33.6,
            'ic1_33kv_amp_r': 125.5, 'ic1_33kv_amp_y': 130.2, 'ic1_33kv_amp_b': 128.8,
            'ic1_33kv_mw': 8.5, 'ic1_33kv_mvar': 2.3,
            'ic2_33kv_voltage_r': 33.3, 'ic2_33kv_voltage_y': 33.5, 'ic2_33kv_voltage_b': 33.4,
            'ic2_33kv_amp_r': 115.3, 'ic2_33kv_amp_y': 120.5, 'ic2_33kv_amp_b': 118.2,
            'ic2_33kv_mw': 7.8, 'ic2_33kv_mvar': 2.1,
            'ptr1_33kv_voltage_r': 33.2, 'ptr1_33kv_voltage_y': 33.4, 'ptr1_33kv_voltage_b': 33.3,
            'ptr1_33kv_amp_r': 95.5, 'ptr1_33kv_amp_y': 98.2, 'ptr1_33kv_amp_b': 96.8,
            'ptr1_33kv_mw': 6.5, 'ptr1_33kv_mvar': 1.8,
            'ptr2_33kv_voltage_r': 33.4, 'ptr2_33kv_voltage_y': 33.3, 'ptr2_33kv_voltage_b': 33.5,
            'ptr2_33kv_amp_r': 88.3, 'ptr2_33kv_amp_y': 90.5, 'ptr2_33kv_amp_b': 89.2,
            'ptr2_33kv_mw': 6.0, 'ptr2_33kv_mvar': 1.6,
            'isEditable': True
        })
        
        print(f"✅ Sample entry created for {first_pss}")
        
    except Exception as e:
        print(f"⚠️ Failed to create sample entry: {e}")

def main():
    """Main upload function"""
    print("=" * 60)
    print("🚀 PSS Data Uploader to Firestore")
    print("=" * 60)
    
    # Excel file path
    excel_file = "33kv manpower format for loading data.xlsx"
    
    # Initialize Firebase
    db = initialize_firebase()
    
    # Read Excel data
    pss_df, admin_df = read_excel_data(excel_file)
    
    # Upload data
    admin_count = upload_admins(db, admin_df)
    pss_count = upload_pss_stations(db, pss_df)
    staff_count = upload_staff_users(db, pss_df)
    
    # Create sample entry
    create_sample_entry(db, admin_df, pss_df)
    
    # Create admin log
    try:
        log_ref = db.collection('admin_logs').document()
        log_ref.set({
            'action': 'excel_data_imported',
            'performedBy': str(int(admin_df.iloc[0]['phone number'])),
            'timestamp': firestore.SERVER_TIMESTAMP,
            'details': {
                'adminCount': admin_count,
                'pssCount': pss_count,
                'staffCount': staff_count,
                'totalUsers': admin_count + staff_count
            }
        })
        print("\n✅ Admin log created")
    except Exception as e:
        print(f"\n⚠️ Failed to create admin log: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 UPLOAD COMPLETE!")
    print("=" * 60)
    print(f"✅ {admin_count} admins uploaded")
    print(f"✅ {pss_count} PSS stations uploaded")
    print(f"✅ {staff_count} staff users uploaded")
    print(f"✅ Total users: {admin_count + staff_count}")
    print("\n🚀 Next steps:")
    print("1. Run: firebase deploy")
    print(f"2. Login with: {int(admin_df.iloc[0]['phone number'])}")
    print("=" * 60)

if __name__ == "__main__":
    main()
