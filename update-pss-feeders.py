"""
PSS FEEDER CONFIGURATION UPDATER
This script updates Firestore pss_stations with feeder names and PTR assignments
"""

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import sys

def init_firestore():
    """Initialize Firestore connection"""
    try:
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Connected to Firestore successfully")
        return db
    except Exception as e:
        print(f"Error connecting to Firestore: {e}")
        sys.exit(1)

def list_current_pss_stations(db):
    """List all current PSS station names in Firestore"""
    print("\n" + "="*80)
    print("CURRENT PSS STATIONS IN FIRESTORE")
    print("="*80)
    
    pss_ref = db.collection('pss_stations')
    docs = pss_ref.stream()
    
    pss_list = []
    for doc in docs:
        data = doc.to_dict()
        feeder_count = 0
        
        if isinstance(data.get('feeders'), int):
            feeder_count = data.get('feeders')
        elif isinstance(data.get('feeders'), list):
            feeder_count = len(data.get('feeders'))
        
        pss_info = {
            'Document_ID': doc.id,
            'Name': data.get('name', doc.id),
            'Current_Feeder_Count': feeder_count,
            'Has_Linemen': len(data.get('linemen', [])),
            'Has_Helpers': len(data.get('helpers', []))
        }
        pss_list.append(pss_info)
        
        print(f"\nPSS Document ID: {doc.id}")
        print(f"  Name: {pss_info['Name']}")
        print(f"  Feeders: {pss_info['Current_Feeder_Count']}")
        print(f"  Linemen: {pss_info['Has_Linemen']}")
        print(f"  Helpers: {pss_info['Has_Helpers']}")
    
    return pss_list

def create_excel_template(pss_list):
    """Create Excel template for feeder configuration - TWO SHEET FORMAT"""
    print("\n" + "="*80)
    print("CREATING EXCEL TEMPLATE (2 SHEETS)")
    print("="*80)
    
    # SHEET 1: PTR COUNT
    ptr_count_data = []
    for pss in pss_list:
        if pss['Document_ID'] != 'ADMIN01':  # Skip admin
            ptr_count_data.append({
                'PSS_NAME': pss['Document_ID'],
                'PTR_COUNT': 2  # Default, user will update
            })
    
    df_ptr = pd.DataFrame(ptr_count_data)
    
    # SHEET 2: FEEDER NAMES (Sample format matching your screenshot)
    feeder_examples = [
        {'PSS': 'DARLIPALI', 'Equipment': '11kV GHANTIMAL'},
        {'PSS': 'DARLIPALI', 'Equipment': '11kV DARLIPALI'},
        {'PSS': 'DARLIPALI', 'Equipment': '11kV RAIDIHI'},
        {'PSS': 'DARLIPALI', 'Equipment': '11kV KANAKTURA'},
        {'PSS': 'LEPHRIPARA', 'Equipment': '11kV lephripada'},
        {'PSS': 'LEPHRIPARA', 'Equipment': '11kV chatenpali'},
        {'PSS': 'LEPHRIPARA', 'Equipment': '11kV kulabira'},
        {'PSS': 'LEPHRIPARA', 'Equipment': '11kV dumabahal'},
        {'PSS': 'LEPHRIPARA', 'Equipment': '11kV gunia dihi'},
        {'PSS': 'LEPHRIPARA', 'Equipment': '11kV dmf'},
        {'PSS': 'BELAIMUNDA', 'Equipment': '11kV BADIBAHAL'},
        {'PSS': 'BELAIMUNDA', 'Equipment': '11kV TAPRIA'},
        {'PSS': 'BELAIMUNDA', 'Equipment': '11kV JHARPALAM'},
    ]
    
    df_feeders = pd.DataFrame(feeder_examples)
    
    # Save to Excel with 2 sheets
    filename = 'PSS_FEEDER_CONFIG_TEMPLATE.xlsx'
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        df_ptr.to_excel(writer, sheet_name='Sheet1', index=False)
        df_feeders.to_excel(writer, sheet_name='Sheet2', index=False)
    
    print(f"Template created: {filename}")
    print("\nFile has 2 sheets:")
    print("  Sheet1 (PTR_COUNT): PSS_NAME | PTR_COUNT")
    print("    - Update PTR_COUNT for each PSS (how many PTRs: 2, 3, 4, etc.)")
    print("\n  Sheet2 (Equipment): PSS | Equipment")
    print("    - List ALL feeder names for each PSS")
    print("    - Format: PSS name in column A, Feeder name in column B")
    print("\nIMPORTANT:")
    print("  1. Sheet1: Update PTR counts to match your actual configuration")
    print("  2. Sheet2: Add ALL your feeder names (one row per feeder)")
    print("  3. PSS names must match exactly (case-sensitive)")
    
    return filename

