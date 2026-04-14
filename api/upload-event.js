// api/upload-event.js — Upload images to Supabase Storage for Sky Events
// Receives base64 image, compresses if needed, uploads to bucket "event-assets"
var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    var b = req.body;
    if (!b || !b.base64) return res.status(400).json({ error: 'base64 required' });

    // Strip data URI prefix if present
    var raw = b.base64;
    if (raw.indexOf(',') > -1) raw = raw.split(',')[1];

    var buf = Buffer.from(raw, 'base64');
    if (buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'File too large (max 5MB)' });

    // Generate path
    var folder = (b.folder || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
    var ext = b.filename ? b.filename.split('.').pop().toLowerCase() : 'jpg';
    if (['jpg','jpeg','png','webp','gif'].indexOf(ext) === -1) ext = 'jpg';
    var fileName, storagePath;
    // Special: MIXLR daily image uses fixed path (overwrites)
    if (b.fixedName) {
      fileName = b.fixedName + '.' + ext;
      storagePath = folder + '/' + fileName;
    } else {
      fileName = Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
      storagePath = folder + '/' + fileName;
    }

    // Detect content type
    var contentType = 'image/jpeg';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';

    // Upload to Supabase Storage
    var uploadUrl = SUPABASE_URL + '/storage/v1/object/event-assets/' + storagePath;
    var r = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: buf
    });

    if (!r.ok) {
      var errText = await r.text().catch(function() { return ''; });
      console.error('[UPLOAD] Supabase Storage error:', r.status, errText.substring(0, 200));
      return res.status(500).json({ error: 'Upload failed: ' + r.status });
    }

    // Build public URL
    var publicUrl = SUPABASE_URL + '/storage/v1/object/public/event-assets/' + storagePath;

    return res.status(200).json({ ok: true, url: publicUrl, path: storagePath });
  } catch(err) {
    console.error('[UPLOAD] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
