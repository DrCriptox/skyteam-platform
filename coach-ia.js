// ===================================================================
// COACH IA — Floating AI Assistant for SkyTeam Platform
// Step-by-step task guidance, section-specific tools, chat & voice
// Nebula Premium Design — Glassmorphism + Gold Accents
// ===================================================================

(function() {
'use strict';

// ── State ──────────────────────────────────────────────────────
var coachState = {
  open: false,
  section: 'home',
  tasks: [],
  taskIndex: 0,
  tools: null,
  chatHistory: [],
  recording: false,
  lastAnalysis: null,
  lastAnalysisTime: 0,
  recognition: null,
  chatLoading: false
};

// ── Globals shorthand ──────────────────────────────────────────
var CU = typeof window.CU !== 'undefined' ? window.CU : null;
var SB  = typeof window.SB !== 'undefined' ? window.SB : null;

// ═══════════════════════════════════════════════════════════════
//  CSS INJECTION
// ═══════════════════════════════════════════════════════════════

function injectCoachCSS() {
  if (document.getElementById('coach-ia-css')) return;
  var css = document.createElement('style');
  css.id = 'coach-ia-css';
  css.textContent = [

    /* ── Floating Action Button ── */
    '.coach-fab{position:fixed;bottom:24px;right:24px;z-index:9990;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#E8D48B,#C9A84C);background-size:200% auto;animation:goldShimmer 4s linear infinite;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;font-size:24px;box-shadow:0 4px 20px rgba(201,168,76,0.4),0 0 40px rgba(201,168,76,0.15);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}',
    '.coach-fab:hover{transform:scale(1.1);}',
    '.coach-fab:active{transform:scale(0.95);}',

    /* ── Notification dot on FAB ── */
    '.coach-fab-dot{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#E24B4A;border:2px solid #050508;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;display:none;}',
    '.coach-fab-dot.visible{display:flex;}',

    /* ── Overlay ── */
    '.coach-overlay{position:fixed;inset:0;z-index:9991;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:coachFadeIn 0.2s ease;}',
    '@keyframes coachFadeIn{from{opacity:0}to{opacity:1}}',

    /* ── Panel (bottom sheet mobile, centered desktop) ── */
    '.coach-panel{background:rgba(10,10,18,0.97);border:1px solid rgba(255,255,255,0.06);border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:90vh;height:90vh;display:flex;flex-direction:column;backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);animation:coachSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;font-family:"Outfit","Nunito",sans-serif;}',
    '@keyframes coachSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '@media(min-width:900px){.coach-panel{border-radius:20px;max-height:80vh;height:80vh;margin-bottom:20px;}}',

    /* ── Header ── */
    '.coach-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;}',
    '.coach-header-left{display:flex;align-items:center;gap:10px;}',
    '.coach-header-title{font-size:17px;font-weight:800;color:#F0EDE6;display:flex;align-items:center;gap:8px;}',
    '.coach-header-close{width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}',
    '.coach-header-close:hover{background:rgba(255,255,255,0.10);color:#fff;}',

    /* ── Body (scrollable) ── */
    '.coach-body{flex:1;overflow-y:auto;padding:16px 20px;overscroll-behavior:contain;}',
    '.coach-body::-webkit-scrollbar{width:4px;}',
    '.coach-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}',

    /* ── Section badge ── */
    '.coach-section-badge{font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(201,168,76,0.10);border:1px solid rgba(201,168,76,0.20);color:#C9A84C;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;}',

    /* ── Task Card ── */
    '.coach-task{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden;}',
    '.coach-task::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);}',
    '.coach-task-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}',
    '.coach-task-counter{font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;text-transform:uppercase;letter-spacing:1px;}',
    '.coach-task-content{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;}',
    '.coach-task-icon{font-size:28px;flex-shrink:0;}',
    '.coach-task-title{font-size:15px;font-weight:700;color:#fff;}',
    '.coach-task-desc{font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px;line-height:1.4;}',
    '.coach-task-actions{display:flex;gap:8px;}',

    /* ── Task Buttons ── */
    '.coach-task-btn{padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:"Outfit","Nunito",sans-serif;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);}',
    '.coach-task-btn:active{transform:scale(0.95);}',
    '.coach-task-btn-primary{background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;}',
    '.coach-task-btn-primary:hover{box-shadow:0 4px 16px rgba(201,168,76,0.3);transform:translateY(-1px);}',
    '.coach-task-btn-secondary{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.6);}',
    '.coach-task-btn-secondary:hover{background:rgba(255,255,255,0.10);color:#fff;}',

    /* ── Progress Dots ── */
    '.coach-progress{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:12px;}',
    '.coach-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.1);transition:all 0.3s;}',
    '.coach-dot-active{background:#C9A84C;box-shadow:0 0 8px rgba(201,168,76,0.4);}',
    '.coach-dot-done{background:#1D9E75;}',

    /* ── Tools Grid ── */
    '.coach-tools-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;}',
    '.coach-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}',
    '.coach-tool{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);}',
    '.coach-tool:hover{border-color:rgba(201,168,76,0.25);transform:translateY(-2px);background:rgba(201,168,76,0.04);}',
    '.coach-tool:active{transform:scale(0.95);}',
    '.coach-tool-icon{font-size:24px;margin-bottom:4px;}',
    '.coach-tool-name{font-size:9px;color:rgba(255,255,255,0.5);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}',

    /* ── Tool Sub-view ── */
    '.coach-toolview{animation:coachFadeIn 0.2s ease;}',
    '.coach-toolview-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;}',
    '.coach-toolview-back{width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}',
    '.coach-toolview-back:hover{background:rgba(255,255,255,0.10);color:#fff;}',
    '.coach-toolview-title{font-size:16px;font-weight:700;color:#F0EDE6;}',
    '.coach-toolview-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:12px;}',

    /* ── Rank Progress Bar ── */
    '.coach-rank-bar-bg{width:100%;height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;margin:8px 0;}',
    '.coach-rank-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#C9A84C,#E8D48B);transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1);}',

    /* ── Stat Row ── */
    '.coach-stat-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);}',
    '.coach-stat-row:last-child{border-bottom:none;}',
    '.coach-stat-label{font-size:13px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:6px;}',
    '.coach-stat-value{font-size:14px;font-weight:700;color:#F0EDE6;}',

    /* ── Chat Area ── */
    '.coach-chat{margin-top:16px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;}',
    '.coach-chat-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;}',
    '.coach-chat-messages{max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}',
    '.coach-chat-msg{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;max-width:85%;word-wrap:break-word;}',
    '.coach-chat-msg-user{background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.20);color:#F0EDE6;align-self:flex-end;border-bottom-right-radius:4px;}',
    '.coach-chat-msg-ai{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);align-self:flex-start;border-bottom-left-radius:4px;}',
    '.coach-chat-typing{font-size:12px;color:rgba(255,255,255,0.3);padding:6px 0;font-style:italic;}',

    /* ── Input Bar ── */
    '.coach-input-bar{display:flex;gap:8px;padding:12px 20px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;background:rgba(10,10,18,0.95);}',
    '.coach-input{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#F0EDE6;font-size:14px;padding:10px 14px;outline:none;font-family:"Outfit","Nunito",sans-serif;}',
    '.coach-input::placeholder{color:rgba(255,255,255,0.25);}',
    '.coach-input:focus{border-color:rgba(201,168,76,0.30);}',
    '.coach-send-btn{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#C9A84C,#E8D48B);border:none;color:#0a0a12;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);font-weight:700;}',
    '.coach-send-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(201,168,76,0.3);}',
    '.coach-send-btn:active{transform:scale(0.95);}',
    '.coach-mic-btn{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.5);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}',
    '.coach-mic-btn:hover{background:rgba(255,255,255,0.10);color:#fff;}',
    '.coach-mic-btn.recording{background:rgba(220,38,38,0.2);border-color:rgba(220,38,38,0.4);color:#DC2626;animation:coachPulse 1.5s infinite;}',
    '@keyframes coachPulse{0%,100%{opacity:1}50%{opacity:0.5}}',

    /* ── Placeholder ── */
    '.coach-placeholder{text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3);}',
    '.coach-placeholder-icon{font-size:48px;margin-bottom:12px;}',
    '.coach-placeholder-title{font-size:16px;font-weight:700;color:rgba(255,255,255,0.5);margin-bottom:4px;}',
    '.coach-placeholder-text{font-size:12px;line-height:1.5;}',

    /* ── All-clear state ── */
    '.coach-allclear{text-align:center;padding:30px;color:rgba(255,255,255,0.3);}',
    '.coach-allclear-icon{font-size:48px;margin-bottom:12px;}',
    '.coach-allclear-title{font-size:15px;font-weight:700;color:#1D9E75;}',
    '.coach-allclear-sub{font-size:12px;margin-top:6px;}',

    /* ── Mobile: raise FAB above other floating elements ── */
    '@media(max-width:768px){.coach-fab{bottom:80px;right:16px;width:50px;height:50px;font-size:20px;}}',

    /* ── goldShimmer (shared keyframes, may already exist) ── */
    '@keyframes goldShimmer{0%{background-position:200% center}100%{background-position:-200% center}}'

  ].join('\n');
  document.head.appendChild(css);
}


// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function _safe(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSectionName(sec) {
  var names = {
    home: 'Inicio',
    prospectos: 'Sky Prospects',
    skysales: 'Sky Sales',
    agenda: 'Sky Day',
    'sky-tv': 'Sky TV',
    skyteam: 'Sky Team',
    comunidad: 'Comunidad',
    ranking: 'Ranking'
  };
  return names[sec] || sec;
}

function getSectionEmoji(sec) {
  var emojis = {
    home: '\uD83C\uDFE0', prospectos: '\uD83D\uDCCB', skysales: '\uD83D\uDCB0',
    agenda: '\uD83D\uDCC5', 'sky-tv': '\uD83D\uDCFA', skyteam: '\uD83D\uDC65',
    comunidad: '\uD83C\uDF10', ranking: '\uD83C\uDFC6'
  };
  return emojis[sec] || '\uD83D\uDE80';
}


// ═══════════════════════════════════════════════════════════════
//  SECTION DETECTION
// ═══════════════════════════════════════════════════════════════

function detectCurrentSection() {
  var active = document.querySelector('.section.active');
  if (!active) {
    coachState.section = 'home';
    return 'home';
  }
  var id = active.id.replace('section-', '');
  coachState.section = id;
  return id;
}


// ═══════════════════════════════════════════════════════════════
//  TASK GENERATION
// ═══════════════════════════════════════════════════════════════

function generateTasks() {
  var tasks = [];
  var sec = coachState.section;
  var prospects = window.crmProspectos || [];
  var bookings = window.agendaBookings || [];
  var now = Date.now();

  // ── Global: Hot prospects needing follow-up ──
  if (prospects && prospects.length > 0) {
    prospects.forEach(function(p) {
      if (!p) return;
      var temp = p.temperatura || 0;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;

      if (temp >= 70) {
        var lastUpdate = p.updated_at
          ? Math.ceil((now - new Date(p.updated_at).getTime()) / 86400000)
          : 999;
        if (lastUpdate >= 3) {
          tasks.push({
            priority: 1,
            type: 'prospect_followup',
            icon: '\uD83D\uDCDE',
            title: 'Contacta a ' + (p.nombre || 'Prospecto'),
            desc: 'Temperatura ' + temp + '% \u2014 lleva ' + lastUpdate + ' d\u00edas sin contacto',
            action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
            secondaryAction: { type: 'navigate', target: 'prospectos' }
          });
        }
      }
    });

    // ── Global: Cold prospects — >30 days without movement, not closed ──
    // Sugerencia de reactivación con modo RELACIONAL
    prospects.forEach(function(p) {
      if (!p || !p.updated_at) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      if (etapa === 'nuevo') return; // Los nuevos aún no son "fríos"
      var daysSince = Math.floor((now - new Date(p.updated_at).getTime()) / 86400000);
      if (daysSince < 30 || daysSince > 180) return; // entre 30 y 180 días
      tasks.push({
        priority: 2,
        type: 'reactivate_cold',
        icon: '\u2744\uFE0F',
        title: 'Reactiva a ' + (p.nombre || 'Prospecto'),
        desc: 'Lleva ' + daysSince + ' días sin movimiento — IA tiene un mensaje de reconexión listo',
        action: { type: 'navigate', target: 'prospectos' },
        secondaryAction: { type: 'whatsapp', phone: p.telefono, name: p.nombre }
      });
    });

    // ── Global: Prospects with fecha_cierre_estimada within next 7 days ──
    prospects.forEach(function(p) {
      if (!p || !p.fecha_cierre_estimada) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      var fc = new Date(p.fecha_cierre_estimada);
      if (isNaN(fc.getTime())) return;
      var diasRestantes = Math.ceil((fc.getTime() - now) / 86400000);
      if (diasRestantes < -1 || diasRestantes > 7) return;
      var urgencyIcon = diasRestantes <= 0 ? '\uD83D\uDD25' : diasRestantes <= 2 ? '\u26A1' : '\uD83D\uDCC5';
      var urgencyText = diasRestantes < 0 ? 'Venció hace ' + Math.abs(diasRestantes) + 'd \u2014 ¡urgente!'
        : diasRestantes === 0 ? '¡Cierra HOY!'
        : diasRestantes === 1 ? 'Cierra MAÑANA'
        : 'Cierra en ' + diasRestantes + ' días';
      tasks.push({
        priority: 0,
        type: 'close_soon',
        icon: urgencyIcon,
        title: 'Cierre próximo: ' + (p.nombre || 'Prospecto'),
        desc: urgencyText + (etapa ? ' \u2014 ' + etapa.replace('_',' ') : ''),
        action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
        secondaryAction: { type: 'navigate', target: 'prospectos' }
      });
    });
  }

  // ── Global: Upcoming meetings within 24 hours ──
  if (bookings && bookings.length > 0) {
    bookings.forEach(function(b) {
      if (!b || !b.fecha_iso) return;
      var dt = new Date(b.fecha_iso);
      var hoursUntil = (dt.getTime() - now) / 3600000;
      if (hoursUntil > 0 && hoursUntil <= 24) {
        tasks.push({
          priority: 0,
          type: 'upcoming_meeting',
          icon: '\uD83D\uDCC5',
          title: 'Cierre con ' + (b.nombre || 'Prospecto'),
          desc: 'Hoy a las ' + dt.getHours() + ':' + String(dt.getMinutes()).padStart(2, '0') + ' \u2014 prepara tu script',
          action: { type: 'tool', tool: 'script', context: b }
        });
      }
    });
  }

  // ── Section: Sky Prospects ──
  if (sec === 'prospectos' && prospects.length > 0) {
    // Prospects without notes
    prospects.forEach(function(p) {
      if (!p) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      if (!p.notas || String(p.notas).trim() === '') {
        tasks.push({
          priority: 2,
          type: 'add_notes',
          icon: '\uD83D\uDCDD',
          title: 'Agrega notas a ' + (p.nombre || 'Prospecto'),
          desc: 'Esta tarjeta no tiene comentarios \u2014 documenta tu seguimiento',
          action: { type: 'navigate', target: 'prospectos' }
        });
      }
    });

    // Prospects without ratings
    prospects.forEach(function(p) {
      if (!p) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      var hasRating = p.calif_positivo || p.calif_emprendedor || p.calif_dinero || p.calif_lider;
      if (!hasRating) {
        tasks.push({
          priority: 3,
          type: 'rate_prospect',
          icon: '\u2B50',
          title: 'Califica a ' + (p.nombre || 'Prospecto'),
          desc: 'Sin calificaci\u00f3n \u2014 eval\u00faa su potencial',
          action: { type: 'navigate', target: 'prospectos' }
        });
      }
    });

    // Cold prospects (low temperature, no recent activity)
    prospects.forEach(function(p) {
      if (!p) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      var temp = p.temperatura || 0;
      if (temp > 0 && temp < 30) {
        var daysSince = p.updated_at
          ? Math.ceil((now - new Date(p.updated_at).getTime()) / 86400000)
          : 999;
        if (daysSince >= 7) {
          tasks.push({
            priority: 4,
            type: 'revive_cold',
            icon: '\u2744\uFE0F',
            title: 'Reactivar a ' + (p.nombre || 'Prospecto'),
            desc: 'Temperatura baja (' + temp + '%) y ' + daysSince + ' d\u00edas inactivo',
            action: { type: 'whatsapp', phone: p.telefono, name: p.nombre }
          });
        }
      }
    });

    // Prospects without follow-up reminder
    crmProspectos.forEach(function(p) {
      if (p.etapa === 'cerrado_ganado' || p.etapa === 'cerrado_perdido') return;
      var lastUpdate = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 999;
      if (lastUpdate >= 5 && (p.temperatura || 0) < 70) {
        tasks.push({
          priority: 2, type: 'cold_prospect',
          icon: '\u2744\uFE0F', title: _safe(p.nombre || 'Prospecto') + ' se est\u00e1 enfriando',
          desc: 'Lleva ' + lastUpdate + ' d\u00edas sin actividad. Temperatura: ' + (p.temperatura||0) + '%',
          action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
          prospectId: p.id
        });
      }
    });

    // Suggest new prospect sources (if less than 5 active prospects)
    var activeProspects = crmProspectos.filter(function(p) { return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; });
    if (activeProspects.length < 5) {
      tasks.push({
        priority: 3, type: 'need_prospects',
        icon: '\uD83C\uDFAF', title: 'Necesitas m\u00e1s prospectos',
        desc: 'Solo tienes ' + activeProspects.length + ' prospectos activos. Toca para ver ideas.',
        action: { type: 'tool', tool: 'prospect_ideas' }
      });
    }

    // Prospects in "nuevo" stage for more than 3 days (not contacted)
    crmProspectos.forEach(function(p) {
      if (p.etapa !== 'nuevo') return;
      var daysSinceAdd = p.created_at ? Math.ceil((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
      if (daysSinceAdd >= 3) {
        tasks.push({
          priority: 1, type: 'contact_new',
          icon: '\uD83D\uDCDE', title: 'Contacta a ' + _safe(p.nombre || 'Prospecto'),
          desc: 'Lleva ' + daysSinceAdd + ' d\u00edas como Nuevo sin contactar. \u00a1No lo dejes enfriar!',
          action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
          prospectId: p.id
        });
      }
    });
  }

  // ── Section: Agenda — empty day ──
  if (sec === 'agenda') {
    var todayBookings = (bookings || []).filter(function(b) {
      if (!b || !b.fecha_iso) return false;
      var d = new Date(b.fecha_iso);
      var today = new Date();
      return d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    });
    if (todayBookings.length === 0) {
      tasks.push({
        priority: 2,
        type: 'schedule_meetings',
        icon: '\uD83D\uDCC6',
        title: 'Agenda una cita hoy',
        desc: 'No tienes citas programadas \u2014 agenda seguimiento con tus prospectos calientes',
        action: { type: 'navigate', target: 'agenda' }
      });
    }
  }

  // ── Section: Sky Sales ──
  if (sec === 'skysales') {
    tasks.push({
      priority: 5,
      type: 'review_sales',
      icon: '\uD83D\uDCC8',
      title: 'Revisa tu embudo de ventas',
      desc: 'Verifica tus avances del d\u00eda y actualiza tu pipeline',
      action: { type: 'navigate', target: 'skysales' }
    });
  }

  // Sort by priority (lower number = more urgent)
  tasks.sort(function(a, b) { return a.priority - b.priority; });

  // Cap at 20 tasks max for performance
  if (tasks.length > 20) tasks = tasks.slice(0, 20);

  coachState.tasks = tasks;
  coachState.taskIndex = 0;
}


// ═══════════════════════════════════════════════════════════════
//  FAB (Floating Action Button)
// ═══════════════════════════════════════════════════════════════

function updateFabDot() {
  var dot = document.getElementById('coach-fab-dot');
  if (!dot) return;
  var urgentCount = coachState.tasks.filter(function(t) {
    return t.priority <= 1;
  }).length;
  if (urgentCount > 0) {
    dot.textContent = urgentCount > 9 ? '9+' : String(urgentCount);
    dot.classList.add('visible');
  } else {
    dot.classList.remove('visible');
  }
}


// ═══════════════════════════════════════════════════════════════
//  OPEN / CLOSE
// ═══════════════════════════════════════════════════════════════

function openCoach() {
  coachState.open = true;
  coachState.tools = null;
  detectCurrentSection();
  generateTasks();

  // Hide fab
  var fab = document.getElementById('coach-fab');
  if (fab) fab.style.display = 'none';

  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'coach-overlay';
  overlay.id = 'coach-overlay';
  overlay.onclick = function(e) {
    if (e.target === overlay) closeCoach();
  };

  // Create panel
  var panel = document.createElement('div');
  panel.className = 'coach-panel';
  panel.id = 'coach-panel';
  panel.onclick = function(e) { e.stopPropagation(); };

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  renderCoachPanel();
}

function closeCoach() {
  var overlay = document.getElementById('coach-overlay');
  if (overlay) {
    overlay.style.animation = 'none';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }
  coachState.open = false;
  coachState.tools = null;

  // Show fab
  var fab = document.getElementById('coach-fab');
  if (fab) fab.style.display = 'flex';
}


// ═══════════════════════════════════════════════════════════════
//  RENDER PANEL
// ═══════════════════════════════════════════════════════════════

function renderCoachPanel() {
  var panel = document.getElementById('coach-panel');
  if (!panel) return;

  // ── Header ──
  var headerHTML = '<div class="coach-header">'
    + '<div class="coach-header-left">'
    + '<div class="coach-header-title">\uD83E\uDD16 Coach IA</div>'
    + '<span class="coach-section-badge">' + getSectionEmoji(coachState.section) + ' ' + _safe(getSectionName(coachState.section)) + '</span>'
    + '</div>'
    + '<button class="coach-header-close" onclick="closeCoach()" title="Cerrar">\u2715</button>'
    + '</div>';

  // ── Body ──
  var bodyHTML = '';

  if (coachState.tools) {
    // Show tool sub-view
    bodyHTML = renderToolView(coachState.tools);
  } else {
    // Current task card
    bodyHTML += renderCurrentTask();
    // Tools grid
    bodyHTML += renderTools();
    // Chat area
    bodyHTML += renderChat();
  }

  // ── Input bar ──
  var inputHTML = '<div class="coach-input-bar">'
    + '<input class="coach-input" id="coach-input" type="text" placeholder="Escribe al Coach IA..." autocomplete="off" />'
    + '<button class="coach-mic-btn' + (coachState.recording ? ' recording' : '') + '" id="coach-mic-btn" onclick="toggleCoachVoice()" title="Voz">\uD83C\uDFA4</button>'
    + '<button class="coach-send-btn" onclick="sendCoachMsgFromInput()" title="Enviar">\u27A4</button>'
    + '</div>';

  panel.innerHTML = headerHTML
    + '<div class="coach-body" id="coach-body">' + bodyHTML + '</div>'
    + inputHTML;

  // Enter key listener on input
  var inputEl = document.getElementById('coach-input');
  if (inputEl) {
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCoachMsgFromInput();
      }
    });
    // Focus after render if no tool is active
    if (!coachState.tools) {
      setTimeout(function() { inputEl.focus(); }, 100);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
//  RENDER: CURRENT TASK
// ═══════════════════════════════════════════════════════════════

function renderCurrentTask() {
  if (coachState.tasks.length === 0) {
    return '<div class="coach-allclear">'
      + '<div class="coach-allclear-icon">\uD83C\uDF89</div>'
      + '<div class="coach-allclear-title">\u00A1Todo al d\u00eda!</div>'
      + '<div class="coach-allclear-sub">No tienes acciones pendientes ahora.</div>'
      + '</div>';
  }

  var t = coachState.tasks[coachState.taskIndex];
  if (!t) {
    coachState.taskIndex = 0;
    t = coachState.tasks[0];
  }
  var total = coachState.tasks.length;
  var current = coachState.taskIndex + 1;

  var html = '<div class="coach-task">';

  // Meta row
  html += '<div class="coach-task-meta">';
  html += '<span class="coach-task-counter">Acci\u00f3n ' + current + ' de ' + total + '</span>';
  html += '<span class="coach-section-badge">' + _safe(getSectionName(coachState.section)) + '</span>';
  html += '</div>';

  // Content row
  html += '<div class="coach-task-content">';
  html += '<div class="coach-task-icon">' + t.icon + '</div>';
  html += '<div>';
  html += '<div class="coach-task-title">' + _safe(t.title) + '</div>';
  html += '<div class="coach-task-desc">' + _safe(t.desc) + '</div>';
  html += '</div>';
  html += '</div>';

  // Action buttons
  html += '<div class="coach-task-actions">';

  // WhatsApp button
  if (t.action && t.action.type === 'whatsapp' && t.action.phone) {
    var waNum = String(t.action.phone).replace(/[^0-9]/g, '');
    html += '<button class="coach-task-btn coach-task-btn-primary" onclick="window.open(\'https://wa.me/' + _safe(waNum) + '\',\'_blank\')">\uD83D\uDCF1 WhatsApp</button>';
  }

  // Tool action
  if (t.action && t.action.type === 'tool') {
    html += '<button class="coach-task-btn coach-task-btn-primary" onclick="openCoachTool(\'' + _safe(t.action.tool) + '\')">\uD83D\uDCA1 Abrir</button>';
  }

  // Done + Skip
  html += '<button class="coach-task-btn coach-task-btn-primary" onclick="coachCompleteTask()" style="flex:1;">\u2705 Hecho</button>';
  html += '<button class="coach-task-btn coach-task-btn-secondary" onclick="coachSkipTask()">\u23ED\uFE0F</button>';
  html += '</div>';

  // Progress dots
  html += '<div class="coach-progress">';
  var maxDots = Math.min(total, 12);
  for (var i = 0; i < maxDots; i++) {
    var cls = 'coach-dot';
    if (i < coachState.taskIndex) cls += ' coach-dot-done';
    else if (i === coachState.taskIndex) cls += ' coach-dot-active';
    html += '<div class="' + cls + '"></div>';
  }
  if (total > 12) {
    html += '<span style="font-size:9px;color:rgba(255,255,255,0.3);margin-left:4px;">+' + (total - 12) + '</span>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  RENDER: TOOLS GRID
// ═══════════════════════════════════════════════════════════════

function renderTools() {
  var sec = coachState.section;
  var tools;

  if (sec === 'prospectos') {
    tools = [
      { id: 'crm_analyze', icon: '🔍', name: 'Analizar' },
      { id: 'crm_voice_note', icon: '🎤', name: 'Voz→Nota' },
      { id: 'crm_message', icon: '💬', name: 'Mensaje IA' },
      { id: 'prospect_ideas', icon: '💡', name: 'Ideas' },
      { id: 'crm_reminder', icon: '⏰', name: 'Recordar' },
      { id: 'crm_rating', icon: '⭐', name: 'Calificar' },
      { id: 'crm_agendar', icon: '📅', name: 'Agendar' },
      { id: 'crm_pipeline', icon: '📊', name: 'Pipeline' },
      { id: 'crm_mover', icon: '🔄', name: 'Mover Etapa' },
      { id: 'crm_checklist', icon: '📋', name: 'Checklist' },
      { id: 'crm_prediccion', icon: '🎯', name: 'Predicción' },
      { id: 'crm_autoseg', icon: '🔔', name: 'Auto-Seguim.' }
    ];
  } else {
    tools = [
      { id: 'simulador', icon: '\uD83C\uDFAF', name: 'Simulador' },
      { id: 'script',    icon: '\uD83D\uDCAC', name: 'Script IA' },
      { id: 'roleplay',  icon: '\uD83C\uDFAD', name: 'Roleplay' },
      { id: 'plan',      icon: '\uD83D\uDCCB', name: 'Plan Semanal' },
      { id: 'desafios',  icon: '\uD83C\uDFC6', name: 'Desaf\u00edos' },
      { id: 'voz',       icon: '\uD83C\uDFA4', name: 'Voz' },
      { id: 'seguimiento', icon: '\uD83D\uDCF1', name: 'Seguimiento' },
      { id: 'estado',    icon: '\uD83D\uDCCA', name: 'Mi Estado' }
    ];
  }

  var html = '<div style="margin-top:20px;">';
  html += '<div class="coach-tools-label">Herramientas</div>';
  html += '<div class="coach-tools">';
  tools.forEach(function(t) {
    html += '<div class="coach-tool" onclick="openCoachTool(\'' + t.id + '\')">';
    html += '<div class="coach-tool-icon">' + t.icon + '</div>';
    html += '<div class="coach-tool-name">' + t.name + '</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  RENDER: TOOL SUB-VIEWS
// ═══════════════════════════════════════════════════════════════

function renderToolView(toolId) {
  var toolNames = {
    simulador: '\uD83C\uDFAF Simulador de Rango',
    script: '\uD83D\uDCAC Script IA',
    roleplay: '\uD83C\uDFAD Roleplay',
    plan: '\uD83D\uDCCB Plan Semanal',
    desafios: '\uD83C\uDFC6 Desaf\u00edos',
    voz: '\uD83C\uDFA4 Entrenamiento de Voz',
    seguimiento: '\uD83D\uDCF1 Seguimiento',
    estado: '\uD83D\uDCCA Mi Estado',
    crm_analyze: '\uD83D\uDD0D An\u00e1lisis de CRM',
    crm_voice_note: '\uD83C\uDFA4 Nota por Voz',
    crm_message: '\uD83D\uDCAC Generar Mensaje',
    prospect_ideas: '\uD83D\uDCA1 Ideas Prospectos',
    crm_reminder: '\u23F0 Recordatorio',
    crm_rating: '\u2B50 Calificar Prospecto',
    crm_agendar: '📅 Agendar Cierre',
    crm_pipeline: '📊 Pipeline',
    crm_mover: '🔄 Mover Etapa',
    crm_checklist: '📋 Checklist de Cierre',
    crm_prediccion: '🎯 Predicción',
    crm_autoseg: '🔔 Auto-Seguimiento'
  };

  var html = '<div class="coach-toolview">';

  // Back button + title
  html += '<div class="coach-toolview-header">';
  html += '<button class="coach-toolview-back" onclick="openCoachTool(null)">\u2190</button>';
  html += '<div class="coach-toolview-title">' + (toolNames[toolId] || toolId) + '</div>';
  html += '</div>';

  // Render specific tool content
  switch (toolId) {
    case 'simulador':
      html += renderToolSimulador();
      break;
    case 'script':
      html += renderToolScript();
      break;
    case 'estado':
      html += renderToolEstado();
      break;
    case 'crm_analyze':
      html += renderToolCrmAnalyze();
      break;
    case 'crm_voice_note':
      html += renderToolCrmVoiceNote();
      break;
    case 'crm_message':
      html += renderToolCrmMessage();
      break;
    case 'prospect_ideas':
      html += renderToolProspectIdeas();
      break;
    case 'crm_reminder':
      html += renderToolCrmReminder();
      break;
    case 'crm_rating':
      html += renderToolCrmRating();
      break;
    case 'crm_agendar':
      html += renderToolCrmAgendar();
      break;
    case 'crm_pipeline':
      html += renderToolCrmPipeline();
      break;
    case 'crm_mover':
      html += renderToolCrmMover();
      break;
    case 'crm_checklist':
      html += renderToolCrmChecklist();
      break;
    case 'crm_prediccion':
      html += renderToolCrmPrediccion();
      break;
    case 'crm_autoseg':
      html += renderToolCrmAutoseg();
      break;
    case 'roleplay':
      html += renderToolRoleplay();
      break;
    case 'plan':
      html += renderToolPlan();
      break;
    case 'desafios':
      html += renderToolDesafios();
      break;
    case 'voz':
      html += renderToolVoz();
      break;
    case 'seguimiento':
      html += renderToolSeguimiento();
      break;
    default:
      html += renderToolPlaceholder(toolId);
      break;
  }

  html += '</div>';
  return html;
}


// ── Tool: Simulador de Rango ──────────────────────────────────

function renderToolSimulador() {
  var html = '';
  var user = window.currentUserProfile || window.userProfile || null;
  var rankName = 'Asociado';
  var rankLevel = 0;

  if (user) {
    rankName = user.rank || user.rango || 'Asociado';
    rankLevel = user.rank_level || 0;
  }

  var ranks = [
    { name: 'Cliente', level: 0, ventas: 0, equipo: 0 },
    { name: 'INN 200', level: 1, ventas: 2, equipo: 1 },
    { name: 'INN 500', level: 2, ventas: 5, equipo: 3 },
    { name: 'NOVA 1500', level: 3, ventas: 10, equipo: 8 },
    { name: 'NOVA 5K', level: 4, ventas: 20, equipo: 15 },
    { name: 'NOVA 10K', level: 5, ventas: 40, equipo: 30 },
    { name: 'NOVA DIAMOND', level: 6, ventas: 80, equipo: 60 },
    { name: 'NOVA 50K', level: 7, ventas: 150, equipo: 100 },
    { name: 'NOVA 100K', level: 8, ventas: 300, equipo: 200 }
  ];

  // Find current and next rank
  var currentRank = ranks[0];
  var nextRank = ranks[1];
  for (var i = 0; i < ranks.length; i++) {
    if (ranks[i].name.toLowerCase() === rankName.toLowerCase() || ranks[i].level === rankLevel) {
      currentRank = ranks[i];
      nextRank = ranks[i + 1] || null;
      break;
    }
  }

  // Current rank card
  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Tu rango actual</div>';
  html += '<div style="font-size:24px;font-weight:800;color:#E8D48B;">' + _safe(currentRank.name) + '</div>';
  html += '</div>';

  // Next rank progress
  if (nextRank) {
    var prospects = window.crmProspectos || [];
    var totalSales = prospects.filter(function(p) { return p && p.etapa === 'cerrado_ganado'; }).length;
    var totalTeam = 0;
    if (window.stState && window.stState.data) {
      totalTeam = (window.stState.data.frontline || []).length;
    }

    var salesPct = Math.min(100, Math.round((totalSales / Math.max(nextRank.ventas, 1)) * 100));
    var teamPct = Math.min(100, Math.round((totalTeam / Math.max(nextRank.equipo, 1)) * 100));

    html += '<div class="coach-toolview-card">';
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Siguiente: ' + _safe(nextRank.name) + '</div>';

    // Sales progress
    html += '<div class="coach-stat-row" style="border:none;padding:6px 0;">';
    html += '<span class="coach-stat-label">\uD83D\uDCB0 Ventas</span>';
    html += '<span class="coach-stat-value">' + totalSales + ' / ' + nextRank.ventas + '</span>';
    html += '</div>';
    html += '<div class="coach-rank-bar-bg"><div class="coach-rank-bar-fill" style="width:' + salesPct + '%;"></div></div>';

    // Team progress
    html += '<div class="coach-stat-row" style="border:none;padding:6px 0;margin-top:8px;">';
    html += '<span class="coach-stat-label">\uD83D\uDC65 Equipo</span>';
    html += '<span class="coach-stat-value">' + totalTeam + ' / ' + nextRank.equipo + '</span>';
    html += '</div>';
    html += '<div class="coach-rank-bar-bg"><div class="coach-rank-bar-fill" style="width:' + teamPct + '%;"></div></div>';

    // Remaining
    var salesLeft = Math.max(0, nextRank.ventas - totalSales);
    var teamLeft = Math.max(0, nextRank.equipo - totalTeam);
    html += '<div style="margin-top:12px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;">';
    html += 'Te faltan <strong style="color:#E8D48B;">' + salesLeft + ' ventas</strong>';
    html += ' y <strong style="color:#E8D48B;">' + teamLeft + ' miembros</strong> para avanzar.';
    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="coach-toolview-card">';
    html += '<div style="text-align:center;padding:16px;color:#1D9E75;font-weight:700;">\u00A1Has alcanzado el rango m\u00e1ximo!</div>';
    html += '</div>';
  }

  return html;
}


// ── Tool: Script IA ───────────────────────────────────────────

function renderToolScript() {
  var html = '';
  var prospects = window.crmProspectos || [];
  var activeProspects = prospects.filter(function(p) {
    return p && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido';
  });

  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:10px;">Selecciona un prospecto o describe el escenario:</div>';

  // Quick-select prospects
  if (activeProspects.length > 0) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    var shown = activeProspects.slice(0, 6);
    shown.forEach(function(p) {
      var name = _safe(p.nombre || 'Sin nombre');
      html += '<button class="coach-task-btn coach-task-btn-secondary" style="font-size:11px;padding:6px 12px;" '
        + 'onclick="requestCoachScript(\'' + _safe(String(p.nombre || '').replace(/'/g, '')) + '\')">'
        + name + '</button>';
    });
    html += '</div>';
  }

  // Scenario input
  html += '<textarea id="coach-script-input" style="width:100%;min-height:80px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0EDE6;padding:10px;font-size:13px;font-family:Outfit,Nunito,sans-serif;resize:vertical;outline:none;" placeholder="Ej: Primer contacto con alguien interesado en trading..."></textarea>';
  html += '<button class="coach-task-btn coach-task-btn-primary" style="width:100%;margin-top:10px;" onclick="generateCoachScript()">\uD83D\uDCAC Generar Script</button>';
  html += '</div>';

  // Output area
  html += '<div id="coach-script-output"></div>';

  return html;
}


// ── Tool: Mi Estado ───────────────────────────────────────────

function renderToolEstado() {
  var html = '';
  var prospects = window.crmProspectos || [];
  var bookings = window.agendaBookings || [];

  // Prospect stats
  var total = prospects.length;
  var hot = prospects.filter(function(p) { return p && (p.temperatura || 0) >= 70; }).length;
  var won = prospects.filter(function(p) { return p && p.etapa === 'cerrado_ganado'; }).length;
  var lost = prospects.filter(function(p) { return p && p.etapa === 'cerrado_perdido'; }).length;
  var active = total - won - lost;

  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Sky Prospects</div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCCB Total prospectos</span><span class="coach-stat-value">' + total + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDD25 Calientes (70%+)</span><span class="coach-stat-value" style="color:#E8D48B;">' + hot + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\u2705 Cerrados ganados</span><span class="coach-stat-value" style="color:#1D9E75;">' + won + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\u274C Cerrados perdidos</span><span class="coach-stat-value" style="color:#E24B4A;">' + lost + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCCA Activos</span><span class="coach-stat-value">' + active + '</span></div>';
  html += '</div>';

  // Agenda stats
  var todayCount = 0;
  var weekCount = 0;
  var now = new Date();
  var weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  bookings.forEach(function(b) {
    if (!b || !b.fecha_iso) return;
    var d = new Date(b.fecha_iso);
    if (d.toDateString() === now.toDateString()) todayCount++;
    if (d >= now && d <= weekEnd) weekCount++;
  });

  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Sky Day</div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCC5 Citas hoy</span><span class="coach-stat-value">' + todayCount + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCC6 Citas esta semana</span><span class="coach-stat-value">' + weekCount + '</span></div>';
  html += '</div>';

  // Conversion rate
  if (total > 0) {
    var convRate = Math.round((won / total) * 100);
    html += '<div class="coach-toolview-card">';
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Conversi\u00f3n</div>';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:36px;font-weight:800;color:' + (convRate >= 20 ? '#1D9E75' : convRate >= 10 ? '#E8D48B' : '#E24B4A') + ';">' + convRate + '%</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">tasa de cierre global</div>';
    html += '</div>';
    html += '<div class="coach-rank-bar-bg" style="margin-top:10px;"><div class="coach-rank-bar-fill" style="width:' + convRate + '%;background:' + (convRate >= 20 ? '#1D9E75' : convRate >= 10 ? '#E8D48B' : '#E24B4A') + ';"></div></div>';
    html += '</div>';
  }

  return html;
}


// ── Tool: Placeholder (Pr\u00f3ximamente) ──

function renderToolPlaceholder(toolId) {
  var tips = {
    roleplay: 'Practica conversaciones de venta con un prospecto simulado por IA.',
    plan: 'Genera un plan semanal personalizado basado en tus m\u00e9tricas actuales.',
    desafios: 'Desaf\u00edos diarios para mejorar tus habilidades de cierre.',
    voz: 'Graba y analiza tu pitch de venta para mejorar tu comunicaci\u00f3n.',
    seguimiento: 'Automatiza recordatorios y seguimiento de prospectos.'
  };
  var tip = tips[toolId] || 'Esta herramienta est\u00e1 en desarrollo.';

  return '<div class="coach-placeholder">'
    + '<div class="coach-placeholder-icon">\uD83D\uDE80</div>'
    + '<div class="coach-placeholder-title">Pr\u00f3ximamente</div>'
    + '<div class="coach-placeholder-text">' + _safe(tip) + '</div>'
    + '</div>';
}


// ═══════════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════════

function renderChat() {
  var html = '<div class="coach-chat">';
  html += '<div class="coach-chat-label">Chat con Coach IA</div>';
  html += '<div class="coach-chat-messages" id="coach-chat-messages">';

  if (coachState.chatHistory.length === 0) {
    html += '<div class="coach-chat-msg coach-chat-msg-ai">'
      + '\u00A1Hola! Soy tu Coach IA. '
      + 'Puedo ayudarte con scripts de venta, estrategias de seguimiento, '
      + 'y consejos para avanzar de rango. \u00BFEn qu\u00e9 puedo ayudarte?'
      + '</div>';
  } else {
    coachState.chatHistory.forEach(function(msg) {
      var cls = msg.role === 'user' ? 'coach-chat-msg-user' : 'coach-chat-msg-ai';
      html += '<div class="coach-chat-msg ' + cls + '">' + _safe(msg.text) + '</div>';
    });
  }

  if (coachState.chatLoading) {
    html += '<div class="coach-chat-typing">Coach IA est\u00e1 pensando...</div>';
  }

  html += '</div>';
  html += '</div>';
  return html;
}

function sendCoachMsgFromInput() {
  // Stop recording if active
  if (coachState.recording && coachState.recognition) {
    coachState.recording = false;
    coachState.recognition.stop();
    updateMicButton();
  }
  var input = document.getElementById('coach-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendCoachMessage(text);
}

function sendCoachMessage(text) {
  if (!text || coachState.chatLoading) return;

  // ── CRM INTENT DETECTION — execute voice commands directly ──
  var intent = detectCrmIntent(text);
  if (intent && intent.prospect) {
    coachState.chatHistory.push({ role: 'user', text: text });
    coachState.chatLoading = true;
    renderCoachPanel();
    scrollChatToBottom();

    executeCrmAction(intent).then(function(result) {
      coachState.chatLoading = false;
      if (result && result.msg) {
        coachState.chatHistory.push({ role: 'assistant', text: result.msg });
        if (result.ok && typeof showToast === 'function') {
          showToast(result.msg.replace(/\*\*/g, '').replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '').trim());
        }
        // Refresh CRM data
        if (typeof crmLoadData === 'function') setTimeout(crmLoadData, 500);
      } else {
        coachState.chatHistory.push({ role: 'assistant', text: 'No pude ejecutar la acci\u00f3n. Int\u00e9ntalo de nuevo.' });
      }
      renderCoachPanel();
      scrollChatToBottom();
    }).catch(function() {
      coachState.chatLoading = false;
      coachState.chatHistory.push({ role: 'assistant', text: 'Error ejecutando la acci\u00f3n. Verifica tu conexi\u00f3n.' });
      renderCoachPanel();
      scrollChatToBottom();
    });
    return;
  }

  // ── Normal AI chat (no CRM intent detected) ──

  // Add user message
  coachState.chatHistory.push({ role: 'user', text: text });
  coachState.chatLoading = true;
  renderCoachPanel();

  // Scroll chat to bottom
  scrollChatToBottom();

  // Build context-aware system prompt
  var sec = coachState.section;
  var contextInfo = 'Secci\u00f3n actual: ' + getSectionName(sec) + '. ';
  var prospects = window.crmProspectos || [];

  if (prospects.length > 0) {
    var hot = prospects.filter(function(p) { return p && (p.temperatura || 0) >= 70; }).length;
    var total = prospects.length;
    contextInfo += 'Prospectos: ' + total + ' total, ' + hot + ' calientes. ';
  }

  // Add prospect names for AI context
  var prospectNames = prospects.slice(0, 10).map(function(p) { return (p.nombre || '?') + '(' + (p.etapa || 'nuevo') + ',' + (p.temperatura || 0) + '%)'; }).join(', ');
  if (prospectNames) contextInfo += 'Prospectos activos: ' + prospectNames + '. ';

  // BANKCODE personality context for AI personalization
  var bankInfo = '';
  if (typeof CU !== 'undefined' && CU) {
    if (CU.bankcode) {
      var _bkNames = {B:'Blueprint (planificador)',A:'Action (ejecutor)',N:'Nurturing (empatico)',K:'Knowledge (analitico)'};
      var _dominant = CU.bankcode[0];
      bankInfo += 'PERFIL DEL USUARIO: Codigo BANKCODE=' + CU.bankcode + '. Tipo dominante: ' + (_bkNames[_dominant]||'') + '. ';
    }
    if (CU.profession) bankInfo += 'Profesion: ' + CU.profession + '. ';
    if (CU.income_goal) bankInfo += 'Meta mensual: $' + CU.income_goal + ' USD. ';
    if (CU.comm_style) bankInfo += 'Estilo de comunicacion: ' + CU.comm_style + '. ';
    if (bankInfo) bankInfo += 'ADAPTA tu lenguaje y estilo al perfil del usuario. ';
    // If on SkyTeam section, add team member BANKCODEs for coaching advice
    if (sec === 'skyteam' && typeof stState !== 'undefined' && stState.data && stState.data.members) {
      var teamCtx = 'EQUIPO DEL LIDER: ';
      var _bkTipsCoach = {B:'planificador, dale estructura',A:'ejecutor, motivalo con accion',N:'empatico, conecta emocionalmente',K:'analitico, dale datos y evidencia'};
      stState.data.members.slice(0, 15).forEach(function(m) {
        if (m.bankcode) {
          teamCtx += (m.name||m.username) + '(BANK:' + m.bankcode + ',' + (_bkTipsCoach[m.bankcode[0]]||'') + ') ';
        } else {
          teamCtx += (m.name||m.username) + '(sin BANK) ';
        }
      });
      bankInfo += teamCtx + 'Cuando el lider pregunte sobre un miembro, dale consejos de como hablarle segun su BANKCODE. ';
    }
  }

  var systemPrompt = 'Eres Coach IA, un asistente de ventas y network marketing para la plataforma SkyTeam. '
    + 'Respondes de forma breve, directa y motivacional. '
    + 'Das consejos pr\u00e1cticos sobre ventas, seguimiento de prospectos, cierre y crecimiento de red. '
    + bankInfo
    + contextInfo
    + 'IMPORTANTE: Puedes ejecutar acciones por comando de voz. Si el usuario quiere hacer algo sobre un prospecto, gu\u00edalo con el formato correcto: '
    + '"agrega nota a [nombre]: [nota]", "sube temperatura de [nombre] a [N]", "mueve a [nombre] a [etapa]", '
    + '"califica a [nombre] con [N]", "pon recordatorio para [nombre] ma\u00f1ana", "genera mensaje para [nombre]". '
    + 'Responde en espa\u00f1ol. M\u00e1ximo 3-4 oraciones.';

  // Build messages array (Anthropic format — system separate, messages user/assistant only)
  var apiMessages = [];
  var historySlice = coachState.chatHistory.slice(-10);
  historySlice.forEach(function(m) {
    apiMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
  });

  // Call API (Anthropic format)
  var fetchFn = typeof _skyFetch === 'function' ? _skyFetch : fetch;
  fetchFn('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: apiMessages
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var reply = 'Lo siento, no pude procesar tu mensaje. Verifica tu conexión.';
    if (data && data.content && data.content[0] && data.content[0].text) {
      reply = data.content[0].text;
    } else if (data && data.reply) {
      reply = data.reply;
    }
    coachState.chatHistory.push({ role: 'assistant', text: reply });
    coachState.chatLoading = false;
    renderCoachPanel();
    scrollChatToBottom();
  })
  .catch(function(err) {
    console.error('[Coach IA] Chat error:', err);
    coachState.chatHistory.push({
      role: 'assistant',
      text: 'Hubo un error al conectar con el servidor. Int\u00e9ntalo de nuevo.'
    });
    coachState.chatLoading = false;
    renderCoachPanel();
    scrollChatToBottom();
  });
}

function scrollChatToBottom() {
  setTimeout(function() {
    var msgs = document.getElementById('coach-chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}


// ═══════════════════════════════════════════════════════════════
//  SCRIPT GENERATION (Script IA Tool)
// ═══════════════════════════════════════════════════════════════

function requestCoachScript(prospectName) {
  var textarea = document.getElementById('coach-script-input');
  if (textarea) {
    textarea.value = 'Script de seguimiento para ' + prospectName;
  }
  generateCoachScript();
}

function generateCoachScript() {
  var textarea = document.getElementById('coach-script-input');
  var output = document.getElementById('coach-script-output');
  if (!textarea || !output) return;

  var scenario = textarea.value.trim();
  if (!scenario) {
    output.innerHTML = '<div style="color:#E24B4A;font-size:12px;padding:8px;">Describe el escenario o selecciona un prospecto.</div>';
    return;
  }

  output.innerHTML = '<div class="coach-toolview-card"><div class="coach-chat-typing">Generando script...</div></div>';

  var systemPrompt = 'Eres un experto en ventas y network marketing. '
    + 'Genera un script de conversaci\u00f3n breve y efectivo para el siguiente escenario. '
    + 'Formato: saludo, preguntas de descubrimiento, presentaci\u00f3n del valor, y cierre. '
    + 'M\u00e1ximo 200 palabras. En espa\u00f1ol.';

  var messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: scenario }
  ];

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'script',
      systemPrompt: systemPrompt,
      messages: [{ role: 'user', content: scenario }]
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var reply = '';
    // Try all possible response formats
    if (data && data.reply) {
      reply = data.reply;
    } else if (data && data.content && data.content[0] && data.content[0].text) {
      reply = data.content[0].text;
    } else if (data && data.choices && data.choices[0]) {
      reply = data.choices[0].message ? data.choices[0].message.content : (data.choices[0].text || '');
    }
    if (!reply) {
      reply = 'No se pudo generar el script. Int\u00e9ntalo de nuevo.';
    }

    output.innerHTML = '<div class="coach-toolview-card">'
      + '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">\uD83D\uDCAC Script Generado</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.6;white-space:pre-wrap;">' + _safe(reply) + '</div>'
      + '<button class="coach-task-btn coach-task-btn-secondary" style="margin-top:12px;font-size:11px;" onclick="copyCoachScript(this)">Copiar al portapapeles</button>'
      + '</div>';
  })
  .catch(function(err) {
    console.error('[Coach IA] Script generation error:', err);
    output.innerHTML = '<div class="coach-toolview-card" style="border-color:rgba(226,75,74,0.3);">'
      + '<div style="color:#E24B4A;font-size:13px;">Error al generar el script. Verifica tu conexi\u00f3n.</div>'
      + '</div>';
  });
}

function copyCoachScript(btn) {
  var card = btn.parentElement;
  var scriptEl = card.querySelector('div[style*="white-space"]');
  if (!scriptEl) return;
  var text = scriptEl.textContent || scriptEl.innerText;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = '\u2705 Copiado';
      setTimeout(function() { btn.textContent = 'Copiar al portapapeles'; }, 2000);
    });
  } else {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); btn.textContent = '\u2705 Copiado'; } catch(e) {}
    document.body.removeChild(ta);
    setTimeout(function() { btn.textContent = 'Copiar al portapapeles'; }, 2000);
  }
}


// ═══════════════════════════════════════════════════════════════
//  TOOL: DESAFÍOS DIARIOS
// ═══════════════════════════════════════════════════════════════

var DESAFIOS_POOL = [
  {icon:'\uD83D\uDCDE',title:'Contacta 3 prospectos nuevos',desc:'Abre 3 conversaciones nuevas hoy con personas que no has contactado.',dif:'Facil'},
  {icon:'\uD83D\uDD25',title:'Seguimiento a todos tus calientes',desc:'Contacta a cada prospecto con +70% de temperatura.',dif:'Medio'},
  {icon:'\uD83C\uDFAF',title:'Cierra 1 venta hoy',desc:'Enfocate en tu prospecto mas caliente y llega al cierre.',dif:'Dificil'},
  {icon:'\uD83D\uDCDD',title:'Agrega notas a 5 prospectos',desc:'Documenta en que etapa esta cada uno y que hablaron.',dif:'Facil'},
  {icon:'\uD83E\uDD1D',title:'Pide 2 referidos',desc:'Contacta clientes o socios y pideles que te refieran a alguien.',dif:'Medio'},
  {icon:'\uD83D\uDCCA',title:'Haz 2 presentaciones del negocio',desc:'Presenta la oportunidad a 2 personas hoy.',dif:'Medio'},
  {icon:'\uD83D\uDCAC',title:'Practica tu pitch 3 veces',desc:'Usa la herramienta de Voz para grabar y mejorar tu discurso.',dif:'Facil'},
  {icon:'\uD83D\uDCF1',title:'Envia 5 mensajes de seguimiento',desc:'Reabre conversaciones con prospectos tibios.',dif:'Medio'},
  {icon:'\uD83C\uDF1F',title:'Publica 1 historia en Instagram',desc:'Comparte un testimonio, resultado o contenido de valor.',dif:'Facil'},
  {icon:'\uD83D\uDCC5',title:'Agenda 2 reuniones esta semana',desc:'Invita prospectos calientes a una llamada o videollamada.',dif:'Medio'},
  {icon:'\uD83D\uDCA1',title:'Aprende 1 leccion de la academia',desc:'Completa un video de capacitacion en Sky TV.',dif:'Facil'},
  {icon:'\uD83D\uDE80',title:'Invita a 1 persona a un evento',desc:'Comparte el link de tu proximo Sky Event.',dif:'Medio'},
  {icon:'\uD83C\uDFC6',title:'Logra que 1 prospecto diga SI',desc:'Obtén un compromiso verbal de presentacion o compra.',dif:'Dificil'},
  {icon:'\uD83D\uDCB0',title:'Calcula el ROI para 3 prospectos',desc:'Preparales numeros personalizados de cuanto pueden ganar.',dif:'Medio'},
  {icon:'\uD83E\uDDD8',title:'Mentalidad: escribe 3 metas del mes',desc:'Define metas claras de ventas, equipo e ingresos.',dif:'Facil'}
];

function _getDesafiosState() {
  try { return JSON.parse(localStorage.getItem('coach_desafios') || '{}'); } catch(e) { return {}; }
}
function _saveDesafiosState(s) {
  try { localStorage.setItem('coach_desafios', JSON.stringify(s)); } catch(e) {}
}

function renderToolDesafios() {
  var state = _getDesafiosState();
  var today = new Date().toISOString().slice(0,10);
  var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  var desafio = DESAFIOS_POOL[dayOfYear % DESAFIOS_POOL.length];
  var doneToday = (state.completedDates || []).indexOf(today) !== -1;
  var streak = state.currentStreak || 0;
  var best = state.bestStreak || 0;
  var difColor = desafio.dif === 'Facil' ? '#1D9E75' : desafio.dif === 'Medio' ? '#C9A84C' : '#E24B4A';

  // Week view
  var weekHtml = '';
  for (var wi = 6; wi >= 0; wi--) {
    var wd = new Date(); wd.setDate(wd.getDate() - wi);
    var wds = wd.toISOString().slice(0,10);
    var done = (state.completedDates || []).indexOf(wds) !== -1;
    var isToday = wds === today;
    var dayNames = ['D','L','M','M','J','V','S'];
    weekHtml += '<div style="text-align:center;"><div style="font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:4px;">' + dayNames[wd.getDay()] + '</div>'
      + '<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;'
      + (done ? 'background:rgba(29,158,117,0.2);border:1.5px solid #1D9E75;color:#1D9E75;' : isToday ? 'background:rgba(201,168,76,0.15);border:1.5px solid rgba(201,168,76,0.4);color:#C9A84C;' : 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.2);')
      + '">' + (done ? '\u2705' : isToday ? '\u2B50' : '') + '</div></div>';
  }

  var html = '<div class="coach-toolview-card">';
  // Streak header
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">';
  html += '<div><span style="font-size:22px;">\uD83D\uDD25</span> <span style="font-size:16px;font-weight:900;color:#C9A84C;">Racha: ' + streak + ' d\u00edas</span></div>';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">Mejor: ' + best + ' d\u00edas</div>';
  html += '</div>';
  // Week
  html += '<div style="display:flex;justify-content:space-between;gap:4px;margin-bottom:16px;">' + weekHtml + '</div>';
  // Today's challenge
  html += '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;">';
  html += '<div style="font-size:36px;margin-bottom:8px;">' + desafio.icon + '</div>';
  html += '<div style="font-size:15px;font-weight:900;color:#F0EDE6;margin-bottom:4px;">' + desafio.title + '</div>';
  html += '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:800;color:' + difColor + ';background:' + difColor + '20;border:1px solid ' + difColor + '40;margin-bottom:8px;">' + desafio.dif + '</span>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">' + desafio.desc + '</div>';
  if (doneToday) {
    html += '<div style="margin-top:14px;padding:10px;background:rgba(29,158,117,0.1);border-radius:10px;color:#1D9E75;font-size:13px;font-weight:800;">\u2705 \u00a1Completado hoy!</div>';
  } else {
    html += '<div style="display:flex;gap:8px;margin-top:14px;">';
    html += '<button onclick="coachCompleteDesafio()" class="coach-task-btn" style="flex:1;padding:10px;font-size:13px;">\u2705 Completado</button>';
    html += '<button onclick="coachSkipDesafio()" class="coach-task-btn coach-task-btn-secondary" style="padding:10px;font-size:13px;">\u23ED Saltar</button>';
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

function coachCompleteDesafio() {
  var state = _getDesafiosState();
  var today = new Date().toISOString().slice(0,10);
  if (!state.completedDates) state.completedDates = [];
  if (state.completedDates.indexOf(today) !== -1) return;
  state.completedDates.push(today);
  // Streak logic
  var yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  var yStr = yesterday.toISOString().slice(0,10);
  if (state.lastDate === yStr || !state.lastDate) {
    state.currentStreak = (state.currentStreak || 0) + 1;
  } else if (state.lastDate !== today) {
    state.currentStreak = 1;
  }
  state.lastDate = today;
  if (state.currentStreak > (state.bestStreak || 0)) state.bestStreak = state.currentStreak;
  // Keep only last 30 days
  if (state.completedDates.length > 30) state.completedDates = state.completedDates.slice(-30);
  _saveDesafiosState(state);
  if (typeof showToast === 'function') showToast('\uD83C\uDFC6 \u00a1Desaf\u00edo completado! Racha: ' + state.currentStreak + ' d\u00edas');
  openCoachTool('desafios');
}

function coachSkipDesafio() {
  if (typeof showToast === 'function') showToast('\u23ED Desaf\u00edo saltado. \u00a1Ma\u00f1ana hay uno nuevo!');
}

// ═══════════════════════════════════════════════════════════════
//  TOOL: SEGUIMIENTO (Follow-up Dashboard)
// ═══════════════════════════════════════════════════════════════

function renderToolSeguimiento() {
  var pros = (window.crmProspectos || []).filter(function(p) {
    return p && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido';
  });
  var now = Date.now();
  var urgente = [], pendiente = [], alDia = [], proxCierre = [];
  pros.forEach(function(p) {
    var lastContact = p.updated_at ? new Date(p.updated_at).getTime() : 0;
    var daysSince = Math.floor((now - lastContact) / 86400000);
    p._daysSince = daysSince;
    if (daysSince >= 7) urgente.push(p);
    else if (daysSince >= 3) pendiente.push(p);
    else alDia.push(p);
    if (p.fecha_cierre_estimada) {
      var cd = new Date(p.fecha_cierre_estimada).getTime();
      if (cd > now && cd < now + 7 * 86400000) proxCierre.push(p);
    }
  });
  urgente.sort(function(a,b) { return b._daysSince - a._daysSince; });
  pendiente.sort(function(a,b) { return b._daysSince - a._daysSince; });

  var html = '<div class="coach-toolview-card">';
  // Stats header
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">';
  html += '<div style="text-align:center;padding:10px;background:rgba(226,75,74,0.08);border:1px solid rgba(226,75,74,0.2);border-radius:10px;"><div style="font-size:20px;font-weight:900;color:#E24B4A;">' + urgente.length + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);">Urgentes 7d+</div></div>';
  html += '<div style="text-align:center;padding:10px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:10px;"><div style="font-size:20px;font-weight:900;color:#C9A84C;">' + pendiente.length + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);">Pendientes 3-6d</div></div>';
  html += '<div style="text-align:center;padding:10px;background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:10px;"><div style="font-size:20px;font-weight:900;color:#1D9E75;">' + alDia.length + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);">Al d\u00eda</div></div>';
  html += '</div>';

  function _renderProspectRow(p, color) {
    var phone = (p.telefono || '').replace(/[^0-9]/g, '');
    var nombre = (p.nombre || 'Prospecto').split(' ')[0];
    var row = '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.02);border-left:3px solid ' + color + ';border-radius:6px;margin-bottom:6px;">';
    row += '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:800;color:#F0EDE6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _safe(p.nombre || 'Prospecto') + '</div>';
    row += '<div style="font-size:10px;color:rgba(255,255,255,0.35);">' + p._daysSince + 'd sin contacto \u00b7 ' + (p.etapa || 'nuevo') + '</div></div>';
    row += '<div style="display:flex;gap:4px;flex-shrink:0;">';
    if (phone) row += '<a href="https://wa.me/' + phone + '" target="_blank" style="width:30px;height:30px;border-radius:8px;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.3);display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:14px;" title="WhatsApp">\uD83D\uDCAC</a>';
    row += '<button onclick="openCoachTool(\'crm_message\')" style="width:30px;height:30px;border-radius:8px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Mensaje IA">\uD83E\uDD16</button>';
    row += '</div></div>';
    return row;
  }

  // Urgentes
  if (urgente.length) {
    html += '<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:800;color:#E24B4A;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">\uD83D\uDD34 Urgente (7+ d\u00edas)</div>';
    urgente.slice(0, 8).forEach(function(p) { html += _renderProspectRow(p, '#E24B4A'); });
    html += '</div>';
  }
  // Pendientes
  if (pendiente.length) {
    html += '<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:800;color:#C9A84C;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">\uD83D\uDFE1 Pendiente (3-6 d\u00edas)</div>';
    pendiente.slice(0, 8).forEach(function(p) { html += _renderProspectRow(p, '#C9A84C'); });
    html += '</div>';
  }
  // Próximos cierres
  if (proxCierre.length) {
    html += '<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:800;color:#7F77DD;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">\uD83D\uDCC5 Pr\u00f3ximos cierres</div>';
    proxCierre.slice(0, 5).forEach(function(p) { html += _renderProspectRow(p, '#7F77DD'); });
    html += '</div>';
  }
  // Empty state
  if (!urgente.length && !pendiente.length && !proxCierre.length) {
    html += '<div style="text-align:center;padding:20px;"><div style="font-size:36px;margin-bottom:8px;">\u2705</div>';
    html += '<div style="font-size:14px;font-weight:800;color:#1D9E75;">Todos tus prospectos est\u00e1n al d\u00eda</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">Sigue as\u00ed. Revisa de nuevo ma\u00f1ana.</div></div>';
  }
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════════════════
//  TOOL: PLAN SEMANAL
// ═══════════════════════════════════════════════════════════════

function renderToolPlan() {
  var pros = (window.crmProspectos || []).filter(function(p) { return p && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; });
  var hot = pros.filter(function(p) { return (p.temperatura || 0) >= 70; }).length;
  var total = pros.length;
  var won = (window.crmProspectos || []).filter(function(p) { return p && p.etapa === 'cerrado_ganado'; }).length;
  var rate = total > 0 ? Math.round(won / Math.max(1, total) * 100) : 0;

  var html = '<div class="coach-toolview-card">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">';
  html += '<div style="text-align:center;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;"><div style="font-size:18px;font-weight:900;color:#C9A84C;">' + total + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);">Activos</div></div>';
  html += '<div style="text-align:center;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;"><div style="font-size:18px;font-weight:900;color:#E24B4A;">' + hot + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);">Calientes</div></div>';
  html += '<div style="text-align:center;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;"><div style="font-size:18px;font-weight:900;color:#1D9E75;">' + rate + '%</div><div style="font-size:9px;color:rgba(255,255,255,0.4);">Cierre</div></div>';
  html += '</div>';
  html += '<button onclick="coachGeneratePlan()" class="coach-task-btn" style="width:100%;padding:12px;font-size:14px;margin-bottom:10px;">\uD83D\uDCCB Generar Plan Semanal</button>';
  html += '<div id="coach-plan-output"></div>';
  html += '</div>';
  return html;
}

function coachGeneratePlan() {
  var output = document.getElementById('coach-plan-output');
  if (!output) return;
  output.innerHTML = '<div style="text-align:center;padding:16px;"><div class="coach-chat-typing">Generando tu plan...</div></div>';
  var pros = (window.crmProspectos || []).filter(function(p) { return p && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; });
  var now = Date.now();
  var hotNames = pros.filter(function(p) { return (p.temperatura||0) >= 70; }).slice(0,5).map(function(p) { return (p.nombre||'').split(' ')[0] + ' (' + (p.etapa||'nuevo') + ', ' + (p.temperatura||0) + '%)'; }).join(', ');
  var coldNames = pros.filter(function(p) { var d = p.updated_at ? Math.floor((now-new Date(p.updated_at).getTime())/86400000) : 99; return d >= 3; }).slice(0,5).map(function(p) { return (p.nombre||'').split(' ')[0]; }).join(', ');
  var bookings = (window.agendaBookings || []).filter(function(b) { return b.fechaISO && new Date(b.fechaISO).getTime() > now && b.status !== 'cancelada'; }).length;
  var rank = window.CU ? (window.CU.rank || 0) : 0;
  var ctx = 'DATOS: ' + pros.length + ' prospectos activos. Calientes: ' + hotNames + '. Frios (3d+ sin contacto): ' + coldNames + '. Citas esta semana: ' + bookings + '. Rango: ' + rank + '.';
  var sysPrompt = 'Eres un coach de ventas y network marketing. Genera un plan semanal concreto (Lunes a Viernes) con 2-3 acciones por dia. USA LOS NOMBRES REALES de los prospectos. Prioriza: calientes primero, frios para reactivar, nuevas prospecciones. Formato: DIA: acciones. Maximo 350 palabras. En espanol.';
  var fetchFn = typeof _skyFetch === 'function' ? _skyFetch : fetch;
  fetchFn('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system:sysPrompt, max_tokens:500, messages:[{role:'user',content:ctx}] }) })
  .then(function(r){return r.json();})
  .then(function(d) {
    var text = (d.content && d.content[0]) ? d.content[0].text : (d.reply || 'No se pudo generar el plan.');
    output.innerHTML = '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.7;white-space:pre-wrap;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;">' + _safe(text).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') + '</div>'
      + '<button onclick="var t=this.parentElement.querySelector(\'div\');if(t)navigator.clipboard.writeText(t.textContent);if(typeof showToast===\'function\')showToast(\'\u2705 Plan copiado\')" class="coach-task-btn coach-task-btn-secondary" style="margin-top:8px;font-size:11px;width:100%;">\uD83D\uDCCB Copiar Plan</button>';
  }).catch(function() { output.innerHTML = '<div style="color:#E24B4A;font-size:12px;">Error al generar. Intenta de nuevo.</div>'; });
}

// ═══════════════════════════════════════════════════════════════
//  TOOL: VOZ (Pitch Training)
// ═══════════════════════════════════════════════════════════════

function renderToolVoz() {
  var html = '<div class="coach-toolview-card">';
  html += '<div style="text-align:center;margin-bottom:14px;">';
  html += '<div style="font-size:32px;margin-bottom:6px;">\uD83C\uDFA4</div>';
  html += '<div style="font-size:14px;font-weight:800;color:#F0EDE6;margin-bottom:4px;">Entrena tu pitch de venta</div>';
  html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);line-height:1.5;">Habla como si estuvieras frente a un prospecto real. La IA analizar\u00e1 tu estructura, claridad y persuasi\u00f3n.</div>';
  html += '</div>';
  // Record button
  html += '<div style="text-align:center;margin-bottom:14px;">';
  html += '<button id="coach-pitch-rec-btn" onclick="coachStartPitchRec()" style="width:70px;height:70px;border-radius:50%;border:3px solid rgba(201,168,76,0.4);background:rgba(201,168,76,0.1);color:#C9A84C;font-size:28px;cursor:pointer;transition:all 0.3s;">\uD83C\uDFA4</button>';
  html += '<div id="coach-pitch-status" style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:6px;">Toca para grabar</div>';
  html += '</div>';
  // Transcript
  html += '<textarea id="coach-pitch-textarea" placeholder="Tu transcripci\u00f3n aparecer\u00e1 aqu\u00ed. Tambi\u00e9n puedes escribir/pegar tu pitch." style="width:100%;min-height:80px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px;resize:vertical;font-family:Outfit,Nunito,sans-serif;outline:none;box-sizing:border-box;"></textarea>';
  html += '<button onclick="coachAnalyzePitch()" class="coach-task-btn" style="width:100%;padding:12px;font-size:14px;margin-top:8px;">\uD83E\uDD16 Analizar mi Pitch</button>';
  html += '<div id="coach-voz-feedback" style="margin-top:10px;"></div>';
  html += '</div>';
  return html;
}

var _coachPitchRec = null;
var _coachPitchRecording = false;
function coachStartPitchRec() {
  var btn = document.getElementById('coach-pitch-rec-btn');
  var status = document.getElementById('coach-pitch-status');
  var ta = document.getElementById('coach-pitch-textarea');
  if (_coachPitchRecording && _coachPitchRec) {
    _coachPitchRec.stop(); _coachPitchRecording = false;
    if (btn) { btn.style.borderColor = 'rgba(201,168,76,0.4)'; btn.style.background = 'rgba(201,168,76,0.1)'; }
    if (status) status.textContent = 'Transcripci\u00f3n lista. Puedes editarla antes de analizar.';
    return;
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { if (status) status.textContent = 'Tu navegador no soporta grabaci\u00f3n por voz.'; return; }
  _coachPitchRec = new SR();
  _coachPitchRec.lang = 'es-MX'; _coachPitchRec.continuous = true; _coachPitchRec.interimResults = true;
  var finalTx = ta ? (ta.value || '') : '';
  _coachPitchRec.onresult = function(e) {
    var interim = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalTx += (finalTx ? ' ' : '') + e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    if (ta) ta.value = (finalTx + (interim ? ' ' + interim : '')).trim();
  };
  _coachPitchRec.onend = function() {
    if (_coachPitchRecording) { try { _coachPitchRec.start(); } catch(e) { _coachPitchRecording = false; } }
  };
  _coachPitchRec.onerror = function(e) { if (e.error !== 'no-speech') console.warn('pitch rec error', e.error); };
  _coachPitchRec.start(); _coachPitchRecording = true;
  if (btn) { btn.style.borderColor = '#E24B4A'; btn.style.background = 'rgba(226,75,74,0.2)'; }
  if (status) status.textContent = 'Grabando... toca de nuevo para detener.';
}

function coachAnalyzePitch() {
  var ta = document.getElementById('coach-pitch-textarea');
  var output = document.getElementById('coach-voz-feedback');
  if (!ta || !output) return;
  var transcript = (ta.value || '').trim();
  if (!transcript || transcript.length < 20) { if (typeof showToast === 'function') showToast('Graba o escribe tu pitch primero (m\u00ednimo 20 caracteres)','error'); return; }
  output.innerHTML = '<div style="text-align:center;padding:12px;"><div class="coach-chat-typing">Analizando tu pitch...</div></div>';
  var sysPrompt = 'Eres un coach de ventas. Analiza este pitch y da feedback en: 1) ESTRUCTURA (apertura, problema, solucion, cierre) 1-5, 2) CLARIDAD 1-5, 3) PERSUASION 1-5, 4) NATURALIDAD 1-5. Da 2 mejoras concretas. Maximo 200 palabras. Espanol.';
  var fetchFn = typeof _skyFetch === 'function' ? _skyFetch : fetch;
  fetchFn('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system:sysPrompt, max_tokens:350, messages:[{role:'user',content:'Mi pitch: ' + transcript}] }) })
  .then(function(r){return r.json();})
  .then(function(d) {
    var text = (d.content && d.content[0]) ? d.content[0].text : (d.reply || 'No se pudo analizar.');
    output.innerHTML = '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.7;white-space:pre-wrap;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;">' + _safe(text).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') + '</div>';
  }).catch(function() { output.innerHTML = '<div style="color:#E24B4A;font-size:12px;">Error al analizar. Intenta de nuevo.</div>'; });
}

// ═══════════════════════════════════════════════════════════════
//  TOOL: ROLEPLAY (Sales Practice)
// ═══════════════════════════════════════════════════════════════

var ROLEPLAY_PERSONAS = [
  {id:'esceptico',label:'\uD83E\uDD14 Esc\u00e9ptico',prompt:'Eres un prospecto MUY ESCEPTICO. Crees que todo es estafa y piramide. Haz preguntas duras, pide pruebas. No te dejes convencer facil. 2-3 oraciones por mensaje. Espanol.'},
  {id:'ocupado',label:'\u23F0 Ocupado',prompt:'Eres un prospecto que NO TIENE TIEMPO. Trabajas mucho, tienes familia. Cualquier cosa extra te parece imposible. Responde corto, con prisa. 1-2 oraciones. Espanol.'},
  {id:'sindinero',label:'\uD83D\uDCB8 Sin dinero',prompt:'Eres un prospecto que QUIERE pero dice NO TENER DINERO. Te interesa pero el precio te asusta. Pregunta por planes de pago, descuentos. 2 oraciones. Espanol.'},
  {id:'otroneg',label:'\uD83C\uDFE2 Ya en otro negocio',prompt:'Eres un prospecto que YA ESTA EN OTRO negocio de network marketing. Comparas todo, crees que el tuyo es mejor. Eres competitivo. 2 oraciones. Espanol.'},
  {id:'indeciso',label:'\uD83E\uDD37 Indeciso',prompt:'Eres un prospecto INTERESADO pero INDECISO. Te gusta pero necesitas pensarlo, hablar con tu pareja, ver mas testimonios. Siempre dices "dejame pensarlo". 2 oraciones. Espanol.'}
];

function renderToolRoleplay() {
  var active = coachState._roleplayMsgs && coachState._roleplayMsgs.length > 0;
  var html = '<div class="coach-toolview-card">';
  if (!active) {
    html += '<div style="text-align:center;margin-bottom:14px;"><div style="font-size:32px;margin-bottom:6px;">\uD83C\uDFAD</div>';
    html += '<div style="font-size:14px;font-weight:800;color:#F0EDE6;">Practica ventas con IA</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">La IA simula un prospecto. T\u00fa practicas responder.</div></div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">Elige el tipo de prospecto:</div>';
    ROLEPLAY_PERSONAS.forEach(function(p) {
      html += '<button onclick="coachStartRoleplay(\'' + p.id + '\')" style="display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0EDE6;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;transition:all 0.15s;">' + p.label + '</button>';
    });
  } else {
    // Active roleplay
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">\uD83C\uDFAD Roleplay en curso (' + Math.floor(coachState._roleplayMsgs.length/2) + '/5 turnos)</div>';
    html += '<div id="coach-roleplay-chat" style="max-height:250px;overflow-y:auto;margin-bottom:10px;">';
    coachState._roleplayMsgs.forEach(function(m) {
      if (m.role === 'user') {
        html += '<div style="text-align:right;margin-bottom:6px;"><span style="display:inline-block;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);border-radius:12px 0 12px 12px;padding:8px 12px;font-size:12px;color:#F0EDE6;max-width:80%;text-align:left;">' + _safe(m.content) + '</span></div>';
      } else {
        html += '<div style="margin-bottom:6px;"><span style="display:inline-block;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:0 12px 12px 12px;padding:8px 12px;font-size:12px;color:#F0EDE6;max-width:80%;">\uD83D\uDE10 ' + _safe(m.content) + '</span></div>';
      }
    });
    html += '</div>';
    html += '<div id="coach-roleplay-typing" style="display:none;margin-bottom:8px;"><div class="coach-chat-typing">Prospecto pensando...</div></div>';
    html += '<div style="display:flex;gap:6px;margin-bottom:8px;">';
    html += '<input id="coach-roleplay-input" type="text" placeholder="Tu respuesta..." style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px;outline:none;font-family:Outfit,Nunito,sans-serif;" onkeypress="if(event.key===\'Enter\')coachRoleplayReply()">';
    html += '<button onclick="coachRoleplayReply()" style="padding:10px 16px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);border:none;color:#0a0a12;font-weight:900;font-size:13px;cursor:pointer;">\u27A1</button>';
    html += '</div>';
    html += '<button onclick="coachRoleplayEnd()" class="coach-task-btn coach-task-btn-secondary" style="width:100%;font-size:11px;">\uD83D\uDCCA Terminar y recibir feedback</button>';
    html += '<div id="coach-roleplay-feedback" style="margin-top:10px;"></div>';
  }
  html += '</div>';
  return html;
}

function coachStartRoleplay(personaId) {
  var persona = ROLEPLAY_PERSONAS.find(function(p) { return p.id === personaId; });
  if (!persona) return;
  coachState._roleplaySysPrompt = persona.prompt;
  coachState._roleplayMsgs = [];
  coachState._roleplayPersona = persona.label;
  // AI sends first message
  var fetchFn = typeof _skyFetch === 'function' ? _skyFetch : fetch;
  fetchFn('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system:persona.prompt, max_tokens:150, messages:[{role:'user',content:'[El socio acaba de contactarte por WhatsApp. Envia tu primer mensaje como prospecto. Solo el mensaje, sin explicacion.]'}] }) })
  .then(function(r){return r.json();})
  .then(function(d) {
    var text = (d.content && d.content[0]) ? d.content[0].text : (d.reply || 'Hola, me hablaron de un negocio. De que se trata?');
    coachState._roleplayMsgs.push({role:'assistant',content:text});
    openCoachTool('roleplay');
  }).catch(function() {
    coachState._roleplayMsgs.push({role:'assistant',content:'Hola, alguien me paso tu contacto. De que se trata esto?'});
    openCoachTool('roleplay');
  });
}

function coachRoleplayReply() {
  var input = document.getElementById('coach-roleplay-input');
  if (!input) return;
  var text = (input.value || '').trim();
  if (!text) return;
  input.value = '';
  coachState._roleplayMsgs.push({role:'user',content:text});
  // Check turn limit
  var turns = Math.floor(coachState._roleplayMsgs.length / 2);
  if (turns >= 5) { coachRoleplayEnd(); return; }
  openCoachTool('roleplay');
  var typing = document.getElementById('coach-roleplay-typing');
  if (typing) typing.style.display = 'block';
  var fetchFn = typeof _skyFetch === 'function' ? _skyFetch : fetch;
  fetchFn('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system:coachState._roleplaySysPrompt, max_tokens:150, messages:coachState._roleplayMsgs.slice(-8) }) })
  .then(function(r){return r.json();})
  .then(function(d) {
    var reply = (d.content && d.content[0]) ? d.content[0].text : (d.reply || 'Hmm, no se...');
    coachState._roleplayMsgs.push({role:'assistant',content:reply});
    openCoachTool('roleplay');
  }).catch(function() {
    coachState._roleplayMsgs.push({role:'assistant',content:'Dejame pensarlo...'});
    openCoachTool('roleplay');
  });
}

function coachRoleplayEnd() {
  if (!coachState._roleplayMsgs || coachState._roleplayMsgs.length < 2) return;
  var feedback = document.getElementById('coach-roleplay-feedback');
  var transcript = coachState._roleplayMsgs.map(function(m){return (m.role==='user'?'SOCIO':'PROSPECTO')+': '+m.content;}).join('\n');
  if (feedback) feedback.innerHTML = '<div style="text-align:center;padding:12px;"><div class="coach-chat-typing">Evaluando tu desempe\u00f1o...</div></div>';
  else { openCoachTool('roleplay'); return; }
  var sysPrompt = 'Eres un coach de ventas. Evalua esta conversacion de roleplay. Puntua 1-5 en: APERTURA, MANEJO DE OBJECIONES, EMPATIA, INTENTO DE CIERRE. Da 1 tip concreto por area. Maximo 200 palabras. Espanol.';
  var fetchFn = typeof _skyFetch === 'function' ? _skyFetch : fetch;
  fetchFn('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system:sysPrompt, max_tokens:350, messages:[{role:'user',content:transcript}] }) })
  .then(function(r){return r.json();})
  .then(function(d) {
    var text = (d.content && d.content[0]) ? d.content[0].text : (d.reply || 'No se pudo evaluar.');
    feedback.innerHTML = '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.7;white-space:pre-wrap;background:rgba(127,119,221,0.08);border:1px solid rgba(127,119,221,0.2);border-radius:10px;padding:14px;">' + _safe(text).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') + '</div>'
      + '<button onclick="coachState._roleplayMsgs=null;openCoachTool(\'roleplay\')" class="coach-task-btn" style="width:100%;margin-top:8px;font-size:12px;">\uD83D\uDD04 Nueva pr\u00e1ctica</button>';
  }).catch(function() { feedback.innerHTML = '<div style="color:#E24B4A;font-size:12px;">Error al evaluar.</div>'; });
}


// ═══════════════════════════════════════════════════════════════
//  SECTION-SPECIFIC ANALYSIS
// ═══════════════════════════════════════════════════════════════

function analyzeProspects() {
  var prospects = window.crmProspectos || [];
  if (prospects.length === 0) return null;

  var total = prospects.length;
  var hot = 0, warm = 0, cold = 0, won = 0, lost = 0;
  var noContact3Days = 0;

  prospects.forEach(function(p) {
    if (!p) return;
    var temp = p.temperatura || 0;
    var etapa = p.etapa || '';
    if (etapa === 'cerrado_ganado') { won++; return; }
    if (etapa === 'cerrado_perdido') { lost++; return; }
    if (temp >= 70) hot++;
    else if (temp >= 30) warm++;
    else cold++;

    var lastUpdate = p.updated_at
      ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000)
      : 999;
    if (lastUpdate >= 3) noContact3Days++;
  });

  return { total: total, hot: hot, warm: warm, cold: cold, won: won, lost: lost, noContact3Days: noContact3Days };
}

function analyzeSales() {
  var prospects = window.crmProspectos || [];
  var won = prospects.filter(function(p) { return p && p.etapa === 'cerrado_ganado'; });
  return { totalSales: won.length };
}

function analyzeAgenda() {
  var bookings = window.agendaBookings || [];
  var now = new Date();
  var today = 0, upcoming = 0, past = 0;

  bookings.forEach(function(b) {
    if (!b || !b.fecha_iso) return;
    var d = new Date(b.fecha_iso);
    if (d.toDateString() === now.toDateString()) today++;
    else if (d > now) upcoming++;
    else past++;
  });

  return { today: today, upcoming: upcoming, past: past, total: bookings.length };
}

function analyzeTeam() {
  if (!window.stState || !window.stState.data) return null;
  var data = window.stState.data;
  var frontline = data.frontline || [];
  return { members: frontline.length };
}


// ═══════════════════════════════════════════════════════════════
//  VOICE (Speech Recognition)
// ═══════════════════════════════════════════════════════════════

function toggleVoice() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  if (coachState.recording && coachState.recognition) {
    coachState.recording = false;
    coachState.recognition.stop();
    updateMicButton();
    // Auto-send on stop and clear input
    var input = document.getElementById('coach-input');
    if (input && input.value.trim()) {
      var msg = input.value.trim();
      input.value = '';
      sendCoachMessage(msg);
    }
    return;
  }

  var recognition = new SpeechRecognition();
  recognition.lang = 'es-MX';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    coachState.recording = true;
    updateMicButton();
  };

  recognition.onresult = function(event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    // Only put text in input — do NOT auto-send
    var input = document.getElementById('coach-input');
    if (input) input.value = transcript.trim();
  };

  recognition.onerror = function(event) {
    if (event.error === 'no-speech') return; // Ignore silence errors
    console.warn('[Coach IA] Voice error:', event.error);
    coachState.recording = false;
    updateMicButton();
  };

  recognition.onend = function() {
    // If still recording (user didn't press stop), restart to keep listening
    if (coachState.recording) {
      try { recognition.start(); } catch(e) {
        coachState.recording = false;
        updateMicButton();
      }
      return;
    }
    updateMicButton();
  };

  coachState.recognition = recognition;

  try {
    recognition.start();
  } catch(e) {
    console.error('[Coach IA] Could not start voice:', e);
    coachState.recording = false;
  }
}

function updateMicButton() {
  var btn = document.getElementById('coach-mic-btn');
  if (!btn) return;
  if (coachState.recording) {
    btn.classList.add('recording');
    btn.title = 'Detener grabaci\u00f3n';
  } else {
    btn.classList.remove('recording');
    btn.title = 'Voz';
  }
}


// ═══════════════════════════════════════════════════════════════
//  TASK ACTIONS
// ═══════════════════════════════════════════════════════════════

function completeTask() {
  if (coachState.tasks.length === 0) return;

  // Remove completed task
  coachState.tasks.splice(coachState.taskIndex, 1);

  // Adjust index
  if (coachState.taskIndex >= coachState.tasks.length) {
    coachState.taskIndex = 0;
  }

  updateFabDot();
  renderCoachPanel();
}

function skipTask() {
  if (coachState.tasks.length === 0) return;

  coachState.taskIndex++;
  if (coachState.taskIndex >= coachState.tasks.length) {
    coachState.taskIndex = 0;
  }

  renderCoachPanel();
}


// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

function initCoachIA() {
  // Guard: require user context
  if (!window.CU) {
    setTimeout(function() { if (window.CU) initCoachIA(); }, 2000);
    return;
  }

  // Prevent double-init — but re-show if it was hidden by logout
  var existingFab = document.getElementById('coach-fab');
  if (existingFab) {
    if (existingFab.style.display === 'none') existingFab.style.display = '';
    return;
  }

  // Inject CSS
  injectCoachCSS();

  // Create floating action button
  var fab = document.createElement('button');
  fab.className = 'coach-fab';
  fab.id = 'coach-fab';
  fab.innerHTML = '\uD83E\uDD16';
  fab.setAttribute('aria-label', 'Coach IA');
  fab.onclick = function() {
    if (coachState.open) {
      closeCoach();
    } else {
      openCoach();
    }
  };

  // Notification dot
  var dot = document.createElement('span');
  dot.className = 'coach-fab-dot';
  dot.id = 'coach-fab-dot';
  fab.appendChild(dot);

  document.body.appendChild(fab);

  // Detect section + generate tasks
  detectCurrentSection();
  generateTasks();
  updateFabDot();

  // Override navigate() to track section changes
  if (typeof window.navigate === 'function') {
    var _origNav = window.navigate;
    window.navigate = function(sec) {
      _origNav(sec);
      coachState.section = sec;
      generateTasks();
      updateFabDot();
    };
  }

  // Periodically refresh tasks (every 60 seconds)
  setInterval(function() {
    if (!coachState.open) {
      detectCurrentSection();
      generateTasks();
      updateFabDot();
    }
  }, 60000);

  console.log('[Coach IA] Initialized');
}


// ═══════════════════════════════════════════════════════════════
//  CRM TOOL RENDERS
// ═══════════════════════════════════════════════════════════════

function renderToolCrmAnalyze() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos : [];
  var total = pros.length;
  var sinNotas = pros.filter(function(p) { return !p.notas || p.notas.trim() === ''; }).length;
  var sinCalif = pros.filter(function(p) { return !p.calif_positivo && !p.calif_emprendedor; }).length;
  var frios = pros.filter(function(p) { var lu = p.updated_at ? Math.ceil((Date.now()-new Date(p.updated_at).getTime())/86400000) : 999; return lu > 7 && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }).length;
  var calientes = pros.filter(function(p) { return (p.temperatura||0) >= 70 && p.etapa !== 'cerrado_ganado'; }).length;
  var porEtapa = {};
  pros.forEach(function(p) { porEtapa[p.etapa] = (porEtapa[p.etapa]||0)+1; });

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">\uD83D\uDD0D An\u00e1lisis de tu CRM</div>';

  // Stats grid
  html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">';
  html += '<div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#fff;">'+total+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Total</div></div>';
  html += '<div style="background:rgba(220,38,38,0.08);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#E24B4A;">'+frios+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Fr\u00edos (7d+)</div></div>';
  html += '<div style="background:rgba(201,168,76,0.08);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#C9A84C;">'+calientes+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Calientes</div></div>';
  html += '<div style="background:rgba(127,119,221,0.08);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#7F77DD;">'+sinNotas+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Sin notas</div></div>';
  html += '</div>';

  // Recommendations
  html += '<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);margin-bottom:8px;">RECOMENDACIONES</div>';
  if (sinNotas > 0) html += '<div style="background:rgba(201,168,76,0.06);border-left:3px solid #C9A84C;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\uD83D\uDCDD <strong>'+sinNotas+' prospectos sin notas</strong> \u2014 Documenta cada interacci\u00f3n para no perder contexto.</div>';
  if (sinCalif > 0) html += '<div style="background:rgba(127,119,221,0.06);border-left:3px solid #7F77DD;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\u2B50 <strong>'+sinCalif+' sin calificar</strong> \u2014 Eval\u00faa el potencial de cada prospecto.</div>';
  if (frios > 0) html += '<div style="background:rgba(220,38,38,0.06);border-left:3px solid #E24B4A;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\u2744\uFE0F <strong>'+frios+' prospectos fr\u00edos</strong> \u2014 Contacta antes de que se pierdan.</div>';
  if (calientes > 0) html += '<div style="background:rgba(29,158,117,0.06);border-left:3px solid #1D9E75;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\uD83D\uDD25 <strong>'+calientes+' prospectos calientes</strong> \u2014 \u00a1Ci\u00e9rralos esta semana!</div>';

  html += '</div>';
  return html;
}

function renderToolCrmVoiceNote() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">\uD83C\uDFA4 Nota por Voz</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Selecciona un prospecto y dicta tu nota. Se guardar\u00e1 autom\u00e1ticamente.</div>';

  // Prospect selector
  html += '<select id="coach-voice-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) {
    html += '<option value="'+p.id+'">' + _safe(p.nombre || 'Sin nombre') + ' \u2014 ' + (p.etapa||'nuevo') + '</option>';
  });
  html += '</select>';

  // Voice button
  html += '<div style="text-align:center;margin:20px 0;">';
  html += '<button id="coach-voice-rec-btn" onclick="coachStartVoiceNote()" style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);font-size:32px;cursor:pointer;transition:all 0.3s;">\uD83C\uDFA4</button>';
  html += '<div id="coach-voice-status" style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:8px;">Toca para grabar</div>';
  html += '</div>';

  // Transcript preview
  html += '<div id="coach-voice-transcript" style="display:none;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:12px;">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:4px;">TRANSCRIPCI\u00d3N</div>';
  html += '<div id="coach-voice-text" style="font-size:13px;color:#F0EDE6;line-height:1.4;"></div>';
  html += '</div>';

  // Save button
  html += '<button id="coach-voice-save" onclick="coachSaveVoiceNote()" style="display:none;width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCBE Guardar nota en la tarjeta</button>';

  html += '</div>';
  return html;
}

