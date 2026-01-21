/**
 * Reports and Export Module - Complete Rewrite
 * Auto-updates when data changes in backend
 */

let allReportData = [];
let currentReportFormat = 'monthly';
let reportsInitialized = false;
let dataRefreshInterval = null;

// Initialize reports module
async function initializeReports() {
    if (reportsInitialized) {
        console.log('📋 Reports already initialized, refreshing data...');
        await generateReportPreview();
        return;
    }
    
    console.log('📋 Initializing Reports module...');
    
    // Wait for Firebase
    let attempts = 0;
    while (typeof db === 'undefined' && attempts < 20) {
        console.log(`⏳ Waiting for Firebase (${attempts + 1}/20)...`);
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }
    
    if (typeof db === 'undefined') {
        console.error('❌ Firebase not available');
        showError('Database not available. Please refresh the page.');
        return;
    }
    
    console.log('✅ Firebase ready');
    reportsInitialized = true;
    
    // Set date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const fromDateEl = document.getElementById('reportFromDate');
    const toDateEl = document.getElementById('reportToDate');
    
    if (fromDateEl && toDateEl) {
        fromDateEl.value = thirtyDaysAgo.toISOString().split('T')[0];
        toDateEl.value = today.toISOString().split('T')[0];
        console.log(`📅 Date range: ${fromDateEl.value} to ${toDateEl.value}`);
    }
    
    // Load PSS filter
    await loadPSSFilterOptions();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup format tabs
    setupFormatTabs();
    
    // Load initial data
    await generateReportPreview();
    
    // Auto-refresh every 30 seconds
    startAutoRefresh();
    
    console.log('✅ Reports module initialized');
}

// Load PSS stations for filter
async function loadPSSFilterOptions() {
    try {
        console.log('📡 Loading PSS stations...');
        const snapshot = await db.collection('daily_entries').get();
        const pssSet = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.pssStation) {
                pssSet.add(data.pssStation);
            }
        });
        
        const filterEl = document.getElementById('reportPSSFilter');
        if (filterEl) {
            filterEl.innerHTML = '<option value="">All PSS Stations</option>';
            Array.from(pssSet).sort().forEach(pss => {
                const opt = document.createElement('option');
                opt.value = pss;
                opt.textContent = pss;
                filterEl.appendChild(opt);
            });
            console.log(`✅ Loaded ${pssSet.size} PSS stations`);
        }
    } catch (error) {
        console.error('❌ Error loading PSS stations:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    const fromDate = document.getElementById('reportFromDate');
    const toDate = document.getElementById('reportToDate');
    const pssFilter = document.getElementById('reportPSSFilter');
    const monthlyTab = document.getElementById('monthlyFormatTab');
    const dailyTab = document.getElementById('dailyFormatTab');
    const exportMonthly = document.getElementById('exportMonthlyBtn');
    const exportDaily = document.getElementById('exportDailyBtn');
    
    if (fromDate) fromDate.addEventListener('change', () => {
        console.log('📅 Date changed');
        generateReportPreview();
    });
    
    if (toDate) toDate.addEventListener('change', () => {
        console.log('📅 Date changed');
        generateReportPreview();
    });
    
    if (pssFilter) pssFilter.addEventListener('change', () => {
        console.log('🏢 PSS filter changed');
        generateReportPreview();
    });
    
    if (monthlyTab) monthlyTab.addEventListener('click', () => switchReportFormat('monthly'));
    if (dailyTab) dailyTab.addEventListener('click', () => switchReportFormat('daily'));
    if (exportMonthly) exportMonthly.addEventListener('click', exportMonthlyReport);
    if (exportDaily) exportDaily.addEventListener('click', exportDailyReport);
    
    console.log('✅ Event listeners attached');
}

// Setup format tabs
function setupFormatTabs() {
    const monthlyTab = document.getElementById('monthlyFormatTab');
    const dailyTab = document.getElementById('dailyFormatTab');
    const monthlyPreview = document.getElementById('monthlyPreview');
    const dailyPreview = document.getElementById('dailyPreview');
    
    if (monthlyTab) monthlyTab.classList.add('active');
    if (dailyTab) dailyTab.classList.remove('active');
    if (monthlyPreview) monthlyPreview.style.display = 'block';
    if (dailyPreview) dailyPreview.style.display = 'none';
}

// Switch report format
function switchReportFormat(format) {
    currentReportFormat = format;
    console.log(`📊 Switched to ${format} format`);
    
    const monthlyTab = document.getElementById('monthlyFormatTab');
    const dailyTab = document.getElementById('dailyFormatTab');
    const monthlyPreview = document.getElementById('monthlyPreview');
    const dailyPreview = document.getElementById('dailyPreview');
    
    if (format === 'monthly') {
        if (monthlyTab) monthlyTab.classList.add('active');
        if (dailyTab) dailyTab.classList.remove('active');
        if (monthlyPreview) monthlyPreview.style.display = 'block';
        if (dailyPreview) dailyPreview.style.display = 'none';
        generateMonthlyPreview();
    } else {
        if (monthlyTab) monthlyTab.classList.remove('active');
        if (dailyTab) dailyTab.classList.add('active');
        if (monthlyPreview) monthlyPreview.style.display = 'none';
        if (dailyPreview) dailyPreview.style.display = 'block';
        generateDailyPreview();
    }
}

// Generate report preview
async function generateReportPreview() {
    console.log('🚀 Generating report preview...');
    
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
        console.log('⏳ Dates not set');
        return;
    }
    
    try {
        console.log(`📡 Fetching data: ${fromDate} to ${toDate}${pssFilter ? ` (PSS: ${pssFilter})` : ''}`);
        
        // Fetch all data
        const snapshot = await db.collection('daily_entries').get();
        allReportData = [];
        
        console.log(`📦 Got ${snapshot.size} total documents`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            let entryDate;
            
            // Parse date
            if (data.date && data.date.toDate) {
                entryDate = data.date.toDate();
            } else if (data.date) {
                entryDate = new Date(data.date);
            } else {
                return;
            }
            
            const dateStr = entryDate.toISOString().split('T')[0];
            
            // Filter by date range
            if (dateStr < fromDate || dateStr > toDate) return;
            
            // Filter by PSS
            if (pssFilter && data.pssStation !== pssFilter) return;
            
            allReportData.push({
                id: doc.id,
                ...data,
                dateObj: entryDate
            });
        });
        
        // Sort by date
        allReportData.sort((a, b) => a.dateObj - b.dateObj);
        
        console.log(`✅ Filtered to ${allReportData.length} entries`);
        
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
        showError('Error loading data: ' + error.message);
    }
}

