// ========================================
// AI CHATBOT ASSISTANT - OpenRouter Integration
// Provides intelligent insights about PSS loading data
// ========================================

let chatHistory = [];
let pssDataContext = [];
let pssDataLastUpdated = null;
let pssIndexCache = null;
let pssNamesSortedCache = [];
let chatbotInitialized = false; // Guard against double init
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Default API keys (you can change these in the UI)
// IMPORTANT: Never commit real API keys to Git! Use environment variables instead.
const DEFAULT_OPENROUTER_KEY = ''; // Add your OpenRouter API key here
const DEFAULT_GROQ_KEY = ''; // Add your Groq API key here

// Dynamic model management
let availableModels = []; // [{ id, provider, name }]
let currentProvider = 'groq'; // 'groq' | 'openrouter'

// ============================================
// DYNAMIC MODEL FETCHING
// ============================================

async function fetchGroqModels(apiKey) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }
        const data = await response.json();
        return (data.data || []).map(m => ({
            id: `groq/${m.id}`,
            provider: 'groq',
            name: m.id
        }));
    } catch (error) {
        console.warn('Failed to fetch Groq models:', error.message);
        return [];
    }
}

async function fetchOpenRouterModels(apiKey) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }
        const data = await response.json();
        return (data.data || []).map(m => ({
            id: m.id,
            provider: 'openrouter',
            name: m.id
        }));
    } catch (error) {
        console.warn('Failed to fetch OpenRouter models:', error.message);
        return [];
    }
}

async function fetchAvailableModels(apiKey, provider) {
    if (provider === 'groq') {
        return await fetchGroqModels(apiKey);
    } else {
        return await fetchOpenRouterModels(apiKey);
    }
}

function populateModelDropdown(models, provider) {
    const select = document.getElementById('aiModelSelect');
    if (!select) return;
    
    // Clear existing options but keep structure
    select.innerHTML = '';
    
    if (models.length === 0) {
        // Fallback to hardcoded defaults
        const defaults = provider === 'groq'
            ? ['groq/llama-3.3-70b-versatile', 'groq/llama-3.1-8b-instant', 'groq/qwen/qwen3-32b']
            : ['deepseek/deepseek-v3.1:free', 'nvidia/nemotron-nano-9b-v2:free', 'qwen/qwen-2-7b-instruct:free'];
        defaults.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id.replace(/.*\//, '');
            select.appendChild(opt);
        });
        return;
    }
    
    // Add fetched models
    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name}` + (m.provider === 'groq' ? ' ⚡' : ' 🆓');
        select.appendChild(opt);
    });
    
    // Select the first available model or keep current if it matches
    const currentModel = localStorage.getItem('aiModel');
    if (currentModel && models.some(m => m.id === currentModel)) {
        select.value = currentModel;
    } else {
        select.value = models[0].id;
        localStorage.setItem('aiModel', models[0].id);
    }
}

// ============================================
// SETTINGS TAB BUTTON SETUP (runs independently of AI tab)
// ============================================

function setupSettingsButtons() {
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const testChatBtn = document.getElementById('testChatBtn');
    const refreshModelsBtn = document.getElementById('refreshModelsBtn');

    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
    }
    if (testChatBtn) {
        testChatBtn.addEventListener('click', testChatbot);
    }
    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener('click', async () => {
            const groqKey = document.getElementById('groqApiKey')?.value.trim() || '';
            const apiKey = document.getElementById('openrouterApiKey')?.value.trim() || '';
            const keyToUse = groqKey || apiKey;
            const provider = groqKey ? 'groq' : 'openrouter';

            if (!keyToUse) {
                alert('Please enter an API key first.');
                return;
            }

            refreshModelsBtn.innerHTML = '⏳ Fetching...';
            refreshModelsBtn.disabled = true;

            try {
                const models = await fetchAvailableModels(keyToUse, provider);
                currentProvider = provider;
                availableModels = models;
                populateModelDropdown(models, provider);

                const statusEl = document.getElementById('modelStatus');
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.textContent = `📋 ${models.length} models loaded from ${provider}`;
                    statusEl.style.background = models.length > 0
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(239,68,68,0.15)';
                    statusEl.style.color = models.length > 0
                        ? '#34d399'
                        : '#f87171';
                }

                refreshModelsBtn.innerHTML = models.length > 0 ? '✅ Refreshed' : '❌ No Models';
                refreshModelsBtn.style.background = models.length > 0
                    ? 'rgba(16,185,129,0.3)'
                    : 'rgba(239,68,68,0.3)';

                setTimeout(() => {
                    refreshModelsBtn.innerHTML = '🔄 Refresh Models';
                    refreshModelsBtn.style.background = 'rgba(16,185,129,0.2)';
                    refreshModelsBtn.disabled = false;
                }, 2000);

            } catch (err) {
                console.warn('Model fetch failed:', err.message);
                const statusEl = document.getElementById('modelStatus');
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.textContent = `❌ Fetch failed: ${err.message}`;
                    statusEl.style.background = 'rgba(239,68,68,0.15)';
                    statusEl.style.color = '#f87171';
                }
                refreshModelsBtn.innerHTML = '❌ Failed';
                refreshModelsBtn.style.background = 'rgba(239,68,68,0.3)';
                setTimeout(() => {
                    refreshModelsBtn.innerHTML = '🔄 Refresh Models';
                    refreshModelsBtn.style.background = 'rgba(16,185,129,0.2)';
                    refreshModelsBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // Load saved values into inputs on settings tab load
    const savedGroq = localStorage.getItem('groqApiKey');
    const savedOpenRouter = localStorage.getItem('openrouterApiKey');
    const savedCustom = localStorage.getItem('customModel');
    if (savedGroq) {
        const el = document.getElementById('groqApiKey');
        if (el) el.value = savedGroq;
    }
    if (savedOpenRouter) {
        const el = document.getElementById('openrouterApiKey');
        if (el) el.value = savedOpenRouter;
    }
    if (savedCustom) {
        const el = document.getElementById('customModelInput');
        if (el) el.value = savedCustom;
    }
}

// Run settings button setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSettingsButtons);
} else {
    setupSettingsButtons();
}

// ============================================
// INITIALIZATION
// ============================================

function initializeChatbot() {
    if (chatbotInitialized) {
        console.log('🤖 Chatbot already initialized, skipping...');
        return;
    }
    console.log('🤖 Initializing AI Chatbot Assistant...');
    
    try {
        // Load saved API key or use default (settings tab elements)
        const openrouterKeyInput = document.getElementById('openrouterApiKey');
        const groqKeyInput = document.getElementById('groqApiKey');
        const modelSelect = document.getElementById('aiModelSelect');
        
        const savedApiKey = localStorage.getItem('openrouterApiKey');
        if (openrouterKeyInput) {
            openrouterKeyInput.value = savedApiKey || DEFAULT_OPENROUTER_KEY;
            if (!savedApiKey) localStorage.setItem('openrouterApiKey', DEFAULT_OPENROUTER_KEY);
        }
        
        // Load saved Groq key or use default
        const savedGroqKey = localStorage.getItem('groqApiKey');
        if (groqKeyInput) {
            groqKeyInput.value = savedGroqKey || DEFAULT_GROQ_KEY;
            if (!savedGroqKey) localStorage.setItem('groqApiKey', DEFAULT_GROQ_KEY);
        }
        
        // Load saved model preference or set default to Groq
        const savedModel = localStorage.getItem('aiModel');
        const savedCustomModel = localStorage.getItem('customModel');
        if (modelSelect) {
            modelSelect.value = savedModel || 'groq/llama-3.3-70b-versatile';
            if (!savedModel) localStorage.setItem('aiModel', 'groq/llama-3.3-70b-versatile');
        }
        
        // Load saved custom model input
        const customModelInput = document.getElementById('customModelInput');
        if (customModelInput && savedCustomModel) {
            customModelInput.value = savedCustomModel;
        }
        
        // Load chat history from session (limit to last 20 messages to avoid quota issues)
        try {
            const savedHistory = sessionStorage.getItem('chatHistory');
            if (savedHistory) {
                chatHistory = JSON.parse(savedHistory);
                // Limit history to last 20 messages
                if (chatHistory.length > 20) {
                    chatHistory = chatHistory.slice(-20);
                    safeSaveHistory();
                }
                renderChatHistory();
            }
        } catch (e) {
            console.warn('⚠️ Clearing corrupted chat history:', e.message);
            sessionStorage.removeItem('chatHistory');
            chatHistory = [];
        }
        
        // Event Listeners - with null checks
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        const sendChatBtn = document.getElementById('sendChatBtn');
        const clearChatBtn = document.getElementById('clearChatBtn');
        const testChatBtn = document.getElementById('testChatBtn');
        const chatInput = document.getElementById('chatInput');
        
        if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
        if (sendChatBtn) sendChatBtn.addEventListener('click', sendMessage);
        if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);
        if (testChatBtn) testChatBtn.addEventListener('click', testChatbot);
        
        // Refresh models button
        const refreshModelsBtn = document.getElementById('refreshModelsBtn');
        if (refreshModelsBtn) {
            refreshModelsBtn.addEventListener('click', async () => {
                const groqKey = document.getElementById('groqApiKey')?.value.trim() || '';
                const apiKey = document.getElementById('openrouterApiKey')?.value.trim() || '';
                const keyToUse = groqKey || apiKey;
                const provider = groqKey ? 'groq' : 'openrouter';
                
                if (!keyToUse) {
                    alert('Please enter an API key first.');
                    return;
                }
                
                refreshModelsBtn.innerHTML = '⏳ Fetching...';
                refreshModelsBtn.disabled = true;
                
                try {
                    const models = await fetchAvailableModels(keyToUse, provider);
                    currentProvider = provider;
                    availableModels = models;
                    populateModelDropdown(models, provider);
                    
                    const statusEl = document.getElementById('modelStatus');
                    if (statusEl) {
                        statusEl.style.display = 'block';
                        statusEl.textContent = `📋 ${models.length} models loaded from ${provider}`;
                        statusEl.style.background = models.length > 0 
                            ? 'rgba(16,185,129,0.15)' 
                            : 'rgba(239,68,68,0.15)';
                        statusEl.style.color = models.length > 0 
                            ? '#34d399' 
                            : '#f87171';
                    }
                    
                    refreshModelsBtn.innerHTML = models.length > 0 ? '✅ Refreshed' : '❌ No Models';
                    refreshModelsBtn.style.background = models.length > 0 
                        ? 'rgba(16,185,129,0.3)' 
                        : 'rgba(239,68,68,0.3)';
                    
                    setTimeout(() => {
                        refreshModelsBtn.innerHTML = '🔄 Refresh Models';
                        refreshModelsBtn.style.background = 'rgba(16,185,129,0.2)';
                        refreshModelsBtn.disabled = false;
                    }, 2000);
                    
                } catch (err) {
                    console.warn('Model fetch failed:', err.message);
                    const statusEl = document.getElementById('modelStatus');
                    if (statusEl) {
                        statusEl.style.display = 'block';
                        statusEl.textContent = `❌ Fetch failed: ${err.message}`;
                        statusEl.style.background = 'rgba(239,68,68,0.15)';
                        statusEl.style.color = '#f87171';
                    }
                    refreshModelsBtn.innerHTML = '❌ Failed';
                    refreshModelsBtn.style.background = 'rgba(239,68,68,0.3)';
                    setTimeout(() => {
                        refreshModelsBtn.innerHTML = '🔄 Refresh Models';
                        refreshModelsBtn.style.background = 'rgba(16,185,129,0.2)';
                        refreshModelsBtn.disabled = false;
                    }, 2000);
                }
            });
        }
        
        // Chat input enter key
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // Auto-resize textarea
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
            });
        }
        
        // Quick suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.getAttribute('data-query');
                const input = document.getElementById('chatInput');
                if (input) input.value = query;
                sendMessage();
            });
        });
        
        chatbotInitialized = true;
        console.log('✅ Chatbot initialized - Send:', !!sendChatBtn, 'Input:', !!chatInput);
    } catch (error) {
        console.error('❌ Chatbot initialization error:', error);
    }
}

// ============================================
// DATA CONTEXT PREPARATION
// ============================================

function updateDataContext(allData) {
    if (!Array.isArray(allData)) {
        pssDataContext = [];
        pssDataLastUpdated = null;
        console.warn('⚠️ Chatbot context update received invalid data');
        return;
    }
    // Always keep a fresh, timestamp-sorted copy (latest first)
    pssDataContext = [...allData].sort((a, b) => {
        const timeA = a?.timestamp?.toDate?.() || new Date(a?.timestamp || 0);
        const timeB = b?.timestamp?.toDate?.() || new Date(b?.timestamp || 0);
        return timeB - timeA;
    });
    pssDataLastUpdated = new Date();
    // Build cached PSS index for fast lookups
    const pssIndex = {};
    pssDataContext.forEach(record => {
        const name = record.pssStation || 'Unknown';
        if (!pssIndex[name]) {
            pssIndex[name] = { count: 0, dates: new Set(), latestDate: null };
        }
        pssIndex[name].count += 1;
        if (record.date) {
            pssIndex[name].dates.add(record.date);
            if (!pssIndex[name].latestDate || record.date > pssIndex[name].latestDate) {
                pssIndex[name].latestDate = record.date;
            }
        }
    });
    pssIndexCache = pssIndex;
    pssNamesSortedCache = Object.keys(pssIndexCache).filter(Boolean).sort();
    console.log('📊 Chatbot context updated with', pssDataContext.length, 'records');
}

function prepareDataSummary(userMessage = '') {
    if (!pssDataContext || pssDataContext.length === 0) {
        return "❌ No data available in the system. Ask the admin to load data first.";
    }
    
    // Get today's date
    const today = typeof todayLocalISO === 'function' ? todayLocalISO() : new Date().toISOString().slice(0, 10);
    
    // Parse user message to find requested PSS stations and dates
    const messageUpper = String(userMessage || '').toUpperCase();
    const dateMatch = messageUpper.match(/(\d{4}-\d{2}-\d{2})/);
    const requestedDate = dateMatch ? dateMatch[1] : null;
    const pssIndex = pssIndexCache || {};
    const pssNamesSorted = pssNamesSortedCache || [];
    const requestedPSS = pssNamesSorted.filter(name => messageUpper.includes(String(name).toUpperCase()));
    const wantsDates = /\b(date|dates|when|submitted|submit)\b/i.test(userMessage);
    const wantsDetails = /\b(detail|data|voltage|load|feeder|staff|record|show|get|what|tell|give)\b/i.test(userMessage);
    
    // SMART RECORD SELECTION: If user asks about specific PSS, include ALL records for that PSS
    let recordsToShow = [];
    let selectionMode = 'latest';
    
    if (requestedPSS.length > 0) {
        // Get ALL records for the requested PSS stations
        const pssRecords = pssDataContext.filter(record => {
            const pssName = (record.pssStation || '').toUpperCase();
            return requestedPSS.some(rp => rp.toUpperCase() === pssName);
        });
        
        // If specific date requested, filter further
        if (requestedDate) {
            const dateFiltered = pssRecords.filter(r => r.date === requestedDate);
            recordsToShow = dateFiltered.length > 0 ? dateFiltered : pssRecords.slice(0, 10);
            selectionMode = dateFiltered.length > 0 ? 'pss+date' : 'pss-all';
        } else {
            recordsToShow = pssRecords.slice(0, 15); // Limit to 15 per PSS
            selectionMode = 'pss-all';
        }
    } else if (requestedDate) {
        // Date only - get all records for that date
        recordsToShow = pssDataContext.filter(r => r.date === requestedDate).slice(0, 20);
        selectionMode = 'date';
    } else {
        // Default: latest 20 records
        recordsToShow = pssDataContext.slice(0, 20);
        selectionMode = 'latest';
    }
    
    // Build comprehensive data string
    let dataText = `
