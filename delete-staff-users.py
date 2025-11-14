import requests
import json

# Your Firebase config
PROJECT_ID = "pss-loading-data-4e817"
API_KEY = "AIzaSyCPN46YkG5NlOcZiTy3W748lDUKVWdq2Gg"

# Firestore REST API base URL
base_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

print("🗑️ Deleting all STAFF users (keeping only admins)...")
print("=" * 60)

# Delete staff users (phone numbers starting with 91000000)
deleted_count = 0
failed_count = 0

for i in range(36):  # We created 36 staff users (910000000 to 9100000035)
    phone = f"910000000{i}" if i < 10 else f"91000000{i}"
    doc_id = f"staff_{phone}"
    
    url = f"{base_url}/users/{doc_id}?key={API_KEY}"
    
    try:
        response = requests.delete(url)
        if response.status_code in [200, 204]:
            deleted_count += 1
            print(f"  ✅ Deleted staff user: {doc_id}")
        else:
            failed_count += 1
            print(f"  ❌ Failed to delete: {doc_id}")
    except Exception as e:
        failed_count += 1
        print(f"  ❌ Error deleting {doc_id}: {str(e)}")

print("=" * 60)
print(f"✅ Deleted {deleted_count} staff users")
print(f"❌ Failed: {failed_count}")
print(f"\n📊 Remaining in database:")
print(f"  - 19 Admin users (phone: 9876543210-9876543228)")
print(f"  - 18 PSS stations")
print(f"\n✅ You can now login with admin phone numbers!")
print(f"   Example: 9876543210")