function renderToolCrmMessage() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">\uD83D\uDCAC Generar Mensaje</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Selecciona un prospecto y el tipo de mensaje. La IA lo genera personalizado.</div>';

  // Prospect selector
  html += '<select id="coach-msg-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) {
    html += '<option value="'+p.id+'">' + _safe(p.nombre || 'Sin nombre') + '</option>';
  });
  html += '</select>';

  // Message type
  html += '<select id="coach-msg-type" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  html += '<option value="primer_contacto">\uD83D\uDCF2 Primer contacto</option>';
  html += '<option value="seguimiento">\uD83D\uDD04 Seguimiento</option>';
  html += '<option value="invitacion_reunion">\uD83D\uDCC5 Invitar a reuni\u00f3n</option>';
  html += '<option value="cierre">\uD83D\uDCB0 Mensaje de cierre</option>';
  html += '<option value="reactivar">\uD83D\uDD25 Reactivar contacto fr\u00edo</option>';
  html += '<option value="felicitar">\uD83C\uDF89 Felicitar/Motivar</option>';
  html += '</select>';

  html += '<button onclick="coachGenerateMessage()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">\uD83E\uDD16 Generar mensaje</button>';

  html += '<div id="coach-msg-result" style="margin-top:16px;"></div>';
  html += '</div>';
  return html;
}