╔══════════════════════════════════════════════════════════════╗
║                   PSS DATABASE - SMART QUERY                  ║
╚══════════════════════════════════════════════════════════════╝

📊 TOTAL RECORDS IN DATABASE: ${pssDataContext.length}
🎯 SELECTION MODE: ${selectionMode.toUpperCase()}
📋 RECORDS INCLUDED: ${recordsToShow.length}
🕒 CONTEXT LAST UPDATED: ${pssDataLastUpdated ? pssDataLastUpdated.toLocaleString() : 'Unknown'}
`;

    // Add PSS-specific summary if PSS was requested
    if (requestedPSS.length > 0) {
        dataText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 REQUESTED PSS: ${requestedPSS.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        requestedPSS.forEach(pssName => {
            const stats = pssIndex[pssName];
            if (stats) {
                const allDates = Array.from(stats.dates || []).sort().reverse();
                dataText += `
📍 ${pssName}:
   • Total Records: ${stats.count}
   • Latest Date: ${stats.latestDate || 'N/A'}
   • All Dates: ${allDates.join(', ')}`;
            }
        });
        dataText += `\n`;
    }

    // Build PSS index from FULL dataset
    const pssIndexText = pssNamesSorted.map(name => {
        const stats = pssIndex[name];
        return `• ${name} | Records: ${stats.count} | Latest: ${stats.latestDate || 'N/A'}`;
    }).join('\n');

    dataText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 ALL PSS STATIONS INDEX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pssIndexText || 'No PSS stations found'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Add FULL DETAILED RECORDS for the selected records
    dataText += `
