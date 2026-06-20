import { patientService } from '../../services/patientService.js';
import { appointmentService, getStatusMeta, getTypeLabel } from '../../services/appointmentService.js';
import { billingService } from '../../services/billingService.js';
import { clinicMetricsService } from '../../services/clinicMetricsService.js';
import { recallService } from '../../services/recallService.js';
import { adminService } from '../../services/adminService.js';
import { getCurrentRole, canViewRevenue } from '../../services/authService.js';
import { canAccessBilling } from '../../auth/guards.js';
import { getChartPalette, baseLegendOptions, baseScaleOptions, destroyChart } from '../../utils/chartTheme.js';

export class Dashboard {
    constructor() {
        this.charts = {};
        this.chartData = { male: 0, female: 0, patients: [] };
        this.role = getCurrentRole() || 'receptionist';
        this._themeBound = false;
    }

    getDashboardTitle() {
        if (this.role === 'dentist') return 'My Practice Dashboard';
        if (this.role === 'receptionist') return 'Reception Dashboard';
        return 'Clinic Dashboard';
    }

    async render() {
        const title = this.getDashboardTitle();
        const statsGrid = this.renderStatsGrid();
        const showCharts = this.role === 'admin';
        const showDentalOverview = this.role !== 'dentist';
        const showExport = this.role === 'admin';

        return `
            <div class="dashboard-container" data-dashboard-role="${this.role}">
                <div class="dashboard-header">
                    <h1>
                        <i class="fas fa-chart-line"></i>
                        ${title}
                    </h1>
                    <div class="dashboard-subtitle">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Last updated: ${new Date().toLocaleString()}</span>
                    </div>
                </div>

                <div class="stats-grid">
                    ${statsGrid}
                </div>

                ${showDentalOverview ? `
                <div class="dental-overview-section">
                    <div class="dental-overview-header">
                        <h3><i class="fas fa-tooth"></i> Clinic Overview</h3>
                        <a href="#recalls" class="view-all-link">Manage Recalls →</a>
                    </div>
                    <div class="dental-metrics-grid" id="dentalMetricsGrid">
                        <div class="loading">Loading clinic metrics...</div>
                    </div>
                </div>
                ` : ''}

                <div id="pendingConfirmationsSection" class="pending-confirmations-section" style="display:none;">
                    <div class="recent-card pending-confirm-card">
                        <div class="recent-header">
                            <h3><i class="fas fa-user-check"></i> Patients Awaiting Your Confirmation</h3>
                        </div>
                        <div id="pendingConfirmationsList"></div>
                    </div>
                </div>

                ${this.role === 'admin' ? `
                <div id="discountApprovalSection" class="discount-approval-section" style="display:none;">
                    <div class="recent-card discount-inbox-card">
                        <div class="recent-header">
                            <h3><i class="fas fa-percent"></i> Discounts Awaiting Approval</h3>
                            <a href="#billing" class="view-all-link">Open Billing →</a>
                        </div>
                        <div id="discountApprovalList"></div>
                    </div>
                </div>
                ` : ''}

                <div class="today-schedule-section">
                    <div class="recent-card">
                        <div class="recent-header">
                            <h3>
                                <i class="fas fa-calendar-check"></i>
                                ${this.role === 'dentist' ? "Today's Schedule (My Patients)" : "Today's Schedule"}
                            </h3>
                            <a href="#appointments" class="view-all-link">View Calendar →</a>
                        </div>
                        <div id="todayScheduleList" class="today-schedule-list">
                            <div class="loading">Loading today's appointments...</div>
                        </div>
                    </div>
                </div>

                ${showCharts ? `
                <div class="charts-section">
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3><i class="fas fa-chart-pie"></i> Gender Distribution</h3>
                            <div class="chart-date">Current Statistics</div>
                        </div>
                        <div class="chart-container">
                            <canvas id="genderChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3><i class="fas fa-chart-line"></i> Patient Registration Trend</h3>
                            <div class="chart-date">Last 6 months</div>
                        </div>
                        <div class="chart-container">
                            <canvas id="trendChart"></canvas>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="recent-section">
                    <div class="recent-card">
                        <div class="recent-header">
                            <h3><i class="fas fa-clock"></i> ${this.role === 'dentist' ? 'My Recent Patients' : 'Recent Patients'}</h3>
                            <a href="#patients" class="view-all-link">View All →</a>
                        </div>
                        <div id="recentPatientsList" class="recent-patients-list">
                            <div class="loading">Loading recent patients...</div>
                        </div>
                    </div>
                    ${this.role === 'admin' ? `
                    <div class="recent-card">
                        <div class="recent-header">
                            <h3><i class="fas fa-history"></i> Recent Activity</h3>
                            <div class="view-all-link">Last 7 days</div>
                        </div>
                        <div id="activityTimeline" class="activity-timeline">
                            <div class="loading">Loading activities...</div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div id="alertsSection" class="alerts-section"></div>

                <div class="quick-actions">
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" onclick="window.location.hash='appointments'">
                            <i class="fas fa-calendar-plus"></i>
                            <span>Appointments</span>
                        </button>
                        <button class="quick-action-btn" onclick="window.location.hash='recalls'">
                            <i class="fas fa-bell"></i>
                            <span>Recalls</span>
                        </button>
                        ${this.role !== 'dentist' ? `
                        <button class="quick-action-btn" onclick="window.location.hash='register'">
                            <i class="fas fa-user-plus"></i>
                            <span>Register Patient</span>
                        </button>
                        ` : ''}
                        <button class="quick-action-btn" onclick="window.location.hash='search'">
                            <i class="fas fa-search"></i>
                            <span>Search Patient</span>
                        </button>
                        ${canAccessBilling(this.role) ? `
                        <button class="quick-action-btn" onclick="window.location.hash='billing'">
                            <i class="fas fa-file-invoice-dollar"></i>
                            <span>Billing</span>
                        </button>
                        ` : ''}
                        ${showExport ? `
                        <button class="quick-action-btn" id="exportReportBtn">
                            <i class="fas fa-download"></i>
                            <span>Export Report</span>
                        </button>
                        ` : ''}
                        <button class="quick-action-btn" id="printDashboardBtn">
                            <i class="fas fa-print"></i>
                            <span>Print Dashboard</span>
                        </button>
                    </div>
                </div>

                <div class="dashboard-footer">
                    <p>
                        <i class="fas fa-heart"></i>
                        Dr Amin Specialty Dental Clinic | Patient Management
                        <i class="fas fa-chart-line"></i>
                    </p>
                </div>
            </div>
        `;
    }

    renderStatsGrid() {
        if (this.role === 'dentist') {
            return `
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-users"></i></div></div>
                    <div class="stat-content">
                        <h3>My Patients</h3>
                        <div class="stat-number" id="totalPatients">0</div>
                        <div class="stat-description">Assigned and confirmed</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-calendar-day"></i></div></div>
                    <div class="stat-content">
                        <h3>My Appointments Today</h3>
                        <div class="stat-number" id="todayAppointments">0</div>
                        <div class="stat-description">On your schedule today</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-user-clock"></i></div></div>
                    <div class="stat-content">
                        <h3>Awaiting Confirmation</h3>
                        <div class="stat-number" id="pendingConfirmCount">0</div>
                        <div class="stat-description">New patient assignments</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-check-circle"></i></div></div>
                    <div class="stat-content">
                        <h3>Completed (Month)</h3>
                        <div class="stat-number" id="completedMonth">0</div>
                        <div class="stat-description">Visits completed this month</div>
                    </div>
                </div>
            `;
        }

        if (this.role === 'receptionist') {
            return `
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-calendar-day"></i></div></div>
                    <div class="stat-content">
                        <h3>Today's Appointments</h3>
                        <div class="stat-number" id="todayAppointments">0</div>
                        <div class="stat-description">Clinic schedule today</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div></div>
                    <div class="stat-content">
                        <h3>Outstanding Balance</h3>
                        <div class="stat-number" id="outstandingBalance">0.00</div>
                        <div class="stat-description">Unpaid invoice balances</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-bell"></i></div></div>
                    <div class="stat-content">
                        <h3>Overdue Recalls</h3>
                        <div class="stat-number" id="overdueRecalls">0</div>
                        <div class="stat-description">Patients past recall date</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-user-plus"></i></div></div>
                    <div class="stat-content">
                        <h3>Registered Today</h3>
                        <div class="stat-number" id="registeredToday">0</div>
                        <div class="stat-description">New patients today</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="stat-card">
                <div class="stat-icon-wrapper">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                </div>
                <div class="stat-content">
                    <h3>Total Patients</h3>
                    <div class="stat-number" id="totalPatients">0</div>
                    <div class="stat-description">All time registered patients</div>
                </div>
                <div class="stat-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-calendar-day"></i></div></div>
                <div class="stat-content">
                    <h3>Today's Appointments</h3>
                    <div class="stat-number" id="todayAppointments">0</div>
                    <div class="stat-description">Scheduled for today</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-coins"></i></div></div>
                <div class="stat-content">
                    <h3>Revenue Today</h3>
                    <div class="stat-number" id="revenueToday">0.00</div>
                    <div class="stat-description">Payments received today</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrapper"><div class="stat-icon"><i class="fas fa-chart-line"></i></div></div>
                <div class="stat-content">
                    <h3>Revenue This Month</h3>
                    <div class="stat-number" id="revenueMonth">0.00</div>
                    <div class="stat-description">Month-to-date collections</div>
                </div>
            </div>
        `;
    }
    
    async loadStats() {
        try {
            const patientFetch = this.role === 'dentist'
                ? patientService.fetchMine()
                : patientService.fetchAll();
            const todayApptsPromise = appointmentService.getToday().catch(() => []);
            const revenuePromise = canViewRevenue(this.role)
                ? billingService.getRevenueStats().catch(() => ({ today: 0, month: 0 }))
                : Promise.resolve(null);

            const [patientData, todayAppts, revenue, metrics] = await Promise.all([
                patientFetch,
                todayApptsPromise,
                revenuePromise,
                clinicMetricsService.getDashboardMetrics(this.role).catch(() => null)
            ]);

            if (!patientData.success || !patientData.data) {
                this.showError();
                return;
            }

            const patients = patientData.data;
            const todayActive = todayAppts.filter((a) => a.status !== 'cancelled');
            const malePatients = patients.filter((p) => p.gender === 'Male').length;
            const femalePatients = patients.filter((p) => p.gender === 'Female').length;

            if (this.role === 'dentist') {
                this.animateNumber('totalPatients', 0, patients.length);
                this.animateNumber('todayAppointments', 0, todayActive.length);
                if (metrics) this.animateNumber('completedMonth', 0, metrics.completedMonth || 0);
                await this.loadPendingConfirmations();
            } else if (this.role === 'receptionist') {
                this.animateNumber('todayAppointments', 0, todayActive.length);
                this.setRevenueStat('outstandingBalance', metrics?.outstanding || 0);
                this.animateNumber('overdueRecalls', 0, metrics?.recalls?.overdue || 0);
                const today = new Date().toISOString().split('T')[0];
                const regToday = patients.filter((p) => p.registration_date?.split('T')[0] === today).length;
                this.animateNumber('registeredToday', 0, regToday);
            } else {
                this.animateNumber('totalPatients', 0, patients.length);
                this.animateNumber('todayAppointments', 0, todayActive.length);
                if (revenue) {
                    this.setRevenueStat('revenueToday', revenue.today);
                    this.setRevenueStat('revenueMonth', revenue.month);
                }
                this.chartData = { male: malePatients, female: femalePatients, patients };
                const progress = document.querySelector('.progress-fill');
                if (progress) progress.style.width = `${Math.min((patients.length / 1000) * 100, 100)}%`;
                this.bindThemeListener();
                this.renderCharts();
                await this.loadActivityTimeline();
                await this.loadDiscountApprovals();
            }

            this.loadTodaySchedule(todayAppts);
            this.loadRecentPatients(patients);
            this.checkAlerts(patients);
            if (this.role !== 'dentist') await this.loadDentalMetrics(metrics);
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError();
        }
    }
    
    async loadDentalMetrics(metrics) {
        const grid = document.getElementById('dentalMetricsGrid');
        if (!grid) return;

        try {
            const m = metrics || await clinicMetricsService.getDashboardMetrics(this.role);
            const cards = [];

            cards.push(`
                <div class="dental-metric-card ${m.recalls.overdue > 0 ? 'alert' : ''}" onclick="window.location.hash='recalls'">
                    <i class="fas fa-bell"></i>
                    <div><span>Overdue Recalls</span><strong>${m.recalls.overdue}</strong></div>
                </div>
                <div class="dental-metric-card" onclick="window.location.hash='recalls'">
                    <i class="fas fa-calendar-week"></i>
                    <div><span>Due This Week</span><strong>${m.recalls.dueThisWeek}</strong></div>
                </div>
            `);

            if (this.role === 'admin') {
                cards.push(`
                    <div class="dental-metric-card">
                        <i class="fas fa-clipboard-list"></i>
                        <div><span>Pending Procedures</span><strong>${m.pendingProcedures}</strong></div>
                    </div>
                    <div class="dental-metric-card" onclick="window.location.hash='billing'">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <div><span>Outstanding Balance</span><strong>${m.outstanding.toFixed(2)}</strong></div>
                    </div>
                    <div class="dental-metric-card">
                        <i class="fas fa-coins"></i>
                        <div><span>Revenue (Month)</span><strong>${(m.revenueMonth || 0).toFixed(2)}</strong></div>
                    </div>
                `);
            } else if (this.role === 'receptionist') {
                cards.push(`
                    <div class="dental-metric-card">
                        <i class="fas fa-clipboard-list"></i>
                        <div><span>Pending Procedures</span><strong>${m.pendingProcedures}</strong></div>
                    </div>
                    <div class="dental-metric-card" onclick="window.location.hash='billing'">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <div><span>Outstanding Balance</span><strong>${m.outstanding.toFixed(2)}</strong></div>
                    </div>
                `);
            }

            cards.push(`
                <div class="dental-metric-card">
                    <i class="fas fa-user-times"></i>
                    <div><span>No-Shows (Month)</span><strong>${m.noShowsMonth}</strong></div>
                </div>
                <div class="dental-metric-card">
                    <i class="fas fa-check-circle"></i>
                    <div><span>Completed (Month)</span><strong>${m.completedMonth}</strong></div>
                </div>
            `);

            grid.innerHTML = cards.join('');
        } catch (err) {
            console.error('Dental metrics error:', err);
            grid.innerHTML = '<p class="text-muted">Could not load clinic metrics</p>';
        }
    }

    async loadPendingConfirmations() {
        const section = document.getElementById('pendingConfirmationsSection');
        const list = document.getElementById('pendingConfirmationsList');
        if (!section || !list) return;

        try {
            const pending = await appointmentService.getPendingConfirmations();
            const pendingCountEl = document.getElementById('pendingConfirmCount');
            if (pendingCountEl) pendingCountEl.textContent = pending.length;
            if (!pending.length) {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';
            list.innerHTML = pending.map((appt) => {
                const when = new Date(appt.datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                return `
                    <div class="pending-confirm-item">
                        <div>
                            <strong>${this.escapeHtml(appt.patientName)}</strong>
                            <span>${appt.patientMrn} · ${when}</span>
                        </div>
                        <div class="pending-confirm-actions">
                            <button type="button" class="btn-primary btn-sm dash-confirm-btn" data-id="${appt.id}">Confirm</button>
                            <button type="button" class="btn-secondary btn-sm dash-decline-btn" data-id="${appt.id}">Decline</button>
                        </div>
                    </div>`;
            }).join('');

            list.querySelectorAll('.dash-confirm-btn').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    await appointmentService.confirmAssignment(btn.dataset.id);
                    if (window.Toast) window.Toast.success('Confirmed — you can now access clinical records');
                    await this.loadPendingConfirmations();
                });
            });
            list.querySelectorAll('.dash-decline-btn').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Decline this patient assignment? Reception will be notified.')) return;
                    const res = await appointmentService.declineAssignment(btn.dataset.id);
                    if (window.Toast) window.Toast.info(res.message || 'Declined');
                    window.app?.updateClinicAlertsBadge?.();
                    await this.loadPendingConfirmations();
                });
            });
        } catch (err) {
            section.style.display = 'none';
        }
    }

    loadTodaySchedule(appointments) {
        const container = document.getElementById('todayScheduleList');
        if (!container) return;

        const active = appointments
            .filter(a => a.status !== 'cancelled')
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        if (active.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-calendar"></i>
                    <p>No appointments scheduled for today</p>
                    <button class="btn-primary btn-sm" onclick="window.location.hash='appointments'" style="margin-top:8px;">
                        <i class="fas fa-plus"></i> Book Appointment
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = active.map(appt => {
            const time = new Date(appt.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const status = getStatusMeta(appt.status);
            const checkInBtn = ['scheduled', 'confirmed'].includes(appt.status)
                ? `<button type="button" class="btn-checkin-sm dash-checkin-btn" data-id="${appt.id}" title="Check in patient">
                    <i class="fas fa-user-check"></i>
                   </button>`
                : '';
            return `
                <div class="today-appt-item" data-appt-id="${appt.id}">
                    <div class="today-appt-time">${time}</div>
                    <div class="today-appt-info">
                        <strong>${this.escapeHtml(appt.patientName)}</strong>
                        <span>${getTypeLabel(appt.type)} · ${appt.patientMrn}</span>
                    </div>
                    ${checkInBtn}
                    <span class="status-badge" style="background:${status.color};font-size:0.7rem;">${status.label}</span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.today-appt-item').forEach((item) => {
            item.addEventListener('click', () => {
                window.location.hash = 'appointments';
            });
        });
        container.querySelectorAll('.dash-checkin-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const appt = active.find((a) => String(a.id) === String(id));
                const next = appt?.status === 'scheduled' ? 'confirmed' : 'in_chair';
                await appointmentService.updateStatus(id, next);
                if (window.Toast) window.Toast.success(next === 'confirmed' ? 'Confirmed' : 'Patient checked in');
                const todayAppts = await appointmentService.getToday().catch(() => []);
                this.loadTodaySchedule(todayAppts);
            });
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setRevenueStat(elementId, amount) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.textContent = (parseFloat(amount) || 0).toFixed(2);
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
    
    bindThemeListener() {
        if (this._themeBound) return;
        this._themeBound = true;
        window.addEventListener('themeChanged', () => this.renderCharts());
    }

    renderCharts() {
        const { male, female, patients } = this.chartData;
        if (!patients?.length && male === 0 && female === 0) return;
        this.loadGenderChart(male, female);
        this.loadTrendChart(patients);
    }

    async loadDiscountApprovals() {
        const section = document.getElementById('discountApprovalSection');
        const list = document.getElementById('discountApprovalList');
        if (!section || !list || this.role !== 'admin') return;

        try {
            const pending = await billingService.getPendingDiscounts();
            if (!pending.length) {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';
            list.innerHTML = pending.map((inv) => `
                <div class="discount-approval-item" data-id="${inv.id}">
                    <div class="discount-approval-meta">
                        <strong>${this.esc(inv.invoiceNumber)} — ${this.esc(inv.patientName)}</strong>
                        <span>Requested by ${this.esc(inv.createdByName || 'reception')}</span>
                    </div>
                    <div class="discount-approval-amount">-${parseFloat(inv.discount).toFixed(2)}</div>
                    <div class="discount-approval-actions">
                        <button class="btn-primary btn-sm approve-discount-btn" data-id="${inv.id}">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-secondary btn-sm view-discount-btn" data-id="${inv.id}">
                            View
                        </button>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.approve-discount-btn').forEach((btn) => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    btn.disabled = true;
                    try {
                        await billingService.approveDiscount(id);
                        if (window.Toast) window.Toast.success('Discount approved');
                        await this.loadDiscountApprovals();
                    } catch (err) {
                        if (window.Toast) window.Toast.error(err.message || 'Approval failed');
                        btn.disabled = false;
                    }
                });
            });
            list.querySelectorAll('.view-discount-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    sessionStorage.setItem('billingInvoiceId', btn.dataset.id);
                    window.location.hash = 'billing';
                });
            });
        } catch (err) {
            console.error('Discount inbox error:', err);
            section.style.display = 'none';
        }
    }

    esc(text) {
        const d = document.createElement('div');
        d.textContent = text || '';
        return d.innerHTML;
    }

    async loadGenderChart(male, female) {
        try {
            const Chart = window.Chart;
            const ctx = document.getElementById('genderChart')?.getContext('2d');
            if (!ctx || !Chart) return;

            destroyChart(this.charts.gender);
            const palette = getChartPalette();

            this.charts.gender = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Male', 'Female', 'Other'],
                    datasets: [{
                        data: [male, female, 0],
                        backgroundColor: palette.gender,
                        borderColor: palette.genderBorder,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: baseLegendOptions(palette),
                        tooltip: {
                            callbacks: {
                                label(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = male + female || 1;
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading gender chart:', error);
        }
    }

    async loadTrendChart(patients) {
        try {
            const Chart = window.Chart;
            const ctx = document.getElementById('trendChart')?.getContext('2d');
            if (!ctx || !Chart) return;

            destroyChart(this.charts.trend);
            const palette = getChartPalette();

            const monthlyData = {};
            const last6Months = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                last6Months.push(monthYear);
                monthlyData[monthYear] = 0;
            }

            (patients || []).forEach((patient) => {
                const date = new Date(patient.registration_date);
                const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                if (monthlyData[monthYear] !== undefined) monthlyData[monthYear]++;
            });

            const primaryRgb = palette.primary.startsWith('#')
                ? palette.primary
                : '#0891b2';

            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last6Months,
                    datasets: [{
                        label: 'New Patients',
                        data: last6Months.map((month) => monthlyData[month]),
                        borderColor: primaryRgb,
                        backgroundColor: palette.isDark ? 'rgba(34, 211, 238, 0.12)' : 'rgba(8, 145, 178, 0.12)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: primaryRgb,
                        pointBorderColor: palette.surface,
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
                            ...baseLegendOptions(palette),
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label(context) {
                                    return `Patients: ${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: baseScaleOptions(palette, {
                        yStep: 1,
                        yTitle: 'Number of Patients',
                        xTitle: 'Month'
                    })
                }
            });
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
    
    async loadActivityTimeline() {
        const timeline = document.getElementById('activityTimeline');
        if (!timeline) return;

        const actionIcons = {
            'patient.create': 'fa-user-plus',
            'invoice.discount_approved': 'fa-percent',
            'invoice.create': 'fa-file-invoice-dollar',
            'appointment.create': 'fa-calendar-plus',
            'staff.create': 'fa-user-md'
        };

        const formatAction = (action) => action
            .replace(/\./g, ' · ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

        try {
            const entries = await adminService.getAuditLog(12);
            if (entries?.length) {
                timeline.innerHTML = entries.map((entry, index) => {
                    const icon = actionIcons[entry.action] || 'fa-circle';
                    return `
                        <div class="timeline-item">
                            <div class="timeline-icon">
                                <i class="fas ${icon}"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-title">${formatAction(entry.action)}</div>
                                <div class="timeline-description">${this.esc(entry.details || entry.entityType || '')}</div>
                                <div class="timeline-time">${entry.userName ? `${this.esc(entry.userName)} · ` : ''}${entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                return;
            }
        } catch {
            /* fall through to patient registrations */
        }

        const patients = this.chartData.patients || [];
        const recentActivities = patients.slice(0, 8);
        const icons = ['fa-user-plus', 'fa-stethoscope', 'fa-heartbeat', 'fa-calendar-check'];

        if (recentActivities.length === 0) {
            timeline.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No recent activities</p></div>';
            return;
        }

        timeline.innerHTML = recentActivities.map((patient, index) => `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <i class="fas ${icons[index % icons.length]}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">New Patient Registration</div>
                    <div class="timeline-description">${this.esc(patient.name)} (${patient.mrn}) was registered</div>
                    <div class="timeline-time">${new Date(patient.registration_date).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }
    
    checkAlerts(patients) {
        const alertsDiv = document.getElementById('alertsSection');
        if (!alertsDiv) return;

        const recallStats = recallService.computeStats(patients);
        const alerts = [];

        if (recallStats.overdue > 0) {
            alerts.push(`
                <div class="alert-card alert-warning">
                    <div class="alert-icon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">${recallStats.overdue} Overdue Recall${recallStats.overdue > 1 ? 's' : ''}</div>
                        <div class="alert-message">Patients are past their scheduled recall date. Contact them to book follow-up visits.</div>
                    </div>
                    <button class="alert-action" onclick="window.location.hash='recalls'">View Recalls</button>
                </div>
            `);
        }

        const today = new Date().toISOString().split('T')[0];
        const todayRegistrations = patients.filter(p => p.registration_date?.split('T')[0] === today).length;

        if (todayRegistrations === 0 && recallStats.overdue === 0) {
            alerts.push(`
                <div class="alert-card">
                    <div class="alert-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">No Registrations Today</div>
                        <div class="alert-message">No patients have been registered today.</div>
                    </div>
                    ${this.role !== 'dentist' ? `<button class="alert-action" onclick="window.location.hash='register'">Register Now</button>` : ''}
                </div>
            `);
        } else if (patients.length > 800) {
            alerts.push(`
                <div class="alert-card">
                    <div class="alert-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">High Patient Volume</div>
                        <div class="alert-message">Patient count is approaching capacity.</div>
                    </div>
                    <button class="alert-action" onclick="location.reload()">Refresh</button>
                </div>
            `);
        }

        alertsDiv.innerHTML = alerts.join('');
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
        if (!canViewRevenue(this.role)) return;
        try {
            const data = await patientService.fetchAll();
            
            if (data.success) {
                const stats = {
                    total: data.data.length,
                    male: data.data.filter(p => p.gender === 'Male').length,
                    female: data.data.filter(p => p.gender === 'Female').length,
                    last30Days: data.data.filter(p => new Date(p.registration_date) >= new Date(Date.now() - 30*24*60*60*1000)).length
                };
                
                const report = `Dr Amin Specialty Dental Clinic — Dashboard Report
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

Report generated by Dr Amin Specialty Dental Clinic`;
                
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
        document.querySelectorAll('.stat-number').forEach((el) => {
            el.textContent = '—';
        });
        
        const recentList = document.getElementById('recentPatientsList');
        if (recentList) {
            recentList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading data</p></div>';
        }
    }
}