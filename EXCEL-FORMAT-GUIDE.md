# 📊 PSS Data Excel Format Guide

## ✅ CONFIRMED: Excel Format Specification

### 📋 Complete Column Structure (129 Columns Total)

#### **Basic Information (4 Columns)**
| Column | Format | Example | Description |
|--------|--------|---------|-------------|
| Date | dd-mm-yyyy | 12-11-2025 | Submission date |
| PSS_Name | Text | Karamdih | Power Sub-Station name |
| Staff_Name | Text | Rajesh Kumar | Staff member name |
| Phone | Number | 9876543210 | Contact number |

---

#### **I/C-1 (GSS) 33KV Section (8 Columns)**
| Column | Format | Example | Description |
|--------|--------|---------|-------------|
| IC1_PTR | Text | PTR-1 | Transformer reference |
| IC1_Max_V | Number | 33.5 | Maximum voltage (kV) |
| IC1_Max_V_Time | Time | 14:30 | Time of max voltage |
| IC1_Min_V | Number | 32.1 | Minimum voltage (kV) |
| IC1_Min_V_Time | Time | 03:15 | Time of min voltage |
| IC1_Max_I | Number | 456 | Maximum current (A) |
| IC1_Max_I_Time | Time | 18:45 | Time of max current |
| IC1_Min_I | Number | 123 | Minimum current (A) |
| IC1_Min_I_Time | Time | 02:00 | Time of min current |

---

#### **I/C-2 (GSS) 33KV Section (8 Columns)**
Same structure as I/C-1 with IC2_ prefix

---

#### **PTR-1 33KV Section (8 Columns)**
| Column | Format | Example | Description |
|--------|--------|---------|-------------|
| PTR1_33_PTR | Text | PTR-1 | Transformer reference |
| PTR1_33_Max_V | Number | 33.2 | Maximum voltage (kV) |
| PTR1_33_Max_V_Time | Time | 15:00 | Time of max voltage |
| PTR1_33_Min_V | Number | 31.8 | Minimum voltage (kV) |
| PTR1_33_Min_V_Time | Time | 04:00 | Time of min voltage |
| PTR1_33_Max_I | Number | 350 | Maximum current (A) |
| PTR1_33_Max_I_Time | Time | 19:00 | Time of max current |
| PTR1_33_Min_I | Number | 100 | Minimum current (A) |
| PTR1_33_Min_I_Time | Time | 03:00 | Time of min current |

---

#### **PTR-2 33KV, PTR-1 11KV, PTR-2 11KV Sections (8 columns each)**
Same structure with respective prefixes:
- PTR2_33_*
- PTR1_11_*
- PTR2_11_*

**Total PTR columns: 4 sections × 8 columns = 32 columns**

---

#### **Feeder Sections (6 Feeders × 10 Columns = 60 Columns)**

Each feeder has:
| Column | Format | Example | Description |
|--------|--------|---------|-------------|
| F1_Name | Text | Feeder 1 | Feeder name |
| F1_PTR | Text | PTR-1 | Transformer reference |
| F1_Max_V | Number | 11.2 | Maximum voltage (kV) |
| F1_Max_V_Time | Time | 18:00 | Time of max voltage |
| F1_Min_V | Number | 10.8 | Minimum voltage (kV) |
| F1_Min_V_Time | Time | 03:30 | Time of min voltage |
| F1_Max_I | Number | 250 | Maximum current (A) |
| F1_Max_I_Time | Time | 19:30 | Time of max current |
| F1_Min_I | Number | 50 | Minimum current (A) |
| F1_Min_I_Time | Time | 02:30 | Time of min current |

**Repeat for F2_, F3_, F4_, F5_, F6_**

---

#### **Equipment Sections (3 × 8 Columns = 24 Columns)**

**Station Transformer (8 columns)**
- ST_PTR, ST_Max_V, ST_Max_V_Time, ST_Min_V, ST_Min_V_Time, ST_Max_I, ST_Max_I_Time, ST_Min_I, ST_Min_I_Time

**Charger (8 columns)**
- Charger_PTR, Charger_Max_V, Charger_Max_V_Time, Charger_Min_V, Charger_Min_V_Time, Charger_Max_I, Charger_Max_I_Time, Charger_Min_I, Charger_Min_I_Time

**Capacitor Bank (8 columns)**
- CB_PTR, CB_Max_V, CB_Max_V_Time, CB_Min_V, CB_Min_V_Time, CB_Max_I, CB_Max_I_Time, CB_Min_I, CB_Min_I_Time

---

## 🔄 Safe Re-Upload System

### ✅ How It Works

1. **Download Latest Template**
   - Click "📥 Download Latest Data Template" in Upload tab
   - Gets your most recent submission
   - All 129 columns included with current values

2. **Edit Values**
   - Open CSV file in Excel
   - Change ONLY the values you want to update
   - Leave other cells unchanged (do NOT delete values)
   - Save the file

3. **Re-Upload**
   - Click "📁 Choose Excel File to Upload"
   - Select your edited file
   - System compares old vs new values

4. **Smart Update**
   - ✅ **Changed values** → Updated in database
   - ✅ **Unchanged values** → Kept as-is
   - ✅ **Empty cells** → Keeps existing data (NOT deleted)
   - ✅ **New values** → Added to database

