/** Medical alert helpers for point-of-care safety */

export function hasMedicalAlert(patient) {
  if (!patient) return false;
  return !!(patient.allergies?.trim() || patient.medical_conditions?.trim() || patient.medications?.trim());
}

export function getMedicalAlertText(patient) {
  if (!patient) return '';
  const parts = [];
  if (patient.allergies?.trim()) parts.push(`Allergies: ${patient.allergies.trim()}`);
  if (patient.medical_conditions?.trim()) parts.push(`Conditions: ${patient.medical_conditions.trim()}`);
  if (patient.medications?.trim()) parts.push(`Medications: ${patient.medications.trim()}`);
  return parts.join(' · ');
}

export function renderMedicalAlertBanner(patient, { compact = false } = {}) {
  if (!hasMedicalAlert(patient)) return '';
  const text = getMedicalAlertText(patient);
  const cls = compact ? 'medical-alert-banner compact' : 'medical-alert-banner';
  return `
    <div class="${cls}" role="alert">
      <i class="fas fa-exclamation-triangle"></i>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
