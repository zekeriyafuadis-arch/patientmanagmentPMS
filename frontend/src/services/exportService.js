/**
 * Client-side export utilities (replaces server PDF/CSV endpoints)
 */

import { BRANDING } from '../config/branding.js';
import { auditService } from './auditService.js';

const CSV_COLUMNS = [
  'mrn', 'name', 'father_name', 'grandfather_name', 'gender', 'dob', 'age',
  'phone_number', 'region', 'address', 'insurance_plan', 'recall_due', 'registration_date'
];

function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportPatientsToCSV(patients, filename) {
  const header = CSV_COLUMNS.join(',');
  const rows = patients.map((p) =>
    CSV_COLUMNS.map((col) => escapeCsv(p[col])).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `patients_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  auditService.logExport('patients_csv', 'all', `${patients.length} records`);
}

export function printPatientRecord(patient) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Record - ${patient.mrn}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #333; }
        h1 { color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .field { padding: 8px; background: #f7fafc; border-radius: 6px; }
        .label { font-size: 11px; color: #718096; text-transform: uppercase; }
        .value { font-weight: 600; margin-top: 4px; }
        .section { margin-top: 24px; }
        .section h2 { font-size: 16px; color: #0891b2; }
        @media print { body { padding: 12px; } }
      </style>
    </head>
    <body>
      <h1>${BRANDING.name} — Patient Record</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <div class="grid">
        <div class="field"><div class="label">MRN</div><div class="value">${patient.mrn}</div></div>
        <div class="field"><div class="label">Name</div><div class="value">${patient.name}</div></div>
        <div class="field"><div class="label">Gender / Age</div><div class="value">${patient.gender}, ${patient.age} yrs</div></div>
        <div class="field"><div class="label">Phone</div><div class="value">${patient.phone_number}</div></div>
        <div class="field"><div class="label">Region</div><div class="value">${patient.region}</div></div>
        <div class="field"><div class="label">Registered</div><div class="value">${patient.registration_date ? new Date(patient.registration_date).toLocaleDateString() : '-'}</div></div>
      </div>
      <div class="section">
        <h2>Address</h2>
        <p>${patient.address}, ${patient.wereda_subcity}, ${patient.kebele}</p>
      </div>
      ${patient.insurance_plan ? `<div class="section"><h2>Insurance</h2><p>${patient.insurance_plan} (${patient.insurance_member_id || 'N/A'})</p></div>` : ''}
      ${patient.allergies ? `<div class="section"><h2>Allergies</h2><p>${patient.allergies}</p></div>` : ''}
      ${patient.chief_complaint ? `<div class="section"><h2>Chief Complaint</h2><p>${patient.chief_complaint}</p></div>` : ''}
      <script>window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
  auditService.logPrint('patient_record', patient.id || patient.mrn, patient.mrn);
}

export function printReceipt(invoice, payments = []) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const itemRows = (invoice.items || []).map((item) => `
    <tr>
      <td>${esc(item.procedureName)}${item.toothNumber ? ` (#${item.toothNumber})` : ''}</td>
      <td>${item.quantity || 1}</td>
      <td>${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
      <td>${parseFloat(item.lineTotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const paymentRows = payments.map((p) => `
    <tr>
      <td>${p.created_at ? new Date(p.created_at).toLocaleString() : ''}</td>
      <td>${esc(p.method)}</td>
      <td>${parseFloat(p.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${esc(invoice.invoiceNumber)}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #333; max-width: 700px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { color: #0891b2; margin: 0; font-size: 1.5rem; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.9rem; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 0.9rem; }
        th { background: #0891b2; color: white; }
        .totals { margin-top: 16px; text-align: right; }
        .totals div { margin: 4px 0; }
        .total-line { font-size: 1.2rem; font-weight: bold; color: #0891b2; }
        .footer { margin-top: 32px; text-align: center; font-size: 0.8rem; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🦷 ${BRANDING.name}</h1>
        <p>Official Receipt / Invoice</p>
      </div>
      <div class="meta">
        <div>
          <strong>Invoice:</strong> ${esc(invoice.invoiceNumber)}<br>
          <strong>Date:</strong> ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
        </div>
        <div style="text-align:right">
          <strong>${esc(invoice.patientName)}</strong><br>
          MRN: ${esc(invoice.patientMrn)}
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="totals">
        <div>Subtotal: ${parseFloat(invoice.subtotal || 0).toFixed(2)}</div>
        ${invoice.discount > 0 ? `<div>Discount: -${parseFloat(invoice.discount).toFixed(2)}</div>` : ''}
        <div class="total-line">Total: ${parseFloat(invoice.total || 0).toFixed(2)}</div>
        <div>Paid: ${parseFloat(invoice.amountPaid || 0).toFixed(2)}</div>
        <div>Balance: ${parseFloat(invoice.balance || 0).toFixed(2)}</div>
      </div>
      ${payments.length > 0 ? `
        <h3 style="margin-top:24px;color:#0891b2;">Payment History</h3>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>
      ` : ''}
      ${invoice.notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${esc(invoice.notes)}</p>` : ''}
      <div class="footer">
        <p>Thank you for choosing ${BRANDING.name}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
  auditService.logPrint('receipt', invoice.id || invoice.invoiceNumber, invoice.invoiceNumber);
}

export function printAllPatients(patients) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = patients.map((p) => `
    <tr>
      <td>${p.mrn}</td>
      <td>${p.name}</td>
      <td>${p.father_name || '-'}</td>
      <td>${p.gender}</td>
      <td>${p.age}</td>
      <td>${p.phone_number}</td>
      <td>${p.region}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>All Patients</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #0891b2; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #0891b2; color: white; }
      </style>
    </head>
    <body>
      <h1>${BRANDING.name} — All Patients</h1>
      <p>Generated: ${new Date().toLocaleString()} | Total: ${patients.length}</p>
      <table>
        <thead><tr><th>MRN</th><th>Name</th><th>Father</th><th>Gender</th><th>Age</th><th>Phone</th><th>Region</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
