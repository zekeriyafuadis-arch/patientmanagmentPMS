const ROLES = {
  ADMIN: 'admin',
  DENTIST: 'dentist',
  RECEPTIONIST: 'receptionist'
};

function roleOf(user) {
  return user?.role || null;
}

function isAdmin(user) {
  return roleOf(user) === ROLES.ADMIN;
}

function isDentist(user) {
  return roleOf(user) === ROLES.DENTIST;
}

function isReceptionist(user) {
  return roleOf(user) === ROLES.RECEPTIONIST;
}

function canViewAllPatients(user) {
  return isAdmin(user) || isReceptionist(user);
}

function canViewRevenue(user) {
  return isAdmin(user);
}

function canAccessBilling(user) {
  return isAdmin(user) || isReceptionist(user);
}

function canCreateInvoice(user) {
  return canAccessBilling(user);
}

function canApplyDiscountDirectly(user) {
  return isAdmin(user);
}

function canRequestDiscount(user) {
  return isReceptionist(user);
}

function canViewClinicalRecords(user) {
  return isAdmin(user) || isDentist(user);
}

function canEditClinicalRecords(user) {
  return isDentist(user);
}

function canAddAdditionalTreatment(user) {
  return isAdmin(user);
}

function canAssignDoctors(user) {
  return isAdmin(user) || isReceptionist(user);
}

function canManageStaff(user) {
  return isAdmin(user);
}

function canExportAllPatients(user) {
  return isAdmin(user) || isReceptionist(user);
}

function canBookAnyAppointment(user) {
  return isAdmin(user) || isReceptionist(user);
}

function canBookOwnPatientAppointment(user) {
  return isDentist(user);
}

module.exports = {
  ROLES,
  roleOf,
  isAdmin,
  isDentist,
  isReceptionist,
  canViewAllPatients,
  canViewRevenue,
  canAccessBilling,
  canCreateInvoice,
  canApplyDiscountDirectly,
  canRequestDiscount,
  canViewClinicalRecords,
  canEditClinicalRecords,
  canAddAdditionalTreatment,
  canAssignDoctors,
  canManageStaff,
  canExportAllPatients,
  canBookAnyAppointment,
  canBookOwnPatientAppointment
};
