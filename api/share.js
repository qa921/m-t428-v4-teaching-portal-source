// Share a lesson or material with students. Teacher/admin only. Notifications are
// NOT connected, so sharing means in-portal visibility; the response says so.
const { rest } = require('./_lib/supabase');
const { getUser, requireRole, audit, send, handleError } = require('./_lib/guard');

module.exports = async (req, res) => {
  try {
    const user = await getUser(req);
    requireRole(user, ['admin', 'teacher']);
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    const body = req.body || {};
    const type = String(body.type || '');
    const id = String(body.id || '').trim();
    if (!id || (type !== 'lesson' && type !== 'material')) return send(res, 400, { error: 'missing_fields' });
    if (type === 'lesson') {
      const rows = await rest('portal_lessons?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { share_state: 'shared', student_visible: true } });
      if (!rows || !rows[0]) return send(res, 404, { error: 'not_found' });
      await audit(user.id, 'share_lesson', id, {});
    } else {
      const rows = await rest('portal_materials?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { learner_visible: true } });
      if (!rows || !rows[0]) return send(res, 404, { error: 'not_found' });
      await audit(user.id, 'share_material', id, {});
    }
    return send(res, 200, { ok: true, notifications: 'not-connected', note: 'Shared in-portal only; notification provider is not connected.' });
  } catch (e) { return handleError(res, e); }
};
