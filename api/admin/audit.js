const { rest } = require('../_lib/supabase');
const { getUser, requireRole, send, handleError } = require('../_lib/guard');

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    requireRole(user, ['admin']);
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
    const rows = await rest('portal_audit_log?select=id,actor,action,target,detail,created_at&order=id.desc&limit=200');
    return send(res, 200, { audit: rows });
  } catch (e) { return handleError(res, e); }
};
