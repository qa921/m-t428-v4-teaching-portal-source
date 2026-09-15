const { rest } = require('./_lib/supabase');
const { getUser, requireRole, send, handleError } = require('./_lib/guard');

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    requireRole(user, ['admin', 'staff', 'teacher', 'student']);
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
    const rows = await rest('portal_courses?select=id,title,teacher,learner_count,term&order=id');
    return send(res, 200, { courses: rows });
  } catch (e) { return handleError(res, e); }
};
