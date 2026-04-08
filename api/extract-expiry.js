// OCR Vision API — extract expiry date from backoffice screenshot
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 requerido' });

    const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
    if (!OPENAI_KEY) return res.status(500).json({ error: 'API key no configurada' });

    const prompt = `Analiza esta captura de 8innova.biz/profile. Hay 3 formatos posibles.

FORMATO 1 (celular, perfil completo vertical):
- Badge "67 dias restantes" junto a la foto → DATO 1
- Debajo del nombre grande, texto pequeno "angel2026" → DATO 2 (USUARIO)
- "Clasificacion Actual: NOVA DIAMOND" → DATO 3 (RANGO)
- "Patrocinador: LEGEND" → DATO 4 (SPONSOR)

FORMATO 2 (PC, horizontal con tabs):
- Badge "20 dias restantes" junto a la foto → DATO 1
- Debajo del nombre, texto pequeno "francis17" → DATO 2
- "Clasificacion Actual: No se Alcanzo Rango" → DATO 3
- "Patrocinador: LEGEND" → DATO 4

FORMATO 3 (celular, menu desplegable abierto arriba-derecha):
- Arriba a la derecha hay un menu desplegable con el USUARIO en negrita (ej: "BILLONARIO7") → DATO 2
- NO hay badge de dias, pero si "Vencimiento: 9 jun 2026, 18:17:43" → calcular dias desde hoy para DATO 1
- "Clasificacion Actual: INN 500" → DATO 3
- "Patrocinador: BILLONARIA76" → DATO 4
- IGNORAR: "Colocacion" y "Paquete" (NO son datos relevantes)

REGLAS:
- USUARIO: palabra corta SIN ESPACIOS. Puede estar debajo del nombre O en el menu desplegable arriba-derecha. NUNCA es el nombre completo, ni Patrocinador, ni Colocacion.
- RANGO: SOLO de "Clasificacion Actual:". Validos: Cliente, INN 200, INN 500, NOVA, NOVA 1500, NOVA 5K, NOVA 10K, NOVA DIAMOND, NOVA 50K, NOVA 100K, No se Alcanzo Rango. IGNORAR "Paquete:" (INNPULSE, PIONEER, EXPLORER NO son rangos).
- SPONSOR: SOLO de "Patrocinador:". IGNORAR "Colocacion:" siempre.
- DIAS: del badge O calcular desde "Vencimiento:" hasta hoy ${new Date().toISOString().slice(0,10)}.

RECHAZAR (found=false) si falta cualquiera de los 4 datos o no es 8innova.biz.

JSON:
OK: {"found":true,"days_remaining":62,"expiry_date":"2026-06-09","username":"Billonario7","classification":"INN 500","sponsor":"BILLONARIA76"}
FALTA: {"found":false,"reason":"No se ve X","visible":{"days_remaining":false,"username":"Billonario7","classification":false,"sponsor":false}}`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'data:' + (mimeType || 'image/jpeg') + ';base64,' + imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[OCR] API error:', r.status, errText.substring(0, 200));
      // Return user-friendly error instead of crashing
      return res.status(200).json({ found: false, apiError: true, reason: 'Sky IA no est\u00e1 disponible en este momento. Intenta de nuevo en unos minutos.' });
    }

    const gptData = await r.json();
    const rawText = (gptData.choices?.[0]?.message?.content || '').trim();

    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      extracted = { found: false };
    }

    // Validate 4 required fields
    if (extracted.found) {
      var missing = [];
      if (!extracted.days_remaining && extracted.days_remaining !== 0 && !extracted.expiry_date) missing.push('Dias restantes');
      if (!extracted.classification) missing.push('Clasificacion/Rango');
      if (!extracted.username) missing.push('Usuario de Innova');
      if (!extracted.sponsor) missing.push('Patrocinador/Sponsor');
      if (missing.length > 0) {
        return res.status(200).json({ found: false, reason: 'Datos incompletos', missing: missing, missingList: 'Faltan: ' + missing.join(', '), partial: extracted });
      }
    }

    // Calculate timestamps
    if (extracted.found) {
      if (extracted.expiry_date) {
        const d = new Date(extracted.expiry_date + 'T12:00:00Z');
        if (!isNaN(d.getTime())) {
          extracted.expiry_ts = d.getTime();
          const parts = extracted.expiry_date.split('-');
          extracted.expiry_label = parts[2] + '/' + parts[1] + '/' + parts[0];
          if (typeof extracted.days_remaining !== 'number') {
            extracted.days_remaining = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
          }
        }
      }
      if (!extracted.expiry_ts && typeof extracted.days_remaining === 'number') {
        const ms = Date.now() + extracted.days_remaining * 86400000;
        extracted.expiry_ts = ms;
        const d2 = new Date(ms);
        extracted.expiry_label = d2.getUTCDate().toString().padStart(2,'0') + '/' + (d2.getUTCMonth()+1).toString().padStart(2,'0') + '/' + d2.getUTCFullYear();
      }
      if (!extracted.expiry_ts) extracted.found = false;
    }

    return res.status(200).json(extracted);
  } catch (error) {
    console.error('extract-expiry error:', error.message);
    return res.status(500).json({ error: 'Error procesando imagen' });
  }
}
