// ============================================
// ANALYTICS - PEAK & MIN AMP CALCULATIONS
// Real-time monitoring and statistical analysis
// ============================================

// ============================================
// CALCULATE PEAK & MIN AMP PER PSS
// ============================================

function calculatePeakMinAMP(submissions) {
    if (!submissions || submissions.length === 0) {
        return [];
    }
    
    // Group submissions by PSS station
    const pssgrouped = {};
    
    submissions.forEach(submission => {
        const pssName = submission.pssStation;
        
        if (!grouped[pssName]) {
            grouped[pssName] = {
                name: pssName,
                peakAMP: -Infinity,
                peakTime: '',
                minAMP: Infinity,
                minTime: '',
                totalAMP: 0,
                count: 0,
                readings: []
            };
        }
        
        // Extract all AMP readings from submission (127 columns)
        const ampReadings = extractAMPReadings(submission);
        
        ampReadings.forEach(reading => {
            grouped[pssName].readings.push(reading);
            grouped[pssName].totalAMP += reading.value;
            grouped[pssName].count++;
            
            // Update peak
            if (reading.value > grouped[pssName].peakAMP) {
                grouped[pssName].peakAMP = reading.value;
                grouped[pssName].peakTime = reading.time;
            }
            
            // Update min
            if (reading.value < grouped[pssName].minAMP) {
                grouped[pssName].minAMP = reading.value;
                grouped[pssName].minTime = reading.time;
            }
        });
    });
    
    // Calculate averages and format results
    const results = Object.values(grouped).map(pss => ({
        name: pss.name,
        peakAMP: pss.peakAMP === -Infinity ? 0 : pss.peakAMP,
        peakTime: pss.peakTime || 'N/A',
        minAMP: pss.minAMP === Infinity ? 0 : pss.minAMP,
        minTime: pss.minTime || 'N/A',
        avgAMP: pss.count > 0 ? pss.totalAMP / pss.count : 0,
        readingsCount: pss.count
    }));
    
    return results.sort((a, b) => b.peakAMP - a.peakAMP);
}

// ============================================
// EXTRACT AMP READINGS FROM SUBMISSION
// ============================================

