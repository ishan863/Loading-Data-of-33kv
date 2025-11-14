# 🚀 PSS Loading Data Management App
### **Developed by Raja Patel**

## 📋 **Project Overview**

A professional, Firebase-powered web application for managing PSS (Power Sub-Station) loading data with real-time analytics, admin dashboard, and user data entry system.

---

## 🎯 **Features**

### **✅ Authentication**
- Phone number-based login (NO OTP required)
- Role-based access (Admin / Staff)
- Name selection for staff members
- Secure Firebase authentication

### **👨‍💼 Admin Dashboard**
- **Overview Window**: Today's peak/min AMP for all PSS
- **Upload Window**: Excel file upload/download (127 columns)
- **View Window**: Searchable data table with edit/delete
- **Analytics Window**: Real-time charts and graphs
- **Settings Window**: User management, PSS configuration

### **👷 User Dashboard**
- Date selection and data entry form
- Personal submission history
- Edit capabilities (within 24 hours)
- Performance statistics

### **📊 Data Management**
- 127-column data structure
- Excel import/export in exact format
- Real-time database sync
- Peak/Min AMP calculations

---

## 📁 **Project Structure**

```
PSS-Firebase-App/
├── public/
│   ├── index.html          # Main entry point
│   ├── css/
│   │   ├── loading.css     # Loading screen animations
│   │   ├── login.css       # Login & authentication screens
│   │   ├── admin.css       # Admin dashboard styles
│   │   ├── user.css        # User dashboard styles
│   │   └── form.css        # Data entry form styles
│   ├── js/
│   │   ├── firebase-config.js    # Firebase configuration
│   │   ├── auth.js               # Authentication logic
│   │   ├── admin.js              # Admin dashboard functions
│   │   ├── user.js               # User dashboard functions
│   │   ├── form-handler.js       # Form validation & submission
│   │   ├── analytics.js          # Charts and analytics
│   │   ├── excel-handler.js      # Excel import/export
│   │   └── app.js                # Main app controller
│   └── assets/
│       └── (images, icons)
├── firebase.json           # Firebase hosting config
├── firestore.rules         # Database security rules
├── firestore.indexes.json  # Database indexes
└── README.md              # This file
```

---

## 🔧 **Data Structure (127 Columns)**

### **Basic Info (Columns 1-5)**
- Timestamp, Date, PSS Name, Lineman, Helper

### **33KV I/C Data (Columns 6-21)**
- I/C-1: Max/Min Voltage & Load with times (8 columns)
- I/C-2: Max/Min Voltage & Load with times (8 columns)

### **PTR Data (Columns 22-53)**
- PTR-1 33kv: Max/Min Voltage & Load with times (8 columns)
- PTR-2 33kv: Max/Min Voltage & Load with times (8 columns)
- PTR-1 11kv: Max/Min Voltage & Load with times (8 columns)
- PTR-2 11kv: Max/Min Voltage & Load with times (8 columns)

### **Feeder Data (Columns 54-107)**
- Feeder 1-6: PTR + Max/Min Voltage & Load with times (9 columns each = 54 total)

### **Additional Data (Columns 108-127)**
- Station Transformer: Max/Min Voltage & Load with times (8 columns)
- Charger: PTR + Max/Min Voltage & Load with times (9 columns)
- Remarks (3 columns)

---

## 🚀 **Setup Instructions**

### **1. Prerequisites**
```bash
- Node.js (v16 or higher)
- Firebase CLI
- Google Firebase account
```

### **2. Install Firebase CLI**
```bash
npm install -g firebase-tools
```

### **3. Login to Firebase**
```bash
firebase login
```

### **4. Initialize Firebase Project**
```bash
cd PSS-Firebase-App
firebase init
```

Select:
- ✅ Firestore
- ✅ Hosting
- ✅ (Optional) Storage

### **5. Configure Firebase**

Create `public/js/firebase-config.js`:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
```

### **6. Setup Firestore Database**

Create Collections:
- `users` - User registration data
- `pss_stations` - PSS configuration
- `daily_entries` - Data submissions
- `admin_logs` - Admin activity logs

### **7. Add Users to Database**

In Firebase Console, add to `users` collection:
```json
{
  "phoneNumber": "9876543210",
  "name": "Raja Kumar",
  "role": "admin",
  "pssStation": "ALL",
  "status": "active"
}
```

### **8. Deploy to Firebase**
```bash
firebase deploy
```

Your app will be live at: `https://YOUR_PROJECT.web.app`