---

## 📅 Date Format Requirements

### ✅ MANDATORY FORMAT: `dd-mm-yyyy`

**Correct Examples:**
- 12-11-2025 ✅
- 01-01-2024 ✅
- 25-12-2025 ✅

**Wrong Formats (Will NOT work):**
- 2025-11-12 ❌ (yyyy-mm-dd)
- 11/12/2025 ❌ (mm/dd/yyyy)
- 12 Nov 2025 ❌ (text format)

**All dates displayed in the system:**
- Tables show: `dd-mm-yyyy`
- Analytics show: `dd-mm-yyyy`
- Downloaded templates: `dd-mm-yyyy`
- Upload requirement: `dd-mm-yyyy`

---

## 📊 Column Breakdown

| Section | Columns | Total |
|---------|---------|-------|
| Basic Info | 4 | 4 |
| I/C-1 33KV | 8 | 8 |
| I/C-2 33KV | 8 | 8 |
| PTR-1 33KV | 8 | 8 |
| PTR-2 33KV | 8 | 8 |
| PTR-1 11KV | 8 | 8 |
| PTR-2 11KV | 8 | 8 |
| Feeder 1-6 | 10 each | 60 |
| Station Transformer | 8 | 8 |
| Charger | 8 | 8 |
| Capacitor Bank | 8 | 8 |
| **TOTAL** | | **129** |

---

## 🎯 Usage Workflow

### For Admin Users:

1. **First Time Upload**
   - Prepare Excel with all 129 columns
   - Fill in PSS name, staff name, phone
   - Add equipment data
   - Date format: dd-mm-yyyy
   - Upload via "📁 Choose Excel File"

2. **Update Existing Data**
   - Go to Upload Data tab
   - Click "📥 Download Latest Data Template"
   - Open downloaded CSV in Excel
   - Edit only changed values
   - Save file (keep dd-mm-yyyy format)
   - Upload via "📁 Choose Excel File"
   - System updates only changed fields!

### For Staff Users:

1. **Daily Data Entry**
   - Login to user dashboard
   - Fill manual form OR
   - Download admin's template
   - Edit values
   - Upload

---

## 📋 Sample Data Example

### Row 1 (Headers)
```
Date,PSS_Name,Staff_Name,Phone,IC1_PTR,IC1_Max_V,IC1_Max_V_Time,IC1_Min_V,IC1_Min_V_Time,IC1_Max_I,IC1_Max_I_Time,IC1_Min_I,IC1_Min_I_Time,...
```

### Row 2 (Data)
```
12-11-2025,Karamdih,Rajesh Kumar,9876543210,PTR-1,33.5,14:30,32.1,03:15,456,18:45,123,02:00,...
```

---

## ⚠️ Important Rules

### ✅ DO:
- Use **dd-mm-yyyy** date format
- Fill all basic info (Date, PSS_Name, Staff_Name, Phone)
- Use numbers for voltage and current values
- Use HH:MM format for time (24-hour)
- Keep empty cells for optional equipment
- Save as CSV or XLSX format

### ❌ DON'T:
- Use yyyy-mm-dd or mm/dd/yyyy date formats
- Leave Date, PSS_Name, or Phone empty
- Use text in numeric fields
- Delete entire rows
- Change column headers
- Remove columns

---

## 🔍 Validation Checks

System validates:
1. ✅ Date format is dd-mm-yyyy
2. ✅ PSS name exists in database
3. ✅ Phone number is valid
4. ✅ Numeric fields contain numbers
5. ✅ Time format is HH:MM
6. ✅ All 129 columns present

---

## 🆘 Troubleshooting

### Problem: "Invalid date format"
**Solution:** Change date to dd-mm-yyyy format (e.g., 12-11-2025)

### Problem: "Missing columns"
**Solution:** Download fresh template, don't delete any columns

### Problem: "Data not updating"
**Solution:** 
- Check you're editing the correct PSS and date
- Ensure values actually changed
- Verify phone number matches

### Problem: "Old values deleted"
**Solution:** 
- Don't leave cells empty if you want to keep old values
- Download template first to see existing values
- Only change cells you want to update

---

## 📞 Support

For issues:
1. Check date format: **dd-mm-yyyy**
2. Verify all 129 columns present
3. Ensure no empty basic info fields
4. Download fresh template if structure wrong

---

## ✨ Key Features

### 🎯 Latest Data on Top
- **Admin Panel:** Newest submissions appear first
- **User Dashboard:** Recent data at top
- **Automatic sorting** by timestamp

### 📥 Template Download
- **One-click download** of latest submission
- **All 129 columns** included
- **Pre-filled with current data**
- **PSS name and staff info** included

### 🔒 Safe Updates
- **Only changed values** updated
- **Empty cells** keep existing data
- **No data loss** on re-upload
- **Audit trail** maintained

### 📅 Consistent Date Format
- **Display:** dd-mm-yyyy everywhere
- **Upload:** dd-mm-yyyy required
- **Export:** dd-mm-yyyy in files
- **Storage:** Proper timestamp internally

---

**This Excel format is the official standard for PSS data upload and management.**
