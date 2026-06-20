import { signIn } from '../services/authService.js';
import { BRANDING } from '../config/branding.js';
import { loadClinicEmailConfig, getCachedClinicEmailConfig, buildStaffEmail } from '../config/clinicEmail.js';

export class LoginPage {
  constructor() {
    this.container = null;
    const cached = getCachedClinicEmailConfig();
    this.emailDomain = cached?.emailDomain || '@pws.com';
    this._configReady = Boolean(cached);
  }

  async render(container) {
    this.container = container;
    container.innerHTML = this.renderLoginForm();
    this.bindEvents();
    loadClinicEmailConfig().then((config) => {
      this.emailDomain = config.emailDomain;
      this._configReady = true;
      const domainEl = document.getElementById('loginEmailDomain');
      if (domainEl) domainEl.textContent = config.emailDomain;
    });
  }

  renderLoginForm() {
    return `
      <div class="login-page" data-testid="login-page">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo"><i class="fas fa-tooth"></i></div>
            <h1>${BRANDING.name}</h1>
            <p>${BRANDING.tagline}</p>
          </div>

          <form id="loginForm" class="login-form" data-testid="login-form" novalidate>
            <div class="form-group">
              <label for="loginUsername">Username</label>
              <div class="username-field">
                <div class="input-with-icon username-input-wrap">
                  <i class="fas fa-user"></i>
                  <input type="text" id="loginUsername" name="username" placeholder="your.name" required autocomplete="username" autocapitalize="none" spellcheck="false">
                </div>
                <span class="username-domain" id="loginEmailDomain">${this.escapeHtml(this.emailDomain)}</span>
              </div>
            </div>

            <div class="form-group">
              <label for="loginPassword">Password</label>
              <div class="input-with-icon">
                <i class="fas fa-lock"></i>
                <input type="password" id="loginPassword" name="password" placeholder="Enter password" required autocomplete="current-password">
              </div>
            </div>

            <div id="loginError" class="login-error" style="display: none;"></div>

            <button type="submit" class="btn-login" id="loginSubmitBtn">
              <i class="fas fa-sign-in-alt"></i>
              <span>Sign In</span>
            </button>
          </form>

          <p class="login-forgot">
            <button type="button" class="login-forgot-link" id="forgotPasswordBtn">Forgot password?</button>
          </p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => this.showForgotPassword());
  }

  showForgotPassword() {
    const existing = document.getElementById('forgotPasswordModal');
    existing?.remove();

    const username = document.getElementById('loginUsername')?.value.trim() || '';
    const accountHint = username
      ? `<p class="login-forgot-account">Account: <strong>${this.escapeHtml(username)}${this.escapeHtml(this.emailDomain)}</strong></p>`
      : '';

    const overlay = document.createElement('div');
    overlay.id = 'forgotPasswordModal';
    overlay.className = 'login-forgot-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'forgotPasswordTitle');
    overlay.innerHTML = `
      <div class="login-forgot-modal">
        <div class="login-forgot-modal-header">
          <h3 id="forgotPasswordTitle"><i class="fas fa-key"></i> Forgot Password</h3>
          <button type="button" class="login-forgot-close" id="closeForgotModal" aria-label="Close">&times;</button>
        </div>
        <div class="login-forgot-body">
          ${accountHint}
          <p>Password resets are handled by your clinic administrator.</p>
          <ol class="login-forgot-steps">
            <li>Ask an admin to open <strong>Settings → Staff Members</strong></li>
            <li>Find your account and click <strong>Reset password</strong></li>
            <li>Sign in with the new password your admin gives you</li>
          </ol>
        </div>
        <div class="login-forgot-modal-footer">
          <button type="button" class="btn-login" id="closeForgotOk">Got it</button>
        </div>
      </div>
    `;

    const host = this.container || document.getElementById('auth-screen') || document.body;
    host.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#closeForgotModal')?.addEventListener('click', close);
    overlay.querySelector('#closeForgotOk')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onEsc);
      }
    });
    overlay.querySelector('#closeForgotOk')?.focus();
  }

  async handleLogin(e) {
    e.preventDefault();
    if (this._submitting) return;

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!username) {
      errorEl.textContent = 'Please enter your username.';
      errorEl.style.display = 'block';
      return;
    }
    if (!password) {
      errorEl.textContent = 'Please enter your password.';
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    this._submitting = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Signing in...</span>';

    try {
      if (!this._configReady) {
        const config = await loadClinicEmailConfig();
        this.emailDomain = config.emailDomain;
        this._configReady = true;
        const domainEl = document.getElementById('loginEmailDomain');
        if (domainEl) domainEl.textContent = config.emailDomain;
      }
      const email = buildStaffEmail(username, this.emailDomain);
      await signIn(email, password);
      window.location.reload();
    } catch (err) {
      errorEl.textContent = this.getLoginErrorMessage(err);
      errorEl.style.display = 'block';
    } finally {
      this._submitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Sign In</span>';
    }
  }

  getLoginErrorMessage(err) {
    if (err.code === 'RATE_LIMITED' || err.status === 429) {
      return 'Too many login attempts. Please wait a few minutes and try again.';
    }
    if (err.code === 'ACCOUNT_INACTIVE') {
      return 'This account has been deactivated. Contact your clinic administrator.';
    }
    if (err.code === 'INVALID_CREDENTIALS' || err.status === 401) {
      return 'Incorrect username or password. Check your credentials and try again.';
    }
    if (err.status === 400) {
      return err.message || 'Invalid login details. Check your username format.';
    }
    return err.message || 'Sign in failed. Please try again.';
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