function renderToolProspectIdeas() {
  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:12px;">\uD83D\uDCA1 Ideas para Nuevos Prospectos</div>';

  var ideas = [
    { icon: '\uD83D\uDC65', title: 'Lista de contactos', desc: 'Revisa tus contactos de WhatsApp. Personas emprendedoras, que buscan ingresos extra, o que ya est\u00e1n en otro negocio.' },
    { icon: '\uD83D\uDCF1', title: 'Redes sociales', desc: 'Publica historias sobre tu estilo de vida y resultados. Usa el Agente de Contenido para crear posts virales.' },
    { icon: '\uD83C\uDFCB\uFE0F', title: 'Gimnasio / Actividades', desc: 'Personas en el gym, clases de yoga, grupos deportivos \u2014 suelen ser personas con mentalidad de crecimiento.' },
    { icon: '\uD83C\uDF93', title: 'Grupos de estudio', desc: 'Compa\u00f1eros de universidad, cursos online, talleres \u2014 personas que invierten en educaci\u00f3n.' },
    { icon: '\uD83D\uDCBC', title: 'LinkedIn / Profesionales', desc: 'Conecta con profesionales que buscan ingresos adicionales o independencia financiera.' },
    { icon: '\uD83D\uDED2', title: 'Negocios locales', desc: 'Due\u00f1os de tiendas, emprendedores locales \u2014 ya tienen mentalidad de negocio.' },
    { icon: '\uD83C\uDF89', title: 'Eventos y reuniones', desc: 'Asiste a eventos de networking, ferias, conferencias \u2014 conoce personas nuevas cada semana.' },
    { icon: '\uD83D\uDCF2', title: 'Referidos de clientes', desc: 'Pide a tus prospectos cerrados que te recomienden 3 personas. La mejor fuente de prospectos.' }
  ];

  ideas.forEach(function(idea) {
    html += '<div style="display:flex;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;">';
    html += '<div style="font-size:24px;flex-shrink:0;">' + idea.icon + '</div>';
    html += '<div><div style="font-size:13px;font-weight:700;color:#fff;">' + idea.title + '</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4;">' + idea.desc + '</div></div>';
    html += '</div>';
  });

  html += '<button onclick="openCoachTool(\'script\')" style="width:100%;padding:12px;margin-top:12px;border-radius:10px;background:rgba(201,168,76,0.10);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCAC Genera un script para abordar</button>';
  html += '</div>';
  return html;
}

