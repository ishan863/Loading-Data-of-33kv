// ============================================
// FORM HANDLER - 127 COLUMN DATA ENTRY
// Step Wizard: PSS → I/C → PTR → Feeders → Transformer → Review
// ============================================

// Global form state
const formState = {
    currentStep: 1,
    totalSteps: 6,
    formData: {},
    isEditing: false,
    editingId: null,
    autoSaveInterval: null,
    validationErrors: {}
};

// Step configuration
const FORM_STEPS = [
    { id: 1, name: 'PSS & Personnel', icon: '📍' },
    { id: 2, name: 'I/C Data', icon: '⚡' },
    { id: 3, name: 'PTR Data', icon: '🔌' },
    { id: 4, name: 'Feeder Data', icon: '🌐' },
    { id: 5, name: 'Transformer & Charger', icon: '🔋' },
    { id: 6, name: 'Review & Submit', icon: '✅' }
];

// ============================================
// OPEN DATA ENTRY FORM
// ============================================

function openDataEntryForm(existingData = null) {
    console.log('Opening data entry form...', existingData ? 'EDIT MODE' : 'NEW ENTRY');
    
    // Create or show modal
    let modal = document.getElementById('data-entry-modal');
    
    if (!modal) {
        modal = createFormModal();
        document.body.appendChild(modal);
    }
    
    // Reset or populate form
    if (existingData) {
        formState.isEditing = true;
        formState.editingId = existingData.id;
        formState.formData = { ...existingData };
    } else {
        formState.isEditing = false;
        formState.editingId = null;
        formState.formData = {
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            phoneNumber: appState.user.phoneNumber,
            submittedBy: appState.user.name
        };
    }
    
    // Reset to step 1
    formState.currentStep = 1;
    
    // Show modal
    modal.classList.add('active');
    
    // Render form
    renderFormStep();
    updateProgressBar();
    
    // Start auto-save
    startAutoSave();
}

// ============================================
// CREATE FORM MODAL HTML
// ============================================

