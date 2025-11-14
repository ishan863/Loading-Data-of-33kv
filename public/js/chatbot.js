// ========================================
// AI CHATBOT ASSISTANT - OpenRouter Integration
// Provides intelligent insights about PSS loading data
// ========================================

let chatHistory = [];
let pssDataContext = [];
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Default API keys (you can change these in the UI)
// IMPORTANT: Never commit real API keys to Git! Use environment variables instead.
const DEFAULT_OPENROUTER_KEY = ''; // Add your OpenRouter API key here
const DEFAULT_GROQ_KEY = ''; // Add your Groq API key here

// ============================================
// INITIALIZATION
// ============================================

function initializeChatbot() {
    console.log('🤖 Initializing AI Chatbot Assistant...');
    
    // Load saved API key or use default
    const savedApiKey = localStorage.getItem('openrouterApiKey');
    if (savedApiKey) {
        document.getElementById('openrouterApiKey').value = savedApiKey;
    } else {
        // Set default OpenRouter key
        localStorage.setItem('openrouterApiKey', DEFAULT_OPENROUTER_KEY);
        document.getElementById('openrouterApiKey').value = DEFAULT_OPENROUTER_KEY;
    }
    
    // Load saved Groq key or use default
    const savedGroqKey = localStorage.getItem('groqApiKey');
    if (savedGroqKey) {
        document.getElementById('groqApiKey').value = savedGroqKey;
    } else {
        // Set default Groq key
        localStorage.setItem('groqApiKey', DEFAULT_GROQ_KEY);
        document.getElementById('groqApiKey').value = DEFAULT_GROQ_KEY;
    }
    
    // Load saved model preference or set default to Groq
    const savedModel = localStorage.getItem('aiModel');
    if (savedModel) {
        document.getElementById('aiModelSelect').value = savedModel;
    } else {
        // Default to Groq Llama 3.3 70B - TESTED & WORKING
        localStorage.setItem('aiModel', 'groq/llama-3.3-70b-versatile');
        document.getElementById('aiModelSelect').value = 'groq/llama-3.3-70b-versatile';
    }
    
    // Load chat history from session
    const savedHistory = sessionStorage.getItem('chatHistory');
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        renderChatHistory();
    }
    
    // Event Listeners
    document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
    document.getElementById('sendChatBtn').addEventListener('click', sendMessage);
    document.getElementById('clearChatBtn').addEventListener('click', clearChat);
    document.getElementById('testChatBtn').addEventListener('click', testChatbot);
    
    // Chat input enter key
    const chatInput = document.getElementById('chatInput');
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
    
    // Quick suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            document.getElementById('chatInput').value = query;
            sendMessage();
        });
    });
    
    console.log('✅ Chatbot initialized');
}

// ============================================
// DATA CONTEXT PREPARATION
// ============================================

function updateDataContext(allData) {
    pssDataContext = allData;
    console.log('📊 Chatbot context updated with', allData.length, 'records');
}

