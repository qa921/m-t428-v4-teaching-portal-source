// Invoices: staff/admin manage; students read only their own (payer_ref = own id).
// Creating an invoice NEVER creates a student account or email: payer_ref is stored
// verbatim as free text.
const { rest } = require('./_lib/supabase');
const { getUser, requireRole, audit, send, handleError } = require('./_lib/guard');

function withTotals(rows) {
  return (rows || []).map(function (i) {
    const tax = Math.round(i.amount_ex_tax * Number(i.tax_rate));
    return Object.assign({}, i, { tax: tax, total: i.amount_ex_tax + tax, prior_total_consistent: i.prior_total === (i.amount_ex_tax + tax) });
  });
}

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    if (req.method === 'GET') {
      requireRole(user, ['admin', 'staff', 'student']);
      const path = user.role === 'student'
        ? 'portal_invoices?payer_ref=eq.' + encodeURIComponent(user.id) + '&select=id,payer_ref,amount_ex_tax,tax_rate,status,receipt_ref,created_at&order=id'
        : 'portal_invoices?select=id,payer_ref,amount_ex_tax,tax_rate,status,receipt_ref,prior_total,void_reason,created_by,created_at&order=id';
      const rows = await rest(path);
      return send(res, 200, { invoices: withTotals(rows) });
    }
    if (req.method === 'POST') {
      requireRole(user, ['admin', 'staff']);
      const body = req.body || {};
      const payerRef = String(body.payerRef || '').trim();
      const amount = Number(body.amountExTax);
      const taxRate = Number(body.taxRate);
      if (!payerRef) return send(res, 400, { error: 'payer_ref_required' });
      if (!Number.isInteger(amount) || amount <= 0) return send(res, 400, { error: 'invalid_amount' });
      if (!(taxRate >= 0 && taxRate < 1)) return send(res, 400, { error: 'invalid_tax_rate' });
      const ids = await rest('portal_invoices?select=id');
      let max = 500;
      (ids || []).forEach(function (r) { const n = parseInt(String(r.id).split('-')[1], 10); if (!isNaN(n) && n > max) max = n; });
      const id = 'INV-' + (max + 1);
      const created = await rest('portal_invoices', { method: 'POST', body: {
        id: id, payer_ref: payerRef, amount_ex_tax: amount, tax_rate: taxRate,
        status: 'manual-entry', receipt_ref: null,
        prior_total: Math.round(amount * (1 + taxRate)), // born tax-inclusive-consistent
        created_by: user.id
      } });
      await audit(user.id, 'create_invoice', id, { payerRef: payerRef, amountExTax: amount, taxRate: taxRate });
      return send(res, 201, { invoice: withTotals(created)[0], note: 'No student account or email address was created.' });
    }
    if (req.method === 'PATCH') {
      requireRole(user, ['admin', 'staff']);
      const body = req.body || {};
      const id = String(body.id || '').trim();
      const action = String(body.action || '');
      if (!id || !action) return send(res, 400, { error: 'missing_fields' });
      const existing = await rest('portal_invoices?id=eq.' + encodeURIComponent(id) + '&select=id,status,receipt_ref');
      const inv = existing && existing[0];
      if (!inv) return send(res, 404, { error: 'not_found' });
      if (inv.status === 'void') return send(res, 409, { error: 'invoice_voided' });
      const now = new Date().toISOString();
      if (action === 'void') {
        const reason = String(body.reason || '').trim();
        if (!reason) return send(res, 400, { error: 'void_reason_required' });
        await rest('portal_invoices?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { status: 'void', void_reason: reason, updated_at: now } });
        await audit(user.id, 'void_invoice', id, { reason: reason });
        return send(res, 200, { ok: true, status: 'void' });
      }
      if (action === 'issue') {
        if (inv.status !== 'draft' && inv.status !== 'manual-entry') return send(res, 409, { error: 'invalid_transition' });
        await rest('portal_invoices?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { status: 'issued', updated_at: now } });
        await audit(user.id, 'issue_invoice', id, {});
        return send(res, 200, { ok: true, status: 'issued' });
      }
      if (action === 'mark-paid') {
        const receipts = await rest('portal_receipts?invoice_id=eq.' + encodeURIComponent(id) + '&select=id&limit=1');
        if ((!receipts || !receipts[0]) && !inv.receipt_ref) return send(res, 409, { error: 'payment_proof_required' });
        await rest('portal_invoices?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { status: 'paid', updated_at: now } });
        await audit(user.id, 'mark_invoice_paid', id, {});
        return send(res, 200, { ok: true, status: 'paid' });
      }
      return send(res, 400, { error: 'unknown_action' });
    }
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (e) { return handleError(res, e); }
};
