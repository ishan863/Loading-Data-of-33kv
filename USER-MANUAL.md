# 📱 PSS Loading Data System - User Manual

**Welcome to the PSS Loading Data Management System!**

This guide will help you understand how to use the system effectively.

---

## 🔐 1. Logging In

### Access the System
**Website:** `https://pss-loading-data-4e817.web.app`

### Login Process
1. Enter your **10-digit phone number** (no spaces, no +91)
2. Click **"Continue"**
3. You'll be automatically logged in

**Example:** `9876543210`

### Your Dashboard
- **Admin Users:** See 5 windows (Overview, Upload, Data, Users, Settings)
- **Staff Users:** See 3 sections (New Entry, My Submissions, Analytics)

---

## 📝 2. Submitting Data (Staff)

### Method 1: Form Entry (Recommended for Single Entry)

**Step 1: Click "New Entry" Button**

**Step 2: Basic Information**
```
📍 PSS Station: [Auto-filled with your assigned station]
📅 Date: [Select date from calendar]
🕐 Time: [Enter time like 14:30]
👤 Submitted By: [Your name - auto-filled]
```

**Step 3: I/C-1 (GSS) 33KV Data**
```
⚡ Max Voltage (kV): Example: 33.5
📊 Max Load (A): Example: 450
⚡ Min Voltage (kV): Example: 32.8
📊 Min Load (A): Example: 200
```

**Step 4: I/C-2 (GSS) 33KV Data**
Same as I/C-1, enter max/min voltage and load

**Step 5: Power Transformers (PTR) 33KV**
- PTR-1: Enter max/min voltage and load
- PTR-2: Enter max/min voltage and load

**Step 6: Power Transformers (PTR) 11KV**
- PTR-1: Enter max/min voltage and load
- PTR-2: Enter max/min voltage and load

**Step 7: Feeders**
Click "Add Feeder" for each feeder:
```
📌 Name: Example: Feeder 1
⚡ Voltage (kV): Example: 11.0
📊 Current (A): Example: 250
```

**Step 8: Review & Submit**
- Check all your data
- Click **"Submit Data"**
- Wait for ✅ Success message

### Method 2: Excel Upload (For Multiple Entries)

**Step 1: Prepare Your Excel File**

Required columns:
```
| Date | Time | PSS | Submitted_By | IC1_MaxV | IC1_MaxA | IC1_MinV | IC1_MinA | ... |
```

**Download Template:**
- Click **"Download Template"** button
- Fill in your data
- Save the file

**Step 2: Upload**
1. Go to **Upload** section
2. Click **"Choose File"** or drag & drop Excel file
3. Wait for processing
4. Check success/error messages

**Supported Formats:**
- `.xlsx` (Microsoft Excel)
- `.xls` (Old Excel format)

---

## 📊 3. Viewing Your Data

### My Submissions Table

**Columns:**
- Date & Time
- PSS Station
- Submitted By
- Total Max Load (calculated)
- Total Min Load (calculated)
- Actions (View, Edit, Delete)

**Search & Filter:**
```
🔍 Search by: PSS name, date, submitted by name
📅 Filter by: Date range
📍 Filter by: PSS station
```

**Actions:**
- 👁️ **View:** See complete submission details
- ✏️ **Edit:** Modify your submission (admin only)
- 🗑️ **Delete:** Remove submission (admin only)

### Export Data

**Export to Excel:**
1. Click **"Export to Excel"** button
2. Select date range (optional)
3. Select PSS station (optional)
4. Click **"Download"**
5. Excel file will download automatically

**File includes:**
- All submission data
- Peak/Min AMP calculations
- Formatted and ready for reports

---

## 🤖 4. Using the AI Chatbot

### Accessing the Chatbot
**Admins:** Click **"AI Assistant"** tab
**Staff:** Chatbot available in your dashboard

### First-Time Setup

**Step 1: Add API Key**
1. Click ⚙️ Settings icon
2. Choose your API provider:
   - **OpenRouter** (Recommended - More models)
   - **Groq** (Faster responses)

**Get OpenRouter API Key (FREE):**
1. Go to: https://openrouter.ai/keys
2. Sign up with Google
3. Click "Create Key"
4. Copy the key (starts with `sk-or-v1-...`)
5. Paste in chatbot settings
6. Select model (DeepSeek V3.1 recommended)
7. Click "Save"

**Get Groq API Key (FREE):**
1. Go to: https://console.groq.com/keys
2. Sign up
3. Create API key
4. Copy and paste in settings

### Asking Questions

**Example Questions:**

**📊 Get Specific Data:**
```
"Show me all I/C-1 data for Karamdih"
"What is the max voltage for PTR-1 33KV at Sankara?"
"Show all feeder data for Kundukela"
```

**📈 Get Statistics:**
```
"What is the peak load today?"
"Show minimum voltage readings this week"
"Calculate average load for last month"
```

