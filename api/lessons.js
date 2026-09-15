const { rest } = require('./_lib/supabase');
const { getUser, requireRole, audit, send, handleError } = require('./_lib/guard');

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    if (req.method === 'GET') {
      requireRole(user, ['admin', 'staff', 'teacher', 'student']);
      const filter = user.role === 'student'
        ? 'portal_lessons?student_visible=eq.true&share_state=eq.shared&select=id,course_id,starts_at,share_state,student_visible&order=starts_at'
        : 'portal_lessons?select=id,course_id,starts_at,meeting_ref,share_state,student_visible&order=starts_at';
      const rows = await rest(filter);
      return send(res, 200, { lessons: rows });
    }
    if (req.method === 'POST') {
      requireRole(user, ['admin', 'teacher']);
      const body = req.body || {};
      const courseId = String(body.courseId || '').trim();
      const startsAt = String(body.startsAt || '').trim();
      if (!courseId || !startsAt) return send(res, 400, { error: 'missing_fields' });
      const when = new Date(startsAt);
      if (isNaN(when.getTime())) return send(res, 400, { error: 'invalid_date' });
      const course = await rest('portal_courses?id=eq.' + encodeURIComponent(courseId) + '&select=id');
      if (!course || !course[0]) return send(res, 400, { error: 'unknown_course' });
      const ids = await rest('portal_lessons?select=id');
      let max = 200;
      (ids || []).forEach(function (r) { const n = parseInt(String(r.id).split('-')[1], 10); if (!isNaN(n) && n > max) max = n; });
      const id = 'SES-' + (max + 1);
      // meeting_ref intentionally left null: meeting provider is NOT connected.
      const created = await rest('portal_lessons', { method: 'POST', body: {
        id: id, course_id: courseId, starts_at: when.toISOString(),
        meeting_ref: null, share_state: 'not-shared', student_visible: false, created_by: user.id
      } });
      await audit(user.id, 'create_lesson', id, { courseId: courseId, startsAt: when.toISOString() });
      return send(res, 201, { lesson: created[0] });
    }
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (e) { return handleError(res, e); }
};
