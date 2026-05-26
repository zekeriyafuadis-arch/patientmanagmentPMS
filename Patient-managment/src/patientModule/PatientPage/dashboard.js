export class Dashboard {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.charts = {};
    }
    
    async render() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>
                        <i class="fas fa-chart-line"></i>
                        Healthcare Dashboard
                    </h1>
                    <div class="dashboard-subtitle">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Last updated: ${new Date().toLocaleString()}</span>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card" data-tooltip="Total number of patients registered">
                        <div class="stat-icon-wrapper">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>12%</span>
                            </div>
                        </div>
                        <div class="stat-content">
                            <h3>Total Patients</h3>
                            <div class="stat-number" id="totalPatients">0</div>
                            <div class="stat-description">All time registered patients</div>
                        </div>
                        <div class="stat-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card" data-tooltip="Patients registered in the last 30 days">
                        <div class="stat-icon-wrapper">
                            <div class="stat-icon">
                                <i class="fas fa-calendar-week"></i>
                            </div>
                            <div class="stat-trend up">
                                <i class="fas fa-arrow-up"></i>
                                <span>8%</span>
                            </div>
                        </div>
                        <div class="stat-content">
                            <h3>Last 30 Days</h3>
                            <div class="stat-number" id="last30Days">0</div>
                            <div class="stat-description">New registrations</div>
                        </div>
                    </div>
                    
                    <div class="stat-card" data-tooltip="Total male patients">
                        <div class="stat-icon-wrapper">
                            <div class="stat-icon">
                                <i class="fas fa-mars"></i>
                            </div>
                            <div class="stat-trend">
                                <i class="fas fa-chart-line"></i>
                            </div>
                        </div>
                        <div class="stat-content">
                            <h3>Male Patients</h3>
                            <div class="stat-number" id="malePatients">0</div>
                            <div class="stat-description">Male population</div>
                        </div>
                    </div>
                    
                    <div class="stat-card" data-tooltip="Total female patients">
                        <div class="stat-icon-wrapper">
                            <div class="stat-icon">
                                <i class="fas fa-venus"></i>
                            </div>
                            <div class="stat-trend">
                                <i class="fas fa-chart-line"></i>
                            </div>
                        </div>
                        <div class="stat-content">
                            <h3>Female Patients</h3>
                            <div class="stat-number" id="femalePatients">0</div>
                            <div class="stat-description">Female population</div>
                        </div>
                    </div>
                </div>
                
                <!-- Charts Section -->
                <div class="charts-section">
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>
                                <i class="fas fa-chart-pie"></i>
                                Gender Distribution
                            </h3>
                            <div class="chart-date">Current Statistics</div>
                        </div>
                        <div class="chart-container">
                            <canvas id="genderChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>
                                <i class="fas fa-chart-line"></i>
                                Patient Registration Trend
                            </h3>
                            <div class="chart-date">Last 6 months</div>
                        </div>
                        <div class="chart-container">
                            <canvas id="trendChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Activity Section -->
                <div class="recent-section">
                    <div class="recent-card">
                        <div class="recent-header">
                            <h3>
                                <i class="fas fa-clock"></i>
                                Recent Patients
                            </h3>
                            <a href="#patients" class="view-all-link">View All →</a>
                        </div>
                        <div id="recentPatientsList" class="recent-patients-list">
                            <div class="loading">Loading recent patients...</div>
                        </div>
                    </div>
                    
                    <div class="recent-card">
                        <div class="recent-header">
                            <h3>
                                <i class="fas fa-history"></i>
                                Recent Activity
                            </h3>
                            <div class="view-all-link">Last 7 days</div>
                        </div>
                        <div id="activityTimeline" class="activity-timeline">
                            <div class="loading">Loading activities...</div>
                        </div>
                    </div>
                </div>
                
                <!-- Alerts Section -->
                <div id="alertsSection" class="alerts-section"></div>
                
                <!-- Quick Actions -->
                <div class="quick-actions">
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" onclick="window.location.hash='register'">
                            <i class="fas fa-user-plus"></i>
                            <span>Register Patient</span>
                        </button>
                        <button class="quick-action-btn" onclick="window.location.hash='search'">
                            <i class="fas fa-search"></i>
                            <span>Search Patient</span>
                        </button>
                        <button class="quick-action-btn" id="exportReportBtn">
                            <i class="fas fa-download"></i>
                            <span>Export Report</span>
                        </button>
                        <button class="quick-action-btn" id="printDashboardBtn">
                            <i class="fas fa-print"></i>
                            <span>Print Dashboard</span>
                        </button>
                    </div>
                </div>
                
                <div class="dashboard-footer">
                    <p>
                        <i class="fas fa-heart"></i>
                        Patient Management System | Comprehensive Healthcare Solution
                        <i class="fas fa-chart-line"></i>
                    </p>
                </div>
            </div>
        `;
    }
    
    async loadStats() {
        try {
            const response = await fetch(`${this.apiUrl}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                const patients = data.data;
                const total = patients.length;
                
                // Calculate last 30 days registrations
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const last30Days = patients.filter(p => new Date(p.registration_date) >= thirtyDaysAgo).length;
                
                const malePatients = patients.filter(p => p.gender === 'Male').length;
                const femalePatients = patients.filter(p => p.gender === 'Female').length;
                
                // Animate numbers
                this.animateNumber('totalPatients', 0, total);
                this.animateNumber('last30Days', 0, last30Days);
                this.animateNumber('malePatients', 0, malePatients);
                this.animateNumber('femalePatients', 0, femalePatients);
                
                // Update progress bar
                const percentage = (total / 1000) * 100; // Assuming 1000 is target
                document.querySelector('.progress-fill').style.width = `${Math.min(percentage, 100)}%`;
                
                // Load charts
                this.loadGenderChart(malePatients, femalePatients);
                this.loadTrendChart(patients);
                this.loadRecentPatients(patients);
                this.loadActivityTimeline(patients);
                this.checkAlerts(patients);
                
                // Setup event listeners
                this.setupEventListeners();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError();
        }
    }
    
    animateNumber(elementId, start, end) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        let current = start;
        const increment = end / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                element.textContent = end;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 20);
    }
    
    async loadGenderChart(male, female) {
        try {
            const Chart = window.Chart;
            const ctx = document.getElementById('genderChart')?.getContext('2d');
            if (ctx && Chart) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Male', 'Female', 'Other'],
                        datasets: [{
                            data: [male, female, 0],
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.8)',
                                'rgba(255, 99, 132, 0.8)',
                                'rgba(255, 206, 86, 0.8)'
                            ],
                            borderColor: [
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 99, 132, 1)',
                                'rgba(255, 206, 86, 1)'
                            ],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const total = male + female;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading gender chart:', error);
        }
    }
    
    async loadTrendChart(patients) {
        try {
            const Chart = window.Chart;
            const ctx = document.getElementById('trendChart')?.getContext('2d');
            
            if (ctx && Chart) {
                // Group patients by month
                const monthlyData = {};
                const last6Months = [];
                
                for (let i = 5; i >= 0; i--) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                    last6Months.push(monthYear);
                    monthlyData[monthYear] = 0;
                }
                
                patients.forEach(patient => {
                    const date = new Date(patient.registration_date);
                    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                    if (monthlyData[monthYear] !== undefined) {
                        monthlyData[monthYear]++;
                    }
                });
                
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: last6Months,
                        datasets: [{
                            label: 'New Patients',
                            data: last6Months.map(month => monthlyData[month]),
                            borderColor: 'rgba(102, 126, 234, 1)',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Patients: ${context.raw}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                },
                                title: {
                                    display: true,
                                    text: 'Number of Patients'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Month'
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading trend chart:', error);
        }
    }
    
    loadRecentPatients(patients) {
        const recentList = document.getElementById('recentPatientsList');
        const recentPatients = patients.slice(0, 10);
        
        if (recentPatients.length === 0) {
            recentList.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>No patients found</p></div>';
            return;
        }
        
        recentList.innerHTML = recentPatients.map(patient => `
            <div class="recent-patient-item" onclick="window.location.hash='patient/${patient.id}'">
                <div class="patient-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="patient-info">
                    <div class="patient-name">${patient.name}</div>
                    <div class="patient-details">
                        <span><i class="fas fa-id-card"></i> ${patient.mrn}</span>
                        <span><i class="fas fa-phone"></i> ${patient.phone_number}</span>
                    </div>
                </div>
                <div class="patient-date">
                    ${new Date(patient.registration_date).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    }
    
    loadActivityTimeline(patients) {
        const timeline = document.getElementById('activityTimeline');
        const recentActivities = patients.slice(0, 8);
        
        const activities = [];
        const icons = ['fa-user-plus', 'fa-stethoscope', 'fa-heartbeat', 'fa-calendar-check'];
        
        recentActivities.forEach((patient, index) => {
            activities.push(`
                <div class="timeline-item">
                    <div class="timeline-icon">
                        <i class="fas ${icons[index % icons.length]}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">New Patient Registration</div>
                        <div class="timeline-description">${patient.name} (${patient.mrn}) was registered</div>
                        <div class="timeline-time">${new Date(patient.registration_date).toLocaleString()}</div>
                    </div>
                </div>
            `);
        });
        
        if (activities.length === 0) {
            timeline.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No recent activities</p></div>';
        } else {
            timeline.innerHTML = activities.join('');
        }
    }
    
    checkAlerts(patients) {
        const alertsDiv = document.getElementById('alertsSection');
        const today = new Date().toISOString().split('T')[0];
        const todayRegistrations = patients.filter(p => p.registration_date.split('T')[0] === today).length;
        
        if (todayRegistrations === 0) {
            alertsDiv.innerHTML = `
                <div class="alert-card">
                    <div class="alert-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">No Registrations Today</div>
                        <div class="alert-message">No patients have been registered today. Consider outreach activities.</div>
                    </div>
                    <button class="alert-action" onclick="window.location.hash='register'">Register Now</button>
                </div>
            `;
        } else if (patients.length > 800) {
            alertsDiv.innerHTML = `
                <div class="alert-card">
                    <div class="alert-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">High Patient Volume</div>
                        <div class="alert-message">Patient count is approaching capacity. Consider system optimization.</div>
                    </div>
                    <button class="alert-action" onclick="location.reload()">Refresh</button>
                </div>
            `;
        }
    }
    
    setupEventListeners() {
        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportDashboardReport());
        }
        
        const printBtn = document.getElementById('printDashboardBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printDashboard());
        }
    }
    
    async exportDashboardReport() {
        try {
            const response = await fetch(`${this.apiUrl}`);
            const data = await response.json();
            
            if (data.success) {
                const stats = {
                    total: data.data.length,
                    male: data.data.filter(p => p.gender === 'Male').length,
                    female: data.data.filter(p => p.gender === 'Female').length,
                    last30Days: data.data.filter(p => new Date(p.registration_date) >= new Date(Date.now() - 30*24*60*60*1000)).length
                };
                
                const report = `Healthcare Dashboard Report
Generated: ${new Date().toLocaleString()}

STATISTICS SUMMARY:
==================
Total Patients: ${stats.total}
Male Patients: ${stats.male}
Female Patients: ${stats.female}
Last 30 Days Registrations: ${stats.last30Days}

PATIENT LIST:
=============
${data.data.map(p => `${p.name} (${p.mrn}) - ${p.phone_number}`).join('\n')}

Report generated by Patient Management System`;
                
                const blob = new Blob([report], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard_report_${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                
                if (window.Toast) {
                    window.Toast.show('Dashboard report exported successfully!', 'success');
                }
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            if (window.Toast) {
                window.Toast.show('Error exporting report', 'error');
            }
        }
    }
    
    printDashboard() {
        window.print();
    }
    
    showError() {
        const stats = ['totalPatients', 'last30Days', 'malePatients', 'femalePatients'];
        stats.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = 'Error';
        });
        
        const recentList = document.getElementById('recentPatientsList');
        if (recentList) {
            recentList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading data</p></div>';
        }
    }
}