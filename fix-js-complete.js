// ===============================================
// EXCEL UPLOAD WITH COMPARISON & VERIFICATION
// ===============================================

// Global store for preview data
let previewDataStore = {
    type: null,
    headers: [],
    rows: [],
    originalData: [],
    workbook: null
};

// Excel file upload handler
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('excelPreviewInput');
    if (input) {
        input.addEventListener('change', handleExcelPreview);
    }
});

async function handleExcelPreview(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('excelUploadStatus');
    statusDiv.innerHTML = `<div style="color: #3b82f6;">⏳ Reading "${file.name}"...</div>`;
    
    try {
        const workbook = await readExcelFile(file);
        
        // Check for multiple sheets
        if (workbook.SheetNames.length > 1) {
            showSheetSelector(workbook);
        } else {
            processExcelSheet(workbook, workbook.SheetNames[0]);
        }
        
    } catch (error) {
        console.error('Excel read error:', error);
        statusDiv.innerHTML = `<div style="color: #ef4444;">❌ Error reading file: ${error.message}</div>`;
    }
}

// Read Excel file
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Show sheet selector for multiple sheets
function showSheetSelector(workbook) {
    previewDataStore.workbook = workbook;
    
    const selector = document.getElementById('sheetSelector');
    const section = document.getElementById('sheetSelection');
    
    selector.innerHTML = '';
    workbook.SheetNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
    });
    
    section.style.display = 'block';
    document.getElementById('excelUploadStatus').innerHTML = `<div style="color: #10b981;">✅ File loaded - ${workbook.SheetNames.length} sheets found</div>`;
}

// Load selected sheet
async function loadSelectedSheet() {
    const selector = document.getElementById('sheetSelector');
    const sheetName = selector.value;
    
    if (!previewDataStore.workbook || !sheetName) return;
    
    document.getElementById('sheetSelection').style.display = 'none';
    await processExcelSheet(previewDataStore.workbook, sheetName);
}

// Process Excel sheet with comparison
async function processExcelSheet(workbook, sheetName) {
    const statusDiv = document.getElementById('excelUploadStatus');
    statusDiv.innerHTML = `<div style="color: #3b82f6;">⏳ Processing "${sheetName}" and comparing with Firebase...</div>`;
    
    try {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        if (!data || data.length === 0) {
            throw new Error('No data found in sheet');
        }
        
        console.log('📊 Excel data loaded:', data.length, 'rows');
        console.log('📋 First row sample:', data[0]);
        
        // Get headers (normalize to lowercase for matching)
        const headers = Object.keys(data[0]);
        console.log('📝 Headers found:', headers);
        
        // Detect data type
        const dataType = detectDataType(headers);
        console.log('🔍 Detected data type:', dataType);
        
        if (dataType === 'unknown') {
            throw new Error('Could not identify data type. Expected columns for PSS Stations, Users, or Daily Entries.');
        }
        
        // Fetch existing Firebase data
        const existingData = await fetchExistingData(dataType);
        console.log('💾 Fetched existing data:', Object.keys(existingData).length, 'records');
        
        // Compare and mark status
        const comparedData = compareWithExisting(data, existingData, dataType, headers);
        
        // Store for saving later
        previewDataStore.headers = headers;
        previewDataStore.rows = comparedData;
        previewDataStore.type = dataType;
        previewDataStore.originalData = JSON.parse(JSON.stringify(comparedData));
        
        // Display preview
        displayPreviewTable(dataType, headers, comparedData);
        
        // Status message
        const newCount = comparedData.filter(r => r._status === 'new').length;
        const changedCount = comparedData.filter(r => r._status === 'changed').length;
        const unchangedCount = comparedData.filter(r => r._status === 'unchanged').length;
        
        statusDiv.innerHTML = `
            <div style="color: #10b981; font-weight: 600;">
                ✅ Loaded ${data.length} records - 
                <span style="color: #10b981;">🟢 ${newCount} New</span> | 
                <span style="color: #f59e0b;">🟡 ${changedCount} Changed</span> | 
                <span style="color: #6b7280;">⚪ ${unchangedCount} Unchanged</span>
            </div>`;
        
    } catch (error) {
        console.error('❌ Process error:', error);
        statusDiv.innerHTML = `<div style="color: #ef4444;">❌ Error: ${error.message}</div>`;
    }
}