function prepareDataSummary() {
    if (!pssDataContext || pssDataContext.length === 0) {
        return "❌ No data available in the system.";
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // PERFORMANCE: Only process last 10 records instead of 15 to reduce lag
    const recentRecords = pssDataContext.slice(-10);
    
    // Build comprehensive data string
    let dataText = `
╔══════════════════════════════════════════════════════════════╗
║                   PSS DATABASE - COMPLETE DATA                ║
╚══════════════════════════════════════════════════════════════╝

📊 TOTAL RECORDS IN DATABASE: ${pssDataContext.length}
📅 LATEST ${recentRecords.length} DETAILED RECORDS:

`;

    recentRecords.forEach((record, index) => {
        dataText += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECORD #${index + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 PSS STATION: ${record.pssStation || 'Unknown'}
📅 DATE: ${record.date || 'N/A'}
👤 STAFF: ${record.staffName || 'N/A'} | 📞 ${record.phone || 'N/A'}
⏰ PEAK TIME: ${record.peakTime || 'N/A'}
🔋 PEAK VOLTAGE: ${record.peakVoltage || 'N/A'} kV

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
                dataText += `     Max Load: ${record.ptr2_33kv.maxLoad || record.ptr2_33kv.maxCurrent || 'N/A'} A @ ${record.ptr2_33kv.maxLoadTime || record.ptr2_33kv.maxCurrentTime || 'N/A'}\n`;
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
                dataText += `     Max Load: ${record.ptr2_11kv.maxLoad || record.ptr2_11kv.maxCurrent || 'N/A'} A @ ${record.ptr2_11kv.maxLoadTime || record.ptr2_11kv.maxCurrentTime || 'N/A'}\n`;
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
🏭 PSS Stations: ${uniquePSS.join(', ')}
📅 Today's Submissions: ${todayRecords.length} records
📝 Total Database Records: ${pssDataContext.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return dataText;
}

// ============================================
// API KEY MANAGEMENT
// ============================================

function saveApiKey() {
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
        
        // Show success
        btn.innerHTML = '✅ Saved Successfully!';
        btn.style.background = 'rgba(16, 185, 129, 0.3)';
        
        console.log('✅ Configuration saved:', { model, hasGroq: !!groqKey, hasOpenRouter: !!apiKey });
        
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
    const model = localStorage.getItem('aiModel') || 'groq/llama-3.3-70b-versatile';
    const isGroq = model.startsWith('groq/');
    const apiKey = isGroq ? localStorage.getItem('groqApiKey') : localStorage.getItem('openrouterApiKey');
    
    if (!apiKey) {
        addBotMessage('⚠️ Please configure your API key first. Click the 💾 Save button after entering your key.');
        return;
    }
    
    // Add user message to chat
    addUserMessage(message);
    input.value = '';
    input.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator('🔍 Reading your question...');
    
    // Simulate thinking process
    setTimeout(() => updateTypingStatus('📊 Accessing PSS database...'), 500);
    setTimeout(() => updateTypingStatus('🤔 Processing data patterns...'), 1000);
    setTimeout(() => updateTypingStatus('💭 Formulating response...'), 1500);
    
    // Prepare data context
    const dataSummary = prepareDataSummary();
    
    // Call API
    try {
        updateTypingStatus('🚀 Consulting AI model...');
        const response = await callAI(message, dataSummary, model, apiKey);
        hideTypingIndicator();
        addBotMessage(response);
    } catch (error) {
        hideTypingIndicator();
        addBotMessage(`❌ Error: ${error.message}. Please check your API key in ⚙️ Settings.`);
        console.error('Chatbot error:', error);
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
    messagesContainer.appendChild(messageDiv);
    
    // Smooth scroll to bottom with delay to ensure DOM is updated
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Save to history
    chatHistory.push({ role: 'user', content: text });
    sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
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
    messagesContainer.appendChild(messageDiv);
    
    // Smooth scroll to bottom with delay to ensure DOM is updated
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Save to history
    chatHistory.push({ role: 'assistant', content: text });
    sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
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
    chatHistory.forEach(msg => {
        if (msg.role === 'user') {
            addUserMessage(msg.content);
        } else if (msg.role === 'assistant') {
            addBotMessage(msg.content);
        }
    });
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

📍 PSS STATIONS: Kundukela, Sankara, Karamdihi

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
Available stations: Kundukela, Sankara, Karamdih"

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
        temperature: 0.7,
        max_tokens: 1000
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
        const model = localStorage.getItem('aiModel') || 'groq/llama-3.3-70b-versatile';
        const isGroq = model.startsWith('groq/');
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
        
        updateTypingStatus('📊 Preparing data summary...');
        const dataSummary = prepareDataSummary();
        
        updateTypingStatus('🤖 Sending test query...');
        const testQuery = "Give me a brief summary of the PSS data in 2-3 sentences.";
        
        updateTypingStatus('⚡ Waiting for AI response...');
        const response = await callAI(testQuery, dataSummary, model, apiKey);
        hideTypingIndicator();
        addBotMessage('🧪 **Test Successful!**\n\n' + response);
        
        btn.innerHTML = '✅ Success!';
        btn.style.background = 'rgba(16, 185, 129, 0.3)';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 3000);
        
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
// EXPORT FUNCTIONS
// ============================================

window.initializeChatbot = initializeChatbot;
window.updateDataContext = updateDataContext;

console.log('✅ Chatbot module loaded');
