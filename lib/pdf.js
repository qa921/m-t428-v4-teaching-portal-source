// Minimal branded PDF generator. Latin/ASCII text only (base-14 Helvetica),
// so invoice PDFs use English labels plus the portal brand identity.
(function () {
  'use strict';

  function escPdf(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
  function line(x, y, size, text) {
    return 'BT /F1 ' + size + ' Tf ' + x + ' ' + y + ' Td (' + escPdf(text) + ') Tj ET';
  }
  function band(x, y, w, h, rgb) {
    return rgb + ' rg ' + x + ' ' + y + ' ' + w + ' ' + h + ' re f 0 g';
  }
  function fmt(n) {
    return Number(n).toLocaleString('en-US');
  }

  // inv: {id, studentId, amountExTax, taxRate, status, receiptRef, createdBy}
  window.buildInvoicePdf = function (inv, brand) {
    var tax = Math.round(inv.amountExTax * inv.taxRate);
    var total = inv.amountExTax + tax; // tax-inclusive, consistent with the portal
    var c = [];
    c.push(band(0, 792, 595, 50, '0.11 0.25 0.85'));
    c.push('1 1 1 rg');
    c.push(line(40, 812, 20, brand.name));
    c.push(line(40, 798, 10, brand.tagline || 'Education operations portal'));
    c.push('0 g');
    c.push(line(40, 744, 16, 'INVOICE ' + inv.id));
    c.push(line(40, 720, 11, 'Status: ' + inv.status));
    c.push(line(40, 704, 11, 'Payer reference: ' + (inv.studentId || '-')));
    c.push(line(40, 688, 11, 'Issued by: ' + (inv.createdBy || 'billing staff (manual entry)')));
    c.push(line(40, 660, 12, 'Amount (excl. tax): ' + fmt(inv.amountExTax)));
    c.push(line(40, 644, 12, 'Tax (' + Math.round(inv.taxRate * 100) + '%): ' + fmt(tax)));
    c.push(band(36, 608, 523, 28, '0.93 0.95 1'));
    c.push(line(48, 617, 13, 'TOTAL (tax inclusive): ' + fmt(total)));
    c.push(line(40, 580, 11, 'Payment proof (receipt ref): ' + (inv.receiptRef || 'not attached')));
    c.push(line(40, 560, 9, 'Note: entering this invoice did not create a student account or an assumed email address.'));
    c.push(band(0, 0, 595, 40, '0.11 0.25 0.85'));
    c.push('1 1 1 rg');
    c.push(line(40, 16, 9, brand.name + ' - generated ' + new Date().toISOString().slice(0, 10)));
    var stream = c.join('\n');

    var objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objs[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    objs[5] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';

    var pdf = '%PDF-1.4\n';
    var offsets = [0];
    for (var i = 1; i <= 5; i++) {
      offsets[i] = pdf.length;
      pdf += i + ' 0 obj\n' + objs[i] + '\nendobj\n';
    }
    var xref = pdf.length;
    pdf += 'xref\n0 6\n0000000000 65535 f \n';
    for (var j = 1; j <= 5; j++) {
      pdf += String(offsets[j]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return new Blob([pdf], { type: 'application/pdf' });
  };
})();