**🔍 Find Information:**
```
"Which PSS has highest load today?"
"Show me all submissions by John Doe"
"What are the transformer readings for June 15?"
```

**📋 Get Reports:**
```
"Generate report for Karamdih for last 7 days"
"Show load comparison across all PSS"
"What's the trend for I/C-1 voltage?"
```

### Understanding Responses

**Data Format:**
```
🏭 PSS: Karamdih
📅 Date: 2025-11-12
🕐 Time: 14:30

⚡ I/C-1 (GSS) 33KV:
   Max Voltage: 33.5 kV
   Max Load: 450 A
   Min Voltage: 32.8 kV
   Min Load: 200 A
```

**Tips for Better Results:**
- Be specific with PSS names
- Include dates when needed
- Ask one thing at a time
- Use proper equipment names (I/C-1, PTR-1, etc.)

### Available AI Models

**🔝 Most Powerful (Recommended):**
- **DeepSeek V3.1** - 671B parameters, best for complex analysis
- **NVIDIA Nemotron Nano 9B V2** - Best for reasoning
- **KAT-Coder-Pro V1** - Great for data analysis

**⚡ Fast Models:**
- **Gemma 2 9B** - Reliable and fast
- **Llama 3.2 3B** - Ultra-fast responses
- **Qwen 2 7B** - Good balance

**If one model fails, the system automatically tries the next one!**

---

## 📈 5. Analytics (Admin Only)

### Overview Window

**Today's Stats:**
- 📊 Total submissions today
- 👥 Active users today
- 🏭 PSS stations reporting
- ⚡ Average load today

**Peak AMP Card:**
- Shows highest recorded load
- PSS station with peak load
- Date and time of peak
- Color-coded by severity (green/yellow/red)

**Min AMP Card:**
- Shows lowest recorded load
- PSS station with minimum load
- Date and time of minimum
- Trend indicators

**Charts:**
- 📊 Load distribution by PSS
- 📈 Daily trends (7 days)
- 🗓️ Monthly comparison
- ⏰ Hourly patterns

### Data Window

**View All Submissions:**
- Complete table of all data entries
- Filter by date, PSS, user
- Sort by any column
- Export filtered results

**Bulk Operations:**
- Select multiple entries
- Delete selected
- Export selected
- Approve/reject (if enabled)

---

## 👥 6. User Management (Admin Only)

### Adding New Users

**Step 1: Click "Add User"**

**Step 2: Fill Details:**
```
📱 Phone Number: 10 digits (e.g., 9876543210)
👤 Full Name: User's complete name
📍 PSS Station: Select from dropdown
👔 Role: Admin or Staff
```

**Step 3: Save**
- Click "Add User"
- User can now login immediately
- Send them their phone number to login

### Editing Users

1. Find user in Users table
2. Click ✏️ Edit icon
3. Update details
4. Click "Save Changes"

### Deleting Users

1. Find user in Users table
2. Click 🗑️ Delete icon
3. Confirm deletion
4. User will be immediately logged out

### User Roles

**Admin:**
- Full system access
- Can add/edit/delete users
- Can manage PSS stations
- Can view all data
- Can export everything
- Can use AI chatbot

**Staff:**
- Can submit data entries
- Can view their own submissions
- Can upload Excel files
- Can use AI chatbot
- Cannot manage users
- Cannot delete entries

---

## 🏭 7. PSS Station Management (Admin Only)

### Settings Window

**View All PSS Stations:**
- List of all configured stations
- Station names and codes
- Edit or delete stations

### Adding New PSS Station

1. Click **"Add Station"**
2. Enter station name (e.g., "New PSS Station")
3. Enter station code (optional)
4. Click **"Save"**
5. Station now available in dropdowns

### Editing Station

1. Find station in list
2. Click ✏️ Edit
3. Update name/code
4. Save changes

### Default Stations

Your system includes these PSS stations:
1. AMRELI
2. BILARA
3. BHILWARA
4. CHITTORGARH
5. DUNGARPUR
6. JAIPUR
7. JALORE
8. JHALAWAR
9. JODHPUR
10. KARAULI
11. KOTA
12. SIKAR
13. UDAIPUR

---

## 📱 8. Mobile Usage

### Mobile Features

**✅ Fully Responsive:**
- Works on phones, tablets, desktops
- Touch-friendly interface
- Optimized for small screens

**📲 How to Use on Mobile:**

1. **Add to Home Screen (iOS):**
   - Open Safari
   - Tap Share button
   - Tap "Add to Home Screen"
   - App icon appears on home screen

2. **Add to Home Screen (Android):**
   - Open Chrome
   - Tap ⋮ (three dots)
   - Tap "Add to Home Screen"
   - App icon appears on home screen