╔══════════════════════════════════════════════════════════════╗
║                    DETAILED RECORD DATA                       ║
╚══════════════════════════════════════════════════════════════╝
`;

    recordsToShow.forEach((record, index) => {
        dataText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECORD #${index + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 PSS STATION: ${record.pssStation || 'Unknown'}
📅 DATE: ${record.date || 'N/A'}
👤 STAFF: ${record.staffName || 'N/A'} | 📞 ${record.phoneNumber || record.phone || 'N/A'}
⏰ PEAK TIME: ${record.peakTime || 'N/A'}
🔋 PEAK VOLTAGE: ${record.peakVoltage || 'N/A'} kV
📈 TOTAL MAX LOAD: ${record.totalMaxLoad || 'N/A'} A
📉 TOTAL MIN LOAD: ${record.totalMinLoad || 'N/A'} A

`;

        // === INCOMING CIRCUITS 33KV - FIXED FIELD NAMES ===
        if (record.ic1 || record.ic2) {
            dataText += `🔵 INCOMING CIRCUITS 33KV:\n`;
            if (record.ic1) {
                dataText += `  ▶️ I/C-1 (GSS) 33KV:\n`;
                dataText += `     Max Voltage: ${record.ic1.maxVoltage || 'N/A'} kV @ ${record.ic1.maxVoltageTime || 'N/A'}\n`;
                dataText += `     Min Voltage: ${record.ic1.minVoltage || 'N/A'} kV @ ${record.ic1.minVoltageTime || 'N/A'}\n`;
                dataText += `     Max Load: ${record.ic1.maxLoad || record.ic1.maxCurrent || 'N/A'} A @ ${record.ic1.maxLoadTime || record.ic1.maxCurrentTime || 'N/A'}\n`;
                dataText += `     Min Load: ${record.ic1.minLoad || record.ic1.minCurrent || 'N/A'} A @ ${record.ic1.minLoadTime || record.ic1.minCurrentTime || 'N/A'}\n`;
            }
            if (record.ic2) {
                dataText += `  ▶️ I/C-2 (GSS) 33KV:\n`;
                dataText += `     Max Voltage: ${record.ic2.maxVoltage || 'N/A'} kV @ ${record.ic2.maxVoltageTime || 'N/A'}\n`;
                dataText += `     Min Voltage: ${record.ic2.minVoltage || 'N/A'} kV @ ${record.ic2.minVoltageTime || 'N/A'}\n`;
                dataText += `     Max Load: ${record.ic2.maxLoad || record.ic2.maxCurrent || 'N/A'} A @ ${record.ic2.maxLoadTime || record.ic2.maxCurrentTime || 'N/A'}\n`;
                dataText += `     Min Load: ${record.ic2.minLoad || record.ic2.minCurrent || 'N/A'} A @ ${record.ic2.minLoadTime || record.ic2.minCurrentTime || 'N/A'}\n`;
            }
            dataText += `\n`;
        }

        // === POWER TRANSFORMERS 33KV - FIXED FIELD NAMES ===
        if (record.ptr1_33kv || record.ptr2_33kv) {
            dataText += `🟡 POWER TRANSFORMERS 33KV:\n`;
            if (record.ptr1_33kv) {
                dataText += `  ▶️ PTR-1 33KV:\n`;
                dataText += `     Max Voltage: ${record.ptr1_33kv.maxVoltage || 'N/A'} kV @ ${record.ptr1_33kv.maxVoltageTime || 'N/A'}\n`;
                dataText += `     Min Voltage: ${record.ptr1_33kv.minVoltage || 'N/A'} kV @ ${record.ptr1_33kv.minVoltageTime || 'N/A'}\n`;
                dataText += `     Max Load: ${record.ptr1_33kv.maxLoad || record.ptr1_33kv.maxCurrent || 'N/A'} A @ ${record.ptr1_33kv.maxLoadTime || record.ptr1_33kv.maxCurrentTime || 'N/A'}\n`;
                dataText += `     Min Load: ${record.ptr1_33kv.minLoad || record.ptr1_33kv.minCurrent || 'N/A'} A @ ${record.ptr1_33kv.minLoadTime || record.ptr1_33kv.minCurrentTime || 'N/A'}\n`;
            }
            if (record.ptr2_33kv) {
                dataText += `  ▶️ PTR-2 33KV:\n`;
                dataText += `     Max Voltage: ${record.ptr2_33kv.maxVoltage || 'N/A'} kV @ ${record.ptr2_33kv.maxVoltageTime || 'N/A'}\n`;
                dataText += `     Min Voltage: ${record.ptr2_33kv.minVoltage || 'N/A'} kV @ ${record.ptr2_33kv.minVoltageTime || 'N/A'}\n`;
                dataText += `     Max Load: ${record.ptr2_33kv.maxLoad || record.ptr2_33kv.maxCurrent || 'N/A'} A @ ${record.ptr2_33kv.maxLoadTime || 'N/A'}\n`;
                dataText += `     Min Load: ${record.ptr2_33kv.minLoad || record.ptr2_33kv.minCurrent || 'N/A'} A @ ${record.ptr2_33kv.minLoadTime || record.ptr2_33kv.minCurrentTime || 'N/A'}\n`;
            }
            dataText += `\n`;
        }

        // === POWER TRANSFORMERS 11KV - FIXED FIELD NAMES ===
        if (record.ptr1_11kv || record.ptr2_11kv) {
            dataText += `🟢 POWER TRANSFORMERS 11KV:\n`;
            if (record.ptr1_11kv) {
                dataText += `  ▶️ PTR-1 11KV:\n`;
                dataText += `     Max Voltage: ${record.ptr1_11kv.maxVoltage || 'N/A'} kV @ ${record.ptr1_11kv.maxVoltageTime || 'N/A'}\n`;
                dataText += `     Min Voltage: ${record.ptr1_11kv.minVoltage || 'N/A'} kV @ ${record.ptr1_11kv.minVoltageTime || 'N/A'}\n`;
                dataText += `     Max Load: ${record.ptr1_11kv.maxLoad || record.ptr1_11kv.maxCurrent || 'N/A'} A @ ${record.ptr1_11kv.maxLoadTime || record.ptr1_11kv.maxCurrentTime || 'N/A'}\n`;
                dataText += `     Min Load: ${record.ptr1_11kv.minLoad || record.ptr1_11kv.minCurrent || 'N/A'} A @ ${record.ptr1_11kv.minLoadTime || record.ptr1_11kv.minCurrentTime || 'N/A'}\n`;
            }
            if (record.ptr2_11kv) {
                dataText += `  ▶️ PTR-2 11KV:\n`;
                dataText += `     Max Voltage: ${record.ptr2_11kv.maxVoltage || 'N/A'} kV @ ${record.ptr2_11kv.maxVoltageTime || 'N/A'}\n`;
                dataText += `     Min Voltage: ${record.ptr2_11kv.minVoltage || 'N/A'} kV @ ${record.ptr2_11kv.minVoltageTime || 'N/A'}\n`;
                dataText += `     Max Load: ${record.ptr2_11kv.maxLoad || record.ptr2_11kv.maxCurrent || 'N/A'} A @ ${record.ptr2_11kv.maxLoadTime || 'N/A'}\n`;
                dataText += `     Min Load: ${record.ptr2_11kv.minLoad || record.ptr2_11kv.minCurrent || 'N/A'} A @ ${record.ptr2_11kv.minLoadTime || record.ptr2_11kv.minCurrentTime || 'N/A'}\n`;
            }
            dataText += `\n`;
        }

        // === FEEDERS 11KV ===
        if (record.feeders) {
            dataText += `⚡ FEEDERS 11KV:\n`;
            Object.entries(record.feeders).forEach(([feederKey, feederData]) => {
                if (feederData && typeof feederData === 'object') {
                    const feederName = feederData.feederName || feederKey;
                    const ptrNo = feederData.ptrNo || 'N/A';
                    dataText += `  ▶️ ${feederName} (PTR: ${ptrNo}):\n`;
                    dataText += `     Max Voltage: ${feederData.maxVoltage || 'N/A'} kV @ ${feederData.maxVoltageTime || 'N/A'}\n`;
                    dataText += `     Min Voltage: ${feederData.minVoltage || 'N/A'} kV @ ${feederData.minVoltageTime || 'N/A'}\n`;
                    dataText += `     Max Load: ${feederData.maxLoad || feederData.maxCurrent || 'N/A'} A @ ${feederData.maxLoadTime || feederData.maxCurrentTime || 'N/A'}\n`;
                    dataText += `     Min Load: ${feederData.minLoad || feederData.minCurrent || 'N/A'} A @ ${feederData.minLoadTime || feederData.minCurrentTime || 'N/A'}\n`;
                    if (feederData.powerFactor) {
                        dataText += `     Power Factor: ${feederData.powerFactor}\n`;
                    }
                    if (feederData.remarks && feederData.remarks !== '-') {
                        dataText += `     Remarks: ${feederData.remarks}\n`;
                    }
                }
            });
            dataText += `\n`;
        }

        // === STATION EQUIPMENT ===
        if (record.stationTransformer) {
            dataText += `🏭 STATION TRANSFORMER:\n`;
            const st = record.stationTransformer;
            if (st && typeof st === 'object') {
                dataText += `  Max Voltage: ${st.maxVoltage || 'N/A'} kV @ ${st.maxVoltageTime || 'N/A'}\n`;
                dataText += `  Min Voltage: ${st.minVoltage || 'N/A'} kV @ ${st.minVoltageTime || 'N/A'}\n`;
                dataText += `  Max Current: ${st.maxCurrent || 'N/A'} A @ ${st.maxCurrentTime || 'N/A'}\n`;
                dataText += `  Min Current: ${st.minCurrent || 'N/A'} A @ ${st.minCurrentTime || 'N/A'}\n\n`;
            }
        }

        if (record.charger) {
            dataText += `🔌 CHARGER 48/24V:\n`;
            const ch = record.charger;
            if (ch && typeof ch === 'object') {
                dataText += `  PTR: ${ch.ptr || 'N/A'}\n`;
                dataText += `  Max Voltage: ${ch.maxVoltage || 'N/A'} V @ ${ch.maxVoltageTime || 'N/A'}\n`;
                dataText += `  Min Voltage: ${ch.minVoltage || 'N/A'} V @ ${ch.minVoltageTime || 'N/A'}\n`;
                dataText += `  Max Current: ${ch.maxCurrent || 'N/A'} A @ ${ch.maxCurrentTime || 'N/A'}\n`;
                dataText += `  Min Current: ${ch.minCurrent || 'N/A'} A @ ${ch.minCurrentTime || 'N/A'}\n\n`;
            }
        }

        // TOTALS
        if (record.totalMaxLoad || record.totalMinLoad) {
            dataText += `📊 TOTALS:\n`;
            dataText += `  Total Max Load: ${record.totalMaxLoad || 'N/A'} A\n`;
            dataText += `  Total Min Load: ${record.totalMinLoad || 'N/A'} A\n\n`;
        }
    });

    // Add summary statistics
    const uniquePSS = [...new Set(pssDataContext.map(d => d.pssStation))].filter(Boolean);
    const todayRecords = pssDataContext.filter(d => d.date === today);
    
    dataText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 QUICK STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏭 PSS Stations: ${uniquePSS.join(', ') || 'N/A'}
