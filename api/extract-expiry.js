// Claude Vision API — extract expiry date from backoffice screenshot
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 requerido' });

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key no configurada' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: 'Analiza esta captura de pantalla de un backoffice o plataforma de membresía. Extrae: 1) La fecha exacta de vencimiento/expiración/caducidad de la membresía o suscripción. 2) El nombre de usuario o correo visible si aparece. Responde ÚNICAMENTE con JSON válido, sin texto adicional: { "expiry_date": "YYYY-MM-DD", "username": "texto o null", "found": true } — Si no encuentras ninguna fecha de vencimiento, responde: { "found": false }'
            }
          ]
        }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error('Claude API error: ' + r.status + ' ' + errText.substring(0, 200));
    }

    const claude = await r.json();
    const rawText = (claude.content?.[0]?.text || '').trim();

    // Parse JSON from Claude's response (handle markdown code blocks)
    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      extracted = { found: false };
    }

    // Calculate timestamps and labels
    if (extracted.found && extracted.expiry_date) {
      const d = new Date(extracted.expiry_date + 'T12:00:00Z');
      if (!isNaN(d.getTime())) {
        extracted.expiry_ts = d.getTime();
        const parts = extracted.expiry_date.split('-');
        extracted.expiry_label = parts[2] + '/' + parts[1] + '/' + parts[0];
        extracted.days_remaining = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
      } else {
        extracted.found = false;
      }
    }

    return res.status(200).json(extracted);

  } catch (error) {
    console.error('extract-expiry error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
