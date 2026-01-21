// ============================================
// USER DASHBOARD - COMPLETE LOGIC
// My Dashboard | History | New Entry
// ============================================

// Global user state
const userState = {
    mySubmissions: [],
    currentFilter: 'all',
    statistics: {},
    formModal: null,
    // New filter state
    submissionFilters: {
        staff: 'all',
        fromDate: '',
        toDate: ''
    },
    uniqueStaffList: []
};

// Global wizard and clock picker state
let currentWizardStep = 0;
let currentClockInput = null;
let selectedHour = 0;
let selectedMinute = 0;

// ============================================
// INITIALIZE USER DASHBOARD
// ============================================

async function loadUserDashboard() {
    console.log('Loading user dashboard...');
    
    // Show user dashboard screen first
    showScreen('userDashboard');
    
    // Update header
    const avatar = document.querySelector('.user-avatar');
    const welcomeName = document.querySelector('.user-welcome h1');
    const welcomeMsg = document.querySelector('.user-welcome p');
    
    if (avatar && appState.currentUser.name) {
        avatar.textContent = appState.currentUser.name.charAt(0).toUpperCase();
    }
    if (welcomeName) {
        welcomeName.textContent = `Welcome, ${appState.currentUser.name}!`;
    }
    if (welcomeMsg) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        welcomeMsg.textContent = `${today} • Ready to submit today's data?`;
    }
    
    // Load user data
    await loadMySubmissions();
    calculateUserStatistics();
    renderDashboard();
    
    // Load PSS statistics
    await updatePSSStats();
    
    // Setup event listeners
    setupUserEventListeners();
    
    // Start real-time listeners
    startUserRealTimeListeners();
}

// ============================================
// LOAD MY SUBMISSIONS
// ============================================

async function loadMySubmissions() {
    try {
        const phoneNumber = appState.currentUser.phoneNumber;
        console.log('📊 Loading submissions for phone:', phoneNumber);
        
        const submissionsSnapshot = await db.collection('daily_entries')
            .where('phoneNumber', '==', phoneNumber)
            .limit(100)
            .get();
        
        userState.mySubmissions = submissionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Sort by timestamp DESC (latest first) - client-side sorting
        userState.mySubmissions.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
            const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
            return timeB - timeA; // Descending order (newest first)
        });
        
        console.log('✅ Loaded', userState.mySubmissions.length, 'submissions');
        
        if (userState.mySubmissions.length === 0) {
            console.warn('⚠️ No submissions found for phone:', phoneNumber);
            console.log('💡 This could mean:');
            console.log('  1. No data entered yet for this phone number');
            console.log('  2. Phone number was changed in Firestore');
            console.log('  3. Data exists under different phone number');
        }
    } catch (error) {
        console.error('❌ Error loading submissions:', error);
        alert('Failed to load submissions: ' + error.message);
    }
}

// ============================================
// CALCULATE USER STATISTICS
// ============================================

function calculateUserStatistics() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM
    
    // Filter submissions by current user's phone number or name
    const mySubmissions = userState.mySubmissions.filter(s => 
        s.phoneNumber === appState.currentUser.phoneNumber || 
        s.staffName === appState.currentUser.name
    );
    
    // Today's submissions
    const todaySubmissions = mySubmissions.filter(s => s.date === today);
    
    // This month's submissions
    const monthSubmissions = mySubmissions.filter(s => s.date && s.date.startsWith(thisMonth));
    
    // Total submissions
    const totalSubmissions = mySubmissions.length;
    
    // Unique PSS stations
    const uniquePSS = new Set(mySubmissions.map(s => s.pssStation)).size;
    
    // Streak calculation (consecutive days)
    const streak = calculateStreak(mySubmissions);
    
    // Collect all equipment data for rotating display
    let allPeakLoads = [];
    let allMinLoads = [];
    
    if (todaySubmissions.length > 0) {
        const latestToday = todaySubmissions[todaySubmissions.length - 1];
        
        // I/C Data
        if (latestToday.ic1) {
            allPeakLoads.push({
                name: 'I/C-1',
                icon: '\u26A1',
                load: parseFloat(latestToday.ic1.maxLoad) || 0,
                time: latestToday.ic1.maxLoadTime || '--:--',
                voltage: parseFloat(latestToday.ic1.maxVoltage) || 0,
                color: '#ef4444'
            });
            allMinLoads.push({
                name: 'I/C-1',
                icon: '\u26A1',
                load: parseFloat(latestToday.ic1.minLoad) || 0,
                time: latestToday.ic1.minLoadTime || '--:--',
                voltage: parseFloat(latestToday.ic1.minVoltage) || 0,
                color: '#3b82f6'
            });
        }
        
        if (latestToday.ic2) {
            allPeakLoads.push({
                name: 'I/C-2',
                icon: '\u26A1',
                load: parseFloat(latestToday.ic2.maxLoad) || 0,
                time: latestToday.ic2.maxLoadTime || '--:--',
                voltage: parseFloat(latestToday.ic2.maxVoltage) || 0,
                color: '#ef4444'
            });
            allMinLoads.push({
                name: 'I/C-2',
                icon: '\u26A1',
                load: parseFloat(latestToday.ic2.minLoad) || 0,
                time: latestToday.ic2.minLoadTime || '--:--',
                voltage: parseFloat(latestToday.ic2.minVoltage) || 0,
                color: '#3b82f6'
            });
        }
        
        // PTR Data - Dynamic based on PSS configuration
        // Get PTR count from PSS config (default to 2 if not found)
        let ptrCount = 2;
        const pssStation = appState.currentUser.pssStation;
        let pssData = appState.pssConfig[pssStation];
        
        // Try case-insensitive match if not found
        if (!pssData) {
            const pssKey = Object.keys(appState.pssConfig).find(key => 
                key.toLowerCase() === pssStation.toLowerCase()
            );
            if (pssKey) {
                pssData = appState.pssConfig[pssKey];
            }
        }
        
        if (pssData && pssData.ptrCount) {
            ptrCount = pssData.ptrCount;
        }
        
        // Generate PTR data array dynamically based on ptrCount
        const ptrData = [];
        for (let i = 1; i <= ptrCount; i++) {
            ptrData.push({ key: `ptr${i}_33kv`, name: `PTR-${i} (33kV)`, icon: '\uD83D\uDD04' });
        }
        for (let i = 1; i <= ptrCount; i++) {
            ptrData.push({ key: `ptr${i}_11kv`, name: `PTR-${i} (11kV)`, icon: '\uD83D\uDD04' });
        }
        
        ptrData.forEach(ptr => {
            if (latestToday[ptr.key]) {
                allPeakLoads.push({
                    name: ptr.name,
                    icon: ptr.icon,
                    load: parseFloat(latestToday[ptr.key].maxLoad) || 0,
                    time: latestToday[ptr.key].maxLoadTime || '--:--',
                    voltage: parseFloat(latestToday[ptr.key].maxVoltage) || 0,
                    color: '#a78bfa'
                });
                allMinLoads.push({
                    name: ptr.name,
                    icon: ptr.icon,
                    load: parseFloat(latestToday[ptr.key].minLoad) || 0,
                    time: latestToday[ptr.key].minLoadTime || '--:--',
                    voltage: parseFloat(latestToday[ptr.key].minVoltage) || 0,
                    color: '#3b82f6'
                });
            }
        });
        
        // Feeder Data
        if (latestToday.feeders) {
            Object.entries(latestToday.feeders).forEach(([feederKey, feederData]) => {
                // Extract actual feeder name from data
                const displayName = feederData.name || feederData.feederName || feederKey;
                
                allPeakLoads.push({
                    name: displayName,
                    icon: '\uD83D\uDD0C',
                    load: parseFloat(feederData.maxLoad) || 0,
                    time: feederData.maxLoadTime || '--:--',
                    voltage: parseFloat(feederData.maxVoltage) || 0,
                    color: '#10b981',
                    ptrNo: feederData.ptrNo || 'N/A'
                });
                allMinLoads.push({
                    name: displayName,
                    icon: '\uD83D\uDD0C',
                    load: parseFloat(feederData.minLoad) || 0,
                    time: feederData.minLoadTime || '--:--',
                    voltage: parseFloat(feederData.minVoltage) || 0,
                    color: '#06b6d4',
                    ptrNo: feederData.ptrNo || 'N/A'
                });
            });
        }
    }
    
    // Sort by load value (highest first for peak, lowest first for min)
    allPeakLoads.sort((a, b) => b.load - a.load);
    allMinLoads.sort((a, b) => a.load - b.load);
    
    userState.statistics = {
        today: todaySubmissions.length,
        thisMonth: monthSubmissions.length,
        total: totalSubmissions,
        uniquePSS: uniquePSS,
        streak: streak,
        allPeakLoads: allPeakLoads,
        allMinLoads: allMinLoads
    };
    
    // Store for animation
    userState.currentPeakIndex = 0;
    userState.currentMinIndex = 0;
}

function calculateStreak(submissions) {
    if (!submissions || submissions.length === 0) return 0;
    
    // Get unique dates, sorted in descending order (most recent first)
    const dates = [...new Set(submissions.map(s => s.date))].filter(Boolean).sort().reverse();
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check each day backwards from today
    for (let i = 0; i <= 365; i++) { // Max 1 year streak
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().split('T')[0];
        
        if (dates.includes(checkDateStr)) {
            streak++;
        } else if (i > 0) {
            // If we miss a day after starting the count, break
            break;
        }
        // If i === 0 and no submission today, continue checking yesterday
    }
    
    return streak;
}

// ============================================
// RENDER DASHBOARD
// ============================================

function renderDashboard() {
    renderQuickStats();
    renderSubmissionHistory();
    renderStreakCalendar();
}

function renderQuickStats() {
    const stats = userState.statistics;
    
    // Personal Stats
    updateQuickStat('total-submissions', stats.total, '📊');
    updateQuickStat('month-submissions', stats.thisMonth, '✅');
    updateQuickStat('submission-streak', stats.streak, '🔥');
    updateQuickStat('last-submission', stats.total > 0 ? 'Today' : 'Never', '⏰');
    
    // Start rotating equipment display
    startEquipmentRotation();
}

