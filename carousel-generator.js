/**
 * SKYTEAM Content Generator v5 — 3 Modes: Carrusel 3D + Historias + Informativo
 * - Carrusel: 6 slides, 3D Pixar characters, storytelling, 1080x1350
 * - Historias: 5 stories, 3D characters, 1080x1920
 * - Informativo: 6 slides, minimalist white bg, bold typography, trending topics, 1080x1350
 */
(function () {
  'use strict';

  // ── CANVAS SIZES ──
  var CW = 1080, CH = 1350; // Carousel/Info: 4:5 portrait
  var SW = 1080, SH = 1920; // Story: 9:16

  // ── 3D CHARACTER IMAGE PROMPTS (Flux — for Carrusel & Historias) ──
  var CHAR_PROMPTS = {
    portada_money: [
      'A 3D cartoon character of a confident young Latino entrepreneur in a luxury suit sitting on a golden throne made of laptops and smartphones, holographic franchise network diagram floating around him, cash and bitcoin raining, Pixar style, cinematic lighting, dark futuristic office with city skyline, golden volumetric light, photorealistic 3D render, 8k quality, no text no letters no words',
      'A 3D cartoon character of a powerful Latina businesswoman standing on top of a giant glowing digital globe showing connected franchise nodes, arms crossed confidently, multiple passive income streams flowing like golden rivers, Disney Pixar style, epic sunset background with neon city lights, dramatic cinematic lighting, 8k, no text no letters no words',
      'A 3D cartoon of a young ambitious Latino man on a luxury yacht holding a tablet showing franchise dashboard with rising profits, holographic screens floating around showing automated sales, ocean sunset, gold and cyan neon particles, Pixar Disney style, dark cinematic background, 8k quality, no text no letters no words',
      'A 3D cartoon of a determined young Latino breaking free from chains labeled 9-to-5, transforming into a digital entrepreneur with laptop and passive income streams flowing as golden light, Pixar style, dark background with epic golden and cyan light explosion, 8k, no text no letters no words'
    ],
    historia_educativo: [
      'A 3D cartoon character of a frustrated young Latino office worker at a tiny desk surrounded by bills and alarm clocks, exhausted expression, hamster wheel visible in background, Pixar style, depressing grey office lighting contrasted with a glowing door leading to freedom, 8k, no text no letters no words',
      'A 3D cartoon of a young Latina looking at two paths - one dark path leading to a cubicle with chains, another golden glowing path leading to a laptop on a beach with palm trees and automated income dashboard, Pixar Disney style, split lighting dramatic contrast, 8k quality, no text no letters no words',
      'A 3D cartoon character of a smart young Latino mentor showing a holographic pyramid of connected franchise partners, each node generating income, automated digital system flowing, Pixar style, dark tech room with blue and gold holographic displays, futuristic, 8k, no text no letters no words',
      'A 3D cartoon of a young man working from a luxury cafe with ocean view, laptop showing automated franchise system generating sales while he relaxes, notifications of income piling up as floating golden coins, Pixar Disney style, warm cinematic lighting, 8k, no text no letters no words',
      'A 3D cartoon character of a tired employee looking at his tiny paycheck next to a giant screen showing a franchise owner earning 10x more with automated digital systems, shocked expression, Pixar style, dramatic split lighting, contrast metaphor, 8k, no text no letters no words',
      'A 3D cartoon of a young Latino family celebrating financial freedom, parents and kids in a beautiful home, holographic screen showing passive franchise income, Pixar Disney style, warm golden lighting, emotional happy scene, 8k, no text no letters no words'
    ],
    cta_accion: [
      'A 3D cartoon character of a charismatic Latino mentor extending hand toward viewer with a warm confident smile, behind him a massive golden door opening to reveal a digital franchise empire with connected nodes and flowing income, welcoming gesture, Pixar Disney style, dramatic golden volumetric light, 8k quality, no text no letters no words',
      'A 3D cartoon of an excited young Latino entrepreneur jumping in celebration holding a golden key, fireworks of golden coins and digital symbols exploding behind, confetti, victory pose, Pixar style, dark background with colorful neon celebration lights, 8k, no text no letters no words'
    ],
    dato_impactante: [
      'A 3D cartoon of a shocked young Latino with wide eyes looking at a giant glowing screen showing digital franchise revenue numbers going up exponentially, jaw dropped reaction, Pixar Disney style, dark background with spotlight and golden particles, dramatic cinematic lighting, 8k, no text no letters no words',
      'A 3D cartoon character standing next to a massive scale comparing a tiny employee paycheck on one side against a mountain of automated franchise passive income on the other, Pixar style, dramatic lighting, dark elegant background, 8k quality, no text no letters no words'
    ],
    story_vertical: [
      'A 3D cartoon character of a charismatic young Latino entrepreneur looking directly at camera with a knowing confident smile, holding a glowing smartphone showing franchise dashboard, luxury lifestyle background at night with neon city, vertical portrait composition, Pixar Disney style, dramatic rim lighting, 8k, vertical format, no text no letters no words',
      'A 3D cartoon of a young franchise owner sitting in a luxury sports car holding tablet showing automated income notifications, confident successful pose, Pixar style, dark urban night background with neon golden accents, dramatic lighting from below, vertical composition, 8k, no text no letters no words',
      'A 3D cartoon character making a mind-blown gesture with golden light and digital franchise network diagrams exploding from their head, Pixar Disney style, dark background, dramatic neon cyan and gold lighting, vertical portrait, 8k quality, no text no letters no words',
      'A 3D cartoon of a young Latino walking confidently on a path transforming from a grey office carpet to a golden digital highway with franchise nodes lighting up, Pixar style, vertical composition, dramatic sunset sky with futuristic elements, cinematic depth, 8k, no text no letters no words'
    ]
  };

  function getCharPrompt(type) {
    var arr = CHAR_PROMPTS[type] || CHAR_PROMPTS.historia_educativo;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── INFORMATIVO IMAGE PROMPTS (only 1-2 per set, trending/shock) ──
  var INFO_IMG_PROMPTS = [
    'A hyper-realistic photo of a shocked businessman in suit looking at his phone screen showing a massive profit chart, dramatic lighting, corporate office background, photojournalism style, 8k quality, no text no letters no words',
    'A dramatic photorealistic scene of a young Latino entrepreneur working on multiple screens showing automated sales dashboards at night, city skyline through window, moody cinematic lighting, editorial photography style, 8k, no text no letters no words',
    'A photorealistic image of hands holding a smartphone showing a franchise network growing with connected glowing dots across a world map, dark background, dramatic product photography lighting, 8k, no text no letters no words',
    'A dramatic photorealistic scene of a luxury laptop on a beach table with cocktail, screen showing automated income notifications and charts going up, paradise background, travel lifestyle photography, 8k, no text no letters no words',
    'A hyper-realistic photo of a young confident Latino person walking through a modern tech office with holographic data displays, futuristic corporate photography, dramatic blue and gold lighting, editorial style, 8k, no text no letters no words',
    'A photorealistic image of a golden key opening a glowing digital vault revealing stacks of money and connected network nodes, dramatic cinematic lighting, wealth concept photography, 8k, no text no letters no words'
  ];

  function getInfoImgPrompt() {
    return INFO_IMG_PROMPTS[Math.floor(Math.random() * INFO_IMG_PROMPTS.length)];
  }

  // ── VIRAL TOPICS (NICHO: Franquicia digital / Ingresos digitales) ──
  var VIRAL_TOPICS = [
    { cat: '🔥 Dolor del empleado', topics: [
      'Trabajas 8 horas para el sueño de otro — ¿y el tuyo?',
      'Tu jefe gana 10x más que tú usando TU tiempo',
      'Llevas 5 años trabajando y sigues igual — aquí está el por qué',
      'Tu sueldo sube 3% al año pero la inflación sube 8%',
      'Tu alarma suena a las 6am para hacer rico a alguien más',
      'Tienes título, maestría y deudas — el sistema no funciona'
    ]},
    { cat: '💰 Franquicia digital', topics: [
      'Qué es una franquicia digital y por qué factura más que un local',
      'McDonald\'s cobra $2M por franquicia — la digital cuesta 50x menos',
      'Cómo una franquicia digital genera plata mientras duermes',
      'Con $500 puedes tener un negocio que factura $5,000 al mes',
      'El secreto de las franquicias: sistemas que trabajan por ti'
    ]},
    { cat: '🚀 Ingresos con sistemas', topics: [
      'La IA y los sistemas digitales generan dinero 24/7 — ¿tú los usas?',
      'Un sistema digital hace en 1 hora lo que un empleado en 1 semana',
      'De $0 a $3,000 al mes con un sistema digital automatizado',
      'El dinero persigue a quien tiene sistemas — no a quien trabaja más'
    ]},
    { cat: '🧠 Mentalidad de inversor', topics: [
      'Los ricos no trabajan más, trabajan DIFERENTE — esta es la clave',
      'Jeff Bezos invirtió $250K en Google — los que NO invirtieron lloran',
      'Tu dinero en el banco pierde valor cada día — ponlo a trabajar',
      '¿Tienes $500 sin producir? Así los multiplicas con sistemas digitales'
    ]}
  ];

  // ── INFO TRENDING TOPICS (tendencias + conexión con solución) ──
  var INFO_TOPICS = [
    { cat: '🤖 IA + Negocios', topics: [
      'La IA ya puede vender por ti 24/7 — así se conecta con tu negocio',
      'ChatGPT + sistemas de venta = tu equipo de ventas automático',
      'Cómo la IA está reemplazando equipos de marketing completos',
      'La IA genera $15.7 trillones para 2030 — ¿tú ya estás dentro?'
    ]},
    { cat: '📲 Tendencia digital', topics: [
      'WhatsApp Business + IA = la máquina de ventas que nadie usa bien',
      'El 73% de negocios digitales ya usa automatización — ¿y tú?',
      'Meta acaba de lanzar esto y cambia todo para negocios digitales',
      'Instagram ahora prioriza contenido de valor — esto es lo que funciona'
    ]},
    { cat: '💎 Casos reales', topics: [
      'Este sistema vendió $47,000 en un mes sin que nadie tocara un botón',
      'De mesero a $8,000/mes con una franquicia digital — caso real',
      'Una mamá soltera factura $3,500/mes desde su celular — así lo hace',
      'Renunció a su trabajo y en 90 días superó su sueldo con sistemas'
    ]},
    { cat: '⚡ Urgente', topics: [
      'URGENTE: La economía digital crece 3x más rápido que la tradicional',
      'El empleo tradicional está muriendo — estos números lo prueban',
      'Alerta: El 85% de empleos actuales no existirán en 2030',
      'Elon Musk advierte: los que no usen IA quedarán fuera del mercado'
    ]}
  ];

  function getRandomTopics(arr, n) {
    var all = [];
    arr.forEach(function(c) { c.topics.forEach(function(t) { all.push({ cat: c.cat, topic: t }); }); });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = all[i]; all[i] = all[j]; all[j] = tmp; }
    return all.slice(0, n);
  }

  // ── TEXT PROMPTS (ultra-persuasivos + img_desc contextual por slide) ──
  // TODAS las modalidades generan img_desc para que gpt-image-1 cree imágenes ESPECÍFICAS por slide
  var IMG_STYLE_HINT = 'img_desc: describe en INGLÉS una escena FOTOREALISTA cinematográfica que represente el mensaje. Sé MUY específico: describe la persona (edad, expresión, ropa, etnia latina), la acción exacta, el entorno (oficina, playa, penthouse, café), la iluminación (golden hour, neon, dramatic), objetos relevantes (laptop con gráficos, fajos de billetes, celular con notificaciones, reloj de alarma). NO pidas estilo cartoon ni 3D. Piensa en fotografía editorial de revista Forbes o Bloomberg.';

  var CAROUSEL_PROMPT =
    'Eres el MEJOR copywriter de carruseles virales de Latinoamérica. Tu contenido genera 10K+ likes.\n' +
    'NICHO: franquicias digitales, ingresos con sistemas automatizados. Público: personas con $500-$5,000 para invertir que odian su trabajo.\n' +
    'TONO: Provocador, directo. "Te están robando", "Mientras tú chambeas...", "La verdad que nadie te dice".\n' +
    'Genera 6 slides. Títulos: 3-5 palabras BRUTALES. Texto: max 20 palabras.\n' +
    IMG_STYLE_HINT + '\n' +
    'S1(portada):titulo+subtitulo+img_desc(escena impactante de portada). S2(contexto):dolor+dato+img_desc(persona sufriendo el problema). S3-S4(historia):datos reales(McDonald\'s=$2M vs digital=$500)+img_desc(escena que muestre la comparación/transformación). S5(revelacion):verdad clave+img_desc(momento revelación). S6(cta):acción urgente+img_desc(persona exitosa invitando).\n' +
    '{"slides":[{"tipo":"portada","titulo":"..","subtitulo":"..","dato":null,"img_desc":".."},{"tipo":"contexto","titulo":"..","texto":"..","dato":"..","img_desc":".."},{"tipo":"historia","titulo":"..","texto":"..","dato":"..","img_desc":".."},{"tipo":"historia","titulo":"..","texto":"..","dato":"..","img_desc":".."},{"tipo":"revelacion","titulo":"..","texto":"..","dato":"..","img_desc":".."},{"tipo":"cta","titulo":"..","texto":"..","cta_palabra":"QUIERO","img_desc":".."}]}\nSolo JSON.';

  var STORY_PROMPT =
    'Copywriter viral Instagram Stories Latam. NICHO: franquicias digitales, sistemas que generan plata solos.\n' +
    'Genera 5 stories. Títulos: 3-4 palabras que GOLPEEN. Texto: max 15 palabras.\n' +
    IMG_STYLE_HINT + '\n' +
    'S1:gancho brutal+img_desc. S2-3:datos reales+img_desc. S4:solución+img_desc. S5:CTA+img_desc.\n' +
    '{"stories":[{"titulo":"..","texto":"..","emoji":"🔥","img_desc":".."},{"titulo":"..","texto":"..","emoji":"💰","img_desc":".."},{"titulo":"..","texto":"..","emoji":"🚀","img_desc":".."},{"titulo":"..","texto":"..","emoji":"📈","img_desc":".."},{"titulo":"..","texto":"..","emoji":"📩","cta_palabra":"QUIERO","img_desc":".."}]}\nSolo JSON.';

  var INFO_PROMPT =
    'Crea carrusel INFORMATIVO viral Instagram Latam. 6 slides. LIMPIO, BOLD, PROFESIONAL.\n' +
    'NICHO: franquicias digitales, sistemas automatizados, IA para negocios.\n' +
    'Conecta tendencia real (IA, WhatsApp, Meta, automatización) con solución (franquicia digital).\n' +
    'Títulos: 4-6 palabras. Textos: max 20 palabras.\n' +
    IMG_STYLE_HINT + '\n' +
    'S1(hook):titulo_principal+subtitulo+palabra_color+img_desc. S2(dato):shock+img_desc. S3(explicacion)+img_desc. S4(ejemplo)+img_desc. S5(beneficio)+img_desc. S6(cta)+img_desc.\n' +
    '{"slides":[{"tipo":"hook","titulo_principal":"..","subtitulo":"..","palabra_color":"..","img_desc":".."},{"tipo":"dato","titulo":"..","texto":"..","palabra_color":"..","img_desc":".."},{"tipo":"explicacion","titulo":"..","texto":"..","palabra_color":"..","img_desc":".."},{"tipo":"ejemplo","titulo":"..","texto":"..","palabra_color":"..","img_desc":".."},{"tipo":"beneficio","titulo":"..","texto":"..","palabra_color":"..","img_desc":".."},{"tipo":"cta","titulo":"..","cta_texto":"..","cta_palabra":"SISTEMA","img_desc":".."}]}\nSolo JSON.';

  // ── CANVAS HELPERS ──
  function wrapText(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function shadowText(ctx, text, x, y, font, color, align, shadowBlur) {
    ctx.save();
    ctx.font = font; ctx.textAlign = align || 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = shadowBlur || 12;
    ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
    ctx.fillStyle = color || '#fff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawOverlay(ctx, w, h, type) {
    var g;
    if (type === 'heavy-bottom') {
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.15)'); g.addColorStop(0.35, 'rgba(0,0,0,0.35)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    } else if (type === 'heavy-top') {
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.8)'); g.addColorStop(0.4, 'rgba(0,0,0,0.5)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
    } else {
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0.65)');
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  function glassCard(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20;
    roundRect(ctx, x, y, w, h, r || 20); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, r || 20); ctx.stroke();
    ctx.restore();
  }

  function accentBar(ctx, x, y, w, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha || 0.8; ctx.fillStyle = color;
    roundRect(ctx, x, y, w, 4, 2); ctx.fill(); ctx.restore();
  }

  function slideCounter(ctx, num, total, w, accent) {
    var cx = w - 80, cy = 50;
    glassCard(ctx, cx - 10, cy - 14, 70, 32, 16);
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText(num + ' / ' + total, cx + 25, cy + 6);
  }

  function swipeCue(ctx, w, h, accent) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = accent;
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText('›', w - 25, h / 2);
    ctx.globalAlpha = 0.15;
    ctx.fillRect(w - 8, h * 0.3, 3, h * 0.4);
    ctx.restore();
  }

  var ACCENTS = ['#FFD700', '#1CE8FF', '#FF4D6A', '#39FF7E', '#c084fc', '#FF9F43', '#00d4aa'];
  function randomAccent() { return ACCENTS[Math.floor(Math.random() * ACCENTS.length)]; }

  // ══════════════════════════════════════════════════════════
  // ── CAROUSEL RENDERERS (dark bg + 3D characters) ──
  // ══════════════════════════════════════════════════════════

  function renderPortada(ctx, img, slide, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-bottom');
    ctx.fillStyle = accent; ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, 6); ctx.globalAlpha = 1;
    // Badge
    glassCard(ctx, w/2 - 100, 50, 200, 42, 21);
    ctx.font = 'bold 16px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText('🔥 NO TE LO PIERDAS', w/2, 78);
    // Title — HUGE
    var ty = h * 0.52;
    var tLines = wrapText(ctx, slide.titulo.toUpperCase(), w - 80);
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], w/2, ty, 'bold 88px "Arial Black", Arial', '#fff', 'center', 20);
      ty += 100;
    }
    accentBar(ctx, w/2 - 70, ty + 4, 140, accent, 0.9);
    ty += 35;
    // Subtitle — bigger
    if (slide.subtitulo) {
      var sLines = wrapText(ctx, slide.subtitulo, w - 100);
      for (var j = 0; j < sLines.length; j++) {
        shadowText(ctx, sLines[j], w/2, ty, 'bold 36px Arial', 'rgba(255,255,255,0.95)', 'center', 12);
        ty += 46;
      }
    }
    if (slide.dato) { ty = Math.max(ty + 10, h * 0.85); drawDataBox(ctx, '📊 ' + slide.dato, 50, ty, w - 100, accent); }
    shadowText(ctx, 'Desliza  →', w/2, h - 38, 'bold 24px Arial', accent, 'center', 8);
    swipeCue(ctx, w, h, accent);
  }

  function renderHistoria(ctx, img, slide, idx, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'uniform');
    ctx.fillStyle = accent; ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, w, 5); ctx.globalAlpha = 1;
    slideCounter(ctx, idx + 1, total, w, accent);
    // Title — bigger, bolder
    var tLines = wrapText(ctx, slide.titulo.toUpperCase(), w - 120);
    var titleH = tLines.length * 68 + 30;
    glassCard(ctx, 35, 95, w - 70, titleH, 20);
    ctx.fillStyle = accent; ctx.globalAlpha = 0.8;
    roundRect(ctx, 35, 100, 6, titleH - 10, 3); ctx.fill(); ctx.globalAlpha = 1;
    var ty = 138;
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], 70, ty, 'bold 56px "Arial Black", Arial', '#fff', 'left', 12);
      ty += 68;
    }
    ty = 95 + titleH + 20;
    accentBar(ctx, 70, ty, 100, accent, 0.8); ty += 30;
    // Text — bigger
    if (slide.texto) {
      var txLines = wrapText(ctx, slide.texto, w - 140);
      var cardH = txLines.length * 46 + 44;
      glassCard(ctx, 35, ty, w - 70, cardH, 18);
      var txY = ty + 35;
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], 68, txY, 'bold 34px Arial', 'rgba(255,255,255,0.95)', 'left', 8);
        txY += 46;
      }
      ty += cardH + 20;
    }
    if (slide.dato) { ty = Math.max(ty, h * 0.70); drawDataBox(ctx, '📊 ' + slide.dato, 35, ty, w - 70, accent); }
    shadowText(ctx, 'Desliza  →', w/2, h - 32, 'bold 20px Arial', 'rgba(255,255,255,0.45)', 'center', 6);
    swipeCue(ctx, w, h, accent);
  }

  function renderRevelacion(ctx, img, slide, idx, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-top');
    ctx.fillStyle = accent; ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, 6); ctx.globalAlpha = 1;
    slideCounter(ctx, idx + 1, total, w, accent);
    glassCard(ctx, w/2 - 110, 85, 220, 42, 21);
    ctx.font = 'bold 16px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText('⚡ PUNTO CLAVE', w/2, 113);
    var ty = 185;
    var tLines = wrapText(ctx, slide.titulo.toUpperCase(), w - 100);
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], w/2, ty, 'bold 62px "Arial Black", Arial', '#fff', 'center', 16);
      ty += 76;
    }
    accentBar(ctx, w/2 - 60, ty + 4, 120, accent, 0.9); ty += 35;
    if (slide.texto) {
      var txLines = wrapText(ctx, slide.texto, w - 120);
      var cardH = txLines.length * 46 + 44;
      glassCard(ctx, 45, ty, w - 90, cardH, 18);
      var txY = ty + 35;
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], w/2, txY, 'bold 34px Arial', 'rgba(255,255,255,0.95)', 'center', 10);
        txY += 46;
      }
      ty += cardH + 16;
    }
    if (slide.dato) { ty = Math.max(ty, h * 0.70); drawDataBox(ctx, '💡 ' + slide.dato, 45, ty, w - 90, accent); }
    swipeCue(ctx, w, h, accent);
  }

  function renderCTA(ctx, img, slide, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-bottom');
    ctx.fillStyle = accent; ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, 6); ctx.globalAlpha = 1;
    slideCounter(ctx, total, total, w, accent);
    // Title — big and centered
    var ty = h * 0.38;
    var tLines = wrapText(ctx, slide.titulo.toUpperCase(), w - 100);
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], w/2, ty, 'bold 62px "Arial Black", Arial', '#fff', 'center', 16);
      ty += 76;
    }
    accentBar(ctx, w/2 - 60, ty + 4, 120, accent, 0.9); ty += 30;
    // Text — bigger
    if (slide.texto) {
      var txLines = wrapText(ctx, slide.texto, w - 120);
      ty = Math.max(ty, h * 0.56);
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], w/2, ty, 'bold 32px Arial', 'rgba(255,255,255,0.95)', 'center', 10);
        ty += 42;
      }
    }
    // CTA Button — bigger
    var palabra = slide.cta_palabra || 'QUIERO';
    ty = Math.max(ty + 25, h * 0.73);
    var btnW = 700, btnH = 80, btnX = (w - btnW) / 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
    ctx.fillStyle = accent; roundRect(ctx, btnX, ty, btnW, btnH, 40); ctx.fill(); ctx.restore();
    ctx.font = 'bold 30px "Arial Black", Arial'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
    ctx.fillText('💬 Comenta "' + palabra + '"  →', w/2, ty + 52);
    // Sub-CTA
    shadowText(ctx, 'y te cuento cómo lograrlo', w/2, ty + btnH + 32, 'bold 24px Arial', 'rgba(255,255,255,0.6)', 'center', 6);
    ty = ty + btnH + 68;
    glassCard(ctx, w/2 - 220, ty, 440, 44, 22);
    shadowText(ctx, '🔖 Guarda este post para después', w/2, ty + 30, 'bold 18px Arial', 'rgba(255,255,255,0.65)', 'center', 4);
  }

  function drawDataBox(ctx, text, x, y, w, accent) {
    if (!text) return y;
    ctx.save(); ctx.font = 'bold 20px Arial';
    var lines = wrapText(ctx, text, w - 44);
    var h = lines.length * 28 + 28;
    glassCard(ctx, x, y, w, h, 14);
    ctx.fillStyle = accent; ctx.globalAlpha = 0.6;
    roundRect(ctx, x, y + 4, 4, h - 8, 2); ctx.fill(); ctx.globalAlpha = 1;
    var ty = y + 24;
    for (var i = 0; i < lines.length; i++) {
      shadowText(ctx, lines[i], x + 22, ty, 'bold 20px Arial', accent, 'left', 6);
      ty += 28;
    }
    ctx.restore(); return y + h + 14;
  }

  // ── STORY RENDERER ──
  function renderStorySlide(ctx, img, story, idx, total, isLast, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-bottom');
    var barY = 40, barGap = 5, barW = (w - 50 - (total - 1) * barGap) / total;
    for (var b = 0; b < total; b++) {
      ctx.fillStyle = b <= idx ? accent : 'rgba(255,255,255,0.2)';
      ctx.globalAlpha = b <= idx ? 0.9 : 1;
      roundRect(ctx, 25 + b * (barW + barGap), barY, barW, 3, 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = '120px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(story.emoji || '🔥', w/2, h * 0.28);
    var tLines = wrapText(ctx, story.titulo.toUpperCase(), w - 80);
    var ty = h * 0.38;
    for (var t = 0; t < tLines.length; t++) {
      shadowText(ctx, tLines[t], w/2, ty, 'bold 76px "Arial Black", Arial', '#fff', 'center', 18);
      ty += 90;
    }
    accentBar(ctx, w/2 - 60, ty + 6, 120, accent, 0.8); ty += 45;
    if (story.texto) {
      var txLines = wrapText(ctx, story.texto, w - 120);
      var cardH = txLines.length * 50 + 44;
      glassCard(ctx, 35, ty, w - 70, cardH, 20);
      var txY = ty + 38;
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], w/2, txY, 'bold 36px Arial', 'rgba(255,255,255,0.95)', 'center', 10);
        txY += 50;
      }
      ty += cardH + 20;
    }
    if (isLast && story.cta_palabra) {
      ty = Math.max(ty + 20, h * 0.72);
      var bW = 500, bH = 64, bX = (w - bW) / 2;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
      ctx.fillStyle = accent; roundRect(ctx, bX, ty, bW, bH, 32); ctx.fill(); ctx.restore();
      ctx.font = 'bold 24px "Arial Black", Arial'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
      ctx.fillText('📩 Escríbeme "' + story.cta_palabra + '"', w/2, ty + 42);
    }
    if (!isLast) shadowText(ctx, 'Toca para ver más  →', w/2, h - 65, 'bold 18px Arial', 'rgba(255,255,255,0.35)', 'center', 6);
  }

  // ══════════════════════════════════════════════════════════
  // ── INFORMATIVO RENDERERS (white bg, bold text, colored words) ──
  // ══════════════════════════════════════════════════════════

  var INFO_COLORS = ['#E8453C', '#0066FF', '#00A86B', '#8B5CF6', '#F59E0B', '#EC4899'];
  function randomInfoColor() { return INFO_COLORS[Math.floor(Math.random() * INFO_COLORS.length)]; }

  function drawDotPattern(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = '#F5F5F5'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (var y = 20; y < h; y += 28) {
      for (var x = 20; x < w; x += 28) {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function infoCounter(ctx, num, total, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, w - 90, 30, 60, 36, 18); ctx.fill();
    ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(num + '/' + total, w - 60, 54);
    ctx.restore();
  }

  function drawBoldTextWithColor(ctx, text, colorWord, x, y, maxW, fontSize, accentColor) {
    // Renders text with one word highlighted in color
    ctx.save();
    ctx.font = 'bold ' + fontSize + 'px "Arial Black", Arial';
    ctx.textAlign = 'center';
    if (!colorWord || text.indexOf(colorWord) === -1) {
      // No color word, render all black
      var lines = wrapText(ctx, text, maxW);
      for (var i = 0; i < lines.length; i++) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(lines[i], x, y + i * (fontSize * 1.3));
      }
      ctx.restore();
      return y + lines.length * (fontSize * 1.3);
    }
    // Split into lines first, then color the word
    var lines = wrapText(ctx, text, maxW);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var ly = y + i * (fontSize * 1.3);
      // Check if color word is in this line
      var cwIdx = line.toLowerCase().indexOf(colorWord.toLowerCase());
      if (cwIdx !== -1) {
        // Measure parts
        var before = line.substring(0, cwIdx);
        var colored = line.substring(cwIdx, cwIdx + colorWord.length);
        var after = line.substring(cwIdx + colorWord.length);
        // Calculate starting x for centered text
        var totalW = ctx.measureText(line).width;
        var startX = x - totalW / 2;
        ctx.textAlign = 'left';
        // Draw before
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(before, startX, ly);
        // Draw colored
        var bw = ctx.measureText(before).width;
        ctx.fillStyle = accentColor;
        ctx.fillText(colored, startX + bw, ly);
        // Draw after
        var cw = ctx.measureText(colored).width;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(after, startX + bw + cw, ly);
        ctx.textAlign = 'center';
      } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(line, x, ly);
      }
    }
    ctx.restore();
    return y + lines.length * (fontSize * 1.3);
  }

  // INFO SLIDE: Hook (slide 1) — with image
  function renderInfoHook(ctx, img, slide, total, w, h, accentColor) {
    // If we have an AI image, draw it in bottom half
    if (img && img.width) {
      drawDotPattern(ctx, w, h * 0.35);
      // Image area — bottom portion
      ctx.drawImage(img, 0, h * 0.35, w, h * 0.65);
      // Dark overlay on image
      var g = ctx.createLinearGradient(0, h * 0.35, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.35, w, h * 0.65);
    } else {
      drawDotPattern(ctx, w, h);
    }
    infoCounter(ctx, 1, total, w);
    // Badge
    ctx.save();
    ctx.fillStyle = accentColor;
    roundRect(ctx, w/2 - 70, 85, 140, 36, 18); ctx.fill();
    ctx.font = 'bold 15px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('⚡ TENDENCIA', w/2, 109);
    ctx.restore();
    // Title — BIGGER
    var titleY = img && img.width ? 170 : 260;
    var endY = drawBoldTextWithColor(ctx, slide.titulo_principal || slide.titulo || '', slide.palabra_color || '', w/2, titleY, w - 100, 66, accentColor);
    // Subtitle — bigger
    if (slide.subtitulo) {
      ctx.font = 'bold 34px Arial'; ctx.fillStyle = img && img.width ? '#fff' : '#444'; ctx.textAlign = 'center';
      var subLines = wrapText(ctx, slide.subtitulo, w - 120);
      for (var i = 0; i < subLines.length; i++) {
        ctx.fillText(subLines[i], w/2, endY + 35 + i * 44);
      }
    }
    // Bottom accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, h - 6, w, 6);
    // Deslizá
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = img && img.width ? '#fff' : '#999';
    ctx.fillText('Deslizá  →', w/2, h - 30);
  }

  // INFO SLIDE: Content (dato, explicacion, ejemplo, beneficio) — with image
  function renderInfoContent(ctx, img, slide, idx, total, w, h, accentColor) {
    // Top half: white dot pattern + text
    var splitY = h * 0.48;
    drawDotPattern(ctx, w, h);
    infoCounter(ctx, idx + 1, total, w);
    // Type badge
    var badges = { dato: '📊 DATO', explicacion: '🔍 CÓMO FUNCIONA', ejemplo: '💡 EJEMPLO REAL', beneficio: '🎯 BENEFICIO' };
    var badge = badges[slide.tipo] || '📌 INFO';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    roundRect(ctx, w/2 - 100, 80, 200, 36, 18); ctx.fill();
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    ctx.fillText(badge, w/2, 104);
    ctx.restore();
    // Title — BIGGER
    var ty = drawBoldTextWithColor(ctx, slide.titulo || '', slide.palabra_color || '', w/2, 170, w - 100, 56, accentColor);
    // Accent bar
    ctx.fillStyle = accentColor; ctx.globalAlpha = 0.8;
    roundRect(ctx, w/2 - 50, ty + 12, 100, 5, 3); ctx.fill(); ctx.globalAlpha = 1;
    // Text body — bigger, bolder
    if (slide.texto) {
      ctx.font = 'bold 32px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#333';
      var txLines = wrapText(ctx, slide.texto, w - 120);
      var txY = ty + 55;
      for (var i = 0; i < txLines.length; i++) {
        ctx.fillText(txLines[i], w/2, txY + i * 46);
      }
    }
    // Bottom half: image with rounded corners
    if (img && img.width) {
      var imgMargin = 50;
      var imgW = w - imgMargin * 2;
      var imgH = h - splitY - 80;
      var imgY = splitY + 10;
      ctx.save();
      roundRect(ctx, imgMargin, imgY, imgW, imgH, 20);
      ctx.clip();
      // Cover fit
      var scale = Math.max(imgW / img.width, imgH / img.height);
      var sx = (img.width - imgW / scale) / 2;
      var sy = (img.height - imgH / scale) / 2;
      ctx.drawImage(img, sx, sy, imgW / scale, imgH / scale, imgMargin, imgY, imgW, imgH);
      // Subtle overlay at bottom for readability
      var g = ctx.createLinearGradient(0, imgY + imgH - 80, 0, imgY + imgH);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = g; ctx.fillRect(imgMargin, imgY, imgW, imgH);
      ctx.restore();
      // Border around image
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
      roundRect(ctx, imgMargin, imgY, imgW, imgH, 20); ctx.stroke(); ctx.restore();
    }
    // Bottom accent
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, h - 6, w, 6);
    ctx.font = 'bold 18px Arial'; ctx.fillStyle = '#bbb'; ctx.textAlign = 'center';
    ctx.fillText('Deslizá  →', w/2, h - 30);
  }

  // INFO SLIDE: CTA (slide 6) — with image
  function renderInfoCTA(ctx, img, slide, total, w, h, accentColor) {
    drawDotPattern(ctx, w, h);
    infoCounter(ctx, total, total, w);
    // Big CTA word
    var palabra = slide.cta_palabra || 'SISTEMA';
    ctx.save();
    ctx.font = 'bold 88px "Arial Black", Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = accentColor;
    var ctaWord = 'Comenta ' + palabra;
    var cwLines = wrapText(ctx, ctaWord, w - 60);
    for (var c = 0; c < cwLines.length; c++) {
      ctx.fillText(cwLines[c], w/2, h * 0.20 + c * 100);
    }
    ctx.restore();
    // Image in middle section
    if (img && img.width) {
      var imgMargin = 60;
      var imgW = w - imgMargin * 2;
      var imgH = h * 0.38;
      var imgY = h * 0.30;
      ctx.save();
      roundRect(ctx, imgMargin, imgY, imgW, imgH, 20);
      ctx.clip();
      var scale = Math.max(imgW / img.width, imgH / img.height);
      var sx = (img.width - imgW / scale) / 2;
      var sy = (img.height - imgH / scale) / 2;
      ctx.drawImage(img, sx, sy, imgW / scale, imgH / scale, imgMargin, imgY, imgW, imgH);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
      roundRect(ctx, imgMargin, imgY, imgW, imgH, 20); ctx.stroke(); ctx.restore();
    }
    // Subtitle text below image — bigger
    if (slide.cta_texto || slide.titulo) {
      ctx.font = 'bold 38px "Arial Black", Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#1a1a1a';
      var ctaLines = wrapText(ctx, slide.cta_texto || slide.titulo || '', w - 80);
      var textY = img && img.width ? h * 0.74 : h * 0.5;
      for (var i = 0; i < ctaLines.length; i++) {
        ctx.fillText(ctaLines[i], w/2, textY + i * 48);
      }
    }
    // Bottom accent
    ctx.fillStyle = accentColor; ctx.fillRect(0, h - 6, w, 6);
  }

  // ══════════════════════════════════════════════════════════
  // ── IMAGE LOADING & GENERATION ──
  // ══════════════════════════════════════════════════════════

  function loadImage(url) {
    return new Promise(function(ok, fail) {
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function() { ok(img); };
      img.onerror = function() { fail(new Error('img load fail')); };
      img.src = url;
    });
  }

  async function generateImages(prompts, size) {
    var results = await Promise.all(prompts.map(function(p) {
      return fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p, size: size, num_images: 1 })
      }).then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) { return d && d.images && d.images[0] ? d.images[0].url : null; })
        .catch(function() { return null; });
    }));
    return results;
  }

  function makeFallbackCanvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0a0a1a'); g.addColorStop(0.5, '#0f1535'); g.addColorStop(1, '#0a0020');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    return c;
  }

  // ══════════════════════════════════════════════════════════
  // ── MAIN PIPELINES ──
  // ══════════════════════════════════════════════════════════

  // Enhance img_desc for gpt-image-1 quality
  function enhancePrompt(desc, fallback) {
    if (!desc) return fallback || 'A dramatic photorealistic scene of a young Latino entrepreneur, cinematic lighting, editorial photography, 8k, no text no letters no words';
    return desc + ', ultra photorealistic, cinematic dramatic lighting, shallow depth of field, shot on Sony A7IV, editorial photography style, 8k quality, no text no letters no words no watermarks';
  }

  async function createCarousel(text, status) {
    var slides = text.slides || [];
    var total = slides.length;
    var accent = randomAccent();
    status('Generando imágenes cinematográficas... (0/' + total + ')');
    // Use img_desc from Claude for CONTEXTUAL images per slide
    var prompts = slides.map(function(s) {
      return enhancePrompt(s.img_desc, getCharPrompt(
        s.tipo === 'portada' ? 'portada_money' : s.tipo === 'cta' ? 'cta_accion' : 'historia_educativo'
      ));
    });
    var urls = await generateImages(prompts, 'portrait');
    var canvases = [];
    for (var i = 0; i < slides.length; i++) {
      status('Diseñando slide ' + (i+1) + '/' + total + '...');
      var c = document.createElement('canvas'); c.width = CW; c.height = CH;
      var ctx = c.getContext('2d');
      var img;
      try { img = urls[i] ? await loadImage(urls[i]) : makeFallbackCanvas(CW, CH); }
      catch(e) { img = makeFallbackCanvas(CW, CH); }
      var s = slides[i];
      if (s.tipo === 'portada' || i === 0) renderPortada(ctx, img, s, CW, CH, accent);
      else if (s.tipo === 'cta' || i === total - 1) renderCTA(ctx, img, s, total, CW, CH, accent);
      else if (s.tipo === 'revelacion') renderRevelacion(ctx, img, s, i, total, CW, CH, accent);
      else renderHistoria(ctx, img, s, i, total, CW, CH, accent);
      canvases.push({ canvas: c, label: i === 0 ? 'Portada' : (i === total-1 ? 'CTA' : 'Slide '+(i+1)) });
    }
    return canvases;
  }

  async function createStories(text, status) {
    var stories = text.stories || [];
    var total = stories.length;
    var accent = randomAccent();
    status('Generando imágenes cinematográficas...');
    // Use img_desc from Claude for contextual images
    var prompts = stories.map(function(s) {
      return enhancePrompt(s.img_desc, getCharPrompt('story_vertical'));
    });
    var urls = await generateImages(prompts, 'story');
    var canvases = [];
    for (var i = 0; i < stories.length; i++) {
      status('Creando historia ' + (i+1) + '/' + total + '...');
      var c = document.createElement('canvas'); c.width = SW; c.height = SH;
      var ctx = c.getContext('2d');
      var img;
      try { img = urls[i] ? await loadImage(urls[i]) : makeFallbackCanvas(SW, SH); }
      catch(e) { img = makeFallbackCanvas(SW, SH); }
      renderStorySlide(ctx, img, stories[i], i, total, i === total - 1, SW, SH, accent);
      canvases.push({ canvas: c, label: 'Historia ' + (i+1) });
    }
    return canvases;
  }

  async function createInformativo(text, status) {
    var slides = text.slides || [];
    var total = slides.length;
    var accentColor = randomInfoColor();

    // Generate images for ALL slides based on img_desc from Claude
    status('Generando imágenes con IA... (0/' + total + ')');
    var prompts = slides.map(function(s, i) {
      // Use Claude's img_desc if available, otherwise use a fallback
      var base = s.img_desc || '';
      if (!base) {
        // Fallback prompts based on slide type
        if (s.tipo === 'hook') return getInfoImgPrompt();
        if (s.tipo === 'cta') return 'A photorealistic image of hands reaching toward a glowing smartphone screen showing a message notification, warm inviting lighting, clean modern background, editorial photography, 8k, no text no letters no words';
        return getInfoImgPrompt();
      }
      return enhancePrompt(base);
    });

    var urls = await generateImages(prompts, 'portrait');
    var images = [];
    for (var u = 0; u < urls.length; u++) {
      status('Cargando imagen ' + (u+1) + '/' + total + '...');
      try { images.push(urls[u] ? await loadImage(urls[u]) : null); }
      catch(e) { images.push(null); }
    }

    var canvases = [];
    for (var i = 0; i < slides.length; i++) {
      status('Diseñando slide ' + (i+1) + '/' + total + '...');
      var c = document.createElement('canvas'); c.width = CW; c.height = CH;
      var ctx = c.getContext('2d');
      var s = slides[i];
      var img = images[i] || null;
      if (s.tipo === 'hook' || i === 0) {
        renderInfoHook(ctx, img, s, total, CW, CH, accentColor);
      } else if (s.tipo === 'cta' || i === total - 1) {
        renderInfoCTA(ctx, img, s, total, CW, CH, accentColor);
      } else {
        renderInfoContent(ctx, img, s, i, total, CW, CH, accentColor);
      }
      canvases.push({ canvas: c, label: i === 0 ? 'Hook' : (i === total-1 ? 'CTA' : 'Slide '+(i+1)) });
    }
    return canvases;
  }

  // ── JSON REPAIR ──
  function repairJSON(str) {
    str = str.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    try { return JSON.parse(str); } catch(e) {}
    var fixed = str.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
    fixed = fixed.replace(/,\s*\{[^}]*$/, '');
    var opens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    var braces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (var i = 0; i < braces; i++) fixed += '}';
    for (var j = 0; j < opens; j++) fixed += ']';
    if (!fixed.endsWith('}')) fixed += '}';
    try { return JSON.parse(fixed); } catch(e2) {
      var m = str.match(/\{[\s\S]*\}/);
      if (m) try { return JSON.parse(m[0]); } catch(e3) {}
      throw new Error('JSON Parse error: ' + e2.message);
    }
  }

  // ── FETCH TEXT ──
  async function fetchContent(topic, mode) {
    var usr = (typeof CU !== 'undefined' && CU) ? (CU.ref || CU.user || 'socio') : 'socio';
    var prompt = mode === 'story' ? STORY_PROMPT : (mode === 'info' ? INFO_PROMPT : CAROUSEL_PROMPT);
    var res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'carousel', user: usr, systemPrompt: prompt, messages: [{ role: 'user', content: topic }] })
    });
    if (!res.ok) throw new Error('Error texto (' + res.status + ')');
    var d = await res.json();
    var raw = d.reply || d.content || JSON.stringify(d);
    return typeof raw === 'string' ? repairJSON(raw) : raw;
  }

  // ── DOWNLOAD ──
  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function dlCanvas(canvas, fname) {
    try {
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        canvas.toBlob(function(b) {
          if (!b) { fbDl(canvas, fname); return; }
          var f = new File([b], fname, { type: 'image/png' });
          var sd = { files: [f] };
          if (navigator.canShare(sd)) navigator.share(sd).catch(function() { fbDl(canvas, fname); });
          else fbDl(canvas, fname);
        }, 'image/png'); return;
      }
      fbDl(canvas, fname);
    } catch(e) { fbDl(canvas, fname); }
  }

  function fbDl(canvas, fname) {
    if (isIOS) {
      var d = canvas.toDataURL('image/png');
      var w = window.open('', '_blank');
      if (w) { w.document.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%}.t{position:fixed;top:0;left:0;right:0;background:rgba(28,232,255,.9);color:#000;text-align:center;padding:12px;font:bold 14px Arial}</style></head><body><div class="t">Mantén presionada → Guardar</div><img src="'+d+'"></body></html>'); w.document.close(); }
      return;
    }
    canvas.toBlob(function(b) {
      if (!b) return;
      var u = URL.createObjectURL(b), a = document.createElement('a');
      a.download = fname; a.href = u; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(u); }, 500);
    }, 'image/png');
  }

  function dlAll(slides, topic) {
    var safe = topic.replace(/[^a-zA-Z0-9\u00e1-\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25);
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      Promise.all(slides.map(function(s, i) {
        return new Promise(function(ok) { s.canvas.toBlob(function(b) { ok(b ? new File([b], safe+'_'+(i+1)+'.png', {type:'image/png'}) : null); }, 'image/png'); });
      })).then(function(fs) {
        fs = fs.filter(Boolean);
        var sd = { files: fs };
        if (fs.length && navigator.canShare(sd)) navigator.share(sd).catch(function() { seqDl(slides, safe); });
        else seqDl(slides, safe);
      }).catch(function() { seqDl(slides, safe); });
    } else seqDl(slides, safe);
  }

  function seqDl(slides, safe) {
    slides.forEach(function(s, i) { setTimeout(function() { fbDl(s.canvas, safe+'_'+(i+1)+'.png'); }, i * 500); });
  }

  // ══════════════════════════════════════════════════════════
  // ── MODAL UI ──
  // ══════════════════════════════════════════════════════════

  var TH = { bg: '#030c1f', ac: '#1CE8FF', tx: '#F0EDE6', cd: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.08)' };

  function css() {
    if (document.getElementById('cg-v5')) return;
    var s = document.createElement('style'); s.id = 'cg-v5';
    s.textContent = '.cg-o{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}.cg-o.v{opacity:1}.cg-m{background:'+TH.bg+';color:'+TH.tx+';border:1px solid '+TH.bd+';border-radius:20px;width:95vw;max-width:1100px;max-height:93vh;overflow-y:auto;padding:24px;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.6)}@media(max-width:600px){.cg-m{padding:16px;border-radius:14px}}.cg-x{position:absolute;top:10px;right:14px;background:none;border:none;color:'+TH.tx+';font-size:28px;cursor:pointer;opacity:.5;z-index:1}.cg-h{font-size:22px;font-weight:800;margin:0 0 3px;background:linear-gradient(135deg,'+TH.ac+',#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.cg-s{font-size:12px;opacity:.4;margin-bottom:16px}.cg-tb{display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap}.cg-t{padding:8px 18px;border-radius:20px;border:1px solid '+TH.bd+';background:'+TH.cd+';color:'+TH.tx+';cursor:pointer;font-size:12px;font-weight:700;transition:all .2s}.cg-t:hover,.cg-t.a{border-color:'+TH.ac+';background:rgba(28,232,255,.08);color:'+TH.ac+'}.cg-t.info-tab.a{border-color:#F59E0B;background:rgba(245,158,11,.08);color:#F59E0B}.cg-l{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.4;margin-bottom:7px}.cg-ts{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.cg-tp{padding:7px 12px;border-radius:18px;border:1px solid '+TH.bd+';background:'+TH.cd+';color:'+TH.tx+';cursor:pointer;font-size:11px;text-align:left;transition:all .2s}.cg-tp:hover,.cg-tp.a{border-color:'+TH.ac+';background:rgba(28,232,255,.06);color:'+TH.ac+'}.cg-tp em{font-size:9px;opacity:.5;display:block;font-style:normal;margin-bottom:1px}.cg-ir{display:flex;gap:8px;margin-bottom:18px}@media(max-width:500px){.cg-ir{flex-direction:column}}.cg-i{flex:1;padding:11px 13px;border-radius:12px;border:1px solid '+TH.bd+';background:'+TH.cd+';color:'+TH.tx+';font-size:13px;outline:none;font-family:inherit}.cg-i:focus{border-color:'+TH.ac+'}.cg-b{padding:11px 22px;border-radius:12px;border:none;background:'+TH.ac+';color:#000;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}.cg-b:disabled{opacity:.3;cursor:not-allowed}.cg-bo{padding:7px 14px;border-radius:10px;border:1px solid '+TH.ac+';background:transparent;color:'+TH.ac+';font-weight:600;font-size:11px;cursor:pointer}.cg-ld{text-align:center;padding:36px 16px;display:none}.cg-sp{width:38px;height:38px;border:4px solid '+TH.bd+';border-top-color:'+TH.ac+';border-radius:50%;animation:cgs .8s linear infinite;margin:0 auto 10px}@keyframes cgs{to{transform:rotate(360deg)}}.cg-st{font-size:12px;opacity:.55;margin-top:6px}.cg-pv{display:none}.cg-ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px}.cg-ps{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory}.cg-ps::-webkit-scrollbar{height:4px}.cg-ps::-webkit-scrollbar-thumb{background:rgba(28,232,255,.2);border-radius:2px}.cg-sc{flex:0 0 auto;scroll-snap-align:start;border:1px solid '+TH.bd+';border-radius:12px;overflow:hidden;background:'+TH.cd+'}.cg-sc.carousel,.cg-sc.info{width:180px}.cg-sc.story{width:120px}.cg-sc img{width:100%;display:block;border-bottom:1px solid '+TH.bd+'}.cg-sf{display:flex;align-items:center;justify-content:space-between;padding:6px 8px}.cg-sl{font-size:9px;font-weight:600;opacity:.5}.cg-er{color:#ff5c5c;text-align:center;padding:12px;display:none;font-size:12px}.cg-ft{font-size:10px;opacity:.25;text-align:center;margin-top:10px}.cg-cost{font-size:10px;opacity:.3;text-align:right;margin-top:4px}';
    document.head.appendChild(s);
  }

  function buildModal() {
    css();
    var mode = 'carousel', curSlides = [];
    var ov = document.createElement('div'); ov.className = 'cg-o'; ov.id = 'cg-overlay';

    ov.innerHTML = '<div class="cg-m"><button class="cg-x" id="cx">&times;</button>' +
      '<h2 class="cg-h">Generador de Contenido IA</h2>' +
      '<p class="cg-s">3 formatos: Carrusel 3D • Historias • Informativo minimalista</p>' +
      '<div class="cg-tb">' +
        '<button class="cg-t a" data-m="carousel">📸 Carrusel 3D (6)</button>' +
        '<button class="cg-t" data-m="story">📱 Historias (5)</button>' +
        '<button class="cg-t info-tab" data-m="info">📰 Informativo (6)</button>' +
      '</div>' +
      '<div id="cf">' +
        '<p class="cg-l" id="tl">🔥 Temas virales</p>' +
        '<div class="cg-ts" id="cts"></div>' +
        '<p class="cg-l">O escribe tu tema</p>' +
        '<div class="cg-ir"><input class="cg-i" id="ci" placeholder="Ej: La IA ya puede vender por ti 24/7" /><button class="cg-b" id="cg">🎨 Generar</button></div>' +
      '</div>' +
      '<div class="cg-ld" id="cl"><div class="cg-sp"></div><p>Creando contenido profesional...</p><p class="cg-st" id="cs">Generando texto viral...</p></div>' +
      '<div class="cg-er" id="ce"></div>' +
      '<div class="cg-pv" id="cp">' +
        '<div class="cg-ph"><p class="cg-l" style="margin:0">Vista previa</p><button class="cg-b" id="cd" style="padding:7px 16px;font-size:11px">📤 Guardar Todo</button></div>' +
        '<div class="cg-ps" id="cps"></div>' +
        '<p class="cg-ft">IA: Claude + Flux • Formato 1080×1350 (4:5)</p>' +
      '</div></div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.classList.add('v'); });

    var inp = ov.querySelector('#ci'), gen = ov.querySelector('#cg'), ld = ov.querySelector('#cl'), st = ov.querySelector('#cs'), er = ov.querySelector('#ce'), pv = ov.querySelector('#cp'), ps = ov.querySelector('#cps'), da = ov.querySelector('#cd'), tl = ov.querySelector('#tl'), cts = ov.querySelector('#cts');

    function loadTopics(m) {
      var topics = (m === 'info') ? getRandomTopics(INFO_TOPICS, 8) : getRandomTopics(VIRAL_TOPICS, 8);
      tl.textContent = (m === 'info') ? '📰 Temas en tendencia' : '🔥 Temas virales';
      cts.innerHTML = '';
      topics.forEach(function(r) {
        var btn = document.createElement('button');
        btn.className = 'cg-tp';
        btn.setAttribute('data-t', r.topic);
        btn.innerHTML = '<em>' + r.cat + '</em>' + r.topic;
        btn.onclick = function() {
          cts.querySelectorAll('.cg-tp').forEach(function(x) { x.classList.remove('a'); });
          btn.classList.add('a');
          inp.value = r.topic;
        };
        cts.appendChild(btn);
      });
    }
    loadTopics('carousel');

    var close = function() { ov.classList.remove('v'); setTimeout(function() { ov.remove(); }, 300); };
    ov.querySelector('#cx').onclick = close;
    ov.onclick = function(e) { if (e.target === ov) close(); };

    ov.querySelectorAll('.cg-t').forEach(function(t) {
      t.onclick = function() {
        ov.querySelectorAll('.cg-t').forEach(function(x) { x.classList.remove('a'); });
        t.classList.add('a');
        mode = t.getAttribute('data-m');
        loadTopics(mode);
        inp.value = '';
        // Update placeholder
        if (mode === 'info') inp.placeholder = 'Ej: La IA ya puede vender por ti 24/7';
        else if (mode === 'story') inp.placeholder = 'Ej: Renunció a su trabajo y ahora gana 3x más';
        else inp.placeholder = 'Ej: Por qué una franquicia digital genera más que tu sueldo';
      };
    });

    gen.onclick = async function() {
      var topic = inp.value.trim();
      if (!topic) { inp.focus(); inp.style.borderColor = '#ff5c5c'; setTimeout(function() { inp.style.borderColor = ''; }, 1500); return; }
      gen.disabled = true; ld.style.display = 'block'; er.style.display = 'none'; pv.style.display = 'none'; ps.innerHTML = '';
      var upd = function(m) { st.textContent = m; };
      try {
        upd('Generando texto viral con IA...');
        var content = await fetchContent(topic, mode);
        if (mode === 'story') curSlides = await createStories(content, upd);
        else if (mode === 'info') curSlides = await createInformativo(content, upd);
        else curSlides = await createCarousel(content, upd);
        upd('¡Listo!');

        var cardClass = mode === 'story' ? 'story' : (mode === 'info' ? 'info' : 'carousel');
        curSlides.forEach(function(s, idx) {
          var card = document.createElement('div'); card.className = 'cg-sc ' + cardClass;
          var img = document.createElement('img'); img.src = s.canvas.toDataURL('image/png'); img.alt = s.label;
          card.appendChild(img);
          var ft = document.createElement('div'); ft.className = 'cg-sf';
          var lb = document.createElement('span'); lb.className = 'cg-sl'; lb.textContent = s.label;
          var dl = document.createElement('button'); dl.className = 'cg-bo'; dl.textContent = '📤';
          dl.onclick = (function(cv, i) { return function() { var n = topic.replace(/[^a-zA-Z0-9\u00e1-\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25); dlCanvas(cv, n+'_'+(i+1)+'.png'); }; })(s.canvas, idx);
          ft.appendChild(lb); ft.appendChild(dl); card.appendChild(ft); ps.appendChild(card);
        });
        pv.style.display = 'block';
        if (typeof showToast === 'function') showToast('✅ Contenido generado exitosamente');
      } catch(e) {
        console.error(e); er.textContent = 'Error: ' + (e.message || 'Intenta de nuevo'); er.style.display = 'block';
      } finally { ld.style.display = 'none'; gen.disabled = false; }
    };

    da.onclick = function() { if (curSlides.length) dlAll(curSlides, inp.value.trim() || 'contenido'); };
  }

  // ── PUBLIC ──
  window.openCarouselGenerator = function() {
    var ex = document.getElementById('cg-overlay'); if (ex) ex.remove();
    buildModal();
  };
  window.generateCarousel = async function(t) { var c = await fetchContent(t, 'carousel'); return await createCarousel(c, function(){}); };
  window.generateStories = async function(t) { var c = await fetchContent(t, 'story'); return await createStories(c, function(){}); };
  window.generateInformativo = async function(t) { var c = await fetchContent(t, 'info'); return await createInformativo(c, function(){}); };
})();