def validate_excel_data(excel_file, pss_list):
    """Validate Excel data before updating Firestore - TWO SHEET FORMAT"""
    print("\n" + "="*80)
    print("VALIDATING EXCEL DATA")
    print("="*80)
    
    try:
        # Read both sheets - Sheet1 has feeders, Sheet2 has PTR counts
        df_feeders = pd.read_excel(excel_file, sheet_name='Sheet1')
        df_ptr = pd.read_excel(excel_file, sheet_name='PTR COUNT')
        
        # Strip column names of trailing spaces
        df_feeders.columns = df_feeders.columns.str.strip()
        df_ptr.columns = df_ptr.columns.str.strip()
        
        print("\nSheet1 (Feeders) structure:")
        print(f"  Columns: {list(df_feeders.columns)}")
        print(f"  Rows: {len(df_feeders)}")
        
        print("\nSheet2 (PTR COUNT) structure:")
        print(f"  Columns: {list(df_ptr.columns)}")
        print(f"  Rows: {len(df_ptr)}")
        
        # Validate Sheet1 columns (PSS, Equipment)
        if 'PSS' not in df_feeders.columns or 'Equipment' not in df_feeders.columns:
            print("\nERROR: Sheet1 must have columns: PSS, Equipment")
            return None, None
        
        # Validate Sheet2 columns (PSS NAME, PTR COUNT)
        if 'PSS NAME' not in df_ptr.columns or 'PTR COUNT' not in df_ptr.columns:
            # Try alternate column names
            if 'PSS_NAME' in df_ptr.columns and 'PTR_COUNT' in df_ptr.columns:
                df_ptr.rename(columns={'PSS_NAME': 'PSS NAME', 'PTR_COUNT': 'PTR COUNT'}, inplace=True)
            else:
                print("\nERROR: Sheet2 (PTR COUNT) must have columns: PSS NAME, PTR COUNT")
                return None, None
        
        # Validate PSS names match Firestore
        firestore_pss_names = [pss['Document_ID'] for pss in pss_list]
        
        print("\n" + "="*80)
        print("PTR COUNT per PSS (Sheet2):")
        print("="*80)
        for _, row in df_ptr.iterrows():
            pss_name = str(row['PSS NAME']).strip()
            ptr_count = row['PTR COUNT']
            if pss_name in firestore_pss_names:
                print(f"  ✓ {pss_name}: {ptr_count} PTRs")
            else:
                print(f"  ✗ WARNING: '{pss_name}' not found in Firestore")
        
        print("\n" + "="*80)
        print("Feeder Names per PSS (Sheet1):")
        print("="*80)
        grouped = df_feeders.groupby('PSS')
        for pss_name, group in grouped:
            pss_name = str(pss_name).strip()
            feeder_count = len(group)
            feeders = group['Equipment'].tolist()
            if pss_name in firestore_pss_names:
                print(f"  ✓ {pss_name}: {feeder_count} feeders")
            else:
                print(f"  ✗ {pss_name}: {feeder_count} feeders (WARNING: not in Firestore)")
            
            # Show feeder names
            for idx, feeder in enumerate(feeders, 1):
                print(f"      {idx}. {feeder}")
        
        print("\n" + "="*80)
        print("VALIDATION COMPLETE")
        print("="*80)
        
        return df_ptr, df_feeders
        
    except Exception as e:
        print(f"\nERROR reading Excel file: {e}")
        print("Make sure the file has sheets: 'Sheet1' (feeders) and 'PTR COUNT'")
        return None, None

