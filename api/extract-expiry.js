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

    const OPENAI_KEY = process.env.OPENAT_API_KEY || process.env.OPENAI_API_KEY || '';
    if (!OPENAI_KEY) return res.status(500).json({ error: 'API key no configurada' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: 'data:' + (mimeType || 'image/jpeg') + ';base64,' + imageBase64 }
            },
            {
              type: 'text',
              text: 'Analiza esta captura de pantalla del perfil de Innova (8innova.biz/profile). Extrae EXACTAMENTE estos 5 datos:\n\n1) DÍAS RESTANTES: el número en el badge verde/rojo que dice "X días restantes" (ej: "23 dias restantes" → 23).\n\n2) FECHA DE VENCIMIENTO: fecha junto a "Vencimiento" (ej: "27 abr 2026" → "2026-04-27").\n\n3) USUARIO INNOVA: MUY IMPORTANTE — el username/código corto. En COMPUTADOR: aparece en la PARTE IZQUIERDA de la pantalla, debajo de la foto de perfil y debajo del nombre completo de la persona, justo ARRIBA de "KYC Verificado". Es una palabra corta en minúsculas (ej: "legend", "david22", "nodoraiz"). En CELULAR: aparece debajo de la foto de perfil. REGLAS: 1) NUNCA es el nombre+apellido de la persona. 2) NUNCA viene de "Detalles Personales" (Nombre/Apellido). 3) Es UN SOLO texto corto, generalmente en minúsculas. 4) Si ves "GeorgiAlvarez YonferRojas" como nombre y debajo dice "legend", el usuario es "legend", NO "GeorgiAlvarez". 5) Patrocinador y Colocación son OTROS campos a la derecha — NO son el usuario.\n\n4) CLASIFICACIÓN ACTUAL: el texto junto a "Clasificación Actual" (ej: "NOVA 50K", "NOVA DIAMOND", "INN 200"). Si dice "No se Alcanzó Rango" pon exactamente eso.\n\n5) SPONSOR/PATROCINADOR: el texto junto a "Patrocinador" o "Colocación" (ej: "LEGEND", "NODORAIZ", "ROCKYBALBOA").\n\nVALIDACIONES:\n- Si NO encuentras al menos 3 de estos 5 datos, responde: { "found": false, "reason": "descripción del problema" }\n- Si la imagen NO es de 8innova.biz/profile, responde: { "found": false, "reason": "La imagen no corresponde al perfil de Innova" }\n- Si la imagen está borrosa o cortada, responde: { "found": false, "reason": "Imagen no legible" }\n\nResponde ÚNICAMENTE con JSON válido: { "found": true, "days_remaining": 23, "expiry_date": "2026-04-27", "username": "legend", "classification": "NOVA 50K", "sponsor": "NODORAIZ" }'
            }
          ]
        }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error('OpenAI API error: ' + r.status + ' ' + errText.substring(0, 200));
    }

    const gptData = await r.json();
    const rawText = (gptData.choices?.[0]?.message?.content || '').trim();

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
