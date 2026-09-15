// Upload payment proof for an invoice -> Supabase Storage bucket 'portal-receipts'.
// Staff/admin only. Marks the invoice paid and writes an audit record.
const { rest, uploadReceipt } = require('./_lib/supabase');
const { getUser, requireRole, audit, send, handleError } = require('./_lib/guard');

const MAX_BYTES = 2 * 1024 * 1024;

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    requireRole(user, ['admin', 'staff']);
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    const invoiceId = String((req.query && req.query.invoice) || '').trim();
    if (!invoiceId) return send(res, 400, { error: 'invoice_required' });
    const existing = await rest('portal_invoices?id=eq.' + encodeURIComponent(invoiceId) + '&select=id,status');
    const inv = existing && existing[0];
    if (!inv) return send(res, 404, { error: 'invoice_not_found' });
    if (inv.status === 'void') return send(res, 409, { error: 'invoice_voided' });
    const body = req.body || {};
    const fileName = String(body.fileName || 'receipt.bin').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
    const base64 = String(body.contentBase64 || '');
    const contentType = String(body.contentType || 'application/octet-stream');
    const note = String(body.note || '').slice(0, 300);
    if (!base64) return send(res, 400, { error: 'file_required' });
    const approxBytes = Math.floor(base64.length * 3 / 4);
    if (approxBytes > MAX_BYTES) return send(res, 413, { error: 'file_too_large', maxBytes: MAX_BYTES });
    const path = invoiceId + '/' + Date.now() + '_' + fileName;
    await uploadReceipt(path, base64, contentType);
    const inserted = await rest('portal_receipts', { method: 'POST', body: {
      invoice_id: invoiceId, file_path: 'portal-receipts/' + path, file_name: fileName, note: note || null, uploaded_by: user.id
    } });
    await rest('portal_invoices?id=eq.' + encodeURIComponent(invoiceId), { method: 'PATCH', body: {
      receipt_ref: path, status: 'paid', updated_at: new Date().toISOString()
    } });
    await audit(user.id, 'upload_receipt', invoiceId, { path: path, fileName: fileName, bytes: approxBytes });
    return send(res, 201, { ok: true, receipt: inserted[0], invoiceStatus: 'paid' });
  } catch (e) { return handleError(res, e); }
};
