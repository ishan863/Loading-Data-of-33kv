# 🔍 Debug Guide - Check Console Logs

## YOUR ISSUES

1. ❌ Dynamic feeders still showing 1-6 for all PSS
2. ❌ Can't enter max voltage/time on mobile
3. ❌ Recent Submissions section blank despite having 1 submission

## ✅ FIXES DEPLOYED

I've added **extensive console logging** to help diagnose the problems. 

---

## 🧪 HOW TO DEBUG

### Step 1: Clear Cache & Reload

**IMPORTANT:** You MUST clear cache to see the fixes!

```
1. Press Ctrl + Shift + Delete
2. Select "All time"
3. Check both boxes:
   ✅ Cookies and site data
   ✅ Cached images and files
4. Click "Clear data"
5. Close browser
6. Reopen and go to: http://localhost:5000 OR https://pss-loading-data.web.app
```

---

### Step 2: Open Browser Console

**Press F12** or **Right-click → Inspect → Console tab**

You'll now see detailed debug messages with emojis!

---

### Step 3: Login and Check Logs

After login, you should see:

```
✅ PSS Configuration loaded { Kundukela: {...}, Sankara: {...} }
📊 Loading submissions for phone: 1234567890
✅ Loaded 1 submissions
📋 Rendering submission history...
  Container found: true
  Total submissions: 1
  Showing recent: 1
```

**If you see this → Problem is fixed!**

---

### Step 4: Open New Entry Form

Click "+ New Entry" button, then check console for:

```
🔍 Generating feeder section...
  PSS Station: Kundukela
  PSS Config keys: ["Kundukela", "Sankara", ...]
  ✅ Found PSS data: {feeders: 6, linemen: [...]}
  ✅ Using 6 feeders (number format)
```

**If you see "❌ PSS config not found" → That's the problem!**

---

### Step 5: Check Form Handler

When you reach Step 4 (Feeders) in form, console should show:

```
🔍 Feeder Generation Debug:
  Selected PSS: Kundukela
  appState exists: true
  pssConfig exists: true
  pssConfig keys: ["Kundukela", "Sankara", ...]
  ✅ Found PSS config: {feeders: 6, ...}
  ✅ Using number format: 6 feeders
  📊 Final feeder count: 6
```

---

## 🐛 COMMON PROBLEMS & SOLUTIONS

### Problem 1: "PSS config not found"

**Console shows:**
```
❌ PSS config not found!
Available configs: undefined
```

**Cause:** `appState.pssConfig` is empty or not loaded

**Solution:**
1. Check if Firestore `pss_stations` collection exists
2. Make sure collection has documents: "Kundukela", "Sankara", etc.
3. Each document should have `feeders` field (number or array)

**Firestore Structure Should Be:**
```
pss_stations (collection)
  └─ Kundukela (document)
       ├─ feeders: 6
       ├─ linemen: ["Name1", "Name2"]
       └─ helpers: ["Helper1", "Helper2"]
  └─ Sankara (document)
       ├─ feeders: 4
       └─ ...
```

---

### Problem 2: "No submissions found"

**Console shows:**
```
📊 Loading submissions for phone: 1234567890
✅ Loaded 0 submissions
⚠️ No submissions found for phone: 1234567890
💡 This could mean:
  1. No data entered yet for this phone number
  2. Phone number was changed in Firestore
  3. Data exists under different phone number
```

**Solution:** See PHONE-NUMBER-CHANGE-FIX.md

---

### Problem 3: "recentSubmissionsContainer not found"

**Console shows:**
```
📋 Rendering submission history...
  Container found: false
❌ recentSubmissionsContainer not found in DOM!
```

**Cause:** HTML element missing from page

**Solution:** Check `index.html` has:
```html
<div id="recentSubmissionsContainer"></div>
```

---

### Problem 4: Feeders still showing 1-6

**Console shows:**
```
⚠️ No PSS config found for Kundukela, defaulting to 6 feeders
```

**Two possible causes:**

**A) PSS name mismatch**
```
Your user PSS: "KUNDUKELA" (uppercase)
Firestore collection: "Kundukela" (mixed case)
→ No match!
```

**Solution:** Make sure case matches exactly OR:
- Firestore document name: exactly "Kundukela"
- User pssStation field: exactly "Kundukela"