📅 Today's Submissions: ${todayRecords.length} records
📝 Total Database Records: ${pssDataContext.length}
🧩 DATA SHAPE (per record): pssStation, date, staffName, phoneNumber, peakTime, peakVoltage,
   ic1/ic2, ptr*_33kv/ptr*_11kv, feeders{}, stationTransformer{}, charger{}, totals
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return dataText;
}

// ============================================
// API KEY MANAGEMENT
// ============================================

async function saveApiKey() {
    const btn = document.getElementById('saveApiKeyBtn');
    const originalText = btn.innerHTML;
    const originalBg = btn.style.background;
    
    try {
        // Disable button to prevent double clicks
        btn.disabled = true;
        btn.innerHTML = '⏳ Saving...';
        
        const apiKey = document.getElementById('openrouterApiKey').value.trim();
        const groqKey = document.getElementById('groqApiKey').value.trim();
        const model = document.getElementById('aiModelSelect').value;
        const customModel = document.getElementById('customModelInput')?.value.trim() || '';
        
        if (!apiKey && !groqKey) {
            btn.innerHTML = '❌ No API Key';
            btn.style.background = 'rgba(239, 68, 68, 0.3)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = originalBg;
                btn.disabled = false;
            }, 2000);
            return;
        }
        
        // Save to localStorage
        if (apiKey) localStorage.setItem('openrouterApiKey', apiKey);
        if (groqKey) localStorage.setItem('groqApiKey', groqKey);
        localStorage.setItem('aiModel', model);
        if (customModel) localStorage.setItem('customModel', customModel);
        else localStorage.removeItem('customModel');
        
        // Fetch available models dynamically
        const keyToUse = groqKey || apiKey;
        const provider = groqKey ? 'groq' : 'openrouter';
        let modelsLoaded = 0;
        if (keyToUse) {
            try {
                btn.innerHTML = '⏳ Fetching models...';
                const models = await fetchAvailableModels(keyToUse, provider);
                currentProvider = provider;
                availableModels = models;
                modelsLoaded = models.length;
                if (models.length > 0) {
                    populateModelDropdown(models, provider);
                    console.log(`✅ Loaded ${models.length} models from ${provider}`);
                } else {
                    console.warn('Model fetch returned empty, keeping defaults');
                }
            } catch (err) {
                console.warn('Model fetch failed, keeping defaults:', err.message);
            }
        }
        
        // Show success with model count
        const modelMsg = modelsLoaded > 0 
            ? ` ✅ Saved! ${modelsLoaded} models loaded from ${provider}.`
            : ` ✅ Saved! (Model list fetch blocked by browser CORS - use Custom Model field above)`;
        btn.innerHTML = modelMsg;
        btn.style.background = 'rgba(16, 185, 129, 0.3)';
        
        console.log('✅ Configuration saved:', { model, hasGroq: !!groqKey, hasOpenRouter: !!apiKey, modelsLoaded: availableModels.length });
        
        // Reset button after 2 seconds
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = originalBg;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('❌ Save failed:', error);
        btn.innerHTML = '❌ Save Failed';
        btn.style.background = 'rgba(239, 68, 68, 0.3)';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = originalBg;
            btn.disabled = false;
        }, 2000);
    }
}

// ============================================
// CHAT MESSAGE HANDLING
// ============================================

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Check API keys
    const customModel = localStorage.getItem('customModel') || '';
    const selectedModel = customModel || (localStorage.getItem('aiModel') || 'groq/llama-3.3-70b-versatile');
    const isGroq = selectedModel.startsWith('groq/');
    const apiKey = isGroq ? localStorage.getItem('groqApiKey') : localStorage.getItem('openrouterApiKey');

    const quickAnswer = typeof answerCommonQuery === 'function' ? answerCommonQuery(message) : null;
    if (quickAnswer) {
        addUserMessage(message);
        input.value = '';
        input.style.height = 'auto';
        addBotMessage(quickAnswer);
        return;
    }
    
    if (!apiKey) {
        addBotMessage('No AI API key is configured. Open Settings and add a Groq or OpenRouter key, or ask a simple question such as "today submissions" or "highest load" which works without AI.');
        return;
    }
    
    // Add user message to chat
    addUserMessage(message);
    input.value = '';
    input.style.height = 'auto';
    
    // Build ordered model list: selected model first, then available models as fallback
    const modelOrder = [];
    if (selectedModel) modelOrder.push(selectedModel);
    availableModels.forEach(m => {
        if (m.id !== selectedModel) modelOrder.push(m.id);
    });
    // Add hardcoded defaults as last resort
    const hardcodedFallbacks = isGroq
        ? ['groq/llama-3.3-70b-versatile', 'groq/llama-3.1-8b-instant', 'groq/qwen/qwen3-32b']
        : ['deepseek/deepseek-v3.1:free', 'nvidia/nemotron-nano-9b-v2:free', 'qwen/qwen-2-7b-instruct:free'];
    hardcodedFallbacks.forEach(id => {
        if (!modelOrder.includes(id)) modelOrder.push(id);
    });

    // Show typing indicator
    showTypingIndicator('🔍 Reading your question...');
    
    // Simulate thinking process
    setTimeout(() => updateTypingStatus('📊 Accessing PSS database...'), 500);
    setTimeout(() => updateTypingStatus('🤔 Processing data patterns...'), 1000);
    setTimeout(() => updateTypingStatus('💭 Formulating response...'), 1500);

    // Yield to UI before heavy processing
    await new Promise(requestAnimationFrame);
    
    // Prepare data context
    const dataSummary = prepareDataSummary(message);
    
    // Try models in order with failover
    let lastError = null;
    let success = false;
    
    for (let i = 0; i < modelOrder.length; i++) {
        const tryModel = modelOrder[i];
        const tryIsGroq = tryModel.startsWith('groq/');
        const tryApiKey = tryIsGroq ? localStorage.getItem('groqApiKey') : localStorage.getItem('openrouterApiKey');
        
        if (!tryApiKey) continue;
        
        updateTypingStatus(`🚀 Consulting AI model (${i + 1}/${modelOrder.length}): ${tryModel.replace(/.*\//, '')}...`);
        
        try {
            const response = await callAI(message, dataSummary, tryModel, tryApiKey, false);
            hideTypingIndicator();
            addBotMessage(response);
            // Save the working model as preference
            if (tryModel !== selectedModel) {
                localStorage.setItem('aiModel', tryModel);
                const select = document.getElementById('aiModelSelect');
                if (select) select.value = tryModel;
            }
            success = true;
            break;
        } catch (error) {
            lastError = error;
            console.warn(`Model ${tryModel} failed:`, error.message);
            // Show fail message for this model
            if (i < modelOrder.length - 1) {
                addBotMessage(`⚠️ Model "${tryModel.replace(/.*\//, '')}" failed: ${error.message}\n🔄 Trying next model...`);
            }
        }
    }
    
    if (!success) {
        hideTypingIndicator();
        addBotMessage(`❌ All AI models failed. Last error: ${lastError?.message || 'Unknown error'}. Please check your API key in ⚙️ Settings or try again later.`);
        console.error('Chatbot error (all models failed):', lastError);
    }
}

function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    
    const messagesContainer = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Insert message BEFORE the typing indicator (keeps typing at bottom)
    if (typingIndicator && messagesContainer.contains(typingIndicator)) {
        messagesContainer.insertBefore(messageDiv, typingIndicator);
    } else {
        messagesContainer.appendChild(messageDiv);
    }
    
    // Smooth scroll to bottom with delay to ensure DOM is updated
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Save to history (skip if called from renderChatHistory)
    if (!window._renderingHistory) {
        chatHistory.push({ role: 'user', content: text });
        safeSaveHistory();
    }
}

function addBotMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message';
    
    // Convert markdown-like formatting
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    // Handle lists
    if (formattedText.includes('- ')) {
        formattedText = formattedText.replace(/^- /gm, '• ');
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            ${formattedText}
        </div>
    `;
    
    const messagesContainer = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Insert message BEFORE the typing indicator (keeps typing at bottom)
    if (typingIndicator && messagesContainer.contains(typingIndicator)) {
        messagesContainer.insertBefore(messageDiv, typingIndicator);
    } else {
        messagesContainer.appendChild(messageDiv);
    }
    
    // Smooth scroll to bottom with delay to ensure DOM is updated
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Save to history (skip if called from renderChatHistory)
    if (!window._renderingHistory) {
        chatHistory.push({ role: 'assistant', content: text });
        safeSaveHistory();
    }
}

// Safe save to sessionStorage with quota handling
function safeSaveHistory() {
    try {
        // Limit to last 20 messages to avoid quota issues
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }
        sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (e) {
        console.warn('⚠️ Session storage quota exceeded, clearing old history');
        // Clear and try again with just last 10 messages
        chatHistory = chatHistory.slice(-10);
        try {
            sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        } catch (e2) {
            // If still fails, just clear it
            sessionStorage.removeItem('chatHistory');
        }
    }
}

function showTypingIndicator(status = '🔍 Analyzing your data...') {
    const indicator = document.getElementById('typingIndicator');
    const statusText = indicator.querySelector('.typing-status');
    if (statusText) {
        statusText.textContent = status;
    }
    indicator.style.display = 'flex';
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateTypingStatus(status) {
    const statusText = document.querySelector('.typing-status');
    if (statusText) {
        statusText.textContent = status;
    }
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'none';
}

function clearChat() {
    if (confirm('Clear all chat history?')) {
        chatHistory = [];
        sessionStorage.removeItem('chatHistory');
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="chat-message bot-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p>Chat cleared! How can I help you with your PSS data?</p>
                </div>
            </div>
        `;
        
        console.log('🗑️ Chat history cleared');
    }
}

function renderChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    // Set flag to prevent saving during render
    window._renderingHistory = true;
    
    chatHistory.forEach(msg => {
        if (msg.role === 'user') {
            addUserMessage(msg.content);
        } else if (msg.role === 'assistant') {
            addBotMessage(msg.content);
        }
    });
    
    window._renderingHistory = false;
}

// ============================================
// AI API INTEGRATION (Groq + OpenRouter)
// ============================================

async function callAI(userMessage, dataContext, model, apiKey, retryWithFallback = true) {
    const isGroq = model.startsWith('groq/');
    const apiUrl = isGroq ? GROQ_API_URL : OPENROUTER_API_URL;
    const actualModel = isGroq ? model.replace('groq/', '') : model;
    
    const systemPrompt = `You are an expert PSS (Power Sub-Station) Data Analysis AI specialized in electrical power systems.

🎯 YOUR EXPERTISE:
You analyze detailed electrical loading data from Indian Power Sub-Stations including:

📍 PSS STATIONS: ${pssNamesSortedCache.join(', ') || 'See the station index in the database context below'}

🔵 INCOMING CIRCUITS 33KV:
   - I/C-1 (GSS) 33KV - Incoming from Grid Sub-Station
   - I/C-2 (GSS) 33KV - Second incoming circuit
   - Each has: Max/Min Voltage (kV), Max/Min Current (A), timestamps

🟡 POWER TRANSFORMERS 33KV:
   - PTR-1 33KV, PTR-2 33KV
   - Step-down transformers (33kV to 11kV)
   - Data: Max/Min Voltage, Max/Min Current, timestamps

🟢 POWER TRANSFORMERS 11KV:
   - PTR-1 11KV, PTR-2 11KV
   - Distribution transformers
   - Data: Max/Min Voltage, Max/Min Current, timestamps

⚡ FEEDERS 11KV:
   - FEEDER 1, FEEDER 2, FEEDER 3, FEEDER 4, FEEDER 5, FEEDER 6
   - Each connected to specific PTR (PTR-1 or PTR-2)
   - Data: Max/Min Voltage (kV), Max/Min Load (A), timestamps, Power Factor

🏭 STATION EQUIPMENT:
   - Station Transformer (for internal use)
   - Charger 48/24V (battery backup system)
   - Each has voltage/current readings

� CURRENT DATABASE:
${dataContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 HOW TO ANSWER QUESTIONS PERFECTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ UNDERSTANDING QUESTIONS:

Q: "What is the voltage of Kundukela?"
→ Find Kundukela in records, report Peak Voltage or feeder voltages

Q: "Feeder 1 load of Sankara?"
→ Find Sankara → Look in FEEDERS section → Find "FEEDER 1" → Report Max Load

Q: "I/C-1 (GSS) 33KV data for Karamdih?"
→ Find Karamdih → Look in INCOMING CIRCUITS 33KV → Find "I/C-1" → Report all data

Q: "PTR-1 33KV current of Kundukela?"
→ Find Kundukela → Look in POWER TRANSFORMERS 33KV → Find "PTR-1" → Report Max/Min Current

Q: "Show all feeders of Sankara?"
→ Find Sankara → List ALL feeders under FEEDERS 11KV section

Q: "What is peak voltage of Karamdih on 2025-11-11?"
→ Find records with DATE: 2025-11-11 AND PSS STATION: Karamdih → Report Peak Voltage

2️⃣ DATA LOCATION GUIDE:

EQUIPMENT TYPE → WHERE TO LOOK
├─ I/C-1, I/C-2 (33KV) → "INCOMING CIRCUITS 33KV"
├─ PTR-1, PTR-2 (33KV) → "POWER TRANSFORMERS 33KV"
├─ PTR-1, PTR-2 (11KV) → "POWER TRANSFORMERS 11KV"
├─ Feeder 1-6 → "FEEDERS 11KV"
├─ Station Transformer → "STATION TRANSFORMER"
└─ Charger → "CHARGER 48/24V"

3️⃣ RESPONSE FORMAT:

GOOD EXAMPLE:
Q: "What is Feeder 1 load of Sankara on 2025-11-11?"
A: ⚡ FEEDER 1 at Sankara PSS (2025-11-11):
   • Max Load: 1,234 A (1.23 KA) @ 10:30
   • Min Load: 450 A @ 04:00
   • Max Voltage: 11.2 kV @ 10:30
   • Min Voltage: 10.8 kV @ 04:00
   • PTR: PTR-1

GOOD EXAMPLE 2:
Q: "Show I/C-1 (GSS) 33KV data for Karamdih?"
A: 🔵 I/C-1 (GSS) 33KV at Karamdih PSS:
   • Max Voltage: 456 kV @ 04:56
   • Min Voltage: 45645 kV @ 04:45
   • Max Current: 45456 A @ 04:54
   • Min Current: 455 A @ 04:45
   • Date: 2025-11-11

4️⃣ WHEN DATA IS MISSING:

If equipment not found in records:
"❌ No data found for [EQUIPMENT] at [PSS] on [DATE]. 
Available equipment: [list what's available]"

If PSS not found:
"❌ No records found for [PSS] PSS on [DATE].
Available stations: ${pssNamesSortedCache.join(', ') || 'see station index'}"

5️⃣ HANDLING MULTIPLE RECORDS:

If same PSS has multiple dates, show latest or ask:
"📊 Found 3 records for Sankara. Latest is 2025-11-11. 
Would you like specific date or latest data?"

6️⃣ UNITS & FORMATTING:

• Voltage: Always show "kV" (11 kV, 33 kV)
• Current: Show "A" and convert: 1000 A = 1 KA, 1000000 A = 1 MA
• Time: Show as HH:MM (e.g., 04:56)
• Use emojis: ⚡🔵🟡🟢🏭🔌📊⏰🔋
• Use bullet points (•) for clarity
• Show numbers with commas: 1,234 not 1234

7️⃣ CRITICAL RULES:

✅ ONLY use data from records above - NEVER make up values
- For counts, totals and comparisons, calculate from the full STATION INDEX and record list above and state the number of records used
- If the question asks for an aggregate over more records than shown, say the exact total is in the station index and answer from that summary
- Never claim data is from today unless the record DATE matches today's date
✅ If value shows "N/A" or "-", say "Data not recorded"
✅ Always specify PSS name, date, and equipment name
✅ Show timestamps when available
✅ If confused, ask clarifying questions
✅ Be technically accurate - this is critical infrastructure

8️⃣ COMMON ABBREVIATIONS:

• I/C = Incoming Circuit
• PTR = Power Transformer
• GSS = Grid Sub-Station  
• kV = Kilovolt (1000 volts)
• A = Amperes (current unit)
• KA = Kilo Amperes (1000 A)
• MA = Mega Amperes (1000000 A)
• PF = Power Factor (0-1, ideal ~0.95)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOW ANSWER THE USER'S QUESTION WITH 100% ACCURACY USING ONLY THE DATA PROVIDED ABOVE:`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6), // Keep last 6 messages for context
        { role: 'user', content: userMessage }
    ];
    
    const requestBody = {
        model: actualModel,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1500
    };
    
    console.log(`🚀 Calling ${isGroq ? 'Groq' : 'OpenRouter'} API with model:`, actualModel);
    
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    
    if (!isGroq) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'PSS Data Assistant';
    }
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const error = await response.json();
        const errorMsg = error.error?.message || `API request failed (${response.status})`;
        
        // RATE LIMIT HANDLING - Auto fallback to OpenRouter free models
        if (errorMsg.includes('Rate limit') && isGroq && retryWithFallback) {
            console.warn('⚠️ Groq rate limit reached, switching to OpenRouter free model...');
            
            // Get OpenRouter API key
            const openrouterKey = localStorage.getItem('openrouterApiKey');
            if (!openrouterKey) {
                throw new Error('Rate limit reached. Please add OpenRouter API key in Settings or wait 1 hour.');
            }
            
            // Try OpenRouter free models in order (most powerful first)
            const fallbackModels = [
                'deepseek/deepseek-v3.1:free',              // 671B MoE - MOST POWERFUL
                'nvidia/nemotron-nano-9b-v2:free',          // Reasoning expert
                'kwaipilot/kat-coder-pro-v1:free',          // Best coding
                'openrouter/polaris-alpha:free',            // General purpose
                'alibaba/tongyi-deepresearch-30b-a3b:free', // Deep analysis
                'meituan/longcat-flash-chat:free',          // 560B MoE fast
                'google/gemma-2-9b-it:free',                // Reliable fallback
                'qwen/qwen-2-7b-instruct:free',             // Fast multilingual
                'meta-llama/llama-3.2-3b-instruct:free',    // Ultra fast
                'microsoft/phi-3-mini-128k-instruct:free'   // 128K context
            ];
            
            for (const fallbackModel of fallbackModels) {
                try {
                    console.log(`🔄 Trying fallback model: ${fallbackModel}`);
                    return await callAI(userMessage, dataContext, fallbackModel, openrouterKey, false);
                } catch (fallbackError) {
                    console.warn(`❌ Fallback model ${fallbackModel} failed:`, fallbackError.message);
                    continue;
                }
            }
            
            throw new Error('All fallback models failed. Please try again later.');
        }
        
        throw new Error(errorMsg);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('✅ Received AI response');
    return aiResponse;
}

