/**
 * Patient Management System - Main Application
 * Version: 2.0.0
 */

// Import page modules
import { Dashboard } from './patientModule/PatientPage/dashboard.js';
import { Patients } from './patientModule/PatientPage/patients.js';
import { PatientRegister } from './patientModule/PatientPage/patientRegister.js';
import { PatientSearch } from './patientModule/PatientPage/patientSearch.js';
import { PatientDetail } from './patientModule/PatientPage/patientDetail.js';
import { PatientEdit } from './patientModule/PatientPage/patientEdit.js';
import { themeManager } from './utils/themeManager.js';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api/patients';

// Toast Notification System
class Toast {
    static show(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const icon = icons[type] || icons.success;
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }
    
    static removeToast(toast) {
        if (toast && toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }
    
    static success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }
    
    static error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }
    
    static warning(message, duration = 3000) {
        this.show(message, 'warning', duration);
    }
    
    static info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

// Loading Indicator
class LoadingIndicator {
    static show() {
        const contentArea = document.getElementById('content-area');
        if (contentArea && !contentArea.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner-container">
                    <div class="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            contentArea.style.position = 'relative';
            contentArea.appendChild(overlay);
        }
    }
    
    static hide() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Main Application Class
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentPatientId = null;
        this.init();
    }
    
    init() {
        console.log('Initializing Patient Management System...');
        
        // Check route on load
        this.checkRoute();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup mobile menu
        this.setupMobileMenu();
        
        // Setup fullscreen and theme buttons
        this.setupControlButtons();
        
        // Handle browser back/forward buttons
        window.addEventListener('hashchange', () => {
            this.checkRoute();
        });
        
        // Handle offline status
        this.setupOfflineDetection();
        
        // Apply saved settings
        this.applySavedSettings();
        
        // Show welcome message
        setTimeout(() => {
            Toast.success('Welcome to Patient Management System!', 3000);
            
            // Show shortcut hints
            this.showShortcutHint();
        }, 500);
    }
    
    setupControlButtons() {
        // Theme toggle is handled by themeManager
        // Fullscreen toggle is handled by themeManager
        
        // Settings button is handled by themeManager
    }
    
    applySavedSettings() {
        const settings = themeManager.settings;
        
        // Apply default view
        if (settings.defaultView && settings.defaultView !== 'dashboard') {
            setTimeout(() => {
                window.location.hash = settings.defaultView;
                this.loadPage(settings.defaultView);
            }, 100);
        }
        
        // Apply compact mode
        if (settings.compactMode) {
            document.body.classList.add('compact-mode');
        }
        
        // Apply animations setting
        if (!settings.showAnimations) {
            document.body.classList.add('reduce-motion');
        }
    }
    
    showShortcutHint() {
        const hint = document.createElement('div');
        hint.className = 'shortcut-hint';
        hint.innerHTML = `
            <i class="fas fa-keyboard"></i>
            <div>
                <strong>Keyboard Shortcuts:</strong>
                <span>F11 - Fullscreen</span>
                <span>Ctrl+Shift+D - Dark Mode</span>
                <span>Ctrl+N - New Patient</span>
                <span>Ctrl+F - Search</span>
            </div>
            <button class="close-hint">&times;</button>
        `;
        
        document.body.appendChild(hint);
        
        const closeBtn = hint.querySelector('.close-hint');
        closeBtn.addEventListener('click', () => {
            hint.remove();
            localStorage.setItem('shortcut_hint_shown', 'true');
        });
        
        setTimeout(() => {
            if (hint.parentElement) {
                hint.remove();
            }
        }, 10000);
        
        if (localStorage.getItem('shortcut_hint_shown')) {
            hint.remove();
        }
    }
    
    setupMobileMenu() {
        const toggleBtn = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('open');
                const icon = toggleBtn.querySelector('i');
                if (sidebar.classList.contains('open')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
            
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                        sidebar.classList.remove('open');
                        const icon = toggleBtn.querySelector('i');
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        }
    }
    
    setupNavigation() {
        setTimeout(() => {
            const navItems = document.querySelectorAll('.nav-menu li');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const page = item.dataset.page;
                    if (page) {
                        window.location.hash = page;
                        this.loadPage(page);
                        
                        if (window.innerWidth <= 768) {
                            const sidebar = document.getElementById('sidebar');
                            const toggleBtn = document.getElementById('mobileMenuToggle');
                            if (sidebar) sidebar.classList.remove('open');
                            if (toggleBtn) {
                                const icon = toggleBtn.querySelector('i');
                                icon.classList.remove('fa-times');
                                icon.classList.add('fa-bars');
                            }
                        }
                    }
                });
            });
        }, 100);
    }
    
    updateActiveNav(pageName) {
        const navItems = document.querySelectorAll('.nav-menu li');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageName) {
                item.classList.add('active');
            }
        });
    }
    
    checkRoute() {
        const hash = window.location.hash.substring(1);
        
        if (window.location.hash.startsWith('#/patient/')) {
            const patientId = window.location.hash.split('/')[2];
            this.loadPatientDetail(patientId);
        } else if (window.location.hash.startsWith('#/edit/')) {
            const patientId = window.location.hash.split('/')[2];
            this.loadPatientEdit(patientId);
        } else {
            const page = hash || 'dashboard';
            this.loadPage(page);
        }
    }
    
    async loadPage(pageName) {
        const validPages = ['dashboard', 'patients', 'register', 'search'];
        if (!validPages.includes(pageName)) {
            pageName = 'dashboard';
            window.location.hash = 'dashboard';
        }
        
        this.currentPage = pageName;
        const contentArea = document.getElementById('content-area');
        
        if (!contentArea) return;
        
        LoadingIndicator.show();
        this.updateActiveNav(pageName);
        
        try {
            let pageInstance = null;
            
            switch(pageName) {
                case 'dashboard':
                    pageInstance = new Dashboard(API_BASE_URL);
                    contentArea.innerHTML = await pageInstance.render();
                    await pageInstance.loadStats();
                    break;
                case 'patients':
                    pageInstance = new Patients(API_BASE_URL);
                    contentArea.innerHTML = await pageInstance.render();
                    await pageInstance.loadPatients();
                    break;
                case 'register':
                    pageInstance = new PatientRegister(API_BASE_URL);
                    contentArea.innerHTML = await pageInstance.render();
                    pageInstance.initForm();
                    break;
                case 'search':
                    pageInstance = new PatientSearch(API_BASE_URL);
                    contentArea.innerHTML = await pageInstance.render();
                    pageInstance.initSearch();
                    break;
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading page:', error);
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Page</h3>
                    <p>There was an error loading the page. Please try again.</p>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-sync-alt"></i> Refresh Page
                    </button>
                </div>
            `;
            Toast.error('Error loading page. Please refresh and try again.');
        } finally {
            LoadingIndicator.hide();
        }
    }
    
    async loadPatientDetail(patientId) {
        if (!patientId) {
            window.location.hash = 'patients';
            return;
        }
        
        this.currentPage = 'detail';
        this.currentPatientId = patientId;
        const contentArea = document.getElementById('content-area');
        
        if (!contentArea) return;
        
        this.updateActiveNav(null);
        LoadingIndicator.show();
        
        try {
            const detailPage = new PatientDetail(API_BASE_URL, patientId);
            contentArea.innerHTML = await detailPage.render();
            await detailPage.loadPatientDetails();
        } catch (error) {
            console.error('Error loading patient detail:', error);
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <h3>Patient Not Found</h3>
                    <p>The patient you're looking for could not be found.</p>
                    <button onclick="window.location.hash='patients'" class="btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-arrow-left"></i> Back to Patients
                    </button>
                </div>
            `;
            Toast.error('Patient not found');
        } finally {
            LoadingIndicator.hide();
        }
    }
    
    async loadPatientEdit(patientId) {
        if (!patientId) {
            window.location.hash = 'patients';
            return;
        }
        
        this.currentPage = 'edit';
        this.currentPatientId = patientId;
        const contentArea = document.getElementById('content-area');
        
        if (!contentArea) return;
        
        this.updateActiveNav(null);
        LoadingIndicator.show();
        
        try {
            const editPage = new PatientEdit(API_BASE_URL, patientId);
            contentArea.innerHTML = await editPage.render();
            await editPage.loadPatientData();
        } catch (error) {
            console.error('Error loading patient edit:', error);
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-edit"></i>
                    <h3>Error Loading Form</h3>
                    <p>Could not load patient data for editing.</p>
                    <button onclick="window.location.hash='patients'" class="btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-arrow-left"></i> Back to Patients
                    </button>
                </div>
            `;
            Toast.error('Error loading patient data');
        } finally {
            LoadingIndicator.hide();
        }
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            Toast.success('Back online! Connection restored.', 3000);
        });
        
        window.addEventListener('offline', () => {
            Toast.warning('You are offline. Some features may be unavailable.', 5000);
        });
    }
}

// Add shortcut hint styles
const addHintStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .shortcut-hint {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary-gradient);
            color: white;
            padding: 12px 20px;
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 10000;
            box-shadow: var(--shadow-xl);
            animation: slideInRight 0.3s ease-out;
            font-size: 13px;
        }
        
        .shortcut-hint i {
            font-size: 20px;
        }
        
        .shortcut-hint div {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .shortcut-hint span {
            font-size: 11px;
            opacity: 0.9;
            margin-right: 10px;
        }
        
        .shortcut-hint .close-hint {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0 5px;
        }
        
        .shortcut-hint .close-hint:hover {
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .shortcut-hint {
                bottom: 10px;
                right: 10px;
                left: 10px;
                font-size: 11px;
                padding: 10px 15px;
            }
        }
    `;
    document.head.appendChild(style);
};

addHintStyles();

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
} else {
    window.app = new App();
}

// Export for debugging
export { App, Toast, LoadingIndicator };