function renderToolCrmReminder() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">\u23F0 Agregar Recordatorio</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Programa un seguimiento para un prospecto.</div>';

  html += '<select id="coach-rem-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) { html += '<option value="'+p.id+'">' + _safe(p.nombre||'Sin nombre') + '</option>'; });
  html += '</select>';

  html += '<input type="date" id="coach-rem-date" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;box-sizing:border-box;">';
  html += '<input type="text" id="coach-rem-msg" placeholder="Mensaje del recordatorio..." style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;box-sizing:border-box;">';

  html += '<button onclick="coachSaveReminder()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCBE Guardar recordatorio</button>';
  html += '</div>';
  return html;
}

function renderToolCrmRating() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">\u2B50 Calificar Prospecto</div>';

  // Show prospects without rating
  var sinCalif = pros.filter(function(p) { return !p.calif_positivo && !p.calif_emprendedor; });
  if (sinCalif.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">\u2705 Todos tus prospectos est\u00e1n calificados</div>';
  } else {
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;">' + sinCalif.length + ' prospectos sin calificar</div>';
    sinCalif.slice(0, 5).forEach(function(p) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:6px;">';
      html += '<div style="font-size:13px;font-weight:600;color:#fff;">' + _safe(p.nombre||'Sin nombre') + '</div>';
      html += '<button onclick="if(typeof crmStartRatingWizard===\'function\')crmStartRatingWizard(\''+p.id+'\');closeCoach();" style="padding:6px 14px;border-radius:8px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:11px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\u2B50 Calificar</button>';
      html += '</div>';
    });
  }
  html += '</div>';
  return html;
}


