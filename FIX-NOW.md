# 🚨 URGENT: Fix Your Login NOW

## Your Issue

You changed the phone number in Firestore, so now:
- ❌ Can't login
- ❌ No data showing
- ❌ Only 1 record visible
- ❌ Feeders not working

## ✅ 3-Step Fix (Takes 2 Minutes)

### Step 1: Clear Your Browser Cache

**Do this RIGHT NOW:**

```
1. Press Ctrl + Shift + Delete
2. Select "All time"
3. Check these boxes:
   ✅ Cookies and other site data
   ✅ Cached images and files
4. Click "Clear data"
5. CLOSE browser completely
6. Open new browser window
```

**OR use Incognito mode:**
```
Press Ctrl + Shift + N (Chrome)
Press Ctrl + Shift + P (Firefox)
```

---

### Step 2: Clear Session (Automatic)

**Option A: Online (if already deployed)**
```
1. Open: https://pss-loading-data.web.app/clear-session.html
2. Wait 1 second (auto-clears)
3. Redirected to login
```

**Option B: Local (if testing locally)**
```
1. Open: http://localhost:5000/clear-session.html
2. Wait 1 second (auto-clears)
3. Redirected to login
```

---

### Step 3: Login with CORRECT Phone Number

**IMPORTANT:** Use the phone number that's currently in Firestore!

```
1. Go to Firebase Console
2. Open Firestore Database
3. Check "users" collection
4. Find your user document
5. Look at "phoneNumber" field
6. Use THAT number to login
```

---

## 🔍 Which Phone Number to Use?

### Check Firestore:

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project: **pss-loading-data**
3. Go to **Firestore Database**
4. Open **users** collection
5. Find your user
6. Check **phoneNumber** field
7. **Use that exact number to login!**

Example:
```
If Firestore shows: "phoneNumber": "9876543210"
Then login with: 9876543210
```

---

## ⚠️ If Data Still Not Showing

This means your old submissions have a DIFFERENT phone number.

### Fix Your Old Data:

**Option A: Firebase Console (Manual)**
```
1. Go to Firestore Database
2. Open "daily_entries" collection
3. Find submissions with OLD phone number
4. Click each document → Edit
5. Change "phoneNumber" to match NEW number
6. Save each document
```

**Option B: Bulk Update (Faster - Use Browser Console)**
```javascript
// Open Firebase Console → Firestore page
// Press F12 → Console tab
// Paste this code (replace phone numbers):

const oldPhone = "1234567890"; // Your OLD number
const newPhone = "9876543210"; // Your NEW number (from Firestore users)

db.collection('daily_entries')
  .where('phoneNumber', '==', oldPhone)
  .get()
  .then(snapshot => {
    console.log(`Found ${snapshot.size} documents to update`);
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { phoneNumber: newPhone });
    });
    return batch.commit();
  })
  .then(() => {
    console.log('✅ All submissions updated!');
    alert('Success! Refresh your app now.');
  })
  .catch(err => console.error('❌ Error:', err));
```

---

## 🧪 Test Everything Works

After clearing cache and logging in:

1. ✅ Dashboard shows statistics (Today/Month/Total)
2. ✅ "Recent Submissions" shows multiple entries
3. ✅ Can click "View" on submissions  
4. ✅ New entry form opens
5. ✅ Feeders show correct count (e.g., 6 for Kundukela)
6. ✅ Can enter voltage and time in feeder fields
7. ✅ Can submit form
8. ✅ New submission appears immediately

---

## 🐛 Still Not Working?

### Check Browser Console:

```
1. Press F12
2. Click "Console" tab
3. Look for RED error messages
4. Copy and share them
```

### Run Debug Commands:

Open Console (F12) and paste these one by one:

```javascript
// 1. Check session
console.log('Session:', localStorage.getItem('pssUser'));

// 2. Check Firestore user
db.collection('users')
  .where('phoneNumber', '==', 'YOUR_PHONE_HERE')
  .get()
  .then(s => console.log('User found:', !s.empty, s.docs[0]?.data()));

// 3. Check submissions
db.collection('daily_entries')
  .where('phoneNumber', '==', 'YOUR_PHONE_HERE')
  .get()
  .then(s => console.log('Submissions found:', s.size));

// 4. Check PSS config
console.log('PSS Config:', appState.pssConfig);
```

Replace `YOUR_PHONE_HERE` with your actual phone number.

---

## 💡 What Actually Happened

```
BEFORE (Working):
localStorage: phoneNumber = "1234567890"
Firestore users: phoneNumber = "1234567890" ✅ Match!
Firestore daily_entries: phoneNumber = "1234567890" ✅ Match!
→ App loads data successfully

AFTER YOU CHANGED NUMBER (Broken):
localStorage: phoneNumber = "1234567890" (cached)
Firestore users: phoneNumber = "9876543210" ❌ Mismatch!
Firestore daily_entries: phoneNumber = "1234567890" (old)
→ App queries with "1234567890" → No user found → Can't login

AFTER CLEARING CACHE (Fixed):
localStorage: EMPTY
Login with "9876543210"
localStorage: phoneNumber = "9876543210" ✅
Firestore users: phoneNumber = "9876543210" ✅ Match!
Firestore daily_entries: phoneNumber = "1234567890" ❌ Still mismatch
→ Can login but no data shows (need to update submissions)

AFTER UPDATING SUBMISSIONS (Fully Fixed):
localStorage: phoneNumber = "9876543210" ✅
Firestore users: phoneNumber = "9876543210" ✅
Firestore daily_entries: phoneNumber = "9876543210" ✅ All match!
→ Everything works perfectly!
```

---

## 🎯 Quick Checklist

Before asking for more help, confirm you did:

- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Closed ALL browser tabs
- [ ] Opened fresh tab or Incognito mode
- [ ] Visited /clear-session.html page
- [ ] Checked phone number in Firestore users collection
- [ ] Logged in with EXACT phone number from Firestore
- [ ] Updated old submissions if needed
- [ ] Waited 5 seconds after login
- [ ] Refreshed page once
- [ ] Checked browser console for errors (F12)

---

## 📞 Emergency Contact

If NOTHING works after following all steps:

1. Take screenshot of browser console errors (F12 → Console)
2. Take screenshot of Firestore users collection
3. Take screenshot of your login screen
4. Share all three screenshots
5. Explain exactly which step failed

---

## ✅ Success!

You'll know it's fixed when:
- ✅ Login works without errors
- ✅ Dashboard loads with your stats
- ✅ Recent Submissions shows entries
- ✅ Feeders show correct count
- ✅ Can enter and submit data
- ✅ No console errors

---

**Deployed:** November 14, 2025  
**URL:** https://pss-loading-data.web.app  
**Status:** Session validation active

**NOW GO CLEAR YOUR CACHE AND LOGIN! 🚀**
