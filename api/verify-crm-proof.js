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

        var promptText;
        if (tipo === 'cierre') {
          promptText = 'Analyze this image STRICTLY. It must be a screenshot from the INNOVA backoffice (8innova.biz or similar platform). '
            + 'Valid invoices show MOST of these elements: '
            + '- Invoice number starting with "INV" (e.g. INV046891) '
            + '- "Fecha de Pedido" with a date '
            + '- "Nombre de usuario" with a username '
            + '- "Nombre completo" with full name '
            + '- "Paquete" or "Producto" (INNSTARTER, INNSTRUMENT, INNPULSE, PIONEER, EXPLORER, etc.) '
            + '- "Monto del paquete" or "Precio" with dollar amount ($229, $549, $999, etc.) '
            + '- "Importe total" or "Cantidad pagada" '
            + '- Payment method like "E-wallet" '
            + '- "Cantidad adeudada: $0.00" means fully paid '
            + '- OR a registration flow with "Patrocinador", "Colocacion", "Resumen del pedido", "VP" points '
            + '- The innova logo (blue checkmark/infinity symbol) is a strong indicator '
            + 'If you see the innova interface with financial data, it is valid. '
            + 'REJECT if: casual photo, chat screenshot, handwritten note, or unrelated image.';
        } else if (tipo === 'presentacion') {
          promptText = 'Analyze this image FLEXIBLY. Does it show evidence of a BUSINESS PRESENTATION or PROSPECT INTEREST? Accept ANY of these: '
            + '- A video call screen (Zoom, Google Meet, Teams) with 2+ participants — even blurry or from a phone camera '
            + '- A chat/WhatsApp conversation where someone responds POSITIVELY to a business link (e.g. "I want more info", "I am interested", "I want to activate", "tell me more", "quiero activar", "me interesa", "quiero mas informacion") '
            + '- A screenshot showing a landing page or presentation being shared '
            + '- A photo of a screen showing a video call or presentation in progress '
            + 'Be GENEROUS. If you see a video call with people OR a chat where someone shows interest in a business opportunity, accept it. '
            + 'REJECT ONLY if the image is completely unrelated (food, selfie, random photo).';
        } else {
          promptText = 'Analyze this image FLEXIBLY. Does it show ANY evidence of a payment or money transfer? Accept ANY of these: '
            + '- Bank transfer screenshot or confirmation '
            + '- WhatsApp/chat message confirming payment or showing a transfer receipt '
            + '- Photo of cash/bills on a table or in hand '
            + '- Payment app screenshot (Nequi, Daviplata, PayPal, Zelle, Binance, etc.) '
            + '- Deposit receipt from a bank or agent '
            + '- Any visual evidence that money was exchanged or promised '
            + 'Be GENEROUS. If you see money, an amount, or someone discussing payment, accept it.';
        }
        promptText += '\n\nExtract if visible: invoice number, username, full name, package name, amount paid. '
          + 'Respond JSON ONLY: {"isPaymentProof":true/false,"invoiceNumber":"INVxxxxx or null","username":"detected or null","fullName":"detected or null","package":"detected or null","amount":"$xxx or null","date":"detected date or null","confidence":0-100,"reason":"brief"}';

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
      // Cierre: strict (official invoice), Abono: flexible (any payment), Presentacion: very flexible (zoom/chat)
      var minConfidence = tipo === 'cierre' ? 60 : tipo === 'presentacion' ? 30 : 35;
      var proofStatus = aiResult.isPaymentProof && aiResult.confidence >= minConfidence ? 'approved' : 'pending_review';
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
        ai_invoice: aiResult.invoiceNumber || null,
        ai_detected_user: aiResult.username || null,
        ai_detected_name: aiResult.fullName || null,
        ai_package: aiResult.package || null,
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

    // ── ADMIN ACTION: approve or reject a proof ──
    if (req.method === 'POST' && action === 'adminAction') {
      const { adminUser, proofId, newStatus } = req.body;
      if (!adminUser || !proofId || !newStatus) return res.status(400).json({ error: 'Missing fields' });
      // Verify admin
      try {
        var adCheck = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(adminUser) + '&select=is_admin', { headers: SB_H });
        var adRows = await adCheck.json();
        if (!Array.isArray(adRows) || !adRows.length || !adRows[0].is_admin) return res.status(403).json({ error: 'Not admin' });
      } catch(e) { return res.status(403).json({ error: 'Auth failed' }); }
      // Update proof status
      var upR = await fetch(SUPABASE_URL + '/rest/v1/proof_images?id=eq.' + proofId, {
        method: 'PATCH', headers: { ...SB_H, Prefer: 'return=minimal' },
        body: JSON.stringify({ ai_status: newStatus, ai_reason: 'Admin ' + (newStatus === 'approved' ? 'aprobado' : 'rechazado') + ' por ' + adminUser })
      });
      if (!upR.ok) return res.status(500).json({ error: 'Update failed' });
      console.log('[CRM-PROOF] Admin', adminUser, newStatus, 'proof', proofId);
      return res.status(200).json({ ok: true });
    }

    // ── LIST proofs for admin review ──
    if (req.method === 'POST' && action === 'list') {
      // Admin check: verify user is admin
      const { adminUser } = req.body;
      if (adminUser) {
        try {
          var uCheck = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(adminUser) + '&select=is_admin', { headers: SB_H });
          var uRows = await uCheck.json();
          if (!Array.isArray(uRows) || !uRows.length || !uRows[0].is_admin) return res.status(403).json({ error: 'Not admin' });
        } catch(e) { return res.status(403).json({ error: 'Auth failed' }); }
      } else { return res.status(403).json({ error: 'Unauthorized' }); }
      var proofs = await fetch(SUPABASE_URL + '/rest/v1/proof_images?select=id,username,prospecto_nombre,tipo,ai_status,ai_confidence,ai_amount,ai_invoice,ai_detected_user,ai_detected_name,ai_package,ai_reason,exif_date,created_at,image_hash&order=created_at.desc&limit=50', { headers: SB_H });
      var rows = await proofs.json();
      return res.status(200).json({ ok: true, proofs: rows });
    }

    // ── GET single proof image (admin) ──
    if (req.method === 'POST' && action === 'getImage') {
      const { adminUser, proofId } = req.body;
      if (adminUser) {
        try {
          var uCheck2 = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(adminUser) + '&select=is_admin', { headers: SB_H });
          var uRows2 = await uCheck2.json();
          if (!Array.isArray(uRows2) || !uRows2.length || !uRows2[0].is_admin) return res.status(403).json({ error: 'Not admin' });
        } catch(e) { return res.status(403).json({ error: 'Auth failed' }); }
      } else { return res.status(403).json({ error: 'Unauthorized' }); }
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
