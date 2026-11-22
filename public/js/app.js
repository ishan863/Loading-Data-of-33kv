// ==================== MAIN APP CONTROLLER ====================

// Global state
const appState = {
    currentUser: null,
    currentScreen: 'loading',
    userData: null,
    pssConfig: {},
    isAdmin: false
};
let unsubscribePSSConfig = null;

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 PSS Loading Data Management App');
    console.log('👨‍💻 Developed by Raja Patel');
    console.log('Firebase Project:', firebase.app().options.projectId);
    
    // Show loading screen
    showScreen('loading');
    
    // Simulate loading (minimum 3 seconds for branding visibility)
    await simulateLoading();
    
    // Check if user is already logged in
    checkAuthState();
});

// Simulate loading process
async function simulateLoading() {
    const loadingText = document.querySelector('.loading-text');
    const steps = [
        'Initializing system...',
        'Connecting to database...',
        'Loading configuration...',
        'Preparing interface...',
        'Ready!'
    ];
    
    for (let i = 0; i < steps.length; i++) {
        if (loadingText) {
            loadingText.textContent = steps[i];
        }
        await sleep(600);
    }
}

// Check authentication state
function checkAuthState() {
    console.log('Checking auth state...');
    const savedUser = localStorage.getItem('pssUser');
    
    if (savedUser) {
        try {
            // User was logged in, restore session
            console.log('Found saved session, validating...');
            const userData = JSON.parse(savedUser);
            
            // Validate session data structure
            if (userData && userData.phoneNumber && userData.name && userData.role) {
                appState.currentUser = userData;
                console.log('Session valid, loading user data...');
                loadUserData();
            } else {
                // Invalid session structure, clear and show login
                console.warn('Invalid session structure, clearing...');
                localStorage.removeItem('pssUser');
                showScreen('login');
            }
        } catch (error) {
            // Corrupted session data, clear and show login
            console.error('Corrupted session data, clearing...', error);
            localStorage.removeItem('pssUser');
            showScreen('login');
        }
    } else {
        // No saved session, show login
        console.log('No saved session, showing login screen');
        showScreen('login');
    }
}

// Load user data from Firestore
async function loadUserData() {
    try {
        // Validate currentUser exists
        if (!appState.currentUser || !appState.currentUser.phoneNumber) {
            console.error('Invalid user session, clearing...');
            logout();
            return;
        }
        
        const phoneNumber = appState.currentUser.phoneNumber;
        console.log('🔍 Loading user data for phone:', phoneNumber);
        
        const userDoc = await db.collection('users')
            .where('phoneNumber', '==', phoneNumber)
            .limit(1)
            .get();
        
        if (!userDoc.empty) {
            appState.userData = userDoc.docs[0].data();
            appState.userData.id = userDoc.docs[0].id;
            
            // Verify phone number matches (detect Firestore changes)
            if (appState.userData.phoneNumber !== phoneNumber) {
                console.error('❌ Phone mismatch! Session:', phoneNumber, 'Firestore:', appState.userData.phoneNumber);
                alert('⚠️ Session mismatch detected. Please login again with correct phone number.');
                logout();
                return;
            }
            
            appState.isAdmin = appState.userData.role === 'admin';
            
            console.log('✅ User data loaded:', {
                phone: appState.userData.phoneNumber,
                name: appState.userData.name,
                role: appState.userData.role,
                pss: appState.userData.pssStation
            });
            
            // Update last login
            await db.collection('users').doc(appState.userData.id).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Load PSS configuration
            await loadPSSConfig();
            startPSSConfigListener();
            
            // Show appropriate dashboard
            if (appState.isAdmin) {
                console.log('Loading admin dashboard...');
                loadAdminDashboard();
            } else {
                if (appState.currentUser.name) {
                    console.log('Loading user dashboard for:', appState.currentUser.name);
                    loadUserDashboard();
                } else {
                    console.log('Showing name selection...');
                    showNameSelection();
                }
            }
        } else {
            // User not found in database
            showError('User not registered. Please contact administrator.');
            logout();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data');
        logout();
    }
}

// Load PSS configuration
async function loadPSSConfig() {
    try {
        const configSnapshot = await db.collection('pss_stations').get();
        appState.pssConfig = {};
        
    configSnapshot.forEach(doc => {
        const data = doc.data() || {};
        const name = String(data.name || '').trim();
        if (!data.name) data.name = doc.id;
        appState.pssConfig[doc.id] = data;
        if (name && !appState.pssConfig[name]) {
            appState.pssConfig[name] = data;
        }
    });
        
        console.log('✅ PSS Configuration loaded', appState.pssConfig);
    } catch (error) {
        console.error('Error loading PSS config:', error);
    }
}

function startPSSConfigListener() {
    if (unsubscribePSSConfig) unsubscribePSSConfig();
    unsubscribePSSConfig = db.collection('pss_stations').onSnapshot(snapshot => {
        const next = {};
        snapshot.forEach(doc => {
            const data = doc.data() || {};
            const name = String(data.name || doc.id).trim();
            if (!data.name) data.name = doc.id;
            next[doc.id] = data;
            if (name && !next[name]) next[name] = data;
        });
        appState.pssConfig = next;
    }, error => console.error('PSS configuration listener error:', error));
}

// Show screen by ID
function showScreen(screenId) {
    console.log('showScreen called with:', screenId);
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('active');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId + 'Screen');
    console.log('Target screen element:', targetScreen);
    
    if (targetScreen) {
        targetScreen.classList.add('active');
        appState.currentScreen = screenId;
        console.log('Screen activated:', screenId);
    } else {
        console.error('Screen not found:', screenId + 'Screen');
    }
}

