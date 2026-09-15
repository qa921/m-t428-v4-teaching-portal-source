// POST login {userId,password} -> {token,user} | GET me | DELETE logout
const crypto = require('crypto');
const { rest, rpc } = require('./_lib/supabase');
const { getUser, audit, send, handleError } = require('./_lib/guard');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      const userId = String(body.userId || '').trim();
      const password = String(body.password || '');
      if (!userId || !password) return send(res, 400, { error: 'missing_credentials' });
      const rows = await rpc('portal_verify_user', { p_id: userId, p_pass: password });
      const u = rows && rows[0];
      if (!u) { await audit(userId, 'login_failed', userId, {}); return send(res, 401, { error: 'invalid_credentials' }); }
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      await rest('portal_sessions', { method: 'POST', body: { token: token, user_id: u.id, expires_at: expires } });
      await audit(u.id, 'login', u.id, {});
      return send(res, 200, { token: token, user: { id: u.id, name: u.name, role: u.role }, expiresAt: expires });
    }
    if (req.method === 'GET') {
      const user = await getUser(req);
      if (!user) return send(res, 401, { error: 'unauthenticated' });
      return send(res, 200, { user: { id: user.id, name: user.name, role: user.role } });
    }
    if (req.method === 'DELETE') {
      const user = await getUser(req);
      if (user) {
        await rest('portal_sessions?token=eq.' + encodeURIComponent(user.token), { method: 'DELETE', prefer: 'return=minimal' });
        await audit(user.id, 'logout', user.id, {});
      }
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (e) { return handleError(res, e); }
};
