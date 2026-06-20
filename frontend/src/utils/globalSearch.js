import { patientService } from '../services/patientService.js';
import { getCurrentRole } from '../services/authService.js';

const ALL_QUICK_PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', hash: 'dashboard' },
  { id: 'patients', label: 'All Patients', icon: 'fa-users', hash: 'patients' },
  { id: 'register', label: 'Register Patient', icon: 'fa-user-plus', hash: 'register', hideForRoles: ['dentist'] },
  { id: 'appointments', label: 'Appointments', icon: 'fa-calendar-alt', hash: 'appointments' },
  { id: 'billing', label: 'Billing', icon: 'fa-file-invoice-dollar', hash: 'billing' },
  { id: 'recalls', label: 'Recalls', icon: 'fa-bell', hash: 'recalls' },
  { id: 'settings', label: 'Settings', icon: 'fa-cog', hash: 'settings' }
];

function getQuickPages() {
  const role = getCurrentRole();
  return ALL_QUICK_PAGES.filter((p) => !p.hideForRoles?.includes(role));
}

function canRegisterPatients() {
  return getCurrentRole() !== 'dentist';
}

let debounceTimer = null;

export function initGlobalSearch() {
  const overlay = document.getElementById('globalSearchOverlay');
  const input = document.getElementById('globalSearchInput');
  const results = document.getElementById('globalSearchResults');
  const openBtn = document.getElementById('globalSearchBtn');

  if (!overlay || !input || !results) return;

  const open = () => {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    input.value = '';
    renderQuickActions(results);
    setTimeout(() => input.focus(), 50);
  };

  const close = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  };

  openBtn?.addEventListener('click', open);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.getElementById('globalSearchClose')?.addEventListener('click', close);

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value.trim(), results), 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (e.key === 'Enter') {
      const first = results.querySelector('.global-search-item');
      first?.click();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'f' && !e.shiftKey) return;
      }
      e.preventDefault();
      open();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!canRegisterPatients()) return;
      e.preventDefault();
      window.location.hash = 'register';
      window.app?.loadPage?.('register');
    }
  });

  window.openGlobalSearch = open;
}

function renderQuickActions(container) {
  const pages = getQuickPages();
  container.innerHTML = `
    <div class="global-search-section-label">Quick navigation</div>
    ${pages.map((p) => `
      <button type="button" class="global-search-item" data-hash="${p.hash}">
        <i class="fas ${p.icon}"></i>
        <span>${p.label}</span>
        <kbd>↵</kbd>
      </button>
    `).join('')}
    <div class="global-search-section-label">Search patients by name, MRN, or phone</div>
    <p class="global-search-hint">Type to search…</p>
  `;
  bindResultClicks(container);
}

async function runSearch(query, container) {
  if (!query) {
    renderQuickActions(container);
    return;
  }

  container.innerHTML = `<div class="global-search-loading"><i class="fas fa-spinner fa-spin"></i> Searching…</div>`;

  try {
    const patients = await patientService.search(query);
    if (!patients?.length) {
      container.innerHTML = `
        <div class="global-search-empty">
          <i class="fas fa-search"></i>
          <p>No patients found for "<strong>${escapeHtml(query)}</strong>"</p>
          ${canRegisterPatients() ? `
          <button type="button" class="btn-primary btn-sm global-search-item" data-hash="register">
            <i class="fas fa-user-plus"></i> Register new patient
          </button>
          ` : ''}
        </div>
      `;
      bindResultClicks(container);
      return;
    }

    container.innerHTML = `
      <div class="global-search-section-label">${patients.length} patient${patients.length > 1 ? 's' : ''} found</div>
      ${patients.slice(0, 12).map((p) => `
        <button type="button" class="global-search-item" data-patient-id="${p.id}">
          <div class="global-search-avatar"><i class="fas fa-user"></i></div>
          <div class="global-search-meta">
            <strong>${escapeHtml(p.name)}</strong>
            <span>${escapeHtml(p.mrn)} · ${escapeHtml(p.phone_number || 'No phone')}</span>
          </div>
          ${p.allergies ? '<span class="global-search-alert" title="Has allergies"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
        </button>
      `).join('')}
    `;
    bindResultClicks(container);
  } catch {
    container.innerHTML = `<div class="global-search-empty"><p>Search failed. Try again.</p></div>`;
  }
}

function bindResultClicks(container) {
  container.querySelectorAll('.global-search-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hash = btn.dataset.hash;
      const patientId = btn.dataset.patientId;
      document.getElementById('globalSearchOverlay')?.classList.remove('open');
      if (hash) {
        window.location.hash = hash;
        window.app?.loadPage?.(hash);
      } else if (patientId) {
        window.location.hash = `patient/${patientId}`;
        window.app?.loadPatientDetail?.(patientId);
      }
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