**Mobile Tips:**
- Use landscape mode for tables
- Use form entry instead of Excel upload
- Chatbot works great on mobile
- Data syncs instantly across devices

---

## 🔧 9. Troubleshooting

### Can't Login

**Problem:** "User not found"
**Solution:** 
- Check phone number is exactly 10 digits
- No spaces or +91
- Contact admin to verify your account exists

### Form Not Submitting

**Problem:** "Submit" button doesn't work
**Solution:**
- Check all required fields are filled
- Ensure numbers are valid (no text in number fields)
- Check internet connection
- Try refreshing page (F5)

### Excel Upload Fails

**Problem:** "Invalid file format"
**Solution:**
- Use provided template
- Ensure file is .xlsx or .xls
- Check all columns are present
- Verify data format matches template

### Chatbot Not Responding

**Problem:** "API key invalid"
**Solution:**
- Get new API key from OpenRouter or Groq
- Enter in chatbot settings
- Select a model
- Try again

**Problem:** "Model not available"
**Solution:**
- System will auto-try next model
- Wait a few seconds
- If all models fail, wait 1 minute and retry

### Data Not Showing

**Problem:** Table is empty
**Solution:**
- Check filter settings
- Clear search box
- Verify submissions exist in database
- Refresh page (F5)

### Page Freezing/Lag

**Problem:** Website is slow
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Close unnecessary tabs
- Check internet speed
- Try different browser (Chrome recommended)

---

## 🆘 10. Getting Help

### Self-Help Resources

**📚 Documentation:**
- This User Manual
- HOSTING-ROADMAP.md (for admins)
- TROUBLESHOOTING.md (detailed solutions)

**🎥 Video Tutorials:**
- (Coming soon - Create screen recordings)

**💬 Community:**
- Contact your system administrator
- Check with fellow users
- Report bugs to admin

### Contact Support

**For Technical Issues:**
- Email: [Your Support Email]
- Phone: [Your Support Number]
- Available: [Your Support Hours]

**For Account Issues:**
- Contact your administrator
- Provide: Phone number, name, PSS station

### Reporting Bugs

**When reporting issues, include:**
1. What you were trying to do
2. What happened instead
3. Screenshot of error (if any)
4. Browser name and version
5. Device type (phone/desktop/tablet)

---

## 📋 11. Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Submit new entry | Click "New Entry" → Fill form → Submit |
| View my data | Go to "My Submissions" table |
| Upload Excel | Upload tab → Choose file → Upload |
| Use chatbot | AI Assistant tab → Enter API key → Ask question |
| Export data | Data tab → Export to Excel |
| Add user (admin) | Users tab → Add User → Fill details |
| Add PSS station (admin) | Settings tab → Add Station |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F5 | Refresh page |
| Ctrl+F5 | Hard refresh (clear cache) |
| Ctrl+F | Search in table |
| Tab | Move to next form field |
| Enter | Submit form (when in last field) |
| Esc | Close popup/modal |

### Data Entry Tips

**✅ DO:**
- Enter exact values from equipment
- Use consistent time format (HH:MM)
- Double-check before submitting
- Submit data daily
- Use proper equipment names

**❌ DON'T:**
- Leave required fields empty
- Enter text in number fields
- Submit duplicate entries
- Share your login credentials
- Delete data without permission

---

## 🎯 12. Best Practices

### For Accurate Data

1. **Submit Daily:** Enter data at the end of each shift
2. **Verify Values:** Double-check readings before submission
3. **Use Templates:** Download Excel template for consistency
4. **Note Anomalies:** Add comments for unusual readings
5. **Regular Backups:** Admin should backup data weekly

### For Security

1. **Keep Login Private:** Don't share your phone number
2. **Logout After Use:** Click logout when done
3. **Secure Device:** Lock your phone/computer
4. **Report Issues:** Notify admin of suspicious activity
5. **Update Browser:** Use latest Chrome/Firefox/Safari

### For Performance

1. **Clear Cache:** Once a week (Ctrl+Shift+Delete)
2. **Close Unused Tabs:** Reduces memory usage
3. **Use Chrome:** Best performance and compatibility
4. **Stable Internet:** Use WiFi instead of mobile data
5. **Update App:** Admin deploys updates regularly

---

## 📞 Support Contact

**System Administrator:**
- Name: [Your Name]
- Email: [Your Email]
- Phone: [Your Number]
- Available: [Your Hours]

**Website:** `https://pss-loading-data-4e817.web.app`

**Firebase Console (Admin Only):**
https://console.firebase.google.com/project/pss-loading-data-4e817

---

## 🎉 Welcome!

You're now ready to use the PSS Loading Data System effectively.

**Remember:**
- Submit data daily
- Keep your login secure
- Use AI chatbot for quick insights
- Export data regularly
- Contact admin if you need help

**Happy Data Management! 📊⚡**
