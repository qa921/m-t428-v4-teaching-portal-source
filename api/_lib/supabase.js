// Server-side Supabase access (service role). Never exposed to the client.
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest(path, opts) {
  opts = opts || {};
  const res = await fetch(URL + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) { const err = new Error('db_error'); err.status = res.status; err.data = data; throw err; }
  return data;
}

async function rpc(name, args) {
  return rest('rpc/' + name, { method: 'POST', body: args || {} });
}

async function uploadReceipt(path, base64, contentType) {
  const res = await fetch(URL + '/storage/v1/object/portal-receipts/' + path, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: Buffer.from(base64, 'base64')
  });
  const text = await res.text();
  if (!res.ok) { const err = new Error('storage_error'); err.status = res.status; err.data = text; throw err; }
  try { return text ? JSON.parse(text) : {}; } catch (e) { return {}; }
}

async function storageAlive() {
  try {
    const res = await fetch(URL + '/storage/v1/bucket/portal-receipts', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    });
    return res.ok;
  } catch (e) { return false; }
}

async function dbAlive() {
  try { await rest('portal_courses?select=id&limit=1'); return true; } catch (e) { return false; }
}

module.exports = { rest, rpc, uploadReceipt, storageAlive, dbAlive, configured: !!(URL && KEY) };
