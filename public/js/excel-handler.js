// ============================================
// EXCEL HANDLER - 127 COLUMN IMPORT/EXPORT
// Uses SheetJS (xlsx.js) for Excel operations
// ============================================

// Column mapping for 127 columns
const EXCEL_COLUMNS = {
    // Basic Info (3 columns)
    timestamp: 'Timestamp',
    date: 'Date',
    pssStation: 'PSS Station',
    personnelName: 'Personnel Name',
    
    // I/C-1 33kV (4 columns: voltage max/min + time, load max/min + time)
    ic1_33kv_voltage_max: 'I/C-1 33kV Voltage Max',
    ic1_33kv_voltage_max_time: 'I/C-1 33kV Voltage Max Time',
    ic1_33kv_voltage_min: 'I/C-1 33kV Voltage Min',
    ic1_33kv_voltage_min_time: 'I/C-1 33kV Voltage Min Time',
    ic1_33kv_load_max: 'I/C-1 33kV Load Max',
    ic1_33kv_load_max_time: 'I/C-1 33kV Load Max Time',
    ic1_33kv_load_min: 'I/C-1 33kV Load Min',
    ic1_33kv_load_min_time: 'I/C-1 33kV Load Min Time',
    
    // I/C-2 33kV (4 columns)
    ic2_33kv_voltage_max: 'I/C-2 33kV Voltage Max',
    ic2_33kv_voltage_max_time: 'I/C-2 33kV Voltage Max Time',
    ic2_33kv_voltage_min: 'I/C-2 33kV Voltage Min',
    ic2_33kv_voltage_min_time: 'I/C-2 33kV Voltage Min Time',
    ic2_33kv_load_max: 'I/C-2 33kV Load Max',
    ic2_33kv_load_max_time: 'I/C-2 33kV Load Max Time',
    ic2_33kv_load_min: 'I/C-2 33kV Load Min',
    ic2_33kv_load_min_time: 'I/C-2 33kV Load Min Time',
    
    // PTR-1 33kV (4 columns)
    ptr1_33kv_voltage_max: 'PTR-1 33kV Voltage Max',
    ptr1_33kv_voltage_max_time: 'PTR-1 33kV Voltage Max Time',
    ptr1_33kv_voltage_min: 'PTR-1 33kV Voltage Min',
    ptr1_33kv_voltage_min_time: 'PTR-1 33kV Voltage Min Time',
    ptr1_33kv_load_max: 'PTR-1 33kV Load Max',
    ptr1_33kv_load_max_time: 'PTR-1 33kV Load Max Time',
    ptr1_33kv_load_min: 'PTR-1 33kV Load Min',
    ptr1_33kv_load_min_time: 'PTR-1 33kV Load Min Time',
    
    // PTR-2 33kV (4 columns)
    ptr2_33kv_voltage_max: 'PTR-2 33kV Voltage Max',
    ptr2_33kv_voltage_max_time: 'PTR-2 33kV Voltage Max Time',
    ptr2_33kv_voltage_min: 'PTR-2 33kV Voltage Min',
    ptr2_33kv_voltage_min_time: 'PTR-2 33kV Voltage Min Time',
    ptr2_33kv_load_max: 'PTR-2 33kV Load Max',
    ptr2_33kv_load_max_time: 'PTR-2 33kV Load Max Time',
    ptr2_33kv_load_min: 'PTR-2 33kV Load Min',
    ptr2_33kv_load_min_time: 'PTR-2 33kV Load Min Time',
    
    // PTR-1 11kV (4 columns)
    ptr1_11kv_voltage_max: 'PTR-1 11kV Voltage Max',
    ptr1_11kv_voltage_max_time: 'PTR-1 11kV Voltage Max Time',
    ptr1_11kv_voltage_min: 'PTR-1 11kV Voltage Min',
    ptr1_11kv_voltage_min_time: 'PTR-1 11kV Voltage Min Time',
    ptr1_11kv_load_max: 'PTR-1 11kV Load Max',
    ptr1_11kv_load_max_time: 'PTR-1 11kV Load Max Time',
    ptr1_11kv_load_min: 'PTR-1 11kV Load Min',
    ptr1_11kv_load_min_time: 'PTR-1 11kV Load Min Time',
    
    // PTR-2 11kV (4 columns)
    ptr2_11kv_voltage_max: 'PTR-2 11kV Voltage Max',
    ptr2_11kv_voltage_max_time: 'PTR-2 11kV Voltage Max Time',
    ptr2_11kv_voltage_min: 'PTR-2 11kV Voltage Min',
    ptr2_11kv_voltage_min_time: 'PTR-2 11kV Voltage Min Time',
    ptr2_11kv_load_max: 'PTR-2 11kV Load Max',
    ptr2_11kv_load_max_time: 'PTR-2 11kV Load Max Time',
    ptr2_11kv_load_min: 'PTR-2 11kV Load Min',
    ptr2_11kv_load_min_time: 'PTR-2 11kV Load Min Time',
    
    // Feeders 1-6 (24 columns: 4 per feeder - voltage/load max/min + times)
    feeder1_voltage_max: 'Feeder-1 Voltage Max',
    feeder1_voltage_max_time: 'Feeder-1 Voltage Max Time',
    feeder1_voltage_min: 'Feeder-1 Voltage Min',
    feeder1_voltage_min_time: 'Feeder-1 Voltage Min Time',
    feeder1_load_max: 'Feeder-1 Load Max',
    feeder1_load_max_time: 'Feeder-1 Load Max Time',
    feeder1_load_min: 'Feeder-1 Load Min',
    feeder1_load_min_time: 'Feeder-1 Load Min Time',
    
    feeder2_voltage_max: 'Feeder-2 Voltage Max',
    feeder2_voltage_max_time: 'Feeder-2 Voltage Max Time',
    feeder2_voltage_min: 'Feeder-2 Voltage Min',
    feeder2_voltage_min_time: 'Feeder-2 Voltage Min Time',
    feeder2_load_max: 'Feeder-2 Load Max',
    feeder2_load_max_time: 'Feeder-2 Load Max Time',
    feeder2_load_min: 'Feeder-2 Load Min',
    feeder2_load_min_time: 'Feeder-2 Load Min Time',
    
    feeder3_voltage_max: 'Feeder-3 Voltage Max',
    feeder3_voltage_max_time: 'Feeder-3 Voltage Max Time',
    feeder3_voltage_min: 'Feeder-3 Voltage Min',
    feeder3_voltage_min_time: 'Feeder-3 Voltage Min Time',
    feeder3_load_max: 'Feeder-3 Load Max',
    feeder3_load_max_time: 'Feeder-3 Load Max Time',
    feeder3_load_min: 'Feeder-3 Load Min',
    feeder3_load_min_time: 'Feeder-3 Load Min Time',
    
    feeder4_voltage_max: 'Feeder-4 Voltage Max',
    feeder4_voltage_max_time: 'Feeder-4 Voltage Max Time',
    feeder4_voltage_min: 'Feeder-4 Voltage Min',
    feeder4_voltage_min_time: 'Feeder-4 Voltage Min Time',
    feeder4_load_max: 'Feeder-4 Load Max',
    feeder4_load_max_time: 'Feeder-4 Load Max Time',
    feeder4_load_min: 'Feeder-4 Load Min',
    feeder4_load_min_time: 'Feeder-4 Load Min Time',
    
    feeder5_voltage_max: 'Feeder-5 Voltage Max',
    feeder5_voltage_max_time: 'Feeder-5 Voltage Max Time',
    feeder5_voltage_min: 'Feeder-5 Voltage Min',
    feeder5_voltage_min_time: 'Feeder-5 Voltage Min Time',
    feeder5_load_max: 'Feeder-5 Load Max',
    feeder5_load_max_time: 'Feeder-5 Load Max Time',
    feeder5_load_min: 'Feeder-5 Load Min',
    feeder5_load_min_time: 'Feeder-5 Load Min Time',
    
    feeder6_voltage_max: 'Feeder-6 Voltage Max',
    feeder6_voltage_max_time: 'Feeder-6 Voltage Max Time',
    feeder6_voltage_min: 'Feeder-6 Voltage Min',
    feeder6_voltage_min_time: 'Feeder-6 Voltage Min Time',
    feeder6_load_max: 'Feeder-6 Load Max',
    feeder6_load_max_time: 'Feeder-6 Load Max Time',
    feeder6_load_min: 'Feeder-6 Load Min',
    feeder6_load_min_time: 'Feeder-6 Load Min Time',
    
    // Station Transformer (4 columns)
    station_transformer_voltage_max: 'Station Transformer Voltage Max',
    station_transformer_voltage_max_time: 'Station Transformer Voltage Max Time',
    station_transformer_voltage_min: 'Station Transformer Voltage Min',
    station_transformer_voltage_min_time: 'Station Transformer Voltage Min Time',
    station_transformer_load_max: 'Station Transformer Load Max',
    station_transformer_load_max_time: 'Station Transformer Load Max Time',
    station_transformer_load_min: 'Station Transformer Load Min',
    station_transformer_load_min_time: 'Station Transformer Load Min Time',
    
    // Charger (4 columns)
    charger_voltage_max: 'Charger Voltage Max',
    charger_voltage_max_time: 'Charger Voltage Max Time',
    charger_voltage_min: 'Charger Voltage Min',
    charger_voltage_min_time: 'Charger Voltage Min Time',
    charger_load_max: 'Charger Load Max',
    charger_load_max_time: 'Charger Load Max Time',
    charger_load_min: 'Charger Load Min',
    charger_load_min_time: 'Charger Load Min Time',
    
    // Metadata
    phoneNumber: 'Phone Number',
    submittedBy: 'Submitted By'
};

