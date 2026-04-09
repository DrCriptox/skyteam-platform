// Leaderboard + Anti-Cheat API v2 — /api/leaderboard.js
// Added: IP analysis, data validation checks, enhanced scoring
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

async function sb(path, opts) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: HEADERS, ...opts });
  if (!r.ok) { const t = await r.text(); throw new Error(t); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.method === 'POST' ? req.body : {};
    const action = body.action || req.query?.action || '';
    const user = body.user || req.query?.user || '';

    // ===== GET WEEKLY TOP 10 (with IP flags) =====
    if (action === 'weeklyTop') {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now); monday.setUTCDate(now.getUTCDate() - diff); monday.setUTCHours(0, 0, 0, 0);
      const mondayISO = monday.toISOString();
      const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 7);
      const sundayISO = sunday.toISOString();

      // Fetch bookings WITH ip_address
      const bookings = await sb(
        'bookings?select=username,status,fecha_iso,ip_address,nombre&fecha_iso=gte.' + mondayISO + '&fecha_iso=lt.' + sundayISO + '&status=in.(activa,completada,verificada)'
      );
      const proofs = await sb(
        'booking_proofs?select=username,status,created_at&created_at=gte.' + mondayISO + '&created_at=lt.' + sundayISO
      );

      const userStats = {};
      (bookings || []).forEach(function(b) {
        if (!userStats[b.username]) userStats[b.username] = { citas: 0, verificadas: 0, proofs: 0, score: 0, ips: {}, ipDupes: 0 };
        userStats[b.username].citas++;
        if (b.status === 'verificada' || b.status === 'completada') userStats[b.username].verificadas++;
        // Track IPs
        if (b.ip_address) {
          if (!userStats[b.username].ips[b.ip_address]) userStats[b.username].ips[b.ip_address] = [];
          userStats[b.username].ips[b.ip_address].push(b.nombre);
        }
      });

      (proofs || []).forEach(function(p) {
        if (!userStats[p.username]) userStats[p.username] = { citas: 0, verificadas: 0, proofs: 0, score: 0, ips: {}, ipDupes: 0 };
        if (p.status === 'approved') userStats[p.username].proofs++;
      });

      // Calculate score + IP analysis
      Object.keys(userStats).forEach(function(u) {
        var s = userStats[u];
        // Count IPs that have multiple different prospects
        var ipDupes = 0;
        Object.keys(s.ips).forEach(function(ip) {
          var uniqueNames = [];
          s.ips[ip].forEach(function(n) { if (uniqueNames.indexOf(n) === -1) uniqueNames.push(n); });
          if (uniqueNames.length > 1) ipDupes += uniqueNames.length - 1;
        });
        s.ipDupes = ipDupes;
        // Points: 10 per booking, +30 per verified/proof, -10 per IP dupe
        s.score = (s.citas * 10) + (s.verificadas * 30) + (s.proofs * 30) - (ipDupes * 10);
        if (s.score < 0) s.score = 0;
        // Clean up ips object for response (just counts)
        var ipSummary = {};
        Object.keys(s.ips).forEach(function(ip) {
          if (s.ips[ip].length > 1) {
            var masked = ip.split('.').slice(0,2).join('.') + '.*.*';
            ipSummary[masked] = s.ips[ip].length;
          }
        });
        s.ipFlags = ipSummary;
        delete s.ips;
      });

      const usernames = Object.keys(userStats);
      let usersMap = {};
      if (usernames.length > 0) {
        const users = await sb('users?select=username,name,ref&username=in.(' + usernames.map(u => '"' + u + '"').join(',') + ')');
        (users || []).forEach(function(u) { usersMap[u.username] = u; });
      }

      const ranking = usernames.map(function(u) {
        return {
          username: u, name: usersMap[u] ? usersMap[u].name : u, ref: usersMap[u] ? usersMap[u].ref : '',
          citas: userStats[u].citas, verificadas: userStats[u].verificadas, proofs: userStats[u].proofs,
          score: userStats[u].score, ipDupes: userStats[u].ipDupes, ipFlags: userStats[u].ipFlags
        };
      }).sort(function(a, b) { return b.score - a.score; }).slice(0, 20);

      return res.status(200).json({ ok: true, period: 'weekly', from: mondayISO, to: sundayISO, ranking: ranking });
    }

    // ===== GET MONTHLY TOP 20 =====
    if (action === 'monthlyTop') {
      const now = new Date();
      const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
      const monthEnd = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
      const fromISO = monthStart.toISOString();
      const toISO = monthEnd.toISOString();

      const bookings = await sb(
        'bookings?select=username,status,fecha_iso,ip_address,nombre&fecha_iso=gte.' + fromISO + '&fecha_iso=lt.' + toISO + '&status=in.(activa,completada,verificada)'
      );
      const proofs = await sb(
        'booking_proofs?select=username,status,created_at&created_at=gte.' + fromISO + '&created_at=lt.' + toISO
      );

      const userStats = {};
      (bookings || []).forEach(function(b) {
        if (!userStats[b.username]) userStats[b.username] = { citas: 0, verificadas: 0, proofs: 0 };
        userStats[b.username].citas++;
        if (b.status === 'verificada' || b.status === 'completada') userStats[b.username].verificadas++;
      });
      (proofs || []).forEach(function(p) {
        if (!userStats[p.username]) userStats[p.username] = { citas: 0, verificadas: 0, proofs: 0 };
        if (p.status === 'approved') userStats[p.username].proofs++;
      });

      const usernames = Object.keys(userStats);
      let usersMap = {};
      if (usernames.length > 0) {
        const users = await sb('users?select=username,name,ref&username=in.(' + usernames.map(u => '"' + u + '"').join(',') + ')');
        (users || []).forEach(function(u) { usersMap[u.username] = u; });
      }

      const ranking = usernames.map(function(u) {
        var s = userStats[u];
        var score = (s.citas * 10) + (s.verificadas * 30) + (s.proofs * 30);
        return { username: u, name: usersMap[u] ? usersMap[u].name : u, citas: s.citas, verificadas: s.verificadas, proofs: s.proofs, score: score };
      }).sort(function(a, b) { return b.score - a.score; }).slice(0, 20);

      return res.status(200).json({ ok: true, period: 'monthly', from: fromISO, to: toISO, ranking: ranking });
    }

    // ===== GET DAILY TOP 5 (with IP flags) =====
    if (action === 'dailyTop') {
      const now = new Date();
      const today10pm = new Date(now); today10pm.setUTCHours(22, 0, 0, 0);
      if (now < today10pm) today10pm.setUTCDate(today10pm.getUTCDate() - 1);
      const fromISO = new Date(today10pm.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const toISO = today10pm.toISOString();

      const bookings = await sb(
        'bookings?select=username,status,fecha_iso,ip_address,nombre&fecha_iso=gte.' + fromISO + '&fecha_iso=lt.' + toISO + '&status=in.(activa,completada,verificada)'
      );

      const userStats = {};
      (bookings || []).forEach(function(b) {
        if (!userStats[b.username]) userStats[b.username] = { citas: 0, verificadas: 0, score: 0, ips: {}, ipDupes: 0 };
        userStats[b.username].citas++;
        if (b.status === 'verificada' || b.status === 'completada') userStats[b.username].verificadas++;
        if (b.ip_address) {
          if (!userStats[b.username].ips[b.ip_address]) userStats[b.username].ips[b.ip_address] = [];
          userStats[b.username].ips[b.ip_address].push(b.nombre);
        }
      });

      Object.keys(userStats).forEach(function(u) {
        var s = userStats[u];
        var ipDupes = 0;
        Object.keys(s.ips).forEach(function(ip) {
          var uniqueNames = [];
          s.ips[ip].forEach(function(n) { if (uniqueNames.indexOf(n) === -1) uniqueNames.push(n); });
          if (uniqueNames.length > 1) ipDupes += uniqueNames.length - 1;
        });
        s.ipDupes = ipDupes;
        s.score = (s.verificadas * 10) + ((s.citas - s.verificadas) * 3) - (ipDupes * 5);
        if (s.score < 0) s.score = 0;
        delete s.ips;
      });

      const usernames = Object.keys(userStats);
      let usersMap = {};
      if (usernames.length > 0) {
        const users = await sb('users?select=username,name&username=in.(' + usernames.map(u => '"' + u + '"').join(',') + ')');
        (users || []).forEach(function(u) { usersMap[u.username] = u; });
      }

      const ranking = usernames.map(function(u) {
        return { username: u, name: usersMap[u] ? usersMap[u].name : u,
          citas: userStats[u].citas, verificadas: userStats[u].verificadas,
          score: userStats[u].score, ipDupes: userStats[u].ipDupes };
      }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);

      return res.status(200).json({ ok: true, period: 'daily', from: fromISO, to: toISO, ranking: ranking });
    }

    // ===== UPLOAD PROOF ===== (unchanged)
    if (action === 'uploadProof') {
      const { booking_id, proof_data } = body;
      if (!user || !booking_id || !proof_data) return res.status(400).json({ ok: false, error: 'Missing fields' });
      const booking = await sb('bookings?id=eq.' + booking_id + '&username=eq.' + user + '&select=*');
      if (!booking || booking.length === 0) return res.status(404).json({ ok: false, error: 'Booking not found' });
      const proof = await sb('booking_proofs', { method: 'POST',
        body: JSON.stringify({ booking_id: booking_id, username: user, proof_url: proof_data.substring(0, 500000), proof_type: 'zoom_screenshot', status: 'pending', ai_score: 0 }) });
      return res.status(200).json({ ok: true, proof: proof ? proof[0] : null });
    }

    // ===== AI ANTI-CHEAT ANALYSIS v2 — with IP tracking =====
    if (action === 'antiCheat') {
      if (!user) return res.status(400).json({ ok: false, error: 'Missing user' });

      const flags = [];
      let suspicionScore = 0;
      const now = new Date();

      // Get ALL bookings for this user (last 30 days for IP analysis)
      const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const allBookings = await sb(
        'bookings?username=eq.' + user + '&created_at=gte.' + thirtyDaysAgo.toISOString() + '&select=id,nombre,whatsapp,email,fecha_iso,created_at,ip_address,user_agent,status&order=created_at.asc'
      );

      // Today's bookings
      const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
      const todayBookings = (allBookings || []).filter(function(b) { return new Date(b.created_at) >= todayStart; });

      // 1. HIGH_VOLUME: >5 citas en un dia
      if (todayBookings.length > 5) {
        flags.push({ type: 'HIGH_VOLUME', msg: 'Mas de 5 citas creadas hoy (' + todayBookings.length + ')', severity: 'high' });
        suspicionScore += 30;
      }

      // 2. BACK_TO_BACK: citas con menos de 15 min
      if (todayBookings.length > 1) {
        let backToBack = 0;
        for (let i = 1; i < todayBookings.length; i++) {
          const prev = new Date(todayBookings[i - 1].fecha_iso);
          const curr = new Date(todayBookings[i].fecha_iso);
          if (Math.abs(curr - prev) / 60000 < 15) backToBack++;
        }
        if (backToBack > 0) {
          flags.push({ type: 'BACK_TO_BACK', msg: backToBack + ' citas con menos de 15 min de separacion', severity: 'medium' });
          suspicionScore += backToBack * 15;
        }
      }

      // 3. DUPLICATE_NAMES
      if (allBookings && allBookings.length > 1) {
        const names = {};
        allBookings.forEach(function(b) { var n = (b.nombre || '').toLowerCase().trim(); names[n] = (names[n] || 0) + 1; });
        const dupes = Object.keys(names).filter(function(n) { return names[n] > 1 && n; });
        if (dupes.length > 0) {
          flags.push({ type: 'DUPLICATE_NAMES', msg: 'Nombres repetidos: ' + dupes.join(', '), severity: 'high' });
          suspicionScore += dupes.length * 20;
        }
      }

      // 4. DUPLICATE_PHONES
      if (allBookings && allBookings.length > 1) {
        const phones = {};
        allBookings.forEach(function(b) { var p = (b.whatsapp || '').replace(/\D/g, ''); if (p) phones[p] = (phones[p] || 0) + 1; });
        const dupePhones = Object.keys(phones).filter(function(p) { return phones[p] > 1; });
        if (dupePhones.length > 0) {
          flags.push({ type: 'DUPLICATE_PHONES', msg: dupePhones.length + ' numeros de telefono repetidos', severity: 'high' });
          suspicionScore += dupePhones.length * 25;
        }
      }

      // 5. ODD_HOURS
      if (todayBookings.length > 0) {
        let impossibleHours = 0;
        todayBookings.forEach(function(b) { var h = new Date(b.fecha_iso).getUTCHours(); if (h < 7 || h > 23) impossibleHours++; });
        if (impossibleHours > 0) {
          flags.push({ type: 'ODD_HOURS', msg: impossibleHours + ' citas en horarios inusuales (antes 7am o despues 11pm)', severity: 'medium' });
          suspicionScore += impossibleHours * 10;
        }
      }

      // 6. LOW_PROOF_RATE
      const weekStart = new Date(now); var dayW = weekStart.getUTCDay(); var diffW = dayW === 0 ? 6 : dayW - 1;
      weekStart.setUTCDate(weekStart.getUTCDate() - diffW); weekStart.setUTCHours(0, 0, 0, 0);
      const weekBookings = await sb('bookings?username=eq.' + user + '&fecha_iso=gte.' + weekStart.toISOString() + '&select=id');
      const weekProofs = await sb('booking_proofs?username=eq.' + user + '&created_at=gte.' + weekStart.toISOString() + '&status=eq.approved&select=id');
      const totalWeekCitas = weekBookings ? weekBookings.length : 0;
      const totalWeekProofs = weekProofs ? weekProofs.length : 0;
      const proofRate = totalWeekCitas > 0 ? totalWeekProofs / totalWeekCitas : 0;
      if (totalWeekCitas > 3 && proofRate < 0.3) {
        flags.push({ type: 'LOW_PROOF_RATE', msg: 'Solo ' + Math.round(proofRate * 100) + '% de citas con prueba verificada', severity: 'medium' });
        suspicionScore += 20;
      }

      // === 7. NEW: SAME_IP — Multiple different prospects from same IP ===
      if (allBookings && allBookings.length > 1) {
        var ipMap = {};
        allBookings.forEach(function(b) {
          if (b.ip_address && b.ip_address !== 'unknown') {
            if (!ipMap[b.ip_address]) ipMap[b.ip_address] = { names: [], phones: [], count: 0 };
            ipMap[b.ip_address].count++;
            var n = (b.nombre || '').toLowerCase().trim();
            if (ipMap[b.ip_address].names.indexOf(n) === -1) ipMap[b.ip_address].names.push(n);
            var p = (b.whatsapp || '').replace(/\D/g, '');
            if (p && ipMap[b.ip_address].phones.indexOf(p) === -1) ipMap[b.ip_address].phones.push(p);
          }
        });

        var suspiciousIPs = [];
        Object.keys(ipMap).forEach(function(ip) {
          var data = ipMap[ip];
          // Flag if same IP has 2+ different names or 2+ different phones
          if (data.names.length >= 2 || data.phones.length >= 2) {
            var masked = ip.split('.').slice(0,2).join('.') + '.*.*';
            suspiciousIPs.push({
              ip: masked,
              totalBookings: data.count,
              uniqueNames: data.names.length,
              uniquePhones: data.phones.length,
              names: data.names.slice(0, 5)
            });
          }
        });

        if (suspiciousIPs.length > 0) {
          var totalDupeIPs = suspiciousIPs.reduce(function(sum, s) { return sum + s.totalBookings; }, 0);
          flags.push({
            type: 'SAME_IP',
            msg: suspiciousIPs.length + ' IP(s) con multiples prospectos diferentes (' + totalDupeIPs + ' reservas)',
            severity: 'critical',
            details: suspiciousIPs
          });
          suspicionScore += suspiciousIPs.length * 30;
        }
      }

      // === 8. NEW: SAME_USER_AGENT — Same browser fingerprint for "different" people ===
      if (allBookings && allBookings.length > 3) {
        var uaMap = {};
        allBookings.forEach(function(b) {
          if (b.user_agent && b.user_agent !== 'unknown') {
            var shortUA = b.user_agent.substring(0, 100);
            if (!uaMap[shortUA]) uaMap[shortUA] = 0;
            uaMap[shortUA]++;
          }
        });
        var dominantUA = Object.keys(uaMap).sort(function(a, b) { return uaMap[b] - uaMap[a]; })[0];
        if (dominantUA && uaMap[dominantUA] >= 3 && uaMap[dominantUA] / allBookings.length > 0.7) {
          flags.push({
            type: 'SAME_DEVICE',
            msg: Math.round(uaMap[dominantUA] / allBookings.length * 100) + '% de reservas desde el mismo navegador/dispositivo',
            severity: 'high'
          });
          suspicionScore += 20;
        }
      }

      // === 9. NEW: INVALID_DATA — Check for suspicious data patterns ===
      if (allBookings && allBookings.length > 0) {
        var invalidCount = 0;
        var invalidDetails = [];
        allBookings.forEach(function(b) {
          var issues = [];
          // Very short name
          if (b.nombre && b.nombre.trim().length < 3) issues.push('nombre muy corto');
          // Repeated characters in name
          if (b.nombre && /^(.)\1+$/.test(b.nombre.replace(/\s/g, ''))) issues.push('nombre falso');
          // Phone too short
          var cleanPhone = (b.whatsapp || '').replace(/\D/g, '');
          if (cleanPhone.length < 10) issues.push('telefono corto');
          // All same digits
          if (/^(\d)\1+$/.test(cleanPhone)) issues.push('telefono falso');
          if (issues.length > 0) {
            invalidCount++;
            invalidDetails.push({ nombre: b.nombre, issues: issues });
          }
        });
        if (invalidCount > 0) {
          flags.push({
            type: 'INVALID_DATA',
            msg: invalidCount + ' reserva(s) con datos sospechosos',
            severity: invalidCount > 2 ? 'high' : 'medium',
            details: invalidDetails.slice(0, 10)
          });
          suspicionScore += invalidCount * 15;
        }
      }

      // Classification
      let classification = 'clean';
      if (suspicionScore >= 40) classification = 'suspicious';
      if (suspicionScore >= 70) classification = 'flagged';
      if (suspicionScore >= 100) classification = 'blocked';

      // IP summary for response
      var ipSummary = {};
      if (allBookings) {
        allBookings.forEach(function(b) {
          if (b.ip_address && b.ip_address !== 'unknown') {
            var masked = b.ip_address.split('.').slice(0,2).join('.') + '.*.*';
            ipSummary[masked] = (ipSummary[masked] || 0) + 1;
          }
        });
      }

      return res.status(200).json({
        ok: true, user: user,
        suspicionScore: Math.min(suspicionScore, 100),
        classification: classification,
        flags: flags,
        stats: {
          todayCitas: todayBookings.length,
          weekCitas: totalWeekCitas,
          weekProofs: totalWeekProofs,
          proofRate: Math.round(proofRate * 100),
          totalLast30Days: allBookings ? allBookings.length : 0,
          uniqueIPs: Object.keys(ipSummary).length,
          ipBreakdown: ipSummary
        }
      });
    }

    // ===== MARK BOOKING AS COMPLETED ===== (unchanged)
    if (action === 'completeBooking') {
      const { booking_id } = body;
      if (!user || !booking_id) return res.status(400).json({ ok: false, error: 'Missing fields' });
      const result = await sb('bookings?id=eq.' + booking_id + '&username=eq.' + user, { method: 'PATCH', body: JSON.stringify({ status: 'completada' }) });
      return res.status(200).json({ ok: true, booking: result ? result[0] : null });
    }

    // ===== VERIFY PROOF (admin only) ===== (unchanged)
    if (action === 'verifyProof') {
      const { proof_id, approved } = body;
      if (!proof_id) return res.status(400).json({ ok: false, error: 'Missing proof_id' });
      const newStatus = approved ? 'approved' : 'rejected';
      const result = await sb('booking_proofs?id=eq.' + proof_id, { method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reviewed_by: user, reviewed_at: new Date().toISOString() }) });
      if (approved && result && result[0]) {
        await sb('bookings?id=eq.' + result[0].booking_id, { method: 'PATCH', body: JSON.stringify({ status: 'verificada' }) });
      }
      return res.status(200).json({ ok: true, proof: result ? result[0] : null });
    }

    // ===== SKY PROSPECTS RANKING =====
    if (action === 'prospectRanking') {
      var period = body.period || req.query?.period || 'weekly';
      // Colombia time (UTC-5) for ALL period calculations
      var nowCol2 = new Date(Date.now() - 18000000);
      var fromDate;
      if (period === 'daily') {
        // Hoy 00:01 Colombia = hoy 05:01 UTC
        fromDate = new Date(nowCol2.toISOString().split('T')[0] + 'T05:00:00.000Z');
      } else if (period === 'monthly') {
        // Primero del mes 00:01 Colombia
        var mStr = nowCol2.getUTCFullYear() + '-' + String(nowCol2.getUTCMonth()+1).padStart(2,'0') + '-01';
        fromDate = new Date(mStr + 'T05:00:00.000Z');
      } else {
        // Lunes 00:01 Colombia
        var d2 = nowCol2.getUTCDay(); var diff2 = d2===0?6:d2-1;
        var mon = new Date(nowCol2); mon.setUTCDate(nowCol2.getUTCDate()-diff2);
        fromDate = new Date(mon.toISOString().split('T')[0] + 'T05:00:00.000Z');
      }
      var fromISO2 = fromDate.toISOString();

      // Fetch all data in parallel
      var results2 = await Promise.all([
        sb('prospectos?select=username,etapa,temperatura,created_at,updated_at,calif_positivo,telefono,instagram&limit=5000'),
        sb('interacciones?select=username,tipo,created_at,prospecto_id&created_at=gte.' + fromISO2 + '&limit=5000'),
        sb('recordatorios?select=username,completado,created_at&created_at=gte.' + fromISO2 + '&limit=5000'),
        sb('users?select=username,name,photo&limit=5000')
      ]);
      var allProspectos = results2[0] || [];
      var allInteracciones = results2[1] || [];
      var allRecordatorios = results2[2] || [];
      var allUsers = results2[3] || [];
      var userMap2 = {}; allUsers.forEach(function(u){ userMap2[u.username] = u; });

      // ── SCORING FORMULA ──
      // Contacto: +2 | WA: +1 | IG: +1 | Calificado: +1
      // Avance etapa: +2 | Mensaje IA: +2
      // Interaccion/historial: +1 (max 1/prospecto/dia)
      // Recordatorio: +1 (max 1/prospecto/dia)
      // Img abono: +20 | Img pago completo: +60
      var _defStats = function(){ return {contactos:0,conWa:0,conIg:0,calificados:0,avances:0,msgIA:0,actualizaciones:0,recordatorios:0,imgPresentacion:0,imgAbono:0,imgPago:0,score:0}; };
      var stats2 = {};
      // Count new prospects in period
      allProspectos.forEach(function(p) {
        if (!stats2[p.username]) stats2[p.username] = _defStats();
        var s = stats2[p.username];
        if (p.created_at >= fromISO2) {
          s.contactos++;
          if (p.telefono && p.telefono.length >= 8) s.conWa++;
          if (p.instagram && p.instagram.length >= 2) s.conIg++;
          if (p.calif_positivo !== null && p.calif_positivo !== undefined) s.calificados++;
        }
      });
      // Count interactions in period
      allInteracciones.forEach(function(i) {
        if (!stats2[i.username]) stats2[i.username] = _defStats();
        var s = stats2[i.username];
        var tipo = (i.tipo||'').toLowerCase();
        var contenido = (i.contenido||'').toLowerCase();
        // Cambio de etapa: +2
        if (tipo === 'cambio_etapa' && contenido.indexOf('movido de') > -1) {
          s.avances++;
        }
        // Evidencia de presentacion: +10
        if (tipo === 'presentacion' && contenido.indexOf('evidencia de presentacion') > -1) {
          s.imgPresentacion++;
        }
        // Abono con imagen: +20
        if (contenido.indexOf('comprobante de abono') > -1) {
          s.imgAbono++;
        }
        // Cierre con factura: +60
        if (tipo === 'cierre') {
          s.imgPago++;
        }
        // Mensaje IA: +2
        if (tipo === 'nota' && contenido.indexOf('mensaje generado con ia') > -1) {
          s.msgIA++;
        }
        // Actualizacion/historial: +1 (max 1 per prospect per day)
        if (tipo !== 'cambio_etapa' && contenido.indexOf('mensaje generado con ia') === -1 && tipo !== 'cierre') {
          if (!s._actDays) s._actDays = {};
          var dayKey = (i.prospecto_id||'') + '_' + (i.created_at||'').slice(0,10);
          if (!s._actDays[dayKey]) { s._actDays[dayKey] = true; s.actualizaciones++; }
        }
      });
      // Count reminders in period (max 1 per prospect per day)
      allRecordatorios.forEach(function(r) {
        if (!stats2[r.username]) stats2[r.username] = _defStats();
        var s = stats2[r.username];
        if (!s._remDays) s._remDays = {};
        var remKey = (r.prospecto_id||r.id||'') + '_' + (r.created_at||'').slice(0,10);
        if (!s._remDays[remKey]) { s._remDays[remKey] = true; s.recordatorios++; }
      });

      // Calculate scores
      var ranking2 = Object.entries(stats2).map(function(e) {
        var u = e[0], s = e[1];
        s.score = (s.contactos * 2) + (s.conWa * 1) + (s.conIg * 1) + (s.calificados * 1) + (s.avances * 2) + (s.msgIA * 2) + (s.actualizaciones * 1) + (s.recordatorios * 1) + (s.imgPresentacion * 10) + (s.imgAbono * 20) + (s.imgPago * 60);
        var usr = userMap2[u] || {};
        return { username: u, name: usr.name || u, photo: usr.photo || null, score: s.score, contactos: s.contactos, avances: s.avances, msgIA: s.msgIA, actualizaciones: s.actualizaciones, abonos: s.imgAbono, pagos: s.imgPago };
      }).filter(function(r){ return r.score > 0; }).sort(function(a,b){ return b.score - a.score; });

      return res.status(200).json({ ok: true, ranking: ranking2.slice(0, 50), period: period });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};

