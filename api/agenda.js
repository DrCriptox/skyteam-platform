// Supabase-powered agenda API with IP tracking + validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

async function sb(path, opts = {}) {
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: HEADERS, ...opts, signal: ac.signal });
    clearTimeout(tm);
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  } catch(e) { clearTimeout(tm); throw e; }
}

// === VALIDATION HELPERS ===
function getClientIP(req) {
  // Vercel/Cloudflare headers
  var xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  var xri = req.headers['x-real-ip'];
  if (xri) return xri.trim();
  return req.socket && req.socket.remoteAddress || 'unknown';
}

function validateWhatsApp(phone) {
  if (!phone) return { valid: false, reason: 'vacio' };
  var clean = phone.replace(/[\s\-\(\)\+]/g, '');
  if (!/^\d+$/.test(clean)) return { valid: false, reason: 'caracteres invalidos' };
  if (clean.length < 10) return { valid: false, reason: 'muy corto (min 10 digitos)' };
  if (clean.length > 15) return { valid: false, reason: 'muy largo (max 15 digitos)' };
  // Check not all same digit (e.g., 1111111111)
  if (/^(\d)\1+$/.test(clean)) return { valid: false, reason: 'numero falso (digitos repetidos)' };
  // Check not sequential (1234567890)
  if (clean === '1234567890' || clean === '0123456789') return { valid: false, reason: 'numero secuencial' };
  return { valid: true, cleaned: clean };
}

function validateEmail(email) {
  if (!email) return { valid: true, reason: 'opcional' }; // email is optional
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return { valid: false, reason: 'formato invalido' };
  // Check for disposable/fake domains
  var fakeDomains = ['test.com', 'fake.com', 'example.com', 'asdf.com', 'aaa.com', 'xxx.com', 'noemail.com'];
  var domain = email.split('@')[1].toLowerCase();
  if (fakeDomains.indexOf(domain) !== -1) return { valid: false, reason: 'dominio no permitido' };
  return { valid: true };
}