// ============================================
// HANDLE EXCEL UPLOAD
// ============================================

async function handleExcelUpload(file) {
    console.log('Processing Excel file:', file.name);
    
    // Show progress
    const progressEl = document.getElementById('upload-progress');
    if (progressEl) {
        progressEl.classList.add('active');
        updateProgress(10, 'Reading file...');
    }
    
    try {
        // Read file
        const data = await readExcelFile(file);
        updateProgress(30, 'Parsing data...');
        
        // Validate data
        const validation = validateExcelData(data);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        updateProgress(50, 'Validating data...');
        
        // Get upload mode
        const uploadMode = document.querySelector('.upload-option.selected input')?.value || 'append';
        
        // Process based on mode
        let result;
        switch(uploadMode) {
            case 'append':
                result = await appendDataToFirestore(data);
                break;
            case 'replace':
                result = await replaceDataInFirestore(data);
                break;
            case 'update':
                result = await updateDataInFirestore(data);
                break;
            default:
                throw new Error('Invalid upload mode');
        }
        
        updateProgress(100, 'Upload complete!');
        
        // Show success message
        setTimeout(() => {
            if (progressEl) progressEl.classList.remove('active');
            alert(`✅ Successfully processed ${result.success} records!\n\nMode: ${uploadMode}\nSuccess: ${result.success}\nFailed: ${result.failed}`);
            
            // Refresh data
            loadSubmissions();
            if (adminState.currentWindow === 'view') {
                loadViewWindow();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Excel upload error:', error);
        if (progressEl) progressEl.classList.remove('active');
        alert(`❌ Upload failed: ${error.message}`);
    }
}

// ============================================
// READ EXCEL FILE
// ============================================

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                console.log('Parsed Excel data:', jsonData.length, 'rows');
                resolve(jsonData);
            } catch (error) {
                reject(new Error('Failed to parse Excel file: ' + error.message));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// ============================================
// VALIDATE EXCEL DATA
// ============================================

function validateExcelData(data) {
    const errors = [];
    
    if (!Array.isArray(data) || data.length === 0) {
        return { valid: false, errors: ['Excel file is empty'] };
    }
    
    // Check required columns
    const requiredColumns = ['Date', 'PSS Station', 'Personnel Name'];
    const firstRow = data[0];
    
    requiredColumns.forEach(col => {
        if (!(col in firstRow)) {
            errors.push(`Missing required column: ${col}`);
        }
    });
    
    // Validate data types
    data.forEach((row, index) => {
        // Validate date format
        if (row['Date'] && !isValidDate(row['Date'])) {
            errors.push(`Row ${index + 2}: Invalid date format`);
        }
        
        // Validate numeric fields
        Object.keys(row).forEach(key => {
            if (key.includes('Voltage') || key.includes('Load')) {
                const value = row[key];
                if (value !== '' && value !== null && isNaN(parseFloat(value))) {
                    errors.push(`Row ${index + 2}: Invalid numeric value in ${key}`);
                }
            }
        });
    });
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// ============================================
// APPEND DATA TO FIRESTORE
// ============================================

async function appendDataToFirestore(excelData) {
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < excelData.length; i++) {
        try {
            const row = excelData[i];
            const firestoreData = convertExcelRowToFirestore(row);
            
            await db.collection('daily_entries').add(firestoreData);
            success++;
            
            updateProgress(50 + (i / excelData.length * 45), `Processing ${i + 1}/${excelData.length}...`);
        } catch (error) {
            console.error('Error adding row:', error);
            failed++;
        }
    }
    
    return { success, failed };
}

// ============================================
// REPLACE DATA IN FIRESTORE
// ============================================

async function replaceDataInFirestore(excelData) {
    // Get date range from Excel
    const dates = excelData.map(row => row['Date']).filter(Boolean);
    const minDate = dates.reduce((a, b) => a < b ? a : b);
    const maxDate = dates.reduce((a, b) => a > b ? a : b);
    
    if (!confirm(`⚠️ WARNING: This will DELETE all existing data from ${minDate} to ${maxDate} and replace it with the uploaded data.\n\nAre you absolutely sure?`)) {
        throw new Error('Operation cancelled by user');
    }
    
    // Delete existing data in date range
    const existingDocs = await db.collection('daily_entries')
        .where('date', '>=', minDate)
        .where('date', '<=', maxDate)
        .get();
    
    const batch = db.batch();
    existingDocs.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Add new data
    return await appendDataToFirestore(excelData);
}

// ============================================
// UPDATE DATA IN FIRESTORE - SMART MERGE (Only updates changed values)
// ============================================

async function updateDataInFirestore(excelData) {
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < excelData.length; i++) {
        try {
            const row = excelData[i];
            const newData = convertExcelRowToFirestore(row);
            
            // Find existing entry by phone number and date
            const query = await db.collection('daily_entries')
                .where('phoneNumber', '==', newData.phoneNumber)
                .where('date', '==', newData.date)
                .limit(1)
                .get();
            
            if (!query.empty) {
                // SMART UPDATE: Only update changed values, keep existing data
                const existingDoc = query.docs[0];
                const existingData = existingDoc.data();
                
                // Merge: Only update fields that are different or new
                const mergedData = {};
                let hasChanges = false;
                
                Object.keys(newData).forEach(key => {
                    const newValue = newData[key];
                    const existingValue = existingData[key];
                    
                    // Skip empty/null/undefined values (keep existing)
                    if (newValue === '' || newValue === null || newValue === undefined) {
                        return; // Don't update this field
                    }
                    
                    // Only update if value changed
                    if (newValue !== existingValue) {
                        mergedData[key] = newValue;
                        hasChanges = true;
                    }
                });
                
                // Only update if there are actual changes
                if (hasChanges) {
                    // Add timestamp for update tracking
                    mergedData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
                    await existingDoc.ref.update(mergedData);
                    console.log(`✅ Updated ${Object.keys(mergedData).length} fields for ${newData.pssStation} on ${newData.date}`);
                } else {
                    console.log(`ℹ️ No changes detected for ${newData.pssStation} on ${newData.date}`);
                }
            } else {
                // Add new entry (no existing data found)
                newData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('daily_entries').add(newData);
                console.log(`➕ Added new entry for ${newData.pssStation} on ${newData.date}`);
            }
            
            success++;
            updateProgress(50 + (i / excelData.length * 45), `Processing ${i + 1}/${excelData.length}...`);
        } catch (error) {
            console.error('Error updating row:', error);
            failed++;
        }
    }
    
    return { success, failed };
}

// ============================================
// CONVERT EXCEL ROW TO FIRESTORE FORMAT
// ============================================

function convertExcelRowToFirestore(row) {
    const firestoreData = {};
    
    // Map each Excel column to Firestore field
    Object.keys(EXCEL_COLUMNS).forEach(firestoreKey => {
        const excelColumn = EXCEL_COLUMNS[firestoreKey];
        const value = row[excelColumn];
        
        // Convert empty strings to null
        if (value === '' || value === undefined) {
            firestoreData[firestoreKey] = null;
        } else if (firestoreKey.includes('time')) {
            // Keep time as string
            firestoreData[firestoreKey] = value;
        } else if (firestoreKey.includes('voltage') || firestoreKey.includes('load')) {
            // Convert to number
            firestoreData[firestoreKey] = parseFloat(value) || null;
        } else {
            // Keep as is
            firestoreData[firestoreKey] = value;
        }
    });
    
    // Add timestamp if not present
    if (!firestoreData.timestamp) {
        firestoreData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
    }
    
    return firestoreData;
}

// ============================================
// EXPORT TO EXCEL
// ============================================

async function exportToExcel(submissions, filename = 'PSS_Data_Export') {
    console.log('Exporting to Excel:', submissions.length, 'records');
    
    try {
        // Convert Firestore data to Excel format
        const excelData = submissions.map(submission => {
            const row = {};
            
            // Map each Firestore field to Excel column
            Object.keys(EXCEL_COLUMNS).forEach(firestoreKey => {
                const excelColumn = EXCEL_COLUMNS[firestoreKey];
                let value = submission[firestoreKey];
                
                // Format timestamp
                if (firestoreKey === 'timestamp' && value) {
                    value = value.toDate ? formatTimestamp(value) : value;
                }
                
                row[excelColumn] = value || '';
            });
            
            return row;
        });
        
        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'PSS Data');
        
        // Auto-size columns
        const maxWidth = 20;
        const cols = Object.keys(excelData[0] || {}).map(() => ({ wch: maxWidth }));
        worksheet['!cols'] = cols;
        
        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0];
        const finalFilename = `${filename}_${dateStr}.xlsx`;
        
        // Download
        XLSX.writeFile(workbook, finalFilename);
        
        console.log('Excel export complete:', finalFilename);
        return true;
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Failed to export Excel file: ' + error.message);
        return false;
    }
}

