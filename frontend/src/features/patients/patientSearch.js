/**
 * Patient Search Page Module
 * Handles advanced patient search with multiple filters and view options
 */

/**
 * Advanced Patient Search Page Module
 */

import { patientService } from '../../services/patientService.js';
import { getCurrentRole } from '../../services/authService.js';

export class PatientSearch {
    constructor() {
        this.allPatients = [];
        this.searchResults = [];
        this.currentPage = 1;
        this.pageSize = 12;
        this.currentView = 'grid'; // grid or list
        this.isDentist = getCurrentRole() === 'dentist';
        this.filters = {
            name: '',
            mrn: '',
            phone: '',
            gender: '',
            region: '',
            minAge: '',
            maxAge: '',
            fromDate: '',
            toDate: ''
        };
        this.savedSearches = this.loadSavedSearches();
    }
    
    /**
     * Render the search page HTML
     */
    async render() {
        return `
            <div class="search-container">
                <!-- Search Header -->
                <div class="search-header">
                    <h1>
                        <i class="fas fa-search"></i>
                        Advanced Patient Search
                    </h1>
                    <p>
                        <i class="fas fa-info-circle"></i>
                        Search patients using multiple criteria and filters
                    </p>
                </div>
                
                <!-- Search Tabs -->
                <div class="search-tabs">
                    <button class="search-tab active" data-tab="quick">
                        <i class="fas fa-bolt"></i> Quick Search
                    </button>
                    <button class="search-tab" data-tab="advanced">
                        <i class="fas fa-sliders-h"></i> Advanced Search
                    </button>
                    <button class="search-tab" data-tab="saved">
                        <i class="fas fa-bookmark"></i> Saved Searches
                    </button>
                </div>
                
                <!-- Quick Search Section -->
                <div class="quick-search-section" id="quickSearchSection">
                    <div class="quick-search-wrapper">
                        <i class="fas fa-search"></i>
                        <input 
                            type="text" 
                            id="quickSearchInput" 
                            placeholder="Search by name, MRN, phone number, father's name, or region..."
                            autocomplete="off"
                        >
                        <button id="quickSearchBtn">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                    <div class="search-suggestions" id="searchSuggestions"></div>
                </div>
                
                <!-- Advanced Search Section -->
                <div class="advanced-filters" id="advancedSearchSection" style="display: none;">
                    <div class="filters-header" id="filtersHeader">
                        <h3>
                            <i class="fas fa-filter"></i>
                            Search Filters
                        </h3>
                        <i class="fas fa-chevron-up toggle-icon"></i>
                    </div>
                    <div class="filters-content" id="filtersContent">
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-user"></i> Patient Name
                                </label>
                                <input type="text" id="filterName" placeholder="Enter patient name">
                            </div>
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-id-card"></i> MRN Number
                                </label>
                                <input type="text" id="filterMRN" placeholder="Enter MRN number">
                            </div>
                        </div>
                        
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-phone"></i> Phone Number
                                </label>
                                <input type="tel" id="filterPhone" placeholder="Enter phone number">
                            </div>
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-venus-mars"></i> Gender
                                </label>
                                <select id="filterGender">
                                    <option value="">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-map-marker-alt"></i> Region
                                </label>
                                <select id="filterRegion">
                                    <option value="">All Regions</option>
                                    <option value="Addis Ababa">Addis Ababa</option>
                                    <option value="Oromia">Oromia</option>
                                    <option value="Amhara">Amhara</option>
                                    <option value="Tigray">Tigray</option>
                                    <option value="SNNPR">SNNPR</option>
                                    <option value="Somali">Somali</option>
                                    <option value="Harari">Harari</option>
                                    <option value="Dire Dawa">Dire Dawa</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-calendar-alt"></i> Age Range
                                </label>
                                <div class="range-inputs">
                                    <input type="number" id="minAge" placeholder="Min Age" min="0">
                                    <span>to</span>
                                    <input type="number" id="maxAge" placeholder="Max Age" min="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-calendar-plus"></i> From Date
                                </label>
                                <input type="date" id="fromDate">
                            </div>
                            <div class="filter-group">
                                <label>
                                    <i class="fas fa-calendar-minus"></i> To Date
                                </label>
                                <input type="date" id="toDate">
                            </div>
                        </div>
                        
                        <div class="filter-actions">
                            <button class="filter-btn primary" id="applyFiltersBtn">
                                <i class="fas fa-search"></i> Apply Filters
                            </button>
                            <button class="filter-btn secondary" id="clearFiltersBtn">
                                <i class="fas fa-eraser"></i> Clear All
                            </button>
                            <button class="filter-btn success" id="saveSearchBtn">
                                <i class="fas fa-save"></i> Save This Search
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Saved Searches Section -->
                <div class="saved-searches" id="savedSearchesSection" style="display: none;">
                    <h3>
                        <i class="fas fa-bookmark"></i>
                        Your Saved Searches
                    </h3>
                    <div class="search-tags" id="savedSearchesList">
                        <div class="empty-state-small">No saved searches yet</div>
                    </div>
                </div>
                
                <!-- Search Stats -->
                <div class="search-stats" id="searchStats" style="display: none;">
                    <div class="stats-info">
                        <div class="results-count">
                            <i class="fas fa-chart-bar"></i>
                            Found <span id="resultCount">0</span> result(s)
                        </div>
                        <div class="search-time">
                            <i class="fas fa-clock"></i>
                            <span id="searchTime">0.00</span> seconds
                        </div>
                    </div>
                    <div class="active-filters" id="activeFilters"></div>
                </div>
                
                <!-- Results View Toggle -->
                <div class="results-view-toggle" id="resultsViewToggle" style="display: none;">
                    <button class="view-btn ${this.currentView === 'grid' ? 'active' : ''}" data-view="grid">
                        <i class="fas fa-th-large"></i> Grid View
                    </button>
                    <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list">
                        <i class="fas fa-list"></i> List View
                    </button>
                </div>
                
                <!-- Search Results Container -->
                <div id="searchResultsContainer"></div>
                
                <!-- Pagination -->
                <div id="searchPagination" class="pagination" style="display: none;"></div>
            </div>
        `;
    }
    
