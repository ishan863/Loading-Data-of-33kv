// ============================================
// CUSTOM SELECT DROPDOWN - Cross-Browser Compatible
// Replaces native <select> with styled dropdown
// ============================================

class CustomSelect {
    constructor(selectElement) {
        this.select = selectElement;
        this.container = null;
        this.dropdown = null;
        this.searchInput = null;
        this.optionsData = [];
        this.init();
    }

    init() {
        // CRITICAL: Don't initialize custom select for feeder PTR dropdowns
        if (this.select.id && this.select.id.includes('feeder')) {
            console.log('Skipping custom select for feeder dropdown:', this.select.id);
            return;
        }
        
        // Hide original select
        this.select.style.display = 'none';
        
        // Store all options data
        this.cacheOptions();
        
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'custom-select-container';
        
        // Prevent click events from bubbling up from container
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Create search input (looks like button)
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'custom-select-search';
        this.searchInput.placeholder = this.select.options[this.select.selectedIndex]?.text || 'Search...';
        this.searchInput.value = this.select.options[this.select.selectedIndex]?.text || '';
        
        // Create dropdown arrow
        const arrow = document.createElement('span');
        arrow.className = 'custom-select-arrow';
        arrow.innerHTML = '▼';
        
        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown';
        
        // Populate options
        this.updateOptions();
        
        // Add search input handler
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });
        
        // Add keydown handler to clear placeholder text on first key
        this.searchInput.addEventListener('keydown', (e) => {
            // If user starts typing and input has the selected value, clear it
            if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                const selectedText = this.select.options[this.select.selectedIndex]?.text || '';
                if (this.searchInput.value === selectedText) {
                    this.searchInput.value = '';
                }
            }
        });
        
        // Add focus handler to open dropdown
        this.searchInput.addEventListener('focus', (e) => {
            // Only open if user explicitly focused this field
            // Don't open if focus came from clicking elsewhere
            if (!this.preventAutoOpen) {
                // Select all text on focus for easy replacement
                this.searchInput.select();
                this.openDropdown();
            }
            this.preventAutoOpen = false;
        });
        
        // Add click handler to toggle
        this.searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDropdown();
        });
        
        // Arrow click handler
        arrow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown();
            if (this.dropdown.classList.contains('open')) {
                this.searchInput.focus();
            }
        });
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            // Only close if clicking truly outside AND dropdown is open
            if (!this.container.contains(e.target) && this.dropdown.classList.contains('open')) {
                // Check if clicked element is another form input
                const clickedInput = e.target.closest('input, textarea');
                if (clickedInput && !clickedInput.classList.contains('custom-select-search')) {
                    // User clicked on a different input field, close dropdown without interfering
                    this.closeDropdown();
                } else if (!clickedInput) {
                    // Clicked somewhere else entirely
                    this.closeDropdown();
                }
            }
        });
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-input-wrapper';
        wrapper.appendChild(this.searchInput);
        wrapper.appendChild(arrow);
        
        this.container.appendChild(wrapper);
        this.container.appendChild(this.dropdown);
        this.select.parentNode.insertBefore(this.container, this.select);
        
        // Store instance reference
        this.storeInstance();
        
        // Handle original select change (for programmatic updates)
        this.select.addEventListener('change', () => {
            this.syncInput();
        });
        
        // Watch for option changes using MutationObserver
        const selectObserver = new MutationObserver(() => {
            this.refreshOptions();
        });
        
        selectObserver.observe(this.select, {
            childList: true,
            subtree: true
        });
    }

    cacheOptions() {
        this.optionsData = [];
        for (let i = 0; i < this.select.options.length; i++) {
            const option = this.select.options[i];
            this.optionsData.push({
                index: i,
                text: option.text,
                value: option.value,
                selected: option.selected
            });
        }
    }

    filterOptions(searchText) {
        if (!searchText || searchText.trim() === '') {
            this.renderOptions(this.optionsData);
            return;
        }
        
        const filtered = this.optionsData.filter(opt => 
            opt.text.toLowerCase().includes(searchText.toLowerCase())
        );
        this.renderOptions(filtered);
        this.openDropdown();
    }

    updateOptions() {
        this.cacheOptions();
        this.renderOptions(this.optionsData);
    }
    
    refreshOptions() {
        this.cacheOptions();
        if (this.dropdown.classList.contains('open')) {
            const currentSearch = this.searchInput.value;
            if (currentSearch && currentSearch !== this.select.options[this.select.selectedIndex]?.text) {
                this.filterOptions(currentSearch);
            } else {
                this.renderOptions(this.optionsData);
            }
        }
    }

    renderOptions(optionsToRender) {
        this.dropdown.innerHTML = '';
        
        if (optionsToRender.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'custom-select-no-results';
            noResults.textContent = 'No results found';
            this.dropdown.appendChild(noResults);
            return;
        }
        
        optionsToRender.forEach(optData => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-select-option';
            optionEl.textContent = optData.text;
            
            if (this.select.selectedIndex === optData.index) {
                optionEl.classList.add('selected');
            }
            
            optionEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.select.selectedIndex = optData.index;
                this.select.dispatchEvent(new Event('change', { bubbles: true }));
                this.syncInput();
                this.closeDropdown();
            });
            
            this.dropdown.appendChild(optionEl);
        });
    }

    syncInput() {
        const selectedText = this.select.options[this.select.selectedIndex]?.text || '';
        this.searchInput.value = selectedText;
        this.searchInput.placeholder = selectedText || 'Search...';
        
        // Update selected state in dropdown
        const options = this.dropdown.querySelectorAll('.custom-select-option');
        options.forEach((opt, idx) => {
            opt.classList.toggle('selected', idx === this.select.selectedIndex);
        });
    }

    toggleDropdown() {
        if (this.dropdown.classList.contains('open')) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        // Don't open if already open
        if (this.dropdown.classList.contains('open')) {
            return;
        }
        
        this.dropdown.classList.add('open');
        this.searchInput.setAttribute('aria-expanded', 'true');
        // Reset filter when opening
        if (this.searchInput.value && !this.isCurrentValueSelected()) {
            this.filterOptions(this.searchInput.value);
        } else {
            this.renderOptions(this.optionsData);
        }
    }

    closeDropdown() {
        this.dropdown.classList.remove('open');
        this.searchInput.setAttribute('aria-expanded', 'false');
        // Restore selected value
        this.syncInput();
    }

    isCurrentValueSelected() {
        const currentText = this.select.options[this.select.selectedIndex]?.text || '';
        return this.searchInput.value === currentText;
    }
}