// Logout function
function logout() {
    if (unsubscribePSSConfig) {
        unsubscribePSSConfig();
        unsubscribePSSConfig = null;
    }
    if (typeof window.stopAllRealtimeListeners === 'function') {
        window.stopAllRealtimeListeners();
    }
    if (typeof window.stopUserRealtimeListeners === 'function') {
        window.stopUserRealtimeListeners();
    }
    localStorage.removeItem('pssUser');
    appState.currentUser = null;
    appState.userData = null;
    appState.isAdmin = false;
    showScreen('login');
}

// Show error message
function showError(message) {
    alert(message); // TODO: Replace with better UI notification
}

// Show success message
function showSuccess(message) {
    alert(message); // TODO: Replace with better UI notification
}

// Utility: Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: Format date to dd-mm-yyyy
function formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        // If already in dd-mm-yyyy format, return as is
        if (/^\d{2}-\d{2}-\d{4}$/.test(date)) return date;
        date = new Date(date);
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Utility: Format time
function formatTime(time) {
    if (!time) return '';
    return time;
}

// Utility: Format timestamp to dd-mm-yyyy HH:MM
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    if (timestamp.toDate) timestamp = timestamp.toDate();
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}

// ============================================
// SHARED DATA UTILITIES (all screens)
// ============================================
const APP_TIMEZONE = 'Asia/Kolkata';

function todayLocalISO() {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
    } catch (e) {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}

function addDaysISO(isoDate, days) {
    const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(days)));
    return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

function yesterdayLocalISO() {
    return addDaysISO(todayLocalISO(), -1);
}

function toLocalISODate(value) {
    if (!value) return '';
    if (value instanceof Date && !isNaN(value)) {
        try {
            return value.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
        } catch (e) {
            return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
        }
    }
    return normalizeDateValue(value);
}

function normalizeDateValue(value) {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date && !isNaN(value)) return toLocalISODate(value);
    if (typeof value === 'number' && isFinite(value)) {
        const ms = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000;
        const d = new Date(ms);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    const text = String(value).trim();
    if (!text) return '';
    let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
        let year = m[3];
        if (year.length === 2) year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    const parsed = new Date(text);
    if (!isNaN(parsed)) return toLocalISODate(parsed);
    return '';
}

function normalizePhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits;
}

function isValidPhone(value) {
    return /^[6-9]\d{9}$/.test(normalizePhone(value));
}

function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function entrySortValue(entry) {
    if (!entry) return 0;
    const ts = entry.timestamp;
    if (ts) {
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts.seconds === 'number') return ts.seconds * 1000;
        if (ts instanceof Date) return ts.getTime();
        const parsedTs = new Date(ts).getTime();
        if (!isNaN(parsedTs)) return parsedTs;
    }
    const iso = normalizeDateValue(entry.date);
    if (iso) {
        const parsed = new Date(`${iso}T00:00:00+05:30`).getTime();
        if (!isNaN(parsed)) return parsed;
    }
    return 0;
}