async function testChatbot() {
    const btn = document.getElementById('testChatBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Testing...';
    btn.disabled = true;
    
    showTypingIndicator('🔌 Connecting to API...');
    
    try {
        const customModel = localStorage.getItem('customModel') || '';
        const selectedModel = customModel || (localStorage.getItem('aiModel') || 'groq/llama-3.3-70b-versatile');
        const isGroq = selectedModel.startsWith('groq/');
        const apiKey = isGroq ? localStorage.getItem('groqApiKey') : localStorage.getItem('openrouterApiKey');
        
        if (!apiKey) {
            hideTypingIndicator();
            addBotMessage('⚠️ Please save your API keys first in ⚙️ Settings tab!');
            btn.innerHTML = '❌ No Key';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);
            return;
        }
        
        // Build model order for test
        const modelOrder = [selectedModel];
        availableModels.forEach(m => {
            if (m.id !== selectedModel) modelOrder.push(m.id);
        });
        const hardcodedFallbacks = isGroq
            ? ['groq/llama-3.3-70b-versatile', 'groq/llama-3.1-8b-instant']
            : ['deepseek/deepseek-v3.1:free', 'nvidia/nemotron-nano-9b-v2:free'];
        hardcodedFallbacks.forEach(id => {
            if (!modelOrder.includes(id)) modelOrder.push(id);
        });
        
        updateTypingStatus('📊 Preparing data summary...');
        const dataSummary = prepareDataSummary();
        
        const testQuery = "Give me a brief summary of the PSS data in 2-3 sentences.";
        
        let testSuccess = false;
        let lastErr = null;
        
        for (let i = 0; i < modelOrder.length; i++) {
            const tryModel = modelOrder[i];
            const tryIsGroq = tryModel.startsWith('groq/');
            const tryApiKey = tryIsGroq ? localStorage.getItem('groqApiKey') : localStorage.getItem('openrouterApiKey');
            if (!tryApiKey) continue;
            
            updateTypingStatus(`⚡ Testing model: ${tryModel.replace(/.*\//, '')}...`);
            
            try {
                const response = await callAI(testQuery, dataSummary, tryModel, tryApiKey, false);
                hideTypingIndicator();
                addBotMessage(`🧪 **Test Successful!**\n\nWorking model: **${tryModel.replace(/.*\//, '')}**\n\n${response}`);
                btn.innerHTML = '✅ Success!';
                btn.style.background = 'rgba(16, 185, 129, 0.3)';
                
                // Save working model
                if (tryModel !== selectedModel) {
                    localStorage.setItem('aiModel', tryModel);
                    const select = document.getElementById('aiModelSelect');
                    if (select) select.value = tryModel;
                }
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
                
                testSuccess = true;
                break;
            } catch (error) {
                lastErr = error;
                console.warn(`Test model ${tryModel} failed:`, error.message);
            }
        }
        
        if (!testSuccess) {
            hideTypingIndicator();
            addBotMessage(`❌ Test Failed: All models tried. Last error: ${lastErr?.message || 'Unknown error'}`);
            btn.innerHTML = '❌ Failed';
            btn.style.background = 'rgba(239, 68, 68, 0.3)';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
            
            console.error('Test error:', lastErr);
        }
    } catch (error) {
        hideTypingIndicator();
        addBotMessage(`❌ Test Failed: ${error.message}`);
        btn.innerHTML = '❌ Failed';
        btn.style.background = 'rgba(239, 68, 68, 0.3)';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 3000);
        
        console.error('Test error:', error);
    }
}

// ============================================
// OPENROUTER API (Legacy - kept for compatibility)
// ============================================

async function callOpenRouterAPI(userMessage, dataContext) {
    const apiKey = localStorage.getItem('openrouterApiKey');
    const model = localStorage.getItem('aiModel') || 'openai/gpt-4o';
    
    const systemPrompt = `You are an AI assistant specialized in analyzing PSS (Power Sub-Station) loading data. You have access to real-time data about power stations, feeders, voltage levels, and load readings.

Your capabilities:
- Analyze load patterns and trends
- Identify voltage compliance issues
- Compare PSS station performance
- Answer questions about specific dates, feeders, or stations
- Provide insights and recommendations

Current Data Context:
${dataContext}

Instructions:
- Be concise and technical
- Use bullet points for multiple items
- Highlight critical issues with ⚠️
- Use emojis for better readability
- Format numbers with units (MA, KA, kV)
- If data is missing, clearly state it`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6), // Keep last 6 messages for context
        { role: 'user', content: userMessage }
    ];
    
    const requestBody = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    };
    
    console.log('🚀 Calling OpenRouter API with model:', model);
    
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'PSS Data Assistant'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('✅ Received AI response');
    return aiResponse;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// IMPROVED CONTEXT + DETERMINISTIC ANSWERS
// ============================================

function chatNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return isFinite(n) ? n : null;
}

function chatFormatNumber(value) {
    const n = chatNumber(value);
    if (n === null) return 'N/A';
    const rounded = Math.round(n * 10) / 10;
    return rounded.toLocaleString('en-IN');
}

function chatDateOf(record) {
    if (!record) return '';
    if (typeof normalizeDateValue === 'function') {
        const normalized = normalizeDateValue(record.date);
        if (normalized) return normalized;
    }
    return String(record.date || '').slice(0, 10);
}

function chatRequestedDate(text) {
    const value = String(text || '');
    let match = value.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/);
    if (match) return typeof normalizeDateValue === 'function' ? normalizeDateValue(match[1]) : match[1];
    match = value.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
    if (match) return typeof normalizeDateValue === 'function' ? normalizeDateValue(match[0]) : '';
    return '';
}

function chatFeederList(record) {
    const feeders = record && record.feeders;
    if (!feeders) return [];
    if (Array.isArray(feeders)) {
        return feeders.map((item, index) => {
            if (!item) return null;
            return {
                name: item.name || item.feederName || `Feeder ${index + 1}`,
                data: item
            };
        }).filter(Boolean);
    }
    if (typeof feeders === 'object') {
        return Object.keys(feeders).map(key => {
            const data = feeders[key];
            return {
                name: (data && (data.name || data.feederName)) || key,
                data: data
            };
        }).filter(item => item.data && typeof item.data === 'object');
    }
    return [];
}

function chatEquipmentLoads(record) {
    const items = [];
    const push = (name, data) => {
        if (!data || typeof data !== 'object') return;
        let value = chatNumber(data.maxLoad);
        let time = data.maxLoadTime || '';
        if (value === null) {
            value = chatNumber(data.maxCurrent);
            time = data.maxCurrentTime || '';
        }
        if (value === null) return;
        items.push({ name, value, time });
    };

    push('I/C-1 33kV', record.ic1);
    push('I/C-2 33kV', record.ic2);
    for (let i = 1; i <= 6; i += 1) {
        push(`PTR-${i} 33kV`, record[`ptr${i}_33kv`]);
        push(`PTR-${i} 11kV`, record[`ptr${i}_11kv`]);
    }
    chatFeederList(record).forEach(feeder => push(`Feeder ${feeder.name}`, feeder.data));
    push('Station Transformer', record.stationTransformer);
    push('Charger', record.charger);
    return items;
}

function chatVoltagePoints(record) {
    const items = [];
    const push = (name, data) => {
        if (!data || typeof data !== 'object') return;
        const max = chatNumber(data.maxVoltage);
        const min = chatNumber(data.minVoltage);
        if (max === null && min === null) return;
        items.push({
            name,
            max: max,
            maxTime: data.maxVoltageTime || '',
            min: min,
            minTime: data.minVoltageTime || ''
        });
    };

    push('I/C-1 33kV', record.ic1);
    push('I/C-2 33kV', record.ic2);
    for (let i = 1; i <= 6; i += 1) {
        push(`PTR-${i} 33kV`, record[`ptr${i}_33kv`]);
        push(`PTR-${i} 11kV`, record[`ptr${i}_11kv`]);
    }
    chatFeederList(record).forEach(feeder => push(`Feeder ${feeder.name}`, feeder.data));
    push('Station Transformer', record.stationTransformer);
    push('Charger', record.charger);
    return items;
}

