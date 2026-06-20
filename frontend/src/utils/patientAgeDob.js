export function calcAgeFromDob(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(`${dobStr}T12:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 && age <= 150 ? age : null;
}

export function calcDobFromAge(ageInput) {
  const age = parseInt(ageInput, 10);
  if (Number.isNaN(age) || age < 0 || age > 150) return null;
  const today = new Date();
  const dob = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  return dob.toISOString().slice(0, 10);
}

/**
 * Sync age ↔ date of birth on patient forms.
 */
export function bindAgeDobSync(dobInput, ageInput, { onSync } = {}) {
  if (!dobInput || !ageInput) return;

  let syncing = false;

  const syncFromDob = () => {
    if (syncing || !dobInput.value) return;
    syncing = true;
    const age = calcAgeFromDob(dobInput.value);
    if (age != null) {
      ageInput.value = age;
      onSync?.('dob');
    }
    syncing = false;
  };

  const syncFromAge = () => {
    if (syncing || ageInput.value === '' || ageInput.value == null) return;
    syncing = true;
    const dob = calcDobFromAge(ageInput.value);
    if (dob) {
      dobInput.value = dob;
      onSync?.('age');
    }
    syncing = false;
  };

  dobInput.addEventListener('change', syncFromDob);
  dobInput.addEventListener('input', syncFromDob);
  ageInput.addEventListener('input', syncFromAge);
  ageInput.addEventListener('change', syncFromAge);
}

export function ensureAgeDobFilled(dobInput, ageInput) {
  const dob = dobInput?.value?.trim();
  const age = ageInput?.value;
  if (dob && !age) {
    const computed = calcAgeFromDob(dob);
    if (computed != null) ageInput.value = computed;
  } else if (age && !dob) {
    const computed = calcDobFromAge(age);
    if (computed) dobInput.value = computed;
  }
  return {
    dob: dobInput?.value?.trim() || '',
    age: ageInput?.value || ''
  };
}
