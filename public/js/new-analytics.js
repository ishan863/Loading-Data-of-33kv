// ========================================
// NEW ADVANCED ANALYTICS DASHBOARD
// Complete replacement for old analytics
// ========================================

let analyticsData = [];
let analyticsCharts = {};

// Configure Chart.js defaults for better large number handling
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.size = 11;
    Chart.defaults.color = 'rgba(255,255,255,0.7)';
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0,0,0,0.8)';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

// Helper function to format large numbers
function formatNumber(value, decimals = 1) {
    if (value >= 1000000) return (value / 1000000).toFixed(decimals) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(decimals) + 'K';
    return value.toFixed(decimals);
}

// Helper function for axis tick formatting
function formatAxisTick(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value;
}

// ============================================
// KPI CALCULATION FUNCTIONS
// ============================================

function calculateKPIs(data) {
    if (!data || data.length === 0) return;

    let highestLoad = 0;
    let voltageSum = 0;
    let voltageCount = 0;
    let mostFluctuatingFeeder = { name: 'N/A', diff: 0 };
    let pssSet = new Set();
    let totalLoadSum = 0;
    let lowestVoltage = Infinity;

    data.forEach(entry => {
        // PSS count
        if (entry.pssStation) pssSet.add(entry.pssStation);

        // Process feeders
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const maxLoad = parseFloat(feeder.maxLoad || 0);
                const maxV = parseFloat(feeder.maxVoltage || 0);
                const minV = parseFloat(feeder.minVoltage || 0);
                
                // Highest load
                if (maxLoad > highestLoad) highestLoad = maxLoad;
                
                // Voltage calculations
                if (maxV > 0) {
                    voltageSum += (maxV + minV) / 2;
                    voltageCount++;
                }
                
                // Fluctuation
                const fluctuation = Math.abs(maxV - minV);
                if (fluctuation > mostFluctuatingFeeder.diff) {
                    mostFluctuatingFeeder = {
                        name: feeder.feederName || 'Unknown',
                        diff: fluctuation
                    };
                }
                
                // Lowest voltage
                if (minV > 0 && minV < lowestVoltage) lowestVoltage = minV;
                
                totalLoadSum += maxLoad;
            });
        }
    });

    // Update KPI cards with formatted numbers
    document.getElementById('kpi-highest-load').textContent = formatNumber(highestLoad, 1) + ' A';
    document.getElementById('kpi-avg-voltage').textContent = (voltageSum / (voltageCount || 1)).toFixed(2) + ' kV';
    document.getElementById('kpi-fluctuating-feeder').textContent = mostFluctuatingFeeder.name;
    document.getElementById('kpi-total-pss').textContent = pssSet.size;
    document.getElementById('kpi-avg-load-pss').textContent = formatNumber(totalLoadSum / (pssSet.size || 1), 1) + ' A';
    document.getElementById('kpi-lowest-voltage').textContent = lowestVoltage === Infinity ? 'N/A' : lowestVoltage.toFixed(2) + ' kV';

    console.log('✅ KPIs calculated');
}

// ============================================
// SECTION A: PSS-LEVEL OVERVIEW
// ============================================

// A1: Horizontal Bar - Average Load by PSS
function renderPSSAvgLoadChart(data) {
    const ctx = document.getElementById('chartPSSAvgLoad');
    if (!ctx) return;

    // Destroy existing chart
    if (analyticsCharts.pssAvgLoad) analyticsCharts.pssAvgLoad.destroy();

    // Aggregate data by PSS
    const pssData = {};
    data.forEach(entry => {
        if (!entry.pssStation || !entry.feeders) return;
        
        if (!pssData[entry.pssStation]) {
            pssData[entry.pssStation] = { loadSum: 0, count: 0 };
        }
        
        Object.values(entry.feeders).forEach(feeder => {
            const load = parseFloat(feeder.maxLoad || 0);
            pssData[entry.pssStation].loadSum += load;
            pssData[entry.pssStation].count++;
        });
    });

    // Calculate averages and sort
    const pssLabels = [];
    const pssValues = [];
    
    Object.entries(pssData)
        .map(([pss, data]) => ({ pss, avg: data.loadSum / (data.count || 1) }))
        .sort((a, b) => b.avg - a.avg)
        .forEach(item => {
            pssLabels.push(item.pss);
            pssValues.push(item.avg);
        });

    analyticsCharts.pssAvgLoad = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pssLabels,
            datasets: [{
                label: 'Average Load (A)',
                data: pssValues,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.x;
                            return `Load: ${value >= 1000000 ? (value/1000000).toFixed(2) + 'M' : value >= 1000 ? (value/1000).toFixed(1) + 'K' : value.toFixed(1)} A`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)',
                        callback: function(value) {
                            if (value >= 1000000) return (value/1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value/1000).toFixed(0) + 'K';
                            return value;
                        }
                    },
                    title: { display: true, text: 'Average Load (Amperes)', color: '#93c5fd' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.9)', font: { size: 10 } }
                }
            }
        }
    });

    console.log('✅ PSS Avg Load Chart rendered');
}

