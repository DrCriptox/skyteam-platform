// Communications API ✅ handles email (Resend), push notifications (web-push), and smart triggers
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

async function sb(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: SB_HEADERS, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function sendWebPush(subscription, payload) {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
    return { ok: false, reason: 'web-push not configured' };
  }
  try {
    let webpush;
    try { webpush = require('web-push'); } catch (e) {
      return { ok: false, reason: 'web-push not installed' };
    }
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

// ✅✅ Send push to a specific user (internal helper) ✅✅
async function pushToUser(username, title, body, url, tag) {
  // Find subscriptions for user AND their "2" account (same team notifications)
  var _baseUser = username.replace(/2$/, '');
  var _user2 = _baseUser + '2';
  const subs = await sb('push_subscriptions?or=(username.ilike.' + encodeURIComponent(_baseUser) + ',username.ilike.' + encodeURIComponent(_user2) + ')');
  if (!subs || subs.length === 0) return { sent: 0 };
  const payload = { title, body, url: url || '/', tag: tag || 'skyteam-' + Date.now(), data: { url: url || '/' } };
  let sent = 0, expired = [];
  for (const sub of subs) {
    const result = await sendWebPush(sub.subscription, payload);
    if (result.ok) sent++; else if (result.expired) expired.push(sub.endpoint);
  }
  if (expired.length > 0) {
    for (const ep of expired) await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {});
  }
  return { sent, expired: expired.length };
}

// ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
// SMART PUSH TRIGGERS ✅ called by Vercel Cron every 15 minutes
// ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅

async function handleTriggers(req, res) {
  // Verify cron secret (Vercel sends Authorization header for cron jobs)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    // Also allow adminKey in body for manual testing
    const { adminKey } = req.body || {};
    if (adminKey !== process.env.ADMIN_PUSH_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const now = new Date();
  const cHour = (now.getUTCHours() - 5 + 24) % 24;
  const todayKey = now.toISOString().slice(0, 10);
  const results = { triggers: [], sent: 0, errors: [] };

  try {
    // ✅✅ TRIGGER 1: Prospectos sin seguimiento 3+ dias ✅✅
    if (cHour >= 8 && cHour <= 9) {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    // Get prospects that are active (not closed) and haven't been updated in 3+ days
    const staleProspects = await sb(
      'prospectos?select=id,username,nombre,etapa,updated_at' +
      '&etapa=not.in.(cerrado_ganado,cerrado_perdido)' +
      '&updated_at=lt.' + threeDaysAgo +
      '&order=updated_at.asc&limit=50'
    );

    if (staleProspects && staleProspects.length > 0) {
      // Group by username
      const byUser = {};
      for (const p of staleProspects) {
        if (!byUser[p.username]) byUser[p.username] = [];
        byUser[p.username].push(p);
      }

      for (const [username, prospects] of Object.entries(byUser)) {
        const count = prospects.length;
        const firstName = prospects[0].nombre.split(' ')[0];
        const daysAgo = Math.floor((now - new Date(prospects[0].updated_at)) / (1000 * 60 * 60 * 24));

        let body;
        if (count === 1) {
          body = firstName + ' lleva ' + daysAgo + ' dias sin seguimiento. Un mensaje hoy puede hacer la diferencia.';
        } else {
          body = 'Tienes ' + count + ' prospectos sin seguimiento. ' + firstName + ' lleva ' + daysAgo + ' dias esperando.';
        }

        const r = await pushToUser(username, '🔥 Seguimiento pendiente', body, '/?nav=prospectos', 'skyteam-stale-' + now.toISOString().slice(0, 10));
        results.triggers.push({ type: 'stale_prospects', user: username, count, sent: r.sent });
        results.sent += r.sent;
      }
    }

    } // end TRIGGER 1 hour check

    // ✅✅ TRIGGER 2: Reuniones/bookings proximos (en los proximos 30 min) ✅✅
    const in30min = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();
    const upcomingBookings = await sb(
      'bookings?select=id,username,nombre,whatsapp,fecha_iso' +
      '&fecha_iso=gte.' + nowISO +
      '&fecha_iso=lte.' + in30min +
      '&status=eq.activa' +
      '&limit=20'
    );

    if (upcomingBookings && upcomingBookings.length > 0) {
      for (const booking of upcomingBookings) {
        const meetTime = new Date(booking.fecha_iso);
        const minsLeft = Math.round((meetTime - now) / 60000);
        const body = 'Tu reunion con ' + booking.nombre + ' es en ' + minsLeft + ' minutos. Preparate para cerrar.';

        const r = await pushToUser(booking.username, '🔥 Reunion en ' + minsLeft + ' min', body, '/?nav=agenda', 'skyteam-booking-' + booking.id);
        results.triggers.push({ type: 'upcoming_booking', user: booking.username, prospect: booking.nombre, minsLeft, sent: r.sent });
        results.sent += r.sent;
      }
    }

    // ✅✅ TRIGGER 3: Recordatorios vencidos (fecha_recordatorio ya paso y no completados) ✅✅
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const pendingReminders = await sb(
      'recordatorios?select=id,username,prospecto_id,mensaje,fecha_recordatorio' +
      '&completado=eq.false' +
      '&fecha_recordatorio=gte.' + fifteenMinAgo +
      '&fecha_recordatorio=lte.' + nowISO +
      '&limit=30'
    );

    if (pendingReminders && pendingReminders.length > 0) {
      for (const reminder of pendingReminders) {
        // Get prospect name
        let prospectName = 'tu prospecto';
        try {
          const prospect = await sb('prospectos?id=eq.' + reminder.prospecto_id + '&select=nombre&limit=1');
          if (prospect && prospect[0]) prospectName = prospect[0].nombre.split(' ')[0];
        } catch (e) {}

        const body = 'Recordatorio para ' + prospectName + ': ' + (reminder.mensaje || 'Hacer seguimiento').substring(0, 100);
        const r = await pushToUser(reminder.username, '⏰ Recordatorio de seguimiento', body, '/?nav=prospectos', 'skyteam-reminder-' + reminder.id);
        results.triggers.push({ type: 'reminder', user: reminder.username, prospect: prospectName, sent: r.sent });
        results.sent += r.sent;
      }
    }

    // ✅✅ TRIGGER 4: Fecha de cierre estimada = hoy o manana ✅✅
    if (cHour >= 9 && cHour <= 10) {
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const closingProspects = await sb(
      'prospectos?select=id,username,nombre,fecha_cierre_estimada,valor_estimado,etapa' +
      '&fecha_cierre_estimada=in.(' + today + ',' + tomorrow + ')' +
      '&etapa=not.in.(cerrado_ganado,cerrado_perdido)' +
      '&limit=20'
    );

    if (closingProspects && closingProspects.length > 0) {
      for (const p of closingProspects) {
        const isToday = p.fecha_cierre_estimada === today;
        const valor = p.valor_estimado ? ' ($' + Number(p.valor_estimado).toLocaleString() + ')' : '';
        const body = p.nombre + valor + ' tiene fecha de cierre ' + (isToday ? 'HOY' : 'MANANA') + '. Es momento de cerrar.';

        const r = await pushToUser(p.username, isToday ? '🔥¥ Cierre HOY' : '🔥 Cierre manana', body, '/?nav=prospectos', 'skyteam-closing-' + p.id);
        results.triggers.push({ type: 'closing_date', user: p.username, prospect: p.nombre, isToday, sent: r.sent });
        results.sent += r.sent;
      }
    }

    } // end TRIGGER 4 hour check

    // ✅✅ TRIGGER 5: Prospectos calientes sin accion (temperatura >= 70, sin interaccion 2+ dias) ✅✅
    if (cHour >= 14 && cHour <= 15) {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const hotStale = await sb(
      'prospectos?select=id,username,nombre,temperatura,updated_at' +
      '&temperatura=gte.70' +
      '&etapa=not.in.(cerrado_ganado,cerrado_perdido)' +
      '&updated_at=lt.' + twoDaysAgo +
      '&limit=20'
    );

    if (hotStale && hotStale.length > 0) {
      const byUser = {};
      for (const p of hotStale) {
        if (!byUser[p.username]) byUser[p.username] = [];
        byUser[p.username].push(p);
      }

      for (const [username, prospects] of Object.entries(byUser)) {
        const names = prospects.slice(0, 3).map(p => p.nombre.split(' ')[0]).join(', ');
        const body = (prospects.length === 1 ? names + ' esta caliente (' + prospects[0].temperatura + '°)' : names + ' estan calientes') + ' pero no los has contactado. No dejes enfriar el interes.';

        const r = await pushToUser(username, '🔥 Prospecto caliente sin accion', body, '/?nav=prospectos', 'skyteam-hot-' + now.toISOString().slice(0, 10));
        results.triggers.push({ type: 'hot_stale', user: username, count: prospects.length, sent: r.sent });
        results.sent += r.sent;
      }
    }

    } // end TRIGGER 5 hour check

    // ── TRIGGER 6: New registration — notify sponsor + 2 levels with USD amount ──
    try {
      const fifteenMinAgoISO = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      const newUsers = await sb(
        'users?select=username,name,sponsor,created_at,valor_inscripcion,rank' +
        '&created_at=gte.' + fifteenMinAgoISO +
        '&sponsor=not.is.null' +
        '&order=created_at.desc&limit=20'
      );

      if (newUsers && newUsers.length > 0) {
        const allUsers = await sb('users?select=username,name,sponsor&limit=5000');
        const userMap = {};
        if (allUsers) allUsers.forEach(u => { userMap[u.username.toLowerCase()] = u; });

        for (const newUser of newUsers) {
          const fullName = newUser.name || newUser.username;
          const valor = newUser.valor_inscripcion ? '$' + Number(newUser.valor_inscripcion).toLocaleString() + ' USD' : '';
          const tag = 'skyteam-newreg-' + newUser.username + '-' + now.toISOString().slice(0, 16);

          let currentSponsor = newUser.sponsor ? newUser.sponsor.toLowerCase() : null;
          const levels = ['1ra línea (directo)', '2da línea', '3ra línea', '4ta línea'];

          for (let level = 0; level < 4 && currentSponsor; level++) {
            const sponsorData = userMap[currentSponsor];
            if (!sponsorData) break;

            var _cHora = new Date().toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Bogota'});
            const title = valor ? '\uD83D\uDCB0 \u00a1VENTA ' + valor + '!' : '\uD83C\uDF89 \u00a1Nueva venta!';
            var body;
            if (level === 0) {
              body = '\uD83D\uDD25 ' + fullName + '\n\u23F0 ' + _cHora + '\n\uD83D\uDE80 \u00a1Sigue as\u00ed, cada venta te acerca m\u00e1s!';
            } else {
              var _spName = userMap[newUser.sponsor ? newUser.sponsor.toLowerCase() : ''];
              var sponsorNombre = _spName ? (_spName.name || newUser.sponsor) : (newUser.sponsor || '');
              body = fullName + ' \u2014 ' + levels[level] + '\nDirecta de ' + sponsorNombre + '\n\u23F0 ' + _cHora + '\n\uD83D\uDE80 \u00a1Tu equipo sigue creciendo!';
            }

            const r = await pushToUser(currentSponsor, title, body, '/?nav=home', tag + '-L' + (level+1));
            results.triggers.push({ type: 'new_client_L' + (level+1), sponsor: currentSponsor, newUser: newUser.username, valor: newUser.valor_inscripcion, sent: r.sent });
            results.sent += r.sent;

            currentSponsor = sponsorData.sponsor ? sponsorData.sponsor.toLowerCase() : null;
          }
        }
      }
    } catch (e) { results.errors.push('new_client: ' + e.message); }

    // ── TRIGGER 6b: Rank promotion — notify 3 levels up with estimated income ──
    try {
      const rankIncomes = { 1: 400, 2: 900, 3: 2000, 4: 6000, 5: 12000, 6: 25000, 7: 60000, 8: 100000 };
      const rankNames = { 0:'Cliente', 1:'INN 200', 2:'INN 500', 3:'NOVA 1500', 4:'NOVA 5K', 5:'NOVA 10K', 6:'NOVA DIAMOND', 7:'NOVA 50K', 8:'NOVA 100K' };
      const fifteenMinAgo2 = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      const recentUpdated = await sb(
        'users?select=username,name,sponsor,rank,updated_at' +
        '&updated_at=gte.' + fifteenMinAgo2 +
        '&rank=gt.0' +
        '&sponsor=not.is.null' +
        '&order=updated_at.desc&limit=30'
      );

      if (recentUpdated && recentUpdated.length > 0) {
        const allUsers2 = await sb('users?select=username,name,sponsor&limit=5000');
        const userMap2 = {};
        if (allUsers2) allUsers2.forEach(u => { userMap2[u.username.toLowerCase()] = u; });

        for (const user of recentUpdated) {
          const income = rankIncomes[user.rank];
          if (!income) continue;
          const rName = rankNames[user.rank] || 'Rango ' + user.rank;
          const fullName = user.name || user.username;
          const tag = 'skyteam-rank-' + user.username + '-' + user.rank + '-' + todayKey;

          let currentSponsor = user.sponsor ? user.sponsor.toLowerCase() : null;
          const levels = ['1ra línea', '2da línea', '3ra línea', '4ta línea'];

          for (let level = 0; level < 4 && currentSponsor; level++) {
            const sponsorData = userMap2[currentSponsor];
            if (!sponsorData) break;

            var _rHora = new Date().toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Bogota'});
            const title = '\uD83C\uDFC6 \u00a1' + rName + ' en tu equipo!';
            const body = fullName + ' acaba de lograr ' + rName + '\n\uD83D\uDCB0 Generando +$' + income.toLocaleString() + ' USD/mes\n\u23F0 ' + _rHora + '\n\uD83D\uDD25 \u00a1Felicidades! Tu equipo sigue creciendo.';

            const r = await pushToUser(currentSponsor, title, body, '/?nav=home', tag + '-L' + (level+1));
            results.triggers.push({ type: 'rank_promo_L' + (level+1), sponsor: currentSponsor, user: user.username, rank: rName, sent: r.sent });
            results.sent += r.sent;

            currentSponsor = sponsorData.sponsor ? sponsorData.sponsor.toLowerCase() : null;
          }
        }
      }
    } catch (e) { results.errors.push('rank_promo: ' + e.message); }

    // ── TRIGGER 7: Daily motivational reminder (7-9am Colombia / UTC-5) ──
    try {
      const colombiaHour = (now.getUTCHours() - 5 + 24) % 24;
      if (colombiaHour >= 7 && colombiaHour <= 9) {
        const todayDate = now.toISOString().slice(0, 10);
        // Get all users with push subscriptions
        const allSubs = await sb('push_subscriptions?select=username&order=username');
        if (allSubs && allSubs.length > 0) {
          const uniqueUsers = [...new Set(allSubs.map(s => s.username))];
          for (const username of uniqueUsers) {
            // Check if already sent today (use tag dedup)
            const tag = 'skyteam-morning-' + todayDate;
            // Get prospect count for this user
            let pendingCount = 0;
            let citasCount = 0;
            try {
              const pending = await sb(
                'prospectos?select=id&username=eq.' + encodeURIComponent(username) +
                '&etapa=not.in.(cerrado_ganado,cerrado_perdido)&limit=100'
              );
              pendingCount = pending ? pending.length : 0;
            } catch (e) {}
            try {
              const citas = await sb(
                'bookings?select=id&username=eq.' + encodeURIComponent(username) +
                '&fecha_iso=gte.' + todayDate + 'T00:00:00' +
                '&fecha_iso=lte.' + todayDate + 'T23:59:59' +
                '&status=eq.activa&limit=20'
              );
              citasCount = citas ? citas.length : 0;
            } catch (e) {}

            // Get user name
            let userName = username;
            try {
              const u = await sb('users?username=eq.' + encodeURIComponent(username) + '&select=name&limit=1');
              if (u && u[0] && u[0].name) userName = u[0].name.split(' ')[0];
            } catch (e) {}

            const body = 'Tienes ' + pendingCount + ' prospectos pendientes' + (citasCount > 0 ? ' y ' + citasCount + ' citas hoy' : '') + '. Vamos!';
            const r = await pushToUser(username, '☀️ Buenos dias, ' + userName + '!', body, '/', tag);
            results.triggers.push({ type: 'daily_motivation', user: username, sent: r.sent });
            results.sent += r.sent;
          }
        }
      }
    } catch (e) { results.errors.push('daily_motivation: ' + e.message); }

    // ── TRIGGER 8: Weekly summary (Monday 8-10am Colombia) ──
    try {
      const colombiaHour2 = (now.getUTCHours() - 5 + 24) % 24;
      const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday
      if (dayOfWeek === 1 && colombiaHour2 >= 8 && colombiaHour2 <= 10) {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const todayDate2 = now.toISOString().slice(0, 10);
        const allSubs2 = await sb('push_subscriptions?select=username&order=username');
        if (allSubs2 && allSubs2.length > 0) {
          const uniqueUsers2 = [...new Set(allSubs2.map(s => s.username))];
          for (const username of uniqueUsers2) {
            let weekProspects = 0, weekCitas = 0, weekCerrados = 0;
            try {
              const wp = await sb(
                'prospectos?select=id&username=eq.' + encodeURIComponent(username) +
                '&created_at=gte.' + weekAgo + '&limit=200'
              );
              weekProspects = wp ? wp.length : 0;
            } catch (e) {}
            try {
              const wc = await sb(
                'bookings?select=id&username=eq.' + encodeURIComponent(username) +
                '&created_at=gte.' + weekAgo + '&limit=200'
              );
              weekCitas = wc ? wc.length : 0;
            } catch (e) {}
            try {
              const wg = await sb(
                'prospectos?select=id&username=eq.' + encodeURIComponent(username) +
                '&etapa=eq.cerrado_ganado&updated_at=gte.' + weekAgo + '&limit=200'
              );
              weekCerrados = wg ? wg.length : 0;
            } catch (e) {}

            const body = 'Esta semana: ' + weekProspects + ' prospectos, ' + weekCitas + ' citas, ' + weekCerrados + ' cerrados. Sigue asi!';
            const tag = 'skyteam-weekly-' + todayDate2;
            const r = await pushToUser(username, '📊 Tu resumen semanal', body, '/?nav=prospectos', tag);
            results.triggers.push({ type: 'weekly_summary', user: username, sent: r.sent });
            results.sent += r.sent;
          }
        }
      }
    } catch (e) { results.errors.push('weekly_summary: ' + e.message); }

    // ── TRIGGER 9: Midday motivation (12-1pm Colombia) ──
    try {
      const colombiaHour3 = (now.getUTCHours() - 5 + 24) % 24;
      if (colombiaHour3 >= 12 && colombiaHour3 <= 13) {
        const todayDate3 = now.toISOString().slice(0, 10);
        const allSubs3 = await sb('push_subscriptions?select=username&order=username');
        if (allSubs3 && allSubs3.length > 0) {
          const uniqueUsers3 = [...new Set(allSubs3.map(s => s.username))];
          const frases = [
            '¿Ya hablaste con alguien hoy? Un mensaje puede cambiar tu semana.',
            'Los que más ganan son los que más contactan. ¡Haz tu próximo contacto!',
            'Cada conversación es una oportunidad. ¿Cuántas llevas hoy?',
            'El éxito no llega solo. Abre tu agenda y agenda tu próxima cita.',
            'Tu negocio crece cuando tú te mueves. ¡Acción!',
            'Un prospecto al día mantiene tu negocio vivo. ¿Ya lo hiciste?',
            'Los líderes no esperan. Toma el teléfono y haz que pase.',
            'Recuerda: cada "no" te acerca más al próximo "sí".'
          ];
          const fraseIdx = Math.floor((Date.now() / 86400000)) % frases.length;
          for (const username of uniqueUsers3) {
            const tag = 'skyteam-midday-' + todayDate3;
            const r = await pushToUser(username, '💪 ¡Hora de acción!', frases[fraseIdx], '/?nav=prospectos', tag);
            results.triggers.push({ type: 'midday_motivation', user: username, sent: r.sent });
            results.sent += r.sent;
          }
        }
      }
    } catch (e) { results.errors.push('midday_motivation: ' + e.message); }

    // ── TRIGGER 10: Evening recap (10-10:15pm Colombia) ──
    try {
      const colombiaHour4 = (now.getUTCHours() - 5 + 24) % 24;
      var colMin4 = now.getUTCMinutes();
      if (colombiaHour4 === 22 && colMin4 <= 15) {
        const todayDate4 = now.toISOString().slice(0, 10);
        const allSubs4 = await sb('push_subscriptions?select=username&order=username');
        if (allSubs4 && allSubs4.length > 0) {
          const uniqueUsers4 = [...new Set(allSubs4.map(s => s.username))];
          for (const username of uniqueUsers4) {
            let actCount = 0;
            try {
              const acts = await sb(
                'prospectos?select=id&username=eq.' + encodeURIComponent(username) +
                '&updated_at=gte.' + todayDate4 + 'T00:00:00&limit=100'
              );
              actCount = acts ? acts.length : 0;
            } catch (e) {}
            const body = actCount > 0
              ? 'Hoy tocaste ' + actCount + ' prospecto' + (actCount > 1 ? 's' : '') + '. Descansa bien, manana seguimos!'
              : 'Descansa bien. Manana es un nuevo dia para generar resultados!';
            const tag = 'skyteam-evening-' + todayDate4;
            const r = await pushToUser(username, '\uD83C\uDF19 Descansa bien, manana seguimos', body, '/?nav=prospectos', tag);
            results.triggers.push({ type: 'evening_recap', user: username, sent: r.sent });
            results.sent += r.sent;
          }
        }
      }
    } catch (e) { results.errors.push('evening_recap: ' + e.message); }

    // ── TRIGGER MIXLR: Daily email Mon-Fri 7:00-7:14 AM Colombia ──
    try {
      var nowMx = new Date();
      var colHourMx = (nowMx.getUTCHours() - 5 + 24) % 24;
      var colMinMx = nowMx.getUTCMinutes();
      var colDayMx = (nowMx.getUTCDay()); // UTC day; 0=sun..6=sat
      // Colombia day: same as UTC since UTC 5-12 = Col 0-7am
      var isWeekday = colDayMx >= 1 && colDayMx <= 5; // Mon-Fri
      if (isWeekday && colHourMx === 7 && colMinMx <= 14) {
        var todayMx = nowMx.toISOString().slice(0, 10);
        var sentKey = 'mixlr_sent_' + todayMx;
        // Check if already sent today (using a row in a table or just rely on cron de-dup)
        try {
          var checkR = await fetch(SUPABASE_URL + '/rest/v1/cron_log?key=eq.' + sentKey + '&select=key&limit=1', { headers: SB_HEADERS });
          var checkRows = await checkR.json();
          if (Array.isArray(checkRows) && checkRows.length > 0) {
            // Already sent today, skip
          } else {
            // Mark as sent + send via internal API call
            try { await fetch(SUPABASE_URL + '/rest/v1/cron_log', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ key: sentKey, sent_at: new Date().toISOString() }) }); } catch(e) {}
            // Trigger sendMixlrEmail action
            var host = req.headers && req.headers.host ? req.headers.host : 'skyteam.global';
            var proto = host.indexOf('localhost') === 0 ? 'http' : 'https';
            await fetch(proto + '://' + host + '/api/event-pages', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'sendMixlrEmail' })
            });
            results.triggers.push({ type: 'mixlr_daily', date: todayMx });
          }
        } catch(e) { results.errors.push('mixlr: ' + e.message); }
      }
    } catch(e) { results.errors.push('mixlr_outer: ' + e.message); }

    // ── TRIGGER 11: Training reminder for new users (rank 0-1, 10am Colombia) ──
    try {
      const colombiaHour5 = (now.getUTCHours() - 5 + 24) % 24;
      if (colombiaHour5 >= 10 && colombiaHour5 <= 11) {
        const todayDate5 = now.toISOString().slice(0, 10);
        const allSubs5 = await sb('push_subscriptions?select=username&order=username');
        if (allSubs5 && allSubs5.length > 0) {
          const uniqueUsers5 = [...new Set(allSubs5.map(s => s.username))];
          for (const username of uniqueUsers5) {
            let userRank = 0;
            try {
              const u = await sb('users?username=eq.' + encodeURIComponent(username) + '&select=rank&limit=1');
              if (u && u[0]) userRank = u[0].rank || 0;
            } catch (e) {}
            if (userRank <= 1) {
              const msgs = [
                '¿Ya completaste tu ruta de hoy? Cada día cuenta para tu éxito.',
                'La academia tiene contenido nuevo esperándote. ¡No te quedes atrás!',
                'Los que se capacitan, ganan más. Dedica 15 minutos hoy.',
                'Tu sponsor cuenta contigo. Muestra tu progreso completando la ruta.'
              ];
              const mIdx = Math.floor((Date.now() / 86400000)) % msgs.length;
              const tag = 'skyteam-training-' + todayDate5;
              const r = await pushToUser(username, '📚 Hora de capacitarte', msgs[mIdx], '/?nav=home', tag);
              results.triggers.push({ type: 'training_reminder', user: username, sent: r.sent });
              results.sent += r.sent;
            }
          }
        }
      }
    } catch (e) { results.errors.push('training_reminder: ' + e.message); }

    // ── TRIGGER 7: Ranking motivacional — 3x al dia ──
    // 8:50 AM: Ranking Global (empezar el dia motivado)
    // 1:50 PM: Mejor ranking individual (Sales/Prospects/Journal)
    // 8:50 PM: Ranking Global cierre del dia
    try {
      var _rkSlot = null;
      if (colHour === 7 && colMin >= 45 && colMin <= 55) _rkSlot = 'morning';
      else if (colHour === 13 && colMin >= 45 && colMin <= 55) _rkSlot = 'midday';
      else if (colHour === 20 && colMin >= 50 && colMin <= 59) _rkSlot = 'evening';

      if (_rkSlot) {
        // Fetch week boundaries
        var _nCol = new Date(now.getTime()-18000000);
        var _dw = _nCol.getUTCDay(); var _dd = _dw===0?6:_dw-1;
        var _mon = new Date(_nCol); _mon.setUTCDate(_nCol.getUTCDate()-_dd); _mon.setUTCHours(0,0,0,0);
        var _fromW = new Date(_mon.getTime()+18000000).toISOString();

        // Fetch data for all 3 rankings
        var _bk = await sb('bookings?select=username,status,created_at&status=in.(activa,completada,verificada)&created_at=gte.' + _fromW).catch(function(){return [];});
        var _ix = await sb('interacciones?select=username,tipo,contenido,created_at&created_at=gte.' + _fromW + '&limit=5000').catch(function(){return [];});
        var _lv = await sb('landing_visits?select=ref,type&day=gte.' + _fromW.slice(0,10) + '&limit=5000').catch(function(){return [];});

        // Build per-user scores for each ranking
        var _scores = {};
        var _init = function(u){ if(!_scores[u]) _scores[u]={sales:0,prospects:0,cierres:0}; };

        // Sky Sales IA (landing visits + conversions)
        (_lv||[]).forEach(function(v){ if(!v.ref) return; _init(v.ref); _scores[v.ref].sales += v.type==='conversion'?20:1; });
        // Sky Journal (bookings)
        (_bk||[]).forEach(function(b){ _init(b.username); _scores[b.username].cierres += b.status==='verificada'?35:10; });
        // Sky Prospects (interactions)
        (_ix||[]).forEach(function(p){ _init(p.username); var c=p.contenido||''; _scores[p.username].prospects += c.indexOf('movido de')!==-1?2:(c.indexOf('mensaje generado')!==-1?2:1); });

        // Build ranked lists
        var _allUsers = Object.keys(_scores);
        var _globalList = _allUsers.map(function(u){var s=_scores[u]; return {username:u,score:s.sales+s.prospects+s.cierres,sales:s.sales,prospects:s.prospects,cierres:s.cierres};}).sort(function(a,b){return b.score-a.score;});
        var _salesList = _allUsers.map(function(u){return {username:u,score:_scores[u].sales};}).sort(function(a,b){return b.score-a.score;});
        var _prospectList = _allUsers.map(function(u){return {username:u,score:_scores[u].prospects};}).sort(function(a,b){return b.score-a.score;});
        var _cierresList = _allUsers.map(function(u){return {username:u,score:_scores[u].cierres};}).sort(function(a,b){return b.score-a.score;});

        // Get push users
        var _pUsers = {};
        (await sb('push_subscriptions?select=username').catch(function(){return [];})||[]).forEach(function(p){_pUsers[p.username]=true;});

        var _today = now.toISOString().slice(0,10);
        var _sentC = 0;
        var _rkNames = {sales:'Sky Sales IA',prospects:'Sky Prospects',cierres:'Sky Journal'};
        var _rkNavs = {sales:'/?nav=skysales',prospects:'/?nav=prospectos',cierres:'/?nav=agenda'};

        for (var _gi=0; _gi<_globalList.length && _gi<50; _gi++) {
          var _gu = _globalList[_gi];
          if (!_pUsers[_gu.username]) continue;
          var _gPos = _gi+1;

          var _title, _body, _nav;

          if (_rkSlot === 'morning') {
            // Morning: How you closed YESTERDAY + motivation for today
            _nav = '/?nav=ranking';
            if (_gPos===1) { _title='\u2600\uFE0F \u00a1Felicidades! Cerraste como #1'; _body='Ayer terminaste liderando el ranking. \u00a1Hoy a mantenerlo!'; }
            else if (_gPos<=3) { _title='\u2600\uFE0F Cerraste en el top 3 (#'+_gPos+')'; _body='\u00a1Gran cierre ayer! Hoy puedes llegar al #1.'; }
            else if (_gPos<=10) { _title='\u2600\uFE0F Ayer cerraste #'+_gPos; _body='A '+ (_globalList[2].score-_gu.score) +' pts del top 3. \u00a1Hoy arranca temprano!'; }
            else if (_gPos<=20) { _title='\u2600\uFE0F Ayer cerraste #'+_gPos+' del top 20'; _body='Buen dia! Una cita temprana te acerca al top 10.'; }
            else { _title='\u2600\uFE0F Buenos dias! Tu ranking te espera'; _body='Ayer no sumaste puntos. \u00a1Hoy agenda una cita y entra al top 20!'; }

          } else if (_rkSlot === 'midday') {
            // Midday: Best individual ranking or one to activate
            var _best = 'sales', _bestPos = 999;
            var _lists = {sales:_salesList, prospects:_prospectList, cierres:_cierresList};
            ['sales','prospects','cierres'].forEach(function(rk){
              var pos = _lists[rk].findIndex(function(u){return u.username===_gu.username;});
              if (pos!==-1 && pos<_bestPos) { _bestPos=pos; _best=rk; }
            });
            var _bPos = _bestPos+1;
            _nav = _rkNavs[_best] || '/?nav=ranking';
            if (_bPos<=3) { _title='\uD83D\uDD25 Top 3 en '+_rkNames[_best]+'!'; _body='\u00a1Vas #'+_bPos+'! Sigue asi, estas dominando.'; }
            else if (_bPos<=10) { _title='\u26A1 #'+_bPos+' en '+_rkNames[_best]; _body='\u00a1Casi en el top 3! Una accion mas y subes.'; }
            else if (_bPos<=20) { _title='\uD83D\uDCA1 #'+_bPos+' en '+_rkNames[_best]; _body='\u00a1Buen ritmo! Sigue sumando puntos esta tarde.'; }
            else {
              // Find which ranking to activate (lowest score)
              var _worst = 'sales', _worstScore = Infinity;
              ['sales','prospects','cierres'].forEach(function(rk){ if(_scores[_gu.username][rk]<_worstScore){_worstScore=_scores[_gu.username][rk];_worst=rk;} });
              _nav = _rkNavs[_worst] || '/?nav=ranking';
              _title='\uD83D\uDCAA Activa '+_rkNames[_worst]; _body='Aun no tienes puntos ahi. \u00a1Una accion te mete al ranking!';
            }

          } else {
            // Evening: 3 hours left — urgency to close strong
            _nav = '/?nav=ranking';
            if (_gPos===1) { _title='\uD83C\uDF19 \u00a1Vas #1! Faltan 3h para el cierre'; _body='Nadie te alcanza. \u00a1Cierra el dia como lider!'; }
            else if (_gPos<=3) { _title='\uD83C\uDF19 #'+_gPos+' \u2014 Faltan 3h para el cierre'; _body='\u00a1Aun puedes subir al #1! Una accion mas y lo logras.'; }
            else if (_gPos<=10) { _title='\uD83C\uDF19 #'+_gPos+' \u2014 3h para el cierre'; _body='A '+ (_globalList[2].score-_gu.score) +' pts del top 3. \u00a1Ultima oportunidad hoy!'; }
            else if (_gPos<=20) { _title='\uD83C\uDF19 Quedan 3h \u2014 Estas #'+_gPos; _body='\u00a1Sube al top 10 antes del cierre! Mueve un prospecto.'; }
            else { _title='\uD83C\uDF19 Quedan 3 horas'; _body='\u00a1Aun puedes entrar al ranking hoy! Agenda o gestiona.'; }
          }

          var _tag = 'skyteam-rk-' + _rkSlot + '-' + _today + '-' + _gu.username;
          var _rp = await pushToUser(_gu.username, _title, _body, _nav, _tag);
          _sentC += _rp.sent;
        }
        results.triggers.push({ type: 'ranking_' + _rkSlot, sent: _sentC, users: _globalList.length });
        results.sent += _sentC;
      }
    } catch (e) { results.errors.push('ranking_motivation: ' + e.message); }

    // ✅✅ TRIGGER WA: WhatsApp Bot Follow-ups (2h, 24h, 48h) ✅✅
    try {
      const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
      const WA_TK = process.env.WHATSAPP_TOKEN;
      if (WA_PHONE_ID && WA_TK) {
        const twoHoursAgo = new Date(now.getTime() - 2 * 3600000).toISOString();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000).toISOString();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600000).toISOString();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();

        // Get leads that need follow-up (not paused, not already followed up to stage 3)
        const waLeads = await sb(
          'wa_leads?select=phone,name,followup_stage,last_message_at,context_summary' +
          '&followup_paused=eq.false&followup_stage=lt.3' +
          '&etapa=not.in.(agendado,escalado,frio,cerrado)' +
          '&order=last_message_at.asc&limit=20'
        );

        if (waLeads && waLeads.length > 0) {
          const followupMessages = [
            function(name) { return 'Hola ' + (name || '') + '! Se me quedo pendiente nuestra conversacion. Tienes algun momento para que te cuente mas? 😊'; },
            function(name) { return 'Hey ' + (name || '') + ', guarde un espacio especial para ti esta semana. Es una reunion corta de 25 min sin compromiso. Te interesa? 🙌'; },
            function(name) { return (name || 'Hola') + ', solo queria dejarte saber que estamos aqui si en algun momento te interesa. Te deseo mucho exito! ✨'; }
          ];

          for (const lead of waLeads) {
            const lastMsg = new Date(lead.last_message_at);
            const msSince = now.getTime() - lastMsg.getTime();
            const stage = lead.followup_stage || 0;
            let shouldSend = false;

            if (stage === 0 && msSince >= 2 * 3600000 && msSince < 24 * 3600000) shouldSend = true;
            else if (stage === 1 && msSince >= 24 * 3600000 && msSince < 48 * 3600000) shouldSend = true;
            else if (stage === 2 && msSince >= 48 * 3600000) shouldSend = true;

            if (shouldSend) {
              // Only send during reasonable hours (8am - 8pm Colombia)
              if (cHour < 8 || cHour > 20) continue;

              const msgText = followupMessages[stage](lead.name ? lead.name.split(' ')[0] : '');
              try {
                const waR = await fetch('https://graph.facebook.com/v21.0/' + WA_PHONE_ID + '/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + WA_TK },
                  body: JSON.stringify({ messaging_product: 'whatsapp', to: lead.phone, type: 'text', text: { body: msgText } })
                });
                const waData = await waR.json();
                if (waR.ok) {
                  // Update stage
                  await sb('wa_leads?phone=eq.' + encodeURIComponent(lead.phone), {
                    method: 'PATCH',
                    body: JSON.stringify({
                      followup_stage: stage + 1,
                      etapa: stage === 2 ? 'frio' : lead.etapa,
                      updated_at: now.toISOString()
                    })
                  });
                  // Save to conversation
                  await sb('wa_conversations', {
                    method: 'POST',
                    body: JSON.stringify({
                      phone: lead.phone, direction: 'out', message_type: 'text',
                      content: msgText, bot_username: lead.bot_username || 'yonfer',
                      metadata: JSON.stringify({ type: 'followup', stage: stage + 1 })
                    })
                  });
                  results.triggers.push({ type: 'wa_followup_' + (stage + 1), phone: lead.phone.substring(0, 6) + '...', sent: 1 });
                  results.sent++;
                }
              } catch (wErr) { results.errors.push('wa_followup: ' + wErr.message); }
            }
          }
        }
      }
    } catch (e) { results.errors.push('wa_followup: ' + e.message); }

    return res.status(200).json({ ok: true, ...results, checkedAt: now.toISOString() });
  } catch (error) {
    results.errors.push(error.message);
    return res.status(200).json({ ok: false, ...results, error: error.message });
  }
}

// ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅

async function handlePush(req, res) {
  const { action, user, subscription, recipientUser, title, body, url, adminKey } = req.body || {};

  if (action === 'subscribe') {
    if (!user || !subscription || !subscription.endpoint) return res.status(400).json({ error: 'Missing user or subscription' });
    try {
      const existing = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=username');
      if (!existing || existing.length === 0) {
        await sb('users', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ username: user, name: user, email: null, password: null, sponsor: null, ref: user }) });
      }
      await sb('push_subscriptions', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ username: user, endpoint: subscription.endpoint, subscription: subscription, created_at: new Date().toISOString() }) });
      return res.status(200).json({ ok: true, message: 'Subscription saved' });
    } catch(e) { console.error('[PUSH] Subscribe error:', e.message); return res.status(500).json({ error: 'Subscribe failed: ' + e.message }); }
  }

  if (action === 'unsubscribe') {
    if (!user || !subscription || !subscription.endpoint) return res.status(400).json({ error: 'Missing user or subscription endpoint' });
    await sb('push_subscriptions?username=eq.' + encodeURIComponent(user) + '&endpoint=eq.' + encodeURIComponent(subscription.endpoint), { method: 'DELETE' });
    return res.status(200).json({ ok: true, message: 'Subscription removed' });
  }

  if (action === 'send') {
    if (!recipientUser || !title || !body) return res.status(400).json({ error: 'Missing recipientUser, title, or body' });
    const isAdmin = adminKey === process.env.ADMIN_PUSH_KEY;
    if (!isAdmin && (!user || user !== recipientUser)) return res.status(403).json({ error: 'Not authorized' });
    const r = await pushToUser(recipientUser, title, body, url, null);
    return res.status(200).json({ ok: true, ...r });
  }

  if (action === 'broadcast') {
    const isAdmin = adminKey === process.env.ADMIN_PUSH_KEY;
    if (!isAdmin) return res.status(403).json({ error: 'Admin key required' });
    if (!title || !body) return res.status(400).json({ error: 'Missing title or body' });
    const allSubs = await sb('push_subscriptions?select=*');
    if (!allSubs || allSubs.length === 0) return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions' });
    const payload = { title, body, url: url || '/', tag: 'skyteam-broadcast-' + Date.now(), data: { url: url || '/' } };
    let sent = 0, expired = [];
    for (const sub of allSubs) { const result = await sendWebPush(sub.subscription, payload); if (result.ok) sent++; else if (result.expired) expired.push(sub.endpoint); }
    if (expired.length > 0) { for (const ep of expired) await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {}); }
    return res.status(200).json({ ok: true, sent, expired: expired.length });
  }

  if (action === 'getPublicKey') {
    if (!VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'VAPID public key not configured' });
    return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
  }

  return res.status(400).json({ error: 'Unknown push action' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Vercel Cron jobs send GET requests
  if (req.method === 'GET') {
    return handleTriggers(req, res);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body || {};

    // Smart triggers (manual invocation via POST)
    if (action === 'checkTriggers') {
      return handleTriggers(req, res);
    }

    // Push notification actions (routed from /api/push via rewrite)
    if (['subscribe', 'unsubscribe', 'send', 'broadcast', 'getPublicKey'].includes(action)) {
      try { return await handlePush(req, res); } catch(e) { console.error('[PUSH] Error:', e.message); return res.status(500).json({ error: 'Push error: ' + e.message }); }
    }

    // ✅✅ Email sending (original send-email logic) ✅✅
    const { to, from, nombre, usuario, password, sponsor, membresia, linkRef, subject, html: customHtml } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing email' });

    const senderLabels = {
      'lideres@skyteam.global': 'SKYTEAM Lideres',
      'soporte@skyteam.global': 'SKYTEAM Soporte',
      'academy@skyteam.global': 'SKYTEAM Academy'
    };
    const fromEmail = from || 'lideres@skyteam.global';
    const fromLabel = senderLabels[fromEmail] || 'SKYTEAM';
    const fromField = fromLabel + ' <' + fromEmail + '>';

    const htmlBody = customHtml || ''
      + '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;border-radius:16px;overflow:hidden;">'
      // Header with gradient
      + '<div style="background:linear-gradient(135deg,#0a0a12 0%,#1a1520 50%,#0a0a12 100%);padding:40px 32px 30px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.15);">'
      + '<img src="https://skyteam.global/logo-skyteam-white.png" alt="SKYTEAM" style="height:55px;margin-bottom:16px;" />'
      + '<h1 style="color:#C9A84C;font-size:24px;font-weight:900;margin:0 0 6px;letter-spacing:1px;">¡Bienvenido, ' + nombre + '!</h1>'
      + '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Tu acceso a la plataforma ha sido activado</p>'
      + '</div>'
      // Access data card
      + '<div style="padding:24px 32px;">'
      + '<div style="background:linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.03));border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">'
      + '<p style="margin:0 0 12px;font-size:11px;color:rgba(201,168,76,0.6);text-transform:uppercase;letter-spacing:2px;font-weight:800;">Tus datos de acceso</p>'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.5);width:110px;">🌐 Plataforma</td><td style="padding:5px 0;font-size:14px;"><a href="https://skyteam.global" style="color:#C9A84C;font-weight:700;text-decoration:none;">skyteam.global</a></td></tr>'
      + '<tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.5);">👤 Usuario</td><td style="padding:5px 0;font-size:14px;color:#F0EDE6;font-weight:700;">' + usuario + '</td></tr>'
      + '<tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.5);">🔑 Contraseña</td><td style="padding:5px 0;font-size:14px;color:#F0EDE6;font-weight:700;">' + password + '</td></tr>'
      + (sponsor ? '<tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.5);">🤝 Sponsor</td><td style="padding:5px 0;font-size:14px;color:#F0EDE6;font-weight:700;">' + sponsor + '</td></tr>' : '')
      + '</table>'
      + '</div>'
      // CTA button
      + '<div style="text-align:center;margin-bottom:28px;">'
      + '<a href="https://skyteam.global" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;border-radius:14px;font-size:17px;font-weight:900;text-decoration:none;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(201,168,76,0.3);">Ingresar a SKYTEAM →</a>'
      + '</div>'
      // Features section
      + '<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">'
      + '<p style="color:#C9A84C;font-size:16px;font-weight:900;margin:0 0 16px;text-align:center;letter-spacing:1px;">EMPIEZA HOY</p>'
      // Sky Sales IA
      + '<div style="display:flex;margin-bottom:12px;background:linear-gradient(135deg,rgba(201,168,76,0.06),rgba(201,168,76,0.02));border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:14px 16px;align-items:center;">'
      + '<div style="width:40px;height:40px;border-radius:10px;background:rgba(201,168,76,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-right:14px;">🚀</div>'
      + '<div><p style="margin:0 0 2px;font-size:14px;font-weight:800;color:#C9A84C;">Sky Sales IA</p><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.4;">Tu página web personalizada + 6 agentes IA entrenados</p></div>'
      + '</div>'
      // Sky Prospects
      + '<div style="display:flex;margin-bottom:12px;background:linear-gradient(135deg,rgba(33,150,243,0.06),rgba(33,150,243,0.02));border:1px solid rgba(33,150,243,0.12);border-radius:12px;padding:14px 16px;align-items:center;">'
      + '<div style="width:40px;height:40px;border-radius:10px;background:rgba(33,150,243,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-right:14px;">📋</div>'
      + '<div><p style="margin:0 0 2px;font-size:14px;font-weight:800;color:#2196F3;">Sky Prospects</p><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.4;">CRM inteligente para darle el mejor proceso a tus contactos</p></div>'
      + '</div>'
      // Sky Journal
      + '<div style="display:flex;margin-bottom:12px;background:linear-gradient(135deg,rgba(29,158,117,0.06),rgba(29,158,117,0.02));border:1px solid rgba(29,158,117,0.12);border-radius:12px;padding:14px 16px;align-items:center;">'
      + '<div style="width:40px;height:40px;border-radius:10px;background:rgba(29,158,117,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-right:14px;">📅</div>'
      + '<div><p style="margin:0 0 2px;font-size:14px;font-weight:800;color:#1D9E75;">Sky Journal</p><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.4;">Agenda inteligente que te ayuda a cerrar grandes negocios</p></div>'
      + '</div>'
      // Academia
      + '<div style="display:flex;margin-bottom:12px;background:linear-gradient(135deg,rgba(226,75,74,0.06),rgba(226,75,74,0.02));border:1px solid rgba(226,75,74,0.12);border-radius:12px;padding:14px 16px;align-items:center;">'
      + '<div style="width:40px;height:40px;border-radius:10px;background:rgba(226,75,74,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-right:14px;">🎓</div>'
      + '<div><p style="margin:0 0 2px;font-size:14px;font-weight:800;color:#E24B4A;">Academia</p><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.4;">Desde cero a resultados con capacitación paso a paso</p></div>'
      + '</div>'
      + '</div>'
      // Footer
      + '</div>'
      + '<div style="background:rgba(255,255,255,0.02);padding:16px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.04);">'
      + '<p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">SKYTEAM · Franquicia Digital · <a href="https://skyteam.global" style="color:#C9A84C;text-decoration:none;">skyteam.global</a></p>'
      + '</div>'
      + '</div>';

    
    const emailSubject = subject || ('¡Tu acceso a SKYTEAM está activo, ' + nombre + '!');


    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: fromField,
        to: [to],
        subject: emailSubject,
        html: htmlBody
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