// ── Tool: Agendar Cierre ─────────────────────────────────────

function renderToolCrmAgendar() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];
  var agendaLink = CU ? (window.location.origin + '?agenda=' + (CU.ref || CU.username)) : '';
  var sponsorName = CU && CU.sponsor ? CU.sponsor : null;
  var isFirstTimer = pros.filter(function(p){ return p.etapa === 'cerrado_ganado'; }).length === 0;

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">📅 Agendar Cierre</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Envía tu agenda al prospecto para que reserve.</div>';

  // First timer warning
  if (isFirstTimer && sponsorName) {
    html += '<div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.20);border-radius:12px;padding:14px;margin-bottom:16px;">';
    html += '<div style="font-size:13px;font-weight:700;color:#C9A84C;margin-bottom:4px;">💡 Es tu primer cierre</div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.4;">Apóyate con tu patrocinador <strong style="color:#fff;">' + _safe(sponsorName) + '</strong>. Invítalo a la reunión para que te guíe en tu primer cierre.</div>';
    if (typeof USERS !== 'undefined' && USERS[sponsorName.toLowerCase()]) {
      var sp = USERS[sponsorName.toLowerCase()];
      var spWa = (sp.whatsapp || sp.wa || '').replace(/[^0-9]/g, '');
      if (spWa) html += '<button onclick="window.open(\'https://wa.me/' + spWa + '?text=' + encodeURIComponent('Hola! Tengo mi primer cierre agendado. ¿Puedes apoyarme en la reunión?') + '\',\'_blank\')" style="margin-top:8px;padding:8px 16px;border-radius:8px;background:linear-gradient(135deg,#25D366,#128C7E);border:none;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">📱 Contactar a ' + _safe(sponsorName) + '</button>';
    }
    html += '</div>';
  }

  // Prospect selector
  html += '<select id="coach-agendar-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) { html += '<option value="'+p.id+'" data-phone="'+(p.telefono||'')+'" data-name="'+(p.nombre||'')+'">' + _safe(p.nombre || 'Sin nombre') + '</option>'; });
  html += '</select>';

  // Agenda link card
  html += '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:12px;">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Tu link de agenda</div>';
  html += '<div style="font-size:12px;color:#C9A84C;word-break:break-all;font-family:monospace;">' + agendaLink + '</div>';
  html += '</div>';

  // Generate message + send
  html += '<button onclick="coachSendAgenda()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">📱 Enviar agenda por WhatsApp</button>';

  html += '</div>';
  return html;
}


