/**
 * Theme Manager - Handles dark/light mode and fullscreen functionality
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.isFullscreen = false;
        this.settings = this.loadSettings();
        this.init();
    }
    
    /**
     * Initialize theme manager
     */
    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupFullscreenDetection();
        
        // Apply saved settings
        if (this.settings.autoFullscreen) {
            setTimeout(() => this.toggleFullscreen(true), 1000);
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('pms_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
        return {
            theme: 'auto',
            autoFullscreen: false,
            rememberWindowState: true,
            defaultView: 'dashboard',
            showAnimations: true,
            compactMode: false,
            autoBackup: true
        };
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('pms_settings', JSON.stringify(this.settings));
    }
    
    /**
     * Load theme based on settings
     */
    loadTheme() {
        const theme = this.settings.theme;
        
        if (theme === 'auto') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(prefersDark ? 'dark' : 'light');
            this.currentTheme = 'auto';
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.settings.theme === 'auto') {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        } else {
            this.applyTheme(theme);
        }
        
        this.updateThemeIcon();
    }
    
    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            root.setAttribute('data-theme', 'light');
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const computedColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--primary').trim();
            metaThemeColor.setAttribute('content', computedColor);
        }
        
        // Update chart themes if charts exist
        this.updateChartThemes();
    }
    
    /**
     * Update chart colors based on theme
     */
    updateChartThemes() {
        // Dispatch event for charts to update
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.getCurrentTheme() }
        }));
    }
    
    /**
     * Toggle between light and dark modes
     */
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        this.settings.theme = newTheme;
        this.saveSettings();
        this.applyTheme(newTheme);
        this.updateThemeIcon();
        
        this.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`, 'success');
    }
    
    /**
     * Get current active theme
     */
    getCurrentTheme() {
        return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    }
    
    /**
     * Update theme toggle button icon
     */
    updateThemeIcon() {
        const themeBtn = document.getElementById('themeToggleBtn');
        if (!themeBtn) return;
        
        const currentTheme = this.getCurrentTheme();
        const icon = themeBtn.querySelector('i');
        
        if (currentTheme === 'dark') {
            icon.className = 'fas fa-sun';
            themeBtn.title = 'Switch to Light Mode';
        } else {
            icon.className = 'fas fa-moon';
            themeBtn.title = 'Switch to Dark Mode';
        }
    }
    
    /**
     * Toggle fullscreen mode
     */
    async toggleFullscreen(force = null) {
        const isFullscreen = force !== null ? force : !this.isFullscreen;
        
        try {
            if (isFullscreen) {
                await document.documentElement.requestFullscreen();
                this.isFullscreen = true;
            } else {
                await document.exitFullscreen();
                this.isFullscreen = false;
            }
            
            this.updateFullscreenIcon();
        } catch (error) {
            console.error('Fullscreen error:', error);
            this.showToast('Fullscreen mode not supported', 'error');
        }
    }
    
    /**
     * Update fullscreen button icon
     */
    updateFullscreenIcon() {
        const fullscreenBtn = document.getElementById('fullscreenToggleBtn');
        if (!fullscreenBtn) return;
        
        const icon = fullscreenBtn.querySelector('i');
        
        if (this.isFullscreen) {
            icon.className = 'fas fa-compress';
            fullscreenBtn.title = 'Exit Fullscreen (F11)';
        } else {
            icon.className = 'fas fa-expand';
            fullscreenBtn.title = 'Enter Fullscreen (F11)';
        }
    }
    
    /**
     * Setup fullscreen change detection
     */
    setupFullscreenDetection() {
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenIcon();
            
            // Save fullscreen state if remember window state is enabled
            if (this.settings.rememberWindowState) {
                this.settings.wasFullscreen = this.isFullscreen;
                this.saveSettings();
            }
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F11 - Toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Ctrl/Cmd + Shift + D - Toggle dark mode
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // Ctrl/Cmd + Shift + F - Toggle fullscreen
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Esc - Exit fullscreen
            if (e.key === 'Escape' && this.isFullscreen) {
                this.toggleFullscreen(false);
            }
        });
    }
    
    /**
     * Setup event listeners for UI controls
     */
    setupEventListeners() {
        // Theme toggle button
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // Fullscreen toggle button
        const fullscreenBtn = document.getElementById('fullscreenToggleBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }
        
        // Compact mode toggle
        const compactModeCheckbox = document.getElementById('compactMode');
        if (compactModeCheckbox) {
            compactModeCheckbox.addEventListener('change', (e) => {
                this.settings.compactMode = e.target.checked;
                this.saveSettings();
                this.applyCompactMode();
            });
        }
        
        // Animations toggle
        const animationsCheckbox = document.getElementById('showAnimations');
        if (animationsCheckbox) {
            animationsCheckbox.addEventListener('change', (e) => {
                this.settings.showAnimations = e.target.checked;
                this.saveSettings();
                this.applyAnimations();
            });
        }
    }
    
    /**
     * Open settings modal
     */
    openSettings() {
        const modal = document.getElementById('settingsModal');
        const autoFullscreen = document.getElementById('autoFullscreenSetting');
        const rememberWindow = document.getElementById('rememberWindowState');
        const defaultView = document.getElementById('defaultView');
        const autoBackup = document.getElementById('autoBackup');
        const compactMode = document.getElementById('compactMode');
        const showAnimations = document.getElementById('showAnimations');
        
        // Load current settings into modal
        if (autoFullscreen) autoFullscreen.checked = this.settings.autoFullscreen;
        if (rememberWindow) rememberWindow.checked = this.settings.rememberWindowState;
        if (defaultView) defaultView.value = this.settings.defaultView;
        if (autoBackup) autoBackup.checked = this.settings.autoBackup;
        if (compactMode) compactMode.checked = this.settings.compactMode;
        if (showAnimations) showAnimations.checked = this.settings.showAnimations;
        
        // Theme selector
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === this.settings.theme) {
                option.classList.add('active');
            }
        });
        
        modal.style.display = 'flex';
        
        // Setup modal close handlers
        const closeBtn = document.getElementById('closeSettingsBtn');
        const cancelBtn = document.getElementById('cancelSettingsBtn');
        const saveBtn = document.getElementById('saveSettingsBtn');
        
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;
        
        if (saveBtn) {
            saveBtn.onclick = () => {
                this.saveSettingsFromModal();
                closeModal();
            };
        }
        
        // Theme selection
        themeOptions.forEach(option => {
            option.onclick = () => {
                themeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.settings.theme = option.dataset.theme;
                this.loadTheme();
            };
        });
        
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
    
    /**
     * Save settings from modal
     */
    saveSettingsFromModal() {
        const autoFullscreen = document.getElementById('autoFullscreenSetting');
        const rememberWindow = document.getElementById('rememberWindowState');
        const defaultView = document.getElementById('defaultView');
        const autoBackup = document.getElementById('autoBackup');
        const compactMode = document.getElementById('compactMode');
        const showAnimations = document.getElementById('showAnimations');
        
        if (autoFullscreen) this.settings.autoFullscreen = autoFullscreen.checked;
        if (rememberWindow) this.settings.rememberWindowState = rememberWindow.checked;
        if (defaultView) this.settings.defaultView = defaultView.value;
        if (autoBackup) this.settings.autoBackup = autoBackup.checked;
        if (compactMode) this.settings.compactMode = compactMode.checked;
        if (showAnimations) this.settings.showAnimations = showAnimations.checked;
        
        this.saveSettings();
        this.applyCompactMode();
        this.applyAnimations();
        
        this.showToast('Settings saved successfully', 'success');
    }
    
    /**
     * Apply compact mode
     */
    applyCompactMode() {
        if (this.settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
    }
    
    /**
     * Apply animations setting
     */
    applyAnimations() {
        if (!this.settings.showAnimations) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        if (window.Toast) {
            window.Toast.show(message, type);
        }
    }
}

// Export singleton instance
export const themeManager = new ThemeManager();