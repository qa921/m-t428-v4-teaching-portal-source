const { dbAlive, configured } = require('./_lib/supabase');

module.exports = async (req, res) => {
  const db = configured ? await dbAlive() : false;
  res.status(db ? 200 : 503).json({ ok: db, release: 'v2', db: db, time: new Date().toISOString() });
};