// Generate Monthly Loading Details
function generateMonthlyPreview() {
    console.log('📊 Generating Monthly Loading Details...');
    
    const tbody = document.getElementById('monthlyReportBody');
    if (!tbody) {
        console.error('❌ monthlyReportBody not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (allReportData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="18" style="padding: 2rem; text-align: center; color: #94a3b8;">
                    No data found for selected date range
                </td>
            </tr>
        `;
        return;
    }
    
    let rowCount = 0;
    
    // Generate rows for each entry and feeder
    allReportData.forEach(entry => {
        const date = entry.dateObj.toLocaleDateString('en-GB');
        const circle = entry.circle || 'RKL';
        const division = entry.division || 'SED';
        const pss = entry.pssStation || '';
        
        const feeders = entry.feeders || {};
        const feederKeys = Object.keys(feeders).sort();
        
        feederKeys.forEach(feederKey => {
            const feeder = feeders[feederKey];
            
            const row = tbody.insertRow();
            row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            
            // Format cells
            const cells = [
                date,
                circle,
                division,
                pss,
                feeder.name || '',
                feeder.ptrNo || '',
                feeder.maxVoltage || '',
                feeder.maxVoltageDate || '',
                feeder.maxVoltageTime || '',
                feeder.minVoltage || '',
                feeder.minVoltageDate || '',
                feeder.minVoltageTime || '',
                feeder.maxLoad || '',
                feeder.maxLoadDate || '',
                feeder.maxLoadTime || '',
                feeder.minLoad || '',
                feeder.minLoadDate || '',
                feeder.minLoadTime || ''
            ];
            
            cells.forEach((value, index) => {
                const cell = row.insertCell();
                cell.textContent = value;
                cell.style.padding = '10px 8px';
                cell.style.whiteSpace = 'nowrap';
                
                // Highlight important columns
                if (index === 3) { // PSS
                    cell.style.fontWeight = '600';
                    cell.style.color = '#60a5fa';
                } else if (index === 4) { // Equipment
                    cell.style.fontWeight = '600';
                    cell.style.color = '#34d399';
                }
            });
            
            rowCount++;
        });
    });
    
    console.log(`✅ Generated ${rowCount} rows`);
}

// Generate Daily Loading Summary
function generateDailyPreview() {
    console.log('📊 Generating Daily Loading Summary...');
    
    const tbody = document.getElementById('dailyReportBody');
    if (!tbody) {
        console.error('❌ dailyReportBody not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (allReportData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 2rem; text-align: center; color: #94a3b8;">
                    No data found for selected date range
                </td>
            </tr>
        `;
        return;
    }
    
    // Group by PSS
    const pssList = [...new Set(allReportData.map(e => e.pssStation))].sort();
    
    pssList.forEach(pss => {
        const row = tbody.insertRow();
        row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        const cell = row.insertCell();
        cell.textContent = pss;
        cell.style.padding = '12px 8px';
        cell.style.fontWeight = '600';
        cell.style.color = '#60a5fa';
        cell.colSpan = 3;
    });
    
    console.log(`✅ Generated ${pssList.length} PSS entries`);
}

// Update statistics
function updateReportStatistics() {
    const totalEntries = allReportData.length;
    const pssCount = new Set(allReportData.map(e => e.pssStation)).size;
    let totalFeeders = 0;
    
    allReportData.forEach(entry => {
        const feeders = entry.feeders || {};
        totalFeeders += Object.keys(feeders).length;
    });
    
    // Update UI (if stats elements exist)
    const statsEntries = document.getElementById('statsEntries');
    const statsPSS = document.getElementById('statsPSS');
    const statsFeeders = document.getElementById('statsFeeders');
    
    if (statsEntries) statsEntries.textContent = totalEntries;
    if (statsPSS) statsPSS.textContent = pssCount;
    if (statsFeeders) statsFeeders.textContent = totalFeeders;
}

// Export Monthly Report to Excel
function exportMonthlyReport() {
    console.log('📥 Exporting Monthly Loading Details...');
    
    if (allReportData.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No data to export', 'warning');
        }
        return;
    }
    
    const data = [['Date', 'Circle', 'Division', 'PSS', 'Equipment', 'PTR No.', 
                   'Max V (kV)', 'Date', 'Time',
                   'Min V (kV)', 'Date', 'Time',
                   'Max I (A)', 'Date', 'Time',
                   'Min I (A)', 'Date', 'Time']];
    
    allReportData.forEach(entry => {
        const date = entry.dateObj.toLocaleDateString('en-GB');
        const circle = entry.circle || 'RKL';
        const division = entry.division || 'SED';
        const pss = entry.pssStation || '';
        
        const feeders = entry.feeders || {};
        Object.keys(feeders).sort().forEach(feederKey => {
            const f = feeders[feederKey];
            data.push([
                date, circle, division, pss, f.name || '', f.ptrNo || '',
                f.maxVoltage || '', f.maxVoltageDate || '', f.maxVoltageTime || '',
                f.minVoltage || '', f.minVoltageDate || '', f.minVoltageTime || '',
                f.maxLoad || '', f.maxLoadDate || '', f.maxLoadTime || '',
                f.minLoad || '', f.minLoadDate || '', f.minLoadTime || ''
            ]);
        });
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Loading Details');
    XLSX.writeFile(wb, 'Monthly_Loading_Details.xlsx');
    
    if (typeof showToast === 'function') {
        showToast('Monthly report exported successfully!', 'success');
    }
    console.log('✅ Export complete');
}

// Export Daily Report to Excel
function exportDailyReport() {
    console.log('📥 Exporting Daily Loading Summary...');
    
    if (allReportData.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No data to export', 'warning');
        }
        return;
    }
    
    const pssList = [...new Set(allReportData.map(e => e.pssStation))].sort();
    const data = [['PSS Station']];
    pssList.forEach(pss => data.push([pss]));
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Loading Summary');
    XLSX.writeFile(wb, 'Daily_Loading_Summary.xlsx');
    
    if (typeof showToast === 'function') {
        showToast('Daily report exported successfully!', 'success');
    }
    console.log('✅ Export complete');
}

// Auto-refresh data every 30 seconds
function startAutoRefresh() {
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
    }
    
    dataRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing data...');
        await generateReportPreview();
    }, 30000); // 30 seconds
    
    console.log('✅ Auto-refresh enabled (30s interval)');
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = null;
        console.log('⏸️ Auto-refresh disabled');
    }
}

// Show error message
function showError(message) {
    const tbody = document.getElementById('monthlyReportBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="18" style="padding: 2rem; text-align: center; color: #ef4444;">
                    ${message}<br>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
                        Refresh Page
                    </button>
                </td>
            </tr>
        `;
    }
}

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