function chatEquipmentLine(name, data) {
    if (!data || typeof data !== 'object') return '';
    const parts = [];
    const maxV = chatNumber(data.maxVoltage);
    const minV = chatNumber(data.minVoltage);
    const maxA = chatNumber(data.maxLoad) !== null ? chatNumber(data.maxLoad) : chatNumber(data.maxCurrent);
    const minA = chatNumber(data.minLoad) !== null ? chatNumber(data.minLoad) : chatNumber(data.minCurrent);
    const maxATime = data.maxLoadTime || data.maxCurrentTime || '';
    const minATime = data.minLoadTime || data.minCurrentTime || '';
    if (maxV !== null) parts.push(`max ${chatFormatNumber(maxV)} kV${data.maxVoltageTime ? ` @ ${data.maxVoltageTime}` : ''}`);
    if (minV !== null) parts.push(`min ${chatFormatNumber(minV)} kV${data.minVoltageTime ? ` @ ${data.minVoltageTime}` : ''}`);
    if (maxA !== null) parts.push(`max ${chatFormatNumber(maxA)} A${maxATime ? ` @ ${maxATime}` : ''}`);
    if (minA !== null) parts.push(`min ${chatFormatNumber(minA)} A${minATime ? ` @ ${minATime}` : ''}`);
    if (!parts.length) return '';
    return `${name}: ${parts.join(', ')}`;
}

function chatStationStats(records) {
    const stats = new Map();
    records.forEach(record => {
        const name = record.pssStation || 'Unknown';
        if (!stats.has(name)) {
            stats.set(name, {
                name,
                count: 0,
                dates: new Set(),
                latest: '',
                peakLoad: null,
                minVoltage: null,
                maxVoltage: null
            });
        }
        const item = stats.get(name);
        item.count += 1;
        const date = chatDateOf(record);
        if (date) {
            item.dates.add(date);
            if (!item.latest || date > item.latest) item.latest = date;
        }
        chatEquipmentLoads(record).forEach(point => {
            if (item.peakLoad === null || point.value > item.peakLoad.value) item.peakLoad = point;
        });
        chatVoltagePoints(record).forEach(point => {
            if (point.max !== null && (item.maxVoltage === null || point.max > item.maxVoltage)) item.maxVoltage = point.max;
            if (point.min !== null && point.min > 1 && (item.minVoltage === null || point.min < item.minVoltage)) item.minVoltage = point.min;
        });
    });
    return stats;
}

function chatFormatRecord(record) {
    if (!record) return '';
    const lines = [];
    const date = chatDateOf(record);
    lines.push(`**${record.pssStation || 'Unknown'}** | Date: ${date || 'N/A'} | Staff: ${record.staffName || 'N/A'}`);
    if (record.peakTime || record.peakVoltage) {
        lines.push(`Peak: ${record.peakVoltage || 'N/A'} kV at ${record.peakTime || 'N/A'}`);
    }
    if (record.totalMaxLoad || record.totalMinLoad) {
        lines.push(`Total load: max ${chatFormatNumber(record.totalMaxLoad)} A, min ${chatFormatNumber(record.totalMinLoad)} A`);
    }

    ['ic1', 'ic2'].forEach((key, index) => {
        const line = chatEquipmentLine(`I/C-${index + 1} 33kV`, record[key]);
        if (line) lines.push(line);
    });
    for (let i = 1; i <= 6; i += 1) {
        const line33 = chatEquipmentLine(`PTR-${i} 33kV`, record[`ptr${i}_33kv`]);
        if (line33) lines.push(line33);
    }
    for (let i = 1; i <= 6; i += 1) {
        const line11 = chatEquipmentLine(`PTR-${i} 11kV`, record[`ptr${i}_11kv`]);
        if (line11) lines.push(line11);
    }

    const feeders = chatFeederList(record).map(feeder => {
        const loads = [];
        const data = feeder.data || {};
        let value = chatNumber(data.maxLoad);
        let time = data.maxLoadTime || '';
        if (value === null) {
            value = chatNumber(data.maxCurrent);
            time = data.maxCurrentTime || '';
        }
        if (value !== null) loads.push({ value, time });
        return { name: feeder.name, data, value: loads.length ? loads[0].value : null, time: loads.length ? loads[0].time : '' };
    }).filter(feeder => feeder.value !== null).sort((a, b) => b.value - a.value).slice(0, 6);

    feeders.forEach(feeder => {
        const data = feeder.data;
        let line = `- Feeder ${feeder.name}: max ${chatFormatNumber(feeder.value)} A${feeder.time ? ` @ ${feeder.time}` : ''}`;
        if (data.maxVoltage || data.minVoltage) {
            line += `, voltage ${chatFormatNumber(data.maxVoltage)}/${chatFormatNumber(data.minVoltage)} kV`;
        }
        if (data.powerFactor) line += `, PF ${data.powerFactor}`;
        lines.push(line);
    });

    const stationLine = chatEquipmentLine('Station Transformer', record.stationTransformer);
    if (stationLine) lines.push(stationLine);
    const chargerLine = chatEquipmentLine('Charger', record.charger);
    if (chargerLine) lines.push(chargerLine);
    if (record.remarks && record.remarks !== '-') lines.push(`Remarks: ${record.remarks}`);
    return lines.join('\n');
}

function prepareDataSummaryV2(userMessage = '') {
    if (!Array.isArray(pssDataContext) || pssDataContext.length === 0) {
        return 'No data is loaded in the system. Open the admin dashboard and load submissions first.';
    }

    let records = typeof decorateEntries === 'function' ? decorateEntries(pssDataContext) : [...pssDataContext];
    records.sort((a, b) => {
        const dateCompare = (chatDateOf(b) || '').localeCompare(chatDateOf(a) || '');
        if (dateCompare !== 0) return dateCompare;
        if (typeof entrySortValue === 'function') return entrySortValue(b) - entrySortValue(a);
        return 0;
    });

    const today = typeof todayLocalISO === 'function' ? todayLocalISO() : new Date().toISOString().slice(0, 10);
    const stats = chatStationStats(records);
    const names = Array.from(stats.keys()).sort();
    const messageUpper = String(userMessage || '').toUpperCase();
    const requestedNames = names.filter(name => messageUpper.includes(String(name).toUpperCase()));
    const requestedDate = chatRequestedDate(userMessage);
    const todayCount = records.filter(record => chatDateOf(record) === today).length;
    const allDates = [];
    records.forEach(record => {
        const date = chatDateOf(record);
        if (date) allDates.push(date);
    });
    allDates.sort();

    let selected = records;
    if (requestedNames.length > 0) {
        selected = selected.filter(record => requestedNames.includes(record.pssStation || 'Unknown'));
    }
    if (requestedDate) {
        const exact = selected.filter(record => chatDateOf(record) === requestedDate);
        if (exact.length > 0) selected = exact;
    }
    selected = selected.slice(0, 10);

    let text = 'PSS DATABASE CONTEXT\n';
    text += `Total records: ${records.length} | Stations: ${names.length} | Dates: ${allDates[0] || 'N/A'} to ${allDates[allDates.length - 1] || 'N/A'}\n`;
    text += `Today (${today}) records: ${todayCount}\n`;
    text += `Context generated: ${new Date().toLocaleString()}\n\n`;

    text += 'STATION INDEX (full dataset):\n';
    names.slice(0, 40).forEach(name => {
        const item = stats.get(name);
        const peak = item.peakLoad ? `${chatFormatNumber(item.peakLoad.value)} A (${item.peakLoad.name})` : 'N/A';
        text += `- ${name}: ${item.count} records | latest ${item.latest || 'N/A'} | peak load ${peak}\n`;
    });
    if (names.length > 40) text += `- ... ${names.length - 40} more stations omitted\n`;

    if (requestedNames.length > 0) {
        text += `\nREQUESTED STATIONS: ${requestedNames.join(', ')}\n`;
        requestedNames.forEach(name => {
            const item = stats.get(name);
            if (!item) return;
            text += `- ${name}: ${item.count} records, latest ${item.latest || 'N/A'}, voltage range ${chatFormatNumber(item.minVoltage)}-${chatFormatNumber(item.maxVoltage)} kV\n`;
        });
    }
    if (requestedDate) text += `\nREQUESTED DATE: ${requestedDate}\n`;

    text += `\nDETAILED RECORDS (${selected.length} of ${records.length}):\n`;
    selected.forEach(record => {
        text += `${chatFormatRecord(record)}\n`;
    });
    text += '\nAnswer only from the data above. Quote record counts, dates and equipment names. If a value is missing say "not recorded".\n';
    return text;
}

