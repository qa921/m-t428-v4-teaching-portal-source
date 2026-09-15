const { rest } = require('./_lib/supabase');
const { getUser, requireRole, audit, send, handleError } = require('./_lib/guard');

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    if (req.method === 'GET') {
      requireRole(user, ['admin', 'staff', 'teacher', 'student']);
      const filter = user.role === 'student'
        ? 'portal_materials?learner_visible=eq.true&select=id,course_id,kind,title,version,link,link_state&order=id'
        : 'portal_materials?select=id,course_id,kind,title,version,learner_visible,link,link_state&order=id';
      const rows = await rest(filter);
      return send(res, 200, { materials: rows });
    }
    if (req.method === 'POST') {
      requireRole(user, ['admin', 'teacher']);
      const body = req.body || {};
      const courseId = String(body.courseId || '').trim();
      const kind = String(body.kind || '').trim();
      const title = String(body.title || '').trim();
      if (!courseId || !kind || !title) return send(res, 400, { error: 'missing_fields' });
      const course = await rest('portal_courses?id=eq.' + encodeURIComponent(courseId) + '&select=id');
      if (!course || !course[0]) return send(res, 400, { error: 'unknown_course' });
      const ids = await rest('portal_materials?select=id');
      let max = 300;
      (ids || []).forEach(function (r) { const n = parseInt(String(r.id).split('-')[1], 10); if (!isNaN(n) && n > max) max = n; });
      const id = 'MAT-' + (max + 1);
      // Materials are records only; file upload stays disabled until storage policy is confirmed.
      const created = await rest('portal_materials', { method: 'POST', body: {
        id: id, course_id: courseId, kind: kind, title: title,
        version: new Date().toISOString().slice(0, 10),
        learner_visible: false, link: null, link_state: 'none', created_by: user.id
      } });
      await audit(user.id, 'create_material', id, { courseId: courseId, kind: kind, title: title });
      return send(res, 201, { material: created[0] });
    }
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (e) { return handleError(res, e); }
};