// ── Tool: Pipeline de Ventas ─────────────────────────────────

function renderToolCrmPipeline() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos : [];
  var etapas = ['nuevo','contactado','interesado','presentacion','seguimiento','cerrado_ganado','cerrado_perdido'];
  var labels = {nuevo:'Nuevo',contactado:'Contactado',interesado:'Interesado',presentacion:'Presentación',seguimiento:'Seguimiento',cerrado_ganado:'Ganado ✅',cerrado_perdido:'Perdido ❌'};
  var colors = {nuevo:'#C9A84C',contactado:'#7F77DD',interesado:'#E8D48B',presentacion:'#1D9E75',seguimiento:'#FFD700',cerrado_ganado:'#25D366',cerrado_perdido:'#E24B4A'};

  var counts = {};
  var totalValor = 0;
  etapas.forEach(function(e) { counts[e] = 0; });
  pros.forEach(function(p) { counts[p.etapa] = (counts[p.etapa]||0)+1; totalValor += (p.valor_estimado||0); });

  var maxCount = Math.max.apply(null, etapas.map(function(e){return counts[e];})) || 1;
  var ganados = counts['cerrado_ganado'] || 0;
  var total = pros.length || 1;
  var tasa = Math.round(ganados / total * 100);

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">📊 Pipeline de Ventas</div>';

  // Summary stats
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">';
  html += '<div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#fff;">'+pros.length+'</div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Total</div></div>';
  html += '<div style="background:rgba(29,158,117,0.08);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#1D9E75;">'+tasa+'%</div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Conversión</div></div>';
  html += '<div style="background:rgba(201,168,76,0.08);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#C9A84C;">$'+totalValor.toLocaleString()+'</div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Pipeline</div></div>';
  html += '</div>';

  // Funnel bars
  etapas.forEach(function(e) {
    var pct = Math.max(5, counts[e] / maxCount * 100);
    html += '<div style="margin-bottom:6px;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:11px;color:rgba(255,255,255,0.6);">'+(labels[e]||e)+'</span><span style="font-size:11px;font-weight:700;color:#fff;">'+counts[e]+'</span></div>';
    html += '<div style="height:8px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden;">';
    html += '<div style="height:100%;width:'+pct+'%;background:'+(colors[e]||'#C9A84C')+';border-radius:4px;transition:width 0.5s;"></div>';
    html += '</div></div>';
  });

  html += '</div>';
  return html;
}


