// ==================== MAIN APP CONTROLLER ====================

// Global state
const appState = {
    currentUser: null,
    currentScreen: 'loading',
    userData: null,
    pssConfig: {},
    isAdmin: false
};

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
            appState.pssConfig[doc.id] = doc.data();
        });
        
        console.log('✅ PSS Configuration loaded', appState.pssConfig);
    } catch (error) {
        console.error('Error loading PSS config:', error);
    }
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

console.log('✅ App controller loaded');
