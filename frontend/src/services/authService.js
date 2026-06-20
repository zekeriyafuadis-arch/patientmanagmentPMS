export * from '../auth/session.js';
export {
  ROLES,
  canAddAdditionalTreatment,
  canAssignDoctors as canAssignDoctorsForRole,
  canViewClinicalRecords as canViewClinicalRecordsForRole,
  canViewRevenue,
  canAccessBilling,
  canApplyDiscountDirectly,
  canRequestDiscount,
  canViewAllPatients,
  canManageStaff,
  canBookAnyAppointment,
  formatRole
} from '../auth/guards.js';