// ── Tool: Mover Etapa ────────────────────────────────────────

function renderToolCrmMover() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];
  var etapas = [
    {id:'nuevo',label:'📋 Nuevo'}, {id:'contactado',label:'📞 Contactado'},
    {id:'interesado',label:'🔥 Interesado'}, {id:'presentacion',label:'📊 Presentación'},
    {id:'seguimiento',label:'🔄 Seguimiento'}, {id:'cerrado_ganado',label:'✅ Ganado'},
    {id:'cerrado_perdido',label:'❌ Perdido'}
  ];

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">🔄 Mover Etapa</div>';

  html += '<select id="coach-mover-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) { html += '<option value="'+p.id+'" data-etapa="'+(p.etapa||'nuevo')+'">' + _safe(p.nombre||'Sin nombre') + ' — ' + (p.etapa||'nuevo') + '</option>'; });
  html += '</select>';

  html += '<select id="coach-mover-etapa" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  etapas.forEach(function(e) { html += '<option value="'+e.id+'">'+e.label+'</option>'; });
  html += '</select>';

  html += '<button onclick="coachMoverEtapa()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">🔄 Mover</button>';
  html += '</div>';
  return html;
}


// ── Tool: Checklist de Cierre ────────────────────────────────

function renderToolCrmChecklist() {
  var checks = [
    { id: 'link', text: '🔗 Tengo mi link de agenda listo', done: !!(CU && CU.ref) },
    { id: 'script', text: '📝 Preparé mi script de cierre', done: false },
    { id: 'sponsor', text: '🤝 Invité a mi patrocinador (si es mi primer cierre)', done: false },
    { id: 'zoom', text: '📹 Tengo Zoom listo y probado', done: false },
    { id: 'info', text: '📋 Revisé la info del prospecto', done: false },
    { id: 'price', text: '💰 Tengo claros los precios y planes', done: false },
    { id: 'objections', text: '🛡️ Preparé respuestas a objeciones comunes', done: false },
    { id: 'followup', text: '📅 Tengo plan de seguimiento post-reunión', done: false }
  ];

  var saved = JSON.parse(localStorage.getItem('coach_checklist') || '{}');

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">📋 Checklist de Cierre</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Prepárate antes de cada reunión de cierre.</div>';

  checks.forEach(function(c) {
    var isDone = saved[c.id] || c.done;
    html += '<div onclick="coachToggleCheck(\''+c.id+'\')" style="display:flex;align-items:center;gap:10px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;">';
    html += '<div style="width:22px;height:22px;border-radius:6px;border:2px solid '+(isDone?'#1D9E75':'rgba(255,255,255,0.15)')+';background:'+(isDone?'rgba(29,158,117,0.2)':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">'+(isDone?'✓':'')+'</div>';
    html += '<span style="font-size:13px;color:'+(isDone?'rgba(255,255,255,0.4)':'#F0EDE6')+';'+(isDone?'text-decoration:line-through;':'')+'">'+c.text+'</span>';
    html += '</div>';
  });

  html += '</div>';
  return html;
}


// ── Tool: Predicción de Cierre ───────────────────────────────

function renderToolCrmPrediccion() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">🎯 Predicción de Cierre</div>';

  if (pros.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">No hay prospectos activos</div>';
  } else {
    // Calculate probability for each prospect
    pros.forEach(function(p) {
      var prob = 0;
      // Temperature contributes 40%
      prob += (p.temperatura || 0) * 0.4;
      // Stage contributes 30%
      var stageScore = {nuevo:10,contactado:25,interesado:50,presentacion:70,seguimiento:85};
      prob += (stageScore[p.etapa] || 0) * 0.3;
      // Rating contributes 20%
      var rating = ((p.calif_positivo||0) + (p.calif_emprendedor||0) + (p.calif_dinero||0) + (p.calif_lider||0)) / 4;
      prob += rating * 100 * 0.2;
      // Recency contributes 10%
      var daysSince = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 30;
      prob += Math.max(0, (10 - daysSince)) * 1;

      prob = Math.min(99, Math.max(1, Math.round(prob)));
      p._prob = prob;
    });

    // Sort by probability desc
    pros.sort(function(a,b) { return (b._prob||0) - (a._prob||0); });

    pros.slice(0, 8).forEach(function(p) {
      var color = p._prob >= 70 ? '#1D9E75' : p._prob >= 40 ? '#C9A84C' : '#E24B4A';
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:6px;">';
      html += '<div style="width:44px;height:44px;border-radius:50%;border:3px solid '+color+';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:'+color+';flex-shrink:0;">'+p._prob+'%</div>';
      html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_safe(p.nombre||'Sin nombre')+'</div>';
      html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+(p.etapa||'nuevo')+' · temp '+(p.temperatura||0)+'%</div></div>';
      html += '</div>';
    });
  }

  html += '</div>';
  return html;
}


// ── Tool: Auto-Seguimiento ───────────────────────────────────

function renderToolCrmAutoseg() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){
    if (p.etapa === 'cerrado_ganado' || p.etapa === 'cerrado_perdido') return false;
    var days = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 999;
    return days >= 3;
  }) : [];

  pros.sort(function(a,b) {
    var da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    var db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return da - db; // oldest first
  });

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">🔔 Auto-Seguimiento</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Prospectos que necesitan contacto. Toca para generar mensaje.</div>';

  if (pros.length === 0) {
    html += '<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.3);"><div style="font-size:32px;margin-bottom:8px;">✅</div>Todos al día — ningún prospecto sin seguimiento.</div>';
  } else {
    pros.slice(0, 10).forEach(function(p) {
      var days = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : '?';
      var urgency = days >= 7 ? '#E24B4A' : '#C9A84C';
      var phone = (p.telefono || '').replace(/[^0-9]/g, '');

      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.02);border-left:3px solid '+urgency+';border-radius:0 10px 10px 0;margin-bottom:6px;">';
      html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#fff;">'+_safe(p.nombre||'Sin nombre')+'</div>';
      html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+days+' días sin contacto · '+(p.etapa||'nuevo')+'</div></div>';
      html += '<button onclick="document.getElementById(\'coach-msg-prospect\').value=\''+p.id+'\';openCoachTool(\'crm_message\')" style="padding:6px 10px;border-radius:8px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:10px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;white-space:nowrap;">💬 Mensaje</button>';
      if (phone) html += '<button onclick="window.open(\'https://wa.me/'+phone+'\',\'_blank\')" style="padding:6px 10px;border-radius:8px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.25);color:#25D366;font-size:10px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">📱</button>';
      html += '</div>';
    });
  }

  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  CRM TOOL FUNCTIONS (Voice, Message, Reminder)
// ═══════════════════════════════════════════════════════════════

var _coachVoiceRec = null;
var _coachVoiceTranscript = '';

window.coachStartVoiceNote = function() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    if(typeof showToast === 'function') showToast('Tu navegador no soporta reconocimiento de voz','error');
    return;
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (_coachVoiceRec) { var rec = _coachVoiceRec; _coachVoiceRec = null; rec.stop(); var b=document.getElementById('coach-voice-rec-btn'); if(b){b.style.background='rgba(255,255,255,0.06)';b.style.borderColor='rgba(255,255,255,0.15)';b.innerHTML='\uD83C\uDFA4';} var st=document.getElementById('coach-voice-status'); if(st)st.textContent='Toca para grabar'; return; }

  _coachVoiceRec = new SR();
  _coachVoiceRec.lang = 'es-MX';
  _coachVoiceRec.continuous = true;
  _coachVoiceRec.interimResults = true;

  var btn = document.getElementById('coach-voice-rec-btn');
  var status = document.getElementById('coach-voice-status');
  if(btn) { btn.style.background = 'rgba(220,38,38,0.2)'; btn.style.borderColor = 'rgba(220,38,38,0.5)'; btn.innerHTML = '\uD83D\uDD34'; }
  if(status) status.textContent = 'Escuchando...';

  _coachVoiceRec.onresult = function(e) {
    var transcript = '';
    for(var i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    _coachVoiceTranscript = transcript;
    var textEl = document.getElementById('coach-voice-text');
    var transEl = document.getElementById('coach-voice-transcript');
    var saveEl = document.getElementById('coach-voice-save');
    if(textEl) textEl.textContent = transcript;
    if(transEl) transEl.style.display = 'block';
    if(saveEl) saveEl.style.display = 'block';
  };

  _coachVoiceRec.onend = function() {
    // Keep listening until user presses stop
    if (_coachVoiceRec) {
      try { _coachVoiceRec.start(); } catch(e) {
        if(btn) { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.15)'; btn.innerHTML = '\uD83C\uDFA4'; }
        if(status) status.textContent = 'Toca para grabar';
        _coachVoiceRec = null;
      }
      return;
    }
    if(btn) { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.15)'; btn.innerHTML = '\uD83C\uDFA4'; }
    if(status) status.textContent = 'Toca para grabar';
  };

  _coachVoiceRec.start();
};

window.coachSaveVoiceNote = function() {
  var select = document.getElementById('coach-voice-prospect');
  if (!select || !select.value) { if(typeof showToast === 'function') showToast('Selecciona un prospecto primero','error'); return; }
  if (!_coachVoiceTranscript) { if(typeof showToast === 'function') showToast('Graba una nota primero','error'); return; }

  var prospectId = select.value;
  var note = _coachVoiceTranscript;
  var dateStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  var fullNote = '[\uD83C\uDFA4 ' + dateStr + '] ' + note;

  // Find prospect and update notes
  if (typeof crmProspectos !== 'undefined') {
    var p = crmProspectos.find(function(pr) { return pr.id == prospectId; });
    if (p) {
      var existingNotes = p.notas || '';
      var newNotes = existingNotes ? existingNotes + '\n' + fullNote : fullNote;

      // Save via CRM API
      if (typeof crmApi === 'function') {
        crmApi('update', { id: prospectId, updates: { notas: newNotes } }).then(function(r) {
          if (r && r.ok) {
            p.notas = newNotes;
            if(typeof showToast === 'function') showToast('\u2705 Nota guardada en ' + (p.nombre || 'prospecto'));
            _coachVoiceTranscript = '';
            var textEl = document.getElementById('coach-voice-text');
            var saveEl = document.getElementById('coach-voice-save');
            if(textEl) textEl.textContent = '';
            if(saveEl) saveEl.style.display = 'none';
          } else {
            if(typeof showToast === 'function') showToast('Error guardando nota','error');
          }
        });
      }
    }
  }
};

window.coachGenerateMessage = function() {
  var prospectSelect = document.getElementById('coach-msg-prospect');
  var typeSelect = document.getElementById('coach-msg-type');
  var resultDiv = document.getElementById('coach-msg-result');
  if (!prospectSelect || !prospectSelect.value || !resultDiv) return;

  var prospect = null;
  if (typeof crmProspectos !== 'undefined') {
    prospect = crmProspectos.find(function(p) { return p.id == prospectSelect.value; });
  }
  if (!prospect) return;

  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">\uD83E\uDD16 Generando mensaje...</div>';

  var msgType = typeSelect ? typeSelect.value : 'seguimiento';
  var context = 'Prospecto: ' + (prospect.nombre||'') + '. Etapa: ' + (prospect.etapa||'nuevo') + '. Temperatura: ' + (prospect.temperatura||50) + '%. Notas: ' + (prospect.notas||'Sin notas') + '. Tipo de mensaje: ' + msgType;

  var systemPrompt = 'Eres un experto en ventas y network marketing. Genera UN mensaje corto para WhatsApp (m\u00e1ximo 3 oraciones) personalizado para este prospecto. El mensaje debe ser natural, amigable, sin parecer robot. NO uses emojis excesivos (m\u00e1ximo 1-2). Responde SOLO con el mensaje, sin explicaci\u00f3n.';

  if (typeof _skyFetch === 'function') {
    _skyFetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: context }]
      })
    }).then(function(r) { return r.json(); }).then(function(d) {
      var text = d.content && d.content[0] ? d.content[0].text : 'No se pudo generar el mensaje.';
      resultDiv.innerHTML = '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">'
        + '<div id="coach-msg-text" style="font-size:13px;color:#F0EDE6;line-height:1.5;margin-bottom:12px;">' + _safe(text) + '</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="var t=document.getElementById(\'coach-msg-text\');if(t)navigator.clipboard.writeText(t.textContent);if(typeof showToast===\'function\')showToast(\'Mensaje copiado \u2713\')" style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCCB Copiar</button>'
        + '<button onclick="window.open(\'https://wa.me/' + ((prospect.telefono||'').replace(/[^0-9]/g,'')) + '?text='+encodeURIComponent(text)+'\',\'_blank\')" style="flex:1;padding:10px;border-radius:8px;background:linear-gradient(135deg,#25D366,#128C7E);border:none;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCF1 Enviar WA</button>'
        + '</div></div>';
    }).catch(function() {
      resultDiv.innerHTML = '<div style="color:#E24B4A;font-size:12px;">Error generando mensaje. Intenta de nuevo.</div>';
    });
  }
};

window.coachSaveReminder = function() {
  var prospectId = document.getElementById('coach-rem-prospect');
  var date = document.getElementById('coach-rem-date');
  var msg = document.getElementById('coach-rem-msg');
  if (!prospectId || !prospectId.value || !date || !date.value) { if(typeof showToast==='function') showToast('Completa los campos','error'); return; }

  if (typeof crmApi === 'function') {
    crmApi('addRecordatorio', { prospecto_id: prospectId.value, fecha_recordatorio: date.value, mensaje: msg ? msg.value : 'Seguimiento' }).then(function(r) {
      if (r && r.ok) {
        if(typeof showToast==='function') showToast('\u23F0 Recordatorio programado \u2713');
        openCoachTool(null); // Back to main
      } else {
        if(typeof showToast==='function') showToast('Error guardando','error');
      }
    });
  }
};