function extractAMPReadings(submission) {
    const readings = [];
    
    // Helper function to add reading
    const addReading = (value, time, source) => {
        const ampValue = parseFloat(value);
        if (!isNaN(ampValue) && ampValue > 0) {
            readings.push({
                value: ampValue,
                time: time || 'N/A',
                source: source
            });
        }
    };
    
    // I/C 1 & 2 (33kv Load)
    if (submission.ic1_33kv_load_max) {
        addReading(submission.ic1_33kv_load_max, submission.ic1_33kv_load_max_time, 'I/C-1 33kV Max');
    }
    if (submission.ic1_33kv_load_min) {
        addReading(submission.ic1_33kv_load_min, submission.ic1_33kv_load_min_time, 'I/C-1 33kV Min');
    }
    if (submission.ic2_33kv_load_max) {
        addReading(submission.ic2_33kv_load_max, submission.ic2_33kv_load_max_time, 'I/C-2 33kV Max');
    }
    if (submission.ic2_33kv_load_min) {
        addReading(submission.ic2_33kv_load_min, submission.ic2_33kv_load_min_time, 'I/C-2 33kV Min');
    }
    
    // PTR 1 & 2 (33kv Load)
    if (submission.ptr1_33kv_load_max) {
        addReading(submission.ptr1_33kv_load_max, submission.ptr1_33kv_load_max_time, 'PTR-1 33kV Max');
    }
    if (submission.ptr1_33kv_load_min) {
        addReading(submission.ptr1_33kv_load_min, submission.ptr1_33kv_load_min_time, 'PTR-1 33kV Min');
    }
    if (submission.ptr2_33kv_load_max) {
        addReading(submission.ptr2_33kv_load_max, submission.ptr2_33kv_load_max_time, 'PTR-2 33kV Max');
    }
    if (submission.ptr2_33kv_load_min) {
        addReading(submission.ptr2_33kv_load_min, submission.ptr2_33kv_load_min_time, 'PTR-2 33kV Min');
    }
    
    // PTR 1 & 2 (11kv Load)
    if (submission.ptr1_11kv_load_max) {
        addReading(submission.ptr1_11kv_load_max, submission.ptr1_11kv_load_max_time, 'PTR-1 11kV Max');
    }
    if (submission.ptr1_11kv_load_min) {
        addReading(submission.ptr1_11kv_load_min, submission.ptr1_11kv_load_min_time, 'PTR-1 11kV Min');
    }
    if (submission.ptr2_11kv_load_max) {
        addReading(submission.ptr2_11kv_load_max, submission.ptr2_11kv_load_max_time, 'PTR-2 11kV Max');
    }
    if (submission.ptr2_11kv_load_min) {
        addReading(submission.ptr2_11kv_load_min, submission.ptr2_11kv_load_min_time, 'PTR-2 11kV Min');
    }
    
    // Feeders 1-6 (Load)
    for (let i = 1; i <= 6; i++) {
        if (submission[`feeder${i}_load_max`]) {
            addReading(submission[`feeder${i}_load_max`], submission[`feeder${i}_load_max_time`], `Feeder-${i} Max`);
        }
        if (submission[`feeder${i}_load_min`]) {
            addReading(submission[`feeder${i}_load_min`], submission[`feeder${i}_load_min_time`], `Feeder-${i} Min`);
        }
    }
    
    // Station Transformer
    if (submission.station_transformer_load_max) {
        addReading(submission.station_transformer_load_max, submission.station_transformer_load_max_time, 'Station Transformer Max');
    }
    if (submission.station_transformer_load_min) {
        addReading(submission.station_transformer_load_min, submission.station_transformer_load_min_time, 'Station Transformer Min');
    }
    
    return readings;
}

// ============================================
// TODAY'S STATISTICS
// ============================================

function calculateTodayStats(submissions) {
    const today = new Date().toISOString().split('T')[0];
    const todaySubmissions = submissions.filter(s => s.date === today);
    
    if (todaySubmissions.length === 0) {
        return {
            totalSubmissions: 0,
            uniqueUsers: 0,
            uniquePSS: 0,
            totalDataPoints: 0,
            avgSubmissionsPerUser: 0,
            completionRate: 0
        };
    }
    
    const uniqueUsers = new Set(todaySubmissions.map(s => s.phoneNumber)).size;
    const uniquePSS = new Set(todaySubmissions.map(s => s.pssStation)).size;
    const totalDataPoints = todaySubmissions.length * 127; // 127 columns per submission
    
    return {
        totalSubmissions: todaySubmissions.length,
        uniqueUsers: uniqueUsers,
        uniquePSS: uniquePSS,
        totalDataPoints: totalDataPoints,
        avgSubmissionsPerUser: (todaySubmissions.length / uniqueUsers).toFixed(1),
        completionRate: ((uniquePSS / appState.pssStations.length) * 100).toFixed(1)
    };
}

// ============================================
// LOAD DISTRIBUTION ANALYSIS
// ============================================

