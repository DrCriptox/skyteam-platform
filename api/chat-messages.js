// Vercel Serverless Function — /api/chat-messages.js
// Shared chat storage using JSONBin.io (same account, different bin)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BIN_ID = process.env.JSONBIN_CHAT_BIN_ID || process.env.JSONBIN_BIN_ID;
  const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  const HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': process.env.JSONBIN_API_KEY,
    'X-Bin-Versioning': 'false'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(BIN_URL, { headers: HEADERS });
      const data = await r.json();
      const record = data.record || {};
      return res.status(200).json({ messages: record.messages || [] });
    }
    if (req.method === 'POST') {
      const { messages } = req.body;
      // Read current, merge, keep last 100
      const r = await fetch(BIN_URL, { headers: HEADERS });
      const data = await r.json();
      const current = (data.record && data.record.messages) ? data.record.messages : [];
      // Use incoming messages (they already include all history)
      const merged = messages || current;
      await fetch(BIN_URL, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify({ ...data.record, messages: merged.slice(-100) })
      });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
