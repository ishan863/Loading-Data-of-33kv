/**
 * Reports and Export Module
 * Handles generation and export of loading data reports in multiple formats
 */

let allReportData = [];
let currentReportFormat = 'monthly';
let reportsInitialized = false;

// Initialize report functionality
function initializeReports() {
    if (reportsInitialized) return;
    
    console.log('📋 Initializing Reports Module...');
    
    // Wait for Firebase to be ready
    if (typeof db === 'undefined') {
        console.log('⏳ Waiting for Firebase...');
        setTimeout(initializeReports, 200);
        return;
    }
    
    reportsInitialized = true;
    console.log('✅ Reports Module Ready');
    
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const fromDateEl = document.getElementById('reportFromDate');
    const toDateEl = document.getElementById('reportToDate');
    const filterEl = document.getElementById('reportPSSFilter');
    
    if (fromDateEl) {
        fromDateEl.value = firstDay.toISOString().split('T')[0];
        console.log('📅 From Date:', fromDateEl.value);
    }
    if (toDateEl) {
        toDateEl.value = today.toISOString().split('T')[0];
        console.log('📅 To Date:', toDateEl.value);
    }
    
    // Load PSS list for filter
    loadPSSFilterOptions();
    
    // Set up format tab styling
    setupFormatTabs();
    
    // Auto-load data on date/filter change
    if (fromDateEl) fromDateEl.addEventListener('change', generateReportPreview);
    if (toDateEl) toDateEl.addEventListener('change', generateReportPreview);
    if (filterEl) filterEl.addEventListener('change', generateReportPreview);
}

// Load PSS options for filter
async function loadPSSFilterOptions() {
    try {
        if (typeof db === 'undefined') {
            console.error('Firestore not initialized');
            return;
        }
        
        const snapshot = await db.collection('daily_entries').get();
        const pssSet = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.pssStation) {
                pssSet.add(data.pssStation);
            }
        });
        
        const selectElement = document.getElementById('reportPSSFilter');
        if (!selectElement) return;
        
        selectElement.innerHTML = '<option value="">All PSS Stations</option>';
        
        Array.from(pssSet).sort().forEach(pss => {
            const option = document.createElement('option');
            option.value = pss;
            option.textContent = pss;
            selectElement.appendChild(option);
        });
        
        console.log(`✅ Loaded ${pssSet.size} PSS stations for filter`);
    } catch (error) {
        console.error('Error loading PSS filter options:', error);
    }
}

// Refresh reports data
async function refreshReportsData() {
    showToast('Refreshing data...', 'info');
    await loadPSSFilterOptions();
    if (allReportData.length > 0) {
        await generateReportPreview();
    }
    showToast('Data refreshed successfully!', 'success');
}

// Switch between report formats
function switchReportFormat(format) {
    currentReportFormat = format;
    
    // Update tab styles
    document.querySelectorAll('.report-format-tab').forEach(tab => {
        if (tab.dataset.format === format) {
            tab.classList.add('active');
            tab.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.1) 100%)';
            tab.style.borderColor = 'rgba(59,130,246,0.3)';
            tab.style.color = '#60a5fa';
        } else {
            tab.classList.remove('active');
            tab.style.background = 'rgba(255,255,255,0.05)';
            tab.style.borderColor = 'rgba(255,255,255,0.1)';
            tab.style.color = 'rgba(255,255,255,0.6)';
        }
    });
    
    // Show/hide report previews
    document.getElementById('monthlyReportPreview').style.display = format === 'monthly' ? 'block' : 'none';
    document.getElementById('dailyReportPreview').style.display = format === 'daily' ? 'block' : 'none';
    
    // Regenerate preview if data exists
    if (allReportData.length > 0) {
        if (format === 'monthly') {
            generateMonthlyPreview();
        } else {
            generateDailyPreview();
        }
    }
}

// Setup format tabs
function setupFormatTabs() {
    const tabs = document.querySelectorAll('.report-format-tab');
    tabs.forEach(tab => {
        tab.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'rgba(255,255,255,0.1)';
            }
        });
        tab.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'rgba(255,255,255,0.05)';
            }
        });
    });
}

