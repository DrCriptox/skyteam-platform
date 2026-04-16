// SKYTEAM Platform Healthcheck — runs all critical path tests
// Triggered by scheduled task or manual call. Sends email report.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

async function test(name, fn) {
  var start = Date.now();
  try {
    var result = await fn();
    return { name, ok: true, ms: Date.now() - start, detail: result || 'OK' };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - start, detail: e.message || 'Error' };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth: require secret key to prevent abuse
  var authKey = (req.query && req.query.key) || (req.body && req.body.key) || '';
  var validKey = process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.slice(-12) : 'skyteam2026';
  if (authKey !== validKey && authKey !== 'skyteam_healthcheck_2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var results = [];
  var host = (req.headers && req.headers.host) || 'skyteam.global';
  var base = (host.indexOf('localhost') === 0 ? 'http' : 'https') + '://' + host;

  // 1. Supabase connection
  results.push(await test('Supabase DB', async function() {
    var r = await fetch(SUPABASE_URL + '/rest/v1/users?select=username&limit=1', { headers: SB_HEADERS });
    if (!r.ok) throw new Error('Status ' + r.status);
    var d = await r.json();
    return d.length > 0 ? d.length + ' users accessible' : 'Empty response';
  }));

  // 2. Login API
  results.push(await test('Login API', async function() {
    var r = await fetch(base + '/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '__healthcheck__', password: 'test' })
    });
    var d = await r.json();
    // Should return 401 (user not found) — not 500
    if (r.status === 401) return 'Auth working (rejects invalid)';
    if (r.status === 429) return 'Rate limited (OK)';
    throw new Error('Unexpected status ' + r.status);
  }));

  // 3. Users API
  results.push(await test('Users API', async function() {
    var r = await fetch(base + '/api/users');
    if (!r.ok) throw new Error('Status ' + r.status);
    var d = await r.json();
    var count = d.users ? Object.keys(d.users).length : 0;
    return count + ' users loaded';
  }));

  // 4. Prospectos API
  results.push(await test('Prospectos API', async function() {
    var r = await fetch(base + '/api/prospectos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getAll', user: 'dradmin' })
    });
    if (!r.ok) throw new Error('Status ' + r.status);
    var d = await r.json();
    return (d.prospectos ? d.prospectos.length : 0) + ' prospectos';
  }));

  // 5. Agenda API
  results.push(await test('Agenda API', async function() {
    var r = await fetch(base + '/api/agenda?user=dradmin');
    if (!r.ok) throw new Error('Status ' + r.status);
    var d = await r.json();
    return 'Config: ' + (d.config ? 'OK' : 'null') + ', Bookings: ' + (d.bookings ? d.bookings.length : 0);
  }));

  // 6. Chat/AI API
  results.push(await test('Chat AI (GPT)', async function() {
    var r = await fetch(base + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: 'Reply OK', messages: [{ role: 'user', content: 'healthcheck ping' }], max_tokens: 10 })
    });
    if (!r.ok) throw new Error('Status ' + r.status);
    var d = await r.json();
    var text = (d.content && d.content[0]) ? d.content[0].text : (d.reply || '');
    return text ? 'AI responding (' + text.substring(0, 30) + ')' : 'No response';
  }));

  // 7. Forgot Password (secret check only)
  results.push(await test('Reset Password Chain', async function() {
    var r = await fetch(base + '/api/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'healthcheck@test.invalid' })
    });
    if (!r.ok) throw new Error('Status ' + r.status);
    return 'Endpoint responding';
  }));

  // 8. Resend Email API
  results.push(await test('Email (Resend)', async function() {
    if (!RESEND_KEY) throw new Error('RESEND_KEY not configured');
    return 'Key configured (' + RESEND_KEY.substring(0, 8) + '...)';
  }));

  // 9. Homepage loads
  results.push(await test('Homepage HTML', async function() {
    var r = await fetch(base + '/', { redirect: 'follow' });
    if (!r.ok) throw new Error('Status ' + r.status);
    var size = parseInt(r.headers.get('content-length') || '0');
    if (size === 0) {
      var text = await r.text();
      size = text.length;
    }
    return Math.round(size / 1024) + 'KB loaded';
  }));

  // 10. Service Worker
  results.push(await test('Service Worker', async function() {
    var r = await fetch(base + '/sw.js');
    if (!r.ok) throw new Error('Status ' + r.status);
    var text = await r.text();
    var version = (text.match(/Service Worker v(\d+)/) || [])[1] || '?';
    return 'v' + version;
  }));

  // Compile report
  var passed = results.filter(function(r) { return r.ok; }).length;
  var failed = results.filter(function(r) { return !r.ok; });
  var totalMs = results.reduce(function(s, r) { return s + r.ms; }, 0);
  var allOk = failed.length === 0;

  var now = new Date();
  var colTime = now.toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });
  var colDate = now.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });

  // Send email report
  if (RESEND_KEY && req.query && req.query.notify !== 'false') {
    var statusEmoji = allOk ? '✅' : '🔴';
    var subject = statusEmoji + ' SKYTEAM Healthcheck — ' + passed + '/' + results.length + ' OK — ' + colTime;

    var rows = results.map(function(r) {
      return '<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">'
        + '<td style="padding:8px 12px;font-size:13px;color:' + (r.ok ? '#1D9E75' : '#E24B4A') + ';">' + (r.ok ? '✅' : '❌') + '</td>'
        + '<td style="padding:8px 12px;font-size:13px;color:#F0EDE6;font-weight:700;">' + r.name + '</td>'
        + '<td style="padding:8px 12px;font-size:12px;color:rgba(255,255,255,0.5);">' + r.detail + '</td>'
        + '<td style="padding:8px 12px;font-size:11px;color:rgba(255,255,255,0.3);">' + r.ms + 'ms</td>'
        + '</tr>';
    }).join('');

    var emailHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;">'
      + '<div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">'
      + '<div style="font-size:28px;margin-bottom:4px;">' + statusEmoji + '</div>'
      + '<h2 style="color:#fff;font-size:18px;margin:0 0 4px;">Healthcheck SKYTEAM</h2>'
      + '<p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">' + colDate + ' — ' + colTime + ' (Colombia)</p>'
      + '</div>'
      + '<div style="padding:20px 28px;">'
      + '<div style="display:flex;gap:16px;margin-bottom:16px;">'
      + '<div style="background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);border-radius:10px;padding:12px 16px;text-align:center;flex:1;"><div style="font-size:22px;font-weight:900;color:#1D9E75;">' + passed + '</div><div style="font-size:10px;color:rgba(255,255,255,0.4);">Passed</div></div>'
      + (failed.length > 0 ? '<div style="background:rgba(226,75,74,0.1);border:1px solid rgba(226,75,74,0.2);border-radius:10px;padding:12px 16px;text-align:center;flex:1;"><div style="font-size:22px;font-weight:900;color:#E24B4A;">' + failed.length + '</div><div style="font-size:10px;color:rgba(255,255,255,0.4);">Failed</div></div>' : '')
      + '<div style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);border-radius:10px;padding:12px 16px;text-align:center;flex:1;"><div style="font-size:22px;font-weight:900;color:#C9A84C;">' + totalMs + '</div><div style="font-size:10px;color:rgba(255,255,255,0.4);">ms total</div></div>'
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;margin-top:8px;">'
      + '<thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><th style="text-align:left;padding:6px 12px;font-size:10px;color:rgba(255,255,255,0.3);text-transform:uppercase;">St</th><th style="text-align:left;padding:6px 12px;font-size:10px;color:rgba(255,255,255,0.3);text-transform:uppercase;">Test</th><th style="text-align:left;padding:6px 12px;font-size:10px;color:rgba(255,255,255,0.3);text-transform:uppercase;">Detalle</th><th style="text-align:left;padding:6px 12px;font-size:10px;color:rgba(255,255,255,0.3);text-transform:uppercase;">Tiempo</th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table>'
      + (failed.length > 0 ? '<div style="margin-top:16px;padding:12px;background:rgba(226,75,74,0.08);border:1px solid rgba(226,75,74,0.2);border-radius:10px;"><p style="margin:0;font-size:13px;color:#E24B4A;font-weight:700;">⚠️ Fallos detectados:</p>' + failed.map(function(f) { return '<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">• ' + f.name + ': ' + f.detail + '</p>'; }).join('') + '</div>' : '')
      + '</div>'
      + '<div style="padding:12px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);">Healthcheck automático — skyteam.global</p></div>'
      + '</div>';

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND_KEY },
        body: JSON.stringify({
          from: 'SKYTEAM Health <soporte@skyteam.global>',
          to: ['yonfer.300@gmail.com'],
          subject: subject,
          html: emailHtml
        })
      });
    } catch (e) { console.error('[HEALTHCHECK] Email send failed:', e.message); }
  }

  return res.status(200).json({
    ok: allOk,
    passed: passed,
    failed: failed.length,
    total: results.length,
    totalMs: totalMs,
    results: results
  });
}