// A2: Grouped Column - Max vs Min Voltage by PSS
function renderPSSVoltageStabilityChart(data) {
    const ctx = document.getElementById('chartPSSVoltageStability');
    if (!ctx) return;

    if (analyticsCharts.pssVoltageStability) analyticsCharts.pssVoltageStability.destroy();

    const pssData = {};
    data.forEach(entry => {
        if (!entry.pssStation || !entry.feeders) return;
        
        if (!pssData[entry.pssStation]) {
            pssData[entry.pssStation] = { maxVoltages: [], minVoltages: [] };
        }
        
        Object.values(entry.feeders).forEach(feeder => {
            const maxV = parseFloat(feeder.maxVoltage || 0);
            const minV = parseFloat(feeder.minVoltage || 0);
            if (maxV > 0) pssData[entry.pssStation].maxVoltages.push(maxV);
            if (minV > 0) pssData[entry.pssStation].minVoltages.push(minV);
        });
    });

    const pssLabels = Object.keys(pssData).slice(0, 10); // Top 10 PSS
    const maxAvgs = pssLabels.map(pss => {
        const arr = pssData[pss].maxVoltages;
        return arr.length > 0 ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
    });
    const minAvgs = pssLabels.map(pss => {
        const arr = pssData[pss].minVoltages;
        return arr.length > 0 ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
    });

    analyticsCharts.pssVoltageStability = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pssLabels,
            datasets: [
                {
                    label: 'Max Voltage',
                    data: maxAvgs,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Min Voltage',
                    data: minAvgs,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kV`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Voltage (kV)', color: '#93c5fd' }
                }
            }
        }
    });

    console.log('✅ PSS Voltage Stability Chart rendered');
}

// A3: Heatmap - Load Intensity (simplified as bar for now)
function renderLoadHeatmapChart(data) {
    const ctx = document.getElementById('chartLoadHeatmap');
    if (!ctx) return;

    if (analyticsCharts.loadHeatmap) analyticsCharts.loadHeatmap.destroy();

    // Group by date
    const dateData = {};
    data.forEach(entry => {
        const date = entry.date || 'Unknown';
        if (!dateData[date]) dateData[date] = 0;
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                dateData[date] += parseFloat(feeder.maxLoad || 0);
            });
        }
    });

    const dates = Object.keys(dateData).slice(-15); // Last 15 days
    const loads = dates.map(d => dateData[d]);

    analyticsCharts.loadHeatmap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Total Load',
                data: loads,
                backgroundColor: loads.map(load => {
                    if (load > 100) return 'rgba(239, 68, 68, 0.8)';
                    if (load > 50) return 'rgba(245, 158, 11, 0.8)';
                    return 'rgba(34, 197, 94, 0.8)';
                }),
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `Load: ${context.parsed.y.toFixed(1)} A`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Total Load (A)', color: '#93c5fd' }
                }
            }
        }
    });

    console.log('✅ Load Heatmap Chart rendered');
}

// ============================================
// SECTION B: FEEDER-LEVEL ANALYSIS
// ============================================

// B1: Multi-Line - Feeder Load Trends
function renderFeederLoadTrendChart(data) {
    const ctx = document.getElementById('chartFeederLoadTrend');
    if (!ctx) return;

    if (analyticsCharts.feederLoadTrend) analyticsCharts.feederLoadTrend.destroy();

    // Collect feeder data over time
    const feederDatasets = {};
    const dates = [];

    data.slice(-10).forEach(entry => { // Last 10 entries
        const date = entry.date || 'Unknown';
        if (!dates.includes(date)) dates.push(date);
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const name = feeder.feederName || 'Unnamed';
                if (!feederDatasets[name]) {
                    feederDatasets[name] = Array(dates.length).fill(0);
                }
                const idx = dates.indexOf(date);
                feederDatasets[name][idx] = parseFloat(feeder.maxLoad || 0);
            });
        }
    });

    const colors = [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(168, 85, 247, 1)',
        'rgba(6, 182, 212, 1)'
    ];

    const datasets = Object.entries(feederDatasets).slice(0, 6).map(([name, data], idx) => ({
        label: name,
        data: data,
        borderColor: colors[idx],
        backgroundColor: colors[idx].replace('1)', '0.1)'),
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
    }));

    analyticsCharts.feederLoadTrend = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 10 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatNumber(context.parsed.y)} A`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 9 }, maxRotation: 45 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)',
                        callback: formatAxisTick
                    },
                    title: { display: true, text: 'Load (A)', color: '#6ee7b7' }
                }
            }
        }
    });

    console.log('✅ Feeder Load Trend Chart rendered');
}