// Detect data type from headers
function detectDataType(headers) {
    const normalized = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    console.log('🔍 Normalized headers:', normalized);
    
    // PSS Stations: Must have name-like column + feeders/lineman/helper
    const hasName = normalized.some(h => h.includes('name') || h === 'pss' || h === 'pssadmin');
    const hasPhone = normalized.some(h => h.includes('phone') || h.includes('number'));
    const hasFeeders = normalized.some(h => h.includes('feeder'));
    const hasLineman = normalized.some(h => h.includes('lineman') || h.includes('line'));
    const hasHelper = normalized.some(h => h.includes('helper'));
    
    if ((hasName || hasPhone) && (hasFeeders || hasLineman || hasHelper)) {
        return 'pss_stations';
    }
    
    // Users: Has name, phone, role, pss
    const hasRole = normalized.some(h => h.includes('role'));
    const hasPss = normalized.some(h => h === 'pss' || h.includes('station'));
    
    if (hasName && hasPhone && hasRole && hasPss) {
        return 'users';
    }
    
    // Daily Entries: Has date, pss, staff, readings
    const hasDate = normalized.some(h => h.includes('date'));
    const hasStaff = normalized.some(h => h.includes('staff'));
    const hasReadings = normalized.some(h => h.includes('ic') || h.includes('ptr') || h.includes('33kv'));
    
    if (hasDate && (hasStaff || hasPss) && hasReadings) {
        return 'daily_entries';
    }
    
    return 'unknown';
}

// Fetch existing data from Firebase
async function fetchExistingData(dataType) {
    const existing = {};
    
    try {
        if (dataType === 'pss_stations') {
            const snapshot = await db.collection('pss_stations').get();
            snapshot.forEach(doc => {
                existing[doc.id] = doc.data();
            });
        } else if (dataType === 'users') {
            const snapshot = await db.collection('users').get();
            snapshot.forEach(doc => {
                existing[doc.id] = doc.data();
            });
        } else if (dataType === 'daily_entries') {
            // Only get recent entries for performance
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90); // Last 90 days
            
            const snapshot = await db.collection('daily_entries')
                .where('timestamp', '>=', cutoffDate)
                .get();
                
            snapshot.forEach(doc => {
                existing[doc.id] = doc.data();
            });
        }
    } catch (error) {
        console.error('Error fetching existing data:', error);
    }
    
    return existing;
}

// Compare new data with existing
function compareWithExisting(newData, existingData, dataType, headers) {
    return newData.map(row => {
        const docId = getDocumentId(row, dataType, headers);
        const existing = existingData[docId];
        
        row._docId = docId;
        
        if (!existing) {
            row._status = 'new';
            row._hasChanges = false;
            return row;
        }
        
        // Check for changes
        const hasChanges = checkForChanges(row, existing, headers);
        row._status = hasChanges ? 'changed' : 'unchanged';
        row._hasChanges = hasChanges;
        row._existing = existing;
        
        return row;
    });
}

