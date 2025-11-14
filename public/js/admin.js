// ============================================
// ADMIN DASHBOARD - COMPLETE LOGIC
// 5 Windows: Overview | Upload | View | Analytics | Settings
// ============================================

// Global admin state
const adminState = {
    currentWindow: 'overview',
    currentPage: 1,
    rowsPerPage: 25,
    allSubmissions: [],
    filteredSubmissions: [],
    users: [],
    pssStations: [],
    charts: {}
};

// ============================================
// INITIALIZE ADMIN DASHBOARD
// ============================================

async function loadAdminDashboard() {
    console.log('Loading admin dashboard...');
    
    // Show admin dashboard screen first
    showScreen('adminDashboard');
    
    // Load initial data - IMPORTANT: Load submissions first
    await loadAllSubmissions();
    
    // Then load other data
    await Promise.all([
        loadAdminData(),
        loadUsers(),
        loadPSSStations()
    ]);
    
    // Setup event listeners
    setupAdminEventListeners();
    
    // Load default window (Overview) - data is already loaded
    showAdminWindow('overview');
    
    // Start real-time listeners
    startRealTimeListeners();
    
    // DISABLED auto-refresh to prevent lag - data updates via real-time listeners only
    // setInterval(() => {
    //     if (adminState.currentWindow === 'overview') {
    //         updateOverviewStats();
    //     }
    // }, 60000);
}

// ============================================
// LOAD ADMIN DATA
// ============================================

async function loadAdminData() {
    try {
        // Get current admin info
        const adminDoc = await db.collection('users')
            .doc(appState.currentUser.phoneNumber)
            .get();
        
        if (adminDoc.exists) {
            appState.currentUser = { ...appState.currentUser, ...adminDoc.data() };
            
            // Update header (skip if elements don't exist yet)
            const adminNameEl = document.querySelector('.admin-user-name');
            const adminRoleEl = document.querySelector('.admin-user-role');
            if (adminNameEl) adminNameEl.textContent = appState.currentUser.name;
            if (adminRoleEl) adminRoleEl.textContent = 'Administrator';
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        adminState.users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadPSSStations() {
    try {
        const pssSnapshot = await db.collection('pss_stations').get();
        adminState.pssStations = pssSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading PSS stations:', error);
    }
}

async function loadSubmissions() {
    try {
        const submissionsSnapshot = await db.collection('daily_entries')
            .orderBy('timestamp', 'desc')
            .limit(500)
            .get();
        
        adminState.allSubmissions = submissionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        adminState.filteredSubmissions = [...adminState.allSubmissions];
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================

function setupAdminEventListeners() {
    // Tab navigation
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const window = tab.dataset.tab || tab.dataset.window;
            showAdminWindow(window);
        });
    });
    
    // Logout button
    document.querySelector('.btn-logout').addEventListener('click', logout);
    
    // Upload window events
    setupUploadEvents();
    
    // View window events
    setupViewEvents();
    
    // Analytics window events
    setupAnalyticsEvents();
    
    // Settings window events
    setupSettingsEvents();
}

// ============================================
// WINDOW NAVIGATION
// ============================================

function showAdminWindow(windowName) {
    adminState.currentWindow = windowName;
    
    // Update tabs - use data-tab attribute which matches the HTML
    document.querySelectorAll('.admin-tab').forEach(tab => {
        const tabName = tab.dataset.tab || tab.dataset.window;
        tab.classList.toggle('active', tabName === windowName);
    });
    
    // Update tab content - show matching tab, hide others
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Map window name to tab ID (e.g. 'overview' -> 'overviewTab')
    let tabId = '';
    if (windowName === 'analytics') {
        tabId = 'analyticsTab';
    } else if (windowName === 'ai-assistant') {
        tabId = 'ai-assistantTab';
    } else {
        tabId = windowName + 'Tab';
    }
    
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Load window content
    switch(windowName) {
        case 'overview':
            loadOverviewWindow();
            break;
        case 'upload':
            loadUploadWindow();
            break;
        case 'view':
            loadViewWindow();
            break;
        case 'analytics':
            loadAnalyticsWindow();
            break;
        case 'settings':
            loadSettingsWindow();
            break;
    }
}

// ============================================
// WINDOW 1: OVERVIEW DASHBOARD
// ============================================

async function loadOverviewWindow() {
    console.log('Loading overview window...');
    
    // Load data first if not loaded
    if (allSubmissionsData.length === 0) {
        await loadAllSubmissions();
    }
    
    // Update stats after data is loaded
    await updateOverviewStats();
    
    // Display table data
    displayFilteredData(allSubmissionsData);
}

async function updateOverviewStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Count unique users
        const uniqueUsers = new Set(allSubmissionsData.map(s => s.phoneNumber)).size;
        
        // Count unique PSS stations
        const uniquePSS = new Set(allSubmissionsData.map(s => s.pssStation)).size;
        
        // Total entries
        const totalEntries = allSubmissionsData.length;
        
        // Today's entries
        const todayEntries = allSubmissionsData.filter(s => s.date === today).length;
        
        // Update stat cards
        const totalUsersEl = document.getElementById('totalUsersCount');
        const totalPSSEl = document.getElementById('totalPSSCount');
        const totalEntriesEl = document.getElementById('totalEntriesCount');
        const todayEntriesEl = document.getElementById('todayEntriesCount');
        
        if (totalUsersEl) totalUsersEl.textContent = uniqueUsers;
        if (totalPSSEl) totalPSSEl.textContent = uniquePSS;
        if (totalEntriesEl) totalEntriesEl.textContent = totalEntries;
        if (todayEntriesEl) todayEntriesEl.textContent = todayEntries;
        
        console.log(`📊 Overview Stats Updated: ${uniqueUsers} users, ${uniquePSS} PSS, ${totalEntries} entries, ${todayEntries} today`);
        
    } catch (error) {
        console.error('Error updating overview stats:', error);
    }
}

function updateStatCard(cardId, value, trend) {
    const card = document.querySelector(`[data-stat="${cardId}"]`);
    if (card) {
        card.querySelector('.stat-value').textContent = value;
        const trendEl = card.querySelector('.stat-trend');
        if (trendEl && trend) {
            trendEl.textContent = trend;
            trendEl.classList.toggle('up', trend.startsWith('+'));
            trendEl.classList.toggle('down', trend.startsWith('-'));
        }
    }
}

