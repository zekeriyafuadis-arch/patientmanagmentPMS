/**
 * Patients List Page Module
 * Handles displaying, searching, and managing all patients
 */

export class Patients {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.allPatients = [];
        this.filteredPatients = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentSort = { column: 'created_at', order: 'desc' };
        this.currentFilter = '';
        this.selectedPatients = new Set();
    }
    
    /**
     * Render the patients page HTML
     */
    async render() {
        return `
            <div class="patients-container">
                <!-- Header -->
                <div class="patients-header">
                    <h1>
                        <i class="fas fa-users"></i>
                        All Patients
                    </h1>
                    <div class="header-stats" id="headerStats">
                        <span class="stat-badge">
                            <i class="fas fa-chart-line"></i>
                            <span id="totalCount">0</span> Total Patients
                        </span>
                    </div>
                </div>
                
                <!-- Controls Bar -->
                <div class="patients-controls">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input 
                            type="text" 
                            id="searchInput" 
                            placeholder="Search by name, MRN, phone, father's name..."
                            autocomplete="off"
                        >
                    </div>
                    
                    <div class="filter-dropdown">
                        <button class="filter-btn" id="filterBtn">
                            <i class="fas fa-filter"></i>
                            Filter
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="filter-menu" id="filterMenu">
                            <div class="filter-menu-item" data-filter="all">
                                <i class="fas fa-list"></i> All Patients
                            </div>
                            <div class="filter-menu-item" data-filter="male">
                                <i class="fas fa-mars"></i> Male Only
                            </div>
                            <div class="filter-menu-item" data-filter="female">
                                <i class="fas fa-venus"></i> Female Only
                            </div>
                            <div class="filter-menu-item" data-filter="recent">
                                <i class="fas fa-calendar-week"></i> Last 30 Days
                            </div>
                        </div>
                    </div>
                    
                    <div class="export-buttons">
                        <button class="export-btn csv" id="exportCSVBtn">
                            <i class="fas fa-file-csv"></i>
                            CSV
                        </button>
                        <button class="export-btn excel" id="exportExcelBtn">
                            <i class="fas fa-file-excel"></i>
                            Excel
                        </button>
                        <button class="export-btn pdf" id="exportPDFBtn">
                            <i class="fas fa-file-pdf"></i>
                            PDF
                        </button>
                        <button class="export-btn print" id="printAllBtn">
                            <i class="fas fa-print"></i>
                            Print
                        </button>
                    </div>
                </div>
                
                <!-- Table Container -->
                <div class="patients-table-container">
                    <table class="patients-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort="mrn">
                                    MRN <i class="fas fa-sort"></i>
                                </th>
                                <th class="sortable" data-sort="name">
                                    Name <i class="fas fa-sort"></i>
                                </th>
                                <th class="sortable" data-sort="father_name">
                                    Father's Name <i class="fas fa-sort"></i>
                                </th>
                                <th class="sortable" data-sort="gender">
                                    Gender <i class="fas fa-sort"></i>
                                </th>
                                <th class="sortable" data-sort="age">
                                    Age <i class="fas fa-sort"></i>
                                </th>
                                <th>Phone</th>
                                <th class="sortable" data-sort="region">
                                    Region <i class="fas fa-sort"></i>
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="patientsTableBody">
                            <tr>
                                <td colspan="8">
                                    <div class="loading-state">
                                        <div class="loading-spinner"></div>
                                        <p>Loading patients...</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination -->
                <div class="pagination-wrapper">
                    <div class="pagination-info" id="paginationInfo">
                        Showing 0 to 0 of 0 entries
                    </div>
                    <div class="pagination" id="pagination">
                        <!-- Pagination buttons will be inserted here -->
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Load all patients from API
     */
    async loadPatients() {
        try {
            const response = await fetch(`${this.apiUrl}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.allPatients = data.data;
                this.filteredPatients = [...this.allPatients];
                this.applyFilter();
                this.applySort();
                this.updateTable();
                this.updateStats();
                this.setupEventListeners();
            } else {
                this.showError('Failed to load patients');
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            this.showError('Error connecting to server');
        }
    }
    
    /**
     * Apply gender filter
     */
    applyFilter() {
        if (this.currentFilter === 'male') {
            this.filteredPatients = this.allPatients.filter(p => p.gender === 'Male');
        } else if (this.currentFilter === 'female') {
            this.filteredPatients = this.allPatients.filter(p => p.gender === 'Female');
        } else if (this.currentFilter === 'recent') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            this.filteredPatients = this.allPatients.filter(p => 
                new Date(p.registration_date) >= thirtyDaysAgo
            );
        } else {
            this.filteredPatients = [...this.allPatients];
        }
        
        // Apply search filter
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        if (searchTerm) {
            this.filteredPatients = this.filteredPatients.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.mrn.toLowerCase().includes(searchTerm) ||
                p.phone_number.includes(searchTerm) ||
                (p.father_name && p.father_name.toLowerCase().includes(searchTerm))
            );
        }
        
        this.currentPage = 1;
    }
    
    /**
     * Apply sorting to filtered patients
     */
    applySort() {
        this.filteredPatients.sort((a, b) => {
            let aVal = a[this.currentSort.column];
            let bVal = b[this.currentSort.column];
            
            // Handle different data types
            if (this.currentSort.column === 'age') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            } else if (this.currentSort.column === 'created_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }
            
            if (aVal < bVal) return this.currentSort.order === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    /**
     * Update the table with current page data
     */
    updateTable() {
        const tbody = document.getElementById('patientsTableBody');
        if (!tbody) return;
        
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pagePatients = this.filteredPatients.slice(start, end);
        
        if (pagePatients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state-table">
                            <i class="fas fa-user-slash"></i>
                            <h3>No Patients Found</h3>
                            <p>No patients match your search criteria</p>
                            <button class="btn-primary" onclick="window.location.hash='register'">
                                <i class="fas fa-user-plus"></i> Register New Patient
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = pagePatients.map(patient => `
            <tr data-patient-id="${patient.id}" class="${this.selectedPatients.has(patient.id) ? 'selected' : ''}">
                <td>
                    <strong>${this.escapeHtml(patient.mrn)}</strong>
                </td>
                <td>
                    <div class="patient-name-cell">
                        <i class="fas fa-user-circle"></i>
                        ${this.escapeHtml(patient.name)}
                    </div>
                </td>
                <td>${this.escapeHtml(patient.father_name || '-')}</td>
                <td>
                    <span class="gender-badge gender-${patient.gender.toLowerCase()}">
                        <i class="fas ${patient.gender === 'Male' ? 'fa-mars' : 'fa-venus'}"></i>
                        ${patient.gender}
                    </span>
                </td>
                <td>${patient.age} years</td>
                <td>
                    <a href="tel:${patient.phone_number}" class="phone-link">
                        <i class="fas fa-phone-alt"></i> ${patient.phone_number}
                    </a>
                </td>
                <td>
                    <i class="fas fa-location-dot"></i>
                    ${this.escapeHtml(patient.region)}
                </td>
                <td>
                    <div class="action-buttons-group">
                        <button class="action-btn view" data-id="${patient.id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-id="${patient.id}" title="Edit Patient">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn pdf" data-id="${patient.id}" title="Download PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="action-btn delete" data-id="${patient.id}" title="Delete Patient">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        this.updatePagination();
    }
    
    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredPatients.length / this.pageSize);
        const paginationDiv = document.getElementById('pagination');
        const infoDiv = document.getElementById('paginationInfo');
        
        if (!paginationDiv) return;
        
        // Update info text
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(start + this.pageSize - 1, this.filteredPatients.length);
        if (infoDiv) {
            infoDiv.innerHTML = `
                <i class="fas fa-chart-simple"></i>
                Showing ${start} to ${end} of ${this.filteredPatients.length} entries
            `;
        }
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
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
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            paginationHtml += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) paginationHtml += `<span class="page-dots">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHtml += `<span class="page-dots">...</span>`;
            paginationHtml += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
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
        
        // Add event listeners to pagination buttons
        document.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page) && page !== this.currentPage) {
                    this.currentPage = page;
                    this.updateTable();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }
    
    /**
     * Update statistics
     */
    updateStats() {
        const totalCountSpan = document.getElementById('totalCount');
        if (totalCountSpan) {
            totalCountSpan.textContent = this.allPatients.length;
        }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.applyFilter();
                this.applySort();
                this.updateTable();
            });
        }
        
        // Sortable columns
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (this.currentSort.column === column) {
                    this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.column = column;
                    this.currentSort.order = 'asc';
                }
                
                // Update sort icons
                document.querySelectorAll('.sortable i').forEach(icon => {
                    icon.className = 'fas fa-sort';
                });
                const icon = header.querySelector('i');
                icon.className = `fas fa-sort-${this.currentSort.order === 'asc' ? 'up' : 'down'}`;
                
                this.applySort();
                this.updateTable();
            });
        });
        
        // Filter dropdown
        const filterBtn = document.getElementById('filterBtn');
        const filterMenu = document.getElementById('filterMenu');
        
        if (filterBtn && filterMenu) {
            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filterMenu.classList.toggle('show');
            });
            
            document.querySelectorAll('.filter-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const filter = item.dataset.filter;
                    this.currentFilter = filter;
                    this.applyFilter();
                    this.applySort();
                    this.updateTable();
                    filterMenu.classList.remove('show');
                    
                    // Update button text
                    const filterText = item.textContent.trim();
                    filterBtn.innerHTML = `<i class="fas fa-filter"></i> ${filterText} <i class="fas fa-chevron-down"></i>`;
                });
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                filterMenu.classList.remove('show');
            });
        }
        
        // Export buttons
        const exportCSV = document.getElementById('exportCSVBtn');
        const exportExcel = document.getElementById('exportExcelBtn');
        const exportPDF = document.getElementById('exportPDFBtn');
        const printAll = document.getElementById('printAllBtn');
        
        if (exportCSV) exportCSV.addEventListener('click', () => this.exportToCSV());
        if (exportExcel) exportExcel.addEventListener('click', () => this.exportToExcel());
        if (exportPDF) exportPDF.addEventListener('click', () => this.exportToPDF());
        if (printAll) printAll.addEventListener('click', () => this.printAllPatients());
        
        // Action buttons (delegation)
        document.getElementById('patientsTableBody')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;
            
            const id = btn.dataset.id;
            if (btn.classList.contains('view')) {
                this.viewPatient(id);
            } else if (btn.classList.contains('edit')) {
                this.editPatient(id);
            } else if (btn.classList.contains('pdf')) {
                this.downloadPDF(id);
            } else if (btn.classList.contains('delete')) {
                this.deletePatient(id);
            }
        });
    }
    
    /**
     * View patient details
     
    async viewPatient(id) {
        window.location.hash = `patient/${id}`;
    }    */

    async viewPatient(id) {
        // Navigate to detail page
        const contentArea = document.getElementById('content-area');
        const { PatientDetail } = await import('./patientDetail.js');
        const detailPage = new PatientDetail(this.apiUrl, id);
        contentArea.innerHTML = await detailPage.render();
        await detailPage.loadPatientDetails();
    }
    
    /**
     * Edit patient
    
    async editPatient(id) {
        window.location.hash = `edit/${id}`;
    }    */
    
     async editPatient(id) {
    // Load edit form
    const contentArea = document.getElementById('content-area');
    const { PatientEdit } = await import('./patientEdit.js');
    const editPage = new PatientEdit(this.apiUrl, id);
    contentArea.innerHTML = await editPage.render();
    await editPage.loadPatientData();
}

    /**
     * Download single patient PDF
     */
    downloadPDF(id) {
        window.open(`${this.apiUrl}/export/pdf/${id}`, '_blank');
        this.showToast('Downloading PDF...', 'info');
    }
    
    /**
     * Delete patient
     */
    async deletePatient(id) {
        const confirmModal = confirm('Are you sure you want to delete this patient? This action cannot be undone!');
        
        if (confirmModal) {
            try {
                const response = await fetch(`${this.apiUrl}/${id}`, { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    this.showToast('Patient deleted successfully', 'success');
                    await this.loadPatients();
                } else {
                    this.showToast('Error deleting patient', 'error');
                }
            } catch (error) {
                console.error('Error deleting patient:', error);
                this.showToast('Error connecting to server', 'error');
            }
        }
    }
    
    /**
     * Export to CSV
     */
    async exportToCSV() {
        try {
            const response = await fetch(`${this.apiUrl}/export/csv`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this.showToast('CSV exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showToast('Error exporting CSV', 'error');
        }
    }
    
    /**
     * Export to Excel
     */
    async exportToExcel() {
        try {
            window.open(`${this.apiUrl}/export/excel`, '_blank');
            this.showToast('Excel export started', 'success');
        } catch (error) {
            console.error('Error exporting Excel:', error);
            this.showToast('Error exporting Excel', 'error');
        }
    }
    
    /**
     * Export to PDF
     */
    async exportToPDF() {
        try {
            window.open(`${this.apiUrl}/export/pdf/all`, '_blank');
            this.showToast('PDF export started', 'success');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showToast('Error exporting PDF', 'error');
        }
    }
    
    /**
     * Print all patients
     */
    printAllPatients() {
        const printWindow = window.open('', '_blank');
        const patients = this.filteredPatients;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>All Patients List</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        padding: 20px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #667eea;
                    }
                    .header h1 {
                        color: #667eea;
                        margin-bottom: 10px;
                    }
                    .header p {
                        color: #666;
                        margin: 5px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 10px;
                        text-align: left;
                    }
                    th {
                        background: #667eea;
                        color: white;
                        font-weight: 600;
                    }
                    tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 12px;
                        color: #999;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                    }
                    @media print {
                        body {
                            padding: 10px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏥 SAYDOC Patient Management System</h1>
                    <p>All Patients Report</p>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                    <p>Total Patients: ${patients.length}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>MRN</th>
                            <th>Name</th>
                            <th>Father's Name</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>Phone</th>
                            <th>Region</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patients.map(patient => `
                            <tr>
                                <td>${this.escapeHtml(patient.mrn)}</td>
                                <td>${this.escapeHtml(patient.name)}</td>
                                <td>${this.escapeHtml(patient.father_name || '-')}</td>
                                <td>${patient.gender}</td>
                                <td>${patient.age}</td>
                                <td>${patient.phone_number}</td>
                                <td>${this.escapeHtml(patient.region)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>This is saydoc helthcare generated document. orginal print on saydoc.</p>
                    <p>Patient Management System - Official Medical Record</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
        this.showToast('Print job sent', 'success');
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const tbody = document.getElementById('patientsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state-table">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Error</h3>
                            <p>${message}</p>
                            <button class="btn-primary" onclick="location.reload()">
                                <i class="fas fa-sync-alt"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
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