def update_firestore_pss_config(db, df_ptr, df_feeders):
    """Update Firestore with new feeder configuration"""
    print("\n" + "="*80)
    print("UPDATING FIRESTORE")
    print("="*80)
    
    # Create PTR count lookup
    ptr_lookup = {}
    for _, row in df_ptr.iterrows():
        pss_name = str(row['PSS NAME']).strip()
        ptr_count = int(row['PTR COUNT'])
        ptr_lookup[pss_name] = ptr_count
    
    # Group feeders by PSS
    grouped = df_feeders.groupby('PSS')
    
    for pss_name, group in grouped:
        try:
            pss_name = str(pss_name).strip()
            
            # Find the document in Firestore
            pss_ref = db.collection('pss_stations')
            doc = pss_ref.document(pss_name).get()
            
            if not doc.exists:
                print(f"\nWARNING: PSS '{pss_name}' not found in Firestore. Skipping...")
                continue
            
            # Get current data
            current_data = doc.to_dict()
            
            # Build feeders array with auto-assigned PTR numbers
            feeders_array = []
            ptr_count = ptr_lookup.get(pss_name, 2)  # Default to 2 if not found
            
            for idx, (_, row) in enumerate(group.iterrows(), 1):
                feeder_name = str(row['Equipment']).strip()
                
                # Auto-assign PTR number (distribute feeders across PTRs)
                # If 4 feeders and 2 PTRs: F1->PTR1, F2->PTR1, F3->PTR2, F4->PTR2
                ptr_no = ((idx - 1) % ptr_count) + 1
                
                feeder = {
                    'id': idx,
                    'name': feeder_name,
                    'ptrNo': ptr_no
                }
                feeders_array.append(feeder)
            
            # Update document
            update_data = {
                'feeders': feeders_array,
                'feederCount': len(feeders_array),
                'ptrCount': ptr_count,
                'circle': 'RKL',  # Default circle
                'division': 'SED',  # Default division
                'linemen': current_data.get('linemen', []),
                'helpers': current_data.get('helpers', [])
            }
            
            pss_ref.document(pss_name).update(update_data)
            
            print(f"\n✓ UPDATED: {pss_name}")
            print(f"  PTR Count: {ptr_count}")
            print(f"  Feeders: {len(feeders_array)}")
            for feeder in feeders_array:
                print(f"    {feeder['id']}. {feeder['name']} (PTR: {feeder['ptrNo']})")
        
        except Exception as e:
            print(f"\n✗ ERROR updating {pss_name}: {e}")
    
    print("\n" + "="*80)
    print("UPDATE COMPLETE!")
    print("="*80)
    print("\nNext: Your form will now show actual feeder names instead of 'Feeder-1', 'Feeder-2'")

def main():
    """Main execution"""
    print("\n" + "="*80)
    print("PSS FEEDER CONFIGURATION UPDATER")
    print("="*80)
    
    # Initialize Firestore
    db = init_firestore()
    
    # List current PSS stations
    pss_list = list_current_pss_stations(db)
    
    if not pss_list:
        print("\nERROR: No PSS stations found in Firestore")
        return
    
    # Ask user what to do
    print("\n" + "="*80)
    print("OPTIONS:")
    print("  1. Create Excel template (recommended first step)")
    print("  2. Validate Excel file")
    print("  3. Update Firestore from Excel file")
    print("="*80)
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == '1':
        template_file = create_excel_template(pss_list)
        print(f"\nNext steps:")
        print(f"  1. Open {template_file}")
        print(f"  2. Fill in all your PSS feeder names")
        print(f"  3. Save the file")
        print(f"  4. Run this script again and choose option 2 to validate")
    
    elif choice == '2':
        excel_file = input("\nEnter Excel file name (or press Enter for default): ").strip()
        if not excel_file:
            excel_file = 'PSS_FEEDER_CONFIG_TEMPLATE.xlsx'
        
        df_ptr, df_feeders = validate_excel_data(excel_file, pss_list)
        if df_ptr is not None and df_feeders is not None:
            print("\n✓ Validation PASSED!")
            print("You can now run option 3 to update Firestore")
    
    elif choice == '3':
        excel_file = input("\nEnter Excel file name (or press Enter for default): ").strip()
        if not excel_file:
            excel_file = 'PSS_FEEDER_CONFIG_TEMPLATE.xlsx'
        
        df_ptr, df_feeders = validate_excel_data(excel_file, pss_list)
        if df_ptr is not None and df_feeders is not None:
            confirm = input("\nReady to update Firestore? (yes/no): ").strip().lower()
            if confirm == 'yes':
                update_firestore_pss_config(db, df_ptr, df_feeders)
                print("\n✓ SUCCESS! Feeder configuration updated in Firestore")
            else:
                print("Update cancelled")
    
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()
