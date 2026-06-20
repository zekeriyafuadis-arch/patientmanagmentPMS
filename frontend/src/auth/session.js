import { apiGet, apiPost, setToken, getToken } from '../api/client.js';
import { canAssignDoctors as roleCanAssign, canViewClinicalRecords as roleCanViewClinical } from './guards.js';

let currentUser = null;
let currentRole = null;
let currentProfile = null;

function applyUserState(user) {
  currentUser = { uid: user.id, email: user.email };
  currentRole = user.role;
  currentProfile = { fullName: user.fullName, email: user.email, role: user.role };
  return currentRole;
}

export async function initAuth(onStateChange) {
  const token = getToken();
  if (!token) {
    onStateChange({ user: null, profile: null, role: null, configured: true });
    return () => {};
  }
  try {
    const res = await apiGet('/auth/me');
    applyUserState(res.user);
    onStateChange({ user: currentUser, profile: currentProfile, role: currentRole, configured: true });
  } catch {
    setToken(null);
    onStateChange({ user: null, profile: null, role: null, configured: true });
  }
  return () => {};
}

/** Refresh role/profile from server (picks up admin role changes without re-login). */
export async function refreshSession() {
  if (!getToken()) return null;
  try {
    const res = await apiGet('/auth/me');
    const prevRole = currentRole;
    applyUserState(res.user);
    if (prevRole !== currentRole) {
      window.dispatchEvent(new CustomEvent('pms:auth:role-changed', {
        detail: { role: currentRole, profile: currentProfile }
      }));
    }
    return { role: currentRole, profile: currentProfile };
  } catch {
    return null;
  }
}

export async function signIn(email, password) {
  const res = await apiPost('/auth/login', { email, password });
  setToken(res.token);
  applyUserState(res.user);
  return currentUser;
}

export async function signOut() {
  setToken(null);
  currentUser = null;
  currentRole = null;
  currentProfile = null;
  window.dispatchEvent(new CustomEvent('pms:auth:logout', { detail: { reason: 'user_logout' } }));
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentRole() {
  return currentRole;
}

export function canViewClinicalRecords() {
  return roleCanViewClinical(getCurrentRole());
}

export function canAssignDoctors() {
  return roleCanAssign(getCurrentRole());
}

export async function checkClinicalAccessForPatient(patientId) {
  if (getCurrentRole() !== 'dentist') return false;
  try {
    const res = await apiGet(`/patients/${patientId}/clinical-access`);
    return res.canAccess === true;
  } catch {
    return false;
  }
}

export function getCurrentProfile() {
  return currentProfile;
}

export async function changePassword(currentPassword, newPassword) {
  await apiPost('/auth/change-password', { currentPassword, newPassword });
}
