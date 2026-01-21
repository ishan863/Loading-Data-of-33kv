
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Load service account
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)

# Initialize Firestore
db = firestore.client()

def normalize_pss_name(name):
    """Normalize PSS name for matching - remove spaces, lowercase"""
    return str(name).strip().lower().replace(' ', '')

def load_feeder_names_from_excel(excel_path):
    """Load feeder names from Excel file, organized by PSS"""
    df = pd.read_excel(excel_path, sheet_name=0)
    pss_feeder_map = {}
    
    for _, row in df.iterrows():
        pss = str(row['PSS']).strip()
        feeder = str(row['Equipment']).strip()
        norm_pss = normalize_pss_name(pss)
        
        if norm_pss and feeder and feeder.lower() != 'nan':
            if norm_pss not in pss_feeder_map:
                pss_feeder_map[norm_pss] = []
            pss_feeder_map[norm_pss].append(feeder)
    
    return pss_feeder_map

def update_feeder_names():
    """Update all old Firestore records with correct feeder names"""
    excel_path = r'C:\Users\R A J A\Pyton_proj\LOADING DATA\PSS-Firebase-App\PSS_FEEDER_CONFIG_TEMPLATE.xlsx'
    
    print("Loading feeder names from Excel...")
    pss_feeder_map = load_feeder_names_from_excel(excel_path)
    print(f"Found {len(pss_feeder_map)} PSS stations in Excel")
    
    entries_ref = db.collection('daily_entries')
    entries = list(entries_ref.stream())
    print(f"Found {len(entries)} records in Firestore")
    
    updated_count = 0
    skipped_count = 0
    
    for entry in entries:
        data = entry.to_dict()
        pss = data.get('pssStation')
        feeders = data.get('feeders')
        
        if not pss or not feeders:
            skipped_count += 1
            continue
        
        norm_pss = normalize_pss_name(pss)
        feeder_names = pss_feeder_map.get(norm_pss)
        
        if not feeder_names:
            print(f"⚠️ No feeder names found for PSS: {pss}")
            skipped_count += 1
            continue
        
        # Sort feeder keys numerically (feeder-1, feeder-2, etc.)
        sorted_keys = sorted(feeders.keys(), key=lambda k: int(k.split('-')[-1]))
        
        # Update each feeder with its corresponding name from Excel
        updated = False
        for i, key in enumerate(sorted_keys):
            if i < len(feeder_names):
                # Only update if the name field is missing or different
                current_name = feeders[key].get('name', '')
                if current_name != feeder_names[i]:
                    feeders[key]['name'] = feeder_names[i]
                    updated = True
        
        if updated:
            entries_ref.document(entry.id).update({'feeders': feeders})
            updated_count += 1
            print(f"✓ Updated {pss} (record {entry.id[:8]}...)")
    
    print(f"\n{'='*50}")
    print(f"✓ Successfully updated: {updated_count} records")
    print(f"⚠️ Skipped: {skipped_count} records")
    print(f"{'='*50}")

if __name__ == '__main__':
    update_feeder_names()
