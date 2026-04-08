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

    const OPENAI_KEY = process.env.OPENAT_API_KEY || process.env.OPENAI_API_KEY || '';
    if (!OPENAI_KEY) return res.status(500).json({ error: 'API key no configurada' });

    const prompt = `Analiza esta captura de pantalla del perfil de 8innova.biz/profile.
La imagen puede venir en 2 formatos. Ambos tienen los MISMOS 4 datos obligatorios.

=== FORMATO 1: VERTICAL (captura de celular) ===
De arriba a abajo en la pantalla:
- Logo "innova" en la barra superior
- Foto circular del usuario con BADGE de color: "67 dias restantes" ← DATO 1
- NOMBRE COMPLETO grande: "Genesis Zaymara Rivera Ayala"
- Texto pequeno gris debajo del nombre: "angel2026" ← DATO 2 (USUARIO)
- "KYC Verificado"
- Boton "Mas Informacion"
- Correo electronico, Restablecer Contrasena (IGNORAR estos campos)
- "Clasificacion Actual" seguido de "NOVA DIAMOND" ← DATO 3 (RANGO)
- "Patrocinador" seguido de "LEGEND" ← DATO 4 (SPONSOR)
- "Colocacion" (IGNORAR SIEMPRE, NO es el sponsor)

=== FORMATO 2: HORIZONTAL (captura de computadora, puede estar rotada) ===
La pagina se ve en pantalla ancha con tabs arriba (Detalles Personales, Detalles de Contacto, etc):
- Foto circular con BADGE: "20 dias restantes" ← DATO 1
- Nombre: "francis guerrero"
- Texto pequeno debajo: "francis17" ← DATO 2 (USUARIO)
- "KYC No Verificado"
- "Patrocinador" seguido de "LEGEND" ← DATO 4 (SPONSOR)
- "Colocacion" seguido de "CARMENZA26" ← IGNORAR (NO es el sponsor)
- "Paquete" seguido de "SPECIAL INNPULSE" ← IGNORAR (NO es el rango)
- "Clasificacion Actual" seguido de "No se Alcanzo Rango" ← DATO 3 (RANGO)
- "Vencimiento" seguido de "27 abr 2026, 22:58:22" (fecha alternativa si no hay badge)

=== LOS 4 DATOS A EXTRAER ===
1. DIAS RESTANTES: numero en el badge de color pegado a la foto (ej: "67 dias restantes" → 67). Si no hay badge, usar "Vencimiento:" y calcular dias desde hoy.
2. USUARIO: palabra corta SIN ESPACIOS debajo del nombre completo. NUNCA confundir con el nombre (tiene espacios), ni con Patrocinador, ni con Colocacion. Ej: "angel2026", "francis17".
3. RANGO (Clasificacion Actual): SOLO el texto despues de "Clasificacion Actual:". Valores validos: Cliente, INN 200, INN 500, NOVA, NOVA 1500, NOVA 5K, NOVA 10K, NOVA DIAMOND, NOVA 50K, NOVA 100K, No se Alcanzo Rango. IGNORAR "Paquete:" (SPECIAL INNPULSE, PIONEER, EXPLORER NO son rangos).
4. SPONSOR (Patrocinador): SOLO el texto despues de "Patrocinador:". IGNORAR "Colocacion:" SIEMPRE (es otro campo completamente diferente).

=== RECHAZAR (found=false) SI ===
- No es 8innova.biz
- Imagen borrosa o cortada
- Falta CUALQUIERA de los 4 datos
- Solo se ve la foto y nombre pero NO la clasificacion ni patrocinador (foto incompleta)

Responde SOLO JSON:
OK: {"found":true,"days_remaining":67,"expiry_date":"2026-06-14","username":"angel2026","classification":"NOVA DIAMOND","sponsor":"LEGEND"}
FALTA: {"found":false,"reason":"No se ve Clasificacion Actual ni Patrocinador. La captura solo muestra la parte superior del perfil.","visible":{"days_remaining":67,"username":"angel2026","classification":false,"sponsor":false}}`;

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
      throw new Error('OpenAI API error: ' + r.status + ' ' + errText.substring(0, 200));
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
