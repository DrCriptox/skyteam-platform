// Landing integration API — reads/writes asesores.json + stats.json from innova-ia-landing repo
const REPO = process.env.GITHUB_REPO || 'DrCriptox/innova-ia-landing';
const BRANCH = 'main';
const FILE_ASESORES = 'asesores-skyteam.json'; // New file for skyteam registrations
const FILE_STATS = 'stats.json';
const TOKEN = () => process.env.GITHUB_TOKEN || '';

function ghHeaders() {
  return { Authorization: 'token ' + TOKEN(), Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'SkyTeam-Platform' };
}

function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

async function readGHFile(file) {
  const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + file + '?ref=' + BRANCH, { headers: ghHeaders() });
  if (!r.ok) return { data: {}, sha: null };
  const d = await r.json();
  const text = Buffer.from(d.content, 'base64').toString('utf-8');
  return { data: JSON.parse(text), sha: d.sha };
}

async function writeGHFile(file, data, sha, message) {
  const body = { message, content: toBase64(JSON.stringify(data, null, 2)), branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + file, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) { const err = await r.text().catch(()=>''); console.error('[Landing] GitHub write error:', r.status, err.substring(0, 200)); }
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, user, ref } = req.body || {};
    if (!action) return res.status(400).json({ error: 'Missing action' });

    // ── GET PROFILE: read from skyteam file first, then old asesores.json as fallback ──
    if (action === 'getProfile') {
      if (!ref) return res.status(400).json({ error: 'Missing ref' });
      const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');
      const { data: skyData } = await readGHFile(FILE_ASESORES);
      let asesor = skyData[slug] || null;
      if (!asesor) {
        const { data: oldData } = await readGHFile('asesores.json');
        asesor = oldData[slug] || null;
      }
      return res.status(200).json({ ok: true, asesor, exists: !!asesor });
    }

    // ── SYNC PHOTO: silently update foto only if currently empty (never overwrites custom photos) ──
    if (action === 'syncPhoto') {
      const { foto } = req.body;
      if (!ref || !foto) return res.status(400).json({ error: 'Missing ref or foto' });
      if (!TOKEN()) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
      const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, sha } = await readGHFile(FILE_ASESORES);
        const existing = data[slug] || {};
        if (existing.foto) return res.status(200).json({ ok: true, skipped: true }); // already has photo, skip
        data[slug] = Object.assign({}, existing, { foto });
        if (await writeGHFile(FILE_ASESORES, data, sha, 'skyteam: syncPhoto ' + slug))
          return res.status(200).json({ ok: true });
      }
      return res.status(500).json({ error: 'Write failed' });
    }

    // ── SAVE PROFILE: write to asesores-skyteam.json AND asesores.json ──
    if (action === 'saveProfile') {
      if (!ref) return res.status(400).json({ error: 'Missing ref' });
      const { nombre, rol, whatsapp, mensaje, foto } = req.body;
      if (!TOKEN()) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
      const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');
      const asesorData = {
        nombre: (nombre || 'Socio').trim(),
        rol: (rol || 'Asesor InnovaIA').trim(),
        whatsapp: (whatsapp || '').trim(),
        foto: foto !== undefined ? foto : '',
        verificado: true,
        mensaje: (mensaje || 'Te ayudo a activar tu franquicia digital y generar ingresos reales desde el primer mes').trim()
      };

      // Write to new skyteam file
      let saved = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, sha } = await readGHFile(FILE_ASESORES);
        data[slug] = asesorData;
        if (await writeGHFile(FILE_ASESORES, data, sha, 'skyteam: update ' + slug)) { saved = true; break; }
      }

      // Also write to old asesores.json so innovaia.app landing works
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, sha } = await readGHFile('asesores.json');
        data[slug] = asesorData;
        if (await writeGHFile('asesores.json', data, sha, 'skyteam: sync ' + slug)) break;
      }

      if (saved) return res.status(200).json({ ok: true, slug, link: 'https://innovaia.app?ref=' + slug });
      // Debug: try one more time and return the actual error
      const { data: debugData, sha: debugSha } = await readGHFile(FILE_ASESORES);
      const debugR = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE_ASESORES, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify({ message: 'debug', content: toBase64(JSON.stringify(debugData, null, 2)), branch: BRANCH, ...(debugSha ? {sha: debugSha} : {}) }) });
      const debugErr = await debugR.text().catch(()=>'');
      return res.status(500).json({ error: 'Write failed', status: debugR.status, github: debugErr.substring(0, 300) });
    }

    // ── GET STATS: read visit stats ──
    if (action === 'getStats') {
      const { data } = await readGHFile(FILE_STATS);
      return res.status(200).json({ ok: true, stats: data });
    }

    // ── GET RANKING: merge both asesor files + stats, filter by period ──
    if (action === 'getRanking') {
      const { period } = req.body || {};
      const { data: stats } = await readGHFile(FILE_STATS);
      const { data: skyAsesores } = await readGHFile(FILE_ASESORES);
      const { data: oldAsesores } = await readGHFile('asesores.json');
      // After April 9 2026 (Wednesday), only count landings created from skyteam (asesores-skyteam.json)
      const cutoffDate = new Date('2026-04-09T00:00:00');
      const onlyNew = Date.now() >= cutoffDate.getTime();
      // Merge: skyAsesores takes priority for all fields EXCEPT foto — use whichever source has it
      let allAsesores;
      if (onlyNew) {
        allAsesores = skyAsesores;
      } else {
        allAsesores = Object.assign({}, oldAsesores);
        Object.keys(skyAsesores).forEach(function(ref) {
          const old = oldAsesores[ref] || {};
          const sky = skyAsesores[ref] || {};
          allAsesores[ref] = Object.assign({}, old, sky, {
            foto: sky.foto || old.foto || ''
          });
        });
      }

      // Colombia time (UTC-5) for period calculations
      const nowCol = new Date(Date.now() - 18000000);
      let dateFrom = null;
      if (period === 'daily') {
        dateFrom = nowCol.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const day = nowCol.getUTCDay(); const diff = day === 0 ? 6 : day - 1;
        const monday = new Date(nowCol.getTime()); monday.setUTCDate(nowCol.getUTCDate() - diff);
        dateFrom = monday.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        dateFrom = nowCol.getUTCFullYear() + '-' + String(nowCol.getUTCMonth()+1).padStart(2,'0') + '-01';
      }

      const ranking = Object.keys(allAsesores)
        .filter(function(ref) { return ref !== 'default'; })
        .map(function(ref) {
          const asesor = allAsesores[ref] || {};
          const s = typeof stats[ref] === 'object' ? stats[ref] : {};

          let visitas = 0, uniqueIps = 0, conversiones = 0;

          if (dateFrom) {
            // ── Period filter ──
            if (s.days) Object.keys(s.days).forEach(function(d) { if (d >= dateFrom) visitas += (typeof s.days[d] === 'number' ? s.days[d] : 0); });
            // Unique visit IPs in period
            if (s.days_ips) {
              const periodIps = {};
              Object.keys(s.days_ips).forEach(function(d) {
                if (d >= dateFrom && typeof s.days_ips[d] === 'object')
                  Object.keys(s.days_ips[d]).forEach(function(ip) { periodIps[ip] = true; });
              });
              uniqueIps = Object.keys(periodIps).length;
            } else { uniqueIps = s.ips ? Object.keys(s.ips).length : 0; }
            // Unique conversion IPs in period (each IP máx 1 conversión)
            if (s.days_conversions_ips) {
              const convIps = {};
              Object.keys(s.days_conversions_ips).forEach(function(d) {
                if (d >= dateFrom && typeof s.days_conversions_ips[d] === 'object')
                  Object.keys(s.days_conversions_ips[d]).forEach(function(ip) { convIps[ip] = true; });
              });
              conversiones = Object.keys(convIps).length;
            } else if (s.days_conversions) {
              Object.keys(s.days_conversions).forEach(function(d) { if (d >= dateFrom) conversiones += s.days_conversions[d] || 0; });
            }
          } else {
            // ── All-time ──
            visitas = s.total || 0;
            uniqueIps = s.ips ? Object.keys(s.ips).length : 0;
            // Prefer unique conversion IPs if tracked, else raw count
            conversiones = s.conversions_ips ? Object.keys(s.conversions_ips).length : (s.conversions || 0);
          }

          // If IP tracking data is missing/incomplete for period, assume all visits are unique
          const effectiveUniqueIps = (uniqueIps === 0 && visitas > 0) ? visitas : uniqueIps;
          const ipDupes = Math.max(0, visitas - effectiveUniqueIps);
          const cap = effectiveUniqueIps > 0 ? effectiveUniqueIps : visitas;
          const validConversions = Math.min(conversiones, cap);
          const score = Math.max(0, visitas - (ipDupes * 2) + (validConversions * 20));
          return {
            ref: ref, nombre: asesor.nombre || ref,
            visitas: visitas, uniqueVisitas: effectiveUniqueIps, conversiones: validConversions, score: score,
            whatsapp: asesor.whatsapp || '', foto: asesor.foto || '',
            newLanding: !!skyAsesores[ref]
          };
        })
        .filter(function(r) { return dateFrom ? (r.visitas > 0 || r.score > 0) : true; })
        .sort(function(a, b) { return b.score - a.score; });

      // Count ALL asesores (not just filtered) for position display
      const totalAsesores = Object.keys(allAsesores).filter(function(r){ return r !== 'default'; }).length;
      const top20 = ranking.slice(0, 20);
      const totalParticipants = totalAsesores;

      // Find current user's position if not in top 20
      const userRef = (req.body.ref || '').toLowerCase();
      let myPosition = null;
      if (userRef) {
        const idx = ranking.findIndex(function(r) { return r.ref === userRef; });
        if (idx >= 20) {
          myPosition = { position: idx + 1, data: ranking[idx] };
        } else if (idx === -1) {
          myPosition = { position: totalParticipants + 1, data: { ref: userRef, nombre: userRef, visitas: 0, conversiones: 0, score: 0, whatsapp: '', foto: '' } };
        }
      }

      return res.status(200).json({ ok: true, ranking: top20, totalParticipants, myPosition });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('landing API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