function analyzeLoadDistribution(submissions) {
    const distribution = {
        ic: { total: 0, count: 0, max: -Infinity, min: Infinity },
        ptr: { total: 0, count: 0, max: -Infinity, min: Infinity },
        feeders: { total: 0, count: 0, max: -Infinity, min: Infinity },
        transformer: { total: 0, count: 0, max: -Infinity, min: Infinity }
    };
    
    submissions.forEach(submission => {
        // I/C Analysis
        ['ic1_33kv_load_max', 'ic1_33kv_load_min', 'ic2_33kv_load_max', 'ic2_33kv_load_min'].forEach(field => {
            const value = parseFloat(submission[field]);
            if (!isNaN(value)) {
                distribution.ic.total += value;
                distribution.ic.count++;
                distribution.ic.max = Math.max(distribution.ic.max, value);
                distribution.ic.min = Math.min(distribution.ic.min, value);
            }
        });
        
        // PTR Analysis
        ['ptr1_33kv_load_max', 'ptr1_33kv_load_min', 'ptr2_33kv_load_max', 'ptr2_33kv_load_min',
         'ptr1_11kv_load_max', 'ptr1_11kv_load_min', 'ptr2_11kv_load_max', 'ptr2_11kv_load_min'].forEach(field => {
            const value = parseFloat(submission[field]);
            if (!isNaN(value)) {
                distribution.ptr.total += value;
                distribution.ptr.count++;
                distribution.ptr.max = Math.max(distribution.ptr.max, value);
                distribution.ptr.min = Math.min(distribution.ptr.min, value);
            }
        });
        
        // Feeders Analysis
        for (let i = 1; i <= 6; i++) {
            ['max', 'min'].forEach(type => {
                const value = parseFloat(submission[`feeder${i}_load_${type}`]);
                if (!isNaN(value)) {
                    distribution.feeders.total += value;
                    distribution.feeders.count++;
                    distribution.feeders.max = Math.max(distribution.feeders.max, value);
                    distribution.feeders.min = Math.min(distribution.feeders.min, value);
                }
            });
        }
        
        // Transformer Analysis
        ['station_transformer_load_max', 'station_transformer_load_min'].forEach(field => {
            const value = parseFloat(submission[field]);
            if (!isNaN(value)) {
                distribution.transformer.total += value;
                distribution.transformer.count++;
                distribution.transformer.max = Math.max(distribution.transformer.max, value);
                distribution.transformer.min = Math.min(distribution.transformer.min, value);
            }
        });
    });
    
    // Calculate averages
    Object.keys(distribution).forEach(key => {
        const category = distribution[key];
        category.avg = category.count > 0 ? category.total / category.count : 0;
        category.max = category.max === -Infinity ? 0 : category.max;
        category.min = category.min === Infinity ? 0 : category.min;
    });
    
    return distribution;
}

// ============================================
// PEAK HOURS ANALYSIS
// ============================================

function analyzePeakHours(submissions) {
    const hourlyData = Array(24).fill(0).map((_, hour) => ({
        hour: hour,
        count: 0,
        totalLoad: 0,
        avgLoad: 0
    }));
    
    submissions.forEach(submission => {
        // Extract time from max load readings
        const timeFields = [
            'ic1_33kv_load_max_time', 'ic2_33kv_load_max_time',
            'ptr1_33kv_load_max_time', 'ptr2_33kv_load_max_time',
            'ptr1_11kv_load_max_time', 'ptr2_11kv_load_max_time'
        ];
        
        timeFields.forEach(timeField => {
            const timeStr = submission[timeField];
            if (timeStr) {
                const hour = parseInt(timeStr.split(':')[0]);
                if (!isNaN(hour) && hour >= 0 && hour < 24) {
                    const loadField = timeField.replace('_time', '');
                    const loadValue = parseFloat(submission[loadField]);
                    
                    if (!isNaN(loadValue)) {
                        hourlyData[hour].count++;
                        hourlyData[hour].totalLoad += loadValue;
                    }
                }
            }
        });
    });
    
    // Calculate averages
    hourlyData.forEach(data => {
        data.avgLoad = data.count > 0 ? data.totalLoad / data.count : 0;
    });
    
    return hourlyData;
}

// ============================================
// DAILY TRENDS ANALYSIS
// ============================================