// Get document ID based on data type
function getDocumentId(row, dataType, headers) {
    const normalized = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    if (dataType === 'pss_stations') {
        // Find name column
        const nameIdx = normalized.findIndex(h => h.includes('name') || h === 'pss' || h === 'pssadmin');
        if (nameIdx >= 0) {
            const nameCol = headers[nameIdx];
            return String(row[nameCol] || '').trim();
        }
    } else if (dataType === 'users') {
        // Use phoneNumber as ID
        const phoneIdx = normalized.findIndex(h => h.includes('phone') || h.includes('number'));
        if (phoneIdx >= 0) {
            const phoneCol = headers[phoneIdx];
            return String(row[phoneCol] || '').trim();
        }
    } else if (dataType === 'daily_entries') {
        // Use phoneNumber_date as ID
        const phoneIdx = normalized.findIndex(h => h.includes('phone') || h.includes('number'));
        const dateIdx = normalized.findIndex(h => h.includes('date'));
        
        if (phoneIdx >= 0 && dateIdx >= 0) {
            const phone = String(row[headers[phoneIdx]] || '').trim();
            const date = String(row[headers[dateIdx]] || '').trim();
            return `${phone}_${date}`;
        }
    }
    
    return ''; // Return empty if can't determine ID
}

// Check if row has changes from existing
function checkForChanges(newRow, existing, headers) {
    for (const header of headers) {
        const newVal = String(newRow[header] || '').trim();
        const existingVal = String(existing[header] || '').trim();
        
        if (newVal !== existingVal) {
            return true;
        }
    }
    return false;
}