function createFormModal() {
    const modal = document.createElement('div');
    modal.id = 'data-entry-modal';
    modal.className = 'form-modal-overlay';
    
    modal.innerHTML = `
        <div class="form-modal">
            <!-- Header -->
            <div class="form-header">
                <div class="form-header-left">
                    <h2 class="form-title">PSS Data Entry</h2>
                    <p class="form-subtitle">127 Column Data Collection</p>
                </div>
                <button class="btn-close-form" onclick="closeDataEntryForm()">✕</button>
                <div class="autosave-indicator">
                    <div class="autosave-dot"></div>
                    <span class="autosave-text">Saved</span>
                </div>
            </div>
            
            <!-- Progress Stepper -->
            <div class="form-progress">
                <div class="progress-steps" id="progress-steps"></div>
                <div class="overall-progress-bar">
                    <div class="overall-progress-fill" id="overall-progress-fill"></div>
                </div>
            </div>
            
            <!-- Form Body -->
            <div class="form-body" id="form-body"></div>
            
            <!-- Footer Navigation -->
            <div class="form-footer">
                <div class="form-footer-left">
                    <button class="btn-save-draft" onclick="saveDraft()">
                        💾 Save Draft
                    </button>
                </div>
                <div class="form-footer-right">
                    <button class="btn-form-nav btn-prev" id="btn-prev" onclick="previousStep()" disabled>
                        ← Previous
                    </button>
                    <button class="btn-form-nav btn-next" id="btn-next" onclick="nextStep()">
                        Next →
                    </button>
                    <button class="btn-form-nav btn-submit" id="btn-submit" onclick="submitForm()" style="display:none;">
                        ✓ Submit
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// ============================================
// RENDER CURRENT STEP
// ============================================

function renderFormStep() {
    const formBody = document.getElementById('form-body');
    const progressSteps = document.getElementById('progress-steps');
    
    if (!formBody || !progressSteps) return;
    
    // Render progress steps
    progressSteps.innerHTML = FORM_STEPS.map(step => `
        <div class="progress-step ${step.id < formState.currentStep ? 'completed' : ''} ${step.id === formState.currentStep ? 'active' : ''}" 
             onclick="goToStep(${step.id})">
            <div class="step-circle">${step.id}</div>
            <span class="step-label">${step.name}</span>
        </div>
    `).join('');
    
    // Render form content based on current step
    let content = '';
    
    switch(formState.currentStep) {
        case 1:
            content = renderStep1_PSSPersonnel();
            break;
        case 2:
            content = renderStep2_ICData();
            break;
        case 3:
            content = renderStep3_PTRData();
            break;
        case 4:
            content = renderStep4_FeederData();
            break;
        case 5:
            content = renderStep5_TransformerCharger();
            break;
        case 6:
            content = renderStep6_Review();
            break;
    }
    
    formBody.innerHTML = `<div class="form-step active">${content}</div>`;
    
    // Attach event listeners
    attachFormEventListeners();
    
    // Update navigation buttons
    updateNavigationButtons();
}

// ============================================
// STEP 1: PSS & PERSONNEL SELECTION
// ============================================

function renderStep1_PSSPersonnel() {
    const pssOptions = appState.pssStations.map(pss => `<option value="${pss.name}">${pss.name}</option>`).join('');
    
    return `
        <div class="step-header">
            <h2 class="step-title">📍 PSS & Personnel Selection</h2>
            <p class="step-description">Select your PSS station and personnel information</p>
        </div>
        
        <div class="selection-cards">
            <div class="selection-card">
                <div class="selection-card-header">
                    <div class="selection-icon">🏢</div>
                    <h3 class="selection-card-title">PSS Station</h3>
                </div>
                <div class="form-group">
                    <label class="form-label required">Select PSS Station</label>
                    <select class="form-select" id="pssStation" required>
                        <option value="">Choose PSS Station...</option>
                        ${pssOptions}
                    </select>
                </div>
            </div>
            
            <div class="selection-card">
                <div class="selection-card-header">
                    <div class="selection-icon">👤</div>
                    <h3 class="selection-card-title">Personnel</h3>
                </div>
                <div class="form-group">
                    <label class="form-label required">Personnel Name</label>
                    <input type="text" class="form-input" id="personnelName" 
                           placeholder="Enter personnel name" required 
                           value="${formState.formData.personnelName || ''}">
                </div>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label required">Date</label>
                <input type="date" class="form-input" id="date" required 
                       value="${formState.formData.date || ''}" max="${new Date().toISOString().split('T')[0]}">
            </div>
        </div>
    `;
}

// ============================================
// STEP 2: I/C DATA (I/C-1 & I/C-2 33kV)
// ============================================

function renderStep2_ICData() {
    return `
        <div class="step-header">
            <h2 class="step-title">⚡ I/C Data (33kV)</h2>
            <p class="step-description">Enter voltage and load data for I/C-1 and I/C-2</p>
        </div>
        
        ${renderICSection('I/C-1', 'ic1_33kv')}
        ${renderICSection('I/C-2', 'ic2_33kv')}
    `;
}

function renderICSection(title, prefix) {
    return `
        <div class="data-section">
            <div class="section-header">
                <h3 class="section-title">${title} - 33kV</h3>
                <span class="section-badge">4 fields</span>
            </div>
            
            <div class="entry-grid">
                <div class="entry-block">
                    <h4 class="entry-block-title">📊 Voltage (kV)</h4>
                    <div class="value-time-row">
                        <div class="form-group">
                            <label class="form-label">Max Voltage</label>
                            <input type="number" step="0.01" class="form-input" id="${prefix}_voltage_max" 
                                   placeholder="e.g., 33.5" value="${formState.formData[prefix + '_voltage_max'] || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Time</label>
                            <input type="text" class="form-input time-picker-input" id="${prefix}_voltage_max_time" 
                                   placeholder="--:--" readonly value="${formState.formData[prefix + '_voltage_max_time'] || ''}">
                        </div>
                    </div>
                    <div class="value-time-row">
                        <div class="form-group">
                            <label class="form-label">Min Voltage</label>
                            <input type="number" step="0.01" class="form-input" id="${prefix}_voltage_min" 
                                   placeholder="e.g., 32.1" value="${formState.formData[prefix + '_voltage_min'] || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Time</label>
                            <input type="text" class="form-input time-picker-input" id="${prefix}_voltage_min_time" 
                                   placeholder="--:--" readonly value="${formState.formData[prefix + '_voltage_min_time'] || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="entry-block">
                    <h4 class="entry-block-title">⚡ Load (AMP)</h4>
                    <div class="value-time-row">
                        <div class="form-group">
                            <label class="form-label">Max Load</label>
                            <input type="number" step="0.01" class="form-input" id="${prefix}_load_max" 
                                   placeholder="e.g., 450.5" value="${formState.formData[prefix + '_load_max'] || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Time</label>
                            <input type="text" class="form-input time-picker-input" id="${prefix}_load_max_time" 
                                   placeholder="--:--" readonly value="${formState.formData[prefix + '_load_max_time'] || ''}">
                        </div>
                    </div>
                    <div class="value-time-row">
                        <div class="form-group">
                            <label class="form-label">Min Load</label>
                            <input type="number" step="0.01" class="form-input" id="${prefix}_load_min" 
                                   placeholder="e.g., 120.3" value="${formState.formData[prefix + '_load_min'] || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Time</label>
                            <input type="text" class="form-input time-picker-input" id="${prefix}_load_min_time" 
                                   placeholder="--:--" readonly value="${formState.formData[prefix + '_load_min_time'] || ''}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// STEP 3: PTR DATA (DYNAMIC based on PSS ptrCount)
// ============================================

function renderStep3_PTRData() {
    // Get PSS station from formData
    const selectedPSS = formState.formData.pssStation || (window.appState && window.appState.currentUser ? window.appState.currentUser.pssStation : null);
    
    console.log('🔌 PTR RENDERING DEBUG:');
    console.log('  Selected PSS:', selectedPSS);
    console.log('  formState.formData:', formState.formData);
    console.log('  appState exists:', !!window.appState);
    console.log('  pssConfig exists:', !!(window.appState && window.appState.pssConfig));
    
    // Get PTR count from PSS config
    let ptrCount = 2; // Default
    if (window.appState && window.appState.pssConfig && selectedPSS && window.appState.pssConfig[selectedPSS]) {
        const pssConfig = window.appState.pssConfig[selectedPSS];
        ptrCount = pssConfig.ptrCount || 2;
        console.log('  ✅ Found PSS config, ptrCount:', ptrCount);
    } else {
        console.warn('  ⚠️ PSS config not found, using default ptrCount:', ptrCount);
        if (window.appState && window.appState.pssConfig) {
            console.log('  Available PSS configs:', Object.keys(window.appState.pssConfig));
        }
    }
    
    console.log(`🔌 PTR Data - PSS: ${selectedPSS}, PTR Count: ${ptrCount}`);
    
    // Generate PTR sections dynamically based on count
    let ptrSections = '';
    for (let i = 1; i <= ptrCount; i++) {
        ptrSections += renderPTRSection(`PTR-${i} 33kV`, `ptr${i}_33kv`);
    }
    for (let i = 1; i <= ptrCount; i++) {
        ptrSections += renderPTRSection(`PTR-${i} 11kV`, `ptr${i}_11kv`);
    }
    
    return `
        <div class="step-header">
            <h2 class="step-title">🔌 PTR Data (33kV & 11kV)</h2>
            <p class="step-description">Enter voltage and load data for ${ptrCount} PTR${ptrCount > 1 ? 's' : ''} (33kV & 11kV)</p>
        </div>
        
        ${ptrSections}
    `;
}

function renderPTRSection(title, prefix) {
    return renderICSection(title, prefix); // Same structure as I/C
}

// ============================================
// STEP 4: FEEDER DATA (DYNAMIC)
// ============================================

function renderStep4_FeederData() {
    // Get PSS station from formData or currentUser
    const selectedPSS = formState.formData.pssStation || (window.appState && window.appState.currentUser ? window.appState.currentUser.pssStation : null);
    
    console.log('🔍 Feeder Generation Debug:');
    console.log('  Selected PSS:', selectedPSS);
    console.log('  appState exists:', !!window.appState);
    console.log('  pssConfig exists:', !!(window.appState && window.appState.pssConfig));
    console.log('  pssConfig keys:', window.appState && window.appState.pssConfig ? Object.keys(window.appState.pssConfig) : 'none');
    
    // Get feeder configuration from PSS config (NEW: array of feeder objects with names)
    let feedersArray = [];
    let ptrCount = 2; // Default PTR count
    
    if (window.appState && window.appState.pssConfig && selectedPSS && window.appState.pssConfig[selectedPSS]) {
        const pssConfig = window.appState.pssConfig[selectedPSS];
        console.log('  ✅ Found PSS config:', pssConfig);
        
        // Get PTR count
        ptrCount = pssConfig.ptrCount || 2;
        console.log('  📊 PTR Count:', ptrCount);
        
        // NEW: Handle array of feeder objects with names
        if (Array.isArray(pssConfig.feeders) && pssConfig.feeders.length > 0 && typeof pssConfig.feeders[0] === 'object') {
            // New format: array of {id, name, ptrNo}
            feedersArray = pssConfig.feeders;
            console.log('  ✅ Using feeder objects:', feedersArray.length, 'feeders with names');
        } else if (typeof pssConfig.feeders === 'number') {
            // Old format: just a number
            feedersArray = Array.from({length: pssConfig.feeders}, (_, i) => ({
                id: i + 1,
                name: `Feeder ${i + 1}`,
                ptrNo: ((i % ptrCount) + 1)
            }));
            console.log('  ⚠️ Using number format (legacy):', pssConfig.feeders, 'feeders');
        } else if (Array.isArray(pssConfig.feeders)) {
            // Old format: array of strings or numbers
            feedersArray = Array.from({length: pssConfig.feeders.length}, (_, i) => ({
                id: i + 1,
                name: `Feeder ${i + 1}`,
                ptrNo: ((i % ptrCount) + 1)
            }));
            console.log('  ⚠️ Using array format (legacy):', pssConfig.feeders.length, 'feeders');
        }
    } else {
        console.error('  ❌ PSS config not found!');
        console.log('  Available configs:', window.appState?.pssConfig);
    }
    
    // Fallback to 6 feeders if config not available
    if (feedersArray.length === 0) {
        console.warn(`⚠️ No PSS config found for ${selectedPSS}, defaulting to 6 feeders`);
        feedersArray = Array.from({length: 6}, (_, i) => ({
            id: i + 1,
            name: `Feeder ${i + 1}`,
            ptrNo: ((i % ptrCount) + 1)
        }));
    }
    
    const feederCount = feedersArray.length;
    console.log('  📊 Final feeder count:', feederCount);
    console.log('  📊 Feeders array:', feedersArray);
    
    // Store in formState for use in submit
    formState.feedersConfig = feedersArray;
    formState.ptrCount = ptrCount;
    
    return `
        <div class="step-header">
            <h2 class="step-title">🌐 Feeder Data (1-${feederCount})</h2>
            <p class="step-description">Enter voltage and load data for all ${feederCount} feeders at ${selectedPSS || 'your PSS'}</p>
        </div>
        
        <div class="feeders-grid">
            ${feedersArray.map(feeder => renderFeederCard(feeder, ptrCount)).join('')}
        </div>
    `;
}

function renderFeederCard(feeder, ptrCount) {
    // DEFENSIVE: Extract values with multiple fallbacks
    let feederNum, feederName, defaultPTR;
    
    if (typeof feeder === 'object' && feeder !== null) {
        feederNum = feeder.id || 1;
        feederName = feeder.name || `Feeder ${feederNum}`;
        defaultPTR = feeder.ptrNo || 1;
    } else {
        feederNum = feeder;
        feederName = `Feeder ${feeder}`;
        defaultPTR = 1;
    }
    
    const prefix = `feeder${feederNum}`;
    
    // Ensure feederName is a string
    feederName = String(feederName);
    
    console.log(`🔧 Rendering feeder card:`, {
        feederObject: feeder,
        feederNum: feederNum,
        feederName: feederName,
        defaultPTR: defaultPTR,
        feederType: typeof feeder,
        hasName: feeder && feeder.name,
        rawName: feeder && feeder.name
    });
    
    // Generate PTR options dynamically based on ptrCount
    let ptrOptions = '<option value="">Select PTR...</option>';
    for (let i = 1; i <= ptrCount; i++) {
        const selected = formState.formData[prefix + '_ptr_no'] === String(i) || (formState.formData[prefix + '_ptr_no'] === '' && i === defaultPTR) ? 'selected' : '';
        ptrOptions += `<option value="${i}" ${selected}>PTR-${i}</option>`;
    }
    
    return `
        <div class="feeder-card">
            <h3 class="feeder-header">⚡ ${feederName}</h3>
            
            <!-- PTR Selection (Dynamic based on PSS config) -->
            <div class="form-row">
                <div class="form-group ptr-dropdown-group">
                    <label class="form-label">PTR Number</label>
                    <select class="form-select" id="${prefix}_ptr_no">
                        ${ptrOptions}
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Max Voltage</label>
                    <input type="number" step="0.01" class="form-input feeder-input-field" id="${prefix}_voltage_max" 
                           placeholder="kV" value="${formState.formData[prefix + '_voltage_max'] || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Time</label>
                    <input type="text" class="form-input time-picker-input feeder-input-field" id="${prefix}_voltage_max_time" 
                           placeholder="--:--" readonly value="${formState.formData[prefix + '_voltage_max_time'] || ''}">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Min Voltage</label>
                    <input type="number" step="0.01" class="form-input feeder-input-field" id="${prefix}_voltage_min" 
                           placeholder="kV" value="${formState.formData[prefix + '_voltage_min'] || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Time</label>
                    <input type="text" class="form-input time-picker-input feeder-input-field" id="${prefix}_voltage_min_time" 
                           placeholder="--:--" readonly value="${formState.formData[prefix + '_voltage_min_time'] || ''}">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Max Load</label>
                    <input type="number" step="0.01" class="form-input feeder-input-field" id="${prefix}_load_max" 
                           placeholder="AMP" value="${formState.formData[prefix + '_load_max'] || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Time</label>
                    <input type="text" class="form-input time-picker-input feeder-input-field" id="${prefix}_load_max_time" 
                           placeholder="--:--" readonly value="${formState.formData[prefix + '_load_max_time'] || ''}">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Min Load</label>
                    <input type="number" step="0.01" class="form-input feeder-input-field" id="${prefix}_load_min" 
                           placeholder="AMP" value="${formState.formData[prefix + '_load_min'] || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Time</label>
                    <input type="text" class="form-input time-picker-input feeder-input-field" id="${prefix}_load_min_time" 
                           placeholder="--:--" readonly value="${formState.formData[prefix + '_load_min_time'] || ''}">
                </div>
            </div>
        </div>
    `;
}

// ============================================
// STEP 5: STATION TRANSFORMER & CHARGER
// ============================================

function renderStep5_TransformerCharger() {
    return `
        <div class="step-header">
            <h2 class="step-title">🔋 Station Transformer & Charger</h2>
            <p class="step-description">Final equipment data collection</p>
        </div>
        
        ${renderTransformerSection('Station Transformer', 'station_transformer')}
        ${renderTransformerSection('Charger', 'charger')}
    `;
}

function renderTransformerSection(title, prefix) {
    return renderICSection(title, prefix); // Same structure
}

// ============================================
// STEP 6: REVIEW & SUBMIT
// ============================================

function renderStep6_Review() {
    return `
        <div class="step-header">
            <h2 class="step-title">✅ Review Your Submission</h2>
            <p class="step-description">Please verify all data before submitting</p>
        </div>
        
        <div class="review-summary">
            <div class="review-section">
                <h3 class="review-section-title">📍 Basic Information</h3>
                <div class="review-grid">
                    <div class="review-item">
                        <p class="review-label">PSS Station</p>
                        <p class="review-value">${formState.formData.pssStation || 'Not set'}</p>
                    </div>
                    <div class="review-item">
                        <p class="review-label">Personnel</p>
                        <p class="review-value">${formState.formData.personnelName || 'Not set'}</p>
                    </div>
                    <div class="review-item">
                        <p class="review-label">Date</p>
                        <p class="review-value">${formState.formData.date || 'Not set'}</p>
                    </div>
                </div>
            </div>
            
            <div class="review-section">
                <h3 class="review-section-title">📊 Data Summary</h3>
                <div class="review-grid">
                    <div class="review-item">
                        <p class="review-label">Total Fields Filled</p>
                        <p class="review-value">${countFilledFields()} / 127</p>
                    </div>
                    <div class="review-item">
                        <p class="review-label">Completion</p>
                        <p class="review-value">${(countFilledFields() / 127 * 100).toFixed(1)}%</p>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 0.5rem; color: white;">
                    <input type="checkbox" id="confirmSubmission" required>
                    <span>I confirm that all data entered is accurate and complete</span>
                </label>
            </div>
        </div>
    `;
}

function countFilledFields() {
    let count = 0;
    Object.values(formState.formData).forEach(value => {
        if (value !== null && value !== undefined && value !== '') {
            count++;
        }
    });
    return count;
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function nextStep() {
    // Save current step data
    saveCurrentStepData();
    
    // Validate current step
    if (!validateCurrentStep()) {
        return;
    }
    
    // Move to next step
    if (formState.currentStep < formState.totalSteps) {
        formState.currentStep++;
        renderFormStep();
        updateProgressBar();
    }
}

function previousStep() {
    // Save current step data
    saveCurrentStepData();
    
    // Move to previous step
    if (formState.currentStep > 1) {
        formState.currentStep--;
        renderFormStep();
        updateProgressBar();
    }
}

function goToStep(stepNumber) {
    if (stepNumber >= 1 && stepNumber <= formState.totalSteps) {
        saveCurrentStepData();
        formState.currentStep = stepNumber;
        renderFormStep();
        updateProgressBar();
    }
}

function updateNavigationButtons() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    
    if (btnPrev) {
        btnPrev.disabled = formState.currentStep === 1;
    }
    
    if (btnNext && btnSubmit) {
        if (formState.currentStep === formState.totalSteps) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'flex';
        } else {
            btnNext.style.display = 'flex';
            btnSubmit.style.display = 'none';
        }
    }
}

