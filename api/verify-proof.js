// Booking proof verification — EXIF date + GPT-4o-mini vision analysis
// Checks if the uploaded photo matches the booking date/time
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { bookingId, username, imageBase64, attempt } = req.body;
    if (!bookingId || !username || !imageBase64) return res.status(400).json({ error: 'Missing bookingId, username or imageBase64' });

    // Get booking details
    const bkR = await fetch(SUPABASE_URL + '/rest/v1/bookings?id=eq.' + encodeURIComponent(bookingId) + '&select=fecha_iso,nombre,username,status', { headers: SB_HEADERS });
    const bks = await bkR.json();
    if (!Array.isArray(bks) || !bks.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = bks[0];
    if (booking.username !== username) return res.status(403).json({ error: 'Not your booking' });
    if (booking.status === 'sospechosa') return res.status(403).json({ error: 'Booking flagged — cannot verify', reason: 'auto-reserva' });

    const bookingDate = new Date(booking.fecha_iso);
    const bookingHour = bookingDate.getHours();
    const bookingMin = bookingDate.getMinutes();
    const bookingDay = bookingDate.getDate();
    const bookingMonth = bookingDate.getMonth() + 1;
    const bookingYear = bookingDate.getFullYear();

    // ── TIME WINDOW: only allow upload from 30min before to 2h after ──
    const nowMs = Date.now();
    const bookingMs = bookingDate.getTime();
    if (nowMs < bookingMs - 30 * 60000) {
      return res.status(400).json({ error: 'Muy temprano para verificar. Disponible desde 30 min antes de la cita.', tooEarly: true });
    }
    if (nowMs > bookingMs + 2 * 3600000) {
      return res.status(400).json({ error: 'Ventana de verificación cerrada (2h después de la cita).', tooLate: true });
    }

    // ── IMAGE HASH: prevent reuse of the same photo ──
    const crypto = require('crypto');
    const imgBuffer = Buffer.from(imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    const imgHash = crypto.createHash('sha256').update(imgBuffer).digest('hex');
    // Check if this hash was already used by ANY user
    try {
      const hashCheck = await fetch(SUPABASE_URL + '/rest/v1/booking_proofs?image_hash=eq.' + imgHash + '&select=id,username,booking_id', { headers: SB_HEADERS });
      const hashRows = await hashCheck.json();
      if (Array.isArray(hashRows) && hashRows.length > 0) {
        var prevUser = hashRows[0].username;
        var prevBooking = hashRows[0].booking_id;
        console.log('[VERIFY] DUPLICATE IMAGE hash=' + imgHash.substring(0, 16) + ' already used by ' + prevUser + ' for booking ' + prevBooking);
        return res.status(400).json({ error: 'Esta foto ya fue usada para verificar otra cita. Sube una foto diferente.', duplicate: true, previousUser: prevUser === username ? 'tuya' : 'otro socio' });
      }
    } catch(e) { console.log('[VERIFY] Hash check error (column may not exist):', e.message); }

    // ── LAYER 1: Try EXIF data ──
    var exifDate = null;
    try {
      // Look for EXIF DateTimeOriginal in base64 JPEG
      var raw = Buffer.from(imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      // Simple EXIF parser — look for DateTimeOriginal tag (0x9003)
      var exifStr = raw.toString('binary');
      var dtIdx = exifStr.indexOf('DateTimeOriginal');
      if (dtIdx === -1) dtIdx = exifStr.indexOf('DateTime');
      if (dtIdx !== -1) {
        // Format: "YYYY:MM:DD HH:MM:SS"
        var chunk = exifStr.substring(dtIdx, dtIdx + 60);
        var match = chunk.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          exifDate = {
            year: parseInt(match[1]), month: parseInt(match[2]), day: parseInt(match[3]),
            hour: parseInt(match[4]), min: parseInt(match[5])
          };
          console.log('[VERIFY] EXIF found:', JSON.stringify(exifDate));
        }
      }
    } catch(e) { console.log('[VERIFY] EXIF parse error:', e.message); }

    // Check EXIF date against booking (±30 min tolerance)
    if (exifDate) {
      var exifTime = new Date(exifDate.year, exifDate.month - 1, exifDate.day, exifDate.hour, exifDate.min);
      var diffMs = Math.abs(exifTime.getTime() - bookingDate.getTime());
      var diffMin = diffMs / 60000;
      if (diffMin <= 30) {
        // EXIF matches! Approve
        await markProof(bookingId, username, 'approved', 'EXIF date matches: ' + JSON.stringify(exifDate), imgHash);
        return res.status(200).json({ ok: true, verified: true, method: 'exif', message: 'Foto verificada por fecha EXIF' });
      } else {
        console.log('[VERIFY] EXIF date mismatch: photo=' + exifTime.toISOString() + ' booking=' + bookingDate.toISOString() + ' diff=' + Math.round(diffMin) + 'min');
        // Don't fail yet — try vision as backup
      }
    }

    // ── LAYER 2: GPT-4o-mini Vision ──
    if (!OPENAI_KEY) {
      // No OpenAI key — accept with reduced points
      await markProof(bookingId, username, 'failed', 'No AI key available', imgHash);
      return res.status(200).json({ ok: true, verified: false, method: 'none', message: 'Verificación IA no disponible. Puntos parciales otorgados.' });
    }

    // Resize image if too large (keep under 500KB for cost)
    var imgForAI = imageBase64;
    if (imgForAI.length > 700000) {
      // Truncate — GPT-4o-mini accepts lower res
      imgForAI = imageBase64.substring(0, 700000);
    }

    var prompt = 'Analyze this image. I need to verify it was taken during a video meeting (Zoom, Google Meet, Teams, or similar) on ' + bookingYear + '-' + String(bookingMonth).padStart(2, '0') + '-' + String(bookingDay).padStart(2, '0') + ' around ' + String(bookingHour).padStart(2, '0') + ':' + String(bookingMin).padStart(2, '0') + '.\n\nCheck:\n1. Does the image show a video call/meeting screen with 2 or more participants?\n2. Is there any visible clock, timestamp, or date on screen?\n3. If you can see a time, does it match approximately (±30 min) the expected time?\n\nRespond in JSON ONLY: {"isVideoCall": true/false, "visibleTime": "HH:MM or null", "visibleDate": "YYYY-MM-DD or null", "timeMatches": true/false/null, "confidence": 0-100, "reason": "brief explanation"}';

    var aiR = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imgForAI.startsWith('data:') ? imgForAI : 'data:image/jpeg;base64,' + imgForAI, detail: 'low' } }
          ]}
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!aiR.ok) {
      var errTxt = await aiR.text();
      console.error('[VERIFY] OpenAI error:', aiR.status, errTxt.substring(0, 200));
      await markProof(bookingId, username, 'failed', 'AI error: ' + aiR.status, imgHash);
      return res.status(200).json({ ok: true, verified: false, method: 'ai_error', message: 'Error en verificación IA. Puntos parciales otorgados.' });
    }

    var aiData = await aiR.json();
    var content = (aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) || '';
    console.log('[VERIFY] AI response:', content.substring(0, 300));

    // Parse JSON from AI response
    var analysis = null;
    try {
      var jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch(e) { console.log('[VERIFY] JSON parse error:', e.message); }

    if (!analysis) {
      await markProof(bookingId, username, 'failed', 'AI response unparseable', imgHash);
      return res.status(200).json({ ok: true, verified: false, method: 'ai_fail', message: 'No se pudo analizar la imagen. Puntos parciales.', attempt: attempt || 1 });
    }

    // Decision logic
    var isValid = false;
    if (analysis.isVideoCall && analysis.confidence >= 60) {
      if (analysis.timeMatches === true) {
        isValid = true; // Video call + time matches
      } else if (analysis.timeMatches === null && analysis.confidence >= 70) {
        isValid = true; // Video call, no visible time but high confidence
      }
    }

    if (isValid) {
      await markProof(bookingId, username, 'approved', 'AI verified: ' + JSON.stringify(analysis), imgHash);
      return res.status(200).json({ ok: true, verified: true, method: 'ai', message: 'Foto verificada por IA', analysis: { isVideoCall: analysis.isVideoCall, confidence: analysis.confidence } });
    } else {
      var currentAttempt = attempt || 1;
      if (currentAttempt >= 3) {
        // 3rd attempt failed — give partial points
        await markProof(bookingId, username, 'failed', 'AI rejected after 3 attempts: ' + JSON.stringify(analysis), imgHash);
        return res.status(200).json({ ok: true, verified: false, method: 'ai_rejected', message: 'La foto no parece una reunión de video del horario de la cita. Se otorgan puntos parciales.', analysis: { isVideoCall: analysis.isVideoCall, confidence: analysis.confidence, reason: analysis.reason } });
      }
      return res.status(200).json({ ok: true, verified: false, method: 'ai_retry', message: analysis.reason || 'La foto no coincide. Intenta de nuevo.', attempt: currentAttempt, maxAttempts: 3, analysis: { isVideoCall: analysis.isVideoCall, confidence: analysis.confidence } });
    }

  } catch(error) {
    console.error('[VERIFY] Error:', error.message);
    return res.status(500).json({ error: 'Verification failed: ' + error.message });
  }
};

async function markProof(bookingId, username, status, notes, imageHash) {
  try {
    // Update booking status
    var newStatus = status === 'approved' ? 'verificada' : 'completada';
    await fetch(SUPABASE_URL + '/rest/v1/bookings?id=eq.' + encodeURIComponent(bookingId), {
      method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: newStatus, proof_url: status, updated_at: new Date().toISOString() })
    });
    // Save to booking_proofs with image hash (prevents reuse)
    var proofData = { username: username, booking_id: bookingId, status: status, notes: (notes || '').substring(0, 500), created_at: new Date().toISOString() };
    if (imageHash) proofData.image_hash = imageHash;
    await fetch(SUPABASE_URL + '/rest/v1/booking_proofs', {
      method: 'POST', headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(proofData)
    });
    console.log('[VERIFY] Proof marked:', bookingId, status);
  } catch(e) { console.error('[VERIFY] markProof error:', e.message); }
}