function startEquipmentRotation() {
    // Clear any existing interval
    if (userState.rotationInterval) {
        clearInterval(userState.rotationInterval);
    }
    
    // Initial display
    updateRotatingEquipment();
    
    // Rotate every 3 seconds
    userState.rotationInterval = setInterval(() => {
        updateRotatingEquipment();
    }, 3000);
}

function updateRotatingEquipment() {
    const stats = userState.statistics;
    
    if (!stats.allPeakLoads || stats.allPeakLoads.length === 0) {
        // No data - show placeholder
        updateEquipmentCard('pssFeeder1Peak', {
            name: 'No Data',
            icon: '⚡',
            load: 0,
            time: '--:--',
            voltage: 0,
            color: '#ef4444'
        });
        updateEquipmentCard('pssFeeder1Min', {
            name: 'No Data',
            icon: '⚡',
            load: 0,
            time: '--:--',
            voltage: 0,
            color: '#3b82f6'
        });
        return;
    }
    
    // Get current items
    const peakItem = stats.allPeakLoads[userState.currentPeakIndex];
    const minItem = stats.allMinLoads[userState.currentMinIndex];
    
    // Update displays with animation
    updateEquipmentCard('pssFeeder1Peak', peakItem);
    updateEquipmentCard('pssFeeder1Min', minItem);
    
    // Increment indices (cycle through all equipment)
    userState.currentPeakIndex = (userState.currentPeakIndex + 1) % stats.allPeakLoads.length;
    userState.currentMinIndex = (userState.currentMinIndex + 1) % stats.allMinLoads.length;
}

function updateEquipmentCard(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Get parent stat-card for glow effect
    const statCard = element.closest('.stat-card');
    
    // Add fade-out class
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        // Update content with dynamic color
        const ptrInfo = data.ptrNo ? ` | PTR ${data.ptrNo}` : '';
        element.innerHTML = `
            <div style="font-size: 24px; font-weight: 700; color: ${data.color}; transition: all 0.3s ease;">
                ${data.load.toFixed(2)} A
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.25rem;">
                @ ${data.time} | ${data.voltage.toFixed(2)} kV
            </div>
            <p style="margin-top: 0.5rem; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);">
                ${data.icon} ${data.name}${ptrInfo}
            </p>
        `;
        
        // Add dynamic glow effect based on equipment type
        if (statCard) {
            const glowColor = data.color;
            statCard.style.boxShadow = `0 0 20px ${glowColor}40`;
        }
        
        // Fade in with transform
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 50);
    }, 300);
}

function updateQuickStat(statId, value, icon) {
    const card = document.querySelector(`[data-stat-id="${statId}"]`);
    if (card) {
        const valueEl = card.querySelector('.stat-number');
        const iconEl = card.querySelector('.stat-icon-wrapper');
        
        if (valueEl) valueEl.textContent = value;
        if (iconEl) iconEl.textContent = icon;
    }
}

function renderSubmissionHistory() {
    const listContainer = document.getElementById('recentSubmissionsContainer');
    console.log('📋 Rendering submission history...');
    console.log('  Container found:', !!listContainer);
    console.log('  Total submissions:', userState.mySubmissions.length);
    
    if (!listContainer) {
        console.error('❌ recentSubmissionsContainer not found in DOM!');
        return;
    }
    
    // Populate staff filter dropdown
    populateStaffFilter();
    
    // Apply filters to submissions
    let filteredSubmissions = [...userState.mySubmissions];
    
    // Filter by staff
    if (userState.submissionFilters.staff !== 'all') {
        filteredSubmissions = filteredSubmissions.filter(sub => 
            sub.staffName === userState.submissionFilters.staff
        );
    }
    
    // Filter by from date
    if (userState.submissionFilters.fromDate) {
        filteredSubmissions = filteredSubmissions.filter(sub => 
            sub.date >= userState.submissionFilters.fromDate
        );
    }
    
    // Filter by to date
    if (userState.submissionFilters.toDate) {
        filteredSubmissions = filteredSubmissions.filter(sub => 
            sub.date <= userState.submissionFilters.toDate
        );
    }
    
    // Update submission count badge
    const countBadge = document.getElementById('submissionCount');
    if (countBadge) {
        const totalCount = userState.mySubmissions.length;
        const filteredCount = filteredSubmissions.length;
        if (totalCount !== filteredCount) {
            countBadge.textContent = `${filteredCount} / ${totalCount}`;
        } else {
            countBadge.textContent = totalCount;
        }
    }
    
    // Get recent submissions (last 10 after filtering)
    const recentSubmissions = filteredSubmissions.slice(0, 10);
    console.log('  Showing filtered:', recentSubmissions.length, 'of', filteredSubmissions.length);
    
    if (recentSubmissions.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <div style="font-size: 64px; margin-bottom: 1rem;">📭</div>
                <h3 style="color: rgba(255,255,255,0.8); margin-bottom: 0.5rem;">No submissions yet</h3>
                <p style="color: rgba(255,255,255,0.6); margin-bottom: 1.5rem;">Click "+ New Entry" to submit your first data.</p>
            </div>
        `;
        console.log('  ✅ Showed empty state');
        return;
    }
    
    // Create detailed table
    let html = `
        <div style="overflow-x: auto; border-radius: 12px; background: rgba(255,255,255,0.03);">
            <table style="width: 100%; border-collapse: collapse; min-width: 800px;">
                <thead>
                    <tr style="background: rgba(96,165,250,0.2); border-bottom: 2px solid rgba(96,165,250,0.3);">
                        <th style="padding: 1rem; text-align: left; color: #60a5fa; font-weight: 600; font-size: 14px;">DATE</th>
                        <th style="padding: 1rem; text-align: left; color: #60a5fa; font-weight: 600; font-size: 14px;">PSS STATION</th>
                        <th style="padding: 1rem; text-align: left; color: #60a5fa; font-weight: 600; font-size: 14px;">STAFF</th>
                        <th style="padding: 1rem; text-align: center; color: #60a5fa; font-weight: 600; font-size: 14px;">FEEDERS</th>
                        <th style="padding: 1rem; text-align: right; color: #60a5fa; font-weight: 600; font-size: 14px;">TOTAL LOAD</th>
                        <th style="padding: 1rem; text-align: center; color: #60a5fa; font-weight: 600; font-size: 14px;">TIME</th>
                        <th style="padding: 1rem; text-align: center; color: #60a5fa; font-weight: 600; font-size: 14px;">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    recentSubmissions.forEach((sub, index) => {
        const canEdit = isEditableSubmission(sub);
        const bgColor = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
        
        // Calculate total load
        let totalMaxLoad = 0;
        let feederCount = 0;
        if (sub.feeders) {
            Object.values(sub.feeders).forEach(feeder => {
                totalMaxLoad += parseFloat(feeder.maxLoad) || 0;
                feederCount++;
            });
        } else if (sub.totalMaxLoad) {
            totalMaxLoad = sub.totalMaxLoad;
        }
        
        html += `
            <tr style="background: ${bgColor}; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" 
                onmouseover="this.style.background='rgba(96,165,250,0.1)'" 
                onmouseout="this.style.background='${bgColor}'">
                <td style="padding: 1rem; color: rgba(255,255,255,0.9); white-space: nowrap;">
                    📅 ${formatDate(sub.date)}
                </td>
                <td style="padding: 1rem; color: rgba(255,255,255,0.9); font-weight: 500;">
                    ${sub.pssStation}
                </td>
                <td style="padding: 1rem; color: rgba(255,255,255,0.8);">
                    👤 ${sub.staffName}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <span style="background: rgba(59,130,246,0.2); color: #60a5fa; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 12px; font-weight: 600;">
                        ${sub.feederCount || feederCount} Feeders
                    </span>
                </td>
                <td style="padding: 1rem; text-align: right; color: #10b981; font-weight: 700; font-size: 16px;">
                    ${totalMaxLoad.toFixed(2)} A
                </td>
                <td style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.7); font-size: 13px;">
                    🕐 ${formatTime(sub.timestamp)}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <button onclick="viewSubmissionDetails('${sub.id}')" 
                        style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-right: 0.5rem; transition: transform 0.2s;"
                        onmouseover="this.style.transform='scale(1.05)'"
                        onmouseout="this.style.transform='scale(1)'">
                        👁️ View
                    </button>
                    ${canEdit ? `
                        <button onclick="editMySubmission('${sub.id}')" 
                            style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: transform 0.2s;"
                            onmouseover="this.style.transform='scale(1.05)'"
                            onmouseout="this.style.transform='scale(1)'">
                            ✏️ Edit
                        </button>
                    ` : `
                        <button disabled 
                            style="background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: not-allowed; font-size: 13px; font-weight: 600;">
                            🔒 Locked
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    listContainer.innerHTML = html;
}

function isEditableSubmission(submission) {
    // Can only edit submissions from last 24 hours
    if (!submission.timestamp) return false;
    
    const submittedTime = submission.timestamp.toDate ? submission.timestamp.toDate() : new Date(submission.timestamp);
    const now = new Date();
    const hoursAgo = (now - submittedTime) / (1000 * 60 * 60);
    
    return hoursAgo < 24;
}

function renderStreakCalendar() {
    // TODO: Implement calendar with submission markers
    console.log('Rendering streak calendar...');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupUserEventListeners() {
    // New Entry button
    document.querySelectorAll('.btn-new-entry').forEach(btn => {
        btn.addEventListener('click', openNewEntryForm);
    });
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            userState.currentFilter = tab.dataset.filter;
            
            // Update UI
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Re-render
            renderSubmissionHistory();
        });
    });
    
    // Logout
    document.querySelector('.btn-logout')?.addEventListener('click', logout);
}

// ============================================
// SUBMISSION ACTIONS
// ============================================

