// Admin-only user management: list, create (explicit, with password), update
// role/active, reset password. Never auto-created from invoice entry.
const { rest, rpc } = require('../_lib/supabase');
const { getUser, requireRole, audit, send, handleError } = require('../_lib/guard');

const ROLES = ['admin', 'staff', 'teacher', 'student'];

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    requireRole(user, ['admin']);
    if (req.method === 'GET') {
      const rows = await rest('portal_users?select=id,name,role,active,created_at&order=id');
      return send(res, 200, { users: rows });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const id = String(body.id || '').trim();
      const name = String(body.name || '').trim();
      const role = String(body.role || '');
      const password = String(body.password || '');
      if (!id || !name || ROLES.indexOf(role) === -1 || password.length < 8) {
        return send(res, 400, { error: 'invalid_fields', hint: 'id, name, valid role, password >= 8 chars required' });
      }
      await rpc('portal_create_user', { p_id: id, p_name: name, p_role: role, p_pass: password });
      await audit(user.id, 'create_user', id, { role: role });
      return send(res, 201, { ok: true, user: { id: id, name: name, role: role } });
    }
    if (req.method === 'PATCH') {
      const body = req.body || {};
      const id = String(body.id || '').trim();
      if (!id) return send(res, 400, { error: 'id_required' });
      if (id === user.id && body.active === false) return send(res, 409, { error: 'cannot_deactivate_self' });
      if (body.password) {
        if (String(body.password).length < 8) return send(res, 400, { error: 'password_too_short' });
        await rpc('portal_set_password', { p_id: id, p_pass: String(body.password) });
        await rest('portal_sessions?user_id=eq.' + encodeURIComponent(id), { method: 'DELETE', prefer: 'return=minimal' });
        await audit(user.id, 'reset_password', id, {});
      }
      const patch = {};
      if (body.role !== undefined) {
        if (ROLES.indexOf(body.role) === -1) return send(res, 400, { error: 'invalid_role' });
        patch.role = body.role;
      }
      if (body.active !== undefined) patch.active = !!body.active;
      if (Object.keys(patch).length) {
        await rest('portal_users?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: patch });
        await audit(user.id, 'update_user', id, patch);
      }
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (e) { return handleError(res, e); }
};
