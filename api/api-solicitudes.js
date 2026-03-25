export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BIN_URL = 'https://api.jsonbin.io/v3/b/' + process.env.JSONBIN_BIN_ID;
  const HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': process.env.JSONBIN_API_KEY,
    'X-Bin-Versioning': 'false'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(BIN_URL, { headers: HEADERS });
      const data = await r.json();
      return res.status(200).json({ solicitudes: (data.record || {}).solicitudes || [] });
    }

    if (req.method === 'POST') {
      const { action, solicitud, id } = req.body;
      const r = await fetch(BIN_URL, { headers: HEADERS });
      const data = await r.json();
      const record = data.record || {};
      let solicitudes = record.solicitudes || [];

      if (action === 'add' && solicitud) {
        solicitudes.unshift(solicitud);
      } else if (action === 'remove' && id) {
        solicitudes = solicitudes.filter(s => s.id !== id);
      }

      await fetch(BIN_URL, {
        method: 'PUT', headers: HEADERS,
        body: JSON.stringify({ ...record, solicitudes })
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}