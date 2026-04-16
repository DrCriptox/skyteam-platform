// WhatsApp Send Utility — Twilio + Meta dual-mode
// Used by cron follow-ups and direct API calls

const PROVIDER = process.env.WA_PROVIDER || 'twilio';

// Twilio
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Meta
const META_API = 'https://graph.facebook.com/v21.0';
const META_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const META_TOKEN = process.env.WHATSAPP_TOKEN || '';

async function sendText(to, text) {
  if (PROVIDER === 'twilio') {
    var params = new URLSearchParams();
    params.append('To', to.indexOf('whatsapp:') === 0 ? to : 'whatsapp:+' + to);
    params.append('From', TWILIO_FROM);
    params.append('Body', text);
    var r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_SID + '/Messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
      },
      body: params.toString()
    });
    var data = await r.json();
    return { ok: r.ok, messageId: data.sid };
  }

  // Meta
  var r2 = await fetch(META_API + '/' + META_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + META_TOKEN },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: true, body: text } })
  });
  var data2 = await r2.json();
  return { ok: r2.ok, messageId: data2.messages && data2.messages[0] ? data2.messages[0].id : null };
}

// === API Endpoint (used by cron for follow-ups) ===
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var { secret, to, text } = req.body || {};
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  if (!to || !text) return res.status(400).json({ error: 'Missing to or text' });

  try {
    var result = await sendText(to, text);
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