async function viewSubmissionDetails(submissionId) {
    const submission = userState.mySubmissions.find(s => s.id === submissionId);
    if (!submission) {
        alert('Submission not found!');
        return;
    }
    
    console.log('📊 Viewing submission details:', submissionId);
    console.log('  Full submission data:', submission);
    console.log('  Feeders data:', submission.feeders);
    console.log('  Feeders type:', typeof submission.feeders);
    console.log('  Feeders keys:', submission.feeders ? Object.keys(submission.feeders) : 'N/A');
    
    // Build comprehensive details HTML
    let html = `
        <div style="max-height: 70vh; overflow-y: auto; padding: 1rem;">
            <!-- Header Info -->
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; color: white;">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 24px;">📊 Submission Details</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: 14px;">
                    <div>
                        <strong>📅 Date:</strong> ${formatDate(submission.date)}
                    </div>
                    <div>
                        <strong>📍 PSS Station:</strong> ${submission.pssStation}
                    </div>
                    <div>
                        <strong>👤 Staff:</strong> ${submission.staffName}
                    </div>
                    <div>
                        <strong>🕐 Time:</strong> ${formatTime(submission.timestamp)}
                    </div>
                </div>
            </div>
            
            <!-- I/C Sections -->
            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #60a5fa; margin-bottom: 1rem; font-size: 18px;">${String.fromCodePoint(0x26A1)} INCOMING (I/C) DATA</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                    ${renderEquipmentCard('I/C-1', submission.ic1)}
                    ${renderEquipmentCard('I/C-2', submission.ic2)}
                </div>
            </div>
            
            <!-- PTR Sections -->
            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #a78bfa; margin-bottom: 1rem; font-size: 18px;">${String.fromCodePoint(0x1F504)} PTR (POWER TRANSFORMER) DATA</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                    ${renderAllPTRCards(submission)}
                </div>
            </div>
            
            <!-- Feeders Section -->
            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #10b981; margin-bottom: 1rem; font-size: 18px;">${String.fromCodePoint(0x1F50C)} FEEDER DATA</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                    ${renderFeederCards(submission.feeders)}
                </div>
            </div>
            
            <!-- Equipment Section -->
            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: #f59e0b; margin-bottom: 1rem; font-size: 18px;">${String.fromCodePoint(0x1F50B)} EQUIPMENT DATA</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                    ${renderEquipmentCard('Station Transformer', submission.stationTransformer)}
                    ${renderEquipmentCard('Charger (48/24V)', submission.charger)}
                </div>
            </div>
            
            <!-- Summary -->
            <div style="background: rgba(16,185,129,0.1); border: 2px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 1.5rem;">
                <h3 style="color: #10b981; margin: 0 0 1rem 0; font-size: 18px;">${String.fromCodePoint(0x1F4C8)} SUMMARY</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; color: rgba(255,255,255,0.9);">
                    <div>
                        <strong>Total Feeders:</strong> ${submission.feederCount || Object.keys(submission.feeders || {}).length}
                    </div>
                    <div>
                        <strong>Total Max Load:</strong> <span style="color: #10b981; font-weight: 700;">${(submission.totalMaxLoad || 0).toFixed(2)} A</span>
                    </div>
                    <div>
                        <strong>Total Min Load:</strong> <span style="color: #3b82f6; font-weight: 700;">${(submission.totalMinLoad || 0).toFixed(2)} A</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show in modal
    showDetailsModal(html);
}

function renderEquipmentCard(title, data) {
    if (!data) return '';
    
    return `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem;">
            <h4 style="color: rgba(255,255,255,0.9); margin: 0 0 0.75rem 0; font-size: 14px; font-weight: 700;">${title}</h4>
            <div style="display: grid; gap: 0.5rem; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(239,68,68,0.1); border-radius: 6px;">
                    <span style="color: rgba(255,255,255,0.7);">🔴 Max Voltage:</span>
                    <strong style="color: #ef4444;">${data.maxVoltage || 0} kV @ ${data.maxVoltageTime || '--:--'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(59,130,246,0.1); border-radius: 6px;">
                    <span style="color: rgba(255,255,255,0.7);">🔵 Min Voltage:</span>
                    <strong style="color: #3b82f6;">${data.minVoltage || 0} kV @ ${data.minVoltageTime || '--:--'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(245,158,11,0.1); border-radius: 6px;">
                    <span style="color: rgba(255,255,255,0.7);">🟠 Max Load:</span>
                    <strong style="color: #f59e0b;">${data.maxLoad || 0} A @ ${data.maxLoadTime || '--:--'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(6,182,212,0.1); border-radius: 6px;">
                    <span style="color: rgba(255,255,255,0.7);">🔷 Min Load:</span>
                    <strong style="color: #06b6d4;">${data.minLoad || 0} A @ ${data.minLoadTime || '--:--'}</strong>
                </div>
            </div>
        </div>
    `;
}

function renderAllPTRCards(submission) {
    // Dynamically find all PTR fields in the submission
    const ptrCards = [];
    
    // Check for ptr1_33kv through ptr5_33kv
    for (let i = 1; i <= 5; i++) {
        const ptrKey33 = `ptr${i}_33kv`;
        if (submission[ptrKey33]) {
            ptrCards.push(renderEquipmentCard(`PTR-${i} (33kV)`, submission[ptrKey33]));
        }
    }
    
    // Check for ptr1_11kv through ptr5_11kv
    for (let i = 1; i <= 5; i++) {
        const ptrKey11 = `ptr${i}_11kv`;
        if (submission[ptrKey11]) {
            ptrCards.push(renderEquipmentCard(`PTR-${i} (11kV)`, submission[ptrKey11]));
        }
    }
    
    return ptrCards.length > 0 ? ptrCards.join('') : '<p style="color: rgba(255,255,255,0.5);">No PTR data available</p>';
}

function renderFeederCards(feeders) {
    console.log('🔍 renderFeederCards called with:', feeders);
    console.log('  Type:', typeof feeders);
    console.log('  Is null?:', feeders === null);
    console.log('  Is undefined?:', feeders === undefined);
    
    // Handle missing or invalid feeders
    if (!feeders) {
        console.warn('⚠️ No feeders object provided');
        return '<p style="color: rgba(255,255,255,0.5);">No feeder data available (feeders is null/undefined)</p>';
    }
    
    if (typeof feeders !== 'object') {
        console.error('❌ Feeders is not an object:', typeof feeders);
        return '<p style="color: rgba(255,255,255,0.5);">Invalid feeder data format</p>';
    }
    
    const feederKeys = Object.keys(feeders);
    console.log('  Feeder keys:', feederKeys);
    
    if (feederKeys.length === 0) {
        console.warn('⚠️ Feeders object is empty');
        return '<p style="color: rgba(255,255,255,0.5);">No feeder data available (empty object)</p>';
    }
    
    let html = '';
    Object.entries(feeders).forEach(([feederKey, data], i) => {
        console.log(`  Processing feeder ${i}:`, feederKey);
        console.log(`    Data:`, data);
        console.log(`    Data.name type:`, typeof data.name);
        console.log(`    Data.name value:`, data.name);
        
        // Skip if data is invalid
        if (!data || typeof data !== 'object') {
            console.warn(`  ⚠️ Skipping invalid feeder data for ${feederKey}`);
            return;
        }
        
        // Extract the actual feeder name - try multiple strategies
        let feederName = feederKey; // Default to the key itself
        
        // Strategy 1: Check if data.name is a simple string
        if (data.name && typeof data.name === 'string') {
            feederName = data.name;
            console.log(`    ✅ Using data.name (string):`, feederName);
        }
        // Strategy 2: Check if data.name is an object with a name property
        else if (data.name && typeof data.name === 'object' && data.name !== null) {
            if (data.name.name && typeof data.name.name === 'string') {
                feederName = data.name.name;
                console.log(`    ✅ Using data.name.name:`, feederName);
            } else {
                // Try to stringify the object to see what's in it
                console.warn(`    ⚠️ data.name is object but no string name found:`, JSON.stringify(data.name));
                feederName = feederKey; // Fall back to key
            }
        }
        // Strategy 3: Try feederName property
        else if (data.feederName && typeof data.feederName === 'string') {
            feederName = data.feederName;
            console.log(`    ✅ Using data.feederName:`, feederName);
        }
        // Strategy 4: If the feederKey looks like a proper name, use it
        else if (feederKey && feederKey !== 'undefined' && !feederKey.includes('object')) {
            feederName = feederKey;
            console.log(`    ✅ Using feederKey as name:`, feederName);
        }
        // Strategy 5: Generate a default name
        else {
            feederName = `Feeder-${i + 1}`;
            console.log(`    ⚠️ Using default generated name:`, feederName);
        }
        
        html += `
            <div style="background: rgba(59,130,246,0.1); border: 2px solid rgba(59,130,246,0.3); border-radius: 8px; padding: 1rem;">
                <h4 style="color: #60a5fa; margin: 0 0 0.75rem 0; font-size: 14px; font-weight: 700;">${String.fromCodePoint(0x26A1)} ${feederName} (PTR ${data.ptrNo || 'N/A'})</h4>
                <div style="display: grid; gap: 0.5rem; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(239,68,68,0.1); border-radius: 6px;">
                        <span style="color: rgba(255,255,255,0.7);">🔴 Max Voltage:</span>
                        <strong style="color: #ef4444;">${data.maxVoltage || 0} kV @ ${data.maxVoltageTime || '--:--'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(59,130,246,0.1); border-radius: 6px;">
                        <span style="color: rgba(255,255,255,0.7);">🔵 Min Voltage:</span>
                        <strong style="color: #3b82f6;">${data.minVoltage || 0} kV @ ${data.minVoltageTime || '--:--'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(245,158,11,0.1); border-radius: 6px;">
                        <span style="color: rgba(255,255,255,0.7);">🟠 Max Load:</span>
                        <strong style="color: #f59e0b;">${data.maxLoad || 0} A @ ${data.maxLoadTime || '--:--'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(6,182,212,0.1); border-radius: 6px;">
                        <span style="color: rgba(255,255,255,0.7);">🔷 Min Load:</span>
                        <strong style="color: #06b6d4;">${data.minLoad || 0} A @ ${data.minLoadTime || '--:--'}</strong>
                    </div>
                </div>
            </div>
        `;
    });
    
    console.log('✅ Generated HTML for', Object.keys(feeders).length, 'feeders');
    return html || '<p style="color: rgba(255,255,255,0.5);">No valid feeder data to display</p>';
}

function showDetailsModal(content) {
    // Create modal if doesn't exist
    let modal = document.getElementById('detailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'detailsModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 1200px; width: 95%;">
                <div class="modal-header">
                    <h2>📊 Entry Details</h2>
                    <button class="modal-close" onclick="closeDetailsModal()">✕</button>
                </div>
                <div id="detailsModalContent" class="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('detailsModalContent').innerHTML = content;
    modal.style.display = 'flex';
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function viewMySubmission(submissionId) {
    viewSubmissionDetails(submissionId);
}

async function editMySubmission(submissionId) {
    const submission = userState.mySubmissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    if (!isEditableSubmission(submission)) {
        alert('This submission can no longer be edited (24-hour window has passed)');
        return;
    }
    
    // Open form with submission data
    openNewEntryForm(submission);
}

// ============================================
// REAL-TIME LISTENERS
// ============================================

function startUserRealTimeListeners() {
    // Listen for all changes to submissions by this user
    db.collection('daily_entries')
        .where('phoneNumber', '==', appState.currentUser.phoneNumber)
        // .orderBy('timestamp', 'desc')  // Temporarily disabled - needs Firestore index
        .onSnapshot(snapshot => {
            let hasChanges = false;
            
            snapshot.docChanges().forEach(change => {
                const docData = { id: change.doc.id, ...change.doc.data() };
                
                if (change.type === 'added') {
                    // Add if not already in array
                    if (!userState.mySubmissions.find(s => s.id === docData.id)) {
                        userState.mySubmissions.unshift(docData);
                        hasChanges = true;
                        console.log('✅ New submission added:', docData.id);
                    }
                } else if (change.type === 'modified') {
                    // Update existing submission
                    const index = userState.mySubmissions.findIndex(s => s.id === docData.id);
                    if (index !== -1) {
                        userState.mySubmissions[index] = docData;
                        hasChanges = true;
                        console.log('✅ Submission updated:', docData.id);
                    }
                } else if (change.type === 'removed') {
                    // Remove from array
                    const index = userState.mySubmissions.findIndex(s => s.id === docData.id);
                    if (index !== -1) {
                        userState.mySubmissions.splice(index, 1);
                        hasChanges = true;
                        console.log('✅ Submission removed:', docData.id);
                    }
                }
            });
            
            // Only refresh if there were actual changes
            if (hasChanges) {
                calculateUserStatistics();
                renderDashboard();
                renderSubmissionHistory();
            }
        }, error => {
            console.error('❌ Real-time listener error:', error);
        });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    // If already in dd-mm-yyyy format, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return dateString;
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatTime(timestamp) {
    if (!timestamp) return 'Unknown Time';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ============================================
// CLOCK-BASED TIME PICKER
// ============================================

// Show clock picker modal
function showClockPicker(event) {
    const input = event.target;
    currentClockInput = input;
    
    // Parse existing time if present
    const currentTime = input.value || '';
    if (currentTime && currentTime.includes(':')) {
        const [h, m] = currentTime.split(':');
        selectedHour = parseInt(h) || 0;
        selectedMinute = parseInt(m) || 0;
    } else {
        selectedHour = 0;
        selectedMinute = 0;
    }
    
    // Create or show modal
    let modal = document.getElementById('clock-picker-modal');
    if (!modal) {
        modal = createClockPickerModal();
        document.body.appendChild(modal);
    }
    
    updateClockDisplay();
    modal.style.display = 'flex';
    
    // Close on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeClockPicker();
        }
    };
}

// Create clock picker modal HTML
function createClockPickerModal() {
    const modal = document.createElement('div');
    modal.id = 'clock-picker-modal';
    modal.className = 'clock-picker-modal';
    
    modal.innerHTML = `
        <div class="clock-picker-container-simple">
            <div class="clock-picker-header-simple">
                <h3>🕐 Select Hour</h3>
                <button class="clock-close-btn" onclick="closeClockPicker()">✕</button>
            </div>
            
            <!-- Simple Circular Clock with 24 Hours -->
            <div class="clock-face-simple">
                <div class="clock-center"></div>
                
                <!-- 24 hour numbers in single circle -->
                ${Array.from({length: 24}, (_, h) => {
                    const angle = (h * 15) - 90; // 360/24 = 15 degrees each
                    const x = 50 + 38 * Math.cos(angle * Math.PI / 180);
                    const y = 50 + 38 * Math.sin(angle * Math.PI / 180);
                    const display = h === 0 ? '00' : h < 10 ? '0' + h : h.toString();
                    return `<div class="clock-hour-simple" style="left: ${x}%; top: ${y}%;" data-hour="${h}" onclick="quickSelectHour(${h})">${display}</div>`;
                }).join('')}
            </div>
        </div>
    `;
    
    return modal;
}

// Quick select hour and immediately close
function quickSelectHour(hour) {
    selectedHour = hour;
    selectedMinute = 0;  // Default to 00 minutes
    
    if (currentClockInput) {
        const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
        currentClockInput.value = timeString;
    }
    
    closeClockPicker();
}

// Select hour from clock face
function selectHourFromClock(hour) {
    selectedHour = hour;
    updateClockDisplay();
}

// Select minute
function selectMinute(minute) {
    selectedMinute = minute;
    updateClockDisplay();
}

// Update clock display
function updateClockDisplay() {
    // Update clock hands
    const hourHand = document.getElementById('clock-hand-hour');
    const minuteHand = document.getElementById('clock-hand-minute');
    
    if (hourHand && minuteHand) {
        const hourAngle = (selectedHour % 12) * 30 + (selectedMinute * 0.5);
        const minuteAngle = selectedMinute * 6;
        
        hourHand.style.transform = `rotate(${hourAngle}deg)`;
        minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
    }
    
    // Update display
    const displayHour = document.getElementById('display-hour');
    const displayMinute = document.getElementById('display-minute');
    
    if (displayHour) displayHour.textContent = selectedHour.toString().padStart(2, '0');
    if (displayMinute) displayMinute.textContent = selectedMinute.toString().padStart(2, '0');
    
    // Highlight selected hour button on clock
    document.querySelectorAll('.clock-hour-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedHourBtn = document.querySelector(`[data-hour="${selectedHour}"]`);
    if (selectedHourBtn) {
        selectedHourBtn.classList.add('selected');
    }
    
    // Highlight selected minute button
    document.querySelectorAll('.time-number-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const minuteBtn = document.querySelector(`[onclick="selectMinute(${selectedMinute})"]`);
    if (minuteBtn) minuteBtn.classList.add('selected');
}

// Update time from manual input
function updateManualTime() {
    updateClockDisplay();
}

// Set current time
function setCurrentTime() {
    const now = new Date();
    selectedHour = now.getHours();
    selectedMinute = now.getMinutes();
    updateClockDisplay();
}

// Clear time
function clearTime() {
    selectedHour = 0;
    selectedMinute = 0;
    updateClockDisplay();
}

// Confirm and close
function confirmTime() {
    if (currentClockInput) {
        const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
        currentClockInput.value = timeString;
        
        // Trigger change event for auto-save
        const event = new Event('change', { bubbles: true });
        currentClockInput.dispatchEvent(event);
    }
    closeClockPicker();
}

// Close clock picker
function closeClockPicker() {
    const modal = document.getElementById('clock-picker-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentClockInput = null;
}

// Initialize time pickers in modal form
function initializeTimePickersInModal() {
    const timeInputs = document.querySelectorAll('.time-picker-input');
    console.log(`Initializing ${timeInputs.length} time pickers in modal`);
    
    timeInputs.forEach(input => {
        // Remove existing listeners
        input.removeEventListener('click', showClockPicker);
        
        // Add click listener
        input.addEventListener('click', showClockPicker);
        
        console.log(`Time picker initialized for: ${input.id}`);
    });
}

// Export functions
window.loadUserDashboard = loadUserDashboard;
window.initializeTimePickersInModal = initializeTimePickersInModal;
window.showClockPicker = showClockPicker;
window.closeClockPicker = closeClockPicker;
window.quickSelectHour = quickSelectHour;
window.selectMinute = selectMinute;

// ============================================
// NEW ENTRY FORM FUNCTIONS
// ============================================

function openNewEntryForm() {
    console.log('Opening new entry form...');
    console.log('Current user:', appState.currentUser);
    console.log('PSS Config:', appState.pssConfig);
    console.log('All appState:', appState);
    
    const modal = document.getElementById('newEntryModal');
    const formPSSStation = document.getElementById('formPSSStation');
    const formDate = document.getElementById('formDate');
    const linemenCards = document.getElementById('linemenCards');
    const helpersCards = document.getElementById('helpersCards');
    
    // Set PSS Station (from logged-in user)
    const pssStation = appState.currentUser.pssStation || appState.currentUser.name || 'KUNDUKELA';
    formPSSStation.value = pssStation;
    console.log('PSS Station:', pssStation);
    
    // Clear previous selections
    linemenCards.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">Loading staff data...</p>';
    helpersCards.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">Loading staff data...</p>';
    document.getElementById('selectedStaffMember').value = '';
    
    // Reset wizard to step 0
    currentWizardStep = 0;
    
    // Reset all wizard steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById('step0').classList.add('active');
    
    // Reset stepper visual state
    document.querySelectorAll('.stepper-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) {
            step.classList.add('active');
        }
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'inline-block';
    document.getElementById('submitBtn').style.display = 'none';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Check if PSS Config is empty and reload if needed
    if (!appState.pssConfig || Object.keys(appState.pssConfig).length === 0) {
        console.warn('⚠️ PSS Config is empty! Reloading from Firebase...');
        db.collection('pss_stations').get().then(snapshot => {
            appState.pssConfig = {};
            snapshot.forEach(doc => {
                appState.pssConfig[doc.id] = doc.data();
            });
            console.log('✅ PSS Config reloaded:', appState.pssConfig);
            populateStaffCards(pssStation, linemenCards, helpersCards);
        }).catch(error => {
            console.error('❌ Error reloading PSS config:', error);
            linemenCards.innerHTML = '<p style="color: #ef4444;">Error loading staff. Please reload page.</p>';
            helpersCards.innerHTML = '<p style="color: #ef4444;">Error loading staff. Please reload page.</p>';
        });
        return; // Exit and wait for data to load
    }
    
    // Populate staff cards
    populateStaffCards(pssStation, linemenCards, helpersCards);
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    formDate.value = today;
}

function populateStaffCards(pssStation, linemenCards, helpersCards) {
    // Get PSS data - check multiple possible locations
    let pssData = appState.pssConfig[pssStation];
    
    // If not found, try finding by case-insensitive match
    if (!pssData) {
        const pssKey = Object.keys(appState.pssConfig).find(key => 
            key.toLowerCase() === pssStation.toLowerCase()
        );
        if (pssKey) {
            pssData = appState.pssConfig[pssKey];
            console.log('Found PSS data with key:', pssKey);
        }
    }
    
    console.log('PSS Data for', pssStation, ':', pssData);
    console.log('Available PSS keys:', Object.keys(appState.pssConfig));
    
    // Clear loading messages
    linemenCards.innerHTML = '';
    helpersCards.innerHTML = '';
    
    if (pssData) {
        // Add linemen cards - check both 'lineman' (singular) and 'linemen' (plural)
        const linemenList = pssData.lineman || pssData.linemen || [];
        if (Array.isArray(linemenList) && linemenList.length > 0) {
            console.log('Linemen:', linemenList);
            linemenList.forEach(name => {
                if (name && name.trim()) {
                    const card = document.createElement('div');
                    card.className = 'staff-card';
                    card.onclick = () => selectStaffMember(name, card);
                    card.innerHTML = `
                        <span class="staff-card-name">${name}</span>
                        <span class="staff-card-check">✓</span>
                    `;
                    linemenCards.appendChild(card);
                }
            });
        }
        
        if (linemenCards.children.length === 0) {
            console.warn('No linemen found for PSS:', pssStation);
            linemenCards.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">No linemen available</p>';
        }
        
        // Add helpers cards - check both 'helper' (singular) and 'helpers' (plural)
        const helpersList = pssData.helper || pssData.helpers || [];
        if (Array.isArray(helpersList) && helpersList.length > 0) {
            console.log('Helpers:', helpersList);
            helpersList.forEach(name => {
                if (name && name.trim()) {
                    const card = document.createElement('div');
                    card.className = 'staff-card';
                    card.onclick = () => selectStaffMember(name, card);
                    card.innerHTML = `
                        <span class="staff-card-name">${name}</span>
                        <span class="staff-card-check">✓</span>
                    `;
                    helpersCards.appendChild(card);
                }
            });
        }
        
        if (helpersCards.children.length === 0) {
            console.warn('No helpers found');
            helpersCards.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">No helpers available</p>';
        }
        
        // Store feeders count for later use
        if (pssData.feeders) {
            document.getElementById('formPSSStation').dataset.feedersCount = pssData.feeders;
        }
    } else {
        console.error('No PSS data found for:', pssStation);
        console.error('Available PSS stations:', Object.keys(appState.pssConfig));
        linemenCards.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">❌ PSS data not found. Please reload page.</p>';
        helpersCards.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">❌ PSS data not found. Please reload page.</p>';
    }
}

function selectStaffMember(name, clickedCard) {
    // Remove selected class from all cards
    document.querySelectorAll('.staff-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    clickedCard.classList.add('selected');
    
    // Store selected staff member
    document.getElementById('selectedStaffMember').value = name;
}

function closeNewEntryForm() {
    document.getElementById('newEntryModal').style.display = 'none';
    // Reset wizard to step 0
    currentWizardStep = 0;
    updateWizardButtons();
    
    // Reset all stepper states
    document.querySelectorAll('.stepper-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) step.classList.add('active');
    });
    
    // Show only first step
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
        step.classList.remove('active');
        if (index === 0) step.classList.add('active');
    });
}

// ============================================
// MULTI-STEP WIZARD NAVIGATION
// ============================================

const totalSteps = 5;

function nextStep() {
    // Validate current step before proceeding
    if (!validateCurrentStep()) {
        return;
    }
    
    // Mark current step as completed
    const currentStepEl = document.querySelector(`.stepper-step[data-step="${currentWizardStep}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('completed');
        currentStepEl.classList.remove('active');
    }
    
    // Hide current step
    const currentContent = document.getElementById(`step${currentWizardStep}`);
    if (currentContent) {
        currentContent.classList.remove('active');
    }
    
    // Move to next step
    currentWizardStep++;
    
    // Generate content for new step if needed
    if (currentWizardStep === 1) {
        generateICSection();
    } else if (currentWizardStep === 2) {
        generatePTRSection();
    } else if (currentWizardStep === 3) {
        generateFeederSection();
    } else if (currentWizardStep === 4) {
        generateEquipmentSection();
    }
    
    // Show new step
    const newStepEl = document.querySelector(`.stepper-step[data-step="${currentWizardStep}"]`);
    if (newStepEl) {
        newStepEl.classList.add('active');
    }
    
    const newContent = document.getElementById(`step${currentWizardStep}`);
    if (newContent) {
        newContent.classList.add('active');
    }
    
    // Update buttons
    updateWizardButtons();
}

function previousStep() {
    // Mark current step as not completed
    const currentStepEl = document.querySelector(`.stepper-step[data-step="${currentWizardStep}"]`);
    if (currentStepEl) {
        currentStepEl.classList.remove('active');
    }
    
    // Hide current step
    const currentContent = document.getElementById(`step${currentWizardStep}`);
    if (currentContent) {
        currentContent.classList.remove('active');
    }
    
    // Move to previous step
    currentWizardStep--;
    
    // Show previous step
    const prevStepEl = document.querySelector(`.stepper-step[data-step="${currentWizardStep}"]`);
    if (prevStepEl) {
        prevStepEl.classList.add('active');
        prevStepEl.classList.remove('completed');
    }
    
    const prevContent = document.getElementById(`step${currentWizardStep}`);
    if (prevContent) {
        prevContent.classList.add('active');
    }
    
    // Update buttons
    updateWizardButtons();
}

function updateWizardButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // Show/hide previous button
    if (currentWizardStep === 0) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
    }
    
    // Show/hide next and submit buttons
    if (currentWizardStep === totalSteps - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

function validateCurrentStep() {
    if (currentWizardStep === 0) {
        // Validate staff selection
        const staffName = document.getElementById('selectedStaffMember').value;
        const date = document.getElementById('formDate').value;
        
        if (!date) {
            alert('❌ Please select a date');
            document.getElementById('formDate').focus();
            return false;
        }
        
        if (!staffName) {
            alert('❌ Please select a staff member');
            return false;
        }
        
        return true;
    }
    
    // Other steps don't need validation before proceeding (optional fields)
    return true;
}

// ============================================
// SECTION GENERATORS
// ============================================

// Helper function to create equipment section with 8 fields (Max/Min Voltage/Load + 4 time inputs)
function createEquipmentSection(title, idPrefix, icon = '⚡') {
    return `
        <div class="equipment-section" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 2px solid rgba(255,255,255,0.1);">
            <h4 style="color: #60a5fa; font-size: 18px; margin-bottom: 20px; font-weight: 700;">
                ${icon} ${title}
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="form-group">
                    <label style="color: #ef4444; font-weight: 600; font-size: 12px;">🔴 MAX VOLTAGE (KV)</label>
                    <input type="number" id="${idPrefix}_max_voltage" class="form-control" placeholder="Max KV" step="0.01" min="0" style="border-left: 4px solid #ef4444;">
                </div>
                <div class="form-group">
                    <label style="color: #ef4444; font-weight: 600; font-size: 12px;">⏰ MAX VOLTAGE TIME</label>
                    <input type="text" id="${idPrefix}_max_voltage_time" class="form-control clock-time-input" placeholder="HH:MM" readonly style="border-left: 4px solid #ef4444;">
                </div>
                <div class="form-group">
                    <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">🔵 MIN VOLTAGE (KV)</label>
                    <input type="number" id="${idPrefix}_min_voltage" class="form-control" placeholder="Min KV" step="0.01" min="0" style="border-left: 4px solid #3b82f6;">
                </div>
                <div class="form-group">
                    <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">⏰ MIN VOLTAGE TIME</label>
                    <input type="text" id="${idPrefix}_min_voltage_time" class="form-control clock-time-input" placeholder="HH:MM" readonly style="border-left: 4px solid #3b82f6;">
                </div>
                <div class="form-group">
                    <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">🟠 MAX LOAD (AMP)</label>
                    <input type="number" id="${idPrefix}_max_load" class="form-control" placeholder="Max AMP" step="0.01" min="0" style="border-left: 4px solid #f59e0b;">
                </div>
                <div class="form-group">
                    <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">⏰ MAX LOAD TIME</label>
                    <input type="text" id="${idPrefix}_max_load_time" class="form-control clock-time-input" placeholder="HH:MM" readonly style="border-left: 4px solid #f59e0b;">
                </div>
                <div class="form-group">
                    <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">🔷 MIN LOAD (AMP)</label>
                    <input type="number" id="${idPrefix}_min_load" class="form-control" placeholder="Min AMP" step="0.01" min="0" style="border-left: 4px solid #06b6d4;">
                </div>
                <div class="form-group">
                    <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">⏰ MIN LOAD TIME</label>
                    <input type="text" id="${idPrefix}_min_load_time" class="form-control clock-time-input" placeholder="HH:MM" readonly style="border-left: 4px solid #06b6d4;">
                </div>
            </div>
        </div>
    `;
}

function generateICSection() {
    const container = document.getElementById('icContainer');
    container.innerHTML = `
        ${createEquipmentSection('33KV I/C-1 (GSS)', 'ic1', '🔌')}
        ${createEquipmentSection('33KV I/C-2 (GSS)', 'ic2', '🔌')}
    `;
    console.log('✅ Generated I/C sections');
    
    // Initialize clock pickers for all time inputs
    setTimeout(() => initializeTimePickersInModal(), 100);
}

function generatePTRSection() {
    const container = document.getElementById('ptrContainer');
    const pssStation = appState.currentUser.pssStation;
    
    console.log('🔍 Generating PTR section...');
    console.log('  PSS Station:', pssStation);
    
    // Get PSS data with case-insensitive matching
    let pssData = appState.pssConfig[pssStation];
    
    if (!pssData) {
        const pssKey = Object.keys(appState.pssConfig).find(key => 
            key.toLowerCase() === pssStation.toLowerCase()
        );
        if (pssKey) {
            pssData = appState.pssConfig[pssKey];
            console.log('  ✅ Found PSS data with key:', pssKey);
        }
    }
    
    // Get PTR count from PSS configuration (default to 2)
    const ptrCount = pssData?.ptrCount || 2;
    console.log('  ✅ PTR Count:', ptrCount);
    
    // Generate PTR sections dynamically based on ptrCount
    let ptrHTML = '';
    for (let i = 1; i <= ptrCount; i++) {
        ptrHTML += createEquipmentSection(`PTR-${i} 33kv side`, `ptr${i}_33kv`, '⚙️');
    }
    for (let i = 1; i <= ptrCount; i++) {
        ptrHTML += createEquipmentSection(`PTR-${i} 11kv side`, `ptr${i}_11kv`, '⚙️');
    }
    
    container.innerHTML = ptrHTML;
    console.log(`✅ Generated ${ptrCount} PTR sections (33kV and 11kV)`);
    
    // Initialize clock pickers for all time inputs
    setTimeout(() => initializeTimePickersInModal(), 100);
}

function generateFeederSection() {
    const container = document.getElementById('feedersContainer');
    const pssStation = appState.currentUser.pssStation;
    
    console.log('🔍 Generating feeder section...');
    console.log('  PSS Station:', pssStation);
    console.log('  PSS Config keys:', Object.keys(appState.pssConfig));
    
    // Get PSS data with case-insensitive matching
    let pssData = appState.pssConfig[pssStation];
    
    if (!pssData) {
        console.warn('  ⚠️ PSS data not found with exact match, trying case-insensitive...');
        const pssKey = Object.keys(appState.pssConfig).find(key => 
            key.toLowerCase() === pssStation.toLowerCase()
        );
        if (pssKey) {
            pssData = appState.pssConfig[pssKey];
            console.log('  ✅ Found PSS data with key:', pssKey);
        } else {
            console.error('  ❌ No case-insensitive match found');
        }
    } else {
        console.log('  ✅ Found PSS data:', pssData);
    }
    
    // Default to 3 feeders if PSS data or feeders not found
    let feedersArray = [];
    if (!pssData || !pssData.feeders) {
        console.warn('⚠️ PSS configuration not found, using default 3 feeders');
        feedersArray = ['Feeder-1', 'Feeder-2', 'Feeder-3'];
    } else if (typeof pssData.feeders === 'number') {
        for (let i = 1; i <= pssData.feeders; i++) {
            feedersArray.push(`Feeder-${i}`);
        }
        console.log('  ✅ Using', pssData.feeders, 'feeders (number format)');
    } else if (Array.isArray(pssData.feeders)) {
        // Handle both string arrays and object arrays
        feedersArray = pssData.feeders.map(feeder => {
            if (typeof feeder === 'string') {
                return feeder;
            } else if (typeof feeder === 'object' && feeder !== null) {
                // If it's an object, try to extract the name property
                return feeder.name || feeder.feederName || `Feeder-${feedersArray.length + 1}`;
            } else {
                return String(feeder);
            }
        });
        console.log('  ✅ Using', feedersArray.length, 'feeders (array format):', feedersArray);
    } else {
        console.error('  ❌ Unexpected feeders format:', typeof pssData.feeders);
        feedersArray = ['Feeder-1', 'Feeder-2', 'Feeder-3'];
    }
    
    // Get PTR count for dropdown options
    const ptrCount = pssData?.ptrCount || 2;
    let ptrOptions = '<option value="">Select PTR</option>';
    for (let i = 1; i <= ptrCount; i++) {
        ptrOptions += `<option value="${i}">PTR ${i}</option>`;
    }
    
    let html = `<p style="color: rgba(255,255,255,0.7); margin-bottom: 20px;">Configure ${feedersArray.length} feeders for ${pssStation} (${ptrCount} PTRs available)</p>`;
    
    feedersArray.forEach((feeder, index) => {
        // Ensure feeder is a string for display
        const feederName = typeof feeder === 'string' ? feeder : (feeder?.name || `Feeder-${index + 1}`);
        
        html += `
        <div class="equipment-section" style="background: rgba(59,130,246,0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 2px solid rgba(59,130,246,0.3);">
            <h4 style="color: #60a5fa; font-size: 18px; margin-bottom: 20px; font-weight: 700;">
                ⚡ ${feederName}
            </h4>
            <div style="margin-bottom: 16px;">
                <label style="color: #a78bfa; font-weight: 600; font-size: 12px;">🔢 PTR NO (SELECT)</label>
                <select id="feeder_${index}_ptr" class="form-control" style="border-left: 4px solid #a78bfa;">
                    ${ptrOptions}
                </select>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="form-group">
                    <label style="color: #ef4444; font-weight: 600; font-size: 12px;">🔴 MAX VOLTAGE (KV)</label>
                    <input type="number" id="feeder_${index}_max_voltage" class="form-control" placeholder="Max KV" step="0.01" min="0" style="border-left: 4px solid #ef4444;">
                </div>
                <div class="form-group">
                    <label style="color: #ef4444; font-weight: 600; font-size: 12px;">⏰ MAX VOLTAGE TIME</label>
                    <input type="text" id="feeder_${index}_max_voltage_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #ef4444;">
                </div>
                <div class="form-group">
                    <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">🔵 MIN VOLTAGE (KV)</label>
                    <input type="number" id="feeder_${index}_min_voltage" class="form-control" placeholder="Min KV" step="0.01" min="0" style="border-left: 4px solid #3b82f6;">
                </div>
                <div class="form-group">
                    <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">⏰ MIN VOLTAGE TIME</label>
                    <input type="text" id="feeder_${index}_min_voltage_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #3b82f6;">
                </div>
                <div class="form-group">
                    <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">🟠 MAX LOAD (AMP)</label>
                    <input type="number" id="feeder_${index}_max_load" class="form-control" placeholder="Max AMP" step="0.01" min="0" style="border-left: 4px solid #f59e0b;">
                </div>
                <div class="form-group">
                    <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">⏰ MAX LOAD TIME</label>
                    <input type="text" id="feeder_${index}_max_load_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #f59e0b;">
                </div>
                <div class="form-group">
                    <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">🔷 MIN LOAD (AMP)</label>
                    <input type="number" id="feeder_${index}_min_load" class="form-control" placeholder="Min AMP" step="0.01" min="0" style="border-left: 4px solid #06b6d4;">
                </div>
                <div class="form-group">
                    <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">⏰ MIN LOAD TIME</label>
                    <input type="text" id="feeder_${index}_min_load_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #06b6d4;">
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    console.log(`✅ Generated ${feedersArray.length} feeder sections`);
    
    // Initialize clock pickers for all time inputs
    setTimeout(() => initializeTimePickersInModal(), 100);
}

function generateEquipmentSection() {
    const container = document.getElementById('equipmentContainer');
    container.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 16px;">🔋 Station Transformer (33kv/0.415kv)</h4>
            ${createEquipmentSection('Station Transformer', 'station_transformer', '🔌')}
        </div>
        
        <div>
            <h4 style="color: #a855f7; font-size: 18px; margin-bottom: 20px; font-weight: 700;">🔋 CHARGER 48/24V (O/P DC VOLT)</h4>
            <div class="equipment-section" style="background: rgba(168,85,247,0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 2px solid rgba(168,85,247,0.3);">
                <div style="margin-bottom: 16px;">
                    <label style="color: #a78bfa; font-weight: 600; font-size: 12px;">🔢 PTR NO (SELECT)</label>
                    <select id="charger_ptr" class="form-control" style="border-left: 4px solid #a78bfa; background: rgba(168,85,247,0.15); color: #e9d5ff; border: 1px solid rgba(168,85,247,0.5); border-radius: 8px; padding: 10px 12px; font-size: 14px;">
                        <option value="">Select PTR</option>
                        <option value="1">PTR 1</option>
                        <option value="2">PTR 2</option>
                        <option value="3">PTR 3</option>
                        <option value="4">PTR 4</option>
                        <option value="5">PTR 5</option>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="form-group">
                        <label style="color: #ef4444; font-weight: 600; font-size: 12px;">🔴 MAX VOLTAGE (KV)</label>
                        <input type="number" id="charger_max_voltage" class="form-control" placeholder="Max KV" step="0.01" min="0" style="border-left: 4px solid #ef4444;">
                    </div>
                    <div class="form-group">
                        <label style="color: #ef4444; font-weight: 600; font-size: 12px;">⏰ MAX VOLTAGE TIME</label>
                        <input type="text" id="charger_max_voltage_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #ef4444;">
                    </div>
                    <div class="form-group">
                        <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">🔵 MIN VOLTAGE (KV)</label>
                        <input type="number" id="charger_min_voltage" class="form-control" placeholder="Min KV" step="0.01" min="0" style="border-left: 4px solid #3b82f6;">
                    </div>
                    <div class="form-group">
                        <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">⏰ MIN VOLTAGE TIME</label>
                        <input type="text" id="charger_min_voltage_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #3b82f6;">
                    </div>
                    <div class="form-group">
                        <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">🟠 MAX LOAD (AMP)</label>
                        <input type="number" id="charger_max_load" class="form-control" placeholder="Max AMP" step="0.01" min="0" style="border-left: 4px solid #f59e0b;">
                    </div>
                    <div class="form-group">
                        <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">⏰ MAX LOAD TIME</label>
                        <input type="text" id="charger_max_load_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #f59e0b;">
                    </div>
                    <div class="form-group">
                        <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">🔷 MIN LOAD (AMP)</label>
                        <input type="number" id="charger_min_load" class="form-control" placeholder="Min AMP" step="0.01" min="0" style="border-left: 4px solid #06b6d4;">
                    </div>
                    <div class="form-group">
                        <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">⏰ MIN LOAD TIME</label>
                        <input type="text" id="charger_min_load_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #06b6d4;">
                    </div>
                </div>
            </div>
        </div>
    `;
    console.log('✅ Generated equipment sections');
    
    // Initialize clock pickers for all time inputs
    setTimeout(() => initializeTimePickersInModal(), 100);
}

// Helper function to create equipment section with 8 fields
function createEquipmentSection(title, idPrefix, icon = '⚡') {
    return `
        <div class="equipment-section" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 2px solid rgba(255,255,255,0.1);">
            <h4 style="color: #60a5fa; font-size: 20px; margin-bottom: 20px; font-weight: 700;">
                ${icon} ${title}
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="form-group">
                    <label style="color: #ef4444; font-weight: 600; font-size: 12px;">🔴 MAX VOLTAGE (KV)</label>
                    <input type="number" id="${idPrefix}_max_voltage" class="form-control" placeholder="Max KV" step="0.01" min="0" style="border-left: 4px solid #ef4444;" required>
                </div>
                <div class="form-group">
                    <label style="color: #ef4444; font-weight: 600; font-size: 12px;">⏰ MAX VOLTAGE TIME</label>
                    <input type="text" id="${idPrefix}_max_voltage_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #ef4444;" required>
                </div>
                <div class="form-group">
                    <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">🔵 MIN VOLTAGE (KV)</label>
                    <input type="number" id="${idPrefix}_min_voltage" class="form-control" placeholder="Min KV" step="0.01" min="0" style="border-left: 4px solid #3b82f6;" required>
                </div>
                <div class="form-group">
                    <label style="color: #3b82f6; font-weight: 600; font-size: 12px;">⏰ MIN VOLTAGE TIME</label>
                    <input type="text" id="${idPrefix}_min_voltage_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #3b82f6;" required>
                </div>
                <div class="form-group">
                    <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">🟠 MAX LOAD (AMP)</label>
                    <input type="number" id="${idPrefix}_max_load" class="form-control" placeholder="Max AMP" step="0.01" min="0" style="border-left: 4px solid #f59e0b;" required>
                </div>
                <div class="form-group">
                    <label style="color: #f59e0b; font-weight: 600; font-size: 12px;">⏰ MAX LOAD TIME</label>
                    <input type="text" id="${idPrefix}_max_load_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #f59e0b;" required>
                </div>
                <div class="form-group">
                    <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">🔷 MIN LOAD (AMP)</label>
                    <input type="number" id="${idPrefix}_min_load" class="form-control" placeholder="Min AMP" step="0.01" min="0" style="border-left: 4px solid #06b6d4;" required>
                </div>
                <div class="form-group">
                    <label style="color: #06b6d4; font-weight: 600; font-size: 12px;">⏰ MIN LOAD TIME</label>
                    <input type="text" id="${idPrefix}_min_load_time" class="form-control time-picker-input" placeholder="--:--" readonly style="border-left: 4px solid #06b6d4;" required>
                </div>
            </div>
        </div>
    `;
}

// Helper function to collect equipment data
function collectEquipmentData(idPrefix) {
    return {
        maxVoltage: parseFloat(document.getElementById(`${idPrefix}_max_voltage`)?.value || 0),
        maxVoltageTime: document.getElementById(`${idPrefix}_max_voltage_time`)?.value || '',
        minVoltage: parseFloat(document.getElementById(`${idPrefix}_min_voltage`)?.value || 0),
        minVoltageTime: document.getElementById(`${idPrefix}_min_voltage_time`)?.value || '',
        maxLoad: parseFloat(document.getElementById(`${idPrefix}_max_load`)?.value || 0),
        maxLoadTime: document.getElementById(`${idPrefix}_max_load_time`)?.value || '',
        minLoad: parseFloat(document.getElementById(`${idPrefix}_min_load`)?.value || 0),
        minLoadTime: document.getElementById(`${idPrefix}_min_load_time`)?.value || ''
    };
}

// ============================================
// DATA SUBMISSION
// ============================================

async function submitLoadingData() {
    try {
        const staffName = document.getElementById('selectedStaffMember').value;
        const date = document.getElementById('formDate').value;
        const pssStation = appState.currentUser.pssStation;
        
        if (!staffName) {
            alert('❌ Please select a staff member');
            return;
        }
        
        if (!date) {
            alert('❌ Please select a date');
            document.getElementById('formDate').focus();
            return;
        }
        
        // Get PSS data with validation (case-insensitive)
        let pssData = appState.pssConfig[pssStation];
        
        // Try case-insensitive match if not found
        if (!pssData) {
            const pssKey = Object.keys(appState.pssConfig).find(key => 
                key.toLowerCase() === pssStation.toLowerCase()
            );
            if (pssKey) {
                pssData = appState.pssConfig[pssKey];
                console.log('Found PSS data with key:', pssKey);
            }
        }
        
        if (!pssData) {
            console.warn('⚠️ PSS Configuration not found for ' + pssStation);
            console.log('Available stations:', Object.keys(appState.pssConfig));
            console.log('Using default configuration with 3 feeders');
        }
        
        // Get feeders array (handle ALL types: number, array, or undefined)
        // IMPORTANT: Always convert to string array to avoid [object Object] keys
        let feedersArray = [];
        if (!pssData || !pssData.feeders) {
            // Default to 3 feeders if not specified
            console.warn('No feeders configuration found, defaulting to 3');
            feedersArray = ['Feeder-1', 'Feeder-2', 'Feeder-3'];
        } else if (typeof pssData.feeders === 'number') {
            for (let i = 1; i <= pssData.feeders; i++) {
                feedersArray.push(`Feeder-${i}`);
            }
        } else if (Array.isArray(pssData.feeders)) {
            // Handle both string arrays and object arrays - ALWAYS convert to strings
            feedersArray = pssData.feeders.map((feeder, index) => {
                if (typeof feeder === 'string') {
                    return feeder;
                } else if (typeof feeder === 'object' && feeder !== null) {
                    // Extract name from object
                    return feeder.name || feeder.feederName || `Feeder-${index + 1}`;
                } else {
                    return String(feeder) || `Feeder-${index + 1}`;
                }
            });
            console.log('✅ Converted feeders to string array:', feedersArray);
        } else {
            // Fallback for unexpected data type
            console.warn('Unexpected feeders format:', typeof pssData.feeders);
            feedersArray = ['Feeder-1', 'Feeder-2', 'Feeder-3'];
        }
        
        // 1. COLLECT I/C DATA
        const ic1Data = collectEquipmentData('ic1');
        const ic2Data = collectEquipmentData('ic2');
        
        // 2. COLLECT PTR DATA (DYNAMIC based on ptrCount)
        const ptrCount = pssData?.ptrCount || 2;
        console.log(`Collecting data for ${ptrCount} PTRs`);
        
        const ptrData = {};
        for (let i = 1; i <= ptrCount; i++) {
            ptrData[`ptr${i}_33kv`] = collectEquipmentData(`ptr${i}_33kv`);
            ptrData[`ptr${i}_11kv`] = collectEquipmentData(`ptr${i}_11kv`);
        }
        
        // 3. COLLECT FEEDER DATA (Dynamic based on PSS)
        const feedersData = {};
        let totalMaxLoad = 0;
        let totalMinLoad = 0;
        
        console.log('📦 Collecting feeder data...');
        console.log('  feedersArray:', feedersArray);
        
        for (let index = 0; index < feedersArray.length; index++) {
            const feeder = feedersArray[index];
            console.log(`  Processing feeder ${index}:`, feeder, 'Type:', typeof feeder);
            
            // Extract feeder name properly (handle both string and object)
            let feederName;
            if (typeof feeder === 'string') {
                feederName = feeder;
            } else if (typeof feeder === 'object' && feeder !== null) {
                feederName = feeder.name || feeder.feederName || `Feeder-${index + 1}`;
            } else {
                feederName = String(feeder) || `Feeder-${index + 1}`;
            }
            
            console.log(`    Extracted feederName:`, feederName);
            
            const ptrNo = document.getElementById(`feeder_${index}_ptr`)?.value || '';
            const maxVoltage = parseFloat(document.getElementById(`feeder_${index}_max_voltage`)?.value || 0);
            const maxVoltageTime = document.getElementById(`feeder_${index}_max_voltage_time`)?.value || '';
            const minVoltage = parseFloat(document.getElementById(`feeder_${index}_min_voltage`)?.value || 0);
            const minVoltageTime = document.getElementById(`feeder_${index}_min_voltage_time`)?.value || '';
            const maxLoad = parseFloat(document.getElementById(`feeder_${index}_max_load`)?.value || 0);
            const maxLoadTime = document.getElementById(`feeder_${index}_max_load_time`)?.value || '';
            const minLoad = parseFloat(document.getElementById(`feeder_${index}_min_load`)?.value || 0);
            const minLoadTime = document.getElementById(`feeder_${index}_min_load_time`)?.value || '';
            
            // Use the extracted string name as the key
            feedersData[feederName] = {
                name: feederName,  // Store feeder name explicitly for display
                ptrNo: ptrNo,
                maxVoltage: maxVoltage,
                maxVoltageTime: maxVoltageTime,
                minVoltage: minVoltage,
                minVoltageTime: minVoltageTime,
                maxLoad: maxLoad,
                maxLoadTime: maxLoadTime,
                minLoad: minLoad,
                minLoadTime: minLoadTime
            };
            
            console.log(`    Saved feeder data:`, feederName, feedersData[feederName]);
            
            totalMaxLoad += maxLoad;
            totalMinLoad += minLoad;
        }
        
        console.log('✅ Final feedersData:', feedersData);
        
        // 4. COLLECT STATION TRANSFORMER DATA
        const stationTransformerData = collectEquipmentData('station_transformer');
        
        // 5. COLLECT CHARGER DATA
        const chargerPtrNo = document.getElementById('charger_ptr')?.value || '';
        const chargerData = {
            ptrNo: chargerPtrNo,
            ...collectEquipmentData('charger')
        };
        
        // NO VALIDATION - Allow submission with any fields filled or empty
        console.log('✅ Preparing submission data (validation disabled - all fields optional)');
        
        // Prepare comprehensive submission data (matching 127-column structure)
        const submissionData = {
            pssStation: pssStation,
            phoneNumber: appState.currentUser.phoneNumber,
            staffName: staffName,
            date: date,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            
            // I/C Data (2 sections)
            ic1: ic1Data,
            ic2: ic2Data,
            
            // PTR Data (Dynamic - spread all collected PTR data)
            ...ptrData,
            
            // Feeder Data (Dynamic based on PSS)
            feeders: feedersData,
            feederCount: feedersArray.length,
            totalMaxLoad: parseFloat(totalMaxLoad.toFixed(2)),
            totalMinLoad: parseFloat(totalMinLoad.toFixed(2)),
            
            // Station Transformer
            stationTransformer: stationTransformerData,
            
            // Charger
            charger: chargerData,
            
            submittedBy: appState.currentUser.name || staffName
        };
        
        console.log('✅ Submitting comprehensive loading data:', submissionData);
        
        // Save to Firestore
        const docRef = await db.collection('daily_entries').add(submissionData);
        console.log('✅ Document saved with ID:', docRef.id);
        
        alert(`✅ Complete Loading Data Submitted Successfully!\n\n📊 Summary:\n• I/C Sections: 2\n• PTR Sections: ${ptrCount}\n• Feeders: ${feedersArray.length}\n• Total Max Load: ${totalMaxLoad.toFixed(2)} AMP\n• Total Min Load: ${totalMinLoad.toFixed(2)} AMP\n• Station Transformer: ✓\n• Charger: ✓`);
        
        closeNewEntryForm();
        
        // Reload dashboard
        await loadMySubmissions();
        await updatePSSStats();
        renderDashboard();
        
    } catch (error) {
        console.error('❌ Error submitting data:', error);
        alert('❌ Error submitting data: ' + error.message);
    }
}

// ============================================
// PSS STATISTICS FUNCTIONS
// ============================================

async function updatePSSStats() {
    try {
        const pssStation = appState.currentUser.pssStation;
        const today = new Date().toISOString().split('T')[0];
        
        console.log('📊 Updating PSS stats for:', pssStation);
        
        // Get PSS configuration for PTR count
        let pssData = appState.pssConfig[pssStation];
        if (!pssData) {
            const pssKey = Object.keys(appState.pssConfig).find(key => 
                key.toLowerCase() === pssStation.toLowerCase()
            );
            if (pssKey) pssData = appState.pssConfig[pssKey];
        }
        const ptrCount = pssData?.ptrCount || 2;
        
        // Query all submissions for this PSS
        const snapshot = await db.collection('daily_entries')
            .where('pssStation', '==', pssStation)
            .get();
        
        let submissions = [];
        snapshot.forEach(doc => {
            submissions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Found ${submissions.length} submissions for PSS stats`);
        
        // Calculate statistics
        let totalMaxLoad = 0;
        let totalMinLoad = 0;
        const staffCounts = {};
        const uniqueStaff = new Set();
        
        // Today's Feeder 1 stats
        let todayFeeder1Peak = { load: 0, time: '--:--', voltage: 0 };
        let todayFeeder1Min = { load: 0, time: '--:--', voltage: 0 };
        
        const todaySubmissions = submissions.filter(s => s.date === today);
        if (todaySubmissions.length > 0) {
            const latestToday = todaySubmissions[todaySubmissions.length - 1];
            if (latestToday.feeders) {
                const feeder1Key = Object.keys(latestToday.feeders).find(key => 
                    key.toLowerCase().includes('feeder-1') || key.toLowerCase().includes('feeder_1')
                );
                if (feeder1Key) {
                    const f1 = latestToday.feeders[feeder1Key];
                    todayFeeder1Peak = {
                        load: parseFloat(f1.maxLoad) || 0,
                        time: f1.maxLoadTime || '--:--',
                        voltage: parseFloat(f1.maxVoltage) || 0
                    };
                    todayFeeder1Min = {
                        load: parseFloat(f1.minLoad) || 0,
                        time: f1.minLoadTime || '--:--',
                        voltage: parseFloat(f1.minVoltage) || 0
                    };
                }
            }
        }
        
        submissions.forEach(sub => {
            // Sum total loads
            if (sub.totalMaxLoad) {
                totalMaxLoad += sub.totalMaxLoad;
            }
            if (sub.totalMinLoad) {
                totalMinLoad += sub.totalMinLoad;
            }
            
            // Count submissions per staff member
            if (sub.staffName) {
                staffCounts[sub.staffName] = (staffCounts[sub.staffName] || 0) + 1;
                uniqueStaff.add(sub.staffName);
            }
        });
        
        const avgMaxLoad = submissions.length > 0 ? totalMaxLoad / submissions.length : 0;
        const avgMinLoad = submissions.length > 0 ? totalMinLoad / submissions.length : 0;
        
        // Update UI
        document.getElementById('pssTotalSubmissions').textContent = submissions.length;
        document.getElementById('pssFeeder1Peak').innerHTML = `
            <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${todayFeeder1Peak.load.toFixed(2)} A</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.25rem;">@ ${todayFeeder1Peak.time} | ${todayFeeder1Peak.voltage.toFixed(2)} kV</div>
            <p style="margin-top: 0.5rem; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);">⚡ Peak Load (Today)</p>
        `;
        document.getElementById('pssFeeder1Min').innerHTML = `
            <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${todayFeeder1Min.load.toFixed(2)} A</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 0.25rem;">@ ${todayFeeder1Min.time} | ${todayFeeder1Min.voltage.toFixed(2)} kV</div>
            <p style="margin-top: 0.5rem; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);">⚡ Min Load (Today)</p>
        `;
        document.getElementById('pssActiveStaff').textContent = uniqueStaff.size;
        
        // Update leaderboard
        displayLeaderboard(staffCounts);
        
        console.log('✅ PSS stats updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating PSS stats:', error);
    }
}

function displayLeaderboard(staffCounts) {
    const container = document.getElementById('leaderboardContainer');
    
    // Sort staff by submission count
    const sortedStaff = Object.entries(staffCounts).sort((a, b) => b[1] - a[1]);
    
    if (sortedStaff.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 1rem;">No data available</p>';
        return;
    }
    
    // Display top 5 performers
    let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
    
    sortedStaff.slice(0, 5).forEach(([name, count], index) => {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[index] || '🏅';
        const barWidth = (count / sortedStaff[0][1]) * 100;
        
        html += `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 24px;">${medal}</span>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="color: rgba(255,255,255,0.9); font-weight: 600;">${name}</span>
                        <span style="color: rgba(255,255,255,0.7);">${count} submissions</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// SUBMISSION FILTER FUNCTIONS
// ============================================

function populateStaffFilter() {
    const staffSelect = document.getElementById('staffFilter');
    if (!staffSelect) return;
    
    // Collect unique staff names from submissions
    const uniqueStaff = [...new Set(userState.mySubmissions.map(sub => sub.staffName).filter(Boolean))];
    userState.uniqueStaffList = uniqueStaff.sort();
    
    // Preserve current selection
    const currentSelection = staffSelect.value;
    
    // Build options HTML
    let optionsHtml = '<option value="all">All Staff</option>';
    uniqueStaff.forEach(staff => {
        const selected = staff === currentSelection ? 'selected' : '';
        optionsHtml += `<option value="${staff}" ${selected}>👤 ${staff}</option>`;
    });
    
    staffSelect.innerHTML = optionsHtml;
    
    console.log('👥 Staff filter populated with', uniqueStaff.length, 'staff members');
}

function applySubmissionFilters() {
    // Read filter values from UI
    const staffFilter = document.getElementById('staffFilter');
    const fromDateFilter = document.getElementById('submissionFromDate');
    const toDateFilter = document.getElementById('submissionToDate');
    
    userState.submissionFilters.staff = staffFilter?.value || 'all';
    userState.submissionFilters.fromDate = fromDateFilter?.value || '';
    userState.submissionFilters.toDate = toDateFilter?.value || '';
    
    console.log('🔍 Applying submission filters:', userState.submissionFilters);
    
    // Re-render submissions with filters
    renderSubmissionHistory();
}

function clearSubmissionFilters() {
    // Reset filter values
    const staffFilter = document.getElementById('staffFilter');
    const fromDateFilter = document.getElementById('submissionFromDate');
    const toDateFilter = document.getElementById('submissionToDate');
    
    if (staffFilter) staffFilter.value = 'all';
    if (fromDateFilter) fromDateFilter.value = '';
    if (toDateFilter) toDateFilter.value = '';
    
    // Reset state
    userState.submissionFilters = {
        staff: 'all',
        fromDate: '',
        toDate: ''
    };
    
    console.log('🔄 Submission filters cleared');
    
    // Re-render
    renderSubmissionHistory();
}

// Export new functions
window.openNewEntryForm = openNewEntryForm;
window.selectStaffMember = selectStaffMember;
window.closeNewEntryForm = closeNewEntryForm;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.submitLoadingData = submitLoadingData;
window.viewMySubmission = viewMySubmission;
window.viewSubmissionDetails = viewSubmissionDetails;
window.closeDetailsModal = closeDetailsModal;
window.editMySubmission = editMySubmission;
window.updatePSSStats = updatePSSStats;
window.applySubmissionFilters = applySubmissionFilters;
window.clearSubmissionFilters = clearSubmissionFilters;
window.populateStaffFilter = populateStaffFilter;