function updateProgressBar() {
    const progressFill = document.getElementById('overall-progress-fill');
    if (progressFill) {
        const percent = (formState.currentStep / formState.totalSteps) * 100;
        progressFill.style.width = `${percent}%`;
    }
}

// ============================================
// DATA MANAGEMENT
// ============================================

function saveCurrentStepData() {
    const inputs = document.querySelectorAll('.form-input, .form-select');
    
    inputs.forEach(input => {
        if (input.id) {
            formState.formData[input.id] = input.value;
        }
    });
}

function validateCurrentStep() {
    // Basic validation - can be enhanced
    const requiredFields = document.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    if (!isValid) {
        alert('Please fill in all required fields');
    }
    
    return isValid;
}

function attachFormEventListeners() {
    // Auto-save on input change
    document.querySelectorAll('.form-input, .form-select').forEach(input => {
        input.addEventListener('change', () => {
            saveCurrentStepData();
            showAutoSaveIndicator('saving');
            setTimeout(() => showAutoSaveIndicator('saved'), 500);
        });
    });
    
    // Initialize clock time pickers
    if (typeof initializeTimePickersInModal === 'function') {
        initializeTimePickersInModal();
    }
}

// ============================================
// AUTO-SAVE
// ============================================

function startAutoSave() {
    // Auto-save every 30 seconds
    if (formState.autoSaveInterval) {
        clearInterval(formState.autoSaveInterval);
    }
    
    formState.autoSaveInterval = setInterval(() => {
        saveCurrentStepData();
        saveDraft();
    }, 30000);
}