function renderPeakMinCards(peakMinData) {
    const container = document.getElementById('peak-min-container');
    if (!container) return;
    
    container.innerHTML = peakMinData.map(pss => `
        <div class="peak-min-card">
            <h4 class="pss-name">${pss.name}</h4>
            <div class="amp-values">
                <div class="amp-item">
                    <p class="amp-type">Peak AMP</p>
                    <p class="amp-value peak">${pss.peakAMP.toFixed(2)}</p>
                    <p class="amp-time">${pss.peakTime}</p>
                </div>
                <div class="amp-item">
                    <p class="amp-type">Min AMP</p>
                    <p class="amp-value min">${pss.minAMP.toFixed(2)}</p>
                    <p class="amp-time">${pss.minTime}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function loadRecentActivity() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;
    
    const recentSubmissions = adminState.allSubmissions.slice(0, 10);
    
    activityList.innerHTML = recentSubmissions.map(submission => {
        const user = adminState.users.find(u => u.phoneNumber === submission.phoneNumber);
        const userName = user ? user.name : 'Unknown User';
        const timeAgo = getTimeAgo(submission.timestamp);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">📊</div>
                <div class="activity-details">
                    <p class="activity-text">${userName} submitted data for ${submission.pssStation}</p>
                    <p class="activity-time">${timeAgo}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// WINDOW 2: UPLOAD EXCEL
// ============================================

function setupUploadEvents() {
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('excel-file-input');
    const uploadBtn = document.getElementById('btn-upload-file');
    
    if (uploadBox && fileInput) {
        // Click to upload
        uploadBox.addEventListener('click', () => fileInput.click());
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        // Drag & drop
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('dragover');
        });
        
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('dragover');
        });
        
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleExcelUpload(files[0]);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleExcelUpload(e.target.files[0]);
            }
        });
    }
    
    // Upload options
    document.querySelectorAll('.upload-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.upload-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input[type="radio"]').checked = true;
        });
    });
}

function loadUploadWindow() {
    console.log('Upload window loaded');
}

// ============================================
// WINDOW 3: VIEW DATA TABLE
// ============================================

function setupViewEvents() {
    // Search
    const searchInput = document.getElementById('search-data');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            filterData(e.target.value);
        }, 300));
    }
    
    // Filters
    document.getElementById('filter-pss')?.addEventListener('change', applyFilters);
    document.getElementById('filter-date')?.addEventListener('change', applyFilters);
    document.getElementById('filter-user')?.addEventListener('change', applyFilters);
    
    // Pagination
    document.getElementById('btn-first-page')?.addEventListener('click', () => goToPage(1));
    document.getElementById('btn-prev-page')?.addEventListener('click', () => goToPage(adminState.currentPage - 1));
    document.getElementById('btn-next-page')?.addEventListener('click', () => goToPage(adminState.currentPage + 1));
    document.getElementById('btn-last-page')?.addEventListener('click', () => goToPage(Math.ceil(adminState.filteredSubmissions.length / adminState.rowsPerPage)));
}

function loadViewWindow() {
    populateFilterDropdowns();
    renderDataTable();
}

function populateFilterDropdowns() {
    // PSS Filter
    const pssFilter = document.getElementById('filter-pss');
    if (pssFilter) {
        pssFilter.innerHTML = '<option value="">All PSS Stations</option>' +
            adminState.pssStations.map(pss => `<option value="${pss.id}">${pss.name}</option>`).join('');
    }
    
    // User Filter
    const userFilter = document.getElementById('filter-user');
    if (userFilter) {
        userFilter.innerHTML = '<option value="">All Users</option>' +
            adminState.users.map(user => `<option value="${user.phoneNumber}">${user.name}</option>`).join('');
    }
}

function filterData(searchTerm) {
    adminState.filteredSubmissions = adminState.allSubmissions.filter(submission => {
        return submission.pssStation.toLowerCase().includes(searchTerm.toLowerCase()) ||
               submission.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               submission.date.includes(searchTerm);
    });
    adminState.currentPage = 1;
    renderDataTable();
}

function applyFilters() {
    const pssFilter = document.getElementById('filter-pss')?.value || '';
    const dateFilter = document.getElementById('filter-date')?.value || '';
    const userFilter = document.getElementById('filter-user')?.value || '';
    
    adminState.filteredSubmissions = adminState.allSubmissions.filter(submission => {
        const matchesPSS = !pssFilter || submission.pssStation === pssFilter;
        const matchesDate = !dateFilter || submission.date === dateFilter;
        const matchesUser = !userFilter || submission.phoneNumber === userFilter;
        return matchesPSS && matchesDate && matchesUser;
    });
    
    adminState.currentPage = 1;
    renderDataTable();
}

function renderDataTable() {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody) return;
    
    const startIndex = (adminState.currentPage - 1) * adminState.rowsPerPage;
    const endIndex = startIndex + adminState.rowsPerPage;
    const pageData = adminState.filteredSubmissions.slice(startIndex, endIndex);
    
    tableBody.innerHTML = pageData.map(submission => {
        const user = adminState.users.find(u => u.phoneNumber === submission.phoneNumber);
        const userName = user ? user.name : 'Unknown';
        
        return `
            <tr>
                <td>${formatDate(submission.date)}</td>
                <td>${submission.pssStation}</td>
                <td>${submission.personnelName}</td>
                <td>${userName}</td>
                <td>${formatTimestamp(submission.timestamp)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table-action btn-view" onclick="viewSubmission('${submission.id}')">
                            👁️ View
                        </button>
                        <button class="btn-table-action btn-edit" onclick="editSubmission('${submission.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-table-action btn-delete" onclick="deleteSubmission('${submission.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(adminState.filteredSubmissions.length / adminState.rowsPerPage);
    const paginationInfo = document.getElementById('pagination-info');
    
    if (paginationInfo) {
        const startIndex = (adminState.currentPage - 1) * adminState.rowsPerPage + 1;
        const endIndex = Math.min(adminState.currentPage * adminState.rowsPerPage, adminState.filteredSubmissions.length);
        paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${adminState.filteredSubmissions.length} entries`;
    }
    
    // Update buttons
    document.getElementById('btn-first-page')?.toggleAttribute('disabled', adminState.currentPage === 1);
    document.getElementById('btn-prev-page')?.toggleAttribute('disabled', adminState.currentPage === 1);
    document.getElementById('btn-next-page')?.toggleAttribute('disabled', adminState.currentPage === totalPages);
    document.getElementById('btn-last-page')?.toggleAttribute('disabled', adminState.currentPage === totalPages);
}

function goToPage(page) {
    const totalPages = Math.ceil(adminState.filteredSubmissions.length / adminState.rowsPerPage);
    if (page >= 1 && page <= totalPages) {
        adminState.currentPage = page;
        renderDataTable();
    }
}

// ============================================
// DATA ACTIONS
// ============================================

async function viewSubmission(submissionId) {
    const submission = adminState.allSubmissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    // TODO: Show modal with full submission details
    alert(`Viewing submission for ${submission.pssStation} on ${submission.date}\n\nFull details modal coming soon!`);
}

async function editSubmission(submissionId) {
    const submission = adminState.allSubmissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    // TODO: Open form with submission data
    alert(`Editing submission for ${submission.pssStation}\n\nEdit functionality coming soon!`);
}

async function deleteSubmission(submissionId) {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
        return;
    }
    
    try {
        await db.collection('daily_entries').doc(submissionId).delete();
        
        // Remove from state
        adminState.allSubmissions = adminState.allSubmissions.filter(s => s.id !== submissionId);
        adminState.filteredSubmissions = adminState.filteredSubmissions.filter(s => s.id !== submissionId);
        
        // Refresh table
        renderDataTable();
        
        // Log activity
        await logAdminAction('delete_submission', { submissionId });
        
        alert('Submission deleted successfully!');
    } catch (error) {
        console.error('Error deleting submission:', error);
        alert('Error deleting submission. Please try again.');
    }
}

// ============================================
// WINDOW 4: ANALYTICS & CHARTS
// ============================================

function setupAnalyticsEvents() {
    // Date range selector
    document.getElementById('analytics-date-from')?.addEventListener('change', loadAnalyticsWindow);
    document.getElementById('analytics-date-to')?.addEventListener('change', loadAnalyticsWindow);
    
    // Export buttons
    document.getElementById('btn-export-pdf')?.addEventListener('click', exportAnalyticsPDF);
    document.getElementById('btn-export-excel')?.addEventListener('click', exportAnalyticsExcel);
}

async function loadAnalyticsWindow() {
    console.log('🎯 Loading NEW Comprehensive Analytics Dashboard...');
    
    if (allSubmissionsData.length === 0) {
        await loadAllSubmissions();
    }
    
    // Use new comprehensive dashboard if available
    if (typeof renderAllNewAnalytics === 'function') {
        console.log('✅ Using NEW dashboard with all sections and KPIs');
        await renderAllNewAnalytics(allSubmissionsData);
    } else {
        console.warn('⚠️ New dashboard not loaded, using legacy charts');
        // Fallback to old charts
        renderICLoadChart();
        renderICVoltageChart();
        renderPTR33LoadChart();
        renderPTR11LoadChart();
        renderFeederLoadChart();
        renderFeederVoltageChart();
        renderPeakTimeChart();
        renderDailyLoadTrendChart();
        renderVoltageComplianceChart();
        renderPSSComparisonChart();
        renderSummaryStats();
    }
}

function refreshAnalytics() {
    loadAnalyticsWindow();
}

// ============================================
// I/C LOAD ANALYSIS (Peak vs Min)
// ============================================
function renderICLoadChart() {
    const canvas = document.getElementById('icLoadChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect I/C data by date
    const dateData = {};
    allSubmissionsData.forEach(entry => {
        const date = entry.date;
        if (!dateData[date]) {
            dateData[date] = { ic1Max: [], ic1Min: [], ic2Max: [], ic2Min: [] };
        }
        
        if (entry.ic1) {
            dateData[date].ic1Max.push(parseFloat(entry.ic1.maxLoad || 0));
            dateData[date].ic1Min.push(parseFloat(entry.ic1.minLoad || 0));
        }
        if (entry.ic2) {
            dateData[date].ic2Max.push(parseFloat(entry.ic2.maxLoad || 0));
            dateData[date].ic2Min.push(parseFloat(entry.ic2.minLoad || 0));
        }
    });
    
    // Get last 7 days
    const dates = Object.keys(dateData).sort().slice(-7);
    const ic1MaxAvg = dates.map(d => dateData[d].ic1Max.length > 0 ? dateData[d].ic1Max.reduce((a,b) => a+b, 0) / dateData[d].ic1Max.length : 0);
    const ic1MinAvg = dates.map(d => dateData[d].ic1Min.length > 0 ? dateData[d].ic1Min.reduce((a,b) => a+b, 0) / dateData[d].ic1Min.length : 0);
    const ic2MaxAvg = dates.map(d => dateData[d].ic2Max.length > 0 ? dateData[d].ic2Max.reduce((a,b) => a+b, 0) / dateData[d].ic2Max.length : 0);
    const ic2MinAvg = dates.map(d => dateData[d].ic2Min.length > 0 ? dateData[d].ic2Min.reduce((a,b) => a+b, 0) / dateData[d].ic2Min.length : 0);
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No I/C data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Chart dimensions
    const padding = { top: 50, right: 80, bottom: 60, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Find max value for scaling
    const allValues = [...ic1MaxAvg, ...ic2MaxAvg, ...ic1MinAvg, ...ic2MinAvg];
    const maxValue = Math.max(...allValues, 100);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'A', padding.left - 10, y + 4);
    }
    
    // Draw lines
    const datasets = [
        { data: ic1MaxAvg, color: '#ef4444', label: 'I/C-1 Peak', dash: [] },
        { data: ic1MinAvg, color: '#fca5a5', label: 'I/C-1 Min', dash: [5, 5] },
        { data: ic2MaxAvg, color: '#dc2626', label: 'I/C-2 Peak', dash: [] },
        { data: ic2MinAvg, color: '#f87171', label: 'I/C-2 Min', dash: [5, 5] }
    ];
    
    datasets.forEach(dataset => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 3;
        ctx.setLineDash(dataset.dash);
        ctx.beginPath();
        
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw points
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            ctx.fillStyle = dataset.color;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    });
    
    // Draw X-axis labels
    dates.forEach((date, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(date.slice(5), 0, 0);
        ctx.restore();
    });
    
    // Draw legend
    let legendX = canvas.width - padding.right + 10;
    let legendY = padding.top;
    datasets.forEach((dataset, i) => {
        const y = legendY + i * 25;
        
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 3;
        ctx.setLineDash(dataset.dash);
        ctx.beginPath();
        ctx.moveTo(legendX, y);
        ctx.lineTo(legendX + 30, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + 35, y + 4);
    });
    
    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('I/C Load Comparison', padding.left, 20);
    
    // Y-axis label
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Load (Amps)', 0, 0);
    ctx.restore();
}

// ============================================
// I/C VOLTAGE ANALYSIS
// ============================================
function renderICVoltageChart() {
    const canvas = document.getElementById('icVoltageChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect voltage data
    const dateData = {};
    allSubmissionsData.forEach(entry => {
        const date = entry.date;
        if (!dateData[date]) {
            dateData[date] = { ic1Max: [], ic1Min: [], ic2Max: [], ic2Min: [] };
        }
        
        if (entry.ic1) {
            dateData[date].ic1Max.push(parseFloat(entry.ic1.maxVoltage || 0));
            dateData[date].ic1Min.push(parseFloat(entry.ic1.minVoltage || 0));
        }
        if (entry.ic2) {
            dateData[date].ic2Max.push(parseFloat(entry.ic2.maxVoltage || 0));
            dateData[date].ic2Min.push(parseFloat(entry.ic2.minVoltage || 0));
        }
    });
    
    const dates = Object.keys(dateData).sort().slice(-7);
    const ic1MaxAvg = dates.map(d => dateData[d].ic1Max.length > 0 ? dateData[d].ic1Max.reduce((a,b) => a+b, 0) / dateData[d].ic1Max.length : 0);
    const ic1MinAvg = dates.map(d => dateData[d].ic1Min.length > 0 ? dateData[d].ic1Min.reduce((a,b) => a+b, 0) / dateData[d].ic1Min.length : 0);
    const ic2MaxAvg = dates.map(d => dateData[d].ic2Max.length > 0 ? dateData[d].ic2Max.reduce((a,b) => a+b, 0) / dateData[d].ic2Max.length : 0);
    const ic2MinAvg = dates.map(d => dateData[d].ic2Min.length > 0 ? dateData[d].ic2Min.reduce((a,b) => a+b, 0) / dateData[d].ic2Min.length : 0);
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No voltage data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 80, bottom: 60, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    const nominalVoltage = 33;
    const minScale = 30;
    const maxScale = 36;
    
    // Draw nominal voltage line
    const nominalY = padding.top + chartHeight - ((nominalVoltage - minScale) / (maxScale - minScale)) * chartHeight;
    ctx.strokeStyle = 'rgba(16,185,129,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, nominalY);
    ctx.lineTo(canvas.width - padding.right, nominalY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#10b981';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText('Nominal 33kV', canvas.width - padding.right - 5, nominalY - 5);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
        const y = padding.top + (chartHeight / 6) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        const value = (maxScale - (maxScale - minScale) / 6 * i).toFixed(1);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'kV', padding.left - 10, y + 4);
    }
    
    // Draw voltage lines
    const datasets = [
        { data: ic1MaxAvg, color: '#ef4444', label: 'I/C-1 Max' },
        { data: ic1MinAvg, color: '#93c5fd', label: 'I/C-1 Min' },
        { data: ic2MaxAvg, color: '#f59e0b', label: 'I/C-2 Max' },
        { data: ic2MinAvg, color: '#67e8f9', label: 'I/C-2 Min' }
    ];
    
    datasets.forEach(dataset => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - ((value - minScale) / (maxScale - minScale)) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Points
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - ((value - minScale) / (maxScale - minScale)) * chartHeight;
            
            ctx.fillStyle = dataset.color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
    
    // X-axis labels
    dates.forEach((date, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(date.slice(5), 0, 0);
        ctx.restore();
    });
    
    // Legend
    let legendX = canvas.width - padding.right + 10;
    datasets.forEach((dataset, i) => {
        const y = padding.top + i * 20;
        
        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(legendX, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '9px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + 10, y + 3);
    });
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('I/C Voltage Levels', padding.left, 20);
}

// ============================================
// PTR 33kV LOAD ANALYSIS
// ============================================
function renderPTR33LoadChart() {
    const canvas = document.getElementById('ptr33LoadChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect PTR 33kV data
    const dateData = {};
    allSubmissionsData.forEach(entry => {
        const date = entry.date;
        if (!dateData[date]) {
            dateData[date] = { ptr1Max: [], ptr1Min: [], ptr2Max: [], ptr2Min: [] };
        }
        
        if (entry.ptr1_33kv) {
            dateData[date].ptr1Max.push(parseFloat(entry.ptr1_33kv.maxLoad || 0));
            dateData[date].ptr1Min.push(parseFloat(entry.ptr1_33kv.minLoad || 0));
        }
        if (entry.ptr2_33kv) {
            dateData[date].ptr2Max.push(parseFloat(entry.ptr2_33kv.maxLoad || 0));
            dateData[date].ptr2Min.push(parseFloat(entry.ptr2_33kv.minLoad || 0));
        }
    });
    
    const dates = Object.keys(dateData).sort().slice(-7);
    const ptr1MaxAvg = dates.map(d => dateData[d].ptr1Max.length > 0 ? dateData[d].ptr1Max.reduce((a,b) => a+b, 0) / dateData[d].ptr1Max.length : 0);
    const ptr1MinAvg = dates.map(d => dateData[d].ptr1Min.length > 0 ? dateData[d].ptr1Min.reduce((a,b) => a+b, 0) / dateData[d].ptr1Min.length : 0);
    const ptr2MaxAvg = dates.map(d => dateData[d].ptr2Max.length > 0 ? dateData[d].ptr2Max.reduce((a,b) => a+b, 0) / dateData[d].ptr2Max.length : 0);
    const ptr2MinAvg = dates.map(d => dateData[d].ptr2Min.length > 0 ? dateData[d].ptr2Min.reduce((a,b) => a+b, 0) / dateData[d].ptr2Min.length : 0);
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No PTR 33kV data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 80, bottom: 60, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    const allValues = [...ptr1MaxAvg, ...ptr2MaxAvg, ...ptr1MinAvg, ...ptr2MinAvg];
    const maxValue = Math.max(...allValues, 100);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'A', padding.left - 10, y + 4);
    }
    
    // Lines
    const datasets = [
        { data: ptr1MaxAvg, color: '#10b981', label: 'PTR-1 Peak', dash: [] },
        { data: ptr1MinAvg, color: '#86efac', label: 'PTR-1 Min', dash: [5, 5] },
        { data: ptr2MaxAvg, color: '#059669', label: 'PTR-2 Peak', dash: [] },
        { data: ptr2MinAvg, color: '#6ee7b7', label: 'PTR-2 Min', dash: [5, 5] }
    ];
    
    datasets.forEach(dataset => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 3;
        ctx.setLineDash(dataset.dash);
        ctx.beginPath();
        
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            ctx.fillStyle = dataset.color;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    });
    
    // X-axis
    dates.forEach((date, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(date.slice(5), 0, 0);
        ctx.restore();
    });
    
    // Legend
    let legendX = canvas.width - padding.right + 10;
    datasets.forEach((dataset, i) => {
        const y = padding.top + i * 25;
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 3;
        ctx.setLineDash(dataset.dash);
        ctx.beginPath();
        ctx.moveTo(legendX, y);
        ctx.lineTo(legendX + 30, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + 35, y + 4);
    });
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('PTR 33kV Load', padding.left, 20);
}

// ============================================
// PTR 11kV LOAD ANALYSIS
// ============================================
function renderPTR11LoadChart() {
    const canvas = document.getElementById('ptr11LoadChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect PTR 11kV data
    const dateData = {};
    allSubmissionsData.forEach(entry => {
        const date = entry.date;
        if (!dateData[date]) {
            dateData[date] = { ptr1Max: [], ptr1Min: [], ptr2Max: [], ptr2Min: [] };
        }
        
        if (entry.ptr1_11kv) {
            dateData[date].ptr1Max.push(parseFloat(entry.ptr1_11kv.maxLoad || 0));
            dateData[date].ptr1Min.push(parseFloat(entry.ptr1_11kv.minLoad || 0));
        }
        if (entry.ptr2_11kv) {
            dateData[date].ptr2Max.push(parseFloat(entry.ptr2_11kv.maxLoad || 0));
            dateData[date].ptr2Min.push(parseFloat(entry.ptr2_11kv.minLoad || 0));
        }
    });
    
    const dates = Object.keys(dateData).sort().slice(-7);
    const ptr1MaxAvg = dates.map(d => dateData[d].ptr1Max.length > 0 ? dateData[d].ptr1Max.reduce((a,b) => a+b, 0) / dateData[d].ptr1Max.length : 0);
    const ptr1MinAvg = dates.map(d => dateData[d].ptr1Min.length > 0 ? dateData[d].ptr1Min.reduce((a,b) => a+b, 0) / dateData[d].ptr1Min.length : 0);
    const ptr2MaxAvg = dates.map(d => dateData[d].ptr2Max.length > 0 ? dateData[d].ptr2Max.reduce((a,b) => a+b, 0) / dateData[d].ptr2Max.length : 0);
    const ptr2MinAvg = dates.map(d => dateData[d].ptr2Min.length > 0 ? dateData[d].ptr2Min.reduce((a,b) => a+b, 0) / dateData[d].ptr2Min.length : 0);
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No PTR 11kV data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 80, bottom: 60, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    const allValues = [...ptr1MaxAvg, ...ptr2MaxAvg, ...ptr1MinAvg, ...ptr2MinAvg];
    const maxValue = Math.max(...allValues, 100);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'A', padding.left - 10, y + 4);
    }
    
    // Lines
    const datasets = [
        { data: ptr1MaxAvg, color: '#3b82f6', label: 'PTR-1 Peak', dash: [] },
        { data: ptr1MinAvg, color: '#93c5fd', label: 'PTR-1 Min', dash: [5, 5] },
        { data: ptr2MaxAvg, color: '#2563eb', label: 'PTR-2 Peak', dash: [] },
        { data: ptr2MinAvg, color: '#60a5fa', label: 'PTR-2 Min', dash: [5, 5] }
    ];
    
    datasets.forEach(dataset => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 3;
        ctx.setLineDash(dataset.dash);
        ctx.beginPath();
        
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        dataset.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            ctx.fillStyle = dataset.color;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    });
    
    // X-axis
    dates.forEach((date, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(date.slice(5), 0, 0);
        ctx.restore();
    });
    
    // Legend
    let legendX = canvas.width - padding.right + 10;
    datasets.forEach((dataset, i) => {
        const y = padding.top + i * 25;
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 3;
        ctx.setLineDash(dataset.dash);
        ctx.beginPath();
        ctx.moveTo(legendX, y);
        ctx.lineTo(legendX + 30, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + 35, y + 4);
    });
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('PTR 11kV Load', padding.left, 20);
}

// ============================================
// FEEDER LOAD ANALYSIS
// ============================================
function renderFeederLoadChart() {
    const canvas = document.getElementById('feederLoadChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect all feeder data by date
    const dateData = {};
    allSubmissionsData.forEach(entry => {
        const date = entry.date;
        if (!dateData[date]) {
            dateData[date] = { maxLoads: [], minLoads: [] };
        }
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                dateData[date].maxLoads.push(parseFloat(feeder.maxLoad || 0));
                dateData[date].minLoads.push(parseFloat(feeder.minLoad || 0));
            });
        }
    });
    
    // Get last 7 days and calculate totals
    const dates = Object.keys(dateData).sort().slice(-7);
    const maxLoadTotals = dates.map(d => dateData[d].maxLoads.reduce((a,b) => a+b, 0));
    const minLoadTotals = dates.map(d => dateData[d].minLoads.reduce((a,b) => a+b, 0));
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No feeder data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 60, bottom: 60, left: 70 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barWidth = (chartWidth / dates.length) * 0.35;
    
    const maxValue = Math.max(...maxLoadTotals, ...minLoadTotals, 100);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'A', padding.left - 10, y + 4);
    }
    
    // Draw bars
    dates.forEach((date, i) => {
        const x = padding.left + (chartWidth / dates.length) * i + (chartWidth / dates.length) / 4;
        
        // Peak load bar
        const peakHeight = (maxLoadTotals[i] / maxValue) * chartHeight;
        const peakY = padding.top + chartHeight - peakHeight;
        
        const peakGradient = ctx.createLinearGradient(0, peakY, 0, peakY + peakHeight);
        peakGradient.addColorStop(0, '#3b82f6');
        peakGradient.addColorStop(1, '#1e40af');
        
        ctx.fillStyle = peakGradient;
        ctx.fillRect(x, peakY, barWidth, peakHeight);
        
        // Min load bar
        const minHeight = (minLoadTotals[i] / maxValue) * chartHeight;
        const minY = padding.top + chartHeight - minHeight;
        
        const minGradient = ctx.createLinearGradient(0, minY, 0, minY + minHeight);
        minGradient.addColorStop(0, '#93c5fd');
        minGradient.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = minGradient;
        ctx.fillRect(x + barWidth + 5, minY, barWidth, minHeight);
        
        // Labels
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        if (peakHeight > 20) ctx.fillText(Math.round(maxLoadTotals[i]), x + barWidth/2, peakY + 15);
        if (minHeight > 20) ctx.fillText(Math.round(minLoadTotals[i]), x + barWidth + 5 + barWidth/2, minY + 15);
        
        // Date label
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.save();
        ctx.translate(x + barWidth, canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(date.slice(5), 0, 0);
        ctx.restore();
    });
    
    // Legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(padding.left, 25, 20, 12);
    ctx.fillStyle = 'white';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Peak Load', padding.left + 25, 35);
    
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(padding.left + 100, 25, 20, 12);
    ctx.fillText('Min Load', padding.left + 125, 35);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Total Feeder Loads', padding.left, 15);
}

// ============================================
// FEEDER VOLTAGE DISTRIBUTION
// ============================================
function renderFeederVoltageChart() {
    const canvas = document.getElementById('feederVoltageChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect feeder voltages
    const voltageRanges = {
        'Below 10kV': 0,
        '10.0-10.5kV': 0,
        '10.5-11.0kV': 0,
        '11.0-11.5kV': 0,
        '11.5-12.0kV': 0,
        'Above 12kV': 0
    };
    
    allSubmissionsData.forEach(entry => {
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const maxV = parseFloat(feeder.maxVoltage || 0);
                const minV = parseFloat(feeder.minVoltage || 0);
                
                [maxV, minV].forEach(v => {
                    if (v < 10) voltageRanges['Below 10kV']++;
                    else if (v >= 10 && v < 10.5) voltageRanges['10.0-10.5kV']++;
                    else if (v >= 10.5 && v < 11) voltageRanges['10.5-11.0kV']++;
                    else if (v >= 11 && v < 11.5) voltageRanges['11.0-11.5kV']++;
                    else if (v >= 11.5 && v < 12) voltageRanges['11.5-12.0kV']++;
                    else if (v >= 12) voltageRanges['Above 12kV']++;
                });
            });
        }
    });
    
    const labels = Object.keys(voltageRanges);
    const values = Object.values(voltageRanges);
    const totalCount = values.reduce((a,b) => a+b, 0);
    
    if (totalCount === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No voltage data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 30, bottom: 40, left: 120 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barHeight = (chartHeight / labels.length) * 0.7;
    
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    
    labels.forEach((label, i) => {
        const y = padding.top + (chartHeight / labels.length) * i + ((chartHeight / labels.length) - barHeight) / 2;
        const percentage = (values[i] / totalCount) * 100;
        const barWidth = (percentage / 100) * chartWidth;
        
        // Bar
        const gradient = ctx.createLinearGradient(padding.left, 0, padding.left + barWidth, 0);
        gradient.addColorStop(0, colors[i]);
        gradient.addColorStop(1, colors[i] + '80');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(padding.left, y, barWidth, barHeight);
        
        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(label, padding.left - 10, y + barHeight/2 + 4);
        
        // Value
        ctx.textAlign = 'left';
        ctx.fillText(`${values[i]} (${percentage.toFixed(1)}%)`, padding.left + barWidth + 8, y + barHeight/2 + 4);
    });
    
    // Nominal line indicator
    const nominalIdx = 3; // 11.0-11.5kV
    const nominalY = padding.top + (chartHeight / labels.length) * nominalIdx + (chartHeight / labels.length) / 2;
    
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left - 5, nominalY);
    ctx.lineTo(padding.left - 20, nominalY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#10b981';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText('Nominal', padding.left - 25, nominalY + 4);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Voltage Distribution', padding.left, 20);
}

// ============================================
// PEAK TIME DISTRIBUTION
// ============================================
function renderPeakTimeChart() {
    const canvas = document.getElementById('peakTimeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect peak times
    const hourCounts = Array(24).fill(0);
    
    allSubmissionsData.forEach(entry => {
        // I/C times
        [entry.ic1, entry.ic2].forEach(ic => {
            if (ic?.maxLoadTime) {
                const hour = parseInt(ic.maxLoadTime.split(':')[0]);
                if (!isNaN(hour)) hourCounts[hour]++;
            }
        });
        
        // PTR times
        [entry.ptr1_33kv, entry.ptr2_33kv, entry.ptr1_11kv, entry.ptr2_11kv].forEach(ptr => {
            if (ptr?.maxLoadTime) {
                const hour = parseInt(ptr.maxLoadTime.split(':')[0]);
                if (!isNaN(hour)) hourCounts[hour]++;
            }
        });
        
        // Feeder times
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                if (feeder.maxLoadTime) {
                    const hour = parseInt(feeder.maxLoadTime.split(':')[0]);
                    if (!isNaN(hour)) hourCounts[hour]++;
                }
            });
        }
    });
    
    const padding = { top: 40, right: 30, bottom: 50, left: 50 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const cellWidth = chartWidth / 24;
    const maxCount = Math.max(...hourCounts, 1);
    
    // Draw heatmap
    hourCounts.forEach((count, hour) => {
        const x = padding.left + hour * cellWidth;
        const intensity = count / maxCount;
        
        // Color based on time of day
        let color;
        if (hour >= 6 && hour < 10) color = `rgba(245,158,11,${0.3 + intensity * 0.7})`; // Morning
        else if (hour >= 10 && hour < 18) color = `rgba(239,68,68,${0.3 + intensity * 0.7})`; // Day Peak
        else if (hour >= 18 && hour < 22) color = `rgba(139,92,246,${0.3 + intensity * 0.7})`; // Evening
        else color = `rgba(59,130,246,${0.3 + intensity * 0.7})`; // Night
        
        ctx.fillStyle = color;
        ctx.fillRect(x, padding.top, cellWidth - 2, chartHeight);
        
        // Count label
        if (count > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(count, x + cellWidth/2, padding.top + chartHeight/2 + 4);
        }
        
        // Hour label
        if (hour % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '9px Inter';
            ctx.fillText(`${hour}h`, x + cellWidth/2, canvas.height - padding.bottom + 20);
        }
    });
    
    // Legend
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Peak Load Times', padding.left, 20);
    
    // Find peak hour
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`Most Common: ${peakHour}:00`, canvas.width - padding.right, 20);
}

// ============================================
// DAILY LOAD TREND
// ============================================
function renderDailyLoadTrendChart() {
    const canvas = document.getElementById('dailyLoadTrendChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate daily total loads
    const dateLoads = {};
    allSubmissionsData.forEach(entry => {
        const date = entry.date;
        if (!dateLoads[date]) {
            dateLoads[date] = 0;
        }
        
        // Sum all loads
        [entry.ic1, entry.ic2].forEach(ic => {
            if (ic?.maxLoad) dateLoads[date] += parseFloat(ic.maxLoad);
        });
        
        [entry.ptr1_33kv, entry.ptr2_33kv, entry.ptr1_11kv, entry.ptr2_11kv].forEach(ptr => {
            if (ptr?.maxLoad) dateLoads[date] += parseFloat(ptr.maxLoad);
        });
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                if (feeder.maxLoad) dateLoads[date] += parseFloat(feeder.maxLoad);
            });
        }
    });
    
    // Get last 10 days
    const dates = Object.keys(dateLoads).sort().slice(-10);
    const loads = dates.map(d => dateLoads[d]);
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No trend data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 60, bottom: 60, left: 70 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const maxValue = Math.max(...loads, 100);
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'A', padding.left - 10, y + 4);
    }
    
    // Area fill
    ctx.fillStyle = 'rgba(245,158,11,0.2)';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    
    loads.forEach((load, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        const y = padding.top + chartHeight - (load / maxValue) * chartHeight;
        ctx.lineTo(x, y);
    });
    
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();
    
    // Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    loads.forEach((load, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        const y = padding.top + chartHeight - (load / maxValue) * chartHeight;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Points
    loads.forEach((load, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        const y = padding.top + chartHeight - (load / maxValue) * chartHeight;
        
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Value label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(load), x, y - 12);
    });
    
    // X-axis
    dates.forEach((date, i) => {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(date.slice(5), 0, 0);
        ctx.restore();
    });
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Total Daily Load Trend', padding.left, 20);
    
    // Peak day
    const peakIdx = loads.indexOf(Math.max(...loads));
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`Peak: ${dates[peakIdx]}`, canvas.width - padding.right, 20);
}

// ============================================
// VOLTAGE COMPLIANCE ANALYSIS
// ============================================
function renderVoltageComplianceChart() {
    const canvas = document.getElementById('voltageComplianceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Count voltage compliance
    const compliance = {
        'I/C 33kV': { inRange: 0, outRange: 0, nominal: 33, tolerance: 1.65 },
        'PTR 33kV': { inRange: 0, outRange: 0, nominal: 33, tolerance: 1.65 },
        'Feeders 11kV': { inRange: 0, outRange: 0, nominal: 11, tolerance: 0.55 }
    };
    
    allSubmissionsData.forEach(entry => {
        // I/C
        [entry.ic1, entry.ic2].forEach(ic => {
            if (ic) {
                [ic.maxVoltage, ic.minVoltage].forEach(v => {
                    const val = parseFloat(v || 0);
                    if (Math.abs(val - 33) <= 1.65) compliance['I/C 33kV'].inRange++;
                    else compliance['I/C 33kV'].outRange++;
                });
            }
        });
        
        // PTR 33kV
        [entry.ptr1_33kv, entry.ptr2_33kv].forEach(ptr => {
            if (ptr) {
                [ptr.maxVoltage, ptr.minVoltage].forEach(v => {
                    const val = parseFloat(v || 0);
                    if (Math.abs(val - 33) <= 1.65) compliance['PTR 33kV'].inRange++;
                    else compliance['PTR 33kV'].outRange++;
                });
            }
        });
        
        // Feeders 11kV
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                [feeder.maxVoltage, feeder.minVoltage].forEach(v => {
                    const val = parseFloat(v || 0);
                    if (Math.abs(val - 11) <= 0.55) compliance['Feeders 11kV'].inRange++;
                    else compliance['Feeders 11kV'].outRange++;
                });
            });
        }
    });
    
    const categories = Object.keys(compliance);
    const padding = { top: 50, right: 100, bottom: 40, left: 120 };
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barHeight = (chartHeight / categories.length) * 0.6;
    
    categories.forEach((cat, i) => {
        const data = compliance[cat];
        const total = data.inRange + data.outRange;
        if (total === 0) return;
        
        const y = padding.top + (chartHeight / categories.length) * i + ((chartHeight / categories.length) - barHeight) / 2;
        const inRangePercent = (data.inRange / total) * 100;
        const outRangePercent = (data.outRange / total) * 100;
        
        const maxWidth = canvas.width - padding.left - padding.right;
        const inRangeWidth = (inRangePercent / 100) * maxWidth;
        const outRangeWidth = (outRangePercent / 100) * maxWidth;
        
        // In-range bar (green)
        ctx.fillStyle = '#10b981';
        ctx.fillRect(padding.left, y, inRangeWidth, barHeight);
        
        // Out-range bar (red)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(padding.left + inRangeWidth, y, outRangeWidth, barHeight);
        
        // Category label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(cat, padding.left - 10, y + barHeight/2 + 4);
        
        // Percentages
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px Inter';
        if (inRangeWidth > 50) {
            ctx.fillStyle = 'white';
            ctx.fillText(`${inRangePercent.toFixed(1)}%`, padding.left + 10, y + barHeight/2 + 4);
        }
        if (outRangeWidth > 50) {
            ctx.fillStyle = 'white';
            ctx.fillText(`${outRangePercent.toFixed(1)}%`, padding.left + inRangeWidth + 10, y + barHeight/2 + 4);
        }
        
        // Total count
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`(${total} readings)`, canvas.width - padding.right + 10, y + barHeight/2 + 4);
    });
    
    // Legend
    ctx.fillStyle = '#10b981';
    ctx.fillRect(padding.left, 20, 15, 12);
    ctx.fillStyle = 'white';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('In Range', padding.left + 20, 30);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding.left + 90, 20, 15, 12);
    ctx.fillText('Out of Range', padding.left + 110, 30);
}

// ============================================
// PSS COMPARISON CHART
// ============================================
function renderPSSComparisonChart() {
    const canvas = document.getElementById('pssComparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate total loads by PSS
    const pssData = {};
    allSubmissionsData.forEach(entry => {
        const pss = entry.pssStation;
        if (!pssData[pss]) {
            pssData[pss] = { totalLoad: 0, count: 0 };
        }
        
        let entryLoad = 0;
        
        [entry.ic1, entry.ic2].forEach(ic => {
            if (ic?.maxLoad) entryLoad += parseFloat(ic.maxLoad);
        });
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                if (feeder.maxLoad) entryLoad += parseFloat(feeder.maxLoad);
            });
        }
        
        pssData[pss].totalLoad += entryLoad;
        pssData[pss].count++;
    });
    
    // Calculate averages and sort
    const pssArray = Object.entries(pssData)
        .map(([name, data]) => ({
            name,
            avgLoad: data.totalLoad / data.count,
            count: data.count
        }))
        .sort((a, b) => b.avgLoad - a.avgLoad)
        .slice(0, 8);
    
    if (pssArray.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No PSS data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 50, right: 60, bottom: 40, left: 130 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barHeight = (chartHeight / pssArray.length) * 0.7;
    const maxLoad = Math.max(...pssArray.map(p => p.avgLoad), 100);
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
    
    pssArray.forEach((pss, i) => {
        const y = padding.top + (chartHeight / pssArray.length) * i + ((chartHeight / pssArray.length) - barHeight) / 2;
        const barWidth = (pss.avgLoad / maxLoad) * chartWidth;
        
        // Bar
        const gradient = ctx.createLinearGradient(padding.left, 0, padding.left + barWidth, 0);
        gradient.addColorStop(0, colors[i % colors.length]);
        gradient.addColorStop(1, colors[i % colors.length] + '80');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(padding.left, y, barWidth, barHeight);
        
        // PSS name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(pss.name.substring(0, 18), padding.left - 10, y + barHeight/2 + 4);
        
        // Value
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(pss.avgLoad)} A`, padding.left + barWidth + 8, y + barHeight/2 + 4);
        
        // Count
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px Inter';
        ctx.fillText(`(${pss.count} entries)`, canvas.width - padding.right + 5, y + barHeight/2 + 4);
    });
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('PSS Average Load Comparison', padding.left, 20);
}