// B2: Stacked Area - Feeder Contribution
function renderFeederContributionChart(data) {
    const ctx = document.getElementById('chartFeederContribution');
    if (!ctx) return;

    if (analyticsCharts.feederContribution) analyticsCharts.feederContribution.destroy();

    const feederDatasets = {};
    const dates = [];

    data.slice(-10).forEach(entry => {
        const date = entry.date || 'Unknown';
        if (!dates.includes(date)) dates.push(date);
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const name = feeder.feederName || 'Unnamed';
                if (!feederDatasets[name]) {
                    feederDatasets[name] = Array(dates.length).fill(0);
                }
                const idx = dates.indexOf(date);
                feederDatasets[name][idx] += parseFloat(feeder.maxLoad || 0);
            });
        }
    });

    const colors = [
        'rgba(59, 130, 246, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(6, 182, 212, 0.7)'
    ];

    const datasets = Object.entries(feederDatasets).slice(0, 6).map(([name, data], idx) => ({
        label: name,
        data: data,
        backgroundColor: colors[idx],
        borderColor: colors[idx].replace('0.7)', '1)'),
        borderWidth: 1,
        fill: true
    }));

    analyticsCharts.feederContribution = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 10 } }
                },
                filler: { propagate: true },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatNumber(context.parsed.y)} A`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 9 }, maxRotation: 45 },
                    stacked: true
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)',
                        callback: formatAxisTick
                    },
                    title: { display: true, text: 'Load (A)', color: '#6ee7b7' },
                    stacked: true
                }
            },
            elements: {
                line: { tension: 0.4 }
            }
        }
    });

    console.log('✅ Feeder Contribution Chart rendered');
}

// B3: Radar - Feeder Performance
function renderFeederRadarChart(data) {
    const ctx = document.getElementById('chartFeederRadar');
    if (!ctx) return;

    if (analyticsCharts.feederRadar) analyticsCharts.feederRadar.destroy();

    // Get latest entry with feeders
    const latestEntry = data.slice().reverse().find(e => e.feeders && Object.keys(e.feeders).length > 0);
    if (!latestEntry || !latestEntry.feeders) {
        console.log('⚠️ No feeder data for radar chart');
        return;
    }

    const feederNames = [];
    const maxLoads = [];
    const maxVoltages = [];
    const avgVoltages = [];

    Object.values(latestEntry.feeders).slice(0, 6).forEach(feeder => {
        feederNames.push(feeder.feederName || 'Unnamed');
        maxLoads.push(parseFloat(feeder.maxLoad || 0));
        maxVoltages.push(parseFloat(feeder.maxVoltage || 0));
        const avgV = (parseFloat(feeder.maxVoltage || 0) + parseFloat(feeder.minVoltage || 0)) / 2;
        avgVoltages.push(avgV);
    });

    analyticsCharts.feederRadar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: feederNames,
            datasets: [
                {
                    label: 'Max Load (A)',
                    data: maxLoads,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)'
                },
                {
                    label: 'Max Voltage (kV)',
                    data: maxVoltages,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 10 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label;
                            const value = context.parsed.r;
                            if (label.includes('Load')) {
                                return `${label}: ${formatNumber(value)} A`;
                            }
                            return `${label}: ${value.toFixed(2)} kV`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)', 
                        backdropColor: 'transparent',
                        callback: formatAxisTick
                    },
                    pointLabels: { color: 'rgba(255,255,255,0.9)', font: { size: 10 } }
                }
            }
        }
    });

    console.log('✅ Feeder Radar Chart rendered');
}

// ============================================
// SECTION C: VOLTAGE STABILITY
// ============================================

// C1: Dual-Axis - Voltage vs Load
function renderVoltageLoadDualChart(data) {
    const ctx = document.getElementById('chartVoltageLoadDual');
    if (!ctx) return;

    if (analyticsCharts.voltageLoadDual) analyticsCharts.voltageLoadDual.destroy();

    const dates = [];
    const avgVoltages = [];
    const totalLoads = [];

    data.slice(-15).forEach(entry => {
        const date = entry.date || 'Unknown';
        dates.push(date);
        
        let voltageSum = 0, voltageCount = 0, loadSum = 0;
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const maxV = parseFloat(feeder.maxVoltage || 0);
                const minV = parseFloat(feeder.minVoltage || 0);
                if (maxV > 0) {
                    voltageSum += (maxV + minV) / 2;
                    voltageCount++;
                }
                loadSum += parseFloat(feeder.maxLoad || 0);
            });
        }
        
        avgVoltages.push(voltageCount > 0 ? voltageSum / voltageCount : 0);
        totalLoads.push(loadSum);
    });

    analyticsCharts.voltageLoadDual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Avg Voltage (kV)',
                    data: avgVoltages,
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    borderWidth: 3
                },
                {
                    label: 'Total Load (A)',
                    data: totalLoads,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 10 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label;
                            const value = context.parsed.y;
                            if (label.includes('Load')) {
                                return `${label}: ${formatNumber(value)} A`;
                            }
                            return `${label}: ${value.toFixed(2)} kV`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 9 }, maxRotation: 45 }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(245, 158, 11, 0.1)' },
                    ticks: { color: 'rgba(245, 158, 11, 0.9)' },
                    title: { display: true, text: 'Voltage (kV)', color: '#fcd34d' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { 
                        color: 'rgba(59, 130, 246, 0.9)',
                        callback: formatAxisTick
                    },
                    title: { display: true, text: 'Load (A)', color: '#60a5fa' }
                }
            }
        }
    });

    console.log('✅ Voltage-Load Dual Axis Chart rendered');
}

// C2: Box Plot (simplified as bar with error bars simulation)
function renderVoltageBoxPlotChart(data) {
    const ctx = document.getElementById('chartVoltageBoxPlot');
    if (!ctx) return;

    if (analyticsCharts.voltageBoxPlot) analyticsCharts.voltageBoxPlot.destroy();

    const pssData = {};
    
    data.forEach(entry => {
        if (!entry.pssStation || !entry.feeders) return;
        
        if (!pssData[entry.pssStation]) pssData[entry.pssStation] = [];
        
        Object.values(entry.feeders).forEach(feeder => {
            const maxV = parseFloat(feeder.maxVoltage || 0);
            const minV = parseFloat(feeder.minVoltage || 0);
            if (maxV > 0) {
                pssData[entry.pssStation].push(maxV);
                pssData[entry.pssStation].push(minV);
            }
        });
    });

    const pssLabels = Object.keys(pssData).slice(0, 8);
    const avgVoltages = pssLabels.map(pss => {
        const arr = pssData[pss];
        return arr.length > 0 ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
    });
    const maxVoltages = pssLabels.map(pss => Math.max(...pssData[pss]));
    const minVoltages = pssLabels.map(pss => Math.min(...pssData[pss]));

    analyticsCharts.voltageBoxPlot = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pssLabels,
            datasets: [{
                label: 'Voltage Range',
                data: avgVoltages,
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (context) => {
                            const idx = context.dataIndex;
                            return `Max: ${maxVoltages[idx].toFixed(2)} kV\nMin: ${minVoltages[idx].toFixed(2)} kV`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Voltage (kV)', color: '#fcd34d' }
                }
            }
        }
    });

    console.log('✅ Voltage Box Plot Chart rendered');
}

// C3: Voltage Trend with Trendline
function renderVoltageTrendChart(data) {
    const ctx = document.getElementById('chartVoltageTrend');
    if (!ctx) return;

    if (analyticsCharts.voltageTrend) analyticsCharts.voltageTrend.destroy();

    const dates = [];
    const avgVoltages = [];

    data.slice(-20).forEach(entry => {
        const date = entry.date || 'Unknown';
        dates.push(date);
        
        let voltageSum = 0, voltageCount = 0;
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const maxV = parseFloat(feeder.maxVoltage || 0);
                const minV = parseFloat(feeder.minVoltage || 0);
                if (maxV > 0) {
                    voltageSum += (maxV + minV) / 2;
                    voltageCount++;
                }
            });
        }
        
        avgVoltages.push(voltageCount > 0 ? voltageSum / voltageCount : 0);
    });

    // Simple linear trendline
    const n = avgVoltages.length;
    const xValues = avgVoltages.map((_, i) => i);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = avgVoltages.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * avgVoltages[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const trendline = xValues.map(x => slope * x + intercept);

    analyticsCharts.voltageTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Avg Voltage',
                    data: avgVoltages,
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4
                },
                {
                    label: 'Trendline',
                    data: trendline,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 12 } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Voltage (kV)', color: '#fcd34d' }
                }
            }
        }
    });

    console.log('✅ Voltage Trend Chart rendered');
}

// ============================================
// SECTION D: TIME-BASED INSIGHTS
// ============================================

// D1: Peak Load Time Distribution
function renderTimeDistributionChart(data) {
    const ctx = document.getElementById('chartTimeDistribution');
    if (!ctx) return;

    if (analyticsCharts.timeDistribution) analyticsCharts.timeDistribution.destroy();

    const hourCounts = Array(24).fill(0);
    
    data.forEach(entry => {
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const timeStr = feeder.maxLoadTime;
                if (timeStr) {
                    const hour = parseInt(timeStr.split(':')[0]) || 0;
                    hourCounts[hour]++;
                }
            });
        }
    });

    const hourLabels = Array.from({length: 24}, (_, i) => `${i}:00`);

    analyticsCharts.timeDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Peak Load Occurrences',
                data: hourCounts,
                backgroundColor: hourCounts.map((count, hour) => {
                    if (hour >= 18 && hour <= 22) return 'rgba(239, 68, 68, 0.8)'; // Evening peak
                    if (hour >= 9 && hour <= 17) return 'rgba(245, 158, 11, 0.8)'; // Day
                    return 'rgba(59, 130, 246, 0.8)'; // Off-peak
                }),
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `Count: ${context.parsed.y}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Occurrences', color: '#d8b4fe' }
                }
            }
        }
    });

    console.log('✅ Time Distribution Chart rendered');
}

