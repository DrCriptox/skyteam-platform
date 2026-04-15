// Push notifications API — handles subscription management and push notifications
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:lideres@skyteam.global';

const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

async function sb(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: HEADERS, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function sendWebPush(subscription, payload) {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
    return { ok: false, reason: 'VAPID not configured' };
  }
  try {
    const webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, result };
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { ok: false, expired: true, reason: 'subscription expired' };
    }
    return { ok: false, reason: error.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { action, user, subscription, recipientUser, title, body, url, adminKey } = req.body;

      if (action === 'subscribe') {
        if (!user || !subscription || !subscription.endpoint) {
          return res.status(400).json({ error: 'Missing user or subscription' });
        }
        await sb('push_subscriptions', {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ username: user, endpoint: subscription.endpoint, subscription: subscription })
        });
        return res.status(200).json({ ok: true, message: 'Subscription saved' });
      }

      if (action === 'unsubscribe') {
        if (!user || !subscription || !subscription.endpoint) {
          return res.status(400).json({ error: 'Missing user or subscription endpoint' });
        }
        await sb('push_subscriptions?username=eq.' + encodeURIComponent(user) + '&endpoint=eq.' + encodeURIComponent(subscription.endpoint), { method: 'DELETE' });
        return res.status(200).json({ ok: true, message: 'Subscription removed' });
      }

      if (action === 'send') {
        if (!recipientUser || !title || !body) {
          return res.status(400).json({ error: 'Missing recipientUser, title, or body' });
        }
        const subs = await sb('push_subscriptions?username=eq.' + encodeURIComponent(recipientUser));
        if (!subs || subs.length === 0) {
          return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions found' });
        }
        const payload = { title, body, url: url || '/', tag: 'skyteam-' + Date.now(), data: { url: url || '/' } };
        let sent = 0, expired = [];
        for (const sub of subs) {
          const result = await sendWebPush(sub.subscription, payload);
          if (result.ok) sent++;
          else if (result.expired) expired.push(sub.endpoint);
        }
        if (expired.length > 0) {
          for (const ep of expired) {
            await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {});
          }
        }
        return res.status(200).json({ ok: true, sent, expired: expired.length });
      }

      if (action === 'broadcast') {
        const isAdmin = adminKey === process.env.ADMIN_PUSH_KEY;
        if (!isAdmin) return res.status(403).json({ error: 'Admin key required' });
        if (!title || !body) return res.status(400).json({ error: 'Missing title or body' });
        const allSubs = await sb('push_subscriptions?select=*');
        if (!allSubs || allSubs.length === 0) return res.status(200).json({ ok: true, sent: 0 });
        const payload = { title, body, url: url || '/', tag: 'skyteam-broadcast-' + Date.now(), data: { url: url || '/' } };
        let sent = 0, expired = [];
        for (const sub of allSubs) {
          const result = await sendWebPush(sub.subscription, payload);
          if (result.ok) sent++;
          else if (result.expired) expired.push(sub.endpoint);
        }
        if (expired.length > 0) {
          for (const ep of expired) {
            await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {});
          }
        }
        return res.status(200).json({ ok: true, sent, expired: expired.length });
      }

      if (action === 'getPublicKey') {
        if (!VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'VAPID public key not configured' });
        return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('push error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