function validateNombre(nombre) {
  if (!nombre) return { valid: false, reason: 'vacio' };
  if (nombre.trim().length < 3) return { valid: false, reason: 'muy corto (min 3 caracteres)' };
  // Check not random characters
  if (/^[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(nombre)) return { valid: false, reason: 'nombre invalido' };
  // Check not all same character
  if (/^(.)\1+$/.test(nombre.replace(/\s/g, ''))) return { valid: false, reason: 'nombre falso' };
  return { valid: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const user = req.query?.user || (req.url && new URL('https://x.com' + req.url).searchParams.get('user'));
      if (!user) return res.status(400).json({ error: 'Missing user' });

      const configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
      const bookings = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&status=neq.cancelada&order=fecha_iso.asc');

      // Fetch plan_diario blocks for next 8 days to block personal time in agenda
      const today = new Date();
      const fechaIni = today.toISOString().slice(0,10);
      const futuro = new Date(today); futuro.setDate(futuro.getDate() + 8);
      const fechaFin = futuro.toISOString().slice(0,10);
      const planBlocks = await sb('plan_diario?username=eq.' + encodeURIComponent(user) + '&fecha=gte.' + fechaIni + '&fecha=lte.' + fechaFin + '&select=fecha,hora_inicio,hora_fin');
      const bloqueos_personales = {};
      if (planBlocks && Array.isArray(planBlocks)) {
        planBlocks.forEach(function(pb) {
          var key = pb.fecha;
          if (!bloqueos_personales[key]) bloqueos_personales[key] = [];
          bloqueos_personales[key].push({ ini: pb.hora_inicio.slice(0,5), fin: pb.hora_fin.slice(0,5) });
        });
      }

      const cfgOut = configs && configs[0] ? Object.assign({}, configs[0].config) : null;
      if (cfgOut) cfgOut.bloqueos_personales = bloqueos_personales;

      return res.status(200).json({
        config: cfgOut,
        bookings: (bookings || []).map(b => ({
          id: b.id, nombre: b.nombre, whatsapp: b.whatsapp, fechaISO: b.fecha_iso,
          status: b.status, notas: b.notas, ip_address: b.ip_address, email: b.email
        }))
      });
    }

    if (req.method === 'POST') {
      const { action, user, config, booking, id } = req.body;
      if (!user) return res.status(400).json({ error: 'Missing user' });

      if (action === 'saveConfig') {
        const existing = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=username');
        if (!existing || existing.length === 0) {
          await sb('users', { method: 'POST', headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ username: user, name: config.nombre || user, email: null, password: null, sponsor: null, ref: user }) });
        }
        await sb('agenda_configs', { method: 'POST', headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ username: user, config, updated_at: new Date().toISOString() }) });

      } else if (action === 'saveBooking') {
        // === CAPTURE IP ===
        var clientIP = getClientIP(req);
        var userAgent = req.headers['user-agent'] || 'unknown';

        // === VALIDATE DATA ===
        var nombreCheck = validateNombre(booking.nombre);
        if (!nombreCheck.valid) return res.status(400).json({ error: 'Nombre invalido: ' + nombreCheck.reason, field: 'nombre' });

        var waCheck = validateWhatsApp(booking.whatsapp);
        if (!waCheck.valid) return res.status(400).json({ error: 'WhatsApp invalido: ' + waCheck.reason, field: 'whatsapp' });

        var emailCheck = validateEmail(booking.email);
        if (!emailCheck.valid) return res.status(400).json({ error: 'Email invalido: ' + emailCheck.reason, field: 'email' });

        // Check for duplicate slot
        const taken = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&fecha_iso=eq.' + encodeURIComponent(booking.fechaISO) + '&status=neq.cancelada');
        if (taken && taken.length > 0) return res.status(409).json({ error: 'Slot already taken' });

        // === IP ANALYSIS — Flag if same IP has booked before for this user ===
        var ipFlag = null;
        if (clientIP && clientIP !== 'unknown') {
          var sameIPBookings = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&ip_address=eq.' + encodeURIComponent(clientIP) + '&status=neq.cancelada&select=id,nombre');
          if (sameIPBookings && sameIPBookings.length > 0) {
            ipFlag = { count: sameIPBookings.length, previousNames: sameIPBookings.map(function(b) { return b.nombre; }) };
          }
        }

        // Insert booking with IP + email + user_agent
        await sb('bookings', { method: 'POST',
          body: JSON.stringify({
            id: booking.id || crypto.randomUUID(),
            username: user,
            nombre: booking.nombre,
            whatsapp: waCheck.cleaned || booking.whatsapp,
            email: booking.email || null,
            fecha_iso: booking.fechaISO,
            status: 'activa',
            notas: booking.notas || null,
            ip_address: clientIP,
            user_agent: userAgent.substring(0, 500)
          })
        });

        // Send email notification
        if (process.env.RESEND_API_KEY) {
          try {
            const configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
            const cfg = configs && configs[0] ? configs[0].config : {};
            const users = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=email');
            const socioEmail = users && users[0] ? users[0].email : null;
            if (socioEmail) {
              const fd = new Date(booking.fechaISO);
              const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
              const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
              const hStr = fd.getHours().toString().padStart(2,'0') + ':' + fd.getMinutes().toString().padStart(2,'0');
              const fechaLabel = days[fd.getDay()] + ' ' + fd.getDate() + ' ' + months[fd.getMonth()] + ' · ' + hStr;

              // Include IP warning in email if flagged
              var ipWarning = '';
              if (ipFlag) {
                ipWarning = '<div style="background:rgba(255,60,60,0.15);border:1px solid rgba(255,60,60,0.4);border-radius:8px;padding:12px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#FF6B6B;">⚠️ <strong>Alerta IP:</strong> Esta reserva viene de la misma IP que ' + ipFlag.count + ' reserva(s) anterior(es) (' + ipFlag.previousNames.join(', ') + ')</p></div>';
              }

              const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:32px;border-radius:16px;"><div style="text-align:center;margin-bottom:20px;"><img src="https://skyteam.global/logo-skyteam.png" alt="SKYTEAM" style="height:44px;" /></div><h2 style="color:#FFD700;font-size:20px;">🔔 Nueva cita agendada</h2><div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;margin:16px 0;"><p style="margin:8px 0;font-size:14px;">👤 <strong>Prospecto:</strong> ' + booking.nombre + '</p><p style="margin:8px 0;font-size:14px;">📱 <strong>WhatsApp:</strong> ' + booking.whatsapp + '</p>' + (booking.email ? '<p style="margin:8px 0;font-size:14px;">📧 <strong>Email:</strong> ' + booking.email + '</p>' : '') + '<p style="margin:8px 0;font-size:14px;">📅 <strong>Fecha:</strong> ' + fechaLabel + '</p><p style="margin:8px 0;font-size:14px;">🌐 <strong>IP:</strong> ' + clientIP + '</p>' + (cfg.linkReunion ? '<p style="margin:8px 0;font-size:14px;">🔗 <strong>Sala:</strong> <a href="' + cfg.linkReunion + '" style="color:#C9A84C;">' + cfg.linkReunion + '</a></p>' : '') + '</div>' + ipWarning + '<div style="text-align:center;"><a href="https://skyteam.global" style="background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:900;">Ver en SKY SYSTEM →</a></div><p style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;margin-top:20px;">SKYTEAM · skyteam.global</p></div>';

              fetch('https://api.resend.com/emails', { method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
                body: JSON.stringify({ from: 'SKYTEAM <lideres@skyteam.global>', to: [socioEmail],
                  subject: '🔔 Nueva cita: ' + booking.nombre + ' · ' + fechaLabel + (ipFlag ? ' ⚠️ IP repetida' : ''), html }) });
            }
          } catch (e) { /* email is best-effort */ }
        }

        return res.status(200).json({ ok: true, ipFlag: ipFlag });

      } else if (action === 'cancelBooking') {
        await sb('bookings?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status: 'cancelada' }) });

      } else if (action === 'saveProof') {
        const { bookingId, proof } = req.body;
        if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
        // Save proof status (we don't store the full image in DB — just mark as verified)
        await sb('bookings?id=eq.' + encodeURIComponent(bookingId), {
          method: 'PATCH',
          body: JSON.stringify({ status: 'verificada', proof_url: 'uploaded', updated_at: new Date().toISOString() })
        });
        // Award bonus points in leaderboard (booking_proofs table)
        try {
          await sb('booking_proofs', {
            method: 'POST',
            headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
            body: JSON.stringify({ username: user, booking_id: bookingId, status: 'approved', created_at: new Date().toISOString() })
          });
        } catch(e) { console.warn('Proof points save failed:', e.message); }
        return res.status(200).json({ ok: true, proof: true });

      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('agenda error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