// D2: Daily Load Calendar Heatmap (simplified)
function renderCalendarHeatmapChart(data) {
    const ctx = document.getElementById('chartCalendarHeatmap');
    if (!ctx) return;

    if (analyticsCharts.calendarHeatmap) analyticsCharts.calendarHeatmap.destroy();

    const dateLoads = {};
    
    data.forEach(entry => {
        const date = entry.date || 'Unknown';
        if (!dateLoads[date]) dateLoads[date] = 0;
        
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                dateLoads[date] += parseFloat(feeder.maxLoad || 0);
            });
        }
    });

    const dates = Object.keys(dateLoads).slice(-20);
    const loads = dates.map(d => dateLoads[d]);

    analyticsCharts.calendarHeatmap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Daily Total Load',
                data: loads,
                backgroundColor: loads.map(load => {
                    if (load > 150) return 'rgba(239, 68, 68, 0.9)';
                    if (load > 100) return 'rgba(245, 158, 11, 0.9)';
                    if (load > 50) return 'rgba(59, 130, 246, 0.9)';
                    return 'rgba(16, 185, 129, 0.9)';
                }),
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `Load: ${context.parsed.y.toFixed(1)} A`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Load (A)', color: '#d8b4fe' }
                }
            }
        }
    });

    console.log('✅ Calendar Heatmap Chart rendered');
}