// Generate report preview
async function generateReportPreview() {
    console.log('🚀 generateReportPreview called');
    
    const fromDateEl = document.getElementById('reportFromDate');
    const toDateEl = document.getElementById('reportToDate');
    const pssFilterEl = document.getElementById('reportPSSFilter');
    
    if (!fromDateEl || !toDateEl) {
        console.error('❌ Date elements not found');
        return;
    }
    
    const fromDate = fromDateEl.value;
    const toDate = toDateEl.value;
    const pssFilter = pssFilterEl ? pssFilterEl.value : '';
    
    if (!fromDate || !toDate) {
        console.log('⏳ Dates not set yet');
        return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
        console.error('❌ Invalid date range');
        if (typeof showToast === 'function') {
            showToast('From date cannot be after To date', 'error');
        }
        return;
    }
    
    console.log(`📊 Generating report: ${fromDate} to ${toDate}${pssFilter ? ' for ' + pssFilter : ''}`);
    
    try {
        if (typeof db === 'undefined') {
            console.error('❌ Firestore not initialized');
            if (typeof showToast === 'function') {
                showToast('Database not ready. Please refresh the page.', 'error');
            }
            return;
        }
        
        console.log('📡 Fetching data from Firestore...');
        
        // Fetch ALL data first (simpler approach)
        const snapshot = await db.collection('daily_entries').get();
        allReportData = [];
        
        console.log(`📦 Got ${snapshot.size} total documents`);
        
        snapshot.forEach(doc => {
            try {
                const data = doc.data();
                let entryDate;
                
                // Handle different date formats
                if (data.date && data.date.toDate) {
                    entryDate = data.date.toDate();
                } else if (data.date) {
                    entryDate = new Date(data.date);
                } else {
                    console.warn(`⚠️ Entry ${doc.id} has no date`);
                    return;
                }
                
                const dateStr = entryDate.toISOString().split('T')[0];
                
                // Filter by date range
                if (dateStr < fromDate || dateStr > toDate) {
                    return;
                }
                
                // Filter by PSS if selected
                if (pssFilter && data.pssStation !== pssFilter) {
                    return;
                }
                
                allReportData.push({
                    id: doc.id,
                    ...data,
                    dateObj: entryDate
                });
            } catch (error) {
                console.error(`❌ Error processing doc ${doc.id}:`, error);
            }
        });
        
        // Sort by date
        allReportData.sort((a, b) => a.dateObj - b.dateObj);
        
        console.log(`✅ Loaded ${allReportData.length} entries`);
        
        // Update statistics
        updateReportStatistics();
        
        // Generate appropriate preview
        if (currentReportFormat === 'monthly') {
            generateMonthlyPreview();
        } else {
            generateDailyPreview();
        }
    } catch (error) {
        console.error('❌ Error generating report:', error);
        if (typeof showToast === 'function') {
            showToast('Error loading report data: ' + error.message, 'error');
        }
        
        // Show error in table
        const tbody = document.getElementById('monthlyReportBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="18" style="padding: 2rem; text-align: center; color: #ef4444;">
                        Error loading data: ${error.message}<br>
                        <small>Check console for details</small>
                    </td>
                </tr>
            `;
        }
    }
}

// Update report statistics
function updateReportStatistics() {
    const pssSet = new Set();
    let totalFeeders = 0;
    
    allReportData.forEach(entry => {
        pssSet.add(entry.pssStation);
        if (entry.feeders) {
            totalFeeders += Object.keys(entry.feeders).length;
        }
    });
    
    const totalEntriesEl = document.getElementById('reportStatTotalEntries');
    const pssCountEl = document.getElementById('reportStatPSSCount');
    const feederCountEl = document.getElementById('reportStatFeederCount');
    const dateRangeEl = document.getElementById('reportStatDateRange');
    
    if (totalEntriesEl) totalEntriesEl.textContent = allReportData.length;
    if (pssCountEl) pssCountEl.textContent = pssSet.size;
    if (feederCountEl) feederCountEl.textContent = totalFeeders;
    
    const fromDate = document.getElementById('reportFromDate')?.value;
    const toDate = document.getElementById('reportToDate')?.value;
    if (dateRangeEl && fromDate && toDate) {
        dateRangeEl.textContent = `${fromDate} to ${toDate}`;
    }
    
    console.log(`📊 Stats: ${allReportData.length} entries, ${pssSet.size} PSS, ${totalFeeders} feeders`);
}

// Generate monthly report preview
function generateMonthlyPreview() {
    console.log('📊 Generating monthly preview...');
    const tbody = document.getElementById('monthlyReportBody');
    if (!tbody) {
        console.error('❌ monthlyReportBody element not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (allReportData.length === 0) {
        console.log('⚠️ No data to display');
        tbody.innerHTML = `
            <tr>
                <td colspan="18" style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">
                    No data found for the selected date range.<br>
                    Try selecting a different date range or PSS station.
                </td>
            </tr>
        `;
        return;
    }
    
    console.log(`✅ Generating table with ${allReportData.length} entries`);
    
    // Generate rows for each entry and its feeders
    let rowCount = 0;
    allReportData.forEach(entry => {
        const dateStr = entry.dateObj.toLocaleDateString('en-GB');
        const pss = entry.pssStation || '-';
        const staff = entry.staffName || '-';
        
        // Get feeders sorted by key
        const feeders = entry.feeders || {};
        const feederKeys = Object.keys(feeders).sort((a, b) => {
            const numA = parseInt(a.split('-')[1]) || 0;
            const numB = parseInt(b.split('-')[1]) || 0;
            return numA - numB;
        });
        
        if (feederKeys.length === 0) {
            console.log(`⚠️ Entry ${entry.id} has no feeders`);
        }
        
        // Add row for each feeder
        feederKeys.forEach(feederKey => {
            const feeder = feeders[feederKey];
            const feederName = feeder.name || feederKey;
            const ptrNo = feeder.ptrNo || '-';
            
            const row = tbody.insertRow();
            row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            row.style.transition = 'background 0.2s';
            row.onmouseenter = function() { this.style.background = 'rgba(59,130,246,0.1)'; };
            row.onmouseleave = function() { this.style.background = 'transparent'; };
            
            // Date
            row.insertCell().textContent = dateStr;
            row.cells[0].style.padding = '10px 8px';
            row.cells[0].style.whiteSpace = 'nowrap';
            
            // Circle (static for now)
            row.insertCell().textContent = 'RKL';
            row.cells[1].style.padding = '10px 8px';
            
            // Division (static for now)
            row.insertCell().textContent = 'SED';
            row.cells[2].style.padding = '10px 8px';
            
            // PSS
            row.insertCell().textContent = pss;
            row.cells[3].style.padding = '10px 8px';
            row.cells[3].style.fontWeight = '600';
            row.cells[3].style.color = '#60a5fa';
            
            // Equipment (Feeder Name)
            row.insertCell().textContent = feederName;
            row.cells[4].style.padding = '10px 8px';
            row.cells[4].style.fontWeight = '600';
            row.cells[4].style.color = '#34d399';
            
            // PTR No
            row.insertCell().textContent = ptrNo;
            row.cells[5].style.padding = '10px 8px';
            
            // Max Voltage
            row.insertCell().textContent = feeder.maxVoltage || '-';
            row.cells[6].style.padding = '10px 8px';
            
            // Max Voltage Date
            row.insertCell().textContent = feeder.maxVDate || '-';
            row.cells[7].style.padding = '10px 8px';
            
            // Max Voltage Time
            row.insertCell().textContent = feeder.maxVTime || '-';
            row.cells[8].style.padding = '10px 8px';
            
            // Min Voltage
            row.insertCell().textContent = feeder.minVoltage || '-';
            row.cells[9].style.padding = '10px 8px';
            
            // Min Voltage Date
            row.insertCell().textContent = feeder.minVDate || '-';
            row.cells[10].style.padding = '10px 8px';
            
            // Min Voltage Time
            row.insertCell().textContent = feeder.minVTime || '-';
            row.cells[11].style.padding = '10px 8px';
            
            // Max Current
            row.insertCell().textContent = feeder.maxCurrent || '-';
            row.cells[12].style.padding = '10px 8px';
            
            // Max Current Date
            row.insertCell().textContent = feeder.maxIDate || '-';
            row.cells[13].style.padding = '10px 8px';
            
            // Max Current Time
            row.insertCell().textContent = feeder.maxITime || '-';
            row.cells[14].style.padding = '10px 8px';
            
            // Min Current
            row.insertCell().textContent = feeder.minCurrent || '-';
            row.cells[15].style.padding = '10px 8px';
            
            // Min Current Date
            row.insertCell().textContent = feeder.minIDate || '-';
            row.cells[16].style.padding = '10px 8px';
            
            // Min Current Time
            row.insertCell().textContent = feeder.minITime || '-';
            row.cells[17].style.padding = '10px 8px';
        });
    });
}

// Generate daily report preview
function generateDailyPreview() {
    const contentDiv = document.getElementById('dailyReportContent');
    
    if (allReportData.length === 0) {
        contentDiv.textContent = 'No data found for the selected criteria';
        return;
    }
    
    // Group by PSS
    const pssList = [];
    allReportData.forEach(entry => {
        if (entry.pssStation && !pssList.includes(entry.pssStation)) {
            pssList.push(entry.pssStation);
        }
    });
    
    pssList.sort();
    
    contentDiv.textContent = pssList.join('\n');
}

// Export monthly report to Excel
async function exportMonthlyReport() {
    if (allReportData.length === 0) {
        showToast('No data to export. Please generate a report first.', 'error');
        return;
    }
    
    showToast('Preparing Excel export...', 'info');
    
    try {
        // Load SheetJS library if not already loaded
        if (typeof XLSX === 'undefined') {
            await loadSheetJS();
        }
        
        // Prepare data for export
        const exportData = [];
        
        allReportData.forEach(entry => {
            const dateStr = entry.dateObj.toLocaleDateString('en-GB');
            const pss = entry.pssStation || '-';
            
            const feeders = entry.feeders || {};
            const feederKeys = Object.keys(feeders).sort((a, b) => {
                const numA = parseInt(a.split('-')[1]);
                const numB = parseInt(b.split('-')[1]);
                return numA - numB;
            });
            
            feederKeys.forEach(feederKey => {
                const feeder = feeders[feederKey];
                exportData.push({
                    'Date': dateStr,
                    'Circle': 'RKL',
                    'Division': 'SED',
                    'PSS': pss,
                    'Equipment': feeder.name || feederKey,
                    'PTR No.': feeder.ptrNo || '',
                    'Max Voltage (kV)': feeder.maxVoltage || '',
                    'Max V Date': feeder.maxVDate || '',
                    'Max V Time': feeder.maxVTime || '',
                    'Min Voltage (kV)': feeder.minVoltage || '',
                    'Min V Date': feeder.minVDate || '',
                    'Min V Time': feeder.minVTime || '',
                    'Max Current (A)': feeder.maxCurrent || '',
                    'Max I Date': feeder.maxIDate || '',
                    'Max I Time': feeder.maxITime || '',
                    'Min Current (A)': feeder.minCurrent || '',
                    'Min I Date': feeder.minIDate || '',
                    'Min I Time': feeder.minITime || ''
                });
            });
        });
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths
        ws['!cols'] = [
            {wch: 12}, {wch: 8}, {wch: 10}, {wch: 15}, {wch: 20}, {wch: 8},
            {wch: 12}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10},
            {wch: 12}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10}
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Loading Details');
        
        // Generate filename
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;
        const filename = `Monthly_Loading_Details_${fromDate}_to_${toDate}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Excel file exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showToast('Error exporting to Excel: ' + error.message, 'error');
    }
}

// Export daily report to Excel
async function exportDailyReport() {
    if (allReportData.length === 0) {
        showToast('No data to export. Please generate a report first.', 'error');
        return;
    }
    
    showToast('Preparing Excel export...', 'info');
    
    try {
        // Load SheetJS library if not already loaded
        if (typeof XLSX === 'undefined') {
            await loadSheetJS();
        }
        
        // Group by PSS
        const pssList = [];
        allReportData.forEach(entry => {
            if (entry.pssStation && !pssList.includes(entry.pssStation)) {
                pssList.push(entry.pssStation);
            }
        });
        
        pssList.sort();
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(pssList.map(pss => [pss]));
        
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Loading Summary');
        
        // Generate filename
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;
        const filename = `Daily_Loading_Summary_${fromDate}_to_${toDate}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        showToast('Excel file exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showToast('Error exporting to Excel: ' + error.message, 'error');
    }
}

// Load SheetJS library dynamically
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Note: Initialization is called from admin.js when switching to reports tab
