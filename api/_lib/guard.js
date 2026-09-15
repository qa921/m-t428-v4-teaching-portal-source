// Auth/session + RBAC helpers. All authorization decisions happen here, on the server.
const { rest } = require('./supabase');

async function getUser(req) {
  const h = req.headers.authorization || '';
  const token = h.indexOf('Bearer ') === 0 ? h.slice(7) : null;
  if (!token) return null;
  const rows = await rest(
    'portal_sessions?token=eq.' + encodeURIComponent(token) +
    '&expires_at=gt.' + encodeURIComponent(new Date().toISOString()) +
    '&select=token,user_id,portal_users(id,name,role,active)'
  );
  const s = rows && rows[0];
  if (!s || !s.portal_users || !s.portal_users.active) return null;
  return { id: s.portal_users.id, name: s.portal_users.name, role: s.portal_users.role, token: s.token };
}

function requireRole(user, roles) {
  if (!user) { const e = new Error('unauthenticated'); e.status = 401; throw e; }
  if (roles.indexOf(user.role) === -1) { const e = new Error('forbidden'); e.status = 403; throw e; }
}

async function audit(actor, action, target, detail) {
  try {
    await rest('portal_audit_log', { method: 'POST', body: { actor: actor, action: action, target: target || null, detail: detail || {} } });
  } catch (e) { /* audit failure must not leak details to the client */ }
}

function send(res, status, body) { res.status(status).json(body); }

function handleError(res, e) {
  send(res, e.status || 500, { error: e.message || 'server_error' });
}

module.exports = { getUser, requireRole, audit, send, handleError };