function analyzeDailyTrends(submissions, days = 30) {
    const today = new Date();
    const dailyData = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySubmissions = submissions.filter(s => s.date === dateStr);
        const peakMinData = calculatePeakMinAMP(daySubmissions);
        
        const avgPeak = peakMinData.length > 0 
            ? peakMinData.reduce((sum, pss) => sum + pss.peakAMP, 0) / peakMinData.length 
            : 0;
        const avgMin = peakMinData.length > 0 
            ? peakMinData.reduce((sum, pss) => sum + pss.minAMP, 0) / peakMinData.length 
            : 0;
        
        dailyData.push({
            date: dateStr,
            submissions: daySubmissions.length,
            avgPeakAMP: avgPeak,
            avgMinAMP: avgMin,
            uniqueUsers: new Set(daySubmissions.map(s => s.phoneNumber)).size,
            uniquePSS: new Set(daySubmissions.map(s => s.pssStation)).size
        });
    }
    
    return dailyData;
}

// ============================================
// PSS COMPARISON ANALYSIS
// ============================================

function comparePSSPerformance(submissions) {
    const pssData = {};
    
    submissions.forEach(submission => {
        const pssName = submission.pssStation;
        
        if (!pssData[pssName]) {
            pssData[pssName] = {
                name: pssName,
                totalSubmissions: 0,
                totalLoad: 0,
                maxLoad: -Infinity,
                minLoad: Infinity,
                uniqueUsers: new Set()
            };
        }
        
        pssData[pssName].totalSubmissions++;
        pssData[pssName].uniqueUsers.add(submission.phoneNumber);
        
        // Calculate total load from all readings
        const readings = extractAMPReadings(submission);
        readings.forEach(reading => {
            pssData[pssName].totalLoad += reading.value;
            pssData[pssName].maxLoad = Math.max(pssData[pssName].maxLoad, reading.value);
            pssData[pssName].minLoad = Math.min(pssData[pssName].minLoad, reading.value);
        });
    });
    
    // Calculate averages and format
    const results = Object.values(pssData).map(pss => ({
        name: pss.name,
        totalSubmissions: pss.totalSubmissions,
        avgLoad: pss.totalLoad / pss.totalSubmissions,
        maxLoad: pss.maxLoad === -Infinity ? 0 : pss.maxLoad,
        minLoad: pss.minLoad === Infinity ? 0 : pss.minLoad,
        uniqueUsers: pss.uniqueUsers.size,
        dataQuality: (pss.totalSubmissions / 30 * 100).toFixed(1) // Assuming monthly target
    }));
    
    return results.sort((a, b) => b.totalSubmissions - a.totalSubmissions);
}

// ============================================
// VOLTAGE QUALITY ANALYSIS
// ============================================

