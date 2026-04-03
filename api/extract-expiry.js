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
              text: 'Analiza esta captura de pantalla del backoffice de Innova (8innova.biz). Extrae estos 4 datos: 1) DÍAS RESTANTES: el número que aparece en el badge/contador "X días restantes" o "Period Countdown" (días). 2) FECHA DE VENCIMIENTO: fecha exacta de expiración si aparece. 3) USUARIO INNOVA: el código/username que aparece debajo del nombre completo del usuario (ej: ANGEL2026, letras y números en mayúsculas, NO es el nombre completo). 4) SPONSOR/PATROCINADOR: el texto en negrita que aparece debajo de la palabra "Patrocinador" o "Sponsor" (ej: LEGEND). Responde ÚNICAMENTE con JSON válido sin texto adicional: { "found": true, "days_remaining": 173, "expiry_date": "YYYY-MM-DD o null", "username": "ANGEL2026 o null", "sponsor": "LEGEND o null" } — Si no encuentras días restantes ni fecha, responde: { "found": false }'
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
    if (extracted.found) {
      // Prefer direct days_remaining from image badge; fallback to computing from expiry_date
      if (extracted.expiry_date) {
        const d = new Date(extracted.expiry_date + 'T12:00:00Z');
        if (!isNaN(d.getTime())) {
          extracted.expiry_ts = d.getTime();
          const parts = extracted.expiry_date.split('-');
          extracted.expiry_label = parts[2] + '/' + parts[1] + '/' + parts[0];
          // Use days from image if present, else compute
          if (typeof extracted.days_remaining !== 'number') {
            extracted.days_remaining = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
          }
        }
      }
      // If we have days_remaining but no expiry_date, synthesize expiry_ts from days
      if (!extracted.expiry_ts && typeof extracted.days_remaining === 'number') {
        const ms = Date.now() + extracted.days_remaining * 86400000;
        extracted.expiry_ts = ms;
        const d2 = new Date(ms);
        extracted.expiry_label = d2.getUTCDate().toString().padStart(2,'0') + '/' +
          (d2.getUTCMonth()+1).toString().padStart(2,'0') + '/' + d2.getUTCFullYear();
      }
      if (!extracted.expiry_ts) extracted.found = false;
    }

    return res.status(200).json(extracted);

  } catch (error) {
    console.error('extract-expiry error:', error.message);
    return res.status(500).json({ error: 'Error procesando imagen' });
  }
}
