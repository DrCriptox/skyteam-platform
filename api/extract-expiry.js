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
              text: 'Analiza esta captura de pantalla de 8innova.biz/profile. La imagen puede ser HORIZONTAL (computador) o VERTICAL (celular).\n\n=== FORMATO COMPUTADOR (horizontal) ===\nLa pagina se divide en:\n- IZQUIERDA: foto circular, debajo badge verde/rojo "X dias restantes", debajo el NOMBRE COMPLETO en grande (ej: GeorgiAlvarez YonferRojas), debajo en letra pequeña el USUARIO (ej: legend), debajo "KYC Verificado"\n- CENTRO: "Patrocinador: NODORAIZ" y "Colocacion: ROCKYBALBOA" (IGNORA Colocacion)\n- DERECHA ARRIBA: "Clasificacion Actual: NOVA 50K"\n- DERECHA: "Vencimiento: 27 abr 2026"\n- ABAJO: "Detalles Personales" con Nombre y Apellido (NO usar estos como usuario)\n\n=== FORMATO CELULAR (vertical) ===\nTodo esta en UNA columna:\n- Foto circular arriba, badge "X dias restantes"\n- Nombre completo\n- USUARIO debajo del nombre (texto corto, ej: ANGEL2026)\n- Clasificacion Actual con el rango\n- Patrocinador con un nombre\n\n=== QUE EXTRAER ===\n1) DIAS RESTANTES: numero del badge "X dias restantes"\n2) VENCIMIENTO: fecha → formato YYYY-MM-DD\n3) USUARIO: texto corto debajo del nombre, arriba de KYC. NUNCA es el nombre completo. NUNCA es Patrocinador. NUNCA es Colocacion. NUNCA viene de Detalles Personales.\n4) CLASIFICACION: texto de "Clasificacion Actual" (NOVA 50K, NOVA DIAMOND, INN 200, No se Alcanzo Rango)\n5) SPONSOR: texto de "Patrocinador" SOLAMENTE. IGNORA "Colocacion" completamente.\n\n=== RECHAZAR SI ===\n- No es pagina de 8innova.biz → { "found": false, "reason": "No es perfil de Innova" }\n- Imagen borrosa/cortada → { "found": false, "reason": "Imagen no legible" }\n- Faltan usuario + clasificacion + patrocinador → { "found": false, "reason": "Datos incompletos. Se necesitan: dias, usuario, clasificacion y patrocinador" }\n- Imagen parece editada/IA (fuentes inconsistentes, bordes artificiales, sombras falsas) → { "found": false, "reason": "Imagen posiblemente editada" }\n\nResponde SOLO JSON valido: { "found": true, "days_remaining": 23, "expiry_date": "2026-04-27", "username": "legend", "classification": "NOVA 50K", "sponsor": "NODORAIZ" }'
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