// ── Agendar: Send agenda via WhatsApp ────────────────────────

window.coachSendAgenda = function() {
  var select = document.getElementById('coach-agendar-prospect');
  if (!select || !select.value) { if(typeof showToast==='function') showToast('Selecciona un prospecto','error'); return; }
  var option = select.options[select.selectedIndex];
  var phone = (option.getAttribute('data-phone') || '').replace(/[^0-9]/g, '');
  var name = option.getAttribute('data-name') || 'amigo';
  var agendaLink = CU ? (window.location.origin + '?agenda=' + (CU.ref || CU.username)) : '';
  var msg = 'Hola ' + name + '! 👋 Te comparto mi agenda para que reserves un espacio para nuestra reunión: ' + agendaLink + ' Escoge el horario que mejor te funcione. ¡Te espero! 💪';
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
};


// ── Mover Etapa: Update prospect stage ───────────────────────

window.coachMoverEtapa = function() {
  var pSel = document.getElementById('coach-mover-prospect');
  var eSel = document.getElementById('coach-mover-etapa');
  if (!pSel || !pSel.value || !eSel) return;
  if (typeof crmApi === 'function') {
    crmApi('update', { id: pSel.value, updates: { etapa: eSel.value } }).then(function(r) {
      if (r && r.ok) {
        if(typeof showToast==='function') showToast('✅ Prospecto movido a ' + eSel.value);
        if(typeof crmLoadData==='function') crmLoadData();
      }
    });
  }
};


// ── Checklist: Toggle item ───────────────────────────────────

window.coachToggleCheck = function(id) {
  var saved = JSON.parse(localStorage.getItem('coach_checklist') || '{}');
  saved[id] = !saved[id];
  localStorage.setItem('coach_checklist', JSON.stringify(saved));
  openCoachTool('crm_checklist');
};


// ═══════════════════════════════════════════════════════════════
//  CRM VOICE COMMAND SYSTEM — Intent Detection + Execution
// ═══════════════════════════════════════════════════════════════

var STAGE_MAP = {
  'nuevo': 'nuevo', 'nueva': 'nuevo', 'nuevos': 'nuevo',
  'contactado': 'contactado', 'contactada': 'contactado', 'contactar': 'contactado',
  'interesado': 'interesado', 'interesada': 'interesado',
  'presentacion': 'presentacion', 'presentación': 'presentacion',
  'seguimiento': 'seguimiento',
  'ganado': 'cerrado_ganado', 'cerrado ganado': 'cerrado_ganado', 'cerrado': 'cerrado_ganado', 'ganada': 'cerrado_ganado',
  'perdido': 'cerrado_perdido', 'cerrado perdido': 'cerrado_perdido', 'perdida': 'cerrado_perdido'
};

function findProspectByName(name) {
  if (!name) return null;
  var prospects = window.crmProspectos || [];
  var search = name.toLowerCase().trim();

  // Exact match first
  var exact = prospects.find(function(p) {
    return (p.nombre || '').toLowerCase().trim() === search;
  });
  if (exact) return exact;

  // Contains match
  var partial = prospects.find(function(p) {
    var n = (p.nombre || '').toLowerCase();
    return n.indexOf(search) !== -1 || search.indexOf(n) !== -1;
  });
  if (partial) return partial;

  // First-name match
  var firstName = search.split(/\s+/)[0];
  if (firstName.length >= 3) {
    var byFirst = prospects.find(function(p) {
      return (p.nombre || '').toLowerCase().split(/\s+/)[0] === firstName;
    });
    if (byFirst) return byFirst;
  }

  return null;
}

function resolveStage(text) {
  if (!text) return null;
  var t = text.toLowerCase().trim();
  if (STAGE_MAP[t]) return STAGE_MAP[t];
  // Fuzzy: check if any key is contained
  var keys = Object.keys(STAGE_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (t.indexOf(keys[i]) !== -1) return STAGE_MAP[keys[i]];
  }
  return null;
}

function detectCrmIntent(text) {
  if (!text) return null;
  var msg = text.toLowerCase().trim();
  var prospects = window.crmProspectos || [];
  if (prospects.length === 0) return null;

  var result = null;

  // ── 1. ADD NOTE / COMMENT ──
  // "agrega nota a Pedro: llamar mañana" / "deja comentario en María que dijo que sí"
  var notePatterns = [
    /(?:agrega|deja|pon|añade|a[ñn]ade|agregar|dejar)\s+(?:una?\s+)?(?:nota|comentario|update|estado|observaci[oó]n)\s+(?:a|para|en|de|al?)\s+([^:,]+?)[\s:,]+(.+)/i,
    /(?:nota|comentario)\s+(?:a|para|en|de)\s+([^:,]+?)[\s:,]+(.+)/i,
    /(?:agrega|deja|pon)\s+(?:a|en|para)\s+([^:,]+?)[\s:,]+(.+)/i
  ];
  for (var i = 0; i < notePatterns.length; i++) {
    var m = text.match(notePatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      if (p) { result = { action: 'addNote', prospect: p, value: m[2].trim() }; break; }
    }
  }
  if (result) return result;

  // ── 2. CHANGE TEMPERATURE ──
  // "sube temperatura de Pedro a 80" / "temperatura María 90" / "pon temp de Juan en 60"
  var tempPatterns = [
    /(?:sube|baja|cambia|pon|actualiza|cambiar|subir|bajar)\s+(?:la\s+)?(?:temperatura|temp)\s+(?:de|a)\s+(.+?)\s+(?:a|en|al?)\s+(\d+)/i,
    /(?:temperatura|temp)\s+(?:de\s+)?(.+?)\s+(?:a|en|al?)\s+(\d+)/i,
    /(.+?)\s+(?:temperatura|temp)\s+(?:a|en|al?)\s+(\d+)/i
  ];
  for (var i = 0; i < tempPatterns.length; i++) {
    var m = text.match(tempPatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      var val = parseInt(m[2]);
      if (p && val >= 0 && val <= 100) { result = { action: 'changeTemp', prospect: p, value: val }; break; }
    }
  }
  if (result) return result;

  // ── 3. MOVE STAGE ──
  // "mueve a Pedro a presentación" / "cambia a María a interesada" / "pasa a Juan a ganado"
  var movePatterns = [
    /(?:mueve|cambia|pasa|mover|cambiar|pasar)\s+(?:a\s+)?(.+?)\s+(?:a|hacia|para)\s+(?:la\s+)?(?:etapa\s+(?:de\s+)?)?(.+)/i,
    /(?:etapa|stage)\s+(?:de\s+)?(.+?)\s+(?:a|en)\s+(.+)/i
  ];
  for (var i = 0; i < movePatterns.length; i++) {
    var m = text.match(movePatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      var stage = resolveStage(m[2]);
      if (p && stage) { result = { action: 'moveStage', prospect: p, value: stage }; break; }
    }
  }
  if (result) return result;

  // ── 4. CHANGE RATING (calificación / estrellas) ──
  // "califica a Pedro con 80" / "sube calificación de María a 90"
  var ratingPatterns = [
    /(?:califica|punt[uú]a|eval[uú]a|sube|cambia)\s+(?:la\s+)?(?:calificaci[oó]n|rating|puntuaci[oó]n|estrellas?)\s+(?:de|a)\s+(.+?)\s+(?:a|en|con)\s+(\d+)/i,
    /(?:califica|puntuar|evaluar)\s+(?:a\s+)?(.+?)\s+(?:a|con|en)\s+(\d+)/i
  ];
  for (var i = 0; i < ratingPatterns.length; i++) {
    var m = text.match(ratingPatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      var val = parseInt(m[2]);
      if (p && val >= 0 && val <= 100) { result = { action: 'changeRating', prospect: p, value: val }; break; }
    }
  }
  if (result) return result;

  // ── 5. ADD REMINDER ──
  // "pon recordatorio para Pedro mañana" / "recuérdame llamar a María el lunes"
  var reminderPatterns = [
    /(?:pon|agrega|crear|programa)\s+(?:un?\s+)?(?:recordatorio|reminder|alarma)\s+(?:para|a|de)\s+(.+?)[\s,]+(.+)/i,
    /(?:recu[eé]rdame|recordar)\s+(?:llamar|contactar|escribir)\s+(?:a\s+)?(.+?)[\s,]+(.+)/i
  ];
  for (var i = 0; i < reminderPatterns.length; i++) {
    var m = text.match(reminderPatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      if (p) {
        var when = m[2].trim();
        var reminderDate = parseRelativeDate(when);
        result = { action: 'addReminder', prospect: p, value: when, date: reminderDate };
        break;
      }
    }
  }
  if (result) return result;

  // ── 6. GENERATE MESSAGE ──
  // "genera mensaje para Pedro" / "escríbele a María"
  var msgPatterns = [
    /(?:genera|escribe|crea|haz|redacta)\s+(?:un?\s+)?(?:mensaje|whatsapp|texto|wa)\s+(?:para|a|de)\s+(.+)/i,
    /(?:escr[ií]bele|cont[aá]ctale|env[ií]ale)\s+(?:a\s+)?(.+)/i
  ];
  for (var i = 0; i < msgPatterns.length; i++) {
    var m = text.match(msgPatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      if (p) { result = { action: 'generateMsg', prospect: p }; break; }
    }
  }
  if (result) return result;

  // ── 7. WHATSAPP ──
  // "llama a Pedro" / "whatsapp a María"
  var waPatterns = [
    /(?:llama|whatsapp|wa|abre\s+whatsapp|contacta)\s+(?:a|de|para)\s+(.+)/i
  ];
  for (var i = 0; i < waPatterns.length; i++) {
    var m = text.match(waPatterns[i]);
    if (m) {
      var p = findProspectByName(m[1]);
      if (p && p.telefono) { result = { action: 'whatsapp', prospect: p }; break; }
    }
  }

  return result;
}

function parseRelativeDate(text) {
  var t = text.toLowerCase().trim();
  var now = new Date();
  if (t.indexOf('hoy') !== -1) return now.toISOString().split('T')[0];
  if (t.indexOf('ma\u00f1ana') !== -1 || t.indexOf('manana') !== -1) {
    var d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
  }
  if (t.indexOf('pasado') !== -1) {
    var d = new Date(now); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0];
  }
  var dayNames = [['lunes',1],['martes',2],['miercoles',3],['mi\u00e9rcoles',3],['jueves',4],['viernes',5],['sabado',6],['s\u00e1bado',6],['domingo',0]];
  for (var i = 0; i < dayNames.length; i++) {
    if (t.indexOf(dayNames[i][0]) !== -1) {
      var target = dayNames[i][1];
      var current = now.getDay();
      var diff = target - current;
      if (diff <= 0) diff += 7;
      var d = new Date(now); d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
  }
  // Try to find number of days
  var numMatch = t.match(/(\d+)\s*d[ií]as?/);
  if (numMatch) {
    var d = new Date(now); d.setDate(d.getDate() + parseInt(numMatch[1]));
    return d.toISOString().split('T')[0];
  }
  // Default: tomorrow
  var d = new Date(now); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function executeCrmAction(intent) {
  if (!intent || !intent.prospect) return Promise.resolve(false);
  var p = intent.prospect;
  var pName = p.nombre || 'Prospecto';

  switch (intent.action) {

    case 'addNote':
      var dateStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      var fullNote = '[' + dateStr + '] ' + intent.value;
      var newNotes = p.notas ? p.notas + '\n' + fullNote : fullNote;
      return _coachCrmApi('update', { id: p.id, updates: { notas: newNotes } }).then(function(r) {
        if (r && r.ok) {
          p.notas = newNotes;
          return { ok: true, msg: '\u2705 Nota agregada a **' + pName + '**: "' + intent.value + '"' };
        }
        return { ok: false, msg: '\u274C Error al guardar la nota' };
      });

    case 'changeTemp':
      return _coachCrmApi('update', { id: p.id, updates: { temperatura: intent.value } }).then(function(r) {
        if (r && r.ok) {
          p.temperatura = intent.value;
          return { ok: true, msg: '\uD83C\uDF21\uFE0F Temperatura de **' + pName + '** actualizada a **' + intent.value + '%**' };
        }
        return { ok: false, msg: '\u274C Error al actualizar temperatura' };
      });

    case 'moveStage':
      var stageLabels = { nuevo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', presentacion: 'Presentaci\u00f3n', seguimiento: 'Seguimiento', cerrado_ganado: 'Cerrado Ganado \u2705', cerrado_perdido: 'Cerrado Perdido \u274C' };
      return _coachCrmApi('update', { id: p.id, updates: { etapa: intent.value } }).then(function(r) {
        if (r && r.ok) {
          p.etapa = intent.value;
          return { ok: true, msg: '\uD83D\uDD04 **' + pName + '** movido a **' + (stageLabels[intent.value] || intent.value) + '**' };
        }
        return { ok: false, msg: '\u274C Error al mover etapa' };
      });

    case 'changeRating':
      var val = Math.min(1, Math.max(0, intent.value / 100));
      return _coachCrmApi('update', { id: p.id, updates: {
        calif_positivo: val, calif_emprendedor: val, calif_dinero: val, calif_lider: val
      }}).then(function(r) {
        if (r && r.ok) {
          p.calif_positivo = val; p.calif_emprendedor = val; p.calif_dinero = val; p.calif_lider = val;
          return { ok: true, msg: '\u2B50 Calificaci\u00f3n de **' + pName + '** actualizada a **' + intent.value + '%**' };
        }
        return { ok: false, msg: '\u274C Error al calificar' };
      });

    case 'addReminder':
      var dateISO = intent.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return _coachCrmApi('addRecordatorio', {
        prospecto_id: p.id,
        fecha_recordatorio: dateISO,
        mensaje: 'Seguimiento: ' + intent.value
      }).then(function(r) {
        if (r && r.ok) {
          return { ok: true, msg: '\u23F0 Recordatorio para **' + pName + '** programado (**' + dateISO + '**): ' + intent.value };
        }
        return { ok: false, msg: '\u274C Error al crear recordatorio' };
      });

    case 'generateMsg':
      // Open the message generator tool with the prospect pre-selected
      coachState.tools = 'crm_message';
      renderCoachPanel();
      setTimeout(function() {
        var sel = document.getElementById('coach-msg-prospect');
        if (sel) { sel.value = p.id; }
      }, 100);
      return Promise.resolve({ ok: true, msg: '\uD83D\uDCAC Abriendo generador de mensaje para **' + pName + '**. Selecciona el tipo y genera.' });

    case 'whatsapp':
      var phone = (p.telefono || '').replace(/[^0-9]/g, '');
      if (phone) window.open('https://wa.me/' + phone, '_blank');
      return Promise.resolve({ ok: true, msg: '\uD83D\uDCF1 Abriendo WhatsApp para **' + pName + '**' });

    default:
      return Promise.resolve(null);
  }
}

function _coachCrmApi(action, data) {
  // Use the global crmApi from index.html if available
  if (typeof window.crmApi === 'function') {
    return window.crmApi(action, data);
  }
  // Fallback: direct fetch
  var user = window.CU ? (window.CU.username || window.CU.user || '') : '';
  var body = Object.assign({ action: action, user: user }, data);
  return fetch('/api/prospectos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r) { return r.json(); }).catch(function() { return null; });
}


// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

window.initCoachIA = initCoachIA;
window.openCoach = openCoach;
window.closeCoach = closeCoach;

window.coachCompleteTask = completeTask;
window.coachSkipTask = skipTask;

window.openCoachTool = function(id) {
  coachState.tools = id;
  renderCoachPanel();
};

window.sendCoachMsg = sendCoachMessage;
window.sendCoachMsgFromInput = sendCoachMsgFromInput;
window.toggleCoachVoice = toggleVoice;
window.requestCoachScript = requestCoachScript;
window.generateCoachScript = generateCoachScript;
window.copyCoachScript = copyCoachScript;

// New tools
window.coachCompleteDesafio = coachCompleteDesafio;
window.coachSkipDesafio = coachSkipDesafio;
window.coachGeneratePlan = coachGeneratePlan;
window.coachStartPitchRec = coachStartPitchRec;
window.coachAnalyzePitch = coachAnalyzePitch;
window.coachStartRoleplay = coachStartRoleplay;
window.coachRoleplayReply = coachRoleplayReply;
window.coachRoleplayEnd = coachRoleplayEnd;

})();