// ============================================
// EXPORT FILTERED DATA
// ============================================

async function exportFilteredData() {
    const dateFrom = document.getElementById('export-date-from')?.value;
    const dateTo = document.getElementById('export-date-to')?.value;
    const pss = document.getElementById('export-pss')?.value;
    
    let dataToExport = adminState.filteredSubmissions;
    
    // Apply additional filters
    if (dateFrom) {
        dataToExport = dataToExport.filter(s => s.date >= dateFrom);
    }
    if (dateTo) {
        dataToExport = dataToExport.filter(s => s.date <= dateTo);
    }
    if (pss) {
        dataToExport = dataToExport.filter(s => s.pssStation === pss);
    }
    
    if (dataToExport.length === 0) {
        alert('No data to export with current filters');
        return;
    }
    
    const filename = `PSS_Export_${dateFrom || 'all'}_to_${dateTo || 'all'}`;
    await exportToExcel(dataToExport, filename);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateProgress(percent, message) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    if (progressText) {
        progressText.textContent = message;
    }
}

function isValidDate(dateString) {
    if (!dateString) return false;
    
    // Try parsing YYYY-MM-DD format
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (regex.test(dateString)) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
    
    return false;
}

// Export functions
window.handleExcelUpload = handleExcelUpload;
window.exportToExcel = exportToExcel;
window.exportFilteredData = exportFilteredData;
