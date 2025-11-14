#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix emoji encoding in HTML file - handles double-encoded UTF-8"""

import codecs
import re

# Read the HTML file as binary first to detect encoding issues
filepath = r'c:\Users\R A J A\Pyton_proj\LOADING DATA\PSS-Firebase-App\public\index.html'

# Read as binary to see actual bytes
with open(filepath, 'rb') as f:
    content_bytes = f.read()

# The mojibake patterns we need to fix (double-encoded UTF-8)
# These are the actual byte sequences in the file
replacements = {
    # 📤 (Upload) - double-encoded as ðŸ"¤
    b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\xa4': '📤'.encode('utf-8'),
    # 📋 (Clipboard) - double-encoded as ðŸ"‹
    b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc5\x8b': '📋'.encode('utf-8'),
    # 📥 (Inbox) - double-encoded as ðŸ"¥
    b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\xa5': '📥'.encode('utf-8'),
    # 📁 (Folder) - double-encoded as ðŸ"
    b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\x81': '📁'.encode('utf-8'),
    # 📊 (Chart) - double-encoded as ðŸ"Š
    b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc5\xa0': '📊'.encode('utf-8'),
    # ❌ (X mark) - double-encoded as âŒ
    b'\xc3\xa2\xc5\x92\xc2\x8c': '❌'.encode('utf-8'),
    # ℹ️ (Info) - double-encoded as â„¹ï¸
    b'\xc3\xa2\xc4\xb9\xc3\xaf\xc2\xb8\xc2\x8f': 'ℹ️'.encode('utf-8'),
}

# Replace all mojibake patterns
for old_bytes, new_bytes in replacements.items():
    count = content_bytes.count(old_bytes)
    if count > 0:
        print(f"Found {count} instances of mojibake pattern, replacing...")
        content_bytes = content_bytes.replace(old_bytes, new_bytes)

# Write back as proper UTF-8
with open(filepath, 'wb') as f:
    f.write(content_bytes)

print("✅ Fixed emoji encoding in index.html")
print(f"   Replaced {len(replacements)} emoji patterns")

# Verify the fix
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    if '📤' in content and '📥' in content and '📁' in content:
        print("✅ Verification passed - emojis are now correct!")
    else:
        print("⚠️ Warning: Some emojis may still need fixing")
