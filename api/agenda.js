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
      // Own bookings (citas donde soy el dueño de la agenda)
      const ownBookings = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&status=neq.cancelada&order=fecha_iso.asc');
      // Referred bookings (citas donde soy el socio referidor — aparezco en __REF_BY:user__ prefix de notas)
      const refBookings = await sb('bookings?notas=like.__REF_BY:' + encodeURIComponent(user) + '__*&status=neq.cancelada&order=fecha_iso.asc');
      // Merge + dedupe by id (in case both queries returned the same row somehow)
      const bookingMap = {};
      (ownBookings || []).forEach(function(b) { bookingMap[b.id] = Object.assign({}, b, { _role: 'owner' }); });
      (refBookings || []).forEach(function(b) {
        // If I am both the owner AND the ref, mark as owner (precedence)
        if (bookingMap[b.id]) return;
        bookingMap[b.id] = Object.assign({}, b, { _role: 'referrer' });
      });
      const bookings = Object.values(bookingMap).sort(function(a, b) { return (a.fecha_iso || '').localeCompare(b.fecha_iso || ''); });

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
          status: b.status, notas: b.notas, ip_address: b.ip_address, email: b.email,
          owner: b.username, // quién es el dueño real de la agenda (cerrador si es referral)
          role: b._role || 'owner' // 'owner' (es mi agenda) o 'referrer' (yo referí, el cerrador lo atendió)
        }))
      });
    }

    if (req.method === 'POST') {
      const { action, user, config, booking, id } = req.body;
      if (!user) return res.status(400).json({ error: 'Missing user' });

      // ════════════════════════════════════════════════════
      // ENDORSEMENT SYSTEM: socio junior (INN200/INN500) solicita
      // a su patrocinador (rango NOVA1500+) ser su cerrador.
      // ════════════════════════════════════════════════════
      // Stored inside agenda_configs.config as:
      //   endorsed_by: 'username'     (cerrador que endosa al socio)
      //   endorsement_status: 'pending' | 'active'
      //   endorsed_at: ISO timestamp

      // Helper: get user's rank + sponsor
      var _getUserRank = async function(uname) {
        var r = await sb('users?username=eq.' + encodeURIComponent(uname) + '&select=rank,sponsor,name&limit=1');
        return (r && r[0]) ? { rank: parseInt(r[0].rank) || 0, sponsor: r[0].sponsor || '', name: r[0].name || uname } : { rank: 0, sponsor: '', name: uname };
      };
      // Helper: read/write config
      var _getConfig = async function(uname) {
        var c = await sb('agenda_configs?username=eq.' + encodeURIComponent(uname) + '&select=config&limit=1');
        return (c && c[0]) ? (c[0].config || {}) : {};
      };
      var _saveConfig = async function(uname, cfg) {
        await sb('agenda_configs', {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ username: uname, config: cfg, updated_at: new Date().toISOString() })
        });
      };

      // Solicita endoso a un cerrador específico (patrocinador directo o hasta 2 niveles arriba)
      if (action === 'requestEndorsement') {
        try {
          var me = await _getUserRank(user);
          if (!me.sponsor) return res.status(400).json({ error: 'No tienes patrocinador asignado' });
          // Resolver el targetCloser: si no se pasa, default es el sponsor directo
          var targetCloser = ((req.body || {}).targetCloser || '').trim().toLowerCase() || me.sponsor;
          // Validar que el target sea el sponsor directo O el sponsor del sponsor (máx 2 niveles arriba)
          var lvl1 = await _getUserRank(me.sponsor);
          var isValidTarget = false;
          var targetData = null;
          if (targetCloser === me.sponsor) {
            isValidTarget = true;
            targetData = lvl1;
          } else if (lvl1.sponsor && targetCloser === lvl1.sponsor) {
            isValidTarget = true;
            targetData = await _getUserRank(lvl1.sponsor);
          }
          if (!isValidTarget) {
            return res.status(400).json({ error: 'Solo puedes solicitar endoso a tu patrocinador directo o al patrocinador de tu patrocinador (máx 2 niveles arriba).' });
          }
          if (targetData.rank < 3) {
            return res.status(400).json({ error: 'El cerrador elegido (' + (targetData.name || targetCloser) + ') debe ser NOVA 1500 o superior. Rango actual: ' + targetData.rank });
          }
          var cfg = await _getConfig(user);
          if (cfg.endorsement_status === 'active' && cfg.endorsed_by === targetCloser) {
            return res.status(200).json({ ok: true, alreadyActive: true, endorsed_by: targetCloser });
          }
          cfg.endorsed_by = targetCloser;
          cfg.endorsement_status = 'pending';
          cfg.endorsed_at = new Date().toISOString();
          await _saveConfig(user, cfg);
          return res.status(200).json({ ok: true, status: 'pending', endorsed_by: targetCloser, closer_name: targetData.name });
        } catch(e) { return res.status(500).json({ error: e.message }); }
      }

      // Lista endosos (mi status como socio + solicitudes pendientes si soy cerrador)
      if (action === 'listEndorsements') {
        try {
          var myCfg = await _getConfig(user);
          var me = await _getUserRank(user);
          // Eligible candidates: patrocinador directo (nivel 1) + abuelo (nivel 2)
          // Ambos deben ser NOVA1500+ (rank >= 3). Si no lo son, no aparecen.
          var eligibleClosers = [];
          if (me.sponsor) {
            var lvl1 = await _getUserRank(me.sponsor);
            if (lvl1.rank >= 3) eligibleClosers.push({ username: me.sponsor, name: lvl1.name, rank: lvl1.rank, level: 1 });
            // Nivel 2 (patrocinador del patrocinador)
            if (lvl1.sponsor) {
              var lvl2 = await _getUserRank(lvl1.sponsor);
              if (lvl2.rank >= 3) eligibleClosers.push({ username: lvl1.sponsor, name: lvl2.name, rank: lvl2.rank, level: 2 });
            }
          }
          // Mi endoso como socio (si solicité alguno)
          var myEndorsement = null;
          if (myCfg.endorsed_by) {
            var cerrador = await _getUserRank(myCfg.endorsed_by);
            myEndorsement = {
              endorsed_by: myCfg.endorsed_by,
              name: cerrador.name,
              rank: cerrador.rank,
              status: myCfg.endorsement_status || 'pending',
              since: myCfg.endorsed_at || null
            };
          }
          // Solicitudes PENDIENTES si soy cerrador (rank NOVA1500+)
          var incomingRequests = [];
          var activeEndorsed = [];
          if (me.rank >= 3) {
            // Find all agenda_configs where config->>endorsed_by = my username
            // Supabase REST JSON filters: use contenido: we need to fetch all and filter
            // More efficient: use PostgREST JSON filter. cfg ->> 'endorsed_by' = my username
            var allR = await fetch(SUPABASE_URL + "/rest/v1/agenda_configs?config->>endorsed_by=eq." + encodeURIComponent(user) + "&select=username,config", { headers: { ...HEADERS, Range: '0-499' } });
            var allD = await allR.json();
            if (Array.isArray(allD)) {
              for (const item of allD) {
                var ic = item.config || {};
                var uRank = await _getUserRank(item.username);
                var obj = {
                  socio: item.username,
                  socio_name: uRank.name,
                  socio_rank: uRank.rank,
                  status: ic.endorsement_status || 'pending',
                  since: ic.endorsed_at || null
                };
                if (ic.endorsement_status === 'pending') incomingRequests.push(obj);
                else if (ic.endorsement_status === 'active') activeEndorsed.push(obj);
              }
            }
          }
          return res.status(200).json({
            ok: true,
            myRank: me.rank,
            mySponsor: me.sponsor || null,
            myEndorsement: myEndorsement,
            canBeCloser: me.rank >= 3,
            incomingRequests: incomingRequests,
            activeEndorsed: activeEndorsed,
            eligibleClosers: eligibleClosers
          });
        } catch(e) { return res.status(500).json({ error: e.message }); }
      }

      // Aprobar endoso (el cerrador acepta ser cerrador del socio)
      if (action === 'approveEndorsement') {
        try {
          var me = await _getUserRank(user);
          if (me.rank < 3) return res.status(403).json({ error: 'Solo rangos NOVA1500+ pueden ser cerradores' });
          var targetSocio = (req.body || {}).socio;
          if (!targetSocio) return res.status(400).json({ error: 'Missing socio' });
          var sCfg = await _getConfig(targetSocio);
          if (sCfg.endorsed_by !== user || sCfg.endorsement_status !== 'pending') {
            return res.status(400).json({ error: 'No hay solicitud pendiente de este socio hacia ti' });
          }
          sCfg.endorsement_status = 'active';
          sCfg.endorsed_at = new Date().toISOString();
          await _saveConfig(targetSocio, sCfg);
          return res.status(200).json({ ok: true, socio: targetSocio });
        } catch(e) { return res.status(500).json({ error: e.message }); }
      }

      // Rechazar endoso
      if (action === 'rejectEndorsement') {
        try {
          var targetSocio = (req.body || {}).socio;
          if (!targetSocio) return res.status(400).json({ error: 'Missing socio' });
          var sCfg = await _getConfig(targetSocio);
          if (sCfg.endorsed_by !== user) return res.status(403).json({ error: 'No eres el endosador de este socio' });
          sCfg.endorsed_by = null;
          sCfg.endorsement_status = null;
          sCfg.endorsed_at = null;
          await _saveConfig(targetSocio, sCfg);
          return res.status(200).json({ ok: true, socio: targetSocio });
        } catch(e) { return res.status(500).json({ error: e.message }); }
      }

      // Revocar endoso (cualquiera de las 2 partes lo puede cancelar)
      if (action === 'revokeEndorsement') {
        try {
          var targetSocio = (req.body || {}).socio || user; // si soy socio, me revoco yo mismo
          var sCfg = await _getConfig(targetSocio);
          // Validación: o soy el socio o soy el cerrador
          if (targetSocio !== user && sCfg.endorsed_by !== user) {
            return res.status(403).json({ error: 'No puedes revocar este endoso' });
          }
          sCfg.endorsed_by = null;
          sCfg.endorsement_status = null;
          sCfg.endorsed_at = null;
          await _saveConfig(targetSocio, sCfg);
          return res.status(200).json({ ok: true, socio: targetSocio });
        } catch(e) { return res.status(500).json({ error: e.message }); }
      }

      // Stats de cerrador: cuántos prospectos de su equipo agendaron
      // referred_by se guarda como prefijo en notas: __REF_BY:username__ al inicio
      if (action === 'cerradorStats') {
        try {
          var me = await _getUserRank(user);
          if (me.rank < 3) return res.status(200).json({ ok: true, canBeCloser: false });
          var bR = await fetch(SUPABASE_URL + '/rest/v1/bookings?username=eq.' + encodeURIComponent(user) + '&notas=like.__REF_BY:*&select=id,nombre,notas,fecha_iso,status&order=created_at.desc&limit=200', { headers: HEADERS });
          var bD = await bR.json();
          if (!Array.isArray(bD)) bD = [];
          var byRef = {};
          bD.forEach(function(b) {
            var m = ((b.notas || '') + '').match(/^__REF_BY:([^_]+)__/);
            if (!m) return;
            var refUser = m[1];
            if (!byRef[refUser]) byRef[refUser] = { count: 0, last: null };
            byRef[refUser].count++;
            if (!byRef[refUser].last || b.fecha_iso > byRef[refUser].last) byRef[refUser].last = b.fecha_iso;
          });
          return res.status(200).json({
            ok: true,
            canBeCloser: true,
            totalReferrals: bD.length,
            bySocio: Object.keys(byRef).map(function(s) { return { socio: s, count: byRef[s].count, last: byRef[s].last }; }).sort(function(a,b){return b.count-a.count;})
          });
        } catch(e) { return res.status(500).json({ error: e.message }); }
      }

      // === DIAGNOSTIC: test email sending ===
      if (action === 'testEmail') {
        const to = req.body.to;
        if (!to) return res.status(400).json({ error: 'Missing to' });
        if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
            body: JSON.stringify({
              from: 'SKYTEAM <soporte@skyteam.global>',
              to: [to],
              subject: '🧪 Test de email SKYTEAM',
              html: '<p>Este es un email de prueba enviado el ' + new Date().toISOString() + '</p>'
            })
          });
          const body = await r.json();
          return res.status(200).json({ status: r.status, ok: r.ok, body: body, env: { hasResendKey: !!process.env.RESEND_API_KEY } });
        } catch(e) {
          return res.status(500).json({ error: e.message });
        }
      }

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

        // Check for duplicate slot (double-check: pre-check + post-insert verification)
        const taken = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&fecha_iso=eq.' + encodeURIComponent(booking.fechaISO) + '&status=in.(activa,completada,verificada,sospechosa)');
        if (taken && taken.length > 0) return res.status(409).json({ error: 'Este horario ya fue reservado por alguien más. Elige otro.' });

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

        // Insert booking with IP + email + user_agent + self_booking flag + referral tracking
        var bookingId = booking.id || crypto.randomUUID();
        // Referral: if the booking came from a link with ?ref=socio, store it as prefix in notas
        var referredBy = ((booking.referredBy || '') + '').trim().toLowerCase();
        var refNotasPrefix = '';
        if (referredBy && /^[a-z0-9_-]{2,40}$/.test(referredBy)) {
          // Validate that the socio exists
          var refCheck = await sb('users?username=eq.' + encodeURIComponent(referredBy) + '&select=username,name&limit=1');
          if (refCheck && refCheck[0]) {
            refNotasPrefix = '__REF_BY:' + referredBy + '__ ';
          }
        }
        var finalNotas = selfBooking
          ? (refNotasPrefix + 'Auto-reserva detectada (misma IP que socio)')
          : (refNotasPrefix + (booking.notas || ''));
        await sb('bookings', { method: 'POST',
          body: JSON.stringify({
            id: bookingId,
            username: user,
            nombre: booking.nombre,
            whatsapp: waCheck.cleaned || booking.whatsapp,
            email: booking.email || null,
            fecha_iso: booking.fechaISO,
            status: selfBooking ? 'sospechosa' : 'activa',
            notas: finalNotas || null,
            ip_address: clientIP,
            user_agent: userAgent.substring(0, 500)
          })
        });

        // POST-INSERT race condition check: if 2+ bookings exist for same slot, delete this one
        var raceCheck = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&fecha_iso=eq.' + encodeURIComponent(booking.fechaISO) + '&status=in.(activa,completada,verificada,sospechosa)&order=created_at.asc');
        if (raceCheck && raceCheck.length > 1) {
          // Keep the FIRST booking (earliest), delete this one
          var first = raceCheck[0];
          if (first.id !== bookingId) {
            await sb('bookings?id=eq.' + encodeURIComponent(bookingId), { method: 'DELETE' });
            console.log('[AGENDA] RACE CONDITION: deleted duplicate booking', bookingId, 'kept', first.id);
            return res.status(409).json({ error: 'Este horario acaba de ser reservado por alguien más. Elige otro.' });
          }
        }

        // ══════════════════════════════════════════════════════
        // 7 SCHEDULED EMAILS: 4 for prospect (1 instant + 3 reminders) + 3 for socio
        // ══════════════════════════════════════════════════════
        var _scheduledEmailIds = [];
        var _emailPromises = [];
        if (!process.env.RESEND_API_KEY) {
          console.warn('[AGENDA] RESEND_API_KEY not set — skipping all emails');
        }
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
              if (!to) { console.log('[AGENDA] Skip: no recipient'); return; }
              var payload = { from: 'SKYTEAM <soporte@skyteam.global>', to: [to], subject: subject, html: html };
              // Resend supports scheduled_at (ISO8601) — schedule future emails
              // Max 30 days ahead. For anything within 1 minute, send instantly.
              if (sendAt && sendAt > nowMs + 60000) {
                var daysAhead = (sendAt - nowMs) / 86400000;
                if (daysAhead > 30) {
                  console.log('[AGENDA] Skip: email more than 30 days ahead for', to);
                  return;
                }
                payload.scheduled_at = new Date(sendAt).toISOString();
                console.log('[AGENDA] Scheduling email to', to, 'for', payload.scheduled_at);
              } else {
                console.log('[AGENDA] Sending instant email to', to, '| subject:', subject);
              }
              var p = fetch('https://api.resend.com/emails', { method: 'POST', headers: RESEND_H, body: JSON.stringify(payload) })
                .then(function(r){return r.json().then(function(d){ return { status: r.status, body: d }; });})
                .then(function(res){
                  if(res.body && res.body.id) {
                    _scheduledEmailIds.push(res.body.id);
                    console.log('[AGENDA] ✓ Email OK to', to, '| id:', res.body.id, '| status:', res.status);
                  } else {
                    console.error('[AGENDA] ✗ Email FAILED for', to, '| status:', res.status, '| body:', JSON.stringify(res.body).substring(0,300));
                  }
                })
                .catch(function(e){ console.error('[AGENDA] ✗ Email error for', to, ':', e.message); });
              _emailPromises.push(p);
            };

            // === REFERRAL TRACKING: if booking.referredBy is valid, notify the socio
            //     who prospected AND create/update the prospect in their CRM ===
            var refSocioInfo = null;
            if (referredBy) {
              try {
                var refUsers = await sb('users?username=eq.' + encodeURIComponent(referredBy) + '&select=email,name,whatsapp');
                if (refUsers && refUsers[0]) {
                  refSocioInfo = refUsers[0];
                  // SOCIO REFERIDOR EMAIL: su prospecto agendó con el cerrador
                  if (refSocioInfo.email) {
                    _sendEmail(refSocioInfo.email, '\uD83C\uDFAF ¡Tu prospecto ' + prospectName + ' agendó con ' + socioName + '!',
                      _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:44px;margin-bottom:8px;">\uD83C\uDFAF</div><h2 style="color:#C9A84C;font-size:20px;margin:0 0 6px;">¡Tu prospecto acaba de agendar!</h2><p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">' + fechaSocio + '</p></div>'
                      + '<div style="background:linear-gradient(135deg,rgba(201,168,76,0.10),rgba(127,119,221,0.08));border:1px solid rgba(201,168,76,0.25);border-radius:14px;padding:18px;margin-bottom:16px;">'
                      + '<p style="margin:0 0 12px;font-size:15px;color:#F0EDE6;text-align:center;">\uD83D\uDC64 <strong>' + prospectName + '</strong> agendó con</p>'
                      + '<p style="margin:0;font-size:17px;color:#C9A84C;text-align:center;font-weight:900;">\uD83C\uDFAF ' + socioName + '</p>'
                      + '<p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.45);text-align:center;">para la reunión de cierre</p>'
                      + '</div>'
                      + '<div style="background:rgba(37,211,102,0.08);border:0.5px solid rgba(37,211,102,0.2);border-radius:12px;padding:14px;margin-bottom:16px;text-align:center;">'
                      + '<p style="margin:0 0 4px;font-size:13px;color:#25D366;font-weight:700;">\u2705 Tu prospecto está listo para cerrar</p>'
                      + '<p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);">Si se cierra, la venta queda a tu nombre. Mantente atento al resultado.</p>'
                      + '</div>'
                      + _btn('\uD83D\uDCCA Ver mi CRM', 'https://skyteam.global/?nav=prospectos')), nowMs);
                  }
                  // Crear o actualizar prospecto en CRM del socio referidor
                  try {
                    // Buscar si ya existe un prospecto con este teléfono para el socio
                    var existingPr = await sb('prospectos?username=eq.' + encodeURIComponent(referredBy) + '&telefono=eq.' + encodeURIComponent(waCheck.cleaned || booking.whatsapp) + '&select=id,etapa&limit=1');
                    if (existingPr && existingPr[0]) {
                      // Actualizar etapa a confirmado_cierre
                      await sb('prospectos?id=eq.' + encodeURIComponent(existingPr[0].id), {
                        method: 'PATCH',
                        headers: { ...HEADERS, Prefer: 'return=minimal' },
                        body: JSON.stringify({
                          etapa: 'confirmado_cierre',
                          temperatura: 85,
                          notas: (existingPr[0].notas || '') + '\n🎯 Agendó cita de cierre con ' + socioName + ' para ' + fechaSocio + '.',
                          updated_at: new Date().toISOString()
                        })
                      });
                    } else {
                      // Crear nuevo prospecto en CRM
                      await sb('prospectos', {
                        method: 'POST',
                        headers: { ...HEADERS, Prefer: 'return=minimal' },
                        body: JSON.stringify({
                          username: referredBy,
                          nombre: booking.nombre,
                          telefono: waCheck.cleaned || booking.whatsapp,
                          email: booking.email || null,
                          etapa: 'confirmado_cierre',
                          fuente: 'agenda_cerrador',
                          temperatura: 85,
                          notas: '🎯 Agendó cita de cierre con ' + socioName + ' (tu patrocinador/cerrador) para ' + fechaSocio + '. Booking ID: ' + bookingId
                        })
                      });
                    }
                  } catch(pe) { console.error('[AGENDA] Error creating prospecto in CRM of referrer:', pe.message); }
                }
              } catch(refErr) { console.error('[AGENDA] Referral processing error:', refErr.message); }
            }

            // ── SOCIO EMAIL 1: Instant — Nueva cita agendada (cerrador) ──
            if (socioEmail) {
              var ipWarning = ipFlag ? '<div style="background:rgba(255,60,60,0.12);border:1px solid rgba(255,60,60,0.3);border-radius:8px;padding:10px;margin:12px 0;font-size:12px;color:#FF6B6B;">\u26A0\uFE0F IP repetida</div>' : '';
              var refBadge = refSocioInfo ? '<div style="background:rgba(127,119,221,0.10);border:1px solid rgba(127,119,221,0.25);border-radius:10px;padding:10px;margin:12px 0;font-size:12px;color:#F0EDE6;">\uD83E\uDD1D Prospecto referido por <strong>' + (refSocioInfo.name || referredBy) + '</strong></div>' : '';
              _sendEmail(socioEmail, '\uD83D\uDD14 Nueva cita: ' + prospectName + ' \u00b7 ' + horaSocio + (refSocioInfo ? ' \u00b7 Ref: ' + (refSocioInfo.name || referredBy).split(' ')[0] : ''),
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:36px;margin-bottom:8px;">\uD83C\uDF89</div><h2 style="color:#C9A84C;font-size:18px;margin:0 0 6px;">\u00a1Nueva cita agendada!</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">' + fechaSocio + '</p></div>'
                + '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:18px;margin-bottom:16px;">'
                + '<p style="margin:6px 0;font-size:14px;">\uD83D\uDC64 <strong>' + prospectName + '</strong></p>'
                + '<p style="margin:6px 0;font-size:13px;color:rgba(255,255,255,0.5);">\uD83D\uDCF1 ' + booking.whatsapp + (prospectEmail ? ' \u00b7 \uD83D\uDCE7 ' + prospectEmail : '') + '</p>'
                + '</div>' + refBadge + ipWarning + _btn('\uD83D\uDCCA Ver mi agenda', 'https://skyteam.global/?nav=agenda')), nowMs);
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

            // ── PROSPECT EMAIL 0: INSTANT — Confirmaci\u00f3n al agendar ──
            if (prospectEmail) {
              var firstName = prospectName.split(' ')[0];
              _sendEmail(prospectEmail, '\u2705 Cita confirmada con ' + socioName + ' \u00b7 ' + horaProspect,
                _wrap('<div style="text-align:center;margin-bottom:20px;"><div style="font-size:48px;margin-bottom:8px;">\u2705</div><h2 style="color:#C9A84C;font-size:20px;margin:0 0 6px;">\u00a1Cita confirmada, ' + firstName + '!</h2><p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">Te esperamos el ' + fechaProspect + '</p></div>'
                + '<div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.18);border-radius:12px;padding:20px;margin-bottom:16px;">'
                + '<p style="margin:0 0 10px;font-size:14px;color:#F0EDE6;">\uD83D\uDCC5 <strong>' + fechaProspect + '</strong></p>'
                + '<p style="margin:0 0 10px;font-size:14px;color:#F0EDE6;">\uD83D\uDC64 Con <strong>' + socioName + '</strong></p>'
                + (linkSala ? '<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);">\uD83D\uDD17 Link de la sala: <a href="' + linkSala + '" style="color:#C9A84C;">' + linkSala + '</a></p>' : '')
                + '</div>'
                + '<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:14px;margin-bottom:16px;text-align:center;">'
                + '<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Prepara c\u00e1mara y micr\u00f3fono. Te recordaremos el d\u00eda de la reuni\u00f3n.</p></div>'
                + (linkSala ? _btn('\uD83D\uDE80 Guardar link de la sala', linkSala) : '')
                ), nowMs);
            }

            // ── PROSPECT EMAIL 1: 4h before — Confirmaci\u00f3n del d\u00eda ──
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

        // CRITICAL: await all email promises before returning — Vercel kills
        // the function after res.json() so fetches would never complete otherwise.
        if (_emailPromises.length > 0) {
          try {
            console.log('[AGENDA] Awaiting', _emailPromises.length, 'email sends...');
            await Promise.all(_emailPromises);
            console.log('[AGENDA] All', _emailPromises.length, 'email fetches completed. Sent IDs:', _scheduledEmailIds.length);
          } catch (e) { console.error('[AGENDA] Email await error:', e.message); }
        }

        // Save scheduled email IDs to booking for cancellation
        if (_scheduledEmailIds.length > 0) {
          try {
            var emailIdsStr = 'EMAIL_IDS:' + _scheduledEmailIds.join(',');
            await sb('bookings?id=eq.' + encodeURIComponent(bookingId), {
              method: 'PATCH', body: JSON.stringify({ proof_url: emailIdsStr })
            });
            console.log('[AGENDA] Saved', _scheduledEmailIds.length, 'email IDs for booking', bookingId);
          } catch(e) { console.error('[AGENDA] PATCH error:', e.message); }
        }

        return res.status(200).json({ ok: true, ipFlag: ipFlag, emailsSent: _scheduledEmailIds.length });

      } else if (action === 'cancelBooking') {
        // Get booking to find scheduled email IDs
        var cancelBooking = await sb('bookings?id=eq.' + encodeURIComponent(id) + '&select=proof_url');
        if (cancelBooking && cancelBooking[0] && cancelBooking[0].proof_url && cancelBooking[0].proof_url.startsWith('EMAIL_IDS:')) {
          var emailIds = cancelBooking[0].proof_url.replace('EMAIL_IDS:', '').split(',').filter(Boolean);
          var RESEND_KEY = process.env.RESEND_API_KEY;
          if (RESEND_KEY && emailIds.length > 0) {
            console.log('[AGENDA] Cancelling', emailIds.length, 'scheduled emails for booking', id);
            for (var ei = 0; ei < emailIds.length; ei++) {
              fetch('https://api.resend.com/emails/' + emailIds[ei] + '/cancel', {
                method: 'POST', headers: { 'Authorization': 'Bearer ' + RESEND_KEY }
              }).then(function(r){return r.json();}).then(function(d){
                console.log('[AGENDA] Email cancel:', d.id || d.error || 'ok');
              }).catch(function(){});
            }
          }
        }
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