// Display preview table
function displayPreviewTable(dataType, headers, rows) {
    const container = document.getElementById('previewTableContainer');
    const thead = document.getElementById('previewTableHead');
    const tbody = document.getElementById('previewTableBody');
    
    // Update info
    document.getElementById('previewDataType').textContent = getDataTypeLabel(dataType);
    document.getElementById('previewRecordCount').textContent = `${rows.length} records`;
    
    // Build headers
    let headerHtml = '<tr>';
    headerHtml += '<th style="padding: 12px; background: rgba(168,85,247,0.3); border: 1px solid rgba(168,85,247,0.5); color: white; font-weight: 700; text-align: left; white-space: nowrap;">Status</th>';
    headers.forEach(header => {
        headerHtml += `<th style="padding: 12px; background: rgba(168,85,247,0.3); border: 1px solid rgba(168,85,247,0.5); color: white; font-weight: 700; text-align: left; white-space: nowrap;">${header}</th>`;
    });
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;
    
    // Build rows
    let bodyHtml = '';
    rows.forEach((row, rowIdx) => {
        const statusClass = row._status === 'new' ? 'preview-row-new' : 
                           row._status === 'changed' ? 'preview-row-changed' : '';
        
        bodyHtml += `<tr class="${statusClass}">`;
        
        // Status badge
        const statusBadge = row._status === 'new' ? '<span class="status-badge status-new">🟢 New</span>' :
                           row._status === 'changed' ? '<span class="status-badge status-changed">🟡 Changed</span>' :
                           '<span class="status-badge status-unchanged">⚪ Same</span>';
        bodyHtml += `<td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">${statusBadge}</td>`;
        
        // Data cells
        headers.forEach((header, colIdx) => {
            const value = row[header] || '';
            const cellClass = row._status === 'new' ? 'new-record' : 
                             (row._existing && String(row._existing[header] || '').trim() !== String(value).trim()) ? 'modified' : '';
            
            bodyHtml += `<td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                <input type="text" 
                       class="preview-cell ${cellClass}" 
                       value="${value}" 
                       data-row="${rowIdx}" 
                       data-col="${header}"
                       data-original="${value}">
            </td>`;
        });
        
        bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
    
    // Track edits
    tbody.querySelectorAll('.preview-cell').forEach(input => {
        input.addEventListener('input', function() {
            const rowIdx = parseInt(this.dataset.row);
            const col = this.dataset.col;
            const newValue = this.value;
            
            // Update store
            previewDataStore.rows[rowIdx][col] = newValue;
            
            // Mark as modified if different from original
            if (newValue !== this.dataset.original) {
                this.classList.add('modified');
            } else {
                this.classList.remove('modified');
            }
        });
    });
    
    container.style.display = 'block';
}

function getDataTypeLabel(type) {
    const labels = {
        'pss_stations': '🏢 PSS Stations Data',
        'users': '👥 User/Staff Data',
        'daily_entries': '📊 Daily Entries Data'
    };
    return labels[type] || 'Unknown Data';
}

// Save to Firebase
async function savePreviewData() {
    if (!previewDataStore.type || !previewDataStore.rows.length) {
        alert('❌ No data to save!');
        return;
    }
    
    if (!confirm(`💾 Save ${previewDataStore.rows.length} records to Firebase?`)) {
        return;
    }
    
    const statusDiv = document.getElementById('excelUploadStatus');
    statusDiv.innerHTML = '<div style="color: #3b82f6;">⏳ Saving to Firebase...</div>';
    
    let savedCount = 0;
    let errorCount = 0;
    
    try {
        const batch = db.batch();
        const headers = previewDataStore.headers;
        
        for (const row of previewDataStore.rows) {
            try {
                const docId = row._docId;
                
                if (!docId) {
                    console.warn('⚠️ Skipping row - no document ID:', row);
                    errorCount++;
                    continue;
                }
                
                // Normalize data based on type
                const normalizedData = normalizeRowData(row, previewDataStore.type, headers);
                
                const docRef = db.collection(previewDataStore.type).doc(docId);
                batch.set(docRef, normalizedData, { merge: true });
                
                savedCount++;
                
            } catch (rowError) {
                console.error('❌ Error processing row:', row, rowError);
                errorCount++;
            }
        }
        
        await batch.commit();
        
        statusDiv.innerHTML = `<div style="color: #10b981; font-weight: 600;">✅ Successfully saved ${savedCount} records!${errorCount > 0 ? ` (${errorCount} errors)` : ''}</div>`;
        
        // Clear preview after 2 seconds
        setTimeout(() => {
            cancelPreview();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Save error:', error);
        statusDiv.innerHTML = `<div style="color: #ef4444;">❌ Save failed: ${error.message}</div>`;
    }
}

// Normalize row data for Firebase
function normalizeRowData(row, dataType, headers) {
    const normalized = {};
    const headerMap = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    // Copy all fields, excluding internal ones
    headers.forEach((header, idx) => {
        if (!header.startsWith('_')) {
            const value = row[header];
            const normalizedKey = headerMap[idx];
            
            // Map to standard field names
            if (normalizedKey.includes('name') || normalizedKey === 'pss' || normalizedKey === 'pssadmin') {
                normalized.name = String(value || '').trim();
            } else if (normalizedKey.includes('phone') || normalizedKey.includes('number')) {
                normalized.phoneNumber = String(value || '').trim();
            } else if (normalizedKey.includes('feeder')) {
                normalized.feeders = parseInt(value) || 0;
            } else if (normalizedKey.includes('lineman')) {
                // Split comma-separated into array
                const linemanValue = String(value || '').trim();
                normalized.lineman = linemanValue ? linemanValue.split(',').map(s => s.trim()).filter(s => s) : [];
            } else if (normalizedKey.includes('helper')) {
                // Split comma-separated into array
                const helperValue = String(value || '').trim();
                normalized.helper = helperValue ? helperValue.split(',').map(s => s.trim()).filter(s => s) : [];
            } else if (normalizedKey.includes('role')) {
                normalized.role = String(value || '').trim();
            } else if (normalizedKey.includes('date')) {
                normalized.date = String(value || '').trim();
            } else {
                // Keep original field name
                normalized[header] = value;
            }
        }
    });
    
    // Add timestamp
    normalized.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
    
    return normalized;
}

// Cancel preview
function cancelPreview() {
    document.getElementById('previewTableContainer').style.display = 'none';
    document.getElementById('sheetSelection').style.display = 'none';
    document.getElementById('excelUploadStatus').innerHTML = '';
    document.getElementById('excelPreviewInput').value = '';
    
    previewDataStore = {
        type: null,
        headers: [],
        rows: [],
        originalData: [],
        workbook: null
    };
}
