// CRM Proof Verification — verify abono/cierre photos with hash + AI
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SB_H = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action } = req.body || req.query || {};

    // ── SAVE + VERIFY proof image ──
    if (req.method === 'POST' && action === 'verify') {
      const { username, prospecto_id, prospecto_nombre, tipo, imageBase64 } = req.body;
      if (!username || !prospecto_id || !imageBase64) return res.status(400).json({ error: 'Missing fields' });

      // 1) Hash to prevent duplicates
      const crypto = require('crypto');
      const imgBuffer = Buffer.from(imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      const imgHash = crypto.createHash('sha256').update(imgBuffer).digest('hex');

      // Check if hash already used
      try {
        const hashR = await fetch(SUPABASE_URL + '/rest/v1/proof_images?image_hash=eq.' + imgHash + '&select=id,username', { headers: SB_H });
        const hashRows = await hashR.json();
        if (Array.isArray(hashRows) && hashRows.length > 0) {
          return res.status(400).json({ error: 'Esta imagen ya fue usada anteriormente. Sube una foto diferente.', duplicate: true });
        }
      } catch(e) {}

      // 2) EXIF date check
      var exifDate = null;
      try {
        var raw = imgBuffer.toString('binary');
        var dtIdx = raw.indexOf('DateTimeOriginal');
        if (dtIdx === -1) dtIdx = raw.indexOf('DateTime');
        if (dtIdx !== -1) {
          var chunk = raw.substring(dtIdx, dtIdx + 60);
          var match = chunk.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})/);
          if (match) exifDate = match[1] + '-' + match[2] + '-' + match[3] + ' ' + match[4] + ':' + match[5];
        }
      } catch(e) {}

      // 3) AI verification
      var aiResult = { verified: false, confidence: 0, reason: 'No AI key' };
      if (OPENAI_KEY) {
        var imgForAI = imageBase64;
        if (!imgForAI.startsWith('data:')) imgForAI = 'data:image/jpeg;base64,' + imgForAI;

        var promptText = tipo === 'cierre'
          ? 'Analyze this image. Does it show a PAYMENT RECEIPT, INVOICE, or TRANSACTION CONFIRMATION? Look for: amount in dollars/currency, transaction date, payment confirmation, receipt number, bank transfer confirmation, or any proof of financial payment. Be GENEROUS — even a chat screenshot showing payment confirmation counts.'
          : 'Analyze this image. Does it show a PARTIAL PAYMENT (abono), DEPOSIT RECEIPT, PAYMENT SCREENSHOT, or BANK TRANSFER? Look for: amount, date, confirmation, chat showing payment discussion, or any evidence of a financial transaction.';

        promptText += '\n\nRespond JSON ONLY: {"isPaymentProof":true/false,"amount":"detected amount or null","date":"detected date or null","confidence":0-100,"reason":"brief"}';

        try {
          var aiR = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              max_tokens: 200,
              temperature: 0.1,
              messages: [{ role: 'user', content: [
                { type: 'text', text: promptText },
                { type: 'image_url', image_url: { url: imgForAI, detail: 'low' } }
              ]}]
            })
          });
          if (aiR.ok) {
            var aiData = await aiR.json();
            var content = (aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) || '';
            try {
              var jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
            } catch(e) {}
          }
        } catch(e) { console.error('[CRM-PROOF] AI error:', e.message); }
      }

      // 4) Save to proof_images table
      var proofStatus = aiResult.isPaymentProof && aiResult.confidence >= 40 ? 'approved' : 'pending_review';
      var proofData = {
        username: username,
        prospecto_id: prospecto_id,
        prospecto_nombre: prospecto_nombre || '',
        tipo: tipo || 'abono',
        image_hash: imgHash,
        image_data: imageBase64.substring(0, 500000), // max ~375KB image
        ai_status: proofStatus,
        ai_confidence: aiResult.confidence || 0,
        ai_reason: (aiResult.reason || '').substring(0, 200),
        ai_amount: aiResult.amount || null,
        exif_date: exifDate,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 86400000).toISOString() // 10 days
      };

      var saveR = await fetch(SUPABASE_URL + '/rest/v1/proof_images', {
        method: 'POST', headers: { ...SB_H, Prefer: 'return=representation' },
        body: JSON.stringify(proofData)
      });
      if (!saveR.ok) {
        var errT = await saveR.text();
        console.error('[CRM-PROOF] Save failed:', saveR.status, errT.substring(0, 200));
        // Table may not exist — return AI result anyway
        return res.status(200).json({ ok: true, verified: proofStatus === 'approved', aiResult: aiResult, saved: false, tableError: true });
      }

      console.log('[CRM-PROOF] Saved proof for', username, 'prospecto:', prospecto_nombre, 'status:', proofStatus, 'confidence:', aiResult.confidence);
      return res.status(200).json({ ok: true, verified: proofStatus === 'approved', aiResult: aiResult, saved: true, hash: imgHash.substring(0, 8) });
    }

    // ── LIST proofs for admin review ──
    if (req.method === 'POST' && action === 'list') {
      const { adminKey } = req.body;
      if (adminKey !== SUPABASE_KEY) return res.status(403).json({ error: 'Unauthorized' });
      var proofs = await fetch(SUPABASE_URL + '/rest/v1/proof_images?select=id,username,prospecto_nombre,tipo,ai_status,ai_confidence,ai_amount,exif_date,created_at,image_hash&order=created_at.desc&limit=50', { headers: SB_H });
      var rows = await proofs.json();
      return res.status(200).json({ ok: true, proofs: rows });
    }

    // ── GET single proof image (admin) ──
    if (req.method === 'POST' && action === 'getImage') {
      const { adminKey, proofId } = req.body;
      if (adminKey !== SUPABASE_KEY) return res.status(403).json({ error: 'Unauthorized' });
      var imgR = await fetch(SUPABASE_URL + '/rest/v1/proof_images?id=eq.' + encodeURIComponent(proofId) + '&select=image_data', { headers: SB_H });
      var imgs = await imgR.json();
      if (Array.isArray(imgs) && imgs.length > 0) return res.status(200).json({ ok: true, image: imgs[0].image_data });
      return res.status(404).json({ error: 'Not found' });
    }

    // ── CLEANUP expired proofs (called by cron) ──
    if (req.method === 'POST' && action === 'cleanup') {
      var now = new Date().toISOString();
      var delR = await fetch(SUPABASE_URL + '/rest/v1/proof_images?expires_at=lt.' + now, { method: 'DELETE', headers: SB_H });
      console.log('[CRM-PROOF] Cleanup: deleted expired proofs, status:', delR.status);
      return res.status(200).json({ ok: true, cleaned: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch(error) {
    console.error('[CRM-PROOF] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
