// Live integration status. A capability is 'connected' ONLY if its key is configured
// AND a live check performed right now succeeded. Meetings/notifications have no
// provider keys, so they always report not-connected until that changes.
const { storageAlive, dbAlive, configured } = require('./_lib/supabase');

module.exports = async (req, res) => {
  const storageTest = configured ? await storageAlive() : false;
  const dbTest = configured ? await dbAlive() : false;
  const meetingsConfigured = !!process.env.MEETING_PROVIDER_TOKEN;
  const notificationsConfigured = !!process.env.NOTIFICATION_PROVIDER_KEY;
  res.status(200).json({
    rule: 'available only when a key is configured AND a live test passes',
    checkedAt: new Date().toISOString(),
    meetings: { key: 'MEETING_PROVIDER_TOKEN', configured: meetingsConfigured, liveTest: false, status: 'not-connected' },
    notifications: { key: 'NOTIFICATION_PROVIDER_KEY', configured: notificationsConfigured, liveTest: false, status: 'not-connected' },
    database: { key: 'SUPABASE_URL + service key', configured: configured, liveTest: dbTest, status: dbTest ? 'connected' : 'not-connected' },
    storage: { key: 'supabase bucket portal-receipts', configured: configured, liveTest: storageTest, status: storageTest ? 'connected' : 'not-connected' }
  });
};
