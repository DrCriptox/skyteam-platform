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

      // Fetch user's profile photo + name from users table
      const userProfile = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=photo,name');
      const profilePhoto = userProfile && userProfile[0] ? userProfile[0].photo : null;
      const profileName = userProfile && userProfile[0] ? userProfile[0].name : null;

      // Fetch plan_diario blocks for next 8 days — Colombia time (UTC-5)
      const today = new Date(Date.now() - 18000000);
      const fechaIni = today.toISOString().slice(0,10);
      const futuro = new Date(today.getTime() + 8 * 86400000);
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
      if (cfgOut) {
        cfgOut.bloqueos_personales = bloqueos_personales;
        // Inject profile photo if agenda config doesn't have one
        if (!cfgOut.foto && profilePhoto) cfgOut.foto = profilePhoto;
        // Inject profile name if agenda config doesn't have one
        if (!cfgOut.nombre && profileName) cfgOut.nombre = profileName;
      }

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

        // === IP ANALYSIS — Flag if same IP as socio (auto-reserva) or repeated ===
        var ipFlag = null;
        var selfBooking = false;
        if (clientIP && clientIP !== 'unknown') {
          // Check if booking IP matches the socio's last login IP
          var socioData = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=last_ip');
          var socioIP = socioData && socioData[0] ? socioData[0].last_ip : '';
          if (socioIP && socioIP === clientIP) {
            selfBooking = true;
            ipFlag = { count: 0, selfBooking: true, reason: 'IP coincide con la del socio' };
            console.log('[AGENDA] SELF-BOOKING detected: socio=' + user + ' IP=' + clientIP);
          }
          // Also check if same IP has booked before for this user
          if (!selfBooking) {
            var sameIPBookings = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&ip_address=eq.' + encodeURIComponent(clientIP) + '&status=neq.cancelada&select=id,nombre');
            if (sameIPBookings && sameIPBookings.length > 0) {
              ipFlag = { count: sameIPBookings.length, selfBooking: false, previousNames: sameIPBookings.map(function(b) { return b.nombre; }) };
            }
          }
        }

        // Insert booking with IP + email + user_agent + self_booking flag
        await sb('bookings', { method: 'POST',
          body: JSON.stringify({
            id: booking.id || crypto.randomUUID(),
            username: user,
            nombre: booking.nombre,
            whatsapp: waCheck.cleaned || booking.whatsapp,
            email: booking.email || null,
            fecha_iso: booking.fechaISO,
            status: selfBooking ? 'sospechosa' : 'activa',
            notas: selfBooking ? 'Auto-reserva detectada (misma IP que socio)' : (booking.notas || null),
            ip_address: clientIP,
            user_agent: userAgent.substring(0, 500)
          })
        });

        // ══════════════════════════════════════════════════════
        // 6 SCHEDULED EMAILS: 3 for prospect + 3 for socio
        // ══════════════════════════════════════════════════════
        if (process.env.RESEND_API_KEY) {
          try {
            const configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
            const cfg = configs && configs[0] ? configs[0].config : {};
            const users = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=email,name,whatsapp');
            const socioEmail = users && users[0] ? users[0].email : null;
            const socioName = users && users[0] ? users[0].name : user;
            const socioWa = users && users[0] ? users[0].whatsapp || '' : '';
            const fd = new Date(booking.fechaISO);
            const citaMs = fd.getTime();
            const nowMs = Date.now();
            // Timezone from WhatsApp country code
            var _tzFromWa = function(wa) {
              if(!wa) return 'America/Bogota';
              var m = {'+57':'America/Bogota','+52':'America/Mexico_City','+51':'America/Lima','+56':'America/Santiago','+54':'America/Argentina/Buenos_Aires','+58':'America/Caracas','+593':'America/Guayaquil','+507':'America/Panama','+506':'America/Costa_Rica','+1':'America/New_York','+34':'Europe/Madrid','+55':'America/Sao_Paulo'};
              var codes = Object.keys(m).sort(function(a,b){return b.length-a.length;});
              for(var i=0;i<codes.length;i++) if(wa.indexOf(codes[i])===0) return m[codes[i]];
              return 'America/Bogota';
            };
            var socioTZ = _tzFromWa(socioWa);
            var prospectTZ = _tzFromWa(booking.whatsapp || '');
            var _fmtDate = function(d, tz) {
              try {
                return d.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',timeZone:tz}) + ' a las ' + d.toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:tz});
              } catch(e) { var rH=d.getHours(),mn=d.getMinutes().toString().padStart(2,'0'),ap=rH>=12?'PM':'AM'; return d.toLocaleDateString('es-CO') + ' ' + (rH%12||12)+':'+mn+' '+ap; }
            };
            var _fmtTime = function(d, tz) {
              try { return d.toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:tz}); }
              catch(e) { var rH=d.getHours(),mn=d.getMinutes().toString().padStart(2,'0'),ap=rH>=12?'PM':'AM'; return (rH%12||12)+':'+mn+' '+ap; }
            };
            var fechaSocio = _fmtDate(fd, socioTZ);
            var horaSocio = _fmtTime(fd, socioTZ);
            var fechaProspect = _fmtDate(fd, prospectTZ);
            var horaProspect = _fmtTime(fd, prospectTZ);
            const linkSala = cfg.linkReunion || '';
            const prospectEmail = booking.email || null;
            const prospectName = booking.nombre || 'Estimado/a';
            const RESEND_H = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY };
            const LOGO = 'https://skyteam.global/logo-skyteam-white.png';
            var _wrap = function(body) { return '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:32px;border-radius:16px;"><div style="text-align:center;margin-bottom:20px;"><img src="' + LOGO + '" alt="SKYTEAM" style="height:36px;" /></div>' + body + '<p style="text-align:center;color:rgba(255,255,255,0.15);font-size:9px;margin-top:20px;">Sky Team \u2014 skyteam.global</p></div>'; };
            var _btn = function(text, url) { return '<div style="text-align:center;margin:20px 0;"><a href="' + url + '" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">' + text + '</a></div>'; };
            var _sendEmail = function(to, subject, html, sendAt) {
              var payload = { from: 'SKYTEAM <soporte@skyteam.global>', to: [to], subject: subject, html: html };
              if (sendAt && sendAt > nowMs + 60000) payload.scheduled_at = new Date(sendAt).toISOString();
              fetch('https://api.resend.com/emails', { method: 'POST', headers: RESEND_H, body: JSON.stringify(payload) }).catch(function(){});
            };

            // ── SOCIO EMAIL 1: Instant — Nueva cita agendada ──
            if (socioEmail) {
              var ipWarning = ipFlag ? '<div style="background:rgba(255,60,60,0.12);border:1px solid rgba(255,60,60,0.3);border-radius:8px;padding:10px;margin:12px 0;font-size:12px;color:#FF6B6B;">\u26A0\uFE0F IP repetida</div>' : '';
              _sendEmail(socioEmail, '\uD83D\uDD14 Nueva cita: ' + prospectName + ' \u00b7 ' + horaSocio,
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:36px;margin-bottom:8px;">\uD83C\uDF89</div><h2 style="color:#C9A84C;font-size:18px;margin:0 0 6px;">\u00a1Nueva cita agendada!</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">' + fechaSocio + '</p></div>'
                + '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:18px;margin-bottom:16px;">'
                + '<p style="margin:6px 0;font-size:14px;">\uD83D\uDC64 <strong>' + prospectName + '</strong></p>'
                + '<p style="margin:6px 0;font-size:13px;color:rgba(255,255,255,0.5);">\uD83D\uDCF1 ' + booking.whatsapp + (prospectEmail ? ' \u00b7 \uD83D\uDCE7 ' + prospectEmail : '') + '</p>'
                + '</div>' + ipWarning + _btn('\uD83D\uDCCA Ver mi agenda', 'https://skyteam.global/?nav=agenda')), nowMs);
            }

            // ── SOCIO EMAIL 2: 1h before — Recordatorio ──
            if (socioEmail && citaMs - nowMs > 65 * 60000) {
              _sendEmail(socioEmail, '\u23F0 En 1 hora: cita con ' + prospectName,
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:36px;margin-bottom:8px;">\u23F0</div><h2 style="color:#F0EDE6;font-size:18px;margin:0 0 6px;">Falta 1 hora para tu cita</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">con <strong>' + prospectName + '</strong> a las <strong>' + horaSocio + '</strong></p></div>'
                + '<div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">'
                + '<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Prepara tu presentaci\u00f3n y ten el link de la sala listo.</p></div>'
                + _btn('\uD83D\uDCCB Revisar agenda', 'https://skyteam.global/?nav=agenda')), citaMs - 60 * 60000);
            }

            // ── SOCIO EMAIL 3: 7min before — Abre sala ──
            if (socioEmail && citaMs - nowMs > 10 * 60000) {
              _sendEmail(socioEmail, '\uD83D\uDFE2 Ve abriendo sala \u2014 ' + prospectName + ' en 7 min',
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:36px;margin-bottom:8px;">\uD83D\uDFE2</div><h2 style="color:#C9A84C;font-size:18px;margin:0 0 6px;">\u00a1Abre la sala!</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">Le acabamos de notificar a <strong>' + prospectName + '</strong> que la reuni\u00f3n inicia en 2 minutos.</p></div>'
                + (linkSala ? _btn('\uD83D\uDE80 Abrir sala de reuni\u00f3n', linkSala) : '<div style="text-align:center;padding:12px;color:rgba(255,255,255,0.3);font-size:12px;">Configura tu link de sala en Sky Journal \u2192 Configurar</div>')
                + '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.25);margin-top:8px;">\uD83D\uDCC5 ' + fechaSocio + '</div>'), citaMs - 7 * 60000);
            }

            // ── PROSPECT EMAIL 1: 4h before — Confirmaci\u00f3n ──
            if (prospectEmail && citaMs - nowMs > 4.1 * 3600000) {
              _sendEmail(prospectEmail, '\uD83D\uDCC5 Tu reuni\u00f3n con ' + socioName + ' es hoy',
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:36px;margin-bottom:8px;">\uD83D\uDCC5</div><h2 style="color:#F0EDE6;font-size:18px;margin:0 0 6px;">Hola ' + prospectName.split(' ')[0] + ', tu reuni\u00f3n es hoy</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">' + fechaProspect + '</p></div>'
                + '<div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:18px;margin-bottom:16px;text-align:center;">'
                + '<p style="margin:0 0 8px;font-size:14px;color:#F0EDE6;"><strong>' + socioName + '</strong> te estar\u00e1 esperando</p>'
                + '<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);">Ten lista tu c\u00e1mara y micr\u00f3fono para la mejor experiencia \uD83C\uDF1F</p></div>'
                + _btn('\u2705 Confirmar asistencia', 'https://skyteam.global')), citaMs - 4 * 3600000);
            }

            // ── PROSPECT EMAIL 2: 1h before — Recordatorio ──
            if (prospectEmail && citaMs - nowMs > 65 * 60000) {
              _sendEmail(prospectEmail, '\u23F0 En 1 hora nos vemos, ' + prospectName.split(' ')[0],
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:36px;margin-bottom:8px;">\u23F0</div><h2 style="color:#F0EDE6;font-size:18px;margin:0 0 6px;">En 1 hora nos vemos</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">' + fechaProspect + '</p></div>'
                + '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:16px;text-align:center;">'
                + '<p style="margin:0 0 8px;font-size:14px;color:#F0EDE6;"><strong>' + socioName + '</strong> ya est\u00e1 preparando todo para ti</p>'
                + '<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);">Aseg\u00farate de tener c\u00e1mara y micr\u00f3fono activos, y estar en un lugar c\u00f3modo \uD83C\uDFA7</p></div>'
                + _btn('\uD83D\uDC4D \u00a1Ah\u00ed estar\u00e9!', 'https://skyteam.global')), citaMs - 60 * 60000);
            }

            // ── PROSPECT EMAIL 3: 5min before — Ingresa a la sala ──
            if (prospectEmail && citaMs - nowMs > 8 * 60000) {
              _sendEmail(prospectEmail, '\uD83D\uDFE2 Ya puedes ir ingresando a la sala',
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:44px;margin-bottom:8px;">\uD83D\uDE80</div><h2 style="color:#C9A84C;font-size:20px;margin:0 0 6px;">\u00a1Estamos a punto de iniciar!</h2><p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0;"><strong>' + socioName + '</strong> te est\u00e1 esperando</p></div>'
                + '<div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">'
                + '<p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#1D9E75;">La sala estar\u00e1 abierta en menos de 2 minutos</p>'
                + '<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">Haz clic en el bot\u00f3n para conectarte directamente</p></div>'
                + (linkSala ? _btn('\uD83D\uDCF2 Ingresar a la sala ahora', linkSala) : _btn('\uD83D\uDCF2 Ir a la reuni\u00f3n', 'https://skyteam.global'))
                + '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);margin-top:8px;">\uD83D\uDCC5 ' + fechaProspect + '</div>'), citaMs - 5 * 60000);
            }

          } catch (e) { console.warn('[AGENDA] Email scheduling error:', e.message); }
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