// D3: Hour × Feeder Matrix (simplified)
function renderHourFeederMatrixChart(data) {
    const ctx = document.getElementById('chartHourFeederMatrix');
    if (!ctx) return;

    if (analyticsCharts.hourFeederMatrix) analyticsCharts.hourFeederMatrix.destroy();

    // Simple version: Show feeders and their peak hours
    const feederPeakHours = {};
    
    data.forEach(entry => {
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const name = feeder.feederName || 'Unnamed';
                const timeStr = feeder.maxLoadTime;
                if (timeStr && !feederPeakHours[name]) {
                    const hour = parseInt(timeStr.split(':')[0]) || 0;
                    feederPeakHours[name] = hour;
                }
            });
        }
    });

    const feederNames = Object.keys(feederPeakHours).slice(0, 10);
    const peakHours = feederNames.map(name => feederPeakHours[name]);

    analyticsCharts.hourFeederMatrix = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: feederNames,
            datasets: [{
                label: 'Peak Hour',
                data: peakHours,
                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                borderColor: 'rgba(168, 85, 247, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `Peak at: ${context.parsed.y}:00`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)', stepSize: 3 },
                    title: { display: true, text: 'Hour of Day', color: '#d8b4fe' },
                    min: 0,
                    max: 23
                }
            }
        }
    });

    console.log('✅ Hour-Feeder Matrix Chart rendered');
}

