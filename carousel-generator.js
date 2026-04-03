/**
 * SKYTEAM Content Generator v4 — Flux 3D Characters + 1080x1350 Viral Format
 * Based on 2026 Instagram viral research:
 * - 1080x1350 (4:5) portrait = 35% more screen space
 * - 8-10 slides, storytelling format
 * - 3D Pixar/Disney style characters
 * - Controversial hooks, real data, strong CTAs
 */
(function () {
  'use strict';

  // ── CANVAS SIZES ──
  var CW = 1080, CH = 1350; // Carousel: 4:5 portrait (max feed space)
  var SW = 1080, SH = 1920; // Story: 9:16

  // ── 3D CHARACTER IMAGE PROMPTS (Flux optimized) ──
  // NICHO: Franquicia digital, ingresos digitales con sistemas, libertad financiera
  // Structure: Subject → Action → Style → Context → Details (no text/letters)
  var CHAR_PROMPTS = {
    portada_money: [
      'A 3D cartoon character of a confident young Latino entrepreneur in a luxury suit sitting on a golden throne made of laptops and smartphones, holographic franchise network diagram floating around him, cash and bitcoin raining, Pixar style, cinematic lighting, dark futuristic office with city skyline, golden volumetric light, photorealistic 3D render, 8k quality, no text no letters no words',
      'A 3D cartoon character of a powerful Latina businesswoman standing on top of a giant glowing digital globe showing connected franchise nodes, arms crossed confidently, multiple passive income streams flowing like golden rivers, Disney Pixar style, epic sunset background with neon city lights, dramatic cinematic lighting, 8k, no text no letters no words',
      'A 3D cartoon of a young ambitious Latino man on a luxury yacht holding a tablet showing franchise dashboard with rising profits, holographic screens floating around showing automated sales, ocean sunset, gold and cyan neon particles, Pixar Disney style, dark cinematic background, 8k quality, no text no letters no words',
      'A 3D cartoon character of a young couple celebrating in front of a massive holographic screen showing a digital franchise empire map with connected dots across Latin America, money flying, confetti, luxury penthouse, Pixar style, dramatic golden light explosion, cinematic render, 8k, no text no letters no words',
      'A 3D cartoon of a determined young Latino breaking free from chains labeled 9-to-5, transforming into a digital entrepreneur with laptop and passive income streams flowing as golden light, Pixar style, dark background with epic golden and cyan light explosion, 8k, no text no letters no words'
    ],
    historia_educativo: [
      'A 3D cartoon character of a frustrated young Latino office worker at a tiny desk surrounded by bills and alarm clocks, exhausted expression, hamster wheel visible in background, Pixar style, depressing grey office lighting contrasted with a glowing door leading to freedom, 8k, no text no letters no words',
      'A 3D cartoon of a young Latina looking at two paths - one dark path leading to a cubicle with chains, another golden glowing path leading to a laptop on a beach with palm trees and automated income dashboard, Pixar Disney style, split lighting dramatic contrast, 8k quality, no text no letters no words',
      'A 3D cartoon character of a smart young Latino mentor showing a holographic pyramid of connected franchise partners, each node generating income, automated digital system flowing, Pixar style, dark tech room with blue and gold holographic displays, futuristic, 8k, no text no letters no words',
      'A 3D cartoon of a young man working from a luxury cafe with ocean view, laptop showing automated franchise system generating sales while he relaxes, notifications of income piling up as floating golden coins, Pixar Disney style, warm cinematic lighting, 8k, no text no letters no words',
      'A 3D cartoon character of a tired employee looking at his tiny paycheck next to a giant screen showing a franchise owner earning 10x more with automated digital systems, shocked expression, Pixar style, dramatic split lighting, contrast metaphor, 8k, no text no letters no words',
      'A 3D cartoon of a young Latino family celebrating financial freedom, parents and kids in a beautiful home, holographic screen showing passive franchise income, no more worrying about bills, Pixar Disney style, warm golden lighting, emotional happy scene, 8k, no text no letters no words'
    ],
    cta_accion: [
      'A 3D cartoon character of a charismatic Latino mentor extending hand toward viewer with a warm confident smile, behind him a massive golden door opening to reveal a digital franchise empire with connected nodes and flowing income, welcoming gesture, Pixar Disney style, dramatic golden volumetric light, 8k quality, no text no letters no words',
      'A 3D cartoon of an excited young Latino entrepreneur jumping in celebration holding a golden key labeled franchise, fireworks of golden coins and digital symbols exploding behind, confetti, victory pose, Pixar style, dark background with colorful neon celebration lights, 8k, no text no letters no words',
      'A 3D cartoon character of a successful young Latina franchise owner standing at a podium presenting to a crowd of eager people, holographic franchise roadmap behind her, inspirational scene, Pixar Disney style, dramatic stage lighting, epic cinematic composition, 8k, no text no letters no words'
    ],
    dato_impactante: [
      'A 3D cartoon of a shocked young Latino with wide eyes looking at a giant glowing screen showing digital franchise revenue numbers going up exponentially, jaw dropped reaction, Pixar Disney style, dark background with spotlight and golden particles, dramatic cinematic lighting, 8k, no text no letters no words',
      'A 3D cartoon character standing next to a massive scale comparing a tiny employee paycheck on one side against a mountain of automated franchise passive income on the other, metaphorical wealth comparison, Pixar style, dramatic lighting, dark elegant background, 8k quality, no text no letters no words',
      'A 3D cartoon of a young person surrounded by floating screens showing successful franchise statistics worldwide, amazed expression pointing at the biggest screen showing income while sleeping, Pixar Disney style, futuristic dark environment, neon cyan and gold accents, 8k, no text no letters no words'
    ],
    story_vertical: [
      'A 3D cartoon character of a charismatic young Latino entrepreneur looking directly at camera with a knowing confident smile, holding a glowing smartphone showing franchise dashboard, luxury lifestyle background at night with neon city, vertical portrait composition, Pixar Disney style, dramatic rim lighting, 8k, vertical format, no text no letters no words',
      'A 3D cartoon of a young franchise owner sitting in a luxury sports car holding tablet showing automated income notifications, confident successful pose, Pixar style, dark urban night background with neon golden accents, dramatic lighting from below, vertical composition, 8k, no text no letters no words',
      'A 3D cartoon character making a mind-blown gesture with golden light and digital franchise network diagrams exploding from their head, revelation about passive income moment, Pixar Disney style, dark background, dramatic neon cyan and gold lighting, vertical portrait, 8k quality, no text no letters no words',
      'A 3D cartoon of a young Latino walking confidently on a path transforming from a grey office carpet to a golden digital highway with franchise nodes lighting up, Pixar style, vertical composition, dramatic sunset sky with futuristic elements, cinematic depth, 8k, no text no letters no words'
    ]
  };

  function getCharPrompt(type) {
    var arr = CHAR_PROMPTS[type] || CHAR_PROMPTS.historia_educativo;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── VIRAL TOPICS (NICHO: Franquicia digital / Ingresos digitales con sistemas) ──
  var VIRAL_TOPICS = [
    { cat: '🔥 Dolor del empleado', topics: [
      'Trabajas 8 horas para el sueño de otro — ¿y el tuyo?',
      'Tu jefe gana 10x más que tú usando TU tiempo',
      'Llevas 5 años trabajando y sigues igual — aquí está el por qué',
      'El 87% de empleados en Latam odia su trabajo — ¿eres uno?',
      'Cambiaste de trabajo 3 veces pero sigues sin libertad financiera',
      'Tu sueldo sube 3% al año pero la inflación sube 8% — haz las cuentas',
      'Tu alarma suena a las 6am para hacer rico a alguien más',
      'Tienes título, maestría y deudas — el sistema no funciona'
    ]},
    { cat: '💰 Franquicia digital', topics: [
      'Qué es una franquicia digital y por qué factura más que un local físico',
      'Invertí en un sistema digital y en 90 días recuperé mi inversión',
      'McDonald\'s cobra $2M por franquicia — la digital cuesta 50x menos',
      'Cómo una franquicia digital genera plata mientras duermes',
      'Mi franquicia digital factura más que mi trabajo de 10 años',
      'Por qué las franquicias digitales son el negocio del 2026',
      'El secreto de las franquicias: sistemas que trabajan por ti',
      'Con $500 puedes tener un negocio que factura $5,000 al mes'
    ]},
    { cat: '🚀 Ingresos con sistemas', topics: [
      'La IA y los sistemas digitales generan dinero 24/7 — ¿tú los usas?',
      'Así funciona un sistema que vende mientras estás en la playa',
      'Por qué la gente inteligente invierte en sistemas, no en tiempo',
      'Un sistema digital hace en 1 hora lo que un empleado en 1 semana',
      '3 tipos de ingresos pasivos con sistemas digitales que funcionan HOY',
      'De $0 a $3,000 al mes con un sistema digital automatizado — caso real',
      'El dinero persigue a quien tiene sistemas — no a quien trabaja más'
    ]},
    { cat: '🧠 Mentalidad de inversor', topics: [
      'Tienes dinero para invertir pero miedo de dar el paso — lee esto',
      'Los ricos no trabajan más, trabajan DIFERENTE — esta es la clave',
      'Invertir no es gastar: la diferencia que separa ricos de pobres',
      'Jeff Bezos invirtió $250K en Google — los que NO invirtieron lloran',
      'Tu dinero en el banco pierde valor cada día — ponlo a trabajar',
      'Robert Kiyosaki: "Los pobres trabajan por dinero, los ricos tienen sistemas"',
      '¿Tienes $500-$2,000 sin producir? Así los multiplicas con sistemas digitales'
    ]}
  ];

  function getRandomTopics(n) {
    var all = [];
    VIRAL_TOPICS.forEach(function(c) { c.topics.forEach(function(t) { all.push({ cat: c.cat, topic: t }); }); });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = all[i]; all[i] = all[j]; all[j] = tmp; }
    return all.slice(0, n);
  }

  // ── TEXT PROMPTS ──
  var CAROUSEL_PROMPT =
    'Creador de carruseles VIRALES para Instagram Latam. NICHO: franquicias digitales, ingresos con sistemas automatizados, personas con capital para invertir.\n' +
    'DOLORES: esclavitud laboral, sueldo bajo, sin tiempo, miedo a invertir, inflación come ahorros.\n' +
    'SOLUCIONES: franquicias digitales 24/7, ingresos pasivos, IA que vende, modelo probado, libertad financiera.\n' +
    'Genera 8 slides contando UNA HISTORIA sobre estos dolores→soluciones. Lenguaje coloquial latino ("chambear","generar plata","sistema que trabaja por ti").\n' +
    'S1(portada):titulo max 6 palabras impactantes+subtitulo max 10 palabras. S2(contexto):dolor del empleado+dato real. S3-S6(historia):narrativa progresiva con datos reales de franquicias/economía digital, ejemplos (McDonald\'s,Amazon,Uber). S7(revelacion):por qué sistemas digitales son la respuesta. S8(cta):llamado a acción+cta_palabra.\n' +
    'Texto max 30 palabras por slide. dato=cifra real o null.\n' +
    'JSON estricto:\n' +
    '{"slides":[{"tipo":"portada","titulo":"..","subtitulo":"..","dato":null},{"tipo":"contexto","titulo":"..","texto":"..","dato":".."},{"tipo":"historia","titulo":"..","texto":"..","dato":".."},{"tipo":"historia","titulo":"..","texto":"..","dato":".."},{"tipo":"historia","titulo":"..","texto":"..","dato":".."},{"tipo":"historia","titulo":"..","texto":"..","dato":null},{"tipo":"revelacion","titulo":"..","texto":"..","dato":".."},{"tipo":"cta","titulo":"..","texto":"..","cta_palabra":"QUIERO"}]}\nSolo JSON.';

  var STORY_PROMPT =
    'Stories VIRALES Instagram Latam. NICHO: franquicias digitales, ingresos con sistemas, personas con capital.\n' +
    'DOLORES: esclavitud laboral, sueldo bajo, sin tiempo. SOLUCIONES: sistemas 24/7, ingresos pasivos, franquicia digital.\n' +
    'Genera 5 stories contando UNA HISTORIA. Lenguaje coloquial latino.\n' +
    'S1:gancho brutal(dolor/dato). S2-3:transformación con datos reales. S4:revelación(franquicia digital=solución). S5:CTA.\n' +
    'titulo max 5 palabras, texto max 20 palabras, emoji 1.\n' +
    'JSON:\n' +
    '{"stories":[{"titulo":"..","texto":"..","emoji":"🔥"},{"titulo":"..","texto":"..","emoji":"💰"},{"titulo":"..","texto":"..","emoji":"🚀"},{"titulo":"..","texto":"..","emoji":"📈"},{"titulo":"..","texto":"..","emoji":"📩","cta_palabra":"QUIERO"}]}\nSolo JSON.';

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
    // Heavy shadow for readability
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
      g.addColorStop(0, 'rgba(0,0,0,0.15)');
      g.addColorStop(0.35, 'rgba(0,0,0,0.35)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0.85)');
    } else if (type === 'heavy-top') {
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.8)');
      g.addColorStop(0.4, 'rgba(0,0,0,0.5)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0.4)');
    } else {
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
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

  // Swipe cue arrow on right edge
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

  // ── SLIDE RENDERERS (image bg + 3D character + text) ──

  function renderPortada(ctx, img, slide, w, h, accent) {
    // Image fills top portion (character focused)
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-bottom');

    // Top accent stripe
    ctx.fillStyle = accent; ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, 5); ctx.globalAlpha = 1;

    // Badge
    glassCard(ctx, w/2 - 90, 55, 180, 38, 19);
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText('🔥 NO TE LO PIERDAS', w/2, 80);

    // Title — HUGE, bottom area
    var ty = h * 0.58;
    ctx.font = 'bold 76px "Arial Black", Arial'; ctx.textAlign = 'center';
    var tLines = wrapText(ctx, slide.titulo.toUpperCase(), w - 100);
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], w/2, ty, 'bold 76px "Arial Black", Arial', '#fff', 'center', 16);
      ty += 90;
    }

    // Accent bar
    accentBar(ctx, w/2 - 60, ty + 4, 120, accent, 0.9);
    ty += 30;

    // Subtitle
    if (slide.subtitulo) {
      var sLines = wrapText(ctx, slide.subtitulo, w - 120);
      for (var j = 0; j < sLines.length; j++) {
        shadowText(ctx, sLines[j], w/2, ty, '30px Arial', 'rgba(255,255,255,0.9)', 'center', 10);
        ty += 40;
      }
    }

    // Data box if exists
    if (slide.dato) {
      ty = Math.max(ty + 10, h * 0.85);
      drawDataBox(ctx, '📊 ' + slide.dato, 60, ty, w - 120, accent);
    }

    // Bottom: desliza + swipe cue
    shadowText(ctx, 'Desliza  →', w/2, h - 40, 'bold 22px Arial', accent, 'center', 8);
    swipeCue(ctx, w, h, accent);
  }

  function renderHistoria(ctx, img, slide, idx, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'uniform');

    // Top accent
    ctx.fillStyle = accent; ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, w, 4); ctx.globalAlpha = 1;

    slideCounter(ctx, idx + 1, total, w, accent);

    // Title — top area with glass card
    var tLines = wrapText(ctx, slide.titulo, w - 140);
    var titleH = tLines.length * 58 + 30;
    glassCard(ctx, 40, 100, w - 80, titleH, 20);
    // Left accent bar on card
    ctx.fillStyle = accent; ctx.globalAlpha = 0.7;
    roundRect(ctx, 40, 105, 5, titleH - 10, 3); ctx.fill(); ctx.globalAlpha = 1;

    var ty = 140;
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], 75, ty, 'bold 48px "Arial Black", Arial', '#fff', 'left', 10);
      ty += 58;
    }
    ty = 100 + titleH + 20;

    // Accent underline
    accentBar(ctx, 75, ty, 80, accent, 0.7);
    ty += 30;

    // Narrative text - in glass card, larger area
    if (slide.texto) {
      var txLines = wrapText(ctx, slide.texto, w - 180);
      var cardH = txLines.length * 38 + 44;
      glassCard(ctx, 40, ty, w - 80, cardH, 18);
      var txY = ty + 32;
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], 72, txY, '28px Arial', 'rgba(255,255,255,0.92)', 'left', 8);
        txY += 38;
      }
      ty += cardH + 20;
    }

    // Data box
    if (slide.dato) {
      ty = Math.max(ty, h * 0.72);
      drawDataBox(ctx, '📊 ' + slide.dato, 40, ty, w - 80, accent);
    }

    // Swipe cue
    shadowText(ctx, 'Desliza  →', w/2, h - 35, 'bold 18px Arial', 'rgba(255,255,255,0.4)', 'center', 6);
    swipeCue(ctx, w, h, accent);
  }

  function renderRevelacion(ctx, img, slide, idx, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-top');

    ctx.fillStyle = accent; ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, w, 5); ctx.globalAlpha = 1;
    slideCounter(ctx, idx + 1, total, w, accent);

    // "KEY" badge
    glassCard(ctx, w/2 - 100, 90, 200, 38, 19);
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText('⚡ PUNTO CLAVE', w/2, 115);

    // Title
    var ty = 180;
    var tLines = wrapText(ctx, slide.titulo, w - 120);
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], w/2, ty, 'bold 52px "Arial Black", Arial', '#fff', 'center', 14);
      ty += 64;
    }
    accentBar(ctx, w/2 - 50, ty + 4, 100, accent, 0.8);
    ty += 35;

    // Text
    if (slide.texto) {
      var txLines = wrapText(ctx, slide.texto, w - 140);
      var cardH = txLines.length * 38 + 44;
      glassCard(ctx, 50, ty, w - 100, cardH, 18);
      var txY = ty + 32;
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], w/2, txY, '28px Arial', 'rgba(255,255,255,0.92)', 'center', 8);
        txY += 38;
      }
      ty += cardH + 16;
    }

    if (slide.dato) {
      ty = Math.max(ty, h * 0.72);
      drawDataBox(ctx, '💡 ' + slide.dato, 50, ty, w - 100, accent);
    }

    swipeCue(ctx, w, h, accent);
  }

  function renderCTA(ctx, img, slide, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-bottom');

    ctx.fillStyle = accent; ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, 5); ctx.globalAlpha = 1;
    slideCounter(ctx, total, total, w, accent);

    // Title
    var ty = h * 0.4;
    var tLines = wrapText(ctx, slide.titulo, w - 120);
    for (var i = 0; i < tLines.length; i++) {
      shadowText(ctx, tLines[i], w/2, ty, 'bold 52px "Arial Black", Arial', '#fff', 'center', 14);
      ty += 64;
    }
    accentBar(ctx, w/2 - 50, ty + 4, 100, accent, 0.8);
    ty += 30;

    // Text
    if (slide.texto) {
      var txLines = wrapText(ctx, slide.texto, w - 140);
      ty = Math.max(ty, h * 0.58);
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], w/2, ty, '26px Arial', 'rgba(255,255,255,0.9)', 'center', 8);
        ty += 36;
      }
    }

    // CTA Button
    var palabra = slide.cta_palabra || 'QUIERO';
    ty = Math.max(ty + 30, h * 0.75);
    var btnW = 640, btnH = 70, btnX = (w - btnW) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
    ctx.fillStyle = accent;
    roundRect(ctx, btnX, ty, btnW, btnH, 35); ctx.fill();
    ctx.restore();
    ctx.font = 'bold 26px "Arial Black", Arial'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
    ctx.fillText('💬 Comenta "' + palabra + '"  →', w/2, ty + 45);

    // Sub-CTA
    shadowText(ctx, 'y te cuento cómo lograrlo', w/2, ty + btnH + 30, '22px Arial', 'rgba(255,255,255,0.5)', 'center', 6);

    // Save CTA
    ty = ty + btnH + 65;
    glassCard(ctx, w/2 - 200, ty, 400, 40, 20);
    shadowText(ctx, '🔖 Guarda este post para después', w/2, ty + 27, 'bold 16px Arial', 'rgba(255,255,255,0.6)', 'center', 4);
  }

  function drawDataBox(ctx, text, x, y, w, accent) {
    if (!text) return y;
    ctx.save();
    ctx.font = 'bold 20px Arial';
    var lines = wrapText(ctx, text, w - 44);
    var h = lines.length * 28 + 28;
    glassCard(ctx, x, y, w, h, 14);
    ctx.fillStyle = accent; ctx.globalAlpha = 0.6;
    roundRect(ctx, x, y + 4, 4, h - 8, 2); ctx.fill();
    ctx.globalAlpha = 1;
    var ty = y + 24;
    for (var i = 0; i < lines.length; i++) {
      shadowText(ctx, lines[i], x + 22, ty, 'bold 20px Arial', accent, 'left', 6);
      ty += 28;
    }
    ctx.restore();
    return y + h + 14;
  }

  // ── STORY RENDERER ──
  function renderStorySlide(ctx, img, story, idx, total, isLast, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'heavy-bottom');

    // Progress bars
    var barY = 40, barGap = 5;
    var barW = (w - 50 - (total - 1) * barGap) / total;
    for (var b = 0; b < total; b++) {
      ctx.fillStyle = b <= idx ? accent : 'rgba(255,255,255,0.2)';
      ctx.globalAlpha = b <= idx ? 0.9 : 1;
      roundRect(ctx, 25 + b * (barW + barGap), barY, barW, 3, 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Emoji
    ctx.font = '100px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(story.emoji || '🔥', w/2, h * 0.3);

    // Title
    var tLines = wrapText(ctx, story.titulo.toUpperCase(), w - 100);
    var ty = h * 0.4;
    for (var t = 0; t < tLines.length; t++) {
      shadowText(ctx, tLines[t], w/2, ty, 'bold 64px "Arial Black", Arial', '#fff', 'center', 16);
      ty += 78;
    }
    accentBar(ctx, w/2 - 50, ty + 6, 100, accent, 0.7);
    ty += 45;

    // Text card
    if (story.texto) {
      var txLines = wrapText(ctx, story.texto, w - 140);
      var cardH = txLines.length * 42 + 44;
      glassCard(ctx, 40, ty, w - 80, cardH, 20);
      var txY = ty + 34;
      for (var j = 0; j < txLines.length; j++) {
        shadowText(ctx, txLines[j], w/2, txY, '30px Arial', 'rgba(255,255,255,0.92)', 'center', 8);
        txY += 42;
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

    if (!isLast) {
      shadowText(ctx, 'Toca para ver más  →', w/2, h - 65, 'bold 18px Arial', 'rgba(255,255,255,0.35)', 'center', 6);
    }
  }

  // ── IMAGE LOADING & GENERATION ──

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

  // ── MAIN PIPELINES ──

  async function createCarousel(text, status) {
    var slides = text.slides || [];
    var total = slides.length;
    var accent = randomAccent();

    status('Generando personajes 3D con IA... (0/' + total + ')');
    var prompts = slides.map(function(s) {
      if (s.tipo === 'portada') return getCharPrompt('portada_money');
      if (s.tipo === 'cta') return getCharPrompt('cta_accion');
      if (s.tipo === 'revelacion') return getCharPrompt('dato_impactante');
      return getCharPrompt('historia_educativo');
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

    status('Generando imágenes para historias...');
    var prompts = stories.map(function() { return getCharPrompt('story_vertical'); });
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

  // ── JSON REPAIR (handles truncated API responses) ──
  function repairJSON(str) {
    // Remove markdown fences
    str = str.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Try direct parse first
    try { return JSON.parse(str); } catch(e) {}
    // Truncated: try to close open structures
    // Remove trailing incomplete key/value after last comma
    var fixed = str.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
    // Also handle trailing incomplete object in array
    fixed = fixed.replace(/,\s*\{[^}]*$/, '');
    // Count unclosed brackets/braces
    var opens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    var braces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (var i = 0; i < braces; i++) fixed += '}';
    for (var j = 0; j < opens; j++) fixed += ']';
    // Close any open braces at end
    if (!fixed.endsWith('}')) fixed += '}';
    try { return JSON.parse(fixed); } catch(e2) {
      // Last resort: extract whatever JSON object we can find
      var m = str.match(/\{[\s\S]*\}/);
      if (m) try { return JSON.parse(m[0]); } catch(e3) {}
      throw new Error('JSON Parse error: ' + e2.message);
    }
  }

  // ── FETCH TEXT ──
  async function fetchContent(topic, mode) {
    var usr = (typeof CU !== 'undefined' && CU) ? (CU.ref || CU.user || 'socio') : 'socio';
    var res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'carousel', user: usr, systemPrompt: mode === 'story' ? STORY_PROMPT : CAROUSEL_PROMPT, messages: [{ role: 'user', content: topic }] })
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

  // ── MODAL UI ──
  var TH = { bg: '#030c1f', ac: '#1CE8FF', tx: '#F0EDE6', cd: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.08)' };

  function css() {
    if (document.getElementById('cg-v4')) return;
    var s = document.createElement('style'); s.id = 'cg-v4';
    s.textContent = '.cg-o{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}.cg-o.v{opacity:1}.cg-m{background:'+TH.bg+';color:'+TH.tx+';border:1px solid '+TH.bd+';border-radius:20px;width:95vw;max-width:1100px;max-height:93vh;overflow-y:auto;padding:24px;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.6)}@media(max-width:600px){.cg-m{padding:16px;border-radius:14px}}.cg-x{position:absolute;top:10px;right:14px;background:none;border:none;color:'+TH.tx+';font-size:28px;cursor:pointer;opacity:.5;z-index:1}.cg-h{font-size:22px;font-weight:800;margin:0 0 3px;background:linear-gradient(135deg,'+TH.ac+',#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.cg-s{font-size:12px;opacity:.4;margin-bottom:16px}.cg-tb{display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap}.cg-t{padding:8px 18px;border-radius:20px;border:1px solid '+TH.bd+';background:'+TH.cd+';color:'+TH.tx+';cursor:pointer;font-size:13px;font-weight:700;transition:all .2s}.cg-t:hover,.cg-t.a{border-color:'+TH.ac+';background:rgba(28,232,255,.08);color:'+TH.ac+'}.cg-l{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.4;margin-bottom:7px}.cg-ts{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.cg-tp{padding:7px 12px;border-radius:18px;border:1px solid '+TH.bd+';background:'+TH.cd+';color:'+TH.tx+';cursor:pointer;font-size:11px;text-align:left;transition:all .2s}.cg-tp:hover,.cg-tp.a{border-color:'+TH.ac+';background:rgba(28,232,255,.06);color:'+TH.ac+'}.cg-tp em{font-size:9px;opacity:.5;display:block;font-style:normal;margin-bottom:1px}.cg-ir{display:flex;gap:8px;margin-bottom:18px}@media(max-width:500px){.cg-ir{flex-direction:column}}.cg-i{flex:1;padding:11px 13px;border-radius:12px;border:1px solid '+TH.bd+';background:'+TH.cd+';color:'+TH.tx+';font-size:13px;outline:none;font-family:inherit}.cg-i:focus{border-color:'+TH.ac+'}.cg-b{padding:11px 22px;border-radius:12px;border:none;background:'+TH.ac+';color:#000;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}.cg-b:disabled{opacity:.3;cursor:not-allowed}.cg-bo{padding:7px 14px;border-radius:10px;border:1px solid '+TH.ac+';background:transparent;color:'+TH.ac+';font-weight:600;font-size:11px;cursor:pointer}.cg-ld{text-align:center;padding:36px 16px;display:none}.cg-sp{width:38px;height:38px;border:4px solid '+TH.bd+';border-top-color:'+TH.ac+';border-radius:50%;animation:cgs .8s linear infinite;margin:0 auto 10px}@keyframes cgs{to{transform:rotate(360deg)}}.cg-st{font-size:12px;opacity:.55;margin-top:6px}.cg-pv{display:none}.cg-ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px}.cg-ps{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory}.cg-ps::-webkit-scrollbar{height:4px}.cg-ps::-webkit-scrollbar-thumb{background:rgba(28,232,255,.2);border-radius:2px}.cg-sc{flex:0 0 auto;scroll-snap-align:start;border:1px solid '+TH.bd+';border-radius:12px;overflow:hidden;background:'+TH.cd+'}.cg-sc.carousel{width:180px}.cg-sc.story{width:120px}.cg-sc img{width:100%;display:block;border-bottom:1px solid '+TH.bd+'}.cg-sf{display:flex;align-items:center;justify-content:space-between;padding:6px 8px}.cg-sl{font-size:9px;font-weight:600;opacity:.5}.cg-er{color:#ff5c5c;text-align:center;padding:12px;display:none;font-size:12px}.cg-ft{font-size:10px;opacity:.25;text-align:center;margin-top:10px}';
    document.head.appendChild(s);
  }

  function buildModal() {
    css();
    var mode = 'carousel', curSlides = [];
    var ov = document.createElement('div'); ov.className = 'cg-o'; ov.id = 'cg-overlay';
    var rts = getRandomTopics(8);
    var thtml = '';
    rts.forEach(function(r) { thtml += '<button class="cg-tp" data-t="'+r.topic.replace(/"/g,'&quot;')+'"><em>'+r.cat+'</em>'+r.topic+'</button>'; });

    ov.innerHTML = '<div class="cg-m"><button class="cg-x" id="cx">&times;</button><h2 class="cg-h">Generador de Contenido IA</h2><p class="cg-s">Contenido viral para franquicias digitales • Personajes 3D + storytelling • Formato 4:5</p><div class="cg-tb"><button class="cg-t a" data-m="carousel">📸 Carrusel (8 slides)</button><button class="cg-t" data-m="story">📱 Historias (5 stories)</button></div><div id="cf"><p class="cg-l">🔥 Temas virales</p><div class="cg-ts" id="cts">'+thtml+'</div><p class="cg-l">O escribe tu tema</p><div class="cg-ir"><input class="cg-i" id="ci" placeholder="Ej: Por qué una franquicia digital genera más que tu sueldo" /><button class="cg-b" id="cg">🎨 Generar</button></div></div><div class="cg-ld" id="cl"><div class="cg-sp"></div><p>Creando contenido profesional...</p><p class="cg-st" id="cs">Generando texto viral...</p></div><div class="cg-er" id="ce"></div><div class="cg-pv" id="cp"><div class="cg-ph"><p class="cg-l" style="margin:0">Vista previa</p><button class="cg-b" id="cd" style="padding:7px 16px;font-size:11px">📤 Guardar Todo</button></div><div class="cg-ps" id="cps"></div><p class="cg-ft">Personajes 3D por Flux AI • Nicho: Franquicia Digital • Formato 1080×1350 (4:5)</p></div></div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.classList.add('v'); });

    var inp = ov.querySelector('#ci'), gen = ov.querySelector('#cg'), ld = ov.querySelector('#cl'), st = ov.querySelector('#cs'), er = ov.querySelector('#ce'), pv = ov.querySelector('#cp'), ps = ov.querySelector('#cps'), da = ov.querySelector('#cd');

    var close = function() { ov.classList.remove('v'); setTimeout(function() { ov.remove(); }, 300); };
    ov.querySelector('#cx').onclick = close;
    ov.onclick = function(e) { if (e.target === ov) close(); };

    ov.querySelectorAll('.cg-t').forEach(function(t) {
      t.onclick = function() { ov.querySelectorAll('.cg-t').forEach(function(x) { x.classList.remove('a'); }); t.classList.add('a'); mode = t.getAttribute('data-m'); };
    });
    ov.querySelectorAll('.cg-tp').forEach(function(b) {
      b.onclick = function() { ov.querySelectorAll('.cg-tp').forEach(function(x) { x.classList.remove('a'); }); b.classList.add('a'); inp.value = b.getAttribute('data-t'); };
    });

    gen.onclick = async function() {
      var topic = inp.value.trim();
      if (!topic) { inp.focus(); inp.style.borderColor = '#ff5c5c'; setTimeout(function() { inp.style.borderColor = ''; }, 1500); return; }
      gen.disabled = true; ld.style.display = 'block'; er.style.display = 'none'; pv.style.display = 'none'; ps.innerHTML = '';
      var upd = function(m) { st.textContent = m; };
      try {
        upd('Generando texto viral con IA...');
        var content = await fetchContent(topic, mode);
        curSlides = mode === 'story' ? await createStories(content, upd) : await createCarousel(content, upd);
        upd('¡Listo!');

        curSlides.forEach(function(s, idx) {
          var card = document.createElement('div'); card.className = 'cg-sc ' + mode;
          var img = document.createElement('img'); img.src = s.canvas.toDataURL('image/png'); img.alt = s.label;
          card.appendChild(img);
          var ft = document.createElement('div'); ft.className = 'cg-sf';
          var lb = document.createElement('span'); lb.className = 'cg-sl'; lb.textContent = s.label;
          var dl = document.createElement('button'); dl.className = 'cg-bo'; dl.textContent = '📤';
          dl.onclick = (function(cv, i) { return function() { var n = topic.replace(/[^a-zA-Z0-9\u00e1-\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25); dlCanvas(cv, n+'_'+(i+1)+'.png'); }; })(s.canvas, idx);
          ft.appendChild(lb); ft.appendChild(dl); card.appendChild(ft); ps.appendChild(card);
        });
        pv.style.display = 'block';
        if (typeof showToast === 'function') showToast('✅ Contenido con personajes 3D generado');
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
})();