// Initialize all selects when DOM is ready
function initCustomSelects() {
    // EXCLUDE feeder PTR dropdowns - they cause z-index issues
    // Only apply to main form selects (PSS, staff selection, etc.)
    const selectElements = document.querySelectorAll('.form-select:not([id*="feeder"]), select:not([id*="feeder"]):not(.time-picker-input)');
    selectElements.forEach(select => {
        // Check if already initialized and if it's a select element
        if (select.tagName === 'SELECT' && !select.nextElementSibling?.classList.contains('custom-select-container')) {
            new CustomSelect(select);
        }
    });
}

// Global function to refresh all custom selects (call after populating options)
window.refreshCustomSelects = function() {
    const containers = document.querySelectorAll('.custom-select-container');
    containers.forEach(container => {
        const select = container.previousElementSibling;
        if (select && select.tagName === 'SELECT') {
            // Find the CustomSelect instance and refresh
            const input = container.querySelector('.custom-select-search');
            if (input && input._customSelectInstance) {
                input._customSelectInstance.refreshOptions();
            }
        }
    });
};

// Store instance reference on the input element
CustomSelect.prototype.storeInstance = function() {
    if (this.searchInput) {
        this.searchInput._customSelectInstance = this;
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomSelects);
} else {
    initCustomSelects();
}

// Re-initialize when forms are dynamically created
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // EXCLUDE feeder PTR dropdowns from custom select
                    const selects = node.querySelectorAll?.('select') || [];
                    selects.forEach(select => {
                        // Skip if it's a feeder dropdown
                        if (select.id && select.id.includes('feeder')) {
                            return;
                        }
                        if (!select.nextElementSibling?.classList.contains('custom-select-container')) {
                            new CustomSelect(select);
                        }
                    });
                }
            });
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