function answerCommonQuery(message) {
    const raw = String(message || '').trim();
    if (!raw || !Array.isArray(pssDataContext) || pssDataContext.length === 0) return null;
    const lower = raw.toLowerCase();
    let records = typeof decorateEntries === 'function' ? decorateEntries(pssDataContext) : [...pssDataContext];
    records.sort((a, b) => {
        const dateCompare = (chatDateOf(b) || '').localeCompare(chatDateOf(a) || '');
        if (dateCompare !== 0) return dateCompare;
        if (typeof entrySortValue === 'function') return entrySortValue(b) - entrySortValue(a);
        return 0;
    });

    const stats = chatStationStats(records);
    const names = Array.from(stats.keys()).sort();
    const today = typeof todayLocalISO === 'function' ? todayLocalISO() : new Date().toISOString().slice(0, 10);
    const dates = [];
    records.forEach(record => {
        const date = chatDateOf(record);
        if (date) dates.push(date);
    });
    dates.sort();
    const latestDate = dates[dates.length - 1] || '';
    const mentioned = names.filter(name => lower.includes(String(name).toLowerCase()));
    const askedDate = chatRequestedDate(raw);
    const equipmentWords = /(feeder|ptr|incoming|i\/c|transformer|charger|voltage|current|load|amp|kv)/.test(lower);
    const wantsToday = /\b(today|aaj)\b/.test(lower);

    const poolFiltered = () => {
        let pool = records;
        if (askedDate) pool = pool.filter(record => chatDateOf(record) === askedDate);
        else if (wantsToday) pool = pool.filter(record => chatDateOf(record) === today);
        if (mentioned.length > 0) pool = pool.filter(record => mentioned.includes(record.pssStation || 'Unknown'));
        return pool;
    };

    if (/(how many|number of|total|kitne)/.test(lower) && /(station|pss)/.test(lower) && !/(record|submission|entry|data)/.test(lower)) {
        return `There are **${names.length} PSS stations** in the loaded data:\n` + names.map(name => `- ${name}`).join('\n');
    }

    if (/(how many|number of|total|kitne)/.test(lower) && /(record|records|submission|submissions|entry|entries|data|reports)/.test(lower)) {
        const todayCount = records.filter(record => chatDateOf(record) === today).length;
        return `**Database totals**\n- Total records: ${records.length}\n- PSS stations: ${names.length}\n- Date range: ${dates[0] || 'N/A'} to ${latestDate || 'N/A'}\n- Records dated today (${today}): ${todayCount}`;
    }

    if (/(not submitted|missing|pending|not filled|remaining|kaun nahi)/.test(lower) && /(today|aaj)/.test(lower)) {
        const submitted = new Set(records.filter(record => chatDateOf(record) === today).map(record => record.pssStation));
        const missing = names.filter(name => !submitted.has(name));
        if (missing.length === 0) return `All **${names.length} stations** have submitted data for today (${today}).`;
        return `**${missing.length} station(s) have no record dated today (${today}):**\n` + missing.map(name => `- ${name}`).join('\n') + `\n\nLatest available date in database: ${latestDate || 'N/A'}`;
    }

    if (/(highest|maximum|max|peak|top|sabse zyada)/.test(lower) && /(load|current|amp|amps)/.test(lower) && !/voltage/.test(lower)) {
        const pool = poolFiltered();
        const points = [];
        pool.forEach(record => {
            chatEquipmentLoads(record).forEach(point => {
                points.push({
                    value: point.value,
                    name: point.name,
                    time: point.time,
                    pss: record.pssStation || 'Unknown',
                    date: chatDateOf(record)
                });
            });
        });
        points.sort((a, b) => b.value - a.value);
        if (points.length === 0) return 'No load readings found for that selection.';
        const top = points.slice(0, 5);
        const scope = mentioned.length > 0 ? mentioned.join(', ') : (wantsToday ? `today (${today})` : (askedDate || 'all data'));
        return `**Highest load readings — ${scope}**\n` + top.map(point => `- ${point.pss} | ${point.date} | ${point.name}: **${chatFormatNumber(point.value)} A**${point.time ? ` @ ${point.time}` : ''}`).join('\n');
    }

    if (/(voltage|volt|kv)/.test(lower) && /(highest|lowest|maximum|minimum|max|min|range)/.test(lower)) {
        const pool = poolFiltered();
        const points = [];
        pool.forEach(record => {
            chatVoltagePoints(record).forEach(point => {
                points.push({
                    pss: record.pssStation || 'Unknown',
                    date: chatDateOf(record),
                    name: point.name,
                    max: point.max,
                    maxTime: point.maxTime,
                    min: point.min,
                    minTime: point.minTime
                });
            });
        });
        const wantsMax = /(highest|maximum|max)/.test(lower);
        const wantsMin = /(lowest|minimum|min)/.test(lower);
        const scope = mentioned.length > 0 ? mentioned.join(', ') : (wantsToday ? `today (${today})` : (askedDate || 'all data'));
        const lines = [];
        if (wantsMax || !wantsMin) {
            const top = points.filter(point => point.max !== null).sort((a, b) => b.max - a.max).slice(0, 5);
            if (top.length > 0) {
                lines.push('**Highest voltages**');
                top.forEach(point => lines.push(`- ${point.pss} | ${point.date} | ${point.name}: ${chatFormatNumber(point.max)} kV${point.maxTime ? ` @ ${point.maxTime}` : ''}`));
            }
        }
        if (wantsMin) {
            const low = points.filter(point => point.min !== null && point.min > 1).sort((a, b) => a.min - b.min).slice(0, 5);
            if (low.length > 0) {
                lines.push('**Lowest voltages**');
                low.forEach(point => lines.push(`- ${point.pss} | ${point.date} | ${point.name}: ${chatFormatNumber(point.min)} kV${point.minTime ? ` @ ${point.minTime}` : ''}`));
            }
        }
        if (lines.length === 0) return 'No voltage readings found for that selection.';
        return lines[0] + '\n' + lines.slice(1).join('\n') + `\n\nScope: ${scope}`;
    }

    if (/(most|highest number|maximum|top)/.test(lower) && /(record|submission|entry)/.test(lower)) {
        const ranked = names.map(name => stats.get(name)).sort((a, b) => b.count - a.count).slice(0, 10);
        return '**Stations ranked by number of records**\n' + ranked.map((item, index) => `${index + 1}. ${item.name}: ${item.count} records (latest ${item.latest || 'N/A'})`).join('\n');
    }

    if (wantsToday && !equipmentWords) {
        const todayRecords = records.filter(record => chatDateOf(record) === today);
        if (todayRecords.length === 0) {
            const latestRecords = records.filter(record => chatDateOf(record) === latestDate);
            return `No records dated today (${today}).\n\nLatest available date is **${latestDate || 'N/A'}** with **${latestRecords.length} record(s)**.\n` + latestRecords.slice(0, 12).map(record => `- ${record.pssStation || 'Unknown'} | ${record.staffName || 'N/A'}`).join('\n');
        }
        return `**Today (${today}) — ${todayRecords.length} record(s)**\n` + todayRecords.slice(0, 20).map(record => `- ${record.pssStation || 'Unknown'} | ${record.staffName || 'N/A'} | submitted ${record.peakTime || record.timestamp || 'N/A'}`).join('\n');
    }

    if (/(latest|last|recent|current|newest)/.test(lower)) {
        if (mentioned.length > 0) {
            const found = records.find(record => mentioned.includes(record.pssStation || 'Unknown'));
            if (found) return `**Latest record for ${found.pssStation}**\n${chatFormatRecord(found)}`;
        }
        const seen = {};
        const latest = [];
        records.forEach(record => {
            const key = record.pssStation || 'Unknown';
            if (!seen[key]) {
                seen[key] = true;
                latest.push(record);
            }
        });
        return '**Latest record per station**\n' + latest.slice(0, 15).map(record => `- ${record.pssStation || 'Unknown'}: ${chatDateOf(record) || 'N/A'}${record.staffName ? ` (${record.staffName})` : ''}`).join('\n');
    }

    if (/(summary|overview|summarize|brief|status|report|analysis)/.test(lower) && !equipmentWords) {
        const todayCount = records.filter(record => chatDateOf(record) === today).length;
        const peak = [];
        records.forEach(record => chatEquipmentLoads(record).forEach(point => peak.push({
            value: point.value,
            name: point.name,
            pss: record.pssStation || 'Unknown',
            date: chatDateOf(record)
        })));
        peak.sort((a, b) => b.value - a.value);
        const topStations = names.map(name => stats.get(name)).sort((a, b) => b.count - a.count).slice(0, 5);
        let text = `**PSS data overview**\n- Total records: ${records.length}\n- Stations: ${names.length}\n- Date range: ${dates[0] || 'N/A'} to ${latestDate || 'N/A'}\n- Today (${today}): ${todayCount} record(s)\n- Stations with data: ${names.join(', ')}\n\n**Most active stations**\n`;
        text += topStations.map(item => `- ${item.name}: ${item.count} records, latest ${item.latest || 'N/A'}`).join('\n');
        if (peak.length > 0) {
            text += '\n\n**Highest load readings**\n' + peak.slice(0, 3).map(point => `- ${point.pss} | ${point.date} | ${point.name}: ${chatFormatNumber(point.value)} A`).join('\n');
        }
        return text;
    }

    if (mentioned.length > 0) {
        let found = records.filter(record => mentioned.includes(record.pssStation || 'Unknown'));
        if (askedDate) {
            const exact = found.filter(record => chatDateOf(record) === askedDate);
            if (exact.length > 0) found = exact;
        }
        if (found.length > 0) {
            return `**${found[0].pssStation}**\n${chatFormatRecord(found[0])}`;
        }
    }

    return null;
}

prepareDataSummary = prepareDataSummaryV2;

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.initializeChatbot = initializeChatbot;
window.updateDataContext = updateDataContext;

console.log('✅ Chatbot module loaded');