---

## 📊 **Database Schema**

### **users Collection**
```javascript
{
  phoneNumber: "9876543210",
  name: "User Name",
  role: "admin" | "staff",
  pssStation: "PSS-A",
  status: "active",
  createdAt: timestamp,
  lastLogin: timestamp
}
```

### **pss_stations Collection**
```javascript
{
  stationId: "pss-a",
  name: "PSS Station A",
  feeders: 6,
  personnel: {
    linemen: ["Name1", "Name2"],
    helpers: ["Name3", "Name4"]
  }
}
```

### **daily_entries Collection**
```javascript
{
  userId: "user123",
  userName: "John Doe",
  phoneNumber: "9876543210",
  pssStation: "PSS-A",
  date: "2025-11-11",
  timestamp: timestamp,
  // ... all 127 data fields ...
  ic1_max_voltage: 33.5,
  ic1_max_voltage_time: "14:30",
  // ... etc ...
}
```

---

## 🔐 **Security Rules**

`firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Anyone can read PSS config
    match /pss_stations/{station} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
    
    // Entries: users can create, admin can modify
    match /daily_entries/{entry} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
      allow update, delete: if request.auth.token.admin == true;
    }
  }
}
```

---

## 💻 **Usage Guide**

### **For Admin:**
1. Login with admin phone number
2. Access admin dashboard
3. Use navigation tabs:
   - **Overview**: Monitor today's data
   - **Upload**: Import/export Excel files
   - **View**: Search and edit entries
   - **Analytics**: View charts and reports
   - **Settings**: Manage users and configuration

### **For Staff:**
1. Login with registered phone number
2. Select your name from the list
3. Choose date
4. Fill in the data entry form
5. Submit
6. View your history

---

## 📈 **Analytics Features**

- **Today's Peak AMP**: Shows highest load for each PSS
- **Today's Min AMP**: Shows lowest load for each PSS
- **Load Trends**: Line chart showing trends over time
- **PSS Comparison**: Bar chart comparing stations
- **Peak Hours Heatmap**: Visual representation of peak times
- **Custom Reports**: Generate reports for any date range

---

## 🔄 **Excel Upload/Download**

### **Upload Format:**
- Must match 127-column structure
- Date format: YYYY-MM-DD
- Time format: HH:MM
- Numeric fields: decimals allowed

### **Download Format:**
- Exact same 127-column format
- All data preserved
- Supports date range filtering
- Export as .xlsx or .csv

---

## 🎨 **Customization**

### **Colors (CSS Variables)**
```css
--primary-color: #2563eb;      /* Blue */
--secondary-color: #10b981;    /* Green */
--accent-color: #f59e0b;       /* Orange */
--background: #0f172a;         /* Dark Blue */
```

### **Branding**
- Update developer name in `index.html` loading screen
- Modify logo in `assets/` folder
- Change app title in HTML files

---

## 🐛 **Troubleshooting**

### **Login Not Working**
- Check if phone number exists in `users` collection
- Verify Firebase config is correct
- Check browser console for errors

### **Data Not Saving**
- Verify Firestore rules allow writes
- Check network connection
- Ensure all required fields are filled

### **Excel Upload Failed**
- Verify file has 127 columns
- Check column order matches structure
- Ensure date/time formats are correct

---

## 📞 **Support**

For issues or questions, contact:
**Raja Patel**
- Project Developer & Maintainer

---

## 📄 **License**

© 2025 Raja Patel. All Rights Reserved.

---

## 🚀 **Next Steps After Setup**

1. ✅ Add users to Firebase `users` collection
2. ✅ Add PSS stations to `pss_stations` collection
3. ✅ Test login with registered phone numbers
4. ✅ Test data entry form
5. ✅ Upload sample Excel file
6. ✅ Verify analytics calculations
7. ✅ Train staff on usage

---

## 📝 **Version History**

### **v1.0.0** (Current)
- Initial release
- Complete authentication system
- Admin dashboard with 5 windows
- User data entry form
- Excel import/export
- Real-time analytics
- Peak/Min AMP calculations

---

**Built with ❤️ by Raja Patel**