// ============================================
// SUMMARY STATISTICS
// ============================================
function renderSummaryStats() {
    const container = document.getElementById('summaryStats');
    if (!container) return;
    
    // Calculate comprehensive stats
    let totalEntries = allSubmissionsData.length;
    let totalICReadings = 0;
    let totalPTRReadings = 0;
    let totalFeederReadings = 0;
    let peakLoad = 0;
    let peakPSS = '';
    let peakDate = '';
    
    allSubmissionsData.forEach(entry => {
        let entryLoad = 0;
        
        if (entry.ic1 || entry.ic2) totalICReadings++;
        if (entry.ptr1_33kv || entry.ptr2_33kv || entry.ptr1_11kv || entry.ptr2_11kv) totalPTRReadings++;
        
        [entry.ic1, entry.ic2].forEach(ic => {
            if (ic?.maxLoad) entryLoad += parseFloat(ic.maxLoad);
        });
        
        if (entry.feeders) {
            totalFeederReadings += Object.keys(entry.feeders).length;
            Object.values(entry.feeders).forEach(feeder => {
                if (feeder.maxLoad) entryLoad += parseFloat(feeder.maxLoad);
            });
        }
        
        if (entryLoad > peakLoad) {
            peakLoad = entryLoad;
            peakPSS = entry.pssStation;
            peakDate = entry.date;
        }
    });
    
    const stats = [
        { label: 'Total Entries', value: totalEntries, icon: '📊', color: '#3b82f6' },
        { label: 'I/C Readings', value: totalICReadings, icon: '⚡', color: '#ef4444' },
        { label: 'PTR Readings', value: totalPTRReadings, icon: '🔄', color: '#10b981' },
        { label: 'Feeder Readings', value: totalFeederReadings, icon: '📡', color: '#f59e0b' },
        { label: 'Peak Load', value: `${Math.round(peakLoad)} A`, icon: '📈', color: '#8b5cf6' },
        { label: 'Peak PSS', value: peakPSS.substring(0, 12), icon: '🏆', color: '#ec4899' }
    ];
    
    let html = stats.map(stat => `
        <div style="background: rgba(30,41,59,0.8); border: 1px solid ${stat.color}40; border-radius: 12px; padding: 1.5rem; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 0.5rem;">${stat.icon}</div>
            <div style="font-size: 28px; font-weight: 700; color: ${stat.color}; margin-bottom: 0.25rem;">${stat.value}</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7);">${stat.label}</div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Refresh analytics
function refreshAnalytics() {
    console.log('🔄 Refreshing analytics...');
    loadAnalyticsWindow();
}

// Initialize analytics when data loads
function initializeAnalytics() {
    if (allSubmissionsData.length > 0) {
        loadAnalyticsWindow();
    }
}

// ============================================
// WINDOW 5: SETTINGS
// ============================================

function setupSettingsEvents() {

    const dates = Object.keys(dateGroups).sort().slice(-10);
    const counts = dates.map(date => dateGroups[date]);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (dates.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Chart dimensions
    const padding = { top: 40, right: 30, bottom: 60, left: 50 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barWidth = (chartWidth / dates.length) * 0.7;
    const maxCount = Math.max(...counts, 1);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = Math.round(maxCount - (maxCount / 5) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(value, padding.left - 10, y + 4);
    }
    
    // Draw bars with gradients
    dates.forEach((date, i) => {
        const barHeight = (counts[i] / maxCount) * chartHeight;
        const x = padding.left + (chartWidth / dates.length) * i + ((chartWidth / dates.length) - barWidth) / 2;
        const y = padding.top + chartHeight - barHeight;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(0.5, '#2563eb');
        gradient.addColorStop(1, '#1e40af');
        
        // Draw shadow
        ctx.fillStyle = 'rgba(59,130,246,0.3)';
        ctx.fillRect(x + 2, y + 2, barWidth, barHeight);
        
        // Draw bar
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw count label on top of bar
        ctx.fillStyle = 'white';
        ctx.font = 'bold 13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(counts[i], x + barWidth / 2, y - 8);
        
        // Draw date label
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - padding.bottom + 15);
        ctx.rotate(-Math.PI / 4);
        const shortDate = date.slice(5); // MM-DD
        ctx.fillText(shortDate, 0, 0);
        ctx.restore();
    });
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, canvas.height - padding.bottom);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, canvas.height - padding.bottom);
    ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
    ctx.stroke();
    
    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('📊 Submissions per Day', padding.left, 20);
    
    // Trend indicator
    if (counts.length >= 2) {
        const trend = counts[counts.length - 1] - counts[counts.length - 2];
        const trendText = trend > 0 ? `↗ +${trend}` : trend < 0 ? `↘ ${trend}` : '→ 0';
        const trendColor = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#f59e0b';
        
        ctx.fillStyle = trendColor;
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(trendText, canvas.width - padding.right, 20);
    }
}

// ============================================
// ENHANCED PSS PERFORMANCE CHART
// ============================================
function renderPSSChart() {
    const canvas = document.getElementById('pssChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Group submissions by PSS
    const pssGroups = {};
    allSubmissionsData.forEach(entry => {
        const pss = entry.pssStation;
        if (!pssGroups[pss]) {
            pssGroups[pss] = 0;
        }
        pssGroups[pss]++;
    });
    
    // Get top 8 PSS
    const sortedPSS = Object.entries(pssGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (sortedPSS.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Chart dimensions
    const padding = { top: 40, right: 30, bottom: 20, left: 140 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barHeight = (chartHeight / sortedPSS.length) * 0.7;
    const maxCount = Math.max(...sortedPSS.map(p => p[1]), 1);
    
    // Draw horizontal bars
    sortedPSS.forEach(([pss, count], i) => {
        const y = padding.top + (chartHeight / sortedPSS.length) * i + ((chartHeight / sortedPSS.length) - barHeight) / 2;
        const barWidth = (count / maxCount) * chartWidth;
        const x = padding.left;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        const colors = [
            ['#10b981', '#059669'], // Green
            ['#3b82f6', '#2563eb'], // Blue
            ['#f59e0b', '#d97706'], // Orange
            ['#8b5cf6', '#7c3aed'], // Purple
            ['#ef4444', '#dc2626'], // Red
            ['#06b6d4', '#0891b2'], // Cyan
            ['#ec4899', '#db2777'], // Pink
            ['#f97316', '#ea580c']  // Orange-red
        ];
        const colorPair = colors[i % colors.length];
        gradient.addColorStop(0, colorPair[0]);
        gradient.addColorStop(1, colorPair[1]);
        
        // Draw shadow
        ctx.fillStyle = 'rgba(16,185,129,0.2)';
        ctx.fillRect(x + 2, y + 2, barWidth, barHeight);
        
        // Draw bar
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw PSS name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(pss.substring(0, 18), padding.left - 10, y + barHeight / 2 + 4);
        
        // Draw count inside bar
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(count, x + barWidth + 8, y + barHeight / 2 + 5);
        
        // Draw percentage
        const percentage = ((count / sortedPSS.reduce((sum, p) => sum + p[1], 0)) * 100).toFixed(1);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px Inter';
        ctx.fillText(`${percentage}%`, x + barWidth + 35, y + barHeight / 2 + 5);
    });
    
    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('🏢 Top Performing PSS Stations', padding.left, 20);
    
    // Total count
    const totalCount = sortedPSS.reduce((sum, p) => sum + p[1], 0);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`Total: ${totalCount}`, canvas.width - padding.right, 20);
}

// ============================================
// LOAD FACTOR ANALYSIS CHART
// ============================================
function renderLoadFactorChart() {
    const canvas = document.getElementById('loadFactorCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate load factors
    const loadFactors = [];
    allSubmissionsData.forEach(entry => {
        let maxLoad = 0;
        let minLoad = 0;
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                maxLoad += parseFloat(feeder.maxLoad || 0);
                minLoad += parseFloat(feeder.minLoad || 0);
            });
        }
        
        if (maxLoad > 0) {
            const loadFactor = (minLoad / maxLoad) * 100;
            loadFactors.push(loadFactor);
        }
    });
    
    if (loadFactors.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No load factor data', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const avgLoadFactor = (loadFactors.reduce((a, b) => a + b, 0) / loadFactors.length).toFixed(1);
    const maxLoadFactor = Math.max(...loadFactors).toFixed(1);
    const minLoadFactor = Math.min(...loadFactors).toFixed(1);
    
    // Draw circular progress
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 10;
    const radius = 60;
    const percentage = parseFloat(avgLoadFactor) / 100;
    
    // Background circle
    ctx.strokeStyle = 'rgba(16,185,129,0.2)';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Progress circle
    const gradient = ctx.createConicGradient(0, centerX, centerY);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(percentage, '#059669');
    gradient.addColorStop(1, 'rgba(16,185,129,0.3)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * percentage));
    ctx.stroke();
    
    // Center text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${avgLoadFactor}%`, centerX, centerY);
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px Inter';
    ctx.fillText('Avg Load Factor', centerX, centerY + 30);
    
    // Stats at bottom
    const statsY = canvas.height - 25;
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(`Max: ${maxLoadFactor}%`, 10, statsY);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`Min: ${minLoadFactor}%`, canvas.width - 10, statsY);
}

// ============================================
// VOLTAGE STATISTICS CHART
// ============================================
function renderVoltageStatsChart() {
    const canvas = document.getElementById('voltageCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Collect voltage data
    const voltages = { ic: [], ptr33: [], ptr11: [] };
    
    allSubmissionsData.forEach(entry => {
        if (entry.ic1) {
            voltages.ic.push(parseFloat(entry.ic1.maxVoltage || 0));
            voltages.ic.push(parseFloat(entry.ic1.minVoltage || 0));
        }
        if (entry.ic2) {
            voltages.ic.push(parseFloat(entry.ic2.maxVoltage || 0));
            voltages.ic.push(parseFloat(entry.ic2.minVoltage || 0));
        }
        if (entry.ptr1_33kv) {
            voltages.ptr33.push(parseFloat(entry.ptr1_33kv.maxVoltage || 0));
            voltages.ptr33.push(parseFloat(entry.ptr1_33kv.minVoltage || 0));
        }
        if (entry.ptr2_33kv) {
            voltages.ptr33.push(parseFloat(entry.ptr2_33kv.maxVoltage || 0));
            voltages.ptr33.push(parseFloat(entry.ptr2_33kv.minVoltage || 0));
        }
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                voltages.ptr11.push(parseFloat(feeder.maxVoltage || 0));
                voltages.ptr11.push(parseFloat(feeder.minVoltage || 0));
            });
        }
    });
    
    // Calculate averages
    const avgIC = voltages.ic.length > 0 ? (voltages.ic.reduce((a, b) => a + b, 0) / voltages.ic.length).toFixed(2) : 0;
    const avgPTR33 = voltages.ptr33.length > 0 ? (voltages.ptr33.reduce((a, b) => a + b, 0) / voltages.ptr33.length).toFixed(2) : 0;
    const avgPTR11 = voltages.ptr11.length > 0 ? (voltages.ptr11.reduce((a, b) => a + b, 0) / voltages.ptr11.length).toFixed(2) : 0;
    
    // Draw bars
    const bars = [
        { label: 'I/C 33kV', value: avgIC, color: '#ef4444', nominal: 33 },
        { label: 'PTR 33kV', value: avgPTR33, color: '#10b981', nominal: 33 },
        { label: 'Feeder 11kV', value: avgPTR11, color: '#3b82f6', nominal: 11 }
    ];
    
    const padding = { top: 40, right: 30, bottom: 50, left: 80 };
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const barHeight = (chartHeight / bars.length) * 0.6;
    const maxValue = 35; // Max voltage for scale
    
    bars.forEach((bar, i) => {
        const y = padding.top + (chartHeight / bars.length) * i + ((chartHeight / bars.length) - barHeight) / 2;
        const barWidth = ((bar.value / maxValue) * (canvas.width - padding.left - padding.right));
        const x = padding.left;
        
        // Draw nominal line
        const nominalX = padding.left + ((bar.nominal / maxValue) * (canvas.width - padding.left - padding.right));
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(nominalX, y);
        ctx.lineTo(nominalX, y + barHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw bar
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, bar.color);
        gradient.addColorStop(1, bar.color + '80');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(bar.label, padding.left - 10, y + barHeight / 2 + 4);
        
        // Draw value
        ctx.fillStyle = 'white';
        ctx.font = 'bold 13px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`${bar.value} kV`, x + barWidth + 8, y + barHeight / 2 + 4);
        
        // Deviation indicator
        const deviation = ((bar.value - bar.nominal) / bar.nominal * 100).toFixed(1);
        const devColor = Math.abs(deviation) < 5 ? '#10b981' : '#f59e0b';
        ctx.fillStyle = devColor;
        ctx.font = '10px Inter';
        ctx.fillText(`${deviation > 0 ? '+' : ''}${deviation}%`, x + barWidth + 65, y + barHeight / 2 + 4);
    });
    
    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ Average Voltage Levels', padding.left, 20);
}

// ============================================
// SUBMISSION TIMELINE CHART
// ============================================
function renderTimelineChart() {
    const canvas = document.getElementById('timelineCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Group by hour
    const hourGroups = {};
    for (let i = 0; i < 24; i++) {
        hourGroups[i] = 0;
    }
    
    allSubmissionsData.forEach(entry => {
        if (entry.timestamp) {
            const date = entry.timestamp.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
            const hour = date.getHours();
            hourGroups[hour]++;
        }
    });
    
    // Draw 24-hour heatmap
    const padding = { top: 40, right: 20, bottom: 30, left: 40 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const maxCount = Math.max(...Object.values(hourGroups), 1);
    
    const cellWidth = chartWidth / 24;
    
    Object.entries(hourGroups).forEach(([hour, count]) => {
        const h = parseInt(hour);
        const x = padding.left + h * cellWidth;
        const intensity = count / maxCount;
        
        // Color gradient based on intensity
        const hue = 210; // Blue hue
        const saturation = 70 + (intensity * 30);
        const lightness = 50 + (intensity * 30);
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, padding.top, cellWidth - 2, chartHeight);
        
        // Draw hour label
        if (h % 3 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '9px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`${h}:00`, x + cellWidth / 2, canvas.height - 10);
        }
        
        // Draw count if significant
        if (count > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(count, x + cellWidth / 2, padding.top + chartHeight / 2 + 4);
        }
    });
    
    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('⏰ Submissions by Hour', padding.left, 20);
    
    // Peak hour
    const peakHour = Object.entries(hourGroups).reduce((a, b) => a[1] > b[1] ? a : b);
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`Peak: ${peakHour[0]}:00 (${peakHour[1]} submissions)`, canvas.width - padding.right, 20);
}

