// Supabase-powered chat messages API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/chat_messages?order=timestamp.desc&limit=100', { headers: HEADERS });
      if (!r.ok) throw new Error('Supabase GET failed: ' + r.status);
      const rows = await r.json();
      // Return in chronological order (oldest first) to match frontend expectations
      const messages = rows.reverse().map(m => ({ user: m.username, text: m.text, avatar: m.avatar, ts: m.timestamp, rank: m.rank || 0 }));
      return res.status(200).json({ messages });
    }

    if (req.method === 'POST') {
      // Admin delete
      if (req.body.action === 'delete') {
        const { msgText, msgUser } = req.body;
        if (msgText && msgUser) {
          await fetch(SUPABASE_URL + '/rest/v1/chat_messages?username=eq.' + encodeURIComponent(msgUser) + '&text=eq.' + encodeURIComponent(msgText) + '&limit=1', { method: 'DELETE', headers: HEADERS });
        }
        return res.status(200).json({ ok: true });
      }

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages array' });

      // The frontend sends the full message history. We only need to insert new ones.
      // Strategy: delete all and re-insert last 100, OR just insert the latest message.
      // Simpler: the frontend always sends all messages, so just take the last one as new.
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        const r = await fetch(SUPABASE_URL + '/rest/v1/chat_messages', {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({ username: lastMsg.user || lastMsg.username || 'anon', text: lastMsg.text, avatar: lastMsg.avatar || null, rank: lastMsg.rank || 0 })
        });
        if (!r.ok) throw new Error('Supabase POST failed: ' + r.status);
      }

      // Cleanup: keep only last 100 messages
      const countR = await fetch(SUPABASE_URL + '/rest/v1/chat_messages?select=id&order=timestamp.desc&offset=100', { headers: HEADERS });
      if (countR.ok) {
        const old = await countR.json();
        if (old.length > 0) {
          const ids = old.map(m => m.id);
          await fetch(SUPABASE_URL + '/rest/v1/chat_messages?id=in.(' + ids.join(',') + ')', { method: 'DELETE', headers: HEADERS });
        }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('chat-messages error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