function sortEntriesDesc(entries) {
    return [...entries].sort((a, b) => entrySortValue(b) - entrySortValue(a));
}

function decorateEntry(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    const out = { ...entry };
    const num = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        const n = Number(v);
        return isFinite(n) ? n : 0;
    };
    const pick = (a, b) => (a !== undefined && a !== null && a !== '' ? a : b);

    const incomerKeys = new Set(['ic1', 'ic2', ...Object.keys(out).map(key => key.match(/^(ic\d+)(?:_|$)/)?.[1]).filter(Boolean), ...Object.keys(out.incomers || {}).filter(key => /^ic\d+$/.test(key))]);
    incomerKeys.forEach(key => {
        const src = out[key] || {};
        const nested = out.incomers?.[key] || {};
        const hasICSource = !!out[key] || Object.keys(out).some(field =>
            field.startsWith(`${key}_`) && out[field] !== undefined && out[field] !== null && out[field] !== ''
        ) || Object.keys(nested).length > 0;
        out[`${key}_voltage_max`] = num(pick(out[`${key}_voltage_max`], src.maxVoltage ?? nested.maxVoltage));
        out[`${key}_voltage_min`] = num(pick(out[`${key}_voltage_min`], src.minVoltage ?? nested.minVoltage));
        out[`${key}_load_max`] = num(pick(out[`${key}_load_max`], src.maxLoad ?? nested.maxLoad));
        out[`${key}_load_min`] = num(pick(out[`${key}_load_min`], src.minLoad ?? nested.minLoad));
        out[`${key}_33kv_voltage_max`] = num(pick(out[`${key}_33kv_voltage_max`], src.maxVoltage ?? nested.maxVoltage));
        out[`${key}_33kv_voltage_min`] = num(pick(out[`${key}_33kv_voltage_min`], src.minVoltage ?? nested.minVoltage));
        out[`${key}_33kv_load_max`] = num(pick(out[`${key}_33kv_load_max`], src.maxLoad ?? nested.maxLoad));
        out[`${key}_33kv_load_min`] = num(pick(out[`${key}_33kv_load_min`], src.minLoad ?? nested.minLoad));
        out[`${key}_max_time`] = pick(out[`${key}_max_time`], src.maxLoadTime || src.maxVoltageTime || nested.maxLoadTime || nested.maxVoltageTime || '');
        out[`${key}_min_time`] = pick(out[`${key}_min_time`], src.minLoadTime || src.minVoltageTime || nested.minLoadTime || nested.minVoltageTime || '');
        out[`${key}_33kv_load_max_time`] = pick(out[`${key}_33kv_load_max_time`], src.maxLoadTime || nested.maxLoadTime || '');
        out[`${key}_33kv_load_min_time`] = pick(out[`${key}_33kv_load_min_time`], src.minLoadTime || nested.minLoadTime || '');
        const normalizedIC = {
            ...src,
            maxVoltage: num(src.maxVoltage ?? nested.maxVoltage ?? out[`${key}_33kv_voltage_max`]),
            maxVoltageTime: pick(src.maxVoltageTime, nested.maxVoltageTime || out[`${key}_33kv_voltage_max_time`] || ''),
            minVoltage: num(src.minVoltage ?? nested.minVoltage ?? out[`${key}_33kv_voltage_min`]),
            minVoltageTime: pick(src.minVoltageTime, nested.minVoltageTime || out[`${key}_33kv_voltage_min_time`] || ''),
            maxLoad: num(src.maxLoad ?? nested.maxLoad ?? out[`${key}_33kv_load_max`]),
            maxLoadTime: pick(src.maxLoadTime, nested.maxLoadTime || out[`${key}_33kv_load_max_time`] || ''),
            minLoad: num(src.minLoad ?? nested.minLoad ?? out[`${key}_33kv_load_min`]),
            minLoadTime: pick(src.minLoadTime, nested.minLoadTime || out[`${key}_33kv_load_min_time`] || '')
        };
        if (hasICSource) out[key] = normalizedIC;
    });

    for (let i = 1; i <= 6; i++) {
        const v33 = out[`ptr${i}_33kv`] || {};
        const v11 = out[`ptr${i}_11kv`] || {};
        out[`ptr${i}_33kv_voltage_max`] = num(pick(out[`ptr${i}_33kv_voltage_max`], v33.maxVoltage));
        out[`ptr${i}_33kv_voltage_min`] = num(pick(out[`ptr${i}_33kv_voltage_min`], v33.minVoltage));
        out[`ptr${i}_33kv_load_max`] = num(pick(out[`ptr${i}_33kv_load_max`], v33.maxLoad));
        out[`ptr${i}_33kv_load_min`] = num(pick(out[`ptr${i}_33kv_load_min`], v33.minLoad));
        out[`ptr${i}_11kv_voltage_max`] = num(pick(out[`ptr${i}_11kv_voltage_max`], v11.maxVoltage));
        out[`ptr${i}_11kv_voltage_min`] = num(pick(out[`ptr${i}_11kv_voltage_min`], v11.minVoltage));
        out[`ptr${i}_11kv_load_max`] = num(pick(out[`ptr${i}_11kv_load_max`], v11.maxLoad));
        out[`ptr${i}_11kv_load_min`] = num(pick(out[`ptr${i}_11kv_load_min`], v11.minLoad));
    }

    const st = out.stationTransformer || {};
    out.station_transformer_voltage_max = num(pick(out.station_transformer_voltage_max, st.maxVoltage));
    out.station_transformer_voltage_min = num(pick(out.station_transformer_voltage_min, st.minVoltage));
    out.station_transformer_load_max = num(pick(out.station_transformer_load_max, st.maxLoad));
    out.station_transformer_load_min = num(pick(out.station_transformer_load_min, st.minLoad));

    const ch = out.charger || {};
    out.charger_voltage_max = num(pick(out.charger_voltage_max, ch.maxVoltage));
    out.charger_voltage_min = num(pick(out.charger_voltage_min, ch.minVoltage));
    out.charger_load_max = num(pick(out.charger_load_max, ch.maxLoad));
    out.charger_load_min = num(pick(out.charger_load_min, ch.minLoad));

    if (!out.date) out.date = normalizeDateValue(out.date);
    if (!out.staffName) out.staffName = out.lineman || out.helper || '';
    out._sortValue = entrySortValue(out);
    return out;
}