function analyzeVoltageQuality(submissions) {
    const voltageData = {
        ic_33kv: { total: 0, count: 0, max: -Infinity, min: Infinity, outOfRange: 0 },
        ptr_33kv: { total: 0, count: 0, max: -Infinity, min: Infinity, outOfRange: 0 },
        ptr_11kv: { total: 0, count: 0, max: -Infinity, min: Infinity, outOfRange: 0 },
        feeders: { total: 0, count: 0, max: -Infinity, min: Infinity, outOfRange: 0 }
    };
    
    // Voltage ranges (example thresholds)
    const ranges = {
        ic_33kv: { min: 31, max: 35 },
        ptr_33kv: { min: 31, max: 35 },
        ptr_11kv: { min: 10, max: 12 },
        feeders: { min: 10, max: 12 }
    };
    
    submissions.forEach(submission => {
        // I/C 33kV voltage
        ['ic1_33kv_voltage_max', 'ic1_33kv_voltage_min', 'ic2_33kv_voltage_max', 'ic2_33kv_voltage_min'].forEach(field => {
            const value = parseFloat(submission[field]);
            if (!isNaN(value)) {
                voltageData.ic_33kv.total += value;
                voltageData.ic_33kv.count++;
                voltageData.ic_33kv.max = Math.max(voltageData.ic_33kv.max, value);
                voltageData.ic_33kv.min = Math.min(voltageData.ic_33kv.min, value);
                
                if (value < ranges.ic_33kv.min || value > ranges.ic_33kv.max) {
                    voltageData.ic_33kv.outOfRange++;
                }
            }
        });
        
        // PTR 33kV voltage
        ['ptr1_33kv_voltage_max', 'ptr1_33kv_voltage_min', 'ptr2_33kv_voltage_max', 'ptr2_33kv_voltage_min'].forEach(field => {
            const value = parseFloat(submission[field]);
            if (!isNaN(value)) {
                voltageData.ptr_33kv.total += value;
                voltageData.ptr_33kv.count++;
                voltageData.ptr_33kv.max = Math.max(voltageData.ptr_33kv.max, value);
                voltageData.ptr_33kv.min = Math.min(voltageData.ptr_33kv.min, value);
                
                if (value < ranges.ptr_33kv.min || value > ranges.ptr_33kv.max) {
                    voltageData.ptr_33kv.outOfRange++;
                }
            }
        });
        
        // PTR 11kV voltage
        ['ptr1_11kv_voltage_max', 'ptr1_11kv_voltage_min', 'ptr2_11kv_voltage_max', 'ptr2_11kv_voltage_min'].forEach(field => {
            const value = parseFloat(submission[field]);
            if (!isNaN(value)) {
                voltageData.ptr_11kv.total += value;
                voltageData.ptr_11kv.count++;
                voltageData.ptr_11kv.max = Math.max(voltageData.ptr_11kv.max, value);
                voltageData.ptr_11kv.min = Math.min(voltageData.ptr_11kv.min, value);
                
                if (value < ranges.ptr_11kv.min || value > ranges.ptr_11kv.max) {
                    voltageData.ptr_11kv.outOfRange++;
                }
            }
        });
        
        // Feeder voltages
        for (let i = 1; i <= 6; i++) {
            ['max', 'min'].forEach(type => {
                const value = parseFloat(submission[`feeder${i}_voltage_${type}`]);
                if (!isNaN(value)) {
                    voltageData.feeders.total += value;
                    voltageData.feeders.count++;
                    voltageData.feeders.max = Math.max(voltageData.feeders.max, value);
                    voltageData.feeders.min = Math.min(voltageData.feeders.min, value);
                    
                    if (value < ranges.feeders.min || value > ranges.feeders.max) {
                        voltageData.feeders.outOfRange++;
                    }
                }
            });
        }
    });
    
    // Calculate averages and quality scores
    Object.keys(voltageData).forEach(key => {
        const category = voltageData[key];
        category.avg = category.count > 0 ? category.total / category.count : 0;
        category.max = category.max === -Infinity ? 0 : category.max;
        category.min = category.min === Infinity ? 0 : category.min;
        category.qualityScore = category.count > 0 
            ? ((category.count - category.outOfRange) / category.count * 100).toFixed(1) 
            : 100;
    });
    
    return voltageData;
}

// ============================================
// EXPORT ANALYTICS DATA
// ============================================

function prepareAnalyticsForExport(submissions) {
    return {
        peakMinAMP: calculatePeakMinAMP(submissions),
        todayStats: calculateTodayStats(submissions),
        loadDistribution: analyzeLoadDistribution(submissions),
        peakHours: analyzePeakHours(submissions),
        dailyTrends: analyzeDailyTrends(submissions),
        pssComparison: comparePSSPerformance(submissions),
        voltageQuality: analyzeVoltageQuality(submissions),
        generatedAt: new Date().toISOString(),
        totalSubmissions: submissions.length
    };
}

// Export functions
window.calculatePeakMinAMP = calculatePeakMinAMP;
window.calculateTodayStats = calculateTodayStats;
window.analyzeLoadDistribution = analyzeLoadDistribution;
window.analyzePeakHours = analyzePeakHours;
window.analyzeDailyTrends = analyzeDailyTrends;
window.comparePSSPerformance = comparePSSPerformance;
window.analyzeVoltageQuality = analyzeVoltageQuality;
window.prepareAnalyticsForExport = prepareAnalyticsForExport;
window.extractAMPReadings = extractAMPReadings;
