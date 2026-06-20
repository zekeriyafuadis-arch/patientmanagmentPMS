function calcAgeFromDob(dobStr) {
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

function calcDobFromAge(ageInput) {
  const age = parseInt(ageInput, 10);
  if (Number.isNaN(age) || age < 0 || age > 150) return null;
  const today = new Date();
  const dob = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  return dob.toISOString().slice(0, 10);
}

function normalizePatientDemographics(data) {
  const out = { ...data };
  let dob = (out.dob || '').trim();
  let age = out.age != null && out.age !== '' ? String(out.age).trim() : '';

  if (dob && !age) {
    const computed = calcAgeFromDob(dob);
    if (computed != null) age = String(computed);
  } else if (age && !dob) {
    const computed = calcDobFromAge(age);
    if (computed) dob = computed;
  }

  if (!dob && !age) {
    return { error: 'Date of birth or age is required' };
  }
  if (!dob || !age) {
    return { error: 'Could not determine date of birth and age' };
  }

  out.dob = dob;
  out.age = age;
  return out;
}

module.exports = { calcAgeFromDob, calcDobFromAge, normalizePatientDemographics };
