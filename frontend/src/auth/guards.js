export const ROLES = {
  ADMIN: 'admin',
  DENTIST: 'dentist',
  RECEPTIONIST: 'receptionist'
};

function normalizeRole(role) {
  return role || null;
}

export function canViewClinicalRecords(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.DENTIST;
}

export function canEditClinicalRecords(role) {
  return normalizeRole(role) === ROLES.DENTIST;
}

export function canAddAdditionalTreatment(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canAssignDoctors(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.RECEPTIONIST;
}

export function canViewRevenue(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canAccessBilling(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.RECEPTIONIST;
}

export function canApplyDiscountDirectly(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canRequestDiscount(role) {
  return normalizeRole(role) === ROLES.RECEPTIONIST;
}

export function canViewAllPatients(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.RECEPTIONIST;
}

export function canManageStaff(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function canBookAnyAppointment(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.RECEPTIONIST;
}

export function formatRole(role) {
  const labels = { admin: 'Administrator', dentist: 'Dentist', receptionist: 'Receptionist' };
  return labels[role] || 'Staff';
}