function showAutoSaveIndicator(status) {
    const indicator = document.querySelector('.autosave-indicator');
    if (!indicator) return;
    
    indicator.classList.remove('saving', 'saved');
    indicator.classList.add(status);
    
    const text = indicator.querySelector('.autosave-text');
    if (text) {
        text.textContent = status === 'saving' ? 'Saving...' : 'Saved';
    }
}

async function saveDraft() {
    // Save to localStorage as draft
    try {
        const draftKey = `draft_${appState.user.phoneNumber}_${formState.formData.date || 'current'}`;
        localStorage.setItem(draftKey, JSON.stringify(formState.formData));
        console.log('Draft saved');
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

// ============================================
// SUBMIT FORM
// ============================================

async function submitForm() {
    // Final validation
    saveCurrentStepData();
    
    const confirmCheckbox = document.getElementById('confirmSubmission');
    if (confirmCheckbox && !confirmCheckbox.checked) {
        alert('Please confirm that all data is accurate before submitting');
        return;
    }
    
    // Get PSS station and feeder count
    const selectedPSS = formState.formData.pssStation || (window.appState && window.appState.currentUser ? window.appState.currentUser.pssStation : null);
    let feederCount = 6; // default
    let ptrCount = 2; // default
    
    if (window.appState && window.appState.pssConfig && selectedPSS && window.appState.pssConfig[selectedPSS]) {
        const pssConfig = window.appState.pssConfig[selectedPSS];
        
        // Get PTR count
        ptrCount = pssConfig.ptrCount || 2;
        
        // Get feeder count
        if (typeof pssConfig.feeders === 'number') {
            feederCount = pssConfig.feeders;
        } else if (Array.isArray(pssConfig.feeders)) {
            feederCount = pssConfig.feeders.length;
        }
    }
    
    console.log(`📊 Submit - PSS: ${selectedPSS}, PTR Count: ${ptrCount}, Feeder Count: ${feederCount}`);
    
    // Validate feeder data before submitting
    const validationErrors = [];
    for (let i = 1; i <= feederCount; i++) {
        const prefix = `feeder${i}`;
        const maxVoltage = parseFloat(formState.formData[`${prefix}_voltage_max`]) || 0;
        const minVoltage = parseFloat(formState.formData[`${prefix}_voltage_min`]) || 0;
        const maxLoad = parseFloat(formState.formData[`${prefix}_load_max`]) || 0;
        const minLoad = parseFloat(formState.formData[`${prefix}_load_min`]) || 0;
        
        // Only validate if data is entered
        if (maxVoltage > 0 && minVoltage > 0 && maxVoltage < minVoltage) {
            validationErrors.push(`Feeder ${i}: Max voltage (${maxVoltage} kV) must be >= Min voltage (${minVoltage} kV)`);
        }
        if (maxLoad > 0 && minLoad > 0 && maxLoad < minLoad) {
            validationErrors.push(`Feeder ${i}: Max load (${maxLoad} A) must be >= Min load (${minLoad} A)`);
        }
    }
    
    // Show validation errors if any
    if (validationErrors.length > 0) {
        alert('❌ Validation Errors:\n\n' + validationErrors.join('\n\n'));
        return;
    }
    
    // Collect feeder data into proper structure
    const feedersData = {};
    for (let i = 1; i <= feederCount; i++) {
        const prefix = `feeder${i}`;
        const feederKey = `Feeder-${i}`;
        
        // Get feeder name from feedersConfig if available
        let actualFeederName = `Feeder-${i}`; // Default
        if (formState.feedersConfig && Array.isArray(formState.feedersConfig)) {
            const feederConfig = formState.feedersConfig.find(f => f.id === i);
            if (feederConfig && feederConfig.name) {
                actualFeederName = feederConfig.name;
            }
        }
        
        // Only include feeder if at least one field has data
        const hasData = formState.formData[`${prefix}_voltage_max`] || 
                       formState.formData[`${prefix}_voltage_min`] ||
                       formState.formData[`${prefix}_load_max`] ||
                       formState.formData[`${prefix}_load_min`];
        
        if (hasData) {
            feedersData[feederKey] = {
                name: actualFeederName,  // ADD feeder name
                maxVoltage: parseFloat(formState.formData[`${prefix}_voltage_max`]) || 0,
                maxVoltageTime: formState.formData[`${prefix}_voltage_max_time`] || '',
                minVoltage: parseFloat(formState.formData[`${prefix}_voltage_min`]) || 0,
                minVoltageTime: formState.formData[`${prefix}_voltage_min_time`] || '',
                maxLoad: parseFloat(formState.formData[`${prefix}_load_max`]) || 0,
                maxLoadTime: formState.formData[`${prefix}_load_max_time`] || '',
                minLoad: parseFloat(formState.formData[`${prefix}_load_min`]) || 0,
                minLoadTime: formState.formData[`${prefix}_load_min_time`] || '',
                ptrNo: formState.formData[`${prefix}_ptr_no`] || i.toString()
            };
        }
    }
    
    console.log('🔌 Collected Feeder Data:', feedersData);
    console.log('🔌 Number of feeders with data:', Object.keys(feedersData).length);
    
    // Collect I/C data into proper structure
    const ic1Data = {
        maxVoltage: parseFloat(formState.formData['ic1_33kv_voltage_max']) || 0,
        maxVoltageTime: formState.formData['ic1_33kv_voltage_max_time'] || '',
        minVoltage: parseFloat(formState.formData['ic1_33kv_voltage_min']) || 0,
        minVoltageTime: formState.formData['ic1_33kv_voltage_min_time'] || '',
        maxLoad: parseFloat(formState.formData['ic1_33kv_load_max']) || 0,
        maxLoadTime: formState.formData['ic1_33kv_load_max_time'] || '',
        minLoad: parseFloat(formState.formData['ic1_33kv_load_min']) || 0,
        minLoadTime: formState.formData['ic1_33kv_load_min_time'] || ''
    };
    
    const ic2Data = {
        maxVoltage: parseFloat(formState.formData['ic2_33kv_voltage_max']) || 0,
        maxVoltageTime: formState.formData['ic2_33kv_voltage_max_time'] || '',
        minVoltage: parseFloat(formState.formData['ic2_33kv_voltage_min']) || 0,
        minVoltageTime: formState.formData['ic2_33kv_voltage_min_time'] || '',
        maxLoad: parseFloat(formState.formData['ic2_33kv_load_max']) || 0,
        maxLoadTime: formState.formData['ic2_33kv_load_max_time'] || '',
        minLoad: parseFloat(formState.formData['ic2_33kv_load_min']) || 0,
        minLoadTime: formState.formData['ic2_33kv_load_min_time'] || ''
    };
    
    // Collect PTR data dynamically based on ptrCount
    const ptrData = {};
    for (let i = 1; i <= ptrCount; i++) {
        // 33kV PTR
        const ptr33kvPrefix = `ptr${i}_33kv`;
        ptrData[`ptr${i}_33kv`] = {
            maxVoltage: parseFloat(formState.formData[`${ptr33kvPrefix}_voltage_max`]) || 0,
            maxVoltageTime: formState.formData[`${ptr33kvPrefix}_voltage_max_time`] || '',
            minVoltage: parseFloat(formState.formData[`${ptr33kvPrefix}_voltage_min`]) || 0,
            minVoltageTime: formState.formData[`${ptr33kvPrefix}_voltage_min_time`] || '',
            maxLoad: parseFloat(formState.formData[`${ptr33kvPrefix}_load_max`]) || 0,
            maxLoadTime: formState.formData[`${ptr33kvPrefix}_load_max_time`] || '',
            minLoad: parseFloat(formState.formData[`${ptr33kvPrefix}_load_min`]) || 0,
            minLoadTime: formState.formData[`${ptr33kvPrefix}_load_min_time`] || ''
        };
        
        // 11kV PTR
        const ptr11kvPrefix = `ptr${i}_11kv`;
        ptrData[`ptr${i}_11kv`] = {
            maxVoltage: parseFloat(formState.formData[`${ptr11kvPrefix}_voltage_max`]) || 0,
            maxVoltageTime: formState.formData[`${ptr11kvPrefix}_voltage_max_time`] || '',
            minVoltage: parseFloat(formState.formData[`${ptr11kvPrefix}_voltage_min`]) || 0,
            minVoltageTime: formState.formData[`${ptr11kvPrefix}_voltage_min_time`] || '',
            maxLoad: parseFloat(formState.formData[`${ptr11kvPrefix}_load_max`]) || 0,
            maxLoadTime: formState.formData[`${ptr11kvPrefix}_load_max_time`] || '',
            minLoad: parseFloat(formState.formData[`${ptr11kvPrefix}_load_min`]) || 0,
            minLoadTime: formState.formData[`${ptr11kvPrefix}_load_min_time`] || ''
        };
    }
    
    console.log('🔌 Collected PTR Data:', ptrData);
    
    // Collect Station Transformer data
    const stationTransformerData = {
        maxVoltage: parseFloat(formState.formData['stationTransformer_voltage_max']) || 0,
        maxVoltageTime: formState.formData['stationTransformer_voltage_max_time'] || '',
        minVoltage: parseFloat(formState.formData['stationTransformer_voltage_min']) || 0,
        minVoltageTime: formState.formData['stationTransformer_voltage_min_time'] || '',
        maxLoad: parseFloat(formState.formData['stationTransformer_load_max']) || 0,
        maxLoadTime: formState.formData['stationTransformer_load_max_time'] || '',
        minLoad: parseFloat(formState.formData['stationTransformer_load_min']) || 0,
        minLoadTime: formState.formData['stationTransformer_load_min_time'] || ''
    };
    
    // Collect Charger data
    const chargerData = {
        maxVoltage: parseFloat(formState.formData['charger_voltage_max']) || 0,
        maxVoltageTime: formState.formData['charger_voltage_max_time'] || '',
        minVoltage: parseFloat(formState.formData['charger_voltage_min']) || 0,
        minVoltageTime: formState.formData['charger_voltage_min_time'] || '',
        maxLoad: parseFloat(formState.formData['charger_load_max']) || 0,
        maxLoadTime: formState.formData['charger_load_max_time'] || '',
        minLoad: parseFloat(formState.formData['charger_load_min']) || 0,
        minLoadTime: formState.formData['charger_load_min_time'] || ''
    };
    
    // Prepare data for Firestore - START WITH CLEAN OBJECT
    const submissionData = {
        // Basic info
        pssStation: formState.formData.pssStation,
        personnelName: formState.formData.personnelName,
        date: formState.formData.date,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        phoneNumber: appState.user.phoneNumber,
        submittedBy: appState.user.name,
        
        // I/C Data
        ic1: ic1Data,
        ic2: ic2Data,
        
        // PTR Data (spread dynamic PTR objects)
        ...ptrData,
        
        // Feeders
        feeders: feedersData,
        
        // Equipment
        stationTransformer: stationTransformerData,
        charger: chargerData
    };
    
    console.log('📤 Final Submission Data:', submissionData);
    
    try {
        if (formState.isEditing && formState.editingId) {
            // Update existing submission
            await db.collection('daily_entries').doc(formState.editingId).update(submissionData);
            alert('✅ Data updated successfully!');
        } else {
            // Create new submission
            await db.collection('daily_entries').add(submissionData);
            alert('✅ Data submitted successfully!');
        }
        
        // Clear draft
        const draftKey = `draft_${appState.user.phoneNumber}_${formState.formData.date}`;
        localStorage.removeItem(draftKey);
        
        // Close form
        closeDataEntryForm();
        
        // Refresh user dashboard
        if (window.loadMySubmissions) {
            await loadMySubmissions();
            if (window.renderDashboard) {
                renderDashboard();
            }
        }
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('❌ Failed to submit data. Please try again.');
    }
}

// ============================================
// CLOSE FORM
// ============================================

function closeDataEntryForm() {
    const modal = document.getElementById('data-entry-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Clear auto-save interval
    if (formState.autoSaveInterval) {
        clearInterval(formState.autoSaveInterval);
    }
    
    // Reset form state
    formState.currentStep = 1;
    formState.formData = {};
    formState.isEditing = false;
    formState.editingId = null;
}

// Export functions
window.openDataEntryForm = openDataEntryForm;
window.closeDataEntryForm = closeDataEntryForm;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.goToStep = goToStep;
window.submitForm = submitForm;
window.saveDraft = saveDraft;
