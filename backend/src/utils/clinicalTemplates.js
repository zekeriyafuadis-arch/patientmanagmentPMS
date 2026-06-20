const LETTER_TEMPLATES = {
  referral: {
    title: 'Referral Letter',
    body: `Dear Colleague,

Re: {{patientName}} (MRN: {{mrn}})
Date of birth: {{dob}}
Contact: {{phone}}

We are referring the above patient for your specialist opinion regarding:
{{reason}}

Relevant clinical notes:
{{notes}}

Please send your report to our clinic at your earliest convenience.

Kind regards,
{{doctorName}}
{{clinicName}}
{{date}}`
  },
  postop: {
    title: 'Post-Operative Instructions',
    body: `Patient: {{patientName}} (MRN: {{mrn}})
Date: {{date}}
Procedure: {{procedure}}

Instructions:
• Take prescribed medication as directed.
• Avoid hard or hot foods for 24 hours.
• Apply ice pack externally if swelling occurs (15 min on / 15 min off).
• Contact the clinic if pain, bleeding, or swelling worsens after 48 hours.
• {{customNotes}}

Emergency contact: {{clinicPhone}}

{{doctorName}}
{{clinicName}}`
  },
  prescription: {
    title: 'Prescription',
    body: `Patient: {{patientName}} (MRN: {{mrn}})
Date: {{date}}
DOB: {{dob}}

Rx:
{{medications}}

Sig: {{directions}}

{{doctorName}}
License / ID: {{doctorId}}`
  }
};

function fillTemplate(templateKey, vars = {}) {
  const tpl = LETTER_TEMPLATES[templateKey];
  if (!tpl) return null;
  let body = tpl.body;
  Object.entries(vars).forEach(([key, val]) => {
    body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val ?? ''));
  });
  return { title: tpl.title, body, templateKey };
}

function listTemplates() {
  return Object.entries(LETTER_TEMPLATES).map(([key, t]) => ({
    key,
    title: t.title
  }));
}

module.exports = { LETTER_TEMPLATES, fillTemplate, listTemplates };