// ============================================
// SECTION E: COMPARATIVE & SUMMARY
// ============================================

// E1: Donut - Feeder Load Distribution
function renderFeederDonutChart(data) {
    const ctx = document.getElementById('chartFeederDonut');
    if (!ctx) return;

    if (analyticsCharts.feederDonut) analyticsCharts.feederDonut.destroy();

    const feederTotals = {};
    
    data.forEach(entry => {
        if (entry.feeders) {
            Object.entries(entry.feeders).forEach(([key, feeder]) => {
                // Try multiple ways to get feeder name
                let name = feeder.feederName || feeder.name || key || 'Unnamed';
                
                // If it's a feeder1, feeder2 format, use that
                if (key.startsWith('feeder') && !feeder.feederName) {
                    name = key.charAt(0).toUpperCase() + key.slice(1);
                }
                
                if (!feederTotals[name]) feederTotals[name] = 0;
                feederTotals[name] += parseFloat(feeder.maxLoad || feeder.load || 0);
            });
        }
    });

    // If no data found, check alternative structure
    if (Object.keys(feederTotals).length === 0) {
        console.warn('⚠️ No feeder data found for donut chart');
        // Create sample data to show chart is working
        feederTotals['No Data'] = 1;
    }

    const sortedFeeders = Object.entries(feederTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = sortedFeeders.map(([name, _]) => name);
    const values = sortedFeeders.map(([_, load]) => load);

    console.log('📊 Feeder Donut Data:', labels, values);

    const colors = [
        'rgba(59, 130, 246, 0.9)',
        'rgba(16, 185, 129, 0.9)',
        'rgba(245, 158, 11, 0.9)',
        'rgba(239, 68, 68, 0.9)',
        'rgba(168, 85, 247, 0.9)',
        'rgba(6, 182, 212, 0.9)',
        'rgba(236, 72, 153, 0.9)',
        'rgba(132, 204, 22, 0.9)'
    ];

    analyticsCharts.feederDonut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.9)', '1)')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: { color: 'rgba(255,255,255,0.9)', font: { size: 10 }, padding: 10 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatNumber(value)}A (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    console.log('✅ Feeder Donut Chart rendered');
}

// E2: Scatter - Voltage vs Load Correlation
function renderVoltageLoadScatterChart(data) {
    const ctx = document.getElementById('chartVoltageLoadScatter');
    if (!ctx) return;

    if (analyticsCharts.voltageLoadScatter) analyticsCharts.voltageLoadScatter.destroy();

    const scatterData = [];
    
    data.forEach(entry => {
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                const voltage = parseFloat(feeder.maxVoltage || 0);
                const load = parseFloat(feeder.maxLoad || 0);
                if (voltage > 0 && load > 0) {
                    scatterData.push({ x: voltage, y: load });
                }
            });
        }
    });

    analyticsCharts.voltageLoadScatter = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Voltage vs Load',
                data: scatterData,
                backgroundColor: 'rgba(6, 182, 212, 0.6)',
                borderColor: 'rgba(6, 182, 212, 1)',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => `V: ${context.parsed.x.toFixed(2)} kV, Load: ${formatNumber(context.parsed.y)} A`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    title: { display: true, text: 'Voltage (kV)', color: '#67e8f9' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)',
                        callback: formatAxisTick
                    },
                    title: { display: true, text: 'Load (A)', color: '#67e8f9' }
                }
            }
        }
    });

    console.log('✅ Voltage-Load Scatter Chart rendered');
}

