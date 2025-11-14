// ==================== AUTHENTICATION LOGIC ====================

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const phoneInput = document.getElementById('phoneNumber');
    let phoneNumber = phoneInput.value.trim();
    
    // Validate phone number
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
        alert('Please enter a valid 10-digit phone number');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Checking...</span>';
    submitBtn.disabled = true;
    
    console.log('Attempting login with:', phoneNumber);
    
    try {
        // Check if phone number exists in users collection
        console.log('Querying Firestore for user...');
        const usersSnapshot = await db.collection('users')
            .where('phoneNumber', '==', phoneNumber)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            console.log('User not found');
            alert('Phone number not registered. Please contact administrator.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // User found
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        console.log('User found:', userData);
        
        // Clear any old localStorage sessions
        const oldSession = localStorage.getItem('pssUser');
        if (oldSession) {
            const oldData = JSON.parse(oldSession);
            if (oldData.phoneNumber !== phoneNumber) {
                console.warn('⚠️ Clearing old session with phone:', oldData.phoneNumber);
                localStorage.clear(); // Clear ALL old data
            }
        }
        
        // Save user session
        appState.currentUser = {
            phoneNumber: phoneNumber,
            name: userData.name,
            role: userData.role,
            pssStation: userData.pssStation,
            id: userDoc.id
        };
        
        localStorage.setItem('pssUser', JSON.stringify(appState.currentUser));
        console.log('✅ Session saved:', appState.currentUser);
        
        // Load full user data
        await loadUserData();
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Show name selection screen
async function showNameSelection() {
    showScreen('nameSelection');
    
    // Populate user info
    document.getElementById('userPhone').textContent = appState.currentUser.phoneNumber;
    document.getElementById('userStation').textContent = appState.userData.pssStation;
    
    // Get personnel list for this PSS from pss_config
    const pssStation = appState.userData.pssStation;
    const pssId = pssStation.toLowerCase().replace(' ', '-').replace('(', '').replace(')', '');
    const pssData = appState.pssConfig[pssId];
    
    if (!pssData) {
        console.error('PSS configuration not found for:', pssId);
        console.log('Available PSS configs:', Object.keys(appState.pssConfig));
        showError('PSS configuration not found');
        return;
    }
    
    // Combine linemen and helpers from PSS station data
    const allPersonnel = [
        ...(pssData.linemen || []),
        ...(pssData.helpers || [])
    ];
    
    console.log('Personnel for', pssStation, ':', allPersonnel);
    
    // Populate name list
    const nameList = document.getElementById('nameList');
    nameList.innerHTML = '';
    
    if (allPersonnel.length === 0) {
        nameList.innerHTML = '<p style="text-align: center; color: #888;">No personnel found for this PSS</p>';
        return;
    }
    
    allPersonnel.forEach(name => {
        const option = document.createElement('div');
        option.className = 'name-option';
        option.textContent = name;
        option.onclick = () => selectName(name);
        nameList.appendChild(option);
    });
}

// Handle name selection
function selectName(name) {
    appState.currentUser.name = name;
    localStorage.setItem('pssUser', JSON.stringify(appState.currentUser));
    loadUserDashboard();
}

// Load admin dashboard
function loadAdminDashboard() {
    showScreen('admin');
    if (typeof initAdminDashboard === 'function') {
        initAdminDashboard();
    }
}

// Load user dashboard
function loadUserDashboard() {
    showScreen('user');
    if (typeof initUserDashboard === 'function') {
        initUserDashboard();
    }
}

console.log('✅ Authentication module loaded');
