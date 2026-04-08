// Landing integration API — reads/writes asesores.json + stats.json from innova-ia-landing repo
//
// SCALABILITY NOTES (500+ partners):
// - GitHub API reads cached 60s with stampede protection (avoids 60 req/hr unauthenticated limit)
// - GitHub writes use retry with jitter (SHA conflict resolution)
// - Supabase is primary for reads (getProfile, getRanking); GitHub is backup/sync
// - getRanking reads from Supabase first, falls back to GitHub only if Supabase fails

const REPO = process.env.GITHUB_REPO || 'DrCriptox/innova-ia-landing';
const BRANCH = 'main';
const FILE_ASESORES = 'asesores-skyteam.json';
const FILE_STATS = 'stats.json';
const TOKEN = () => process.env.GITHUB_TOKEN || '';

// ── GitHub file read cache (prevents hammering GitHub API) ──
const GH_READ_CACHE = {};
const GH_READ_TTL = 60000; // 60s cache per file

function ghHeaders() {
  return { Authorization: 'token ' + TOKEN(), Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'SkyTeam-Platform' };
}

function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

async function readGHFile(file, skipCache) {
  // Check cache first (unless explicitly skipped for write operations needing fresh SHA)
  const now = Date.now();
  const cached = GH_READ_CACHE[file];
  if (!skipCache && cached && (now - cached.ts) < GH_READ_TTL) {
    return { data: cached.data, sha: cached.sha };
  }
  // Stampede protection: reuse in-flight request
  if (cached && cached.inflight) return cached.inflight;
  const inflightPromise = (async () => {
    try {
      // Use raw.githubusercontent for reading (works for any file size, no 1MB limit)
      const rawR = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + file);
      // Also get SHA for write operations
      const shaR = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + file + '?ref=' + BRANCH, { headers: ghHeaders() });
      const shaData = shaR.ok ? await shaR.json() : {};
      const r = rawR;
      if (!r.ok) {
        const fallback = GH_READ_CACHE[file];
        return { data: fallback ? fallback.data : {}, sha: shaData.sha || (fallback ? fallback.sha : null) };
      }
      const parsed = await r.json();
      GH_READ_CACHE[file] = { data: parsed, sha: shaData.sha || null, ts: Date.now(), inflight: null };
      return { data: parsed, sha: shaData.sha || null };
    } catch (e) {
      console.error('[Landing] readGHFile error:', file, e.message);
      const fallback = GH_READ_CACHE[file];
      return { data: fallback ? fallback.data : {}, sha: fallback ? fallback.sha : null };
    } finally {
      if (GH_READ_CACHE[file]) GH_READ_CACHE[file].inflight = null;
    }
  })();
  if (!GH_READ_CACHE[file]) GH_READ_CACHE[file] = { data: {}, sha: null, ts: 0, inflight: null };
  GH_READ_CACHE[file].inflight = inflightPromise;
  return inflightPromise;
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

    // ── GET PROFILE: Supabase first (fast), GitHub fallback ──
    if (action === 'getProfile') {
      if (!ref) return res.status(400).json({ error: 'Missing ref' });
      const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Try Supabase first (fast, no rate limits)
      const SB_URL = process.env.SUPABASE_URL;
      const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
      if (SB_URL && SB_KEY) {
        try {
          const sbR = await fetch(SB_URL + '/rest/v1/landing_profiles?ref=eq.' + slug + '&select=*&limit=1', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
          });
          const rows = await sbR.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const row = rows[0];
            return res.status(200).json({ ok: true, asesor: { nombre: row.nombre, rol: row.rol, whatsapp: row.whatsapp, mensaje: row.mensaje, foto: row.foto || '', verificado: true }, exists: true, source: 'supabase' });
          }
        } catch(e) { /* fall through to GitHub */ }
      }

      // Fallback to GitHub (cached reads)
      const { data: skyData } = await readGHFile(FILE_ASESORES);
      let asesor = skyData[slug] || null;
      if (!asesor) {
        const { data: oldData } = await readGHFile('asesores.json');
        asesor = oldData[slug] || null;
      }
      return res.status(200).json({ ok: true, asesor, exists: !!asesor });
    }

    // ── MIGRATE: bulk import historical stats to Supabase ──
    if (action === 'migrateStats') {
      const adminKey = (req.body.adminKey || '').trim();
      const sbKey = process.env.SUPABASE_SERVICE_KEY || '';
      if (!adminKey || (adminKey !== sbKey && adminKey !== (process.env.ADMIN_PUSH_KEY || '').trim())) return res.status(401).json({ error: 'Unauthorized' });
      const rows = req.body.rows || [];
      if (!rows.length) return res.status(400).json({ error: 'No rows' });
      const SB_URL_M = process.env.SUPABASE_URL;
      const SB_KEY_M = process.env.SUPABASE_SERVICE_KEY;
      if (!SB_URL_M || !SB_KEY_M) return res.status(500).json({ error: 'SB not configured' });
      const sbH = { apikey: SB_KEY_M, Authorization: 'Bearer ' + SB_KEY_M, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
      const r = await fetch(SB_URL_M + '/rest/v1/landing_visits', { method: 'POST', headers: sbH, body: JSON.stringify(rows) });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: t.substring(0, 200) }); }
      return res.status(200).json({ ok: true, inserted: rows.length });
    }

    // ── TRACK: count visits and conversions — Supabase (instant, atomic) ──
    if (action === 'track' || action === 'capi') {
      const trackRef = (req.body.ref || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const trackType = req.body.type || 'visit';
      const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (!trackRef) return res.status(200).json({ ok: true });
      const SB_URL_T = process.env.SUPABASE_URL;
      const SB_KEY_T = process.env.SUPABASE_SERVICE_KEY;
      const today = new Date(Date.now() - 18000000).toISOString().slice(0, 10); // Colombia time
      if (SB_URL_T && SB_KEY_T) {
        // Fire and forget — Supabase UPSERT is atomic, no SHA conflicts
        const sbH = { apikey: SB_KEY_T, Authorization: 'Bearer ' + SB_KEY_T, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' };
        fetch(SB_URL_T + '/rest/v1/landing_visits', {
          method: 'POST', headers: sbH,
          body: JSON.stringify({ ref: trackRef, ip: clientIP, type: trackType, day: today, created_at: new Date().toISOString() })
        }).then(function(){ console.log('[Track] +1', trackType, trackRef, clientIP.slice(0,8)); }).catch(function(e){ console.warn('[Track] SB error:', e.message); });
      }
      // Also write to GitHub in background (legacy, best-effort)
      if (TOKEN()) {
        (async function() {
          for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
            try {
              const { data, sha } = await readGHFile(FILE_STATS, true);
              if (!data[trackRef]) data[trackRef] = { total: 0, ips: {}, conversions: 0, days: {}, days_ips: {}, days_conversions: {}, days_conversions_ips: {}, conversions_ips: {} };
              const s = data[trackRef];
              if (trackType === 'conversion') {
                if (!s.conversions_ips) s.conversions_ips = {};
                if (!s.conversions_ips[clientIP]) {
                  s.conversions_ips[clientIP] = true;
                  s.conversions = (s.conversions || 0) + 1;
                  if (!s.days_conversions) s.days_conversions = {};
                  s.days_conversions[today] = (s.days_conversions[today] || 0) + 1;
                }
              } else {
                s.total = (s.total || 0) + 1;
                if (!s.ips) s.ips = {};
                s.ips[clientIP] = (s.ips[clientIP] || 0) + 1;
                if (!s.days) s.days = {};
                s.days[today] = (s.days[today] || 0) + 1;
              }
              if (await writeGHFile(FILE_STATS, data, sha, 'track: +1 ' + trackType + ' ' + trackRef)) break;
            } catch(e) {}
          }
        })().catch(function(){});
      }
      return res.status(200).json({ ok: true });
    }

    // ── SYNC PHOTO: silently update foto only if currently empty (never overwrites custom photos) ──
    if (action === 'syncPhoto') {
      const { foto } = req.body;
      if (!ref || !foto) return res.status(400).json({ error: 'Missing ref or foto' });
      if (!TOKEN()) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
      const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        const { data, sha } = await readGHFile(FILE_ASESORES, true); // skipCache=true for fresh SHA
        const existing = data[slug] || {};
        if (existing.foto) return res.status(200).json({ ok: true, skipped: true });
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
      const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');
      const asesorData = {
        nombre: (nombre || 'Socio').trim(),
        rol: (rol || 'Asesor InnovaIA').trim(),
        whatsapp: (whatsapp || '').trim(),
        foto: foto !== undefined ? foto : '',
        verificado: true,
        mensaje: (mensaje || 'Te ayudo a activar tu franquicia digital y generar ingresos reales desde el primer mes').trim()
      };

      // 1. Save to Supabase FIRST (instant, no concurrency issues)
      const SB_URL = process.env.SUPABASE_URL;
      const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
      if (SB_URL && SB_KEY) {
        try {
          const sbHeaders = { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Prefer: 'resolution=merge-duplicates,return=minimal' };
          // Store profile including photo reference in Supabase
          const sbFoto = (foto && foto.startsWith('data:') && foto.length < 500000) ? foto : (foto && !foto.startsWith('data:') ? foto : '');
          const sbData = { ref: slug, nombre: asesorData.nombre, rol: asesorData.rol, whatsapp: asesorData.whatsapp, mensaje: asesorData.mensaje, foto: sbFoto, verificado: true, updated_at: new Date().toISOString() };
          await fetch(SB_URL + '/rest/v1/landing_profiles', { method: 'POST', headers: sbHeaders, body: JSON.stringify(sbData) });
        } catch(e) { console.warn('[Landing] Supabase save failed (table may not exist):', e.message); }
      }

      // 2. Sync to GitHub in background (best-effort, may fail under concurrency)
      if (TOKEN()) {
        // Fire and forget — don't block the response
        (async function() {
          for (let attempt = 0; attempt < 5; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
            try {
              const { data, sha } = await readGHFile(FILE_ASESORES, true); // skipCache for fresh SHA
              data[slug] = asesorData;
              if (await writeGHFile(FILE_ASESORES, data, sha, 'skyteam: update ' + slug)) {
                // Invalidate read cache after successful write
                if (GH_READ_CACHE[FILE_ASESORES]) GH_READ_CACHE[FILE_ASESORES].ts = 0;
                break;
              }
            } catch(e) { console.warn('[Landing] GH write attempt', attempt, 'failed:', e.message); }
          }
          // Sync to old file too
          for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
            try {
              const { data, sha } = await readGHFile('asesores.json', true); // skipCache
              const existing = data[slug] || {};
              const newFoto = foto && !foto.startsWith('data:') ? foto : (existing.foto || '');
              data[slug] = Object.assign({}, asesorData, { foto: newFoto });
              if (await writeGHFile('asesores.json', data, sha, 'skyteam: sync ' + slug)) break;
            } catch(e) {}
          }
        })().catch(function(){});
      }

      // Return success immediately (Supabase saved, GitHub syncing in background)
      return res.status(200).json({ ok: true, slug, link: 'https://skyteam.global/landing?ref=' + slug });
    }

    // ── GET STATS: read visit stats ──
    if (action === 'getStats') {
      const { data } = await readGHFile(FILE_STATS);
      return res.status(200).json({ ok: true, stats: data });
    }

    // ── GET RANKING: merge both asesor files + stats, filter by period ──
    // Uses cached GitHub reads (60s TTL) — 3 files read in parallel
    if (action === 'getRanking') {
      const { period } = req.body || {};
      const SB_URL2 = process.env.SUPABASE_URL;
      const SB_KEY2 = process.env.SUPABASE_SERVICE_KEY;
      const { data: skyAsesores } = await readGHFile(FILE_ASESORES);
      // Read visit data from Supabase with pagination (1000 rows per page)
      let stats = {};
      if (SB_URL2 && SB_KEY2) {
        try {
          var allVisits = [];
          var page = 0;
          var pageSize = 1000;
          var hasMore = true;
          var baseUrl = SB_URL2 + '/rest/v1/landing_visits?select=ref,ip,type';
          if (dateFrom) baseUrl += '&day=gte.' + dateFrom;
          baseUrl += '&order=id.asc';
          while (hasMore && page < 20) {
            var from = page * pageSize;
            var to = from + pageSize - 1;
            var r = await fetch(baseUrl, {
              headers: { apikey: SB_KEY2, Authorization: 'Bearer ' + SB_KEY2, 'Range': from + '-' + to, 'Prefer': 'count=exact' }
            });
            var rows = await r.json();
            console.log('[Ranking] Page', page, 'status:', r.status, 'rows:', Array.isArray(rows) ? rows.length : 'NOT_ARRAY', typeof rows === 'object' && !Array.isArray(rows) ? JSON.stringify(rows).substring(0,200) : '');
            if (Array.isArray(rows) && rows.length > 0) {
              allVisits = allVisits.concat(rows);
              hasMore = rows.length === pageSize;
              page++;
            } else { hasMore = false; }
          }
          // Aggregate in JS (now with ALL rows)
          allVisits.forEach(function(v) {
            if (!v.ref) return;
            if (!stats[v.ref]) stats[v.ref] = { total: 0, ips: {}, conversions: 0, convIps: {} };
            var s = stats[v.ref];
            if (v.type === 'conversion') {
              s.conversions++;
              s.convIps[v.ip] = true;
            } else {
              s.total++;
              s.ips[v.ip] = true;
            }
          });
          // Convert to final format
          Object.keys(stats).forEach(function(ref) {
            var s = stats[ref];
            var uIps = Object.keys(s.ips).length;
            stats[ref] = {
              total: s.total,
              uniqueIps: uIps,
              duplicadas: Math.max(0, s.total - uIps),
              conversions: s.conversions,
              conversionIps: Object.keys(s.convIps).length
            };
          });
          console.log('[Ranking] Loaded', allVisits.length, 'visits,', Object.keys(stats).length, 'refs');
        } catch(e) { console.warn('[Ranking] SB visits failed:', e.message); }
      }
      // Overlay Supabase landing_profiles onto skyAsesores (fresher names/data)
      if (SB_URL2 && SB_KEY2) {
        try {
          const sbR2 = await fetch(SB_URL2 + '/rest/v1/landing_profiles?select=ref,nombre,rol,whatsapp,foto', { headers: { apikey: SB_KEY2, Authorization: 'Bearer ' + SB_KEY2 } });
          const sbRows2 = await sbR2.json();
          if (Array.isArray(sbRows2)) sbRows2.forEach(function(row) {
            if (row.ref && row.nombre) {
              var ex = skyAsesores[row.ref] || {};
              skyAsesores[row.ref] = Object.assign(ex, { nombre: row.nombre, rol: row.rol || ex.rol, whatsapp: row.whatsapp || ex.whatsapp, foto: row.foto || ex.foto });
            }
          });
        } catch(e) {}
      }
      // Only count landings created from skyteam.global (asesores-skyteam.json)
      const allAsesores = skyAsesores;
      // Overlay registered user names (users table) so ranking always shows real names
      if (SB_URL2 && SB_KEY2) {
        try {
          const usersR = await fetch(SB_URL2 + '/rest/v1/users?select=username,name,ref,whatsapp&limit=5000', { headers: { apikey: SB_KEY2, Authorization: 'Bearer ' + SB_KEY2 } });
          const usersData = await usersR.json();
          if (Array.isArray(usersData)) usersData.forEach(function(u) {
            var uRef = (u.ref || u.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (uRef) {
              if (!allAsesores[uRef]) allAsesores[uRef] = {};
              if (u.name && (!allAsesores[uRef].nombre || allAsesores[uRef].nombre === '?' || allAsesores[uRef].nombre === uRef)) {
                allAsesores[uRef].nombre = u.name;
              }
              if (u.whatsapp && !allAsesores[uRef].whatsapp) {
                allAsesores[uRef].whatsapp = u.whatsapp;
              }
              if (u.photo && !allAsesores[uRef].foto) {
                allAsesores[uRef].foto = u.photo;
              }
            }
          });
        } catch(e) {}
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

      // Include ALL refs that have stats OR are in asesores (union of both)
      const allRefs = {};
      Object.keys(allAsesores).forEach(function(r){ if(r!=='default') allRefs[r]=true; });
      Object.keys(stats).forEach(function(r){ allRefs[r]=true; });

      const ranking = Object.keys(allRefs)
        .map(function(ref) {
          const asesor = allAsesores[ref] || {};
          const s = stats[ref] || {};

          // Stats come pre-aggregated from SQL function (filtered by dateFrom)
          const visitas = s.total || 0;
          const uniqueIps = s.uniqueIps || 0;
          const duplicadas = s.duplicadas || 0;
          const conversiones = s.conversionIps || s.conversions || 0;

          // Score = visitas(+1) - duplicadas(-0.5) + conversiones_unicas(+20)
          const validConversions = uniqueIps > 0 ? Math.min(conversiones, uniqueIps) : conversiones;
          const score = Math.max(0, Math.round(visitas - (duplicadas * 0.5) + (validConversions * 20)));
          const efectividad = uniqueIps > 0 ? Math.round((validConversions / uniqueIps) * 100) : 0;
          return {
            ref: ref, nombre: asesor.nombre || ref,
            visitas: visitas, uniqueVisitas: uniqueIps, duplicadas: duplicadas, conversiones: validConversions, score: score, efectividad: efectividad,
            whatsapp: asesor.whatsapp || '', foto: asesor.foto || '',
            newLanding: !!skyAsesores[ref]
          };
        })
        .filter(function(r) { return r.visitas > 0 || r.score > 0; })
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