function decorateEntries(entries) {
    return sortEntriesDesc((entries || []).map(decorateEntry));
}

// Older stations did not store an incomer list; preserve their two standard
// circuits while allowing each station to configure any number of circuits.
function getConfiguredIncomers(pssConfig) {
    const configured = pssConfig?.icCircuits;
    if (Array.isArray(configured) && configured.length) {
        const circuits = configured.map((circuit, index) => ({
            id: String(circuit?.id || `ic${index + 1}`).toLowerCase(),
            name: String(circuit?.name || `I/C-${index + 1}`)
        })).filter(circuit => /^ic\d+$/i.test(circuit.id));
        if (circuits.length) return circuits;
    }
    const count = Math.max(2, Math.min(20, Number(pssConfig?.incomerCount) || 2));
    return Array.from({ length: count }, (_, index) => ({ id: `ic${index + 1}`, name: `I/C-${index + 1}` }));
}

function getConfiguredPTRCount(pssConfig) {
    const raw = pssConfig?.ptrCount ?? pssConfig?.ptr;
    if (raw === undefined || raw === null || raw === '') return 2;
    const count = Number(raw);
    return Number.isInteger(count) && count >= 0 ? Math.min(count, 20) : 2;
}

function getEntryIncomers(entry) {
    if (!entry || typeof entry !== 'object') return [];
    const configured = getConfiguredIncomers(getPSSConfigFor(entry.pssStation));
    const circuits = new Map(configured.map(circuit => [circuit.id, circuit]));
    Object.keys(entry).filter(key => /^ic\d+$/.test(key)).forEach(key => {
        if (!circuits.has(key)) circuits.set(key, { id: key, name: `I/C-${key.slice(2)}` });
    });
    Object.keys(entry.incomers || {}).filter(key => /^ic\d+$/.test(key)).forEach(key => {
        if (!circuits.has(key)) circuits.set(key, { id: key, name: `I/C-${key.slice(2)}` });
    });
    return [...circuits.values()].map(circuit => ({
        ...circuit,
        name: entry.incomerNames?.[circuit.id] || circuit.name,
        data: entry[circuit.id] || entry.incomers?.[circuit.id] || null
    }));
}

console.log('✅ App controller loaded');