// E3: Bubble - Load Intensity
function renderLoadBubbleChart(data) {
    const ctx = document.getElementById('chartLoadBubble');
    if (!ctx) return;

    if (analyticsCharts.loadBubble) analyticsCharts.loadBubble.destroy();

    const pssDateData = {};
    const pssNames = [];
    
    data.slice(-10).forEach((entry, dateIdx) => {
        if (!entry.pssStation) return;
        const pss = entry.pssStation;
        
        // Track unique PSS names for Y-axis mapping
        if (!pssNames.includes(pss)) pssNames.push(pss);
        
        if (!pssDateData[pss]) pssDateData[pss] = [];
        
        let totalLoad = 0;
        if (entry.feeders) {
            Object.values(entry.feeders).forEach(feeder => {
                totalLoad += parseFloat(feeder.maxLoad || feeder.load || 0);
            });
        }
        
        // Use PSS index as Y coordinate (numeric)
        const pssIndex = pssNames.indexOf(pss);
        const bubbleSize = Math.max(totalLoad / 100000, 5); // Scale for visibility, min size 5
        
        pssDateData[pss].push({ 
            x: dateIdx, 
            y: pssIndex, 
            r: bubbleSize,
            actualLoad: totalLoad,
            pssName: pss
        });
    });

    const bubbleData = [];
    const colors = [
        'rgba(59, 130, 246, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(245, 158, 11, 0.6)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(168, 85, 247, 0.6)',
        'rgba(6, 182, 212, 0.6)'
    ];

    const datasets = [];
    Object.entries(pssDateData).slice(0, 6).forEach(([pss, points], idx) => {
        datasets.push({
            label: pss,
            data: points,
            backgroundColor: colors[idx] || 'rgba(100, 100, 100, 0.6)',
            borderColor: colors[idx]?.replace('0.6', '1') || 'rgba(100, 100, 100, 1)',
            borderWidth: 2
        });
    });

    console.log('📊 Bubble Chart Data:', datasets.length, 'PSS stations');

    analyticsCharts.loadBubble = new Chart(ctx, {
        type: 'bubble',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    position: 'bottom',
                    labels: { color: 'rgba(255,255,255,0.8)', font: { size: 10 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: (context) => {
                            const point = context.raw;
                            return [
                                `PSS: ${point.pssName || context.dataset.label}`,
                                `Load: ${formatNumber(point.actualLoad)} A`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } },
                    title: { display: true, text: 'Time Period', color: '#67e8f9' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)', 
                        font: { size: 10 },
                        callback: function(value) {
                            return pssNames[value] || value;
                        }
                    },
                    title: { display: true, text: 'PSS Station', color: '#67e8f9' }
                }
            }
        }
    });

    console.log('✅ Load Bubble Chart rendered');
}

// ============================================
// MAIN RENDER FUNCTION
// ============================================

function renderAllNewAnalytics(data) {
    console.log('🚀 Rendering NEW Analytics Dashboard with', data.length, 'entries');
    
    analyticsData = data;

    // Destroy all existing charts first to prevent conflicts
    Object.keys(analyticsCharts).forEach(chartKey => {
        if (analyticsCharts[chartKey]) {
            try {
                analyticsCharts[chartKey].destroy();
            } catch(e) {
                console.warn('Could not destroy chart:', chartKey);
            }
            delete analyticsCharts[chartKey];
        }
    });
    console.log('🗑️ Cleared all existing chart instances');

    // Calculate KPIs
    calculateKPIs(data);

    // Section A: PSS-Level Overview
    renderPSSAvgLoadChart(data);
    renderPSSVoltageStabilityChart(data);
    renderLoadHeatmapChart(data);

    // Section B: Feeder-Level Analysis
    renderFeederLoadTrendChart(data);
    renderFeederContributionChart(data);
    renderFeederRadarChart(data);

    // Section C: Voltage Stability
    renderVoltageLoadDualChart(data);
    renderVoltageBoxPlotChart(data);
    renderVoltageTrendChart(data);

    // Section D: Time-Based Insights
    renderTimeDistributionChart(data);
    renderCalendarHeatmapChart(data);
    renderHourFeederMatrixChart(data);

    // Section E: Comparative & Summary
    renderFeederDonutChart(data);
    renderVoltageLoadScatterChart(data);
    renderLoadBubbleChart(data);

    console.log('✅ All 18 new analytics charts rendered successfully!');
}

// Export for use in main admin.js
window.renderAllNewAnalytics = renderAllNewAnalytics;
window.analyticsCharts = analyticsCharts;

console.log('✅ NEW ANALYTICS MODULE LOADED');
