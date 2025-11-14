# 🚀 **QUICK START GUIDE**
## PSS Loading Data Management App - Setup Instructions

---

## ⚡ **STEP 1: Firebase Project Setup**

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `PSS-Loading-Data` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create Project"

### 1.2 Enable Firestore Database
1. In Firebase Console, click "Firestore Database"
2. Click "Create Database"
3. Select "Start in **production mode**"
4. Choose location closest to you (e.g., `asia-south1` for India)
5. Click "Enable"

### 1.3 Get Firebase Configuration
1. Go to Project Settings (⚙️ icon)
2. Scroll to "Your apps"
3. Click "</>" (Web app icon)
4. Register app name: `PSS-Web-App`
5. Copy the `firebaseConfig` object

### 1.4 Update Firebase Config File
Open `public/js/firebase-config.js` and replace:
```javascript
const firebaseConfig = {
    apiKey: "AIza...",              // Your API key
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

---

## 📊 **STEP 2: Setup Database Collections**

### 2.1 Create Users Collection
1. Go to Firestore Database
2. Click "Start collection"
3. Collection ID: `users`
4. Add first document:

```
Document ID: (Auto-ID)
Fields:
  phoneNumber: "9876543210"      (string)
  name: "Raja Kumar"             (string)
  role: "admin"                  (string)
  pssStation: "ALL"              (string)
  status: "active"               (string)
  createdAt: (timestamp) [Click "Add field" → timestamp → "Now"]
```

5. Click "Save"

**Add More Users:**
```
// Admin Example
phoneNumber: "9876543210"
name: "Raja Kumar"
role: "admin"
pssStation: "ALL"
status: "active"

// Staff Example
phoneNumber: "9876543211"
name: "John Lineman"
role: "staff"
pssStation: "PSS-A"
status: "active"
```

### 2.2 Create PSS Stations Collection
1. Click "Start collection"
2. Collection ID: `pss_stations`
3. Document ID: `pss-a` (lowercase, hyphenated)

```
Fields:
  name: "PSS Station A"          (string)
  feeders: 6                     (number)
  personnel: (map)
    linemen: ["John Lineman", "David Kumar", "Robert Singh"]  (array)
    helpers: ["Mike Helper", "Tom Assistant", "Jerry Support"] (array)
  status: "active"               (string)
```

**Add more PSS stations as needed**

### 2.3 Create Daily Entries Collection
1. Click "Start collection"
2. Collection ID: `daily_entries`
3. This will auto-populate when users submit data

### 2.4 Create Admin Logs Collection
1. Click "Start collection"
2. Collection ID: `admin_logs`
3. Auto-populated by admin actions

---

## 🔐 **STEP 3: Update Security Rules**

1. Go to Firestore Database
2. Click "Rules" tab
3. Copy content from `firestore.rules` file
4. Paste into the rules editor
5. Click "Publish"

---

## 🚀 **STEP 4: Deploy to Firebase Hosting**

### 4.1 Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 4.2 Login to Firebase
```bash
firebase login
```

### 4.3 Initialize Firebase in Project
```bash
cd PSS-Firebase-App
firebase init
```

Select:
- ✅ Firestore
- ✅ Hosting

When asked:
- "What file should be used for Firestore Rules?" → Press Enter (firestore.rules)
- "What file should be used for Firestore indexes?" → Press Enter (firestore.indexes.json)
- "What do you want to use as your public directory?" → Enter `public`
- "Configure as a single-page app?" → `Yes`
- "Set up automatic builds?" → `No`
- "File public/index.html already exists. Overwrite?" → `No`

### 4.4 Deploy to Firebase
```bash
firebase deploy
```

Wait for deployment to complete. You'll get a URL like:
```
https://your-project-id.web.app
```

---

## ✅ **STEP 5: Test the Application**

### 5.1 Open Your App
Visit: `https://your-project-id.web.app`

### 5.2 Test Login
1. Enter phone number: `9876543210` (admin)
2. Click "Login"
3. Should redirect to Admin Dashboard

### 5.3 Test Staff Login
1. Logout
2. Enter phone number: `9876543211` (staff)
3. Select your name from the list
4. Should redirect to User Dashboard

---

## 📱 **STEP 6: Add More Users**

### Via Firebase Console:
1. Go to Firestore Database
2. Click `users` collection
3. Click "Add document"
4. Fill in fields:
   - phoneNumber: `9876543212`
   - name: `"User Name"`
   - role: `"staff"` or `"admin"`
   - pssStation: `"PSS-A"` (or PSS name)
   - status: `"active"`
   - createdAt: (timestamp)

### Via Excel Import (Coming Soon):
Admin can upload Excel file with user list

---

## 🎨 **STEP 7: Customize Branding**

### Update Developer Name:
In `public/index.html`, find:
```html
<div class="developer-credit">
    <p>Developed by</p>
    <h3>Raja Patel</h3>
</div>
```

Change "Raja Patel" to your name.

### Update App Title:
Change in multiple locations:
- Loading screen
- Login screen
- Dashboard headers

---

## 🐛 **TROUBLESHOOTING**

### Problem: "Firebase not defined"
**Solution:** Check that Firebase CDN scripts are loading:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
```

### Problem: Login not working
**Solution:** 
1. Check phone number exists in `users` collection
2. Verify `status` field is set to `"active"`
3. Check browser console for errors
4. Verify Firebase config is correct

### Problem: Data not saving
**Solution:**
1. Check Firestore rules are deployed
2. Verify collection names match exactly
3. Check browser console for errors
4. Ensure network connection is active

### Problem: "Permission denied"
**Solution:**
1. Update and publish Firestore rules
2. Make sure user role is set correctly
3. Check console for specific rule violations

---

## 📊 **DATA STRUCTURE REFERENCE**

### Users Document:
```javascript
{
  phoneNumber: "9876543210",     // 10-digit number
  name: "User Name",
  role: "admin" | "staff",        // Only these two values
  pssStation: "PSS-A",            // Must match station name
  status: "active" | "inactive",
  createdAt: timestamp,
  lastLogin: timestamp
}
```

### PSS Station Document:
```javascript
{
  name: "PSS Station A",
  feeders: 6,                     // Number of feeders
  personnel: {
    linemen: ["Name1", "Name2"],
    helpers: ["Name3", "Name4"]
  },
  status: "active"
}
```

### Daily Entry Document (Auto-created):
```javascript
{
  userId: "user123",
  userName: "John Doe",
  phoneNumber: "9876543211",
  pssStation: "PSS-A",
  date: "2025-11-11",
  timestamp: timestamp,
  // ... 127 data fields ...
  ic1_max_voltage: 33.5,
  ic1_max_voltage_time: "14:30",
  // etc...
}
```

---

## 🆘 **NEED HELP?**

### Common Commands:
```bash
# Check Firebase login status
firebase login:list

# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# View project info
firebase projects:list

# Open local emulator
firebase serve
```

### Local Testing:
```bash
# Run local server
firebase serve --only hosting

# Access at: http://localhost:5000
```

---

## 🎯 **NEXT STEPS**

1. ✅ Complete all setup steps above
2. ✅ Add your team's phone numbers to `users` collection
3. ✅ Configure all PSS stations in `pss_stations`
4. ✅ Test login with multiple users
5. ✅ Test data entry form
6. ✅ Train team on how to use the system

---

## 📞 **Support**

For technical issues:
- Check browser console (F12)
- Review Firebase Console logs
- Verify all configuration steps

**Project Developer: Raja Patel**

---

**🎉 You're all set! Enjoy your PSS Loading Data Management App! 🎉**