// ============================================
// ENHANCED TOP CONTRIBUTORS
// ============================================
function renderTopContributors() {
    const container = document.getElementById('topContributors');
    if (!container) return;
    
    // Group submissions by staff
    const staffGroups = {};
    const staffDetails = {};
    
    allSubmissionsData.forEach(entry => {
        const staff = entry.staffName;
        if (!staffGroups[staff]) {
            staffGroups[staff] = 0;
            staffDetails[staff] = {
                pss: entry.pssStation,
                phone: entry.phoneNumber,
                dates: new Set()
            };
        }
        staffGroups[staff]++;
        staffDetails[staff].dates.add(entry.date);
    });
    
    // Get top 10 contributors
    const topStaff = Object.entries(staffGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (topStaff.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 2rem;">No data available</p>';
        return;
    }
    
    const maxCount = topStaff[0][1];
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">';
    
    topStaff.forEach(([name, count], i) => {
        const details = staffDetails[name];
        const percentage = ((count / maxCount) * 100).toFixed(0);
        const uniqueDays = details.dates.size;
        const avgPerDay = (count / uniqueDays).toFixed(1);
        
        const colors = [
            ['#3b82f6', '#2563eb'], // Blue
            ['#10b981', '#059669'], // Green
            ['#f59e0b', '#d97706'], // Orange
            ['#8b5cf6', '#7c3aed'], // Purple
            ['#ef4444', '#dc2626'], // Red
            ['#06b6d4', '#0891b2'], // Cyan
            ['#ec4899', '#db2777'], // Pink
            ['#f97316', '#ea580c'], // Orange-red
            ['#14b8a6', '#0d9488'], // Teal
            ['#a855f7', '#9333ea']  // Purple-2
        ];
        const colorPair = colors[i % colors.length];
        
        html += `
            <div style="background: linear-gradient(135deg, ${colorPair[0]}15 0%, ${colorPair[1]}05 100%); border: 1px solid ${colorPair[0]}40; border-radius: 12px; padding: 1rem; position: relative; overflow: hidden;">
                <!-- Rank Badge -->
                <div style="position: absolute; top: -10px; right: -10px; width: 50px; height: 50px; background: linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]}); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: white; box-shadow: 0 4px 12px ${colorPair[0]}80;">
                    ${i + 1}
                </div>
                
                <!-- Staff Info -->
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]}); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 20px; box-shadow: 0 4px 12px ${colorPair[0]}60;">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: white; font-size: 14px; margin-bottom: 2px;">${name}</div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.6);">${details.pss}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); font-family: monospace;">${details.phone}</div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="font-size: 12px; color: rgba(255,255,255,0.8); font-weight: 600;">Submissions</span>
                        <span style="font-size: 14px; color: white; font-weight: 700;">${count}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, ${colorPair[0]}, ${colorPair[1]}); border-radius: 10px; transition: width 1s ease;"></div>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: ${colorPair[0]};">${uniqueDays}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.6);">Active Days</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: ${colorPair[1]};">${avgPerDay}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.6);">Avg/Day</div>
                    </div>
                </div>
                
                <!-- Performance Badge -->
                ${i === 0 ? `
                    <div style="margin-top: 0.75rem; padding: 0.5rem; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 6px; text-align: center; font-weight: 700; color: #1a1a1a; font-size: 11px;">
                        🏆 TOP PERFORMER
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add summary stats
    const totalSubmissions = topStaff.reduce((sum, s) => sum + s[1], 0);
    const totalStaff = Object.keys(staffGroups).length;
    
    html += `
        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px; display: flex; justify-content: space-around; align-items: center;">
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">${totalStaff}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.6);">Total Staff Members</div>
            </div>
            <div style="width: 1px; height: 40px; background: rgba(255,255,255,0.2);"></div>
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #10b981;">${allSubmissionsData.length}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.6);">Total Submissions</div>
            </div>
            <div style="width: 1px; height: 40px; background: rgba(255,255,255,0.2);"></div>
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${(allSubmissionsData.length / totalStaff).toFixed(1)}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.6);">Avg per Staff</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================
// WINDOW 5: SETTINGS
// ============================================

function setupSettingsEvents() {
    // Add user button
    document.getElementById('btn-add-user')?.addEventListener('click', showAddUserModal);
    
    // Add PSS button
    document.getElementById('btn-add-pss')?.addEventListener('click', showAddPSSModal);
    
    // Save settings button
    document.getElementById('btn-save-settings')?.addEventListener('click', saveSystemSettings);
}

function loadSettingsWindow() {
    console.log('Loading settings window...');
    renderUsersTable();
    renderPSSStationsTable();
}

function renderUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = adminState.users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.phoneNumber}</td>
            <td>${user.role}</td>
            <td><span class="user-status ${user.status}">${user.status}</span></td>
            <td>
                <button class="btn-table-action btn-edit" onclick="editUser('${user.phoneNumber}')">Edit</button>
                <button class="btn-table-action btn-delete" onclick="deleteUser('${user.phoneNumber}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderPSSStationsTable() {
    const tableBody = document.getElementById('pss-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = adminState.pssStations.map(pss => `
        <tr>
            <td>${pss.name}</td>
            <td>${pss.feeders || 6}</td>
            <td>${pss.capacity || 'N/A'}</td>
            <td>
                <button class="btn-table-action btn-edit" onclick="editPSS('${pss.id}')">Edit</button>
                <button class="btn-table-action btn-delete" onclick="deletePSS('${pss.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddUserModal() {
    alert('Add user modal coming soon!');
}

function showAddPSSModal() {
    alert('Add PSS station modal coming soon!');
}

async function editUser(phoneNumber) {
    alert(`Edit user ${phoneNumber} - Modal coming soon!`);
}

async function deleteUser(phoneNumber) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await db.collection('users').doc(phoneNumber).delete();
        adminState.users = adminState.users.filter(u => u.phoneNumber !== phoneNumber);
        renderUsersTable();
        await logAdminAction('delete_user', { phoneNumber });
        alert('User deleted successfully!');
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user.');
    }
}

async function editPSS(pssId) {
    alert(`Edit PSS ${pssId} - Modal coming soon!`);
}

async function deletePSS(pssId) {
    if (!confirm('Are you sure you want to delete this PSS station?')) return;
    
    try {
        await db.collection('pss_stations').doc(pssId).delete();
        adminState.pssStations = adminState.pssStations.filter(p => p.id !== pssId);
        renderPSSStationsTable();
        await logAdminAction('delete_pss', { pssId });
        alert('PSS station deleted successfully!');
    } catch (error) {
        console.error('Error deleting PSS:', error);
        alert('Error deleting PSS station.');
    }
}

function saveSystemSettings() {
    alert('Save system settings - Implementation coming soon!');
}

// ============================================
// REAL-TIME LISTENERS
// ============================================

function startRealTimeListeners() {
    // Listen for new submissions
    db.collection('daily_entries')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const newSubmission = { id: change.doc.id, ...change.doc.data() };
                    
                    // Add to beginning of array if not already there
                    if (!adminState.allSubmissions.find(s => s.id === newSubmission.id)) {
                        adminState.allSubmissions.unshift(newSubmission);
                        adminState.filteredSubmissions.unshift(newSubmission);
                        
                        // Refresh current window
                        if (adminState.currentWindow === 'overview') {
                            updateOverviewStats();
                            loadRecentActivity();
                        } else if (adminState.currentWindow === 'view') {
                            renderDataTable();
                        }
                        
                        // Show notification
                        showNotification('New submission received!', 'success');
                    }
                }
            });
        });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function logAdminAction(action, details) {
    try {
        await db.collection('admin_logs').add({
            adminPhone: appState.currentUser.phoneNumber,
            adminName: appState.currentUser.name,
            action: action,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}

function showNotification(message, type = 'info') {
    // TODO: Implement toast notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const then = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Export functions for global use
window.loadAdminDashboard = loadAdminDashboard;
window.viewSubmission = viewSubmission;
window.editSubmission = editSubmission;
window.deleteSubmission = deleteSubmission;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.editPSS = editPSS;
window.deletePSS = deletePSS;

// ============================================
// NEW ADMIN FEATURES
// ============================================

// Store all submissions data
let allSubmissionsData = [];

// Load all submissions for View tab
async function loadAllSubmissions() {
    try {
        const snapshot = await db.collection('daily_entries')
            .orderBy('timestamp', 'desc')  // Sort by latest first
            .limit(500)
            .get();
        
        allSubmissionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('Loaded submissions:', allSubmissionsData.length, '(sorted by latest first)');
        
        // Update chatbot context if available
        if (typeof updateDataContext === 'function') {
            updateDataContext(allSubmissionsData);
            console.log('✅ Chatbot data context updated');
        }
        
        // Populate PSS filter dropdown
        const filterPSS = document.getElementById('filterPSS');
        if (filterPSS) {
            const pssStations = [...new Set(allSubmissionsData.map(s => s.pssStation))].filter(Boolean).sort();
            filterPSS.innerHTML = '<option value="">All PSS Stations</option>';
            pssStations.forEach(pss => {
                filterPSS.innerHTML += `<option value="${pss}">${pss}</option>`;
            });
            
            // Add event listener to update staff dropdown when PSS changes
            filterPSS.addEventListener('change', function() {
                const selectedPSS = this.value;
                updateStaffFilterByPSS(selectedPSS);
                
                // Refresh custom select dropdown if it exists
                if (typeof window.refreshCustomSelects === 'function') {
                    setTimeout(() => window.refreshCustomSelects(), 100);
                }
            });
        }
        
        // Populate staff filter dropdown
        const filterStaff = document.getElementById('filterStaff');
        if (filterStaff) {
            const staffNames = [...new Set(allSubmissionsData.map(s => s.staffName))].filter(Boolean).sort();
            filterStaff.innerHTML = '<option value="">All Staff</option>';
            staffNames.forEach(staff => {
                filterStaff.innerHTML += `<option value="${staff}">${staff}</option>`;
            });
        }
        
        // Display data
        displayFilteredData(allSubmissionsData);
        
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

// Filter and display data
function filterData() {
    const filterPSS = document.getElementById('filterPSS')?.value || '';
    const filterFromDate = document.getElementById('filterFromDate')?.value || '';
    const filterToDate = document.getElementById('filterToDate')?.value || '';
    const filterStaff = document.getElementById('filterStaff')?.value || '';
    
    let filtered = allSubmissionsData;
    
    // Filter by PSS
    if (filterPSS) {
        filtered = filtered.filter(s => s.pssStation === filterPSS);
    }
    
    // Filter by date range
    if (filterFromDate) {
        filtered = filtered.filter(s => s.date >= filterFromDate);
    }
    if (filterToDate) {
        filtered = filtered.filter(s => s.date <= filterToDate);
    }
    
    // Filter by staff name
    if (filterStaff) {
        filtered = filtered.filter(s => s.staffName === filterStaff);
    }
    
    displayFilteredData(filtered);
}

// Update staff filter based on selected PSS
function updateStaffFilterByPSS(selectedPSS) {
    const filterStaff = document.getElementById('filterStaff');
    if (!filterStaff) return;
    
    let staffNames;
    
    if (selectedPSS === '' || !selectedPSS) {
        // If no PSS selected, show all staff
        staffNames = [...new Set(allSubmissionsData.map(s => s.staffName))].filter(Boolean).sort();
    } else {
        // Filter staff by selected PSS
        staffNames = [...new Set(
            allSubmissionsData
                .filter(s => s.pssStation === selectedPSS)
                .map(s => s.staffName)
        )].filter(Boolean).sort();
    }
    
    // Update staff dropdown
    filterStaff.innerHTML = '<option value="">All Staff</option>';
    staffNames.forEach(staff => {
        filterStaff.innerHTML += `<option value="${staff}">${staff}</option>`;
    });
    
    // Refresh custom select to show updated options
    if (typeof window.refreshCustomSelects === 'function') {
        setTimeout(() => window.refreshCustomSelects(), 50);
    }
    
    // Trigger filter update
    filterData();
}

// Clear all filters
function clearAdminFilters() {
    document.getElementById('filterPSS').value = '';
    document.getElementById('filterFromDate').value = '';
    document.getElementById('filterToDate').value = '';
    document.getElementById('filterStaff').value = '';
    
    // Reset staff dropdown to show all staff
    updateStaffFilterByPSS('');
}

// Display data in table
function displayFilteredData(data) {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No data found</td></tr>';
        return;
    }
    
    // PERFORMANCE OPTIMIZATION: Use DocumentFragment for better rendering
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    // Process in larger batches for faster initial render
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Render first batch immediately
    if (batches.length > 0) {
        tbody.innerHTML = renderDataBatch(batches[0]);
    }
    
    // Render remaining batches with requestAnimationFrame for smooth UI
    let currentBatch = 1;
    function renderNextBatch() {
        if (currentBatch < batches.length) {
            tempDiv.innerHTML = renderDataBatch(batches[currentBatch]);
            while (tempDiv.firstChild) {
                tbody.appendChild(tempDiv.firstChild);
            }
            currentBatch++;
            requestAnimationFrame(renderNextBatch);
        } else {
            console.log(`✅ Displaying ${data.length} submissions in Overview`);
        }
    }
    
    if (batches.length > 1) {
        requestAnimationFrame(renderNextBatch);
    } else {
        console.log(`✅ Displaying ${data.length} submissions in Overview`);
    }
}

function renderDataBatch(batch) {
    return batch.map(entry => {
        // Calculate total loads from comprehensive data
        let totalMaxLoad = 0;
        let totalMinLoad = 0;
        
        // If not stored, calculate from feeders
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                totalMaxLoad += parseFloat(feeder.maxLoad || 0);
                totalMinLoad += parseFloat(feeder.minLoad || 0);
            });
        }
        
        // Format comprehensive data display (same as user view)
        let dataDisplay = '<div style="font-size: 11px; max-height: 350px; overflow: auto; padding: 8px;">';
        
        // I/C Sections
        if (entry.ic1 || entry.ic2) {
            dataDisplay += '<div style="margin-bottom: 10px; padding: 8px; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; border-radius: 4px;">';
            dataDisplay += '<strong style="color: #fca5a5; font-size: 12px;">📊 I/C SECTIONS</strong><br/>';
            if (entry.ic1) {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #fca5a5;">I/C-1:</strong><br/>
                    <span style="color: rgba(255,255,255,0.9);">
                    Max: ${entry.ic1.maxVoltage}KV @ ${entry.ic1.maxVoltageTime}, ${entry.ic1.maxLoad}A @ ${entry.ic1.maxLoadTime}<br/>
                    Min: ${entry.ic1.minVoltage}KV @ ${entry.ic1.minVoltageTime}, ${entry.ic1.minLoad}A @ ${entry.ic1.minLoadTime}
                    </span>
                </div>`;
            }
            if (entry.ic2) {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #fca5a5;">I/C-2:</strong><br/>
                    <span style="color: rgba(255,255,255,0.9);">
                    Max: ${entry.ic2.maxVoltage}KV @ ${entry.ic2.maxVoltageTime}, ${entry.ic2.maxLoad}A @ ${entry.ic2.maxLoadTime}<br/>
                    Min: ${entry.ic2.minVoltage}KV @ ${entry.ic2.minVoltageTime}, ${entry.ic2.minLoad}A @ ${entry.ic2.minLoadTime}
                    </span>
                </div>`;
            }
            dataDisplay += '</div>';
        }
        
        // PTR Sections
        if (entry.ptr1_33kv || entry.ptr2_33kv || entry.ptr1_11kv || entry.ptr2_11kv) {
            dataDisplay += '<div style="margin-bottom: 10px; padding: 8px; background: rgba(34,197,94,0.1); border-left: 3px solid #22c55e; border-radius: 4px;">';
            dataDisplay += '<strong style="color: #86efac; font-size: 12px;">🔄 PTR SECTIONS</strong><br/>';
            
            if (entry.ptr1_33kv) {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #86efac;">PTR-1 33kv:</strong><br/>
                    <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                    Max: ${entry.ptr1_33kv.maxVoltage}KV @ ${entry.ptr1_33kv.maxVoltageTime}, ${entry.ptr1_33kv.maxLoad}A @ ${entry.ptr1_33kv.maxLoadTime}<br/>
                    Min: ${entry.ptr1_33kv.minVoltage}KV @ ${entry.ptr1_33kv.minVoltageTime}, ${entry.ptr1_33kv.minLoad}A @ ${entry.ptr1_33kv.minLoadTime}
                    </span>
                </div>`;
            }
            if (entry.ptr2_33kv) {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #86efac;">PTR-2 33kv:</strong><br/>
                    <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                    Max: ${entry.ptr2_33kv.maxVoltage}KV @ ${entry.ptr2_33kv.maxVoltageTime}, ${entry.ptr2_33kv.maxLoad}A @ ${entry.ptr2_33kv.maxLoadTime}<br/>
                    Min: ${entry.ptr2_33kv.minVoltage}KV @ ${entry.ptr2_33kv.minVoltageTime}, ${entry.ptr2_33kv.minLoad}A @ ${entry.ptr2_33kv.minLoadTime}
                    </span>
                </div>`;
            }
            if (entry.ptr1_11kv) {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #86efac;">PTR-1 11kv:</strong><br/>
                    <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                    Max: ${entry.ptr1_11kv.maxVoltage}KV @ ${entry.ptr1_11kv.maxVoltageTime}, ${entry.ptr1_11kv.maxLoad}A @ ${entry.ptr1_11kv.maxLoadTime}<br/>
                    Min: ${entry.ptr1_11kv.minVoltage}KV @ ${entry.ptr1_11kv.minVoltageTime}, ${entry.ptr1_11kv.minLoad}A @ ${entry.ptr1_11kv.minLoadTime}
                    </span>
                </div>`;
            }
            if (entry.ptr2_11kv) {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #86efac;">PTR-2 11kv:</strong><br/>
                    <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                    Max: ${entry.ptr2_11kv.maxVoltage}KV @ ${entry.ptr2_11kv.maxVoltageTime}, ${entry.ptr2_11kv.maxLoad}A @ ${entry.ptr2_11kv.maxLoadTime}<br/>
                    Min: ${entry.ptr2_11kv.minVoltage}KV @ ${entry.ptr2_11kv.minVoltageTime}, ${entry.ptr2_11kv.minLoad}A @ ${entry.ptr2_11kv.minLoadTime}
                    </span>
                </div>`;
            }
            dataDisplay += '</div>';
        }
        
        // Feeder Sections
        if (entry.feeders) {
            const feederCount = Object.keys(entry.feeders).length;
            dataDisplay += '<div style="margin-bottom: 10px; padding: 8px; background: rgba(59,130,246,0.1); border-left: 3px solid #3b82f6; border-radius: 4px;">';
            dataDisplay += `<strong style="color: #60a5fa; font-size: 12px;">⚡ FEEDERS (${feederCount})</strong><br/>`;
            Object.entries(entry.feeders).forEach(([name, feeder]) => {
                dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                    <strong style="color: #60a5fa;">${name}</strong> <span style="color: rgba(255,255,255,0.6); font-size: 10px;">[PTR ${feeder.ptrNo}]</span><br/>
                    <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                    Max: ${feeder.maxVoltage}KV @ ${feeder.maxVoltageTime}, <strong style="color: #60a5fa;">${feeder.maxLoad}A</strong> @ ${feeder.maxLoadTime}<br/>
                    Min: ${feeder.minVoltage}KV @ ${feeder.minVoltageTime}, <strong style="color: #60a5fa;">${feeder.minLoad}A</strong> @ ${feeder.minLoadTime}
                    </span>
                </div>`;
            });
            dataDisplay += '</div>';
        }
        
        // Station Transformer
        if (entry.stationTransformer) {
            dataDisplay += '<div style="margin-bottom: 10px; padding: 8px; background: rgba(245,158,11,0.1); border-left: 3px solid #f59e0b; border-radius: 4px;">';
            dataDisplay += '<strong style="color: #fcd34d; font-size: 12px;">🔋 STATION TRANSFORMER</strong><br/>';
            dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                Max: ${entry.stationTransformer.maxVoltage}KV @ ${entry.stationTransformer.maxVoltageTime}, ${entry.stationTransformer.maxLoad}A @ ${entry.stationTransformer.maxLoadTime}<br/>
                Min: ${entry.stationTransformer.minVoltage}KV @ ${entry.stationTransformer.minVoltageTime}, ${entry.stationTransformer.minLoad}A @ ${entry.stationTransformer.minLoadTime}
                </span>
            </div>`;
            dataDisplay += '</div>';
        }
        
        // Charger
        if (entry.charger) {
            dataDisplay += '<div style="margin-bottom: 10px; padding: 8px; background: rgba(168,85,247,0.1); border-left: 3px solid #a855f7; border-radius: 4px;">';
            dataDisplay += '<strong style="color: #d8b4fe; font-size: 12px;">🔌 CHARGER</strong><br/>';
            dataDisplay += `<div style="margin-top: 6px; padding-left: 8px; line-height: 1.6;">
                <span style="color: rgba(255,255,255,0.6); font-size: 10px;">[PTR ${entry.charger.ptrNo}]</span><br/>
                <span style="color: rgba(255,255,255,0.9); font-size: 10px;">
                Max: ${entry.charger.maxVoltage}V @ ${entry.charger.maxVoltageTime}, ${entry.charger.maxLoad}A @ ${entry.charger.maxLoadTime}<br/>
                Min: ${entry.charger.minVoltage}V @ ${entry.charger.minVoltageTime}, ${entry.charger.minLoad}A @ ${entry.charger.minLoadTime}
                </span>
            </div>`;
            dataDisplay += '</div>';
        }
        
        dataDisplay += '</div>';
        
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 12px 10px; font-weight: 600; color: white;">${entry.date || 'N/A'}</td>
                <td style="padding: 12px 10px;"><strong style="color: #60a5fa; font-size: 14px;">${entry.pssStation || 'N/A'}</strong></td>
                <td style="padding: 12px 10px; color: rgba(255,255,255,0.9);">${entry.staffName || 'N/A'}</td>
                <td style="padding: 12px 10px; font-family: monospace; color: rgba(255,255,255,0.8);">${entry.phoneNumber || 'N/A'}</td>
                <td style="padding: 12px 10px;">
                    <div style="font-weight: 700; text-align: center;">
                        <span style="color: #fcd34d; font-size: 14px;">Max: ${totalMaxLoad.toFixed(2)} A</span><br/>
                        <span style="color: #67e8f9; font-size: 14px; margin-top: 4px; display: inline-block;">Min: ${totalMinLoad.toFixed(2)} A</span>
                    </div>
                </td>
                <td style="max-width: 500px; padding: 8px;">
                    ${dataDisplay}
                </td>
                <td style="padding: 12px 10px;">
                    <button class="btn-action" onclick="viewEntryDetails('${entry.id}')" style="background: #3b82f6; display: block; width: 100%; margin-bottom: 6px;">📋 View</button>
                    <button class="btn-action" onclick="deleteEntry('${entry.id}')" style="background: #ef4444; display: block; width: 100%;">🗑️ Delete</button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log(`✅ Displaying ${data.length} comprehensive submissions in Overview`);
}

// Export to Excel/CSV with all 127 columns
async function exportToExcel() {
    try {
        const filterPSS = document.getElementById('filterPSS')?.value || '';
        const filterDate = document.getElementById('filterDate')?.value || '';
        
        let dataToExport = allSubmissionsData;
        
        if (filterPSS) {
            dataToExport = dataToExport.filter(s => s.pssStation === filterPSS);
        }
        
        if (filterDate) {
            dataToExport = dataToExport.filter(s => s.date === filterDate);
        }
        
        if (dataToExport.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Create comprehensive CSV with all 127 columns structure
        const headers = [
            'Timestamp', 'Date', 'PSS Name', 'Staff Name', 'Phone Number',
            // I/C-1 (8 columns)
            'I/C-1 MAX VOLTAGE (KV)', 'I/C-1 MAX VOLTAGE TIME', 'I/C-1 MIN VOLTAGE (KV)', 'I/C-1 MIN VOLTAGE TIME',
            'I/C-1 MAX LOAD (AMP)', 'I/C-1 MAX LOAD TIME', 'I/C-1 MIN LOAD (AMP)', 'I/C-1 MIN LOAD TIME',
            // I/C-2 (8 columns)
            'I/C-2 MAX VOLTAGE (KV)', 'I/C-2 MAX VOLTAGE TIME', 'I/C-2 MIN VOLTAGE (KV)', 'I/C-2 MIN VOLTAGE TIME',
            'I/C-2 MAX LOAD (AMP)', 'I/C-2 MAX LOAD TIME', 'I/C-2 MIN LOAD (AMP)', 'I/C-2 MIN LOAD TIME',
            // PTR-1 33kv (8 columns)
            'PTR-1 33kv MAX VOLTAGE (KV)', 'PTR-1 33kv MAX VOLTAGE TIME', 'PTR-1 33kv MIN VOLTAGE (KV)', 'PTR-1 33kv MIN VOLTAGE TIME',
            'PTR-1 33kv MAX LOAD (AMP)', 'PTR-1 33kv MAX LOAD TIME', 'PTR-1 33kv MIN LOAD (AMP)', 'PTR-1 33kv MIN LOAD TIME',
            // PTR-2 33kv (8 columns)
            'PTR-2 33kv MAX VOLTAGE (KV)', 'PTR-2 33kv MAX VOLTAGE TIME', 'PTR-2 33kv MIN VOLTAGE (KV)', 'PTR-2 33kv MIN VOLTAGE TIME',
            'PTR-2 33kv MAX LOAD (AMP)', 'PTR-2 33kv MAX LOAD TIME', 'PTR-2 33kv MIN LOAD (AMP)', 'PTR-2 33kv MIN LOAD TIME',
            // PTR-1 11kv (8 columns)
            'PTR-1 11kv MAX VOLTAGE (KV)', 'PTR-1 11kv MAX VOLTAGE TIME', 'PTR-1 11kv MIN VOLTAGE (KV)', 'PTR-1 11kv MIN VOLTAGE TIME',
            'PTR-1 11kv MAX LOAD (AMP)', 'PTR-1 11kv MAX LOAD TIME', 'PTR-1 11kv MIN LOAD (AMP)', 'PTR-1 11kv MIN LOAD TIME',
            // PTR-2 11kv (8 columns)
            'PTR-2 11kv MAX VOLTAGE (KV)', 'PTR-2 11kv MAX VOLTAGE TIME', 'PTR-2 11kv MIN VOLTAGE (KV)', 'PTR-2 11kv MIN VOLTAGE TIME',
            'PTR-2 11kv MAX LOAD (AMP)', 'PTR-2 11kv MAX LOAD TIME', 'PTR-2 11kv MIN LOAD (AMP)', 'PTR-2 11kv MIN LOAD TIME'
        ];
        
        // Collect all unique feeder names across all entries
        const allFeeders = new Set();
        dataToExport.forEach(entry => {
            if (entry.feeders) {
                Object.keys(entry.feeders).forEach(f => allFeeders.add(f));
            }
        });
        const feederList = Array.from(allFeeders).sort();
        
        // Add feeder headers (9 columns each: PTR + 8 data fields)
        feederList.forEach(feeder => {
            headers.push(
                `${feeder} PTR NO`,
                `${feeder} MAX VOLTAGE (KV)`, `${feeder} MAX VOLTAGE TIME`,
                `${feeder} MIN VOLTAGE (KV)`, `${feeder} MIN VOLTAGE TIME`,
                `${feeder} MAX LOAD (AMP)`, `${feeder} MAX LOAD TIME`,
                `${feeder} MIN LOAD (AMP)`, `${feeder} MIN LOAD TIME`
            );
        });
        
        // Station Transformer (8 columns)
        headers.push(
            'Station Transformer MAX VOLTAGE (KV)', 'Station Transformer MAX VOLTAGE TIME',
            'Station Transformer MIN VOLTAGE (KV)', 'Station Transformer MIN VOLTAGE TIME',
            'Station Transformer MAX LOAD (AMP)', 'Station Transformer MAX LOAD TIME',
            'Station Transformer MIN LOAD (AMP)', 'Station Transformer MIN LOAD TIME'
        );
        
        // Charger (9 columns)
        headers.push(
            'CHARGER PTR NO',
            'CHARGER 48/24V MAX VOLTAGE (KV)', 'CHARGER 48/24V MAX VOLTAGE TIME',
            'CHARGER 48/24V MIN VOLTAGE (KV)', 'CHARGER 48/24V MIN VOLTAGE TIME',
            'CHARGER 48/24V MAX LOAD (AMP)', 'CHARGER 48/24V MAX LOAD TIME',
            'CHARGER 48/24V MIN LOAD (AMP)', 'CHARGER 48/24V MIN LOAD TIME'
        );
        
        headers.push('Total Max Load (AMP)', 'Total Min Load (AMP)', 'Feeder Count');
        
        const excelData = [headers];
        
        // Add data rows
        dataToExport.forEach(entry => {
            const row = [
                entry.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                entry.date || '',
                entry.pssStation || '',
                entry.staffName || '',
                entry.phoneNumber || '',
                // I/C-1
                entry.ic1?.maxVoltage || '', entry.ic1?.maxVoltageTime || '',
                entry.ic1?.minVoltage || '', entry.ic1?.minVoltageTime || '',
                entry.ic1?.maxLoad || '', entry.ic1?.maxLoadTime || '',
                entry.ic1?.minLoad || '', entry.ic1?.minLoadTime || '',
                // I/C-2
                entry.ic2?.maxVoltage || '', entry.ic2?.maxVoltageTime || '',
                entry.ic2?.minVoltage || '', entry.ic2?.minVoltageTime || '',
                entry.ic2?.maxLoad || '', entry.ic2?.maxLoadTime || '',
                entry.ic2?.minLoad || '', entry.ic2?.minLoadTime || '',
                // PTR-1 33kv
                entry.ptr1_33kv?.maxVoltage || '', entry.ptr1_33kv?.maxVoltageTime || '',
                entry.ptr1_33kv?.minVoltage || '', entry.ptr1_33kv?.minVoltageTime || '',
                entry.ptr1_33kv?.maxLoad || '', entry.ptr1_33kv?.maxLoadTime || '',
                entry.ptr1_33kv?.minLoad || '', entry.ptr1_33kv?.minLoadTime || '',
                // PTR-2 33kv
                entry.ptr2_33kv?.maxVoltage || '', entry.ptr2_33kv?.maxVoltageTime || '',
                entry.ptr2_33kv?.minVoltage || '', entry.ptr2_33kv?.minVoltageTime || '',
                entry.ptr2_33kv?.maxLoad || '', entry.ptr2_33kv?.maxLoadTime || '',
                entry.ptr2_33kv?.minLoad || '', entry.ptr2_33kv?.minLoadTime || '',
                // PTR-1 11kv
                entry.ptr1_11kv?.maxVoltage || '', entry.ptr1_11kv?.maxVoltageTime || '',
                entry.ptr1_11kv?.minVoltage || '', entry.ptr1_11kv?.minVoltageTime || '',
                entry.ptr1_11kv?.maxLoad || '', entry.ptr1_11kv?.maxLoadTime || '',
                entry.ptr1_11kv?.minLoad || '', entry.ptr1_11kv?.minLoadTime || '',
                // PTR-2 11kv
                entry.ptr2_11kv?.maxVoltage || '', entry.ptr2_11kv?.maxVoltageTime || '',
                entry.ptr2_11kv?.minVoltage || '', entry.ptr2_11kv?.minVoltageTime || '',
                entry.ptr2_11kv?.maxLoad || '', entry.ptr2_11kv?.maxLoadTime || '',
                entry.ptr2_11kv?.minLoad || '', entry.ptr2_11kv?.minLoadTime || ''
            ];
            
            // Add feeder data for all feeders
            feederList.forEach(feeder => {
                const feederData = entry.feeders?.[feeder] || {};
                row.push(
                    feederData.ptrNo || '',
                    feederData.maxVoltage || '', feederData.maxVoltageTime || '',
                    feederData.minVoltage || '', feederData.minVoltageTime || '',
                    feederData.maxLoad || '', feederData.maxLoadTime || '',
                    feederData.minLoad || '', feederData.minLoadTime || ''
                );
            });
            
            // Station Transformer
            row.push(
                entry.stationTransformer?.maxVoltage || '', entry.stationTransformer?.maxVoltageTime || '',
                entry.stationTransformer?.minVoltage || '', entry.stationTransformer?.minVoltageTime || '',
                entry.stationTransformer?.maxLoad || '', entry.stationTransformer?.maxLoadTime || '',
                entry.stationTransformer?.minLoad || '', entry.stationTransformer?.minLoadTime || ''
            );
            
            // Charger
            row.push(
                entry.charger?.ptrNo || '',
                entry.charger?.maxVoltage || '', entry.charger?.maxVoltageTime || '',
                entry.charger?.minVoltage || '', entry.charger?.minVoltageTime || '',
                entry.charger?.maxLoad || '', entry.charger?.maxLoadTime || '',
                entry.charger?.minLoad || '', entry.charger?.minLoadTime || ''
            );
            
            row.push(
                entry.totalMaxLoad || 0,
                entry.totalMinLoad || 0,
                entry.feederCount || Object.keys(entry.feeders || {}).length
            );
            
            excelData.push(row);
        });
        
        // Convert to CSV
        const csvContent = excelData.map(row => 
            row.map(cell => {
                // Escape cells containing commas or quotes
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');
        
        // Add BOM for proper Excel UTF-8 encoding
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `PSS_LOADING_DATA_COMPREHENSIVE_${filterPSS || 'All'}_${filterDate || 'All'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('✅ Data exported successfully as ' + filename);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Error exporting data: ' + error.message);
    }
}

// View entry details
function viewEntryDetails(entryId) {
    const entry = allSubmissionsData.find(e => e.id === entryId);
    if (!entry) {
        alert('Entry not found');
        return;
    }
    
    // Create modern modal
    const modal = document.createElement('div');
    modal.id = 'entryDetailsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: #1a1a1a;
        border-radius: 20px;
        width: 100%;
        max-width: 1400px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        color: white;
    `;
    
    // Build modal HTML
    let html = `
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            #entryDetailsModal::-webkit-scrollbar {
                width: 10px;
            }
            #entryDetailsModal::-webkit-scrollbar-track {
                background: #2a2a2a;
                border-radius: 10px;
            }
            #entryDetailsModal::-webkit-scrollbar-thumb {
                background: #5b21b6;
                border-radius: 10px;
            }
            .modal-header-details {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                padding: 24px 32px;
                border-radius: 20px 20px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-title-details {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 26px;
                font-weight: 700;
            }
            .close-modal-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 10px;
                color: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            .close-modal-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }
            .submission-header {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                padding: 20px 32px;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin: 0;
            }
            .header-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .header-icon {
                font-size: 20px;
            }
            .header-content strong {
                display: block;
                font-size: 12px;
                opacity: 0.9;
                font-weight: 500;
            }
            .header-content span {
                display: block;
                font-size: 16px;
                font-weight: 700;
                margin-top: 4px;
            }
            .modal-body-details {
                padding: 32px;
            }
            .data-section {
                margin-bottom: 32px;
            }
            .section-title {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #60a5fa;
            }
            .cards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 16px;
            }
            .data-card {
                background: #2a2a2a;
                border-radius: 12px;
                padding: 20px;
                border: 1px solid #3a3a3a;
            }
            .card-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #e0e0e0;
            }
            .data-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #3a3a3a;
            }
            .data-row:last-child {
                border-bottom: none;
            }
            .data-label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #a0a0a0;
            }
            .data-value {
                font-size: 14px;
                font-weight: 600;
                color: white;
            }
            .indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .indicator-red { background: #ef4444; }
            .indicator-blue { background: #3b82f6; }
            .indicator-orange { background: #f59e0b; }
            .indicator-cyan { background: #06b6d4; }
        </style>
        
        <div class="modal-header-details">
            <div class="modal-title-details">
                📊 Entry Details
            </div>
            <button class="close-modal-btn" onclick="document.getElementById('entryDetailsModal').remove()">✕</button>
        </div>
        
        <div class="submission-header">
            <div class="header-item">
                <div class="header-icon">📅</div>
                <div class="header-content">
                    <strong>Date:</strong>
                    <span>${entry.date}</span>
                </div>
            </div>
            <div class="header-item">
                <div class="header-icon">📍</div>
                <div class="header-content">
                    <strong>PSS Station:</strong>
                    <span>${entry.pssStation}</span>
                </div>
            </div>
            <div class="header-item">
                <div class="header-icon">👤</div>
                <div class="header-content">
                    <strong>Staff:</strong>
                    <span>${entry.staffName}</span>
                </div>
            </div>
            <div class="header-item">
                <div class="header-icon">🕐</div>
                <div class="header-content">
                    <strong>Time:</strong>
                    <span>${entry.timestamp?.toDate?.()?.toLocaleTimeString() || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-body-details">`;
    
    // I/C Sections
    if (entry.ic1 || entry.ic2) {
        html += `
            <div class="data-section">
                <div class="section-title">⚡ INCOMING (I/C) DATA</div>
                <div class="cards-grid">`;
        
        if (entry.ic1) {
            html += `
                <div class="data-card">
                    <div class="card-title">I/C-1</div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-red"></span> Max Voltage:</div>
                        <div class="data-value">${entry.ic1.maxVoltage || 0} kV @ ${entry.ic1.maxVoltageTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-blue"></span> Min Voltage:</div>
                        <div class="data-value">${entry.ic1.minVoltage || 0} kV @ ${entry.ic1.minVoltageTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-orange"></span> Max Load:</div>
                        <div class="data-value">${entry.ic1.maxLoad || 0} A @ ${entry.ic1.maxLoadTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-cyan"></span> Min Load:</div>
                        <div class="data-value">${entry.ic1.minLoad || 0} A @ ${entry.ic1.minLoadTime || '--:--'}</div>
                    </div>
                </div>`;
        }
        
        if (entry.ic2) {
            html += `
                <div class="data-card">
                    <div class="card-title">I/C-2</div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-red"></span> Max Voltage:</div>
                        <div class="data-value">${entry.ic2.maxVoltage || 0} kV @ ${entry.ic2.maxVoltageTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-blue"></span> Min Voltage:</div>
                        <div class="data-value">${entry.ic2.minVoltage || 0} kV @ ${entry.ic2.minVoltageTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-orange"></span> Max Load:</div>
                        <div class="data-value">${entry.ic2.maxLoad || 0} A @ ${entry.ic2.maxLoadTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-cyan"></span> Min Load:</div>
                        <div class="data-value">${entry.ic2.minLoad || 0} A @ ${entry.ic2.minLoadTime || '--:--'}</div>
                    </div>
                </div>`;
        }
        
        html += `</div></div>`;
    }
    
    // PTR Sections
    if (entry.ptr1_33kv || entry.ptr2_33kv || entry.ptr1_11kv || entry.ptr2_11kv) {
        html += `
            <div class="data-section">
                <div class="section-title">🔄 PTR (POWER TRANSFORMER) DATA</div>
                <div class="cards-grid">`;
        
        const ptrData = [
            { key: 'ptr1_33kv', title: 'PTR-1 (33kV)' },
            { key: 'ptr2_33kv', title: 'PTR-2 (33kV)' },
            { key: 'ptr1_11kv', title: 'PTR-1 (11kV)' },
            { key: 'ptr2_11kv', title: 'PTR-2 (11kV)' }
        ];
        
        ptrData.forEach(ptr => {
            if (entry[ptr.key]) {
                html += `
                    <div class="data-card">
                        <div class="card-title">${ptr.title}</div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-red"></span> Max Voltage:</div>
                            <div class="data-value">${entry[ptr.key].maxVoltage || 0} kV @ ${entry[ptr.key].maxVoltageTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-blue"></span> Min Voltage:</div>
                            <div class="data-value">${entry[ptr.key].minVoltage || 0} kV @ ${entry[ptr.key].minVoltageTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-orange"></span> Max Load:</div>
                            <div class="data-value">${entry[ptr.key].maxLoad || 0} A @ ${entry[ptr.key].maxLoadTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-cyan"></span> Min Load:</div>
                            <div class="data-value">${entry[ptr.key].minLoad || 0} A @ ${entry[ptr.key].minLoadTime || '--:--'}</div>
                        </div>
                    </div>`;
            }
        });
        
        html += `</div></div>`;
    }
    
    // Feeders
    if (entry.feeders && Object.keys(entry.feeders).length > 0) {
        html += `
            <div class="data-section">
                <div class="section-title">⚡ FEEDER DATA (${Object.keys(entry.feeders).length} Feeders)</div>
                <div class="cards-grid">`;
        
        Object.entries(entry.feeders).forEach(([name, feeder]) => {
            html += `
                <div class="data-card">
                    <div class="card-title">${name}</div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-red"></span> Max Voltage:</div>
                        <div class="data-value">${feeder.maxVoltage || 0} kV @ ${feeder.maxVoltageTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-blue"></span> Min Voltage:</div>
                        <div class="data-value">${feeder.minVoltage || 0} kV @ ${feeder.minVoltageTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-orange"></span> Max Load:</div>
                        <div class="data-value">${feeder.maxLoad || 0} A @ ${feeder.maxLoadTime || '--:--'}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label"><span class="indicator indicator-cyan"></span> Min Load:</div>
                        <div class="data-value">${feeder.minLoad || 0} A @ ${feeder.minLoadTime || '--:--'}</div>
                    </div>
                </div>`;
        });
        
        html += `</div></div>`;
    }
    
    // Station Transformer
    if (entry.stationTransformer) {
        html += `
            <div class="data-section">
                <div class="section-title">🔋 STATION TRANSFORMER</div>
                <div class="cards-grid">
                    <div class="data-card">
                        <div class="card-title">Station Transformer</div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-red"></span> Max Voltage:</div>
                            <div class="data-value">${entry.stationTransformer.maxVoltage || 0} kV @ ${entry.stationTransformer.maxVoltageTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-blue"></span> Min Voltage:</div>
                            <div class="data-value">${entry.stationTransformer.minVoltage || 0} kV @ ${entry.stationTransformer.minVoltageTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-orange"></span> Max Load:</div>
                            <div class="data-value">${entry.stationTransformer.maxLoad || 0} A @ ${entry.stationTransformer.maxLoadTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-cyan"></span> Min Load:</div>
                            <div class="data-value">${entry.stationTransformer.minLoad || 0} A @ ${entry.stationTransformer.minLoadTime || '--:--'}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    // Charger
    if (entry.charger) {
        html += `
            <div class="data-section">
                <div class="section-title">🔌 CHARGER 48/24V</div>
                <div class="cards-grid">
                    <div class="data-card">
                        <div class="card-title">Charger (PTR ${entry.charger.ptrNo || 'N/A'})</div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-red"></span> Max Voltage:</div>
                            <div class="data-value">${entry.charger.maxVoltage || 0} V @ ${entry.charger.maxVoltageTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-blue"></span> Min Voltage:</div>
                            <div class="data-value">${entry.charger.minVoltage || 0} V @ ${entry.charger.minVoltageTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-orange"></span> Max Load:</div>
                            <div class="data-value">${entry.charger.maxLoad || 0} A @ ${entry.charger.maxLoadTime || '--:--'}</div>
                        </div>
                        <div class="data-row">
                            <div class="data-label"><span class="indicator indicator-cyan"></span> Min Load:</div>
                            <div class="data-value">${entry.charger.minLoad || 0} A @ ${entry.charger.minLoadTime || '--:--'}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    html += `</div>`;
    
    modalContent.innerHTML = html;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Delete entry
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) return;
    
    try {
        await db.collection('daily_entries').doc(entryId).delete();
        alert('✅ Entry deleted successfully');
        await loadAllSubmissions();
    } catch (error) {
        console.error('Delete error:', error);
        alert('❌ Error deleting entry: ' + error.message);
    }
}

// Settings functions
function manageUsers() {
    alert('User Management:\n\nThis feature allows you to:\n- Add new users\n- Edit user details\n- Deactivate/activate users\n- Reset passwords\n\nComing in next update!');
}

function managePSS() {
    alert('PSS Station Management:\n\nThis feature allows you to:\n- Add new PSS stations\n- Edit PSS configuration\n- Update feeder lists\n- Manage staff assignments\n\nComing in next update!');
}

async function backupDatabase() {
    try {
        alert('Creating backup... This may take a few seconds.');
        
        // Export all collections
        const usersSnap = await db.collection('users').get();
        const pssSnap = await db.collection('pss_stations').get();
        const entriesSnap = await db.collection('daily_entries').get();
        
        const backup = {
            exportDate: new Date().toISOString(),
            collections: {
                users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                pss_stations: pssSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                daily_entries: entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            },
            stats: {
                totalUsers: usersSnap.size,
                totalPSS: pssSnap.size,
                totalEntries: entriesSnap.size
            }
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PSS_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`✅ Database backup downloaded!\n\nBackup contains:\n- ${backup.stats.totalUsers} users\n- ${backup.stats.totalPSS} PSS stations\n- ${backup.stats.totalEntries} entries`);
    } catch (error) {
        console.error('Backup error:', error);
        alert('❌ Error creating backup: ' + error.message);
    }
}

function viewLogs() {
    alert('Activity Logs:\n\nView system activity including:\n- User logins\n- Data submissions\n- Admin actions\n- System changes\n\nComing in next update!');
}

// Initialize View tab when clicked
setTimeout(() => {
    const viewTab = document.querySelector('[data-tab="view"]');
    if (viewTab) {
        viewTab.addEventListener('click', () => {
            setTimeout(() => {
                if (allSubmissionsData.length === 0) {
                    loadAllSubmissions();
                }
                // Load Excel-style comprehensive view
                loadViewAllExcelData();
            }, 100);
        });
    }
}, 1000);

// ============================================
// VIEW ALL - EXCEL COMPREHENSIVE FORMAT (127 COLUMNS)
// ============================================

let viewAllFilteredData = [];

async function loadViewAllExcelData() {
    console.log('Loading View All - Master Excel Format...');
    
    if (allSubmissionsData.length === 0) {
        await loadAllSubmissions();
    }
    
    viewAllFilteredData = [...allSubmissionsData];
    
    // Populate filter dropdowns for View All
    populateViewAllFilters();
    
    // Render comprehensive Excel-style table
    renderExcelStyleTable(viewAllFilteredData);
}

function populateViewAllFilters() {
    // PSS Filter
    const viewPssFilter = document.getElementById('viewFilterPSS');
    if (viewPssFilter) {
        const pssStations = [...new Set(allSubmissionsData.map(s => s.pssStation))].filter(Boolean).sort();
        viewPssFilter.innerHTML = '<option value="">All PSS Stations</option>';
        pssStations.forEach(pss => {
            viewPssFilter.innerHTML += `<option value="${pss}">${pss}</option>`;
        });
        
        // Add event listener to update staff dropdown when PSS changes
        viewPssFilter.addEventListener('change', function() {
            updateViewStaffFilterByPSS(this.value);
        });
    }
    
    // Staff Filter
    const viewStaffFilter = document.getElementById('viewFilterStaff');
    if (viewStaffFilter) {
        const staffNames = [...new Set(allSubmissionsData.map(s => s.staffName))].filter(Boolean).sort();
        viewStaffFilter.innerHTML = '<option value="">All Staff</option>';
        staffNames.forEach(staff => {
            viewStaffFilter.innerHTML += `<option value="${staff}">${staff}</option>`;
        });
    }
}

// Update view staff filter based on selected PSS
function updateViewStaffFilterByPSS(selectedPSS) {
    const viewStaffFilter = document.getElementById('viewFilterStaff');
    if (!viewStaffFilter) return;
    
    let staffNames;
    
    if (selectedPSS === '' || !selectedPSS) {
        // If no PSS selected, show all staff
        staffNames = [...new Set(allSubmissionsData.map(s => s.staffName))].filter(Boolean).sort();
    } else {
        // Filter staff by selected PSS
        staffNames = [...new Set(
            allSubmissionsData
                .filter(s => s.pssStation === selectedPSS)
                .map(s => s.staffName)
        )].filter(Boolean).sort();
    }
    
    // Update staff dropdown
    viewStaffFilter.innerHTML = '<option value="">All Staff</option>';
    staffNames.forEach(staff => {
        viewStaffFilter.innerHTML += `<option value="${staff}">${staff}</option>`;
    });
    
    // Trigger filter update
    filterViewAllData();
}

function filterViewAllData() {
    const filterPSS = document.getElementById('viewFilterPSS')?.value || '';
    const filterFromDate = document.getElementById('viewFilterFromDate')?.value || '';
    const filterToDate = document.getElementById('viewFilterToDate')?.value || '';
    const filterStaff = document.getElementById('viewFilterStaff')?.value || '';
    
    let filtered = allSubmissionsData;
    
    if (filterPSS) {
        filtered = filtered.filter(s => s.pssStation === filterPSS);
    }
    
    if (filterFromDate) {
        filtered = filtered.filter(s => s.date >= filterFromDate);
    }
    if (filterToDate) {
        filtered = filtered.filter(s => s.date <= filterToDate);
    }
    
    if (filterStaff) {
        filtered = filtered.filter(s => s.staffName === filterStaff);
    }
    
    viewAllFilteredData = filtered;
    renderExcelStyleTable(viewAllFilteredData);
}

function clearViewFilters() {
    document.getElementById('viewFilterPSS').value = '';
    document.getElementById('viewFilterFromDate').value = '';
    document.getElementById('viewFilterToDate').value = '';
    document.getElementById('viewFilterStaff').value = '';
    
    // Reset staff dropdown to show all staff
    updateViewStaffFilterByPSS('');
}

function renderExcelStyleTable(data) {
    const tbody = document.getElementById('excelDataBody');
    
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="129" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.7);">No data available</td></tr>';
        return;
    }
    
    // Render data rows
    tbody.innerHTML = data.map(entry => {
        let totalMaxLoad = 0;
        let totalMinLoad = 0;
        
        // Calculate totals from feeders
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                totalMaxLoad += parseFloat(feeder.maxLoad || 0);
                totalMinLoad += parseFloat(feeder.minLoad || 0);
            });
        }
        
        let row = `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 10px 8px; font-weight: 600; border: 1px solid rgba(255,255,255,0.08); position: sticky; left: 0; background: rgba(30,41,59,0.95); z-index: 50;">${formatDate(entry.date) || '-'}</td>
                <td style="padding: 10px 8px; font-weight: 700; color: #60a5fa; border: 1px solid rgba(255,255,255,0.08); position: sticky; left: 90px; background: rgba(30,41,59,0.95); z-index: 50;">${entry.pssStation || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid rgba(255,255,255,0.08); position: sticky; left: 220px; background: rgba(30,41,59,0.95); z-index: 50;">${entry.staffName || '-'}</td>
                <td style="padding: 10px 8px; font-family: monospace; border: 1px solid rgba(255,255,255,0.08); position: sticky; left: 340px; background: rgba(30,41,59,0.95); z-index: 50;">${entry.phoneNumber || '-'}</td>
                
                <!-- I/C-1 Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: white;">${entry.ic1?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic1?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: white;">${entry.ic1?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic1?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; font-weight: 600;">${entry.ic1?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic1?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; font-weight: 600;">${entry.ic1?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic1?.minLoadTime || '-'}</td>
                
                <!-- I/C-2 Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: white;">${entry.ic2?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic2?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: white;">${entry.ic2?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic2?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; font-weight: 600;">${entry.ic2?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic2?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: #fca5a5; font-weight: 600;">${entry.ic2?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ic2?.minLoadTime || '-'}</td>
                
                <!-- PTR-1 33kv Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr1_33kv?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_33kv?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr1_33kv?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_33kv?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr1_33kv?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_33kv?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr1_33kv?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_33kv?.minLoadTime || '-'}</td>
                
                <!-- PTR-2 33kv Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr2_33kv?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_33kv?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr2_33kv?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_33kv?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr2_33kv?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_33kv?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr2_33kv?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_33kv?.minLoadTime || '-'}</td>
                
                <!-- PTR-1 11kv Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr1_11kv?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_11kv?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr1_11kv?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_11kv?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr1_11kv?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_11kv?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr1_11kv?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr1_11kv?.minLoadTime || '-'}</td>
                
                <!-- PTR-2 11kv Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr2_11kv?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_11kv?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: white;">${entry.ptr2_11kv?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_11kv?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr2_11kv?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_11kv?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); color: #86efac; font-weight: 600;">${entry.ptr2_11kv?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.ptr2_11kv?.minLoadTime || '-'}</td>
            `;
            
            // Render Feeders (6 feeders, 10 columns each)
            for (let i = 1; i <= 6; i++) {
                const feederKey = `Feeder-${i}`;  // FIXED: Use hyphen, not space
                const feeder = entry.feeders?.[feederKey];
                
                if (feeder) {
                    row += `
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: #93c5fd; font-weight: 600;">${feeder.ptrNo || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: white;">${feeder.maxVoltage || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${feeder.maxVoltageTime || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: white;">${feeder.minVoltage || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${feeder.minVoltageTime || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: #93c5fd; font-weight: 600;">${feeder.maxLoad || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${feeder.maxLoadTime || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: #93c5fd; font-weight: 600;">${feeder.minLoad || '-'}</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${feeder.minLoadTime || '-'}</td>
                    `;
                } else {
                    // Empty cells for missing feeders
                    row += `
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                        <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.05); color: rgba(255,255,255,0.5);">-</td>
                    `;
                }
            }
            
            row += `
                
                <!-- Station Transformer Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); color: white;">${entry.stationTransformer?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.stationTransformer?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); color: white;">${entry.stationTransformer?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.stationTransformer?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); color: #fcd34d; font-weight: 600;">${entry.stationTransformer?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.stationTransformer?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); color: #fcd34d; font-weight: 600;">${entry.stationTransformer?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.stationTransformer?.minLoadTime || '-'}</td>
                
                <!-- Charger Data -->
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); color: #d8b4fe; font-weight: 600;">${entry.charger?.ptrNo || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); color: white;">${entry.charger?.maxVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.charger?.maxVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); color: white;">${entry.charger?.minVoltage || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.charger?.minVoltageTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); color: #d8b4fe; font-weight: 600;">${entry.charger?.maxLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.charger?.maxLoadTime || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); color: #d8b4fe; font-weight: 600;">${entry.charger?.minLoad || '-'}</td>
                <td style="padding: 8px 6px; text-align: center; border: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.05); font-size: 10px; color: rgba(255,255,255,0.8);">${entry.charger?.minLoadTime || '-'}</td>
                
                <!-- Totals -->
                <td style="padding: 10px 8px; text-align: center; font-weight: 700; font-size: 13px; color: #fcd34d; border: 2px solid #f59e0b; background: rgba(245,158,11,0.15);">${totalMaxLoad.toFixed(2)}</td>
                <td style="padding: 10px 8px; text-align: center; font-weight: 700; font-size: 13px; color: #67e8f9; border: 2px solid #06b6d4; background: rgba(6,182,212,0.15);">${totalMinLoad.toFixed(2)}</td>
            </tr>
        `;
        
        return row;
    }).join('');
    
    console.log(`✅ Rendered ${data.length} entries in Excel format (Master View)`);
}

// Export View All to comprehensive Excel
async function exportViewAllToExcel() {
    try {
        const dataToExport = viewAllFilteredData.length > 0 ? viewAllFilteredData : allSubmissionsData;
        
        if (dataToExport.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Create comprehensive CSV with all columns
        const headers = [
            'Timestamp', 'Date', 'PSS Name', 'Staff Name', 'Phone Number',
            // I/C-1 (8 columns)
            '33KV I/C-1  MAX VOLTAGE (KV)', '33KV I/C-1   MAX VOLTAGE (KV) TIME', '33KV I/C-1  MIN VOLTAGE (KV)', '33KV I/C-1  MIN VOLTAGE (KV)  TIME',
            '33KV I/C-1  MAX LOAD (AMP)', '33KV I/C-1  MAX LOAD (AMP)  TIME', '33KV I/C-1  MIN LOAD (AMP)', '33KV I/C-1  MIN LOAD (AMP)  TIME',
            // I/C-2 (8 columns)
            '33KV I/C-2   MAX VOLTAGE (KV)', '33KV I/C-2   MAX VOLTAGE (KV) TIME', '33KV I/C-2   MIN VOLTAGE (KV)', '33KV I/C-2   MIN VOLTAGE (KV)  TIME',
            '33KV I/C-2   MAX LOAD (AMP)', '33KV I/C-2   MAX LOAD (AMP)  TIME', '33KV I/C-2   MIN LOAD (AMP)', '33KV I/C-2   MIN LOAD (AMP)  TIME',
            // PTR-1 33kv (8 columns)
            'PTR-1 33kv  MAX VOLTAGE (KV)', 'PTR-1 33kv  MAX VOLTAGE (KV) TIME', 'PTR-1 33kv  MIN VOLTAGE (KV)', 'PTR-1 33kv  MIN VOLTAGE (KV)  TIME',
            'PTR-1 33kv  MAX LOAD (AMP)', 'PTR-1 33kv  MAX LOAD (AMP)  TIME', 'PTR-1 33kv  MIN LOAD (AMP)', 'PTR-1 33kv  MIN LOAD (AMP)  TIME',
            // PTR-2 33kv (8 columns)
            'PTR-2 33kv  MAX VOLTAGE (KV)', 'PTR-2 33kv  MAX VOLTAGE (KV) TIME', 'PTR-2 33kv  MIN VOLTAGE (KV)', 'PTR-2 33kv  MIN VOLTAGE (KV)  TIME',
            'PTR-2 33kv  MAX LOAD (AMP)', 'PTR-2 33kv  MAX LOAD (AMP)  TIME', 'PTR-2 33kv  MIN LOAD (AMP)', 'PTR-2 33kv  MIN LOAD (AMP)  TIME',
            // PTR-1 11kv (8 columns)
            'PTR-1 11kv  MAX VOLTAGE (KV)', 'PTR-1 11kv   MAX VOLTAGE (KV) TIME', 'PTR-1 11kv   MIN VOLTAGE (KV)', 'PTR-1 11kv   MIN VOLTAGE (KV)  TIME',
            'PTR-1 11kv   MAX LOAD (AMP)', 'PTR-1 11kv   MAX LOAD (AMP)  TIME', 'PTR-1 11kv   MIN LOAD (AMP)', 'PTR-1 11kv   MIN LOAD (AMP)  TIME',
            // PTR-2 11kv (8 columns)
            'PTR-2 11kv  MAX VOLTAGE (KV)', 'PTR-2 11kv  MAX VOLTAGE (KV) TIME', 'PTR-2 11kv  MIN VOLTAGE (KV)', 'PTR-2 11kv  MIN VOLTAGE (KV)  TIME',
            'PTR-2 11kv  MAX LOAD (AMP)', 'PTR-2 11kv  MAX LOAD (AMP)  TIME', 'PTR-2 11kv  MIN LOAD (AMP)', 'MIN LOAD (AMP)  TIME',
            // Feeders (6 feeders × 9 columns = 54 columns)
            'PTR no (F1)', 'Feeder-1  MAX VOLTAGE (KV)', 'Feeder-1  MAX VOLTAGE (KV) TIME', 'Feeder-1  MIN VOLTAGE (KV)', 'Feeder-1  MIN VOLTAGE (KV)  TIME', 'Feeder-1  MAX LOAD (AMP)', 'Feeder-1  MAX LOAD (AMP)  TIME', 'Feeder-1  MIN LOAD (AMP)', 'Feeder-1  MIN LOAD (AMP)  TIME',
            'PTR no (F2)', 'Feeder-2  MAX VOLTAGE (KV)', 'Feeder-2  MAX VOLTAGE (KV) TIME', 'Feeder-2  MIN VOLTAGE (KV)', 'Feeder-2  MIN VOLTAGE (KV)  TIME', 'Feeder-2  MAX LOAD (AMP)', 'Feeder-2  MAX LOAD (AMP)  TIME', 'Feeder-2  MIN LOAD (AMP)', 'Feeder-2  MIN LOAD (AMP)  TIME',
            'PTR no (F3)', 'Feeder-3  MAX VOLTAGE (KV)', 'Feeder-3  MAX VOLTAGE (KV) TIME', 'Feeder-3  MIN VOLTAGE (KV)', 'Feeder-3  MIN VOLTAGE (KV)  TIME', 'Feeder-3  MAX LOAD (AMP)', 'Feeder-3  MAX LOAD (AMP)  TIME', 'Feeder-3  MIN LOAD (AMP)', 'Feeder-3  MIN LOAD (AMP)  TIME',
            'PTR no (F4)', 'Feeder-4  MAX VOLTAGE (KV)', 'Feeder-4  MAX VOLTAGE (KV) TIME', 'Feeder-4  MIN VOLTAGE (KV)', 'Feeder-4  MIN VOLTAGE (KV)  TIME', 'Feeder-4  MAX LOAD (AMP)', 'Feeder-4  MAX LOAD (AMP)  TIME', 'Feeder-4  MIN LOAD (AMP)', 'Feeder-4  MIN LOAD (AMP)  TIME',
            'PTR no (F5)', 'Feeder-5  MAX VOLTAGE (KV)', 'Feeder-5  MAX VOLTAGE (KV) TIME', 'Feeder-5  MIN VOLTAGE (KV)', 'Feeder-5  MIN VOLTAGE (KV)  TIME', 'Feeder-5  MAX LOAD (AMP)', 'Feeder-5  MAX LOAD (AMP)  TIME', 'Feeder-5  MIN LOAD (AMP)', 'Feeder-5  MIN LOAD (AMP)  TIME',
            'PTR no (F6)', 'Feeder-6  MAX VOLTAGE (KV)', 'Feeder-6  MAX VOLTAGE (KV) TIME', 'Feeder-6  MIN VOLTAGE (KV)', 'Feeder-6  MIN VOLTAGE (KV)  TIME', 'Feeder-6  MAX LOAD (AMP)', 'Feeder-6  MAX LOAD (AMP)  TIME', 'Feeder-6  MIN LOAD (AMP)', 'Feeder-6  MIN LOAD (AMP)  TIME',
            // Station Transformer (8 columns)
            'Station Transformer   MAX VOLTAGE (KV)', 'Station Transformer   MAX VOLTAGE (KV) TIME',
            'Station Transformer   MIN VOLTAGE (KV)', 'Station Transformer   MIN VOLTAGE (KV)  TIME',
            'Station Transformer   MAX LOAD (AMP)', 'Station Transformer   MAX LOAD (AMP)  TIME',
            'Station Transformer   MIN LOAD (AMP)', 'MIN LOAD (AMP)  TIME',
            // Charger (9 columns)
            'PTR no (Charger)',
            'CHARGER 48/24V  MAX VOLTAGE (KV)', 'CHARGER 48/24V  MAX VOLTAGE (KV) TIME',
            'CHARGER 48/24V  MIN VOLTAGE (KV)', 'CHARGER 48/24V  MIN VOLTAGE (KV)  TIME',
            'CHARGER 48/24V  MAX LOAD (AMP)', 'CHARGER 48/24V  MAX LOAD (AMP)  TIME',
            'CHARGER 48/24V  LOAD (AMP)', 'CHARGER 48/24V  MIN LOAD (AMP)  TIME',
            'Total Max Load (AMP)', 'Total Min Load (AMP)'
        ];
        
        const excelData = [headers];
        
        // Add data rows
        dataToExport.forEach(entry => {
            let totalMaxLoad = 0;
            let totalMinLoad = 0;
            
            if (entry.feeders) {
                Object.values(entry.feeders).forEach(feeder => {
                    totalMaxLoad += parseFloat(feeder.maxLoad || 0);
                    totalMinLoad += parseFloat(feeder.minLoad || 0);
                });
            }
            
            const row = [
                entry.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                entry.date || '',
                entry.pssStation || '',
                entry.staffName || '',
                entry.phoneNumber || '',
                // I/C-1
                entry.ic1?.maxVoltage || '', entry.ic1?.maxVoltageTime || '',
                entry.ic1?.minVoltage || '', entry.ic1?.minVoltageTime || '',
                entry.ic1?.maxLoad || '', entry.ic1?.maxLoadTime || '',
                entry.ic1?.minLoad || '', entry.ic1?.minLoadTime || '',
                // I/C-2
                entry.ic2?.maxVoltage || '', entry.ic2?.maxVoltageTime || '',
                entry.ic2?.minVoltage || '', entry.ic2?.minVoltageTime || '',
                entry.ic2?.maxLoad || '', entry.ic2?.maxLoadTime || '',
                entry.ic2?.minLoad || '', entry.ic2?.minLoadTime || '',
                // PTR-1 33kv
                entry.ptr1_33kv?.maxVoltage || '', entry.ptr1_33kv?.maxVoltageTime || '',
                entry.ptr1_33kv?.minVoltage || '', entry.ptr1_33kv?.minVoltageTime || '',
                entry.ptr1_33kv?.maxLoad || '', entry.ptr1_33kv?.maxLoadTime || '',
                entry.ptr1_33kv?.minLoad || '', entry.ptr1_33kv?.minLoadTime || '',
                // PTR-2 33kv
                entry.ptr2_33kv?.maxVoltage || '', entry.ptr2_33kv?.maxVoltageTime || '',
                entry.ptr2_33kv?.minVoltage || '', entry.ptr2_33kv?.minVoltageTime || '',
                entry.ptr2_33kv?.maxLoad || '', entry.ptr2_33kv?.maxLoadTime || '',
                entry.ptr2_33kv?.minLoad || '', entry.ptr2_33kv?.minLoadTime || '',
                // PTR-1 11kv
                entry.ptr1_11kv?.maxVoltage || '', entry.ptr1_11kv?.maxVoltageTime || '',
                entry.ptr1_11kv?.minVoltage || '', entry.ptr1_11kv?.minVoltageTime || '',
                entry.ptr1_11kv?.maxLoad || '', entry.ptr1_11kv?.maxLoadTime || '',
                entry.ptr1_11kv?.minLoad || '', entry.ptr1_11kv?.minLoadTime || '',
                // PTR-2 11kv
                entry.ptr2_11kv?.maxVoltage || '', entry.ptr2_11kv?.maxVoltageTime || '',
                entry.ptr2_11kv?.minVoltage || '', entry.ptr2_11kv?.minVoltageTime || '',
                entry.ptr2_11kv?.maxLoad || '', entry.ptr2_11kv?.maxLoadTime || '',
                entry.ptr2_11kv?.minLoad || '', entry.ptr2_11kv?.minLoadTime || ''
            ];
            
            // Add feeder data (6 feeders × 10 columns = 60 columns)
            for (let i = 1; i <= 6; i++) {
                const feederKey = `Feeder-${i}`;
                const feeder = entry.feeders?.[feederKey];
                
                if (feeder) {
                    row.push(
                        feeder.ptrNo || '',
                        feeder.maxVoltage || '',
                        feeder.maxVoltageTime || '',
                        feeder.minVoltage || '',
                        feeder.minVoltageTime || '',
                        feeder.maxLoad || '',
                        feeder.maxLoadTime || '',
                        feeder.minLoad || '',
                        feeder.minLoadTime || ''
                    );
                } else {
                    // Empty feeder data
                    row.push('', '', '', '', '', '', '', '', '');
                }
            }
            
            // Add remaining equipment data
            row.push(
                // Station Transformer
                entry.stationTransformer?.maxVoltage || '', entry.stationTransformer?.maxVoltageTime || '',
                entry.stationTransformer?.minVoltage || '', entry.stationTransformer?.minVoltageTime || '',
                entry.stationTransformer?.maxLoad || '', entry.stationTransformer?.maxLoadTime || '',
                entry.stationTransformer?.minLoad || '', entry.stationTransformer?.minLoadTime || '',
                // Charger
                entry.charger?.ptrNo || '',
                entry.charger?.maxVoltage || '', entry.charger?.maxVoltageTime || '',
                entry.charger?.minVoltage || '', entry.charger?.minVoltageTime || '',
                entry.charger?.maxLoad || '', entry.charger?.maxLoadTime || '',
                entry.charger?.minLoad || '', entry.charger?.minLoadTime || '',
                // Totals
                totalMaxLoad.toFixed(2),
                totalMinLoad.toFixed(2)
            );
            
            excelData.push(row);
        });
        
        // Convert to CSV
        const csvContent = excelData.map(row => 
            row.map(cell => {
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');
        
        // Download
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `PSS_MASTER_EXCEL_${new Date().toISOString().split('T')[0]}.csv`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('✅ Master Excel data exported successfully!');
        
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Error exporting data: ' + error.message);
    }
}

// Export new functions
window.filterViewAllData = filterViewAllData;
window.clearViewFilters = clearViewFilters;
window.exportViewAllToExcel = exportViewAllToExcel;
window.loadViewAllExcelData = loadViewAllExcelData;

// Export new functions
window.filterData = filterData;
window.clearAdminFilters = clearAdminFilters;
window.exportToExcel = exportToExcel;
window.viewEntryDetails = viewEntryDetails;

// ============================================
// DOWNLOAD LATEST TEMPLATE FUNCTION
// ============================================

async function downloadLatestTemplate() {
    try {
        // Get current logged-in user's phone number
        const currentUserPhone = appState.currentUser?.phoneNumber || firebase.auth().currentUser?.phoneNumber;
        
        if (!currentUserPhone) {
            alert('❌ Please login first to download your data.');
            return;
        }
        
        // Fetch user's latest submission from Firestore
        console.log('Fetching latest data for user:', currentUserPhone);
        
        const snapshot = await db.collection('daily_entries')
            .where('phoneNumber', '==', currentUserPhone)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            alert('❌ No data found for your account. Please submit data first.');
            return;
        }
        
        const latestSubmission = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        console.log('Latest submission found:', latestSubmission);
        
        // Format date as dd-mm-yyyy
        const formatDateForExcel = (dateStr) => {
            if (!dateStr) return '';
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };
        
        // Create Excel data structure (129 columns total)
        const excelData = [];
        
        // Header row
        const headers = [
            'Date', 'PSS_Name', 'Staff_Name', 'Phone',
            // I/C-1 33KV (8 columns)
            'IC1_PTR', 'IC1_Max_V', 'IC1_Max_V_Time', 'IC1_Min_V', 'IC1_Min_V_Time', 'IC1_Max_I', 'IC1_Max_I_Time', 'IC1_Min_I', 'IC1_Min_I_Time',
            // I/C-2 33KV (8 columns)
            'IC2_PTR', 'IC2_Max_V', 'IC2_Max_V_Time', 'IC2_Min_V', 'IC2_Min_V_Time', 'IC2_Max_I', 'IC2_Max_I_Time', 'IC2_Min_I', 'IC2_Min_I_Time',
            // PTR-1 33KV (8 columns)
            'PTR1_33_PTR', 'PTR1_33_Max_V', 'PTR1_33_Max_V_Time', 'PTR1_33_Min_V', 'PTR1_33_Min_V_Time', 'PTR1_33_Max_I', 'PTR1_33_Max_I_Time', 'PTR1_33_Min_I', 'PTR1_33_Min_I_Time',
            // PTR-2 33KV (8 columns)
            'PTR2_33_PTR', 'PTR2_33_Max_V', 'PTR2_33_Max_V_Time', 'PTR2_33_Min_V', 'PTR2_33_Min_V_Time', 'PTR2_33_Max_I', 'PTR2_33_Max_I_Time', 'PTR2_33_Min_I', 'PTR2_33_Min_I_Time',
            // PTR-1 11KV (8 columns)
            'PTR1_11_PTR', 'PTR1_11_Max_V', 'PTR1_11_Max_V_Time', 'PTR1_11_Min_V', 'PTR1_11_Min_V_Time', 'PTR1_11_Max_I', 'PTR1_11_Max_I_Time', 'PTR1_11_Min_I', 'PTR1_11_Min_I_Time',
            // PTR-2 11KV (8 columns)
            'PTR2_11_PTR', 'PTR2_11_Max_V', 'PTR2_11_Max_V_Time', 'PTR2_11_Min_V', 'PTR2_11_Min_V_Time', 'PTR2_11_Max_I', 'PTR2_11_Max_I_Time', 'PTR2_11_Min_I', 'PTR2_11_Min_I_Time'
        ];
        
        // Add Feeder headers (6 feeders × 10 columns each = 60 columns)
        for (let i = 1; i <= 6; i++) {
            headers.push(
                `F${i}_Name`, `F${i}_PTR`, `F${i}_Max_V`, `F${i}_Max_V_Time`, `F${i}_Min_V`, `F${i}_Min_V_Time`,
                `F${i}_Max_I`, `F${i}_Max_I_Time`, `F${i}_Min_I`, `F${i}_Min_I_Time`
            );
        }
        
        // Add remaining equipment headers (3 × 8 columns = 24 columns)
        headers.push(
            // Station Transformer
            'ST_PTR', 'ST_Max_V', 'ST_Max_V_Time', 'ST_Min_V', 'ST_Min_V_Time', 'ST_Max_I', 'ST_Max_I_Time', 'ST_Min_I', 'ST_Min_I_Time',
            // Charger
            'Charger_PTR', 'Charger_Max_V', 'Charger_Max_V_Time', 'Charger_Min_V', 'Charger_Min_V_Time', 'Charger_Max_I', 'Charger_Max_I_Time', 'Charger_Min_I', 'Charger_Min_I_Time',
            // Capacitor Bank
            'CB_PTR', 'CB_Max_V', 'CB_Max_V_Time', 'CB_Min_V', 'CB_Min_V_Time', 'CB_Max_I', 'CB_Max_I_Time', 'CB_Min_I', 'CB_Min_I_Time'
        );
        
        excelData.push(headers);
        
        // Data row from Firestore
        const row = [
            formatDateForExcel(latestSubmission.date || new Date().toISOString().split('T')[0]),
            latestSubmission.pssName || latestSubmission.pssStation || '',
            latestSubmission.staffName || latestSubmission.personnelName || appState.currentUser.name || '',
            currentUserPhone
        ];
        
        // Helper to get equipment data
        const getEquipmentData = (equipment) => {
            if (!equipment) return ['', '', '', '', '', '', '', '', ''];
            return [
                equipment.ptr || '',
                equipment.maxVoltage || '',
                equipment.maxVoltageTime || '',
                equipment.minVoltage || '',
                equipment.minVoltageTime || '',
                equipment.maxCurrent || '',
                equipment.maxCurrentTime || '',
                equipment.minCurrent || '',
                equipment.minCurrentTime || ''
            ];
        };
        
        // Add I/C data
        row.push(...getEquipmentData(latestSubmission.ic1));
        row.push(...getEquipmentData(latestSubmission.ic2));
        
        // Add PTR data
        row.push(...getEquipmentData(latestSubmission.ptr1_33kv));
        row.push(...getEquipmentData(latestSubmission.ptr2_33kv));
        row.push(...getEquipmentData(latestSubmission.ptr1_11kv));
        row.push(...getEquipmentData(latestSubmission.ptr2_11kv));
        
        // Add Feeder data
        for (let i = 1; i <= 6; i++) {
            const feeder = latestSubmission.feeders?.[`feeder${i}`];
            if (feeder) {
                row.push(
                    feeder.name || '',
                    feeder.ptr || '',
                    feeder.maxVoltage || '',
                    feeder.maxVoltageTime || '',
                    feeder.minVoltage || '',
                    feeder.minVoltageTime || '',
                    feeder.maxCurrent || '',
                    feeder.maxCurrentTime || '',
                    feeder.minCurrent || '',
                    feeder.minCurrentTime || ''
                );
            } else {
                row.push('', '', '', '', '', '', '', '', '', '');
            }
        }
        
        // Add remaining equipment data
        row.push(...getEquipmentData(latestSubmission.stationTransformer));
        row.push(...getEquipmentData(latestSubmission.charger));
        row.push(...getEquipmentData(latestSubmission.capacitorBank));
        
        excelData.push(row);
        
        // Convert to CSV
        const csvContent = excelData.map(row => 
            row.map(cell => {
                const str = String(cell || '');
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        ).join('\n');
        
        // Create download
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const pssName = latestSubmission.pssName || latestSubmission.pssStation || 'Unknown';
        const dateStr = formatDateForExcel(latestSubmission.date || new Date().toISOString().split('T')[0]);
        const filename = `PSS_Template_${pssName}_${dateStr}.csv`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`✅ Template downloaded successfully!\n\n📋 File: ${filename}\n📊 Contains: ${headers.length} columns\n📅 Date: ${dateStr}\n🏢 PSS: ${pssName}\n👤 Your Name: ${row[2]}\n📞 Your Phone: ${currentUserPhone}\n\n💡 Instructions:\n1. Open the file in Excel\n2. Edit ONLY the values you want to change\n3. Keep date format: dd-mm-yyyy\n4. Save and re-upload\n5. System will update only changed values!`);
        
    } catch (error) {
        console.error('Download error:', error);
        
        if (error.code === 'permission-denied') {
            alert('❌ Permission denied. Please check:\n1. You are logged in\n2. Firestore rules allow reading your data\n3. You have submitted data before');
        } else if (error.code === 'failed-precondition') {
            alert('❌ Database index required. Please create index for:\nCollection: daily_entries\nFields: phoneNumber (asc), timestamp (desc)');
        } else {
            alert('❌ Error downloading template: ' + error.message);
        }
    }
}

window.downloadLatestTemplate = downloadLatestTemplate;

// ============================================
// DOWNLOAD PSS STATIONS TEMPLATE
// ============================================

async function downloadPSSStationsTemplate() {
    try {
        // Get all PSS stations from Firestore
        const pssSnapshot = await db.collection('pss_stations').get();
        
        if (pssSnapshot.empty) {
            alert('❌ No PSS stations found in database.');
            return;
        }
        
        const excelData = [];
        
        // Header row
        const headers = [
            'PSS_ID', 'PSS_Name', 'Address', 'Phone', 'Staff_Name', 'Staff_Phone', 
            'Division', 'Sub_Division', 'Status', 'Notes'
        ];
        excelData.push(headers);
        
        // Data rows
        pssSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const row = [
                doc.id,
                data.name || '',
                data.address || '',
                data.phone || '',
                data.staffName || '',
                data.staffPhone || '',
                data.division || '',
                data.subDivision || '',
                data.status || 'active',
                data.notes || ''
            ];
            excelData.push(row);
        });
        
        // Convert to CSV
        const csvContent = excelData.map(row => 
            row.map(cell => {
                const str = String(cell || '');
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        ).join('\n');
        
        // Create download
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        a.download = `PSS_Stations_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`✅ PSS Stations template downloaded!\n\n📊 Total: ${pssSnapshot.docs.length} PSS stations\n\nYou can now:\n1. Edit PSS names, phone numbers, staff names\n2. Update addresses or divisions\n3. Save and re-upload\n4. System will update only changed fields!`);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Error downloading PSS stations: ' + error.message);
    }
}

// ============================================
// DOWNLOAD USERS TEMPLATE
// ============================================

async function downloadUsersTemplate() {
    try {
        // Get all users from Firestore
        const usersSnapshot = await db.collection('users').get();
        
        if (usersSnapshot.empty) {
            alert('❌ No users found in database.');
            return;
        }
        
        const excelData = [];
        
        // Header row
        const headers = [
            'Phone_Number', 'Name', 'Email', 'Role', 'PSS_Name', 'Division', 
            'Status', 'Created_Date', 'Last_Login', 'Notes'
        ];
        excelData.push(headers);
        
        // Format date helper
        const formatDateForExcel = (timestamp) => {
            if (!timestamp) return '';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };
        
        // Data rows
        usersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const row = [
                doc.id, // Phone number is the document ID
                data.name || '',
                data.email || '',
                data.role || 'user',
                data.pss || '',
                data.division || '',
                data.status || 'active',
                formatDateForExcel(data.createdAt),
                formatDateForExcel(data.lastLogin),
                data.notes || ''
            ];
            excelData.push(row);
        });
        
        // Convert to CSV
        const csvContent = excelData.map(row => 
            row.map(cell => {
                const str = String(cell || '');
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        ).join('\n');
        
        // Create download
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        a.download = `Users_Data_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`✅ Users template downloaded!\n\n👥 Total: ${usersSnapshot.docs.length} users\n\nYou can now:\n1. Edit staff names\n2. Update phone numbers (carefully!)\n3. Change roles or PSS assignments\n4. Save and re-upload\n5. System will update only changed fields!`);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Error downloading users: ' + error.message);
    }
}

// ============================================
// DOWNLOAD LATEST SUBMISSION TEMPLATE
// ============================================

async function downloadLatestSubmissionTemplate() {
    try {
        if (!allSubmissionsData || allSubmissionsData.length === 0) {
            alert('❌ No submissions found. Please wait for data to load.');
            return;
        }
        
        // Get the latest submission (already sorted by timestamp desc)
        const latestSubmission = allSubmissionsData[0];
        
        // Format date as dd-mm-yyyy
        const formatDateForExcel = (dateStr) => {
            if (!dateStr) return '';
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };
        
        // Create Excel data structure (129 columns total)
        const excelData = [];
        
        // Header row
        const headers = [
            'Date', 'PSS_Name', 'Staff_Name', 'Phone',
            // I/C-1 33KV (9 columns - added PTR field)
            'IC1_PTR', 'IC1_Max_V', 'IC1_Max_V_Time', 'IC1_Min_V', 'IC1_Min_V_Time', 'IC1_Max_I', 'IC1_Max_I_Time', 'IC1_Min_I', 'IC1_Min_I_Time',
            // I/C-2 33KV (9 columns)
            'IC2_PTR', 'IC2_Max_V', 'IC2_Max_V_Time', 'IC2_Min_V', 'IC2_Min_V_Time', 'IC2_Max_I', 'IC2_Max_I_Time', 'IC2_Min_I', 'IC2_Min_I_Time',
            // PTR-1 33KV (9 columns)
            'PTR1_33_PTR', 'PTR1_33_Max_V', 'PTR1_33_Max_V_Time', 'PTR1_33_Min_V', 'PTR1_33_Min_V_Time', 'PTR1_33_Max_I', 'PTR1_33_Max_I_Time', 'PTR1_33_Min_I', 'PTR1_33_Min_I_Time',
            // PTR-2 33KV (9 columns)
            'PTR2_33_PTR', 'PTR2_33_Max_V', 'PTR2_33_Max_V_Time', 'PTR2_33_Min_V', 'PTR2_33_Min_V_Time', 'PTR2_33_Max_I', 'PTR2_33_Max_I_Time', 'PTR2_33_Min_I', 'PTR2_33_Min_I_Time',
            // PTR-1 11KV (9 columns)
            'PTR1_11_PTR', 'PTR1_11_Max_V', 'PTR1_11_Max_V_Time', 'PTR1_11_Min_V', 'PTR1_11_Min_V_Time', 'PTR1_11_Max_I', 'PTR1_11_Max_I_Time', 'PTR1_11_Min_I', 'PTR1_11_Min_I_Time',
            // PTR-2 11KV (9 columns)
            'PTR2_11_PTR', 'PTR2_11_Max_V', 'PTR2_11_Max_V_Time', 'PTR2_11_Min_V', 'PTR2_11_Min_V_Time', 'PTR2_11_Max_I', 'PTR2_11_Max_I_Time', 'PTR2_11_Min_I', 'PTR2_11_Min_I_Time'
        ];
        
        // Add Feeder headers (6 feeders × 10 columns each = 60 columns)
        for (let i = 1; i <= 6; i++) {
            headers.push(
                `F${i}_Name`, `F${i}_PTR`, `F${i}_Max_V`, `F${i}_Max_V_Time`, `F${i}_Min_V`, `F${i}_Min_V_Time`,
                `F${i}_Max_I`, `F${i}_Max_I_Time`, `F${i}_Min_I`, `F${i}_Min_I_Time`
            );
        }
        
        // Add remaining equipment headers (3 × 9 columns = 27 columns)
        headers.push(
            // Station Transformer
            'ST_PTR', 'ST_Max_V', 'ST_Max_V_Time', 'ST_Min_V', 'ST_Min_V_Time', 'ST_Max_I', 'ST_Max_I_Time', 'ST_Min_I', 'ST_Min_I_Time',
            // Charger
            'Charger_PTR', 'Charger_Max_V', 'Charger_Max_V_Time', 'Charger_Min_V', 'Charger_Min_V_Time', 'Charger_Max_I', 'Charger_Max_I_Time', 'Charger_Min_I', 'Charger_Min_I_Time',
            // Capacitor Bank
            'CB_PTR', 'CB_Max_V', 'CB_Max_V_Time', 'CB_Min_V', 'CB_Min_V_Time', 'CB_Max_I', 'CB_Max_I_Time', 'CB_Min_I', 'CB_Min_I_Time'
        );
        
        excelData.push(headers);
        
        // Data row
        const row = [
            formatDateForExcel(latestSubmission.date),
            latestSubmission.pssName || '',
            latestSubmission.staffName || '',
            latestSubmission.phoneNumber || ''
        ];
        
        // Helper to get equipment data
        const getEquipmentData = (equipment) => {
            if (!equipment) return ['', '', '', '', '', '', '', '', ''];
            return [
                equipment.ptr || '',
                equipment.maxVoltage || '',
                equipment.maxVoltageTime || '',
                equipment.minVoltage || '',
                equipment.minVoltageTime || '',
                equipment.maxCurrent || '',
                equipment.maxCurrentTime || '',
                equipment.minCurrent || '',
                equipment.minCurrentTime || ''
            ];
        };
        
        // Add I/C data
        row.push(...getEquipmentData(latestSubmission.ic1));
        row.push(...getEquipmentData(latestSubmission.ic2));
        
        // Add PTR data
        row.push(...getEquipmentData(latestSubmission.ptr1_33kv));
        row.push(...getEquipmentData(latestSubmission.ptr2_33kv));
        row.push(...getEquipmentData(latestSubmission.ptr1_11kv));
        row.push(...getEquipmentData(latestSubmission.ptr2_11kv));
        
        // Add Feeder data
        for (let i = 1; i <= 6; i++) {
            const feeder = latestSubmission.feeders?.[`feeder${i}`];
            if (feeder) {
                row.push(
                    feeder.name || '',
                    feeder.ptr || '',
                    feeder.maxVoltage || '',
                    feeder.maxVoltageTime || '',
                    feeder.minVoltage || '',
                    feeder.minVoltageTime || '',
                    feeder.maxCurrent || '',
                    feeder.maxCurrentTime || '',
                    feeder.minCurrent || '',
                    feeder.minCurrentTime || ''
                );
            } else {
                row.push('', '', '', '', '', '', '', '', '', '');
            }
        }
        
        // Add remaining equipment data
        row.push(...getEquipmentData(latestSubmission.stationTransformer));
        row.push(...getEquipmentData(latestSubmission.charger));
        row.push(...getEquipmentData(latestSubmission.capacitorBank));
        
        excelData.push(row);
        
        // Convert to CSV
        const csvContent = excelData.map(row => 
            row.map(cell => {
                const str = String(cell || '');
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        ).join('\n');
        
        // Create download
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `Submission_${latestSubmission.pssName || 'Unknown'}_${formatDateForExcel(latestSubmission.date)}.csv`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`✅ Latest submission downloaded!\n\n📋 File: ${filename}\n📊 Columns: ${headers.length}\n📅 Date: ${formatDateForExcel(latestSubmission.date)}\n🏢 PSS: ${latestSubmission.pssName}\n👤 Staff: ${latestSubmission.staffName}\n\nYou can now:\n1. Edit equipment values\n2. Update readings\n3. Save and re-upload\n4. System will update only changed fields!`);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Error downloading submission: ' + error.message);
    }
}

window.downloadPSSStationsTemplate = downloadPSSStationsTemplate;
window.downloadUsersTemplate = downloadUsersTemplate;
window.downloadLatestSubmissionTemplate = downloadLatestSubmissionTemplate;
window.deleteEntry = deleteEntry;
window.manageUsers = manageUsers;
window.managePSS = managePSS;
window.backupDatabase = backupDatabase;
window.viewLogs = viewLogs;

// ===============================================
// INLINE EDITABLE TABLE FUNCTIONS FOR BACKEND DATA
// ===============================================

// Switch between PSS Admin and PSS Details tabs
function switchDataType(type) {
    // Update tab active state
    document.querySelectorAll('.data-type-tab').forEach(tab => {
        if (tab.dataset.type === type) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show/hide sections
    document.querySelectorAll('.data-section').forEach(section => {
        if (section.id === `${type}-section`) {
            section.style.display = 'block';
            section.classList.add('active');
        } else {
            section.style.display = 'none';
            section.classList.remove('active');
        }
    });
}

// Load PSS Admin Contact Data (Sheet1 structure: PSS Name | Phone Number)
async function loadPSSAdminData() {
    try {
        console.log('Loading PSS Admin Data...');
        const snapshot = await db.collection('pss_stations').orderBy('name').get();
        const tbody = document.getElementById('pss-admin-tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">No PSS admin data found. Add PSS stations first.</td></tr>';
            document.getElementById('pss-admin-table-container').style.display = 'block';
            document.getElementById('pss-admin-status').style.display = 'block';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.dataset.id = doc.id;
            row.dataset.originalName = data.name || '';
            row.dataset.originalPhone = data.phoneNumber || '';
            
            row.innerHTML = `
                <td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <input type="text" class="editable-cell" value="${data.name || ''}" data-field="name" data-original="${data.name || ''}">
                </td>
                <td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <input type="text" class="editable-cell" value="${data.phoneNumber || ''}" data-field="phoneNumber" data-original="${data.phoneNumber || ''}">
                </td>
                <td class="modified-marker" style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <span style="opacity: 0;">●</span>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('pss-admin-table-container').style.display = 'block';
        document.getElementById('pss-admin-status').style.display = 'block';
        
        // Track changes
        document.querySelectorAll('#pss-admin-tbody .editable-cell').forEach(cell => {
            cell.addEventListener('input', function() {
                const original = this.dataset.original || '';
                const current = this.value.trim();
                const row = this.closest('tr');
                const marker = row.querySelector('.modified-marker span');
                
                if (current !== original) {
                    this.classList.add('modified');
                    row.classList.add('row-modified');
                    marker.textContent = '🟡';
                    marker.style.opacity = '1';
                } else {
                    this.classList.remove('modified');
                    // Check if any other cells modified
                    const anyModified = row.querySelectorAll('.modified').length > 0;
                    if (!anyModified) {
                        row.classList.remove('row-modified');
                        marker.textContent = '●';
                        marker.style.opacity = '0';
                    }
                }
            });
        });
        
        console.log(`✅ Loaded ${snapshot.size} PSS admin records`);
        
    } catch (error) {
        console.error('Error loading PSS Admin data:', error);
        alert('❌ Error loading PSS Admin data: ' + error.message);
    }
}

// Save PSS Admin Changes
async function savePSSAdminChanges() {
    try {
        const modifiedRows = document.querySelectorAll('#pss-admin-tbody .row-modified');
        
        if (modifiedRows.length === 0) {
            alert('ℹ️ No changes detected. Edit cells to make changes.');
            return;
        }
        
        if (!confirm(`Save ${modifiedRows.length} modified records to Firebase?`)) {
            return;
        }
        
        let updateCount = 0;
        let errors = [];
        
        for (const row of modifiedRows) {
            const docId = row.dataset.id;
            const updates = {};
            
            row.querySelectorAll('.modified').forEach(cell => {
                const field = cell.dataset.field;
                const value = cell.value.trim();
                if (value) {
                    updates[field] = value;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                try {
                    await db.collection('pss_stations').doc(docId).update(updates);
                    updateCount++;
                    console.log(`Updated ${docId}:`, updates);
                } catch (err) {
                    errors.push(`${docId}: ${err.message}`);
                }
            }
        }
        
        if (errors.length > 0) {
            alert(`⚠️ Updated ${updateCount} records\n\nErrors (${errors.length}):\n${errors.join('\n')}`);
        } else {
            alert(`✅ Successfully updated ${updateCount} PSS admin records!`);
        }
        
        // Reload table
        loadPSSAdminData();
        
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('❌ Error saving changes: ' + error.message);
    }
}

// Download PSS Admin as CSV
function downloadPSSAdminCSV() {
    try {
        const rows = [['PSS/Admin Name', 'Phone Number']];
        
        document.querySelectorAll('#pss-admin-tbody tr').forEach(tr => {
            const cells = tr.querySelectorAll('.editable-cell');
            if (cells.length >= 2) {
                rows.push([
                    cells[0].value || '',
                    cells[1].value || ''
                ]);
            }
        });
        
        if (rows.length === 1) {
            alert('ℹ️ No data to download. Load PSS Admin data first.');
            return;
        }
        
        const csv = rows.map(row => 
            row.map(cell => {
                const str = String(cell || '');
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        ).join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PSS_Admin_Contacts_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Downloaded ${rows.length - 1} PSS admin records`);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Error downloading CSV: ' + error.message);
    }
}

// Load PSS Details (PSS_Summary structure: PSS NAME | FEEDERS | LINEMAN | HELPER)
async function loadPSSDetailsData() {
    try {
        console.log('Loading PSS Details Data...');
        const snapshot = await db.collection('pss_stations').orderBy('name').get();
        const tbody = document.getElementById('pss-details-tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">No PSS details found. Add PSS stations first.</td></tr>';
            document.getElementById('pss-details-table-container').style.display = 'block';
            document.getElementById('pss-details-status').style.display = 'block';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const feeders = data.feeders || data.feederCount || 0;
            const lineman = Array.isArray(data.lineman) ? data.lineman.join(', ') : (data.lineman || '');
            const helper = Array.isArray(data.helper) ? data.helper.join(', ') : (data.helper || '');
            
            const row = document.createElement('tr');
            row.dataset.id = doc.id;
            
            row.innerHTML = `
                <td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <input type="text" class="editable-cell" value="${data.name || ''}" data-field="name" data-original="${data.name || ''}" style="font-size: 12px;">
                </td>
                <td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <input type="number" class="editable-cell" value="${feeders}" data-field="feeders" data-original="${feeders}" style="font-size: 12px; width: 80px;">
                </td>
                <td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <textarea class="editable-cell" data-field="lineman" data-original="${lineman}" style="font-size: 11px; min-height: 60px; resize: vertical;">${lineman}</textarea>
                </td>
                <td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <textarea class="editable-cell" data-field="helper" data-original="${helper}" style="font-size: 11px; min-height: 60px; resize: vertical;">${helper}</textarea>
                </td>
                <td class="modified-marker" style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);">
                    <span style="opacity: 0;">●</span>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('pss-details-table-container').style.display = 'block';
        document.getElementById('pss-details-status').style.display = 'block';
        
        // Track changes
        document.querySelectorAll('#pss-details-tbody .editable-cell').forEach(cell => {
            cell.addEventListener('input', function() {
                const original = this.dataset.original || '';
                const current = this.value.trim();
                const row = this.closest('tr');
                const marker = row.querySelector('.modified-marker span');
                
                if (current !== original) {
                    this.classList.add('modified');
                    row.classList.add('row-modified');
                    marker.textContent = '🟡';
                    marker.style.opacity = '1';
                } else {
                    this.classList.remove('modified');
                    const anyModified = row.querySelectorAll('.modified').length > 0;
                    if (!anyModified) {
                        row.classList.remove('row-modified');
                        marker.textContent = '●';
                        marker.style.opacity = '0';
                    }
                }
            });
        });
        
        console.log(`✅ Loaded ${snapshot.size} PSS detail records`);
        
    } catch (error) {
        console.error('Error loading PSS Details:', error);
        alert('❌ Error loading PSS Details: ' + error.message);
    }
}

// Save PSS Details Changes
async function savePSSDetailsChanges() {
    try {
        const modifiedRows = document.querySelectorAll('#pss-details-tbody .row-modified');
        
        if (modifiedRows.length === 0) {
            alert('ℹ️ No changes detected. Edit cells to make changes.');
            return;
        }
        
        if (!confirm(`Save ${modifiedRows.length} modified records to Firebase?`)) {
            return;
        }
        
        let updateCount = 0;
        let errors = [];
        
        for (const row of modifiedRows) {
            const docId = row.dataset.id;
            const updates = {};
            
            row.querySelectorAll('.modified').forEach(cell => {
                const field = cell.dataset.field;
                let value = cell.value.trim();
                
                // Convert comma-separated strings to arrays for lineman/helper
                if (field === 'lineman' || field === 'helper') {
                    value = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                } else if (field === 'feeders') {
                    value = parseInt(value) || 0;
                }
                
                if ((Array.isArray(value) && value.length > 0) || (typeof value === 'number') || value) {
                    updates[field] = value;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                try {
                    await db.collection('pss_stations').doc(docId).update(updates);
                    updateCount++;
                    console.log(`Updated ${docId}:`, updates);
                } catch (err) {
                    errors.push(`${docId}: ${err.message}`);
                }
            }
        }
        
        if (errors.length > 0) {
            alert(`⚠️ Updated ${updateCount} records\n\nErrors (${errors.length}):\n${errors.join('\n')}`);
        } else {
            alert(`✅ Successfully updated ${updateCount} PSS detail records!`);
        }
        
        // Reload table
        loadPSSDetailsData();
        
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('❌ Error saving changes: ' + error.message);
    }
}

// Download PSS Details as CSV
function downloadPSSDetailsCSV() {
    try {
        const rows = [['PSS NAME', 'FEEDERS', 'LINEMAN', 'HELPER']];
        
        document.querySelectorAll('#pss-details-tbody tr').forEach(tr => {
            const cells = tr.querySelectorAll('.editable-cell');
            if (cells.length >= 4) {
                rows.push([
                    cells[0].value || '',
                    cells[1].value || '0',
                    cells[2].value || '',
                    cells[3].value || ''
                ]);
            }
        });
        
        if (rows.length === 1) {
            alert('ℹ️ No data to download. Load PSS Details first.');
            return;
        }
        
        const csv = rows.map(row => 
            row.map(cell => {
                const str = String(cell || '');
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        ).join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PSS_Details_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Downloaded ${rows.length - 1} PSS detail records`);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('❌ Error downloading CSV: ' + error.message);
    }
}

// Export to window
window.switchDataType = switchDataType;
window.loadPSSAdminData = loadPSSAdminData;
window.savePSSAdminChanges = savePSSAdminChanges;
window.downloadPSSAdminCSV = downloadPSSAdminCSV;
window.loadPSSDetailsData = loadPSSDetailsData;
window.savePSSDetailsChanges = savePSSDetailsChanges;
window.downloadPSSDetailsCSV = downloadPSSDetailsCSV;

// ===============================================
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

// Switch sheet during preview
async function switchSheetInPreview() {
    const selector = document.getElementById('previewSheetSelect');
    const sheetName = selector.value;
    
    if (!previewDataStore.workbook || !sheetName) {
        alert('⚠️ No workbook loaded or sheet selected');
        return;
    }
    
    console.log('🔄 Switching to sheet:', sheetName);
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
        previewDataStore.workbook = workbook; // Store workbook for sheet switching
        previewDataStore.currentSheet = sheetName; // Track current sheet
        
        // Display preview
        displayPreviewTable(dataType, headers, comparedData, workbook);
        
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
    console.log('📋 Original headers:', headers);
    
    // PSS Stations: Must have name-like column + phone
    // Accept: "pss/admin name", "pssadminname", "pss name", "name", etc.
    const hasName = normalized.some(h => 
        h.includes('pss') || 
        h.includes('name') || 
        h.includes('admin') ||
        h === 'pss' ||
        h === 'name'
    );
    const hasPhone = normalized.some(h => h.includes('phone') || h.includes('number'));
    const hasFeeders = normalized.some(h => h.includes('feeder'));
    const hasLineman = normalized.some(h => h.includes('lineman') || h.includes('line'));
    const hasHelper = normalized.some(h => h.includes('helper'));
    
    console.log('🔍 Detection flags:', { hasName, hasPhone, hasFeeders, hasLineman, hasHelper });
    
    // PSS Stations: Name + Phone is enough (feeders/lineman/helper are optional)
    if ((hasName || hasPhone) && headers.length >= 2) {
        console.log('✅ Detected as PSS Stations Data');
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

// Analyze Firestore structure to understand actual data format
async function analyzeFirestoreStructure(dataType) {
    console.log('🔍 Analyzing Firestore structure for:', dataType);
    
    try {
        const snapshot = await db.collection(dataType).limit(5).get();
        
        if (snapshot.empty) {
            console.log('⚠️ Collection is empty - no structure to analyze');
            return null;
        }
        
        const sampleDoc = snapshot.docs[0].data();
        const structure = {
            fields: Object.keys(sampleDoc),
            types: {},
            hasArrays: [],
            sample: sampleDoc
        };
        
        Object.keys(sampleDoc).forEach(key => {
            const value = sampleDoc[key];
            if (Array.isArray(value)) {
                structure.types[key] = 'array';
                structure.hasArrays.push(key);
            } else if (typeof value === 'number') {
                structure.types[key] = 'number';
            } else if (typeof value === 'string') {
                structure.types[key] = 'string';
            } else if (value && typeof value === 'object') {
                structure.types[key] = 'object';
            }
        });
        
        console.log('📊 Firestore structure:', structure);
        return structure;
        
    } catch (error) {
        console.error('Error analyzing Firestore:', error);
        return null;
    }
}

// Fetch existing data from Firebase with structure analysis
async function fetchExistingData(dataType) {
    const existing = {};
    
    try {
        // First, analyze the structure
        const structure = await analyzeFirestoreStructure(dataType);
        if (structure) {
            console.log('✅ Found Firestore fields:', structure.fields);
            console.log('📦 Array fields:', structure.hasArrays);
        }
        
        // Then fetch all data
        if (dataType === 'pss_stations') {
            const snapshot = await db.collection('pss_stations').get();
            console.log(`📥 Fetched ${snapshot.size} PSS stations from Firestore`);
            
            // Track duplicates
            const caseMap = {}; // Track lowercase versions to detect duplicates
            const duplicates = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const docId = doc.id;
                const lowerDocId = docId.toLowerCase();
                
                // Check for case-insensitive duplicates
                if (caseMap[lowerDocId]) {
                    duplicates.push({
                        lowercase: docId,
                        uppercase: caseMap[lowerDocId],
                        data: data
                    });
                    console.warn(`⚠️ DUPLICATE FOUND: "${docId}" conflicts with "${caseMap[lowerDocId]}"`);
                    
                    // Merge data from lowercase into uppercase version
                    if (existing[caseMap[lowerDocId]]) {
                        // If uppercase exists, merge any missing data from lowercase
                        Object.keys(data).forEach(key => {
                            if (!existing[caseMap[lowerDocId]][key] || 
                                (Array.isArray(data[key]) && data[key].length > 0)) {
                                existing[caseMap[lowerDocId]][key] = data[key];
                            }
                        });
                    }
                } else {
                    // No duplicate, store normally
                    const normalizedId = docId.toUpperCase(); // Normalize to uppercase
                    existing[normalizedId] = data;
                    caseMap[lowerDocId] = normalizedId;
                }
                
                // Log structure of first document
                if (Object.keys(existing).length === 1) {
                    console.log('📋 First PSS station structure:', {
                        docId: docId,
                        normalizedId: docId.toUpperCase(),
                        fields: Object.keys(data),
                        sample: {
                            name: data.name,
                            phoneNumber: data.phoneNumber,
                            lineman: Array.isArray(data.lineman) ? `[${data.lineman.length} items]` : data.lineman,
                            helper: Array.isArray(data.helper) ? `[${data.helper.length} items]` : data.helper
                        }
                    });
                }
            });
            
            if (duplicates.length > 0) {
                console.warn(`🔴 Found ${duplicates.length} duplicate PSS stations (case-insensitive):`);
                duplicates.forEach(dup => {
                    console.warn(`   - "${dup.lowercase}" should be merged with "${dup.uppercase}"`);
                });
                console.warn(`💡 These duplicates will be cleaned up on next save`);
            }
        } else if (dataType === 'users') {
            const snapshot = await db.collection('users').get();
            console.log(`📥 Fetched ${snapshot.size} users from Firestore`);
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
            
            console.log(`📥 Fetched ${snapshot.size} daily entries from Firestore`);
            snapshot.forEach(doc => {
                existing[doc.id] = doc.data();
            });
        }
    } catch (error) {
        console.error('Error fetching existing data:', error);
    }
    
    console.log(`💾 Total existing records: ${Object.keys(existing).length}`);
    return existing;
}

// Compare new data with existing (enhanced with detailed change tracking)
function compareWithExisting(newData, existingData, dataType, headers) {
    console.log('🔍 Starting comparison...');
    
    return newData.map((row, idx) => {
        const docId = getDocumentId(row, dataType, headers);
        const existing = existingData[docId];
        
        row._docId = docId;
        
        if (!existing) {
            row._status = 'new';
            row._hasChanges = false;
            row._changeDetails = 'New record - will be created in Firestore';
            console.log(`🟢 NEW: ${docId}`);
            return row;
        }
        
        // Check for changes with detailed tracking
        const changeInfo = checkForChangesDetailed(row, existing, headers);
        row._status = changeInfo.hasChanges ? 'changed' : 'unchanged';
        row._hasChanges = changeInfo.hasChanges;
        row._existing = existing;
        row._changes = changeInfo.changes;
        row._changeDetails = formatChangeDetails(changeInfo.changes);
        
        if (changeInfo.hasChanges) {
            console.log(`🟡 CHANGED: ${docId} - ${row._changeDetails}`);
        } else {
            console.log(`⚪ UNCHANGED: ${docId}`);
        }
        
        return row;
    });
}

// Format change details for display
function formatChangeDetails(changes) {
    if (!changes || changes.length === 0) return 'No changes';
    
    const details = changes.map(ch => {
        if (ch.type === 'array') {
            const added = ch.new.filter(n => !ch.old.includes(n));
            const removed = ch.old.filter(o => !ch.new.includes(o));
            let msg = `${ch.field}: `;
            if (added.length > 0) msg += `+${added.length} added`;
            if (removed.length > 0) msg += ` -${removed.length} removed`;
            return msg;
        } else if (ch.type === 'name_expansion') {
            return `${ch.field}: Name updated (${ch.old} → ${ch.new})`;
        } else {
            return `${ch.field}: ${ch.old} → ${ch.new}`;
        }
    });
    
    return details.join(', ');
}

// Enhanced change detection with details
function checkForChangesDetailed(newRow, existing, headers) {
    const changes = [];
    
    for (const header of headers) {
        const newVal = String(newRow[header] || '').trim();
        const existingVal = existing[header];
        
        // Handle array fields (lineman, helper)
        if (Array.isArray(existingVal)) {
            const newArray = newVal ? newVal.split(',').map(s => s.trim()).filter(s => s) : [];
            const existingArray = existingVal;
            
            // Check if arrays are different
            if (!arraysEqual(newArray, existingArray)) {
                const added = newArray.filter(n => !existingArray.includes(n));
                const removed = existingArray.filter(o => !newArray.includes(o));
                
                changes.push({
                    field: header,
                    old: existingArray,
                    new: newArray,
                    type: 'array',
                    added: added,
                    removed: removed
                });
            }
        } else {
            // Handle regular fields
            const existingStr = String(existingVal || '').trim();
            
            if (newVal !== existingStr) {
                // Check if it's a name variation
                const isSimilar = checkNameSimilarity(newVal, existingStr);
                
                changes.push({
                    field: header,
                    old: existingStr,
                    new: newVal,
                    type: isSimilar ? 'name_expansion' : 'value'
                });
            }
        }
    }
    
    return {
        hasChanges: changes.length > 0,
        changes: changes
    };
}

// Get document ID based on data type (NORMALIZED TO UPPERCASE)
function getDocumentId(row, dataType, headers) {
    const normalized = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    if (dataType === 'pss_stations') {
        // Find name column
        const nameIdx = normalized.findIndex(h => h.includes('name') || h === 'pss' || h === 'pssadmin');
        if (nameIdx >= 0) {
            const nameCol = headers[nameIdx];
            const rawName = String(row[nameCol] || '').trim();
            // ALWAYS UPPERCASE for consistency (prevents balishankara vs BALISHANKARA duplicates)
            return rawName.toUpperCase();
        }
    } else if (dataType === 'users') {
        // Use phoneNumber as ID (keep as-is, numbers don't need case normalization)
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

// Check if row has changes from existing (with smart detection)
function checkForChanges(newRow, existing, headers) {
    let hasChanges = false;
    const changes = [];
    
    for (const header of headers) {
        const newVal = String(newRow[header] || '').trim();
        const existingVal = String(existing[header] || '').trim();
        
        // Handle array fields (lineman, helper)
        if (Array.isArray(existing[header])) {
            const newArray = newVal ? newVal.split(',').map(s => s.trim()).filter(s => s) : [];
            const existingArray = existing[header];
            
            // Check if arrays are different
            const arrayChanged = !arraysEqual(newArray, existingArray);
            if (arrayChanged) {
                hasChanges = true;
                changes.push({
                    field: header,
                    old: existingArray,
                    new: newArray,
                    type: 'array'
                });
            }
        } else {
            // Handle regular fields
            if (newVal !== existingVal) {
                // Check if it's a name variation (e.g., "MUKESH" vs "MUKESH CHANDRA SAHU")
                const isSimilarName = checkNameSimilarity(newVal, existingVal);
                
                if (!isSimilarName) {
                    hasChanges = true;
                    changes.push({
                        field: header,
                        old: existingVal,
                        new: newVal,
                        type: 'value'
                    });
                } else {
                    // Still count as change but note it's a name expansion
                    hasChanges = true;
                    changes.push({
                        field: header,
                        old: existingVal,
                        new: newVal,
                        type: 'name_expansion'
                    });
                }
            }
        }
    }
    
    if (hasChanges) {
        console.log(`🔄 Changes detected:`, changes);
    }
    
    return hasChanges;
}

// Helper: Check if two arrays are equal
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    // Sort both arrays for comparison (order doesn't matter)
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    
    return sorted1.every((val, idx) => val === sorted2[idx]);
}

// Helper: Check if names are similar (handles expansions like "MUKESH" -> "MUKESH CHANDRA")
function checkNameSimilarity(name1, name2) {
    if (!name1 || !name2) return false;
    
    const n1 = name1.toUpperCase();
    const n2 = name2.toUpperCase();
    
    // Exact match
    if (n1 === n2) return true;
    
    // One is contained in the other (e.g., "MUKESH" in "MUKESH CHANDRA SAHU")
    if (n1.includes(n2) || n2.includes(n1)) {
        console.log(`📝 Name similarity detected: "${name1}" ≈ "${name2}"`);
        return true;
    }
    
    // Check if first word matches
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);
    
    if (words1[0] === words2[0] && words1[0].length > 3) {
        console.log(`📝 First name matches: "${name1}" ≈ "${name2}"`);
        return true;
    }
    
    return false;
}

// Display preview table
function displayPreviewTable(dataType, headers, rows, workbook) {
    const container = document.getElementById('previewTableContainer');
    const thead = document.getElementById('previewTableHead');
    const tbody = document.getElementById('previewTableBody');
    
    // Update info
    document.getElementById('previewDataType').textContent = getDataTypeLabel(dataType);
    document.getElementById('previewRecordCount').textContent = `${rows.length} records`;
    
    // Show sheet selector if multiple sheets (check for element first)
    const sheetSelectorDiv = document.getElementById('previewSheetSelector');
    if (sheetSelectorDiv && workbook && workbook.SheetNames.length > 1) {
        const select = document.getElementById('previewSheetSelect');
        if (select) {
            select.innerHTML = '';
            workbook.SheetNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === previewDataStore.currentSheet) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            sheetSelectorDiv.style.display = 'flex';
        }
    } else if (sheetSelectorDiv) {
        sheetSelectorDiv.style.display = 'none';
    }
    
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
        
        // Status badge with detailed tooltip
        let statusBadge = '';
        let statusTitle = '';
        
        if (row._status === 'new') {
            statusBadge = '<span class="status-badge status-new">🟢 New</span>';
            statusTitle = 'New record - will be created';
        } else if (row._status === 'changed') {
            statusBadge = '<span class="status-badge status-changed">🟡 Changed</span>';
            statusTitle = row._changeDetails || 'Has changes';
            
            // Add detailed changes if available
            if (row._changes && row._changes.length > 0) {
                const changeList = row._changes.map(ch => {
                    if (ch.type === 'array') {
                        let detail = `${ch.field}:\n`;
                        if (ch.added && ch.added.length > 0) {
                            detail += `  ➕ Add: ${ch.added.join(', ')}\n`;
                        }
                        if (ch.removed && ch.removed.length > 0) {
                            detail += `  ➖ Remove: ${ch.removed.join(', ')}`;
                        }
                        return detail;
                    } else {
                        return `${ch.field}: ${ch.old} → ${ch.new}`;
                    }
                }).join('\n');
                statusTitle = changeList;
            }
        } else {
            statusBadge = '<span class="status-badge status-unchanged">⚪ Same</span>';
            statusTitle = 'No changes - already in Firestore';
        }
        
        bodyHtml += `<td style="padding: 8px; border: 1px solid rgba(168,85,247,0.2);" title="${statusTitle}">${statusBadge}</td>`;
        
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

// Save to Firebase - UPDATE existing data (merge with Excel changes)
async function savePreviewData() {
    if (!previewDataStore.type || !previewDataStore.rows.length) {
        alert('No data to save!');
        return;
    }
    
    const confirmMsg = `This will update ${previewDataStore.rows.length} records in ${previewDataStore.type}.\n\nChanges will be merged with existing data.\n\nAre you sure?`;
    if (!confirm(confirmMsg)) {
        return;
    }
    
    const statusDiv = document.getElementById('excelUploadStatus');
    const headers = previewDataStore.headers;
    
    let updatedCount = 0;
    let newCount = 0;
    let errorCount = 0;
    const errors = [];
    
    try {
        // Fetch existing data first
        statusDiv.innerHTML = '<div style="color: #3b82f6;">Step 1/2: Checking existing data...</div>';
        const existingData = {};
        const snapshot = await db.collection(previewDataStore.type).get();
        snapshot.forEach(doc => {
            existingData[doc.id.toUpperCase()] = doc.data();
        });
        console.log(`📥 Found ${Object.keys(existingData).length} existing records`);
        
        // Update/create records from Excel
        statusDiv.innerHTML = '<div style="color: #10b981;">Step 2/2: Updating data from Excel...</div>';
        console.log(`📤 Processing ${previewDataStore.rows.length} records...`);
        
        for (const row of previewDataStore.rows) {
            try {
                // Get document ID from Excel data (use exact Excel format)
                const docId = getDocumentId(row, previewDataStore.type, headers);
                
                if (!docId) {
                    console.warn('⚠️ Skipping row - no document ID:', row);
                    errorCount++;
                    errors.push(`Row missing name/ID: ${JSON.stringify(row)}`);
                    continue;
                }
                
                // Check if record exists
                const existingRecord = existingData[docId.toUpperCase()];
                const isNew = !existingRecord;
                
                // Normalize data for Firestore (merge with existing)
                const normalizedData = normalizeRowDataWithMerge(row, previewDataStore.type, headers, existingRecord || {});
                
                // Save to Firestore (merge mode)
                const docRef = db.collection(previewDataStore.type).doc(docId);
                await docRef.set(normalizedData, { merge: true });
                
                if (isNew) {
                    newCount++;
                    console.log(`🆕 Created: ${docId}`);
                } else {
                    updatedCount++;
                    console.log(`✅ Updated: ${docId}`);
                }
                
            } catch (rowError) {
                console.error('❌ Error saving row:', row, rowError);
                errorCount++;
                errors.push(`${row._docId || 'Unknown'}: ${rowError.message}`);
            }
        }
        
        // Show completion report
        statusDiv.innerHTML = '<div style="color: #10b981;">✅ Upload complete!</div>';
        
        // Generate detailed report
        const reportHtml = generateUploadReportMerge(newCount, updatedCount, errorCount, errors);
        showUploadReport(reportHtml);
        
        // Clear preview
        setTimeout(() => {
            cancelPreview();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Upload failed:', error);
        statusDiv.innerHTML = `<div style="color: #ef4444;">Upload failed: ${error.message}</div>`;
    }
}

// Normalize data with merge logic (keeps existing data, updates only changed fields)
function normalizeRowDataWithMerge(row, dataType, headers, existingData = {}) {
    const normalized = { ...existingData }; // Start with existing data
    const headerMap = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    headers.forEach((header, idx) => {
        if (header.startsWith('_')) return; // Skip internal fields
        
        const value = row[header];
        const normalizedKey = headerMap[idx];
        
        // Only update if Excel has a value
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            // Map to Firestore field names
            if (normalizedKey.includes('name') || normalizedKey === 'pss' || normalizedKey === 'pssadmin') {
                normalized.name = String(value).trim();
            } else if (normalizedKey.includes('phone') || normalizedKey.includes('number')) {
                normalized.phoneNumber = String(value).trim();
            } else if (normalizedKey.includes('feeder')) {
                normalized.feeders = parseInt(value) || 0;
            } else if (normalizedKey.includes('lineman')) {
                const linemanValue = String(value).trim();
                normalized.lineman = linemanValue ? linemanValue.split(',').map(s => s.trim()).filter(s => s) : [];
            } else if (normalizedKey.includes('helper')) {
                const helperValue = String(value).trim();
                normalized.helper = helperValue ? helperValue.split(',').map(s => s.trim()).filter(s => s) : [];
            } else if (normalizedKey.includes('role')) {
                normalized.role = String(value).trim();
            } else if (normalizedKey.includes('date')) {
                normalized.date = String(value).trim();
            } else {
                normalized[header] = value;
            }
        }
    });
    
    // Add/update metadata
    normalized.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
    
    return normalized;
}

// Generate upload report HTML for merge mode
function generateUploadReportMerge(newCount, updatedCount, errors, errorList) {
    const total = newCount + updatedCount + errors;
    const successCount = newCount + updatedCount;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
    
    let html = `
        <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%); 
                    border: 2px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 2rem; margin-top: 1rem;">
            <h3 style="color: #10b981; margin: 0 0 1.5rem 0; font-size: 20px; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 28px;">📊</span> Upload Report
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #10b981;">${newCount}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">New Records Created</div>
                </div>
                
                <div style="background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #3b82f6;">${updatedCount}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">Records Updated</div>
                </div>
                
                <div style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #f59e0b;">${errors}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">Errors</div>
                </div>
                
                <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #10b981;">${successRate}%</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">Success Rate</div>
                </div>
            </div>
            
            <div style="background: rgba(16,185,129,0.2); border-left: 4px solid #10b981; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <p style="margin: 0; color: white; font-weight: 600; font-size: 14px;">
                    ✅ Success! ${successCount} records processed (${newCount} new, ${updatedCount} updated).
                </p>
            </div>
    `;
    
    if (errors > 0 && errorList.length > 0) {
        html += `
            <div style="background: rgba(239,68,68,0.1); border-left: 4px solid #ef4444; padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                <p style="margin: 0 0 0.5rem 0; color: #ef4444; font-weight: 600; font-size: 14px;">⚠️ Errors (${errors}):</p>
                <div style="max-height: 150px; overflow-y: auto; font-size: 12px; color: rgba(255,255,255,0.8);">
                    ${errorList.map(err => `<div style="margin: 0.25rem 0;">• ${err}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    html += `
            <div style="margin-top: 1.5rem; text-align: center;">
                <button onclick="document.getElementById('uploadReportModal').style.display='none'" 
                        class="btn-primary" 
                        style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 12px 32px; font-size: 15px;">
                    ✅ Done
                </button>
            </div>
        </div>
    `;
    
    return html;
}

// Normalize data for fresh upload (no merging, just clean data)
function normalizeRowDataFresh(row, dataType, headers) {
    const normalized = {};
    const headerMap = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    headers.forEach((header, idx) => {
        if (header.startsWith('_')) return; // Skip internal fields
        
        const value = row[header];
        const normalizedKey = headerMap[idx];
        
        // Map to Firestore field names
        if (normalizedKey.includes('name') || normalizedKey === 'pss' || normalizedKey === 'pssadmin') {
            normalized.name = String(value || '').trim();
        } else if (normalizedKey.includes('phone') || normalizedKey.includes('number')) {
            normalized.phoneNumber = String(value || '').trim();
        } else if (normalizedKey.includes('feeder')) {
            normalized.feeders = parseInt(value) || 0;
        } else if (normalizedKey.includes('lineman')) {
            const linemanValue = String(value || '').trim();
            normalized.lineman = linemanValue ? linemanValue.split(',').map(s => s.trim()).filter(s => s) : [];
        } else if (normalizedKey.includes('helper')) {
            const helperValue = String(value || '').trim();
            normalized.helper = helperValue ? helperValue.split(',').map(s => s.trim()).filter(s => s) : [];
        } else if (normalizedKey.includes('role')) {
            normalized.role = String(value || '').trim();
        } else if (normalizedKey.includes('date')) {
            normalized.date = String(value || '').trim();
        } else if (value !== undefined && value !== null && String(value).trim() !== '') {
            normalized[header] = value;
        }
    });
    
    // Add metadata
    normalized.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
    normalized.uploadedAt = firebase.firestore.FieldValue.serverTimestamp();
    
    return normalized;
}

// Generate upload report HTML
function generateUploadReport(deleted, saved, errors, errorList) {
    const total = saved + errors;
    const successRate = total > 0 ? Math.round((saved / total) * 100) : 0;
    
    let html = `
        <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%); 
                    border: 2px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 2rem; margin-top: 1rem;">
            <h3 style="color: #10b981; margin: 0 0 1.5rem 0; font-size: 20px; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 28px;">📊</span> Upload Report
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #ef4444;">${deleted}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">Old Records Deleted</div>
                </div>
                
                <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #10b981;">${saved}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">New Records Added</div>
                </div>
                
                <div style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #f59e0b;">${errors}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">Errors</div>
                </div>
                
                <div style="background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; padding: 1rem; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #3b82f6;">${successRate}%</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.5rem;">Success Rate</div>
                </div>
            </div>
            
            <div style="background: rgba(16,185,129,0.2); border-left: 4px solid #10b981; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <p style="margin: 0; color: white; font-weight: 600; font-size: 14px;">
                    ✅ Success! All old data deleted and ${saved} new records uploaded from Excel.
                </p>
            </div>
    `;
    
    if (errors > 0 && errorList.length > 0) {
        html += `
            <div style="background: rgba(239,68,68,0.1); border-left: 4px solid #ef4444; padding: 1rem; border-radius: 6px; margin-top: 1rem;">
                <p style="margin: 0 0 0.5rem 0; color: #ef4444; font-weight: 600; font-size: 14px;">⚠️ Errors (${errors}):</p>
                <div style="max-height: 150px; overflow-y: auto; font-size: 12px; color: rgba(255,255,255,0.8);">
                    ${errorList.map(err => `<div style="margin: 0.25rem 0;">• ${err}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    html += `
            <div style="margin-top: 1.5rem; text-align: center;">
                <button onclick="document.getElementById('uploadReportModal').style.display='none'" 
                        class="btn-primary" 
                        style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 12px 32px; font-size: 15px;">
                    ✅ Done
                </button>
            </div>
        </div>
    `;
    
    return html;
}

// Show upload report in modal
function showUploadReport(reportHtml) {
    // Create modal if doesn't exist
    let modal = document.getElementById('uploadReportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'uploadReportModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; padding: 2rem;
        `;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background: rgba(30,41,59,0.98); border-radius: 16px; max-width: 800px; width: 100%; 
                    max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            ${reportHtml}
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Normalize row data for Firebase with smart array merging
function normalizeRowData(row, dataType, headers, existingData = {}) {
    const normalized = {};
    const headerMap = headers.map(h => h.toLowerCase().trim().replace(/[\/\s_-]+/g, ''));
    
    console.log('🔄 Normalizing row with existing data:', { row, existingData });
    
    // Copy all fields, excluding internal ones
    headers.forEach((header, idx) => {
        if (!header.startsWith('_')) {
            const value = row[header];
            const normalizedKey = headerMap[idx];
            
            // Map to standard field names
            if (normalizedKey.includes('name') || normalizedKey === 'pss' || normalizedKey === 'pssadmin') {
                const newName = String(value || '').trim();
                if (newName) {
                    normalized.name = newName;
                } else if (existingData.name) {
                    normalized.name = existingData.name; // Keep existing if new is empty
                }
            } else if (normalizedKey.includes('phone') || normalizedKey.includes('number')) {
                const newPhone = String(value || '').trim();
                if (newPhone) {
                    normalized.phoneNumber = newPhone;
                } else if (existingData.phoneNumber) {
                    normalized.phoneNumber = existingData.phoneNumber; // Keep existing if new is empty
                }
            } else if (normalizedKey.includes('feeder')) {
                const newFeeders = parseInt(value);
                if (!isNaN(newFeeders)) {
                    normalized.feeders = newFeeders;
                } else if (existingData.feeders !== undefined) {
                    normalized.feeders = existingData.feeders; // Keep existing if new is invalid
                }
            } else if (normalizedKey.includes('lineman')) {
                // REPLACE lineman array (not merge) - Excel is the source of truth
                const linemanValue = String(value || '').trim();
                
                if (linemanValue) {
                    // Excel has data - use exactly what's in Excel (this REPLACES Firestore)
                    const newLinemen = linemanValue.split(',').map(s => s.trim()).filter(s => s);
                    normalized.lineman = newLinemen;
                    
                    const existingLinemen = Array.isArray(existingData.lineman) ? existingData.lineman : [];
                    const removed = existingLinemen.filter(e => !newLinemen.includes(e));
                    const added = newLinemen.filter(n => !existingLinemen.includes(n));
                    
                    console.log('👷 Lineman changes:', { 
                        existing: existingLinemen, 
                        new: newLinemen,
                        removed: removed.length > 0 ? removed : 'none',
                        added: added.length > 0 ? added : 'none'
                    });
                } else if (existingData.lineman) {
                    // Excel cell is empty - keep existing
                    normalized.lineman = existingData.lineman;
                    console.log('👷 Lineman: Keeping existing (Excel empty)');
                }
            } else if (normalizedKey.includes('helper')) {
                // REPLACE helper array (not merge) - Excel is the source of truth
                const helperValue = String(value || '').trim();
                
                if (helperValue) {
                    // Excel has data - use exactly what's in Excel (this REPLACES Firestore)
                    const newHelpers = helperValue.split(',').map(s => s.trim()).filter(s => s);
                    normalized.helper = newHelpers;
                    
                    const existingHelpers = Array.isArray(existingData.helper) ? existingData.helper : [];
                    const removed = existingHelpers.filter(e => !newHelpers.includes(e));
                    const added = newHelpers.filter(n => !existingHelpers.includes(n));
                    
                    console.log('🤝 Helper changes:', { 
                        existing: existingHelpers, 
                        new: newHelpers,
                        removed: removed.length > 0 ? removed : 'none',
                        added: added.length > 0 ? added : 'none'
                    });
                } else if (existingData.helper) {
                    // Excel cell is empty - keep existing
                    normalized.helper = existingData.helper;
                    console.log('🤝 Helper: Keeping existing (Excel empty)');
                }
            } else if (normalizedKey.includes('role')) {
                const newRole = String(value || '').trim();
                if (newRole) {
                    normalized.role = newRole;
                } else if (existingData.role) {
                    normalized.role = existingData.role;
                }
            } else if (normalizedKey.includes('date')) {
                const newDate = String(value || '').trim();
                if (newDate) {
                    normalized.date = newDate;
                } else if (existingData.date) {
                    normalized.date = existingData.date;
                }
            } else {
                // Keep original field name if not empty
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    normalized[header] = value;
                } else if (existingData[header] !== undefined) {
                    normalized[header] = existingData[header];
                }
            }
        }
    });
    
    // Preserve any existing fields not in Excel
    Object.keys(existingData).forEach(key => {
        if (normalized[key] === undefined && !key.startsWith('_') && key !== 'lastUpdated') {
            normalized[key] = existingData[key];
            console.log(`📦 Preserving existing field: ${key} = ${existingData[key]}`);
        }
    });
    
    // Add timestamp
    normalized.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
    
    console.log('✅ Final normalized data:', normalized);
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
