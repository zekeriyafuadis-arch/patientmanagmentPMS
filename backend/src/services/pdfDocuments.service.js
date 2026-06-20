const PDFDocument = require('pdfkit');

function streamPdf(res, filename, build) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);
  build(doc);
  doc.end();
}

function writeHeader(doc, title, clinicName = 'Dental Clinic') {
  doc.fontSize(18).text(clinicName, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).text(title, { align: 'center' });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();
}

function generateInvoicePdf(invoice, payments = []) {
  return (doc) => {
    writeHeader(doc, `Invoice ${invoice.invoice_number || invoice.invoiceNumber}`);
    doc.fontSize(10);
    doc.text(`Patient: ${invoice.patient_name || invoice.patientName || '—'}`);
    doc.text(`MRN: ${invoice.patient_mrn || invoice.patientMrn || '—'}`);
    doc.text(`Date: ${new Date(invoice.created_at || invoice.createdAt).toLocaleDateString()}`);
    doc.text(`Status: ${invoice.status || '—'}`);
    doc.moveDown();

    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items || '[]') : (invoice.items || []);
    doc.fontSize(11).text('Items', { underline: true });
    doc.moveDown(0.3);
    items.forEach((item) => {
      doc.text(`${item.description || item.procedureName || 'Item'} — ${Number(item.price || item.amount || 0).toFixed(2)} ETB`);
    });
    doc.moveDown();
    doc.text(`Subtotal: ${Number(invoice.subtotal || 0).toFixed(2)} ETB`);
    doc.text(`Discount: ${Number(invoice.discount || 0).toFixed(2)} ETB`);
    doc.font('Helvetica-Bold').text(`Total: ${Number(invoice.total || 0).toFixed(2)} ETB`);
    doc.font('Helvetica');
    doc.text(`Paid: ${Number(invoice.amount_paid || invoice.amountPaid || 0).toFixed(2)} ETB`);
    doc.text(`Balance: ${Number(invoice.balance || 0).toFixed(2)} ETB`);

    if (payments.length) {
      doc.moveDown();
      doc.fontSize(11).text('Payments', { underline: true });
      payments.forEach((p) => {
        doc.text(`${new Date(p.created_at || p.createdAt).toLocaleString()} — ${Number(p.amount).toFixed(2)} ETB (${p.method})`);
      });
    }
  };
}

function generateReceiptPdf(payment, invoice) {
  return (doc) => {
    writeHeader(doc, 'Payment Receipt');
    doc.fontSize(10);
    doc.text(`Receipt #: ${payment.id}`);
    doc.text(`Date: ${new Date(payment.created_at || payment.createdAt).toLocaleString()}`);
    doc.text(`Patient: ${invoice?.patient_name || invoice?.patientName || '—'}`);
    doc.text(`MRN: ${invoice?.patient_mrn || invoice?.patientMrn || '—'}`);
    doc.text(`Invoice: ${invoice?.invoice_number || invoice?.invoiceNumber || '—'}`);
    doc.moveDown();
    doc.fontSize(14).text(`Amount received: ${Number(payment.amount).toFixed(2)} ETB`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Method: ${payment.method || 'cash'}`, { align: 'center' });
    if (payment.reference) doc.text(`Reference: ${payment.reference}`, { align: 'center' });
    doc.moveDown(2);
    doc.text(`Received by: ${payment.received_by_name || payment.receivedByName || '—'}`);
    doc.moveDown(3);
    doc.text('Thank you for your payment.', { align: 'center' });
  };
}

function generateLetterPdf({ title, body, patientName }) {
  return (doc) => {
    writeHeader(doc, title || 'Clinical Letter');
    doc.fontSize(10);
    if (patientName) doc.text(`Re: ${patientName}`);
    doc.moveDown();
    doc.text(body || '', { align: 'left', lineGap: 4 });
  };
}

function generateEodReportPdf(report) {
  return (doc) => {
    writeHeader(doc, `End-of-Day Cash Report — ${report.date}`);
    doc.fontSize(10);
    doc.text(`Total payments: ${report.totalCount}`);
    doc.text(`Grand total: ${Number(report.grandTotal).toFixed(2)} ETB`);
    doc.moveDown();
    doc.fontSize(11).text('By payment method', { underline: true });
    doc.moveDown(0.3);
    Object.entries(report.byMethod || {}).forEach(([method, data]) => {
      doc.text(`${method}: ${data.count} payment(s) — ${Number(data.total).toFixed(2)} ETB`);
    });
    if (report.payments?.length) {
      doc.moveDown();
      doc.fontSize(11).text('Detail', { underline: true });
      report.payments.slice(0, 80).forEach((p) => {
        doc.fontSize(9).text(
          `${new Date(p.created_at).toLocaleTimeString()} | ${p.patient_name || '—'} | ${Number(p.amount).toFixed(2)} ETB | ${p.method}`
        );
      });
    }
  };
}

module.exports = {
  streamPdf,
  generateInvoicePdf,
  generateReceiptPdf,
  generateLetterPdf,
  generateEodReportPdf
};
