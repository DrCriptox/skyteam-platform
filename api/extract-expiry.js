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
              text: 'Analiza esta captura de pantalla del perfil de 8innova.biz/profile.\n\n=== ESTRUCTURA DE LA PAGINA ===\nLa pagina SIEMPRE tiene esta estructura en la zona IZQUIERDA:\n1. Foto circular del usuario (con borde rojo o azul)\n2. Badge con "X dias restantes" (verde o rojo)\n3. NOMBRE COMPLETO en texto GRANDE (ej: "JAVIER Y YAN C. GARCIA" o "GeorgiAlvarez YonferRojas") — ESTO NO ES EL USUARIO\n4. USUARIO en texto MAS PEQUENO justo debajo del nombre (ej: "Teamgarcia", "legend", "angel2026", "david22") — ES UNA SOLA PALABRA, sin espacios, sin mayusculas mixtas del nombre\n5. "KYC Verificado" o "KYC No Verificado"\n6. Boton "Mas Informacion"\n\nEn la zona CENTRAL/DERECHA:\n- "Patrocinador: XXXXX" (este es el SPONSOR)\n- "Colocacion: XXXXX" (IGNORAR COMPLETAMENTE — NO es sponsor)\n- "Clasificacion Actual: NOVA 50K" (o INN 200, NOVA, etc)\n- "Vencimiento: 27 mar 2026, 22:39:23"\n\nMas abajo hay "Detalles Personales" con Nombre y Apellido — NO usar estos campos.\n\n=== REGLAS CRITICAS PARA USUARIO ===\n- El USUARIO es el texto PEQUENO entre el NOMBRE GRANDE y "KYC"\n- El USUARIO es SIEMPRE una sola palabra sin espacios (ej: Teamgarcia, legend, angel2026)\n- El NOMBRE tiene espacios, mayusculas, y puede tener varios nombres/apellidos\n- Si ves "JAVIER Y YAN C. GARCIA" seguido de "Teamgarcia" → usuario = "Teamgarcia"\n- NUNCA confundir el nombre completo con el usuario\n- NUNCA usar Patrocinador ni Colocacion como usuario\n\n=== QUE EXTRAER ===\n1) DIAS RESTANTES: numero del badge "X dias restantes" (puede ser 0)\n2) VENCIMIENTO: fecha despues de "Vencimiento:" → formato YYYY-MM-DD\n3) USUARIO: la palabra corta debajo del nombre, arriba de KYC\n4) CLASIFICACION: texto de "Clasificacion Actual" (NOVA, NOVA 50K, INN 200, No se Alcanzo Rango, etc)\n5) SPONSOR: SOLO el texto de "Patrocinador:". IGNORAR "Colocacion:" completamente\n\n=== RECHAZAR SI ===
- No es pagina de 8innova.biz → { "found": false, "reason": "No es perfil de Innova" }
- Imagen borrosa/cortada → { "found": false, "reason": "Imagen no legible" }
- No se ve "Clasificacion Actual" con un rango (NOVA, INN 200, etc) → { "found": false, "reason": "No se ve la Clasificacion/Rango. Necesitas una captura de la seccion donde dice Clasificacion Actual." }
- Si solo ves "PIONEER Package" o "EXPLORER Package" o cualquier nombre de paquete SIN "Clasificacion Actual", RECHAZA: { "found": false, "reason": "Se ve el paquete pero NO la Clasificacion/Rango. Sube una captura de la seccion Clasificacion Actual." }
- "PIONEER", "EXPLORER", "Package" NO son clasificaciones/rangos. Los rangos validos son: Cliente, INN 200, INN 500, NOVA, NOVA 1500, NOVA 5K, NOVA 10K, NOVA DIAMOND, NOVA 50K, NOVA 100K
- No se ve usuario o sponsor → { "found": false, "reason": "Datos incompletos" }

=== CLASIFICACION: REGLA CRITICA ===
- SOLO acepta como classification los rangos validos: Cliente, INN 200, INN 500, NOVA, NOVA 1500, NOVA 5K, NOVA 10K, NOVA DIAMOND, NOVA 50K, NOVA 100K
- NUNCA poner "PIONEER Package", "EXPLORER Package" ni ningun nombre de paquete como classification
- Si no ves "Clasificacion Actual" en la imagen, pon classification: null

Responde SOLO JSON: { "found": true, "days_remaining": 0, "expiry_date": "2026-03-27", "username": "Teamgarcia", "classification": "NOVA", "sponsor": "ANGEL2026" }'
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

    // Validate 4 required fields — reject if any missing
    if (extracted.found) {
      var missing = [];
      if (!extracted.days_remaining && extracted.days_remaining !== 0 && !extracted.expiry_date) missing.push('Dias restantes o vencimiento');
      if (!extracted.classification) missing.push('Clasificacion/Rango');
      if (!extracted.username) missing.push('Usuario de Innova');
      if (!extracted.sponsor) missing.push('Patrocinador/Sponsor');
      if (missing.length > 0) {
        return res.status(200).json({
          found: false,
          reason: 'La imagen no incluye todos los datos necesarios',
          missing: missing,
          missingList: 'Faltan: ' + missing.join(', '),
          partial: extracted
        });
      }
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
