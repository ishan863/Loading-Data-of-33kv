// ============================================
// NEW COMPREHENSIVE ANALYTICS DASHBOARD
// PSS Daily Analytics & Monitoring Dashboard
// ============================================

let chartInstances = {};

// Main function to render complete dashboard
async function renderComprehensiveDashboard(submissions) {
    console.log('🎨 Rendering Comprehensive Analytics Dashboard...');
    
    const analyticsContainer = document.getElementById('analyticsContent');
    if (!analyticsContainer) {
        console.error('Analytics container not found!');
        return;
    }
    
    // Build complete dashboard HTML
    const dashboardHTML = `
        <!-- HEADER: Filters & Date Controls -->
        <div class="dashboard-filters">
            <div class="filter-group">
                <label>PSS Station</label>
                <select id="dashFilter-pss" onchange="refreshComprehensiveDashboard()">
                    <option value="">All Stations</option>
                    ${[...new Set(submissions.map(s => s.pssStation))].map(pss => 
                        `<option value="${pss}">${pss}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Staff Name</label>
                <select id="dashFilter-staff" onchange="refreshComprehensiveDashboard()">
                    <option value="">All Staff</option>
                    ${[...new Set(submissions.map(s => s.lineman || s.helper))].filter(s => s).map(staff => 
                        `<option value="${staff}">${staff}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>From Date</label>
                <input type="date" id="dashFilter-dateFrom" onchange="refreshComprehensiveDashboard()">
            </div>
            <div class="filter-group">
                <label>To Date</label>
                <input type="date" id="dashFilter-dateTo" onchange="refreshComprehensiveDashboard()">
            </div>
            <div class="filter-group">
                <button class="btn-refresh" onclick="refreshComprehensiveDashboard()">🔄 Refresh</button>
            </div>
        </div>
        
        <!-- KPI CARDS ROW -->
        <div class="kpi-cards-grid">
            <div class="kpi-card" id="kpi-pss-count">
                <div class="kpi-icon">🏭</div>
                <div class="kpi-content">
                    <div class="kpi-label">Total PSS Monitored</div>
                    <div class="kpi-value">--</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-top-staff">
                <div class="kpi-icon">👷</div>
                <div class="kpi-content">
                    <div class="kpi-label">Top 3 Staff</div>
                    <div class="kpi-value">--</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-avg-voltage">
                <div class="kpi-icon">⚡</div>
                <div class="kpi-content">
                    <div class="kpi-label">Average Voltage</div>
                    <div class="kpi-value">-- KV</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-avg-load">
                <div class="kpi-icon">🔋</div>
                <div class="kpi-content">
                    <div class="kpi-label">Average Load</div>
                    <div class="kpi-value">-- AMP</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-max-load-pss">
                <div class="kpi-icon">🚨</div>
                <div class="kpi-content">
                    <div class="kpi-label">Max Load Today</div>
                    <div class="kpi-value">--</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-min-voltage">
                <div class="kpi-icon">📉</div>
                <div class="kpi-content">
                    <div class="kpi-label">Lowest Voltage</div>
                    <div class="kpi-value">-- KV</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-last-submission">
                <div class="kpi-icon">🕒</div>
                <div class="kpi-content">
                    <div class="kpi-label">Last Submission</div>
                    <div class="kpi-value">--</div>
                </div>
            </div>
            <div class="kpi-card" id="kpi-total-records">
                <div class="kpi-icon">🧾</div>
                <div class="kpi-content">
                    <div class="kpi-label">Total Records</div>
                    <div class="kpi-value">--</div>
                </div>
            </div>
        </div>
        
        <!-- VOLTAGE ANALYSIS SECTION -->
        <div class="dashboard-section">
            <h2 class="section-title">⚡ Voltage Analysis</h2>
            <div class="charts-row">
                <div class="chart-container">
                    <h3>I/C Voltage (Max vs Min)</h3>
                    <canvas id="chart-ic-voltage"></canvas>
                </div>
                <div class="chart-container">
                    <h3>PTR Voltage (33kV vs 11kV)</h3>
                    <canvas id="chart-ptr-voltage"></canvas>
                </div>
            </div>
            <div class="chart-container full-width">
                <h3>Station Transformer Voltage Trend</h3>
                <canvas id="chart-transformer-voltage"></canvas>
            </div>
        </div>
        
        <!-- LOAD ANALYSIS SECTION -->
        <div class="dashboard-section">
            <h2 class="section-title">🔋 Load Analysis</h2>
            <div class="charts-row">
                <div class="chart-container">
                    <h3>Load vs Time (All Feeders)</h3>
                    <canvas id="chart-load-time"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Load Distribution by PSS</h3>
                    <canvas id="chart-load-distribution"></canvas>
                </div>
            </div>
            <div class="chart-container full-width">
                <h3>Max vs Min Load by Feeder</h3>
                <canvas id="chart-feeder-load-comparison"></canvas>
            </div>
        </div>
        
        <!-- FEEDER & TRANSFORMER INSIGHTS -->
        <div class="dashboard-section">
            <h2 class="section-title">⚙️ Feeder & Transformer Insights</h2>
            <div class="charts-row">
                <div class="chart-container">
                    <h3>Feeder Comparison (Radar)</h3>
                    <canvas id="chart-feeder-radar"></canvas>
                </div>
                <div class="chart-container">
                    <h3>PTR Load Profile</h3>
                    <canvas id="chart-ptr-load"></canvas>
                </div>
            </div>
        </div>
        
        <!-- STAFF ACTIVITY ANALYTICS -->
        <div class="dashboard-section">
            <h2 class="section-title">👨‍🔧 Staff Activity Analytics</h2>
            <div class="charts-row">
                <div class="chart-container">
                    <h3>Submissions by Staff</h3>
                    <canvas id="chart-staff-submissions"></canvas>
                </div>
                <div class="chart-container">
                    <h3>PSS vs Staff Matrix (Heatmap)</h3>
                    <canvas id="chart-staff-pss-heatmap"></canvas>
                </div>
            </div>
        </div>
        
        <!-- TIME-BASED INSIGHTS -->
        <div class="dashboard-section">
            <h2 class="section-title">🕓 Time-Based Insights</h2>
            <div class="charts-row">
                <div class="chart-container full-width">
                    <h3>Hour-wise Load Curve</h3>
                    <canvas id="chart-hourly-load"></canvas>
                </div>
            </div>
        </div>
    `;
    
    analyticsContainer.innerHTML = dashboardHTML;
    
    // Calculate KPIs
    calculateKPIs(submissions);
    
    // Render all charts
    renderVoltageCharts(submissions);
    renderLoadCharts(submissions);
    renderFeederInsights(submissions);
    renderStaffAnalytics(submissions);
    renderTimeInsights(submissions);
}

// ============================================
// KPI CALCULATIONS
// ============================================

function calculateKPIs(submissions) {
    // PSS Count
    const pssCount = new Set(submissions.map(s => s.pssStation)).size;
    document.querySelector('#kpi-pss-count .kpi-value').textContent = pssCount;
    
    // Top 3 Staff
    const staffCount = {};
    submissions.forEach(s => {
        const staff = s.lineman || s.helper || 'Unknown';
        staffCount[staff] = (staffCount[staff] || 0) + 1;
    });
    const topStaff = Object.entries(staffCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(s => s[0])
        .join(', ');
    document.querySelector('#kpi-top-staff .kpi-value').textContent = topStaff || 'N/A';
    
    // Average Voltage
    let voltageSum = 0, voltageCount = 0;
    submissions.forEach(s => {
        if (s.ic1_voltage_max) { voltageSum += s.ic1_voltage_max; voltageCount++; }
        if (s.ic1_voltage_min) { voltageSum += s.ic1_voltage_min; voltageCount++; }
        if (s.ic2_voltage_max) { voltageSum += s.ic2_voltage_max; voltageCount++; }
        if (s.ic2_voltage_min) { voltageSum += s.ic2_voltage_min; voltageCount++; }
    });
    const avgVoltage = voltageCount > 0 ? (voltageSum / voltageCount).toFixed(2) : '0';
    document.querySelector('#kpi-avg-voltage .kpi-value').textContent = avgVoltage + ' KV';
    
    // Average Load
    let loadSum = 0, loadCount = 0;
    submissions.forEach(s => {
        if (s.ic1_load_max) { loadSum += s.ic1_load_max; loadCount++; }
        if (s.ic1_load_min) { loadSum += s.ic1_load_min; loadCount++; }
        if (s.ic2_load_max) { loadSum += s.ic2_load_max; loadCount++; }
        if (s.ic2_load_min) { loadSum += s.ic2_load_min; loadCount++; }
    });
    const avgLoad = loadCount > 0 ? (loadSum / loadCount).toFixed(2) : '0';
    document.querySelector('#kpi-avg-load .kpi-value').textContent = avgLoad + ' AMP';
    
    // Max Load Today
    let maxLoadEntry = null, maxLoad = 0;
    submissions.forEach(s => {
        const load = Math.max(s.ic1_load_max || 0, s.ic2_load_max || 0);
        if (load > maxLoad) {
            maxLoad = load;
            maxLoadEntry = s.pssStation;
        }
    });
    document.querySelector('#kpi-max-load-pss .kpi-value').textContent = maxLoadEntry ? `${maxLoadEntry} - ${maxLoad.toFixed(2)} AMP` : 'N/A';
    
    // Min Voltage
    let minVoltage = Infinity;
    submissions.forEach(s => {
        minVoltage = Math.min(minVoltage, s.ic1_voltage_min || Infinity, s.ic2_voltage_min || Infinity);
    });
    document.querySelector('#kpi-min-voltage .kpi-value').textContent = minVoltage === Infinity ? 'N/A' : minVoltage.toFixed(2) + ' KV';
    
    // Last Submission Time
    if (submissions.length > 0) {
        const lastSub = submissions[submissions.length - 1];
        const subDate = lastSub.date ? formatDate(lastSub.date) : 'N/A';
        document.querySelector('#kpi-last-submission .kpi-value').textContent = subDate;
    }
    
    // Total Records
    document.querySelector('#kpi-total-records .kpi-value').textContent = submissions.length + ' Entries';
}

// ============================================
// VOLTAGE ANALYSIS CHARTS
// ============================================

function renderVoltageCharts(submissions) {
    // I/C Voltage Chart
    const icCanvas = document.getElementById('chart-ic-voltage');
    if (icCanvas) {
        const ctx = icCanvas.getContext('2d');
        drawLineChart(ctx, 'I/C Voltage', [
            { label: 'I/C-1 MAX', data: submissions.map(s => s.ic1_voltage_max || 0), color: '#ef4444' },
            { label: 'I/C-1 MIN', data: submissions.map(s => s.ic1_voltage_min || 0), color: '#3b82f6' },
            { label: 'I/C-2 MAX', data: submissions.map(s => s.ic2_voltage_max || 0), color: '#f97316' },
            { label: 'I/C-2 MIN', data: submissions.map(s => s.ic2_voltage_min || 0), color: '#06b6d4' }
        ]);
    }
    
    // PTR Voltage Chart
    const ptrCanvas = document.getElementById('chart-ptr-voltage');
    if (ptrCanvas) {
        const ctx = ptrCanvas.getContext('2d');
        drawLineChart(ctx, 'PTR Voltage', [
            { label: 'PTR 33kV MAX', data: submissions.map(s => s.ptr1_33kv_voltage_max || 0), color: '#ef4444' },
            { label: 'PTR 11kV MAX', data: submissions.map(s => s.ptr1_11kv_voltage_max || 0), color: '#3b82f6' }
        ]);
    }
}

// ============================================
// LOAD ANALYSIS CHARTS
// ============================================

function renderLoadCharts(submissions) {
    // Load vs Time
    const loadCanvas = document.getElementById('chart-load-time');
    if (loadCanvas) {
        const ctx = loadCanvas.getContext('2d');
        drawLineChart(ctx, 'Load Trend', [
            { label: 'I/C-1 Load', data: submissions.map(s => s.ic1_load_max || 0), color: '#ef4444' },
            { label: 'I/C-2 Load', data: submissions.map(s => s.ic2_load_max || 0), color: '#3b82f6' }
        ]);
    }
}

// ============================================
// FEEDER INSIGHTS CHARTS
// ============================================

function renderFeederInsights(submissions) {
    // Placeholder implementations
    console.log('Rendering Feeder Insights...');
}

// ============================================
// STAFF ANALYTICS CHARTS
// ============================================

function renderStaffAnalytics(submissions) {
    // Submissions by Staff
    const staffCanvas = document.getElementById('chart-staff-submissions');
    if (staffCanvas) {
        const ctx = staffCanvas.getContext('2d');
        
        const staffCount = {};
        submissions.forEach(s => {
            const staff = s.lineman || s.helper || 'Unknown';
            staffCount[staff] = (staffCount[staff] || 0) + 1;
        });
        
        const staffNames = Object.keys(staffCount);
        const staffValues = Object.values(staffCount);
        
        drawBarChart(ctx, staffNames, staffValues, 'Submissions by Staff');
    }
}

// ============================================
// TIME INSIGHTS CHARTS
// ============================================

function renderTimeInsights(submissions) {
    console.log('Rendering Time Insights...');
}

// ============================================
// HELPER CHART FUNCTIONS
// ============================================

function drawLineChart(ctx, title, datasets) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const padding = { top: 40, right: 30, bottom: 40, left: 50 };
    const chartWidth = ctx.canvas.width - padding.left - padding.right;
    const chartHeight = ctx.canvas.height - padding.top - padding.bottom;
    
    // Find max value
    let maxValue = 0;
    datasets.forEach(ds => {
        maxValue = Math.max(maxValue, ...ds.data);
    });
    maxValue = Math.ceil(maxValue * 1.1) || 100;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(ctx.canvas.width - padding.right, y);
        ctx.stroke();
    }
    
    // Draw lines
    datasets.forEach(ds => {
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        ds.data.forEach((value, i) => {
            const x = padding.left + (chartWidth / (ds.data.length - 1 || 1)) * i;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    });
    
    // Draw title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(title, padding.left, 20);
}

function drawBarChart(ctx, labels, values, title) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const padding = { top: 40, right: 30, bottom: 80, left: 50 };
    const chartWidth = ctx.canvas.width - padding.left - padding.right;
    const chartHeight = ctx.canvas.height - padding.top - padding.bottom;
    const barWidth = chartWidth / labels.length * 0.6;
    
    const maxValue = Math.max(...values, 1);
    
    // Draw bars
    labels.forEach((label, i) => {
        const barHeight = (values[i] / maxValue) * chartHeight;
        const x = padding.left + (chartWidth / labels.length) * i + ((chartWidth / labels.length) - barWidth) / 2;
        const y = padding.top + chartHeight - barHeight;
        
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#6d28d9');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter';
        ctx.save();
        ctx.translate(x + barWidth / 2, ctx.canvas.height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });
    
    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(title, padding.left, 20);
}

// ============================================
// REFRESH FUNCTION
// ============================================

function refreshComprehensiveDashboard() {
    console.log('🔄 Refreshing comprehensive dashboard...');
    if (typeof allSubmissionsData !== 'undefined' && allSubmissionsData.length > 0) {
        renderComprehensiveDashboard(allSubmissionsData);
    }
}

// Export
window.renderComprehensiveDashboard = renderComprehensiveDashboard;
window.refreshComprehensiveDashboard = refreshComprehensiveDashboard;