    /**
     * Initialize search functionality
     */
    initSearch() {
        this.loadAllPatients();
        this.setupEventListeners();
    }
    
    /**
     * Load all patients from API
     */
    async loadAllPatients() {
        try {
            const data = await patientService.fetchAll();
            
            if (data.success && data.data) {
                this.allPatients = data.data;
                this.searchResults = [...this.allPatients];
                this.displayResults();
            } else {
                this.showError('Failed to load patients data');
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            this.showError('Error connecting to server');
        }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.search-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Quick search
        const quickSearchBtn = document.getElementById('quickSearchBtn');
        const quickSearchInput = document.getElementById('quickSearchInput');
        
        if (quickSearchBtn) {
            quickSearchBtn.addEventListener('click', () => this.quickSearch());
        }
        
        if (quickSearchInput) {
            quickSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.quickSearch();
            });
            quickSearchInput.addEventListener('input', () => this.showSuggestions());
        }
        
        // Advanced filters
        const applyBtn = document.getElementById('applyFiltersBtn');
        const clearBtn = document.getElementById('clearFiltersBtn');
        const saveBtn = document.getElementById('saveSearchBtn');
        const filtersHeader = document.getElementById('filtersHeader');
        
        if (applyBtn) applyBtn.addEventListener('click', () => this.advancedSearch());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearFilters());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveCurrentSearch());
        
        if (filtersHeader) {
            filtersHeader.addEventListener('click', () => this.toggleFilters());
        }
        
        // View toggle
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    }
    
    /**
     * Switch between search tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.search-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show/hide sections
        const quickSection = document.getElementById('quickSearchSection');
        const advancedSection = document.getElementById('advancedSearchSection');
        const savedSection = document.getElementById('savedSearchesSection');
        
        if (quickSection) quickSection.style.display = tabName === 'quick' ? 'block' : 'none';
        if (advancedSection) advancedSection.style.display = tabName === 'advanced' ? 'block' : 'none';
        if (savedSection) savedSection.style.display = tabName === 'saved' ? 'block' : 'none';
        
        // Load saved searches if needed
        if (tabName === 'saved') {
            this.displaySavedSearches();
        }
    }
    
    /**
     * Perform quick search
     */
    async quickSearch() {
        const searchTerm = document.getElementById('quickSearchInput').value.trim();
        
        if (!searchTerm) {
            this.searchResults = [...this.allPatients];
            this.displayResults();
            return;
        }
        
        const startTime = performance.now();
        
        // Filter patients based on search term
        this.searchResults = this.allPatients.filter(patient => {
            return (
                patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.phone_number.includes(searchTerm) ||
                (patient.father_name && patient.father_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (patient.region && patient.region.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        });
        
        const endTime = performance.now();
        const searchTime = ((endTime - startTime) / 1000).toFixed(2);
        
        this.displayResults();
        this.showSearchStats(searchTime);
    }
    
    /**
     * Perform advanced search with filters
     */
    advancedSearch() {
        const startTime = performance.now();
        
        // Get filter values
        this.filters = {
            name: document.getElementById('filterName')?.value.trim() || '',
            mrn: document.getElementById('filterMRN')?.value.trim() || '',
            phone: document.getElementById('filterPhone')?.value.trim() || '',
            gender: document.getElementById('filterGender')?.value || '',
            region: document.getElementById('filterRegion')?.value || '',
            minAge: document.getElementById('minAge')?.value || '',
            maxAge: document.getElementById('maxAge')?.value || '',
            fromDate: document.getElementById('fromDate')?.value || '',
            toDate: document.getElementById('toDate')?.value || ''
        };
        
        // Apply filters
        this.searchResults = this.allPatients.filter(patient => {
            let match = true;
            
            if (this.filters.name && !patient.name.toLowerCase().includes(this.filters.name.toLowerCase())) {
                match = false;
            }
            
            if (this.filters.mrn && !patient.mrn.toLowerCase().includes(this.filters.mrn.toLowerCase())) {
                match = false;
            }
            
            if (this.filters.phone && !patient.phone_number.includes(this.filters.phone)) {
                match = false;
            }
            
            if (this.filters.gender && patient.gender !== this.filters.gender) {
                match = false;
            }
            
            if (this.filters.region && patient.region !== this.filters.region) {
                match = false;
            }
            
            if (this.filters.minAge && patient.age < parseInt(this.filters.minAge)) {
                match = false;
            }
            
            if (this.filters.maxAge && patient.age > parseInt(this.filters.maxAge)) {
                match = false;
            }
            
            if (this.filters.fromDate) {
                const regDate = new Date(patient.registration_date);
                const fromDate = new Date(this.filters.fromDate);
                if (regDate < fromDate) match = false;
            }
            
            if (this.filters.toDate) {
                const regDate = new Date(patient.registration_date);
                const toDate = new Date(this.filters.toDate);
                if (regDate > toDate) match = false;
            }
            
            return match;
        });
        
        const endTime = performance.now();
        const searchTime = ((endTime - startTime) / 1000).toFixed(2);
        
        this.displayResults();
        this.showSearchStats(searchTime);
        this.displayActiveFilters();
    }
    
    /**
     * Clear all advanced filters
     */
    clearFilters() {
        // Reset all filter inputs
        const filterInputs = ['filterName', 'filterMRN', 'filterPhone', 'filterGender', 
                              'filterRegion', 'minAge', 'maxAge', 'fromDate', 'toDate'];
        
        filterInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        
        // Reset filters object
        this.filters = {
            name: '', mrn: '', phone: '', gender: '', region: '', 
            minAge: '', maxAge: '', fromDate: '', toDate: ''
        };
        
        // Reset search results
        this.searchResults = [...this.allPatients];
        this.displayResults();
        
        // Hide stats
        const statsDiv = document.getElementById('searchStats');
        if (statsDiv) statsDiv.style.display = 'none';
        
        this.showToast('All filters cleared', 'info');
    }
    
    /**
     * Save current search criteria
     */
    saveCurrentSearch() {
        const hasActiveFilters = Object.values(this.filters).some(v => v && v !== '');
        
        if (!hasActiveFilters && document.getElementById('quickSearchInput')?.value.trim() === '') {
            this.showToast('No active filters to save', 'warning');
            return;
        }
        
        const searchName = prompt('Enter a name for this saved search:', 
                                  `Search ${new Date().toLocaleDateString()}`);
        
        if (searchName) {
            const savedSearch = {
                id: Date.now(),
                name: searchName,
                type: document.querySelector('.search-tab.active').dataset.tab,
                filters: { ...this.filters },
                quickTerm: document.getElementById('quickSearchInput')?.value.trim() || '',
                createdAt: new Date().toISOString()
            };
            
            this.savedSearches.push(savedSearch);
            this.saveSavedSearches();
            this.displaySavedSearches();
            this.showToast('Search saved successfully', 'success');
        }
    }
    
    /**
     * Load saved search
     */
    loadSavedSearch(search) {
        if (search.type === 'quick') {
            // Switch to quick search tab
            this.switchTab('quick');
            const quickInput = document.getElementById('quickSearchInput');
            if (quickInput) {
                quickInput.value = search.quickTerm;
                this.quickSearch();
            }
        } else {
            // Switch to advanced search tab
            this.switchTab('advanced');
            
            // Set filter values
            if (search.filters) {
                Object.keys(search.filters).forEach(key => {
                    const input = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
                    if (input && search.filters[key]) {
                        input.value = search.filters[key];
                    }
                });
                
                // Special handling for minAge and maxAge
                if (search.filters.minAge) {
                    const minAgeInput = document.getElementById('minAge');
                    if (minAgeInput) minAgeInput.value = search.filters.minAge;
                }
                if (search.filters.maxAge) {
                    const maxAgeInput = document.getElementById('maxAge');
                    if (maxAgeInput) maxAgeInput.value = search.filters.maxAge;
                }
                if (search.filters.fromDate) {
                    const fromDateInput = document.getElementById('fromDate');
                    if (fromDateInput) fromDateInput.value = search.filters.fromDate;
                }
                if (search.filters.toDate) {
                    const toDateInput = document.getElementById('toDate');
                    if (toDateInput) toDateInput.value = search.filters.toDate;
                }
                
                this.advancedSearch();
            }
        }
        
        this.showToast(`Loaded: ${search.name}`, 'success');
    }
    
    /**
     * Delete saved search
     */
    deleteSavedSearch(id) {
        if (confirm('Are you sure you want to delete this saved search?')) {
            this.savedSearches = this.savedSearches.filter(s => s.id !== id);
            this.saveSavedSearches();
            this.displaySavedSearches();
            this.showToast('Saved search deleted', 'success');
        }
    }
    
    /**
     * Display saved searches
     */
    displaySavedSearches() {
        const container = document.getElementById('savedSearchesList');
        if (!container) return;
        
        if (this.savedSearches.length === 0) {
            container.innerHTML = '<div class="empty-state-small">No saved searches yet</div>';
            return;
        }
        
        container.innerHTML = this.savedSearches.map(search => `
            <div class="search-tag" data-id="${search.id}">
                <i class="fas fa-search"></i>
                <span class="search-name">${this.escapeHtml(search.name)}</span>
                <span class="search-date">${new Date(search.createdAt).toLocaleDateString()}</span>
                <button class="tag-btn load" data-id="${search.id}" title="Load search">
                    <i class="fas fa-play"></i>
                </button>
                <button class="tag-btn delete" data-id="${search.id}" title="Delete search">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // Add event listeners
        container.querySelectorAll('.tag-btn.load').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const search = this.savedSearches.find(s => s.id === id);
                if (search) this.loadSavedSearch(search);
            });
        });
        
        container.querySelectorAll('.tag-btn.delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteSavedSearch(id);
            });
        });
    }
    
    /**
     * Show search suggestions based on input
     */
    showSuggestions() {
        const input = document.getElementById('quickSearchInput');
        const suggestionsDiv = document.getElementById('searchSuggestions');
        const term = input.value.trim();
        
        if (!term || term.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        const suggestions = this.allPatients
            .filter(p => p.name.toLowerCase().includes(term.toLowerCase()))
            .slice(0, 5);
        
        if (suggestions.length > 0) {
            suggestionsDiv.innerHTML = suggestions.map(p => `
                <div class="suggestion-item" data-name="${this.escapeHtml(p.name)}">
                    <i class="fas fa-user"></i>
                    <strong>${this.escapeHtml(p.name)}</strong>
                    <span class="suggestion-mrn">${p.mrn}</span>
                </div>
            `).join('');
            suggestionsDiv.style.display = 'block';
            
            // Add click handlers
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.dataset.name;
                    suggestionsDiv.innerHTML = '';
                    suggestionsDiv.style.display = 'none';
                    this.quickSearch();
                });
            });
        } else {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.style.display = 'none';
        }
    }
    
    /**
     * Switch between grid and list view
     */
    switchView(view) {
        this.currentView = view;
        
        // Update button states
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Re-display results with new view
        this.displayResults();
    }
    
    /**
     * Display search results
     */
    displayResults() {
        const container = document.getElementById('searchResultsContainer');
        const paginationDiv = document.getElementById('searchPagination');
        const viewToggle = document.getElementById('resultsViewToggle');
        
        if (!container) return;
        
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageResults = this.searchResults.slice(start, end);
        
        if (this.searchResults.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>Try adjusting your search criteria or clearing filters</p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Reset Search
                    </button>
                </div>
            `;
            if (paginationDiv) paginationDiv.style.display = 'none';
            if (viewToggle) viewToggle.style.display = 'none';
            return;
        }
        
        // Show view toggle and pagination
        if (viewToggle) viewToggle.style.display = 'flex';
        if (paginationDiv) paginationDiv.style.display = 'flex';
        
        // Display based on current view
        if (this.currentView === 'grid') {
            this.displayGridView(pageResults, container);
        } else {
            this.displayListView(pageResults, container);
        }
        
        this.updatePagination();
    }
    
    /**
     * Display results in grid view
     */
    displayGridView(results, container) {
        container.innerHTML = `
            <div class="results-grid">
                ${results.map(patient => `
                    <div class="result-card" data-id="${patient.id}">
                        <div class="card-header">
                            <h4>${this.escapeHtml(patient.name)}</h4>
                            <div class="card-badges">
                                <span class="badge badge-primary">${patient.mrn}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="info-row">
                                <span class="info-label">Father:</span>
                                <span class="info-value">${this.escapeHtml(patient.father_name || '-')}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Gender:</span>
                                <span class="info-value">
                                    <i class="fas ${patient.gender === 'Male' ? 'fa-mars' : 'fa-venus'}"></i>
                                    ${patient.gender}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Age:</span>
                                <span class="info-value">${patient.age} years</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Phone:</span>
                                <span class="info-value">
                                    <a href="tel:${patient.phone_number}">${patient.phone_number}</a>
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Region:</span>
                                <span class="info-value">${this.escapeHtml(patient.region)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Registered:</span>
                                <span class="info-value">${new Date(patient.registration_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="action-btn view" data-id="${patient.id}" title="View Details">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${this.canEditPatient(patient) ? `
                            <button class="action-btn edit" data-id="${patient.id}" title="Edit">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            ` : ''}
                            <button class="action-btn pdf" data-id="${patient.id}" title="Download PDF">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.attachCardEventListeners();
    }
    
    /**
     * Display results in list view
     */
    displayListView(results, container) {
        container.innerHTML = `
            <div class="results-list active">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>MRN</th>
                            <th>Name</th>
                            <th>Father's Name</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>Phone</th>
                            <th>Region</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(patient => `
                            <tr data-id="${patient.id}">
                                <td><strong>${patient.mrn}</strong></td>
                                <td>${this.escapeHtml(patient.name)}</td>
                                <td>${this.escapeHtml(patient.father_name || '-')}</td>
                                <td>${patient.gender}</td>
                                <td>${patient.age}</td>
                                <td>${patient.phone_number}</td>
                                <td>${this.escapeHtml(patient.region)}</td>
                                <td>
                                    <div class="action-buttons-group">
                                        <button class="action-btn view" data-id="${patient.id}" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${this.canEditPatient(patient) ? `
                                        <button class="action-btn edit" data-id="${patient.id}" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ` : ''}
                                        <button class="action-btn pdf" data-id="${patient.id}" title="PDF">
                                            <i class="fas fa-file-pdf"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        this.attachCardEventListeners();
    }
    
    /**
     * Attach event listeners to result cards
     */
    attachCardEventListeners() {
        // View button
        document.querySelectorAll('.action-btn.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.viewPatient(id);
            });
        });
        
        // Edit button
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.editPatient(id);
            });
        });
        
        // PDF button
        document.querySelectorAll('.action-btn.pdf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.downloadPDF(id);
            });
        });
        
        // Card click for grid view
        document.querySelectorAll('.result-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                if (id) this.viewPatient(id);
            });
        });
        
        // Row click for list view
        document.querySelectorAll('.results-table tbody tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    const id = row.dataset.id;
                    if (id) this.viewPatient(id);
                }
            });
        });
    }
    
    /**
     * Update pagination
     */
    updatePagination() {
        const totalPages = Math.ceil(this.searchResults.length / this.pageSize);
        const paginationDiv = document.getElementById('searchPagination');
        
        if (!paginationDiv || totalPages <= 1) {
            if (paginationDiv) paginationDiv.innerHTML = '';
            return;
        }
        
        let paginationHtml = '<div class="pagination-controls">';
        
        // Previous button
        paginationHtml += `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    data-page="${this.currentPage - 1}" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            paginationHtml += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        if (totalPages > 5) {
            paginationHtml += `<span class="page-dots">...</span>`;
            paginationHtml += `
                <button class="page-btn" data-page="${totalPages}">
                    ${totalPages}
                </button>
            `;
        }
        
        // Next button
        paginationHtml += `
            <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    data-page="${this.currentPage + 1}" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationHtml += '</div>';
        paginationDiv.innerHTML = paginationHtml;
        
        // Add event listeners
        document.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page) && page !== this.currentPage) {
                    this.currentPage = page;
                    this.displayResults();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }
    
    /**
     * Show search statistics
     */
    showSearchStats(searchTime) {
        const statsDiv = document.getElementById('searchStats');
        const resultCountSpan = document.getElementById('resultCount');
        const searchTimeSpan = document.getElementById('searchTime');
        
        if (statsDiv && resultCountSpan && searchTimeSpan) {
            resultCountSpan.textContent = this.searchResults.length;
            searchTimeSpan.textContent = searchTime;
            statsDiv.style.display = 'block';
        }
    }
    
    /**
     * Display active filters
     */
    displayActiveFilters() {
        const activeFiltersDiv = document.getElementById('activeFilters');
        if (!activeFiltersDiv) return;
        
        const active = [];
        
        if (this.filters.name) active.push(`Name: ${this.filters.name}`);
        if (this.filters.mrn) active.push(`MRN: ${this.filters.mrn}`);
        if (this.filters.phone) active.push(`Phone: ${this.filters.phone}`);
        if (this.filters.gender) active.push(`Gender: ${this.filters.gender}`);
        if (this.filters.region) active.push(`Region: ${this.filters.region}`);
        if (this.filters.minAge) active.push(`Min Age: ${this.filters.minAge}`);
        if (this.filters.maxAge) active.push(`Max Age: ${this.filters.maxAge}`);
        
        if (active.length === 0) {
            activeFiltersDiv.innerHTML = '';
            return;
        }
        
        activeFiltersDiv.innerHTML = `
            <strong>Active Filters:</strong>
            ${active.map(filter => `
                <span class="filter-tag">
                    ${filter}
                    <i class="fas fa-times" data-filter="${filter}"></i>
                </span>
            `).join('')}
        `;
        
        // Add remove filter functionality
        activeFiltersDiv.querySelectorAll('.filter-tag i').forEach(icon => {
            icon.addEventListener('click', () => {
                const filterText = icon.parentElement.textContent.trim();
                this.removeFilter(filterText);
            });
        });
    }
    
    /**
     * Remove specific filter
     */
    removeFilter(filterText) {
        const filterKey = filterText.split(':')[0].toLowerCase();
        
        if (filterKey === 'name') {
            document.getElementById('filterName').value = '';
            this.filters.name = '';
        } else if (filterKey === 'mrn') {
            document.getElementById('filterMRN').value = '';
            this.filters.mrn = '';
        } else if (filterKey === 'phone') {
            document.getElementById('filterPhone').value = '';
            this.filters.phone = '';
        } else if (filterKey === 'gender') {
            document.getElementById('filterGender').value = '';
            this.filters.gender = '';
        } else if (filterKey === 'region') {
            document.getElementById('filterRegion').value = '';
            this.filters.region = '';
        }
        
        this.advancedSearch();
    }
    
    /**
     * Toggle filters visibility
     */
    toggleFilters() {
        const content = document.getElementById('filtersContent');
        const icon = document.querySelector('#filtersHeader .toggle-icon');
        
        if (content && icon) {
            content.classList.toggle('collapsed');
            icon.classList.toggle('fa-chevron-up');
            icon.classList.toggle('fa-chevron-down');
        }
    }
    
    /**
     * View patient details
    
    viewPatient(id) {
        window.location.hash = `patient/${id}`;
    }     */
    
    async viewPatient(id) {
        // Navigate to detail page
        const contentArea = document.getElementById('content-area');
        const { PatientDetail } = await import('./patientDetail.js');
        const detailPage = new PatientDetail(id);
        contentArea.innerHTML = await detailPage.render();
        await detailPage.loadPatientDetails();
    }

    canEditPatient(patient) {
        if (!this.isDentist) return true;
        return patient.assignment_status === 'confirmed';
    }

    /**
     * Edit patient
     */
    async editPatient(id) {
        const contentArea = document.getElementById('content-area');
        const { PatientEdit } = await import('./patientEdit.js');
        const editPage = new PatientEdit(id);
        contentArea.innerHTML = await editPage.render();
        await editPage.loadPatientData();
    }

    /**
     * Download patient PDF
     */
    downloadPDF(id) {
        const patient = this.allPatients.find(p => p.id === id);
        if (patient) {
            import('../../services/exportService.js').then(({ printPatientRecord }) => {
                printPatientRecord(patient);
            });
        }
        this.showToast('Opening print view...', 'info');
    }
    
    /**
     * Load saved searches from localStorage
     */
    loadSavedSearches() {
        const saved = localStorage.getItem('patient_saved_searches');
        return saved ? JSON.parse(saved) : [];
    }
    
    /**
     * Save saved searches to localStorage
     */
    saveSavedSearches() {
        localStorage.setItem('patient_saved_searches', JSON.stringify(this.savedSearches));
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('searchResultsContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        if (window.Toast) {
            window.Toast.show(message, type);
        } else {
            alert(message);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}