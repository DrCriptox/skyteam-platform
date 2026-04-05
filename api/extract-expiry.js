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
              text: 'Analiza esta captura de pantalla de 8innova.biz/profile.\n\nLA PAGINA TIENE ESTE LAYOUT EN COMPUTADOR:\n- IZQUIERDA: foto de perfil, debajo badge "X dias restantes", debajo nombre completo (ej: "GeorgiAlvarez YonferRojas"), debajo el USUARIO en minusculas (ej: "legend"), debajo "KYC Verificado"\n- CENTRO-DERECHA ARRIBA: Correo, Contraseñas, y al extremo derecho "Clasificacion Actual" con el rango (ej: NOVA 50K)\n- CENTRO: "Patrocinador" con un nombre (ej: NODORAIZ) y "Colocacion" con otro nombre (ej: ROCKYBALBOA)\n- DERECHA: "Paquete" y "Vencimiento" con fecha\n\nEXTRAE EXACTAMENTE:\n\n1) DIAS RESTANTES: numero del badge verde/rojo "X dias restantes"\n\n2) VENCIMIENTO: fecha junto a "Vencimiento" → formato YYYY-MM-DD\n\n3) USUARIO: la palabra corta en minusculas que aparece en la PARTE IZQUIERDA, DEBAJO del nombre completo y ARRIBA de "KYC Verificado". NO es el nombre de la persona. NO es el Patrocinador. NO es la Colocacion. Ejemplo: si dice "GeorgiAlvarez YonferRojas" y debajo "legend", el usuario es "legend".\n\n4) CLASIFICACION: el texto junto a "Clasificacion Actual" en la ESQUINA SUPERIOR DERECHA. Ejemplos: NOVA 50K, NOVA DIAMOND, INN 200, No se Alcanzo Rango.\n\n5) SPONSOR: el texto junto a la palabra "Patrocinador" SOLAMENTE. NO uses "Colocacion" — IGNORA completamente el campo Colocacion. Ejemplo: si dice "Patrocinador: NODORAIZ" y "Colocacion: ROCKYBALBOA", el sponsor es "NODORAIZ", NO "ROCKYBALBOA".\n\nVALIDACIONES:\n- Si NO es una pagina de 8innova.biz → { "found": false, "reason": "No es perfil de Innova" }\n- Si la imagen esta borrosa/cortada → { "found": false, "reason": "Imagen no legible" }\n- Si no encuentras al menos usuario + clasificacion + patrocinador → { "found": false, "reason": "Datos incompletos" }\n- Si la imagen parece editada o generada por IA (textos inconsistentes, fuentes diferentes, bordes artificiales) → { "found": false, "reason": "Imagen posiblemente editada" }\n\nResponde SOLO JSON: { "found": true, "days_remaining": 23, "expiry_date": "2026-04-27", "username": "legend", "classification": "NOVA 50K", "sponsor": "NODORAIZ" }'
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