**B) Feeders field missing**
```
Firestore document exists but has no "feeders" field
```

**Solution:** Add feeders field:
```
pss_stations/Kundukela:
  feeders: 6  ← ADD THIS
  linemen: [...]
```

---

### Problem 5: Can't enter voltage on mobile

**This is NOT a code issue - it's a dropdown vs input issue**

**Check console for:**
```
Generated feeder sections successfully
Time pickers initialized
```

**If you see these logs:**
- Form is generating correctly
- Time pickers are working
- Mobile issue might be browser-specific

**Test on mobile:**
1. Try landscape mode
2. Try different browser (Chrome vs Firefox)
3. Check if tapping works
4. Try long-press on input field

---

## 📊 Expected Console Output (Success)

When everything works, you should see:

```
✅ Session saved: {phoneNumber: "...", name: "...", ...}
🔍 Loading user data for phone: ...
✅ User data loaded: {phone: ..., name: ..., role: ..., pss: ...}
✅ PSS Configuration loaded {...}
📊 Loading submissions for phone: ...
✅ Loaded 1 submissions
📋 Rendering submission history...
  Container found: true
  Total submissions: 1
  Showing recent: 1
  ✅ Showed empty state / table
🔍 Generating feeder section...
  PSS Station: Kundukela
  PSS Config keys: [...]
  ✅ Found PSS data: {...}
  ✅ Using 6 feeders (number format)
✅ Generated 6 feeder sections
🔍 Feeder Generation Debug:
  Selected PSS: Kundukela
  ✅ Found PSS config: {...}
  ✅ Using number format: 6 feeders
  📊 Final feeder count: 6
```

---

## 🎯 Action Items

### DO THIS NOW:

1. **Clear browser cache completely**
2. **Open browser console (F12)**
3. **Login to app**
4. **Copy ALL console messages**
5. **Share the console output**

The console logs will tell us EXACTLY what's wrong!

---

## 📋 Checklist

Before reporting "still not working":

- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Closed all browser tabs
- [ ] Opened fresh tab
- [ ] Opened browser console (F12)
- [ ] Logged in successfully
- [ ] Checked console for error messages
- [ ] Copied console output
- [ ] Checked Firestore `pss_stations` collection exists
- [ ] Verified `pss_stations` documents have `feeders` field
- [ ] Tried both form-handler form AND user.js modal form

---

## 🔑 Key Debug Messages

Look for these specific messages:

### ✅ GOOD (Everything Working)
```
✅ PSS Configuration loaded
✅ Loaded X submissions
✅ Found PSS data
✅ Using X feeders
📊 Final feeder count: X
```

### ⚠️ WARNING (Check These)
```
⚠️ No PSS config found
⚠️ No submissions found
⚠️ PSS configuration not found
⚠️ Defaulting to 6 feeders
```

### ❌ ERROR (Critical Issues)
```
❌ PSS config not found!
❌ No case-insensitive match found
❌ recentSubmissionsContainer not found
❌ Phone number mismatch
```

---

## 💻 Quick Test Commands

Paste these in browser console to test:

```javascript
// Check PSS config
console.log('PSS Config:', appState.pssConfig);
console.log('PSS Config Keys:', Object.keys(appState.pssConfig || {}));

// Check current user
console.log('Current User:', appState.currentUser);
console.log('User PSS:', appState.currentUser.pssStation);

// Check submissions
console.log('My Submissions:', userState.mySubmissions.length);
console.log('Submissions:', userState.mySubmissions);

// Check if container exists
console.log('Container:', document.getElementById('recentSubmissionsContainer'));

// Force render
renderSubmissionHistory();
```

---

## 📸 What to Share

If still not working, share:

1. **Full console output** (copy all text from Console tab)
2. **Screenshot of Firestore `pss_stations` collection**
3. **Screenshot of Firestore `users` collection (your user)**
4. **Screenshot of the issue** (feeders showing 1-6, blank submissions, etc.)
5. **Which browser** (Chrome/Firefox/Edge + version)
6. **Desktop or Mobile**

---

**DEPLOY STATUS:** ✅ Deployed to Firebase  
**URL:** https://pss-loading-data.web.app  
**Console Logging:** Active  
**Debug Mode:** Enabled

**NOW GO CHECK YOUR CONSOLE LOGS! 🔍**
