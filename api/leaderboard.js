// Leaderboard + Anti-Cheat API — /api/leaderboard.js
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

    // ===== GET WEEKLY TOP 10 =====
    if (action === 'weeklyTop') {
      // Get Monday of current week (UTC)
      const now = new Date();
      const day = now.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - diff);
      monday.setUTCHours(0, 0, 0, 0);
      const mondayISO = monday.toISOString();

      // Sunday end
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 7);
      const sundayISO = sunday.toISOString();

      // Count bookings per user this week with verified/completada status
      const bookings = await sb(
        'bookings?select=username,status,fecha_iso&fecha_iso=gte.' + mondayISO + '&fecha_iso=lt.' + sundayISO + '&status=in.(activa,completada,verificada)'
      );

      // Count proofs per user this week
      const proofs = await sb(
        'booking_proofs?select=username,status,created_at&created_at=gte.' + mondayISO + '&created_at=lt.' + sundayISO
      );

      // Aggregate
      const userStats = {};
      (bookings || []).forEach(function(b) {
        if (!userStats[b.username]) userStats[b.username] = { citas: 0, verificadas: 0, proofs: 0, score: 0 };
        userStats[b.username].citas++;
        if (b.status === 'verificada' || b.status === 'completada') userStats[b.username].verificadas++;
      });
      (proofs || []).forEach(function(p) {
        if (!userStats[p.username]) userStats[p.username] = { citas: 0, verificadas: 0, proofs: 0, score: 0 };
        if (p.status === 'approved') userStats[p.username].proofs++;
      });

      // Calculate score: verified citas = 10pts, active citas = 3pts, proofs = 5pts bonus
      Object.keys(userStats).forEach(function(u) {
        var s = userStats[u];
        s.score = (s.verificadas * 10) + ((s.citas - s.verificadas) * 3) + (s.proofs * 5);
      });

      // Get user names
      const usernames = Object.keys(userStats);
      let usersMap = {};
      if (usernames.length > 0) {
        const users = await sb('users?select=username,name,ref&username=in.(' + usernames.map(u => '"' + u + '"').join(',') + ')');
        (users || []).forEach(function(u) { usersMap[u.username] = u; });
      }

      // Sort and return top 10
      const ranking = usernames.map(function(u) {
        return {
          username: u,
          name: usersMap[u] ? usersMap[u].name : u,
          ref: usersMap[u] ? usersMap[u].ref : '',
           citas: userStats[u].citas,
          verificadas: userStats[u].verificadas,
          proofs: userStats[u].proofs,
          score: userStats[u].score
        };
      }).sort(function(a, b) { return b.score - a.score; }).slice(0, 10);

      return res.status(200).json({ ok: true, period: 'weekly', from: mondayISO, to: sundayISO, ranking: ranking });
    }

    // ===== GET DAILY TOP 5 =====
    if (action === 'dailyTop') {
      // Last 24 hours from 10pm cutoff
      const now = new Date();
      const today10pm = new Date(now);
      today10pm.setUTCHours(22, 0, 0, 0); // 10pm UTC (approx, timezone handled client-side)
      if (now < today10pm) today10pm.setUTCDate(today10pm.getUTCDate() - 1);
      const fromISO = new Date(today10pm.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const toISO = today10pm.toISOString();

      const bookings = await sb(
        'bookings?select=username,status,fecha_iso&created_at=gte.' + fromISO + '&created_at=lt.' + toISO + '&status=in.(activa,completada,verificada)'
      );

      const userStats = {};
      (bookings || []).forEach(function(b) {
        if (!userStats[b.username]) userStats[b.username] = { citas: 0, verificadas: 0, score: 0 };
        userStats[b.username].citas++;
        if (b.status === 'verificada' || b.status === 'completada') userStats[b.username].verificadas++;
      });
      Object.keys(userStats).forEach(function(u) {
        var s = userStats[u];
        s.score = (s.verificadas * 10) + ((s.citas - s.verificadas) * 3);
      });

      const usernames = Object.keys(userStats);
      let usersMap = {};
      if (usernames.length > 0) {
        const users = await sb('users?select=username,name&username=in.(' + usernames.map(u => '"' + u + '"').join(',') + ')');
        (users || []).forEach(function(u) { usersMap[u.username] = u; });
      }

      const ranking = usernames.map(function(u) {
        return { username: u, name: usersMap[u] ? usersMap[u].name : u, citas: userStats[u].citas, verificadas: userStats[u].verificadas, score: userStats[u].score };
      }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);

      return res.status(200).json({ ok: true, period: 'daily', from: fromISO, to: toISO, ranking: ranking });
    }

    // ===== UPLOAD PROOF =====
    if (action === 'uploadProof') {
      const { booking_id, proof_data } = body;
      if (!user || !booking_id || !proof_data) return res.status(400).json({ ok: false, error: 'Missing fields' });

      // Verify booking exists and belongs to user
      const booking = await sb('bookings?id=eq.' + booking_id + '&username=eq.' + user + '&select=*');
      if (!booking || booking.length === 0) return res.status(404).json({ ok: false, error: 'Booking not found' });

      // Store proof (base64 data URL stored directly - for MVP; could use Supabase Storage later)
      const proof = await sb('booking_proofs', {
        method: 'POST',
        body: JSON.stringify({
         booking_id: booking_id,
          username: user,
          proof_url: proof_data.substring(0, 500000), // Limit size
          proof_type: 'zoom_screenshot',
          status: 'pending',
          ai_score: 0
        })
      });

      return res.status(200).json({ ok: true, proof: proof ? proof[0] : null });
    }

    // ===== AI ANTI-CHEAT ANALYSIS =====
    if (action === 'antiCheat') {
      if (!user) return res.status(400).json({ ok: false, error: 'Missing user' });

      const flags = [];
      let suspicionScore = 0;

      // 1. Check for too many bookings in short time (>5 in one day)
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayBookings = await sb(
        'bookings?username=eq.' + user + '&created_at=gte.' + todayStart.toISOString() + '&select=id,nombre,whatsapp,fecha_iso,created_at&order=created_at.asc'
      );

      if (todayBookings && todayBookings.length > 5) {
        flags.push({ type: 'HIGH_VOLUME', msg: 'Mas de 5 citas creadas hoy (' + todayBookings.length + ')', severity: 'high' });
        suspicionScore += 30;
      }

      // 2. Check for back-to-back bookings (less than 15 min apart)
      if (todayBookings && todayBookings.length > 1) {
        let backToBack = 0;
        for (let i = 1; i < todayBookings.length; i++) {
          const prev = new Date(todayBookings[i - 1].fecha_iso);
          const curr = new Date(todayBookings[i].fecha_iso);
          const diffMin = Math.abs(curr - prev) / 60000;
          if (diffMin < 15) backToBack++;
        }
        if (backToBack > 0) {
          flags.push({ type: 'BACK_TO_BACK', msg: backToBack + ' citas con menos de 15 min de separacion', severity: 'medium' });
          suspicionScore += backToBack * 15;
        }
      }

      // 3. Check for repeated prospect names
      if (todayBookings && todayBookings.length > 1) {
        const names = {};
        todayBookings.forEach(function(b) {
          const n = (b.nombre || '').toLowerCase().trim();
          names[n] = (names[n] || 0) + 1;
        });
        const dupes = Object.keys(names).filter(function(n) { return names[n] > 1 && n; });
        if (dupes.length > 0) {
          flags.push({ type: 'DUPLICATE_NAMES', msg: 'Nombres repetidos: ' + dupes.join(', '), severity: 'high' });
          suspicionScore += dupes.length * 20;
        }
      }

      // 4. Check for same WhatsApp numbers
      if (todayBookings && todayBookings.length > 1) {
        const phones = {};
        todayBookings.forEach(function(b) {
          const p = (b.whatsapp || '').replace(/\D/g, '');
          if (p) phones[p] = (phones[p] || 0) + 1;
        });
        const dupePhones = Object.keys(phones).filter(function(p) { return phones[p] > 1; });
        if (dupePhones.length > 0) {
          flags.push({ type: 'DUPLICATE_PHONES', msg: dupePhones.length + ' numeros de telefono repetidos', severity: 'high' });
          suspicionScore += dupePhones.length * 25;
        }
      }

      // 5. Check for bookings at impossible hours (before 7am or after 11pm)
      if (todayBookings) {
        let impossibleHours = 0;
        todayBookings.forEach(function(b) {
          const h = new Date(b.fecha_iso).getUTCHours();
          if (h < 7 || h > 23) impossibleHours++;
        });
        if (impossibleHours > 0) {
          flags.push({ type: 'ODD_HOURS', msg: impossibleHours + ' citas en horarios inusuales (antes 7am o despues 11pm)', severity: 'medium' });
          suspicionScore += impossibleHours * 10;
        }
      }

      // 6. Check proof rate (low proof rate = suspicious if many citas)
      const weekStart = new Date(now);
      const day = weekStart.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setUTCDate(weekStart.getUTCDate() - diff);
      weekStart.setUTCHours(0, 0, 0, 0);

      const weekBookings = await sb('bookings?username=eq.' + user + '&fecha_iso=gte.' + weekStart.toISOString() + '&select=id');
      const weekProofs = await sb('booking_proofs?username=eq.' + user + '&created_at=gte.' + weekStart.toISOString() + '&status=eq.approved&select=id');

      const totalWeekCitas = weekBookings ? weekBookings.length : 0;
      const totalWeekProofs = weekProofs ? weekProofs.length : 0;
      const proofRate = totalWeekCitas > 0 ? totalWeekProofs / totalWeekCitas : 0;

      if (totalWeekCitas > 3 && proofRate < 0.3) {
        flags.push({ type: 'LOW_PROOF_RATE', msg: 'Solo ' + Math.round(proofRate * 100) + '% de citas con prueba verificada', severity: 'medium' });
        suspicionScore += 20;
      }

      // Classification
      let classification = 'clean';
      if (suspicionScore >= 50) classification = 'suspicious';
      if (suspicionScore >= 80) classification = 'flagged';

      return res.status(200).json({
        ok: true,
        user: user,
        suspicionScore: Math.min(suspicionScore, 100),
        classification: classification,
        flags: flags,
        stats: { todayCitas: todayBookings ? todayBookings.length : 0, weekCitas: totalWeekCitas, weekProofs: totalWeekProofs, proofRate: Math.round(proofRate * 100) }
      });
    }

    // ===== MARK BOOKING AS COMPLETED =====
    if (action === 'completeBooking') {
      const { booking_id } = body;
      if (!user || !booking_id) return res.status(400).json({ ok: false, error: 'Missing fields' });

      const result = await sb('bookings?id=eq.' + booking_id + '&username=eq.' + user, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completada' })
      });

      return res.status(200).json({ ok: true, booking: result ? result[0] : null });
    }

    // ===== VERIFY PROOF (admin only) =====
    if (action === 'verifyProof') {
      const { proof_id, approved } = body;
      if (!proof_id) return res.status(400).json({ ok: false, error: 'Missing proof_id' });

      const newStatus = approved ? 'approved' : 'rejected';
      const result = await sb('booking_proofs?id=eq.' + proof_id, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reviewed_by: user, reviewed_at: new Date().toISOString() })
      });

      // If approved, update booking status to verificada
      if (approved && result && result[0]) {
        await sb('bookings?id=eq.' + result[0].booking_id, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'verificada' })
        });
      }

      return res.status(200).json({ ok: true, proof: result ? result[0] : null });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
