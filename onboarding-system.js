
// ═══════════════════════════════════════════════════════════════
// SKYTEAM V2 — ONBOARDING SYSTEM (Frontend)
// Ruta de 7 Días, Logros, Coach IA, Dashboard, Script Bank
// V2.1 — Integrado en Inicio con pestañas
// ═══════════════════════════════════════════════════════════════

(function() {
'use strict';

var OB_API = '/api/onboarding';
var CHAT_API = '/api/chat';

// ── Colores del sistema ──
var C = {
  bg: '#050508', bgCard: 'rgba(255,255,255,0.025)', bgCardHover: 'rgba(255,255,255,0.05)',
  accent: '#C9A84C', gold: '#C9A84C', green: '#1D9E75', red: '#E24B4A',
  orange: '#E8D48B', textMain: '#FFFFFF', textSub: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.05)', glow: 'rgba(255,255,255,0.08)'
};

// ── Estado local ──
var obState = {
  progress: null,
  achievements: [],
  achievementDefs: {},
  dashboard: null,
  coachContext: null,
  coachOpen: false,
  coachMessages: [],
  scripts: [],
  currentTab: 'ruta', // 'ruta', 'progreso', 'logros', 'scripts'
  homePatched: false
};

// ── API Helper ──
function obApi(action, data) {
  var body = Object.assign({ action: action, username: (typeof CU !== 'undefined' && CU) ? CU.username : '' }, data || {});
  return fetch(OB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  }).then(function(r) { return r.json(); });
}

// ══════════════════════════════════════════════════════════
// 1. RUTA DE 7 DÍAS — Wizard paso a paso
// ══════════════════════════════════════════════════════════

var DAY_CONFIG = {
  1: {
    name: 'Conoce tu negocio',
    icon: '🚀',
    desc: 'Entiende qué es SKYTEAM, cómo funciona y cuál es tu oportunidad.',
    tasks: [
      { id: 'd1_tour', label: 'Haz el tour de la plataforma', action: 'startTour' },
      { id: 'd1_video', label: 'Ve el video de bienvenida (3 min)', action: 'autoCheck' },
      { id: 'd1_pwa', label: 'Instala la app en tu celular', action: 'installPWA' },
      { id: 'd1_photo', label: 'Genera tu foto profesional con IA', action: 'openPhotoEditor' }
    ]
  },
  2: {
    name: 'Tu imagen profesional',
    icon: '📸',
    desc: 'Crea tu foto profesional y personaliza tu perfil para generar confianza.',
    tasks: [
      { id: 'd2_photo', label: 'Genera tu foto profesional con IA', action: 'openPhotoEditor' },
      { id: 'd2_bio', label: 'Completa tu biografía y redes', action: 'autoCheck' },
      { id: 'd2_push', label: 'Activa notificaciones push', action: 'activatePush' }
    ]
  },
  3: {
    name: 'Domina el mensaje',
    icon: '💬',
    desc: 'Aprende los scripts de contacto y practica tu primer mensaje.',
    tasks: [
      { id: 'd3_scripts', label: 'Lee los 7 scripts de primer contacto', action: 'autoCheck' },
      { id: 'd3_personaliza', label: 'Personaliza tu script favorito', action: 'autoCheck' },
      { id: 'd3_practica', label: 'Envía tu primer mensaje a un conocido', action: 'autoCheck' }
    ]
  },
  4: {
    name: 'Primeros contactos',
    icon: '👥',
    desc: 'Haz tu lista de 20 contactos y envía tus primeros 3 mensajes.',
    tasks: [
      { id: 'd4_lista', label: 'Crea tu lista de 20 prospectos en el CRM', action: 'openCRM' },
      { id: 'd4_enviar', label: 'Envía 3 mensajes de primer contacto', action: 'autoCheck' },
      { id: 'd4_seguimiento', label: 'Programa seguimiento para mañana', action: 'autoCheck' }
    ]
  },
  5: {
    name: 'Tu primera reunión',
    icon: '📅',
    desc: 'Agenda tu primera reunión por Zoom y prepárate con el guion.',
    tasks: [
      { id: 'd5_agenda', label: 'Agenda una reunión en tu calendario', action: 'openAgenda' },
      { id: 'd5_guion', label: 'Repasa el guion de presentación Zoom', action: 'autoCheck' },
      { id: 'd5_seguimiento', label: 'Da seguimiento a prospectos del día 4', action: 'openCRM' }
    ]
  },
  6: {
    name: 'Lanza tu negocio',
    icon: '🎯',
    desc: 'Comparte tu link personalizado y haz tu primer post de lanzamiento.',
    tasks: [
      { id: 'd6_landing', label: 'Personaliza tu landing page', action: 'openLanding' },
      { id: 'd6_flyer', label: 'Crea tu flyer de lanzamiento', action: 'openFlyerGen' },
      { id: 'd6_post', label: 'Publica tu post de lanzamiento', action: 'autoCheck' }
    ]
  },
  7: {
    name: 'Cierra y crece',
    icon: '🏆',
    desc: 'Haz seguimiento final, cierra tu primera venta y prepárate para escalar.',
    tasks: [
      { id: 'd7_seguimiento', label: 'Seguimiento a todos los prospectos', action: 'openCRM' },
      { id: 'd7_cierre', label: 'Intenta tu primer cierre', action: 'autoCheck' },
      { id: 'd7_plan', label: 'Crea tu plan de acción semanal', action: 'autoCheck' }
    ]
  }
};


function renderOnboarding(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:' + C.textSub + '">Cargando tu ruta...</div>';

  obApi('getProgress').then(function(data) {
    obState.progress = data.progress;
    var p = data.progress || {};
    var tasks = p.tasks || {};
    var currentDay = p.current_day || 1;

    if (data.newAchievement) {
      showCelebration(data.newAchievement);
    }

    // ── PREVIEW MODE: show titles but everything locked/greyed out ──
    var RUTA_LOCKED = true; // Set to false when ready to launch

    var html = '';

    // Header
    html += '<div style="text-align:center;margin-bottom:20px;">';
    html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 4px;">\uD83D\uDDFA\uFE0F Tu Ruta de 7 D\u00edas</h2>';
    html += '<p style="color:' + C.textSub + ';font-size:12px;margin:0;">Sigue cada paso y lanza tu negocio como un profesional</p>';
    html += '</div>';

    if (RUTA_LOCKED) {
      // Locked banner
      html += '<div style="text-align:center;padding:14px 20px;margin-bottom:16px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);border-radius:12px;">';
      html += '<div style="font-size:20px;margin-bottom:6px;">\uD83D\uDD12</div>';
      html += '<div style="font-size:13px;font-weight:700;color:#C9A84C;">Pr\u00f3ximamente</div>';
      html += '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:4px;">Tu ruta de 7 d\u00edas estar\u00e1 disponible muy pronto. Mientras tanto, explora la plataforma.</div>';
      html += '</div>';

      // Show day cards as preview (greyed out, no interactions)
      for (var day = 1; day <= 7; day++) {
        var cfg = DAY_CONFIG[day];
        html += '<div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.04);border-radius:14px;padding:14px 16px;margin-bottom:8px;opacity:0.4;pointer-events:none;">';
        html += '<div style="display:flex;align-items:center;gap:10px;">';
        html += '<div style="font-size:22px;flex-shrink:0;filter:grayscale(1);">' + cfg.icon + '</div>';
        html += '<div style="flex:1;min-width:0;">';
        html += '<span style="font-size:9px;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,0.25);letter-spacing:1px;">D\u00eda ' + day + '</span>';
        html += '<h3 style="font-size:13px;font-weight:700;margin:2px 0 0;color:rgba(255,255,255,0.4);">' + cfg.name + '</h3>';
        html += '</div>';
        html += '<div style="font-size:14px;color:rgba(255,255,255,0.15);">\uD83D\uDD12</div>';
        html += '</div></div>';
      }

      var container = document.getElementById('ob-ruta-content') || document.getElementById('ob-content');
      if (container) container.innerHTML = html;
      return;
    }

    // Progress bar
    var completedDays = 0;
    for (var d = 1; d <= 7; d++) {
      var dayTasks = DAY_CONFIG[d].tasks;
      var allDone = dayTasks.every(function(t) { return tasks[t.id]; });
      if (allDone) completedDays = d;
    }
    var pct = Math.round((completedDays / 7) * 100);

    html += '<div style="margin-bottom:20px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    html += '<span style="font-size:11px;color:' + C.textSub + '">Progreso general</span>';
    html += '<span style="font-size:13px;font-weight:700;color:' + C.accent + '">' + pct + '%</span>';
    html += '</div>';
    html += '<div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,' + C.accent + ',' + C.green + ');border-radius:3px;transition:width 0.5s ease;"></div>';
    html += '</div>';

    // Day dots
    html += '<div style="display:flex;justify-content:space-between;margin-top:8px;padding:0 2px;">';
    for (var dd = 1; dd <= 7; dd++) {
      var dayDone = dd <= completedDays;
      var isCurrent = dd === currentDay && !dayDone;
      var dotColor = dayDone ? C.green : (isCurrent ? C.accent : 'rgba(255,255,255,0.15)');
      var dotBorder = isCurrent ? '2px solid ' + C.accent : 'none';
      var dotShadow = isCurrent ? '0 0 8px ' + C.glow : 'none';
      html += '<div style="width:28px;height:28px;border-radius:50%;background:' + dotColor + ';border:' + dotBorder + ';box-shadow:' + dotShadow + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:' + (dayDone ? '#000' : '#fff') + ';flex-shrink:0;">' + (dayDone ? '\u2713' : dd) + '</div>';
    }
    html += '</div></div>';

    // Day cards
    for (var day = 1; day <= 7; day++) {
      var cfg = DAY_CONFIG[day];
      var dayTaskList = cfg.tasks;
      var doneCount = dayTaskList.filter(function(t) { return tasks[t.id]; }).length;
      var dayComplete = doneCount === dayTaskList.length;
      var isActive = day === currentDay;
      var isLocked = day > currentDay && !dayComplete;
      var isPast = day < currentDay;

      var cardBg = isActive ? 'rgba(255,255,255,0.04)' : C.bgCard;
      var cardBorder = isActive ? '1px solid rgba(201,168,76,0.25)' : dayComplete ? '1px solid rgba(0,230,118,0.3)' : '1px solid ' + C.border;
      var opacity = isLocked ? '0.45' : '1';

      html += '<div style="background:' + cardBg + ';border:' + cardBorder + ';border-radius:14px;padding:16px;margin-bottom:10px;opacity:' + opacity + ';transition:all 0.3s;">';

      // Day header
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
      html += '<div style="font-size:24px;flex-shrink:0;">' + cfg.icon + '</div>';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
      html += '<span style="font-size:10px;font-weight:700;text-transform:uppercase;color:' + (dayComplete ? C.green : isActive ? C.accent : C.textSub) + ';letter-spacing:1px;">D\u00eda ' + day + '</span>';
      if (dayComplete) html += '<span style="font-size:9px;background:rgba(0,230,118,0.15);color:' + C.green + ';padding:2px 6px;border-radius:8px;">\u2713 Listo</span>';
      if (isActive) html += '<span style="font-size:9px;background:rgba(201,168,76,0.15);color:' + C.accent + ';padding:2px 6px;border-radius:8px;animation:obPulse 2s infinite;">\u2190 Aqu\u00ed</span>';
      html += '</div>';
      html += '<h3 style="font-size:14px;font-weight:700;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + cfg.name + '</h3>';
      html += '</div>';
      html += '<div style="font-size:12px;font-weight:700;color:' + (dayComplete ? C.green : C.textSub) + ';flex-shrink:0;">' + doneCount + '/' + dayTaskList.length + '</div>';
      html += '</div>';

      html += '<p style="font-size:12px;color:' + C.textSub + ';margin:0 0 10px;line-height:1.4;">' + cfg.desc + '</p>';

      // Tasks
      if (isActive || isPast || dayComplete) {
        dayTaskList.forEach(function(task) {
          var done = tasks[task.id];
          html += '<div data-task="' + task.id + '" data-action="' + (task.action || '') + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:' + (done ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)') + ';border:1px solid ' + (done ? 'rgba(0,230,118,0.2)' : C.border) + ';border-radius:8px;margin-bottom:5px;cursor:' + (done || isLocked ? 'default' : 'pointer') + ';">';
          html += '<div style="width:18px;height:18px;border-radius:50%;border:2px solid ' + (done ? C.green : 'rgba(255,255,255,0.2)') + ';background:' + (done ? C.green : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;color:#000;">' + (done ? '✓' : '') + '</div>';
          html += '<span style="font-size:12px;color:' + (done ? 'rgba(255,255,255,0.5)' : '#fff') + ';' + (done ? 'text-decoration:line-through;' : '') + 'line-height:1.3;">' + task.label + '</span>';
          html += '</div>';
        });
      }

      html += '</div>';
    }

    // Completed banner
    if (completedDays >= 7) {
      html += '<div style="text-align:center;padding:24px;background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.10);border-radius:14px;margin-top:12px;">';
      html += '<div style="font-size:40px;margin-bottom:6px;">🏆</div>';
      html += '<h3 style="font-size:16px;color:' + C.gold + ';margin:0 0 4px;">¡RUTA COMPLETADA!</h3>';
      html += '<p style="color:' + C.textSub + ';font-size:12px;margin:0;">Has completado los 7 días. ¡Ahora a crecer!</p>';
      html += '</div>';
    }

    container.innerHTML = html;

    // Attach click handlers for tasks
    container.querySelectorAll('[data-task]').forEach(function(el) {
      el.addEventListener('click', function() {
        var taskId = el.getAttribute('data-task');
        var action = el.getAttribute('data-action');
        if (obState.progress && obState.progress.tasks && obState.progress.tasks[taskId]) return;
        handleTaskAction(taskId, action, container);
      });
    });
  }).catch(function(e) {
    container.innerHTML = '<p style="color:' + C.red + ';text-align:center;padding:20px;">Error cargando progreso: ' + e.message + '</p>';
  });
}

function handleTaskAction(taskId, action, container) {
  if (action === 'openCRM') {
    if (typeof navigate === 'function') navigate('prospectos');
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'openAgent') {
    if (typeof navigate === 'function') navigate('agentes');
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'openAgenda') {
    if (typeof navigate === 'function') navigate('agenda');
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'openLanding') {
    showToast('Tu landing personal está disponible desde tu perfil.', 'info');
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'startTour') {
    showToast('Bienvenido a SKYTEAM! Explora cada sección del menú.', 'success');
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'installPWA') {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
    } else {
      showToast('Abre desde Chrome y selecciona "Agregar a pantalla de inicio"', 'info');
    }
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'activatePush') {
    if (typeof window.subscribeToPush === 'function') {
      window.subscribeToPush();
    } else if ('Notification' in window) {
      Notification.requestPermission().then(function(p) {
        if (p === 'granted') showToast('¡Notificaciones activadas!', 'success');
      });
    }
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'openPhotoEditor') {
    openPhotoEditorModal();
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'openFlyerGen') {
    showToast('Genera contenido desde Sky Sales IA → Agente de Contenido', 'info');
    if (typeof navigate === 'function') navigate('skysales');
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'autoCheck') {
    markTaskComplete(taskId, container);
  }
}

function markTaskComplete(taskId, container) {
  obApi('completeTask', { taskId: taskId }).then(function(result) {
    obApi('checkAchievements').then(function(achResult) {
      if (achResult.newAchievements && achResult.newAchievements.length > 0) {
        achResult.newAchievements.forEach(function(a) {
          showCelebration(a);
        });
      }
    });
    renderOnboarding(container);
    showToast('¡Tarea completada! 🎉', 'success');
  });
}


// ══════════════════════════════════════════════════════════
// 2. SISTEMA DE LOGROS Y CELEBRACIONES
// ══════════════════════════════════════════════════════════

function renderAchievements(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:' + C.textSub + '">Cargando logros...</div>';

  obApi('getAchievements').then(function(data) {
    obState.achievements = data.achievements || [];
    obState.achievementDefs = data.definitions || {};
    var unlocked = {};
    obState.achievements.forEach(function(a) { unlocked[a.achievement_id] = a.unlocked_at; });

    var html = '';
    html += '<div style="text-align:center;margin-bottom:20px;">';
    html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 4px;">🏆 Mis Logros</h2>';
    html += '<p style="color:' + C.textSub + ';font-size:12px;margin:0;">Cada acción te acerca a tu primera venta</p>';
    html += '<div style="margin-top:10px;font-size:28px;font-weight:900;color:' + C.gold + '">' + obState.achievements.length + '<span style="font-size:14px;color:' + C.textSub + '">/' + Object.keys(obState.achievementDefs).length + '</span></div>';
    html += '</div>';

    // Achievement grid — responsive 2 cols
    var defKeys = Object.keys(obState.achievementDefs);
    html += '<div class="ob-ach-grid">';
    defKeys.forEach(function(key) {
      var def = obState.achievementDefs[key];
      var isUnlocked = !!unlocked[key];
      var opacity = isUnlocked ? '1' : '0.35';
      var bg = isUnlocked ? 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))' : C.bgCard;
      var border = isUnlocked ? '1px solid rgba(255,215,0,0.25)' : '1px solid ' + C.border;

      html += '<div style="background:' + bg + ';border:' + border + ';border-radius:12px;padding:14px;text-align:center;opacity:' + opacity + ';transition:all 0.3s;">';
      html += '<div style="font-size:28px;margin-bottom:4px;' + (isUnlocked ? '' : 'filter:grayscale(1);') + '">' + def.icon + '</div>';
      html += '<div style="font-size:12px;font-weight:700;margin-bottom:2px;line-height:1.3;">' + def.name + '</div>';
      if (isUnlocked) {
        var date = new Date(unlocked[key]);
        html += '<div style="font-size:9px;color:' + C.green + '">✓ ' + date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + '</div>';
      } else {
        html += '<div style="font-size:9px;color:' + C.textSub + '">🔒 Bloqueado</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  });
}

function showCelebration(achievement) {
  var overlay = document.createElement('div');
  overlay.id = 'ob-celebration';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);animation:obFadeIn 0.3s ease;';

  overlay.innerHTML = '<div style="text-align:center;animation:obBounceIn 0.6s ease;">' +
    '<div id="ob-confetti-zone" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;"></div>' +
    '<div style="font-size:64px;margin-bottom:10px;filter:drop-shadow(0 0 20px rgba(255,215,0,0.5));animation:obPulse 1s infinite;">' + achievement.icon + '</div>' +
    '<h2 style="font-size:20px;font-weight:900;color:' + C.gold + ';margin:0 0 6px;text-shadow:0 0 20px rgba(255,215,0,0.3);">¡LOGRO DESBLOQUEADO!</h2>' +
    '<h3 style="font-size:16px;font-weight:700;color:#fff;margin:0 0 8px;">' + achievement.name + '</h3>' +
    '<p style="font-size:13px;color:' + C.textSub + ';margin:0 20px 20px;max-width:280px;">' + achievement.msg + '</p>' +
    '<button onclick="this.closest(\'#ob-celebration\').remove()" style="padding:10px 28px;border:none;border-radius:10px;background:linear-gradient(135deg,' + C.accent + ',' + C.green + ');color:#000;font-weight:700;font-size:13px;cursor:pointer;">¡Genial!</button>' +
    '</div>';

  document.body.appendChild(overlay);
  launchConfetti();
  setTimeout(function() {
    var el = document.getElementById('ob-celebration');
    if (el) el.remove();
  }, 6000);
}

function launchConfetti() {
  var zone = document.getElementById('ob-confetti-zone');
  if (!zone) return;
  var colors = [C.gold, C.accent, C.green, '#FF6B6B', '#E040FB', '#FF9800'];
  for (var i = 0; i < 60; i++) {
    var p = document.createElement('div');
    var size = Math.random() * 8 + 4;
    var left = Math.random() * 100;
    var delay = Math.random() * 0.5;
    var dur = Math.random() * 2 + 1.5;
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = 'position:absolute;top:-10px;left:' + left + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';animation:obConfettiFall ' + dur + 's ease ' + delay + 's forwards;opacity:0;';
    zone.appendChild(p);
  }
}


// ══════════════════════════════════════════════════════════
// 3. DASHBOARD — "MI PROGRESO"
// ══════════════════════════════════════════════════════════

function renderDashboard(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:' + C.textSub + '">Cargando dashboard...</div>';

  obApi('getDashboard').then(function(data) {
    obState.dashboard = data;
    var html = '';

    html += '<div style="text-align:center;margin-bottom:16px;">';
    html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 4px;">📊 Mi Progreso</h2>';
    html += '<p style="color:' + C.textSub + ';font-size:12px;margin:0;">Tu resumen diario en un vistazo</p>';
    html += '</div>';

    // 3 metric cards — responsive
    var metrics = [
      {
        label: 'Contactos hoy', value: data.contactsToday || 0, icon: '💬',
        color: data.contactsToday >= 3 ? C.green : data.contactsToday >= 1 ? C.orange : C.red,
        target: 3, hint: data.contactsToday >= 3 ? '¡Excelente!' : 'Meta: 3/día'
      },
      {
        label: 'Reuniones', value: data.meetingsThisWeek || 0, icon: '📅',
        color: data.meetingsThisWeek >= 2 ? C.green : data.meetingsThisWeek >= 1 ? C.orange : C.red,
        target: 2, hint: data.meetingsThisWeek >= 2 ? '¡Gran semana!' : 'Meta: 2/sem'
      },
      {
        label: 'Cierres', value: data.closesThisMonth || 0, icon: '💰',
        color: data.closesThisMonth >= 1 ? C.green : C.red,
        target: 3, hint: data.closesThisMonth >= 1 ? '¡Ya cerraste!' : 'Meta: 3/mes'
      }
    ];

    html += '<div class="ob-metrics-grid">';
    metrics.forEach(function(m) {
      html += '<div style="background:' + C.bgCard + ';border:1px solid ' + C.border + ';border-radius:12px;padding:14px;text-align:center;">';
      html += '<div style="font-size:24px;margin-bottom:2px;">' + m.icon + '</div>';
      html += '<div style="font-size:32px;font-weight:900;color:' + m.color + ';">' + m.value + '</div>';
      html += '<div style="font-size:10px;color:' + C.textSub + ';margin-top:2px;">' + m.label + '</div>';
      html += '<div style="width:6px;height:6px;border-radius:50%;background:' + m.color + ';margin:4px auto 0;box-shadow:0 0 6px ' + m.color + ';"></div>';
      html += '<div style="font-size:8px;color:' + C.textSub + ';margin-top:3px;">' + m.hint + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Onboarding progress
    if (data.onboarding && !data.onboarding.completed_at) {
      var ob = data.onboarding;
      var dayPct = Math.round(((ob.current_day - 1) / 7) * 100);
      html += '<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:12px;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
      html += '<span style="font-size:12px;font-weight:700;">🗺️ Ruta de 7 Días</span>';
      html += '<span style="font-size:11px;color:' + C.accent + ';font-weight:700;">Día ' + ob.current_day + '/7</span>';
      html += '</div>';
      html += '<div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">';
      html += '<div style="height:100%;width:' + dayPct + '%;background:' + C.accent + ';border-radius:3px;"></div>';
      html += '</div>';
      html += '<div style="text-align:center;margin-top:8px;">';
      html += '<button onclick="obSwitchTab(\'ruta\')" style="padding:7px 16px;border:none;border-radius:8px;background:' + C.accent + ';color:#000;font-weight:700;font-size:11px;cursor:pointer;">Continuar mi ruta →</button>';
      html += '</div></div>';
    }

    // Achievement progress
    html += '<div style="background:' + C.bgCard + ';border:1px solid ' + C.border + ';border-radius:12px;padding:14px;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
    html += '<span style="font-size:12px;font-weight:700;">🏆 Logros</span>';
    html += '<span style="font-size:11px;color:#fff;font-weight:700;">' + (data.achievementCount || 0) + '/' + (data.totalAchievements || 12) + '</span>';
    html += '</div>';
    var achPct = Math.round(((data.achievementCount || 0) / (data.totalAchievements || 12)) * 100);
    html += '<div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + achPct + '%;background:' + C.gold + ';border-radius:3px;"></div>';
    html += '</div>';
    html += '<div style="text-align:center;margin-top:8px;">';
    html += '<button onclick="obSwitchTab(\'logros\')" style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,215,0,0.12);color:' + C.gold + ';font-weight:700;font-size:11px;cursor:pointer;border:1px solid rgba(255,215,0,0.2);">Ver mis logros</button>';
    html += '</div></div>';

    container.innerHTML = html;
  });
}


// ══════════════════════════════════════════════════════════
// 4. COACH IA FLOTANTE
// ══════════════════════════════════════════════════════════

function initCoachButton() {
  // Coach button disabled
  return;

  var btn = document.createElement('div');
  btn.id = 'ob-coach-btn';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,' + C.accent + ',#8B7332);box-shadow:0 4px 20px rgba(201,168,76,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9990;transition:transform 0.2s;';
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  btn.title = 'Coach IA';

  btn.addEventListener('mouseenter', function() { btn.style.transform = 'scale(1.1)'; });
  btn.addEventListener('mouseleave', function() { btn.style.transform = 'scale(1)'; });
  btn.addEventListener('click', function() { toggleCoachPanel(); });

  document.body.appendChild(btn);
  // Start proactive nudge system
  setTimeout(startCoachNudge, 8000);
}

// ══════════════════════════════════════════════════════════
// COACH PROACTIVO — Nudge motivacional automático
// ══════════════════════════════════════════════════════════

var COACH_NUDGE_KEY = 'skyteam_coach_nudge';
var _coachNudgeInterval = null;
var _coachNudgeBubble = null;

var NUDGE_MESSAGES = [
  {frase: '"El seguimiento es donde se esconde el 80% del dinero." 🔥', cta: '¿Quieres que te ayude a hacer seguimiento a tus prospectos hoy?'},
  {frase: '"Cada día sin acción es un día regalado a tu competencia." 🔥', cta: '¿Empezamos a trabajar tu CRM y agendar citas de cierre?'},
  {frase: '"Los líderes no esperan motivación. Crean disciplina." 🔥', cta: '¿Te ayudo sin experiencia a construir tu cheque de más de $1,000 al mes?'},
  {frase: '"Tu franquicia digital es el vehículo. Tu disciplina es el combustible." 🔥', cta: 'Dime y nos ponemos manos a la obra. ¿Avanzamos juntos hoy?'},
  {frase: '"Un mensaje más, una llamada más, un cierre más. Así se construye la libertad." 🔥', cta: '¿Quieres empezar a avanzar y tener resultados hoy?'},
  {frase: '"Mientras otros duermen, tú construyes. Mientras otros dudan, tú ejecutas." 🔥', cta: '¿Te preparo una estrategia para conseguir tus primeras 3 ventas esta semana?'},
  {frase: '"La acción imperfecta siempre le gana a la perfección paralizada." 🔥', cta: 'Dime en qué punto estás y te doy tu siguiente paso concreto.'},
  {frase: '"El 80% de las ventas se hacen entre el 5to y el 12vo contacto." 🔥', cta: '¿Revisamos juntos tus prospectos y les damos seguimiento?'},
  {frase: '"Hoy alguien necesita lo que tú ofreces. Sal a buscarlo." 🔥', cta: '¿Te ayudo a crear mensajes de prospección para hoy?'},
  {frase: '"No vendas un producto. Vende la transformación." 🔥', cta: '¿Quieres un guión de cierre listo para usar en tu próxima cita?'},
  {frase: '"Tus resultados de mañana dependen de lo que hagas hoy después de las 6 PM." 🔥', cta: '¿Hacemos tu plan de acción para esta noche?'},
  {frase: '"Las excusas no pagan facturas. Las acciones sí." 🔥', cta: '¿Empezamos? Te guío paso a paso, sin importar tu nivel de experiencia.'},
  {frase: '"Quien domina el seguimiento, domina las ventas." 🔥', cta: '¿Vemos cuáles prospectos necesitan tu atención hoy?'},
  {frase: '"La libertad financiera no es un golpe de suerte. Es una decisión diaria." 🔥', cta: 'Hoy puede ser el día que cambies tu historia. ¿Arrancamos?'},
  {frase: '"Invierte en ti mismo. Es la única inversión que siempre da retorno." 🔥', cta: '¿Te enseño cómo usar los agentes IA para generar contenido que vende?'}
];

function getLastNudgeTime() {
  try { return parseInt(localStorage.getItem(COACH_NUDGE_KEY) || '0'); } catch(e) { return 0; }
}
function setLastNudgeTime() {
  try { localStorage.setItem(COACH_NUDGE_KEY, String(Date.now())); } catch(e) {}
}

function startCoachNudge() {
  if (_coachNudgeInterval) clearInterval(_coachNudgeInterval);
  // Check every 2 minutes if we should show a nudge
  _coachNudgeInterval = setInterval(checkCoachNudge, 120000);
  // First check after 45 seconds
  setTimeout(checkCoachNudge, 45000);
}

function checkCoachNudge() {
  // Don't nudge if coach is already open
  if (obState.coachOpen) return;
  // Don't nudge if there's already a nudge bubble
  if (_coachNudgeBubble && document.body.contains(_coachNudgeBubble)) return;
  // Don't nudge more than once every 20 minutes
  var lastNudge = getLastNudgeTime();
  if (Date.now() - lastNudge < 20 * 60000) return;

  showCoachNudge();
}

function showCoachNudge() {
  setLastNudgeTime();

  // Get first name from profile
  var nombre = '';
  try { nombre = (typeof CU !== 'undefined' && CU && CU.name) ? CU.name.split(' ')[0] : ''; } catch(e) {}

  // Pick a nudge message
  var idx = Math.floor(Date.now() / 600000) % NUDGE_MESSAGES.length; // changes every 10 min
  var nudge = NUDGE_MESSAGES[idx];

  // Create floating bubble next to coach button
  var bubble = document.createElement('div');
  bubble.id = 'coach-nudge-bubble';
  bubble.style.cssText = 'position:fixed;bottom:80px;right:20px;width:280px;background:linear-gradient(135deg,rgba(5,5,8,0.97),rgba(10,25,55,0.97));border:1px solid rgba(201,168,76,0.15);border-radius:16px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 20px rgba(255,255,255,0.05);z-index:9989;animation:obSlideUp 0.4s ease;cursor:default;';

  var html = '';
  // Close button
  html += '<div onclick="dismissCoachNudge()" style="position:absolute;top:8px;right:10px;cursor:pointer;color:rgba(255,255,255,0.3);font-size:14px;padding:4px;">✕</div>';
  // Phrase
  html += '<p style="margin:0 0 10px;font-size:13px;color:rgba(255,255,255,0.65);font-weight:700;line-height:1.5;font-style:italic;padding-right:18px;">' + nudge.frase + '</p>';
  // CTA message (personalized with name)
  var ctaText = nombre ? (nombre + ', ' + nudge.cta.charAt(0).toLowerCase() + nudge.cta.slice(1)) : nudge.cta;
  html += '<p style="margin:0 0 12px;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.5;">' + ctaText + '</p>';
  // Action button with name
  var btnLabel = nombre ? ('💪 ¡Vamos, ' + nombre + '!') : '💪 ¡Vamos!';
  html += '<button onclick="openCoachFromNudge()" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">' + btnLabel + '</button>';

  bubble.innerHTML = html;
  document.body.appendChild(bubble);
  _coachNudgeBubble = bubble;

  // Pulse animation on coach button
  var btn = document.getElementById('ob-coach-btn');
  if (btn) btn.style.animation = 'obPulse 1.5s ease infinite';

  // Auto-dismiss after 25 seconds if not interacted
  setTimeout(function() {
    if (_coachNudgeBubble && document.body.contains(_coachNudgeBubble)) {
      dismissCoachNudge();
    }
  }, 25000);
}

function dismissCoachNudge() {
  if (_coachNudgeBubble && document.body.contains(_coachNudgeBubble)) {
    _coachNudgeBubble.style.animation = 'obSlideDown 0.3s ease forwards';
    setTimeout(function() {
      if (_coachNudgeBubble && _coachNudgeBubble.parentNode) _coachNudgeBubble.parentNode.removeChild(_coachNudgeBubble);
      _coachNudgeBubble = null;
    }, 300);
  }
  var btn = document.getElementById('ob-coach-btn');
  if (btn) btn.style.animation = '';
}
window.dismissCoachNudge = dismissCoachNudge;

function openCoachFromNudge() {
  dismissCoachNudge();
  if (!obState.coachOpen) toggleCoachPanel();
}
window.openCoachFromNudge = openCoachFromNudge;

var COACH_STORAGE_KEY = 'skyteam_coach_history';
var COACH_EXPIRY_MS = 12 * 3600000; // 12 horas

function saveCoachHistory() {
  try {
    var data = { messages: obState.coachMessages, savedAt: Date.now() };
    localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function loadCoachHistory() {
  try {
    var raw = localStorage.getItem(COACH_STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || !data.messages || !data.messages.length) return null;
    if (Date.now() - data.savedAt > COACH_EXPIRY_MS) {
      localStorage.removeItem(COACH_STORAGE_KEY);
      return null;
    }
    return data.messages;
  } catch(e) { return null; }
}

function toggleCoachPanel() {
  var panel = document.getElementById('ob-coach-panel');
  if (panel) {
    saveCoachHistory();
    panel.remove();
    obState.coachOpen = false;
    return;
  }
  obState.coachOpen = true;
  createCoachPanel();
}
window.toggleCoachPanel = toggleCoachPanel;

function createCoachPanel() {
  var panel = document.createElement('div');
  panel.id = 'ob-coach-panel';
  panel.style.cssText = 'position:fixed;bottom:82px;right:20px;width:320px;max-height:420px;background:' + C.bg + ';border:1px solid rgba(255,255,255,0.08);border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,0.6);z-index:9991;display:flex;flex-direction:column;overflow:hidden;animation:obSlideUp 0.3s ease;';

  var header = '<div style="padding:12px 14px;background:rgba(255,255,255,0.03);border-bottom:1px solid ' + C.border + ';display:flex;align-items:center;gap:8px;">';
  header += '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,' + C.accent + ',#8B7332);display:flex;align-items:center;justify-content:center;font-size:16px;">🤖</div>';
  header += '<div style="flex:1;"><div style="font-size:13px;font-weight:700;">Coach IA</div>';
  header += '<div style="font-size:9px;color:' + C.green + ';">● En línea</div></div>';
  header += '<div onclick="toggleCoachPanel()" style="cursor:pointer;color:' + C.textSub + ';font-size:18px;">✕</div>';
  header += '</div>';

  var messages = '<div id="ob-coach-messages" style="flex:1;overflow-y:auto;padding:12px;min-height:180px;">';
  messages += '<div style="text-align:center;padding:10px;"><div style="display:inline-block;background:rgba(255,255,255,0.03);border-radius:10px;padding:8px 12px;font-size:12px;color:' + C.textSub + ';">Cargando...</div></div>';
  messages += '</div>';

  var input = '<div style="padding:8px 12px;border-top:1px solid ' + C.border + ';display:flex;gap:6px;">';
  input += '<input id="ob-coach-input" type="text" placeholder="Escribe tu pregunta..." style="flex:1;padding:8px 12px;border:1px solid ' + C.border + ';border-radius:8px;background:rgba(255,255,255,0.04);color:#fff;font-size:12px;outline:none;font-family:Outfit,Nunito,sans-serif;" />';
  input += '<button id="ob-coach-send" style="padding:8px 12px;border:none;border-radius:8px;background:' + C.accent + ';color:#000;font-weight:700;font-size:12px;cursor:pointer;">→</button>';
  input += '</div>';

  panel.innerHTML = header + messages + input;
  document.body.appendChild(panel);
  loadCoachContext();

  document.getElementById('ob-coach-send').addEventListener('click', sendCoachMessage);
  document.getElementById('ob-coach-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendCoachMessage();
  });
}

function loadCoachContext() {
  obApi('getCoachContext').then(function(ctx) {
    obState.coachContext = ctx;
    var msgArea = document.getElementById('ob-coach-messages');
    if (!msgArea) return;

    // Try to restore previous conversation (within 12h)
    var saved = loadCoachHistory();
    if (saved && saved.length > 0) {
      obState.coachMessages = saved;
      var html = '';
      saved.forEach(function(m) {
        html += renderCoachBubble(m.content, m.role === 'assistant' ? 'bot' : 'user');
      });
      msgArea.innerHTML = html;
      msgArea.scrollTop = msgArea.scrollHeight;
      return;
    }

    // Fresh conversation — generate smart greeting based on live context
    var live = gatherLiveCoachContext();
    var nombre = live.nombre ? live.nombre.split(' ')[0] : 'socio';
    var greeting = '';

    if (ctx.isNewUser) {
      greeting = '¡Hola ' + nombre + '! 👋 Soy tu Coach IA personal. Estoy aquí para guiarte paso a paso hacia tus primeras ventas. ¿Empezamos con tu Ruta de 7 Días?';
    } else if (live.prospectosSinSeguimiento && live.prospectosSinSeguimiento.length > 0) {
      greeting = '¡Hey ' + nombre + '! 👋 Tienes ' + live.prospectosSinSeguimiento.length + ' prospecto' + (live.prospectosSinSeguimiento.length>1?'s':'') + ' sin seguimiento — ' + live.prospectosSinSeguimiento.slice(0,2).join(' y ') + '. ¿Te ayudo a escribirles un mensaje de seguimiento?';
    } else if (!live.agendaActiva) {
      greeting = '¡Hola ' + nombre + '! 👋 Veo que tu agenda de cierres está inactiva. Activarla es clave para recibir citas automáticas. ¿La activamos juntos?';
    } else if (live.citasFuturas > 0) {
      greeting = '¡' + nombre + '! 🔥 Tienes ' + live.citasFuturas + ' cita' + (live.citasFuturas>1?'s':'') + ' de cierre pendiente' + (live.citasFuturas>1?'s':'') + '. ¿Te preparo un guión para cerrar?';
    } else if (ctx.hotProspects > 0) {
      greeting = '¡' + nombre + '! 🔥 Tienes ' + ctx.hotProspects + ' prospecto' + (ctx.hotProspects>1?'s':'') + ' caliente' + (ctx.hotProspects>1?'s':'') + '. Es momento de agendarles una cita de cierre. ¿Te ayudo?';
    } else if ((live.totalProspectos || 0) === 0) {
      greeting = '¡Hola ' + nombre + '! 👋 Tu CRM está vacío todavía. El primer paso para generar ventas es agregar prospectos. ¿Empezamos a crear tu lista de 20 prospectos?';
    } else if (ctx.onboardingDay && ctx.onboardingDay <= 7) {
      greeting = '¡Hola ' + nombre + '! Estás en el Día ' + ctx.onboardingDay + ' de tu ruta. Rango actual: ' + (live.rankName||'INN 200') + '. ¿En qué te puedo ayudar hoy?';
    } else {
      greeting = '¡Hola ' + nombre + '! 👋 Rango: ' + (live.rankName||'INN 200') + ' | ' + (live.totalProspectos||0) + ' prospectos | ' + (live.citasAgendadas||0) + ' citas. ¿Qué hacemos hoy para avanzar?';
    }

    msgArea.innerHTML = renderCoachBubble(greeting, 'bot');
    obState.coachMessages = [{ role: 'assistant', content: greeting }];
    saveCoachHistory();
  });
}

function renderCoachBubble(text, role) {
  var isBot = role === 'bot' || role === 'assistant';
  var align = isBot ? 'flex-start' : 'flex-end';
  var bg = isBot ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
  var border = isBot ? 'rgba(201,168,76,0.15)' : C.border;
  return '<div style="display:flex;justify-content:' + align + ';margin-bottom:6px;">' +
    '<div style="max-width:85%;padding:8px 12px;background:' + bg + ';border:1px solid ' + border + ';border-radius:10px;font-size:12px;line-height:1.5;">' + text + '</div></div>';
}

function gatherLiveCoachContext() {
  var live = {};
  try {
    // User profile
    if (typeof CU !== 'undefined' && CU) {
      live.nombre = CU.name || '';
      live.username = CU.username || CU.user || '';
      live.rank = CU.rank || 1;
      live.rankName = (typeof RANKS !== 'undefined' && RANKS[CU.rank]) ? RANKS[CU.rank].name : 'INN 200';
      live.ventas = CU.ventas || 0;
      live.equipo = CU.equipo || 0;
      live.ref = CU.ref || '';
      live.landingLink = 'https://innovaia.app?ref=' + (CU.ref || '');
    }
    // CRM prospects
    if (typeof crmProspectos !== 'undefined' && crmProspectos) {
      live.totalProspectos = crmProspectos.length;
      var stages = {};
      crmProspectos.forEach(function(p) { stages[p.etapa] = (stages[p.etapa]||0) + 1; });
      live.prospectosPorEtapa = stages;
      live.prospectosNuevos = stages['nuevo'] || 0;
      live.prospectosContactados = stages['contactado'] || 0;
      live.prospectosInteresados = stages['interesado'] || 0;
      live.prospectosPresentacion = stages['presentacion'] || 0;
      live.prospectosSeguimiento = stages['seguimiento'] || 0;
      live.cerradosGanados = stages['cerrado_ganado'] || 0;
      live.cerradosPerdidos = stages['cerrado_perdido'] || 0;
      // Stale prospects (3+ days without contact)
      var now = Date.now();
      var stale = crmProspectos.filter(function(p) {
        if (!p.etapa || p.etapa === 'cerrado_ganado' || p.etapa === 'cerrado_perdido') return false;
        var updated = p.updated_at ? new Date(p.updated_at).getTime() : 0;
        return (now - updated) > 3*86400000;
      });
      live.prospectosSinSeguimiento = stale.map(function(p) { return p.nombre || 'Sin nombre'; });
    }
    // Agenda bookings
    if (typeof agendaBookings !== 'undefined' && agendaBookings) {
      var activas = agendaBookings.filter(function(b) { return b.status !== 'cancelada'; });
      live.citasAgendadas = activas.length;
      var futuras = activas.filter(function(b) { return new Date(b.fechaISO) > new Date(); });
      live.citasFuturas = futuras.length;
    }
    // Agenda config
    if (typeof agendaConfig !== 'undefined' && agendaConfig) {
      live.agendaActiva = !!agendaConfig.activa;
      live.tieneLinkReunion = !!(agendaConfig.linkReunion);
    }
  } catch(e) { console.error('[Coach] Error gathering live context:', e); }
  return live;
}

function buildCoachSystemPrompt(ctx, live) {
  var name = live.nombre || 'socio';
  var prompt = 'Coach IA de ' + name + ' en SKYTEAM. Mentor, motivador, guía. Genera ventas, cierres, ascensos. Recuerda lo dicho, da continuidad, NO repitas.\n\n' +
    'PLATAFORMA: Inicio(dashboard), SkySalesIA(6 agentes:Objeciones,Contenido,Tráfico,Cierre,Seguimiento,Copy), SkyProspect(CRM+ranking), Agenda(cierres+ranking), Landing(innovaia.app?ref=CODE+ranking visitas), SkyTV(zooms en vivo), Chat, Ranking, Viajes(Bogotá,Cancún,Europa,Dubái).\n\n' +
    'RANGOS: Cliente→INN200→INN500→NOVA1500→NOVA5K→NOVA10K→DIAMANTE20K→NOVA50K. ' +
    'INN200: 750pts/lado, $350-500, ~3 ventas $999 o 4 de $549. ' +
    'Membresías: $229(com$23), $549(com$55+bono$200×3=$665), $999(com$100+bono$500×3=$1600), $1500(com$150+bono$700×3=$2250), $2300(com$230+bono$1000×3=$3230). Autofinanciamiento: 1ra venta cubre, 2da paga, 3ra ganancia.\n\n' +
    '3 RANKINGS: 1)CRM(prospectos+interacciones+cierres) 2)Agenda(citas agendadas+confirmadas) 3)Landing(visitas). Dominar los 3=más ventas+rango rápido.\n\n' +
    'PLAN DIARIO: 3-5 prospectos nuevos, seguimiento a stale 2+días, 1-2 citas cierre, 1 contenido(Reel/historia/post), compartir landing 3 lugares, asistir SkyTV, usar agentes IA.\n\n' +
    'REGLA PROSPECTOS: En mensajes para prospectos JAMÁS decir SKYTEAM/Innova/nombre empresa. Solo "franquicia digital","sistema digital","negocio digital". 3 contactos: 1ro=rapport, 2do=valor, 3ro=oportunidad.\n\n';

  // === LIVE CONTEXT (compact) ===
  prompt += name.toUpperCase() + ': Rango=' + (live.rankName||'INN200') + '('+( live.rank||1)+') Ventas=' + (live.ventas||0) + ' Equipo=' + (live.equipo||0) + ' Landing=' + (live.landingLink||'N/A');
  if (ctx.onboardingDay) prompt += ' Día=' + ctx.onboardingDay;
  if (ctx.achievementsUnlocked) prompt += ' Logros=' + ctx.achievementsUnlocked.length + '/12';
  prompt += '\nCRM: ' + (live.totalProspectos||0) + ' prospectos';
  if (live.totalProspectos > 0) {
    prompt += '(nuevos:' + (live.prospectosNuevos||0) + ' contactados:' + (live.prospectosContactados||0) + ' interesados:' + (live.prospectosInteresados||0) + ' presentación:' + (live.prospectosPresentacion||0) + ' seguimiento:' + (live.prospectosSeguimiento||0) + ' ganados:' + (live.cerradosGanados||0) + ' perdidos:' + (live.cerradosPerdidos||0) + ')';
  }
  if (live.prospectosSinSeguimiento && live.prospectosSinSeguimiento.length > 0) {
    prompt += ' SIN SEGUIMIENTO 3+días: ' + live.prospectosSinSeguimiento.slice(0,3).join(', ');
  }
  prompt += '\nAgenda: ' + (live.agendaActiva ? 'ACTIVA' : 'INACTIVA!') + ' Link:' + (live.tieneLinkReunion ? 'Sí' : 'No!') + ' Citas:' + (live.citasAgendadas||0) + ' Futuras:' + (live.citasFuturas||0);
  if (ctx.hotProspects > 0) prompt += ' CALIENTES:' + ctx.hotProspects;
  prompt += '\n\n';

  // Power phrase (10 rotating hourly, stored locally to save tokens)
  var frases = [
    '"El seguimiento es donde se esconde el 80% del dinero."',
    '"Mientras otros dudan, tú ejecutas."',
    '"Cada prospecto sin contactar es un cierre regalado a otro."',
    '"Las excusas no pagan facturas. Las acciones sí."',
    '"Tu franquicia digital es el vehículo. Tu disciplina es el combustible."',
    '"La acción imperfecta le gana a la perfección paralizada."',
    '"Los que ganan no son los más talentosos, son los más consistentes."',
    '"El 80% de ventas se hacen entre el 5to y 12vo contacto."',
    '"Hoy alguien necesita lo que tú ofreces. Sal a buscarlo."',
    '"Un líder no dice qué hacer. Muestra cómo se hace."'
  ];
  var fraseHoy = frases[Math.floor(Date.now()/3600000) % frases.length];

  prompt += 'FRASE DE PODER (en tu 1ra respuesta, termina con esta frase + 🔥): ' + fraseHoy + '\n\n';

  prompt += 'RESPONDE: español LATAM cercano motivador. Máx 4-5 oraciones. Paso concreto accionable. Scripts listos para copiar. No repitas. Motiva rankings. Prioriza prospectos stale. Si agenda inactiva, urgir activar. Celebra logros. En siguientes respuestas genera frases propias de visión, determinación y mentalidad de crecimiento. Que sienta que construye su libertad.\n';

  return prompt;
}

function sendCoachMessage() {
  var input = document.getElementById('ob-coach-input');
  var msgArea = document.getElementById('ob-coach-messages');
  if (!input || !msgArea) return;

  var text = input.value.trim();
  if (!text) return;
  input.value = '';

  msgArea.innerHTML += renderCoachBubble(text, 'user');
  obState.coachMessages.push({ role: 'user', content: text });
  saveCoachHistory();

  msgArea.innerHTML += '<div id="ob-coach-typing" style="display:flex;justify-content:flex-start;margin-bottom:6px;"><div style="padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:12px;color:' + C.textSub + ';">Pensando...</div></div>';
  msgArea.scrollTop = msgArea.scrollHeight;

  var ctx = obState.coachContext || {};
  var liveCtx = gatherLiveCoachContext();
  var sysPrompt = buildCoachSystemPrompt(ctx, liveCtx);

  var messages = obState.coachMessages.map(function(m) {
    return { role: m.role, content: m.content };
  });

  fetch(CHAT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages, systemPrompt: sysPrompt, agent: 'coach' }),
    cache: 'no-store'
  }).then(function(r) { return r.json(); }).then(function(data) {
    var typing = document.getElementById('ob-coach-typing');
    if (typing) typing.remove();
    var reply = data.reply || data.content || data.message || 'Error. Intenta de nuevo.';
    obState.coachMessages.push({ role: 'assistant', content: reply });
    saveCoachHistory();
    if (msgArea) {
      msgArea.innerHTML += renderCoachBubble(reply, 'bot');
      msgArea.scrollTop = msgArea.scrollHeight;
    }
  }).catch(function() {
    var typing = document.getElementById('ob-coach-typing');
    if (typing) typing.remove();
    if (msgArea) {
      msgArea.innerHTML += renderCoachBubble('Error de conexión. Intenta de nuevo.', 'bot');
    }
  });
}


// ══════════════════════════════════════════════════════════
// 5. SCRIPT BANK — Mensajes Listos
// ══════════════════════════════════════════════════════════

var DEFAULT_SCRIPTS = [
  { category: 'primer_contacto', title: 'Curiosidad', message: 'Hola [NOMBRE], ¿cómo estás? Oye, empecé un proyecto digital que está creciendo mucho y pensé en ti. ¿Te puedo compartir una info rápida? Sin compromiso 😊' },
  { category: 'primer_contacto', title: 'Directo', message: 'Hey [NOMBRE]! Estoy trabajando en algo interesante y creo que te puede beneficiar. ¿Tienes 2 minutos para que te cuente?' },
  { category: 'primer_contacto', title: 'Social', message: '[NOMBRE]! Vi tu historia y me acordé de ti. Oye, arranqué un proyecto nuevo y me encantaría tu opinión. ¿Te puedo enviar un video corto?' },
  { category: 'de_que_se_trata', title: '¿De qué se trata?', message: 'Es una franquicia digital de turismo y bienestar. Básicamente ayudas a personas a ahorrar en viajes y generas ingresos por eso. Lo padre es que todo es desde tu celular. ¿Te mando un video de 3 minutos que lo explica mejor?' },
  { category: 'de_que_se_trata', title: '¿Es de ventas?', message: 'No es vender puerta a puerta ni nada así. Es más como recomendar una plataforma de turismo. Como cuando recomiendas un restaurante pero aquí te pagan por eso. ¿Te interesa saber más?' },
  { category: 'de_que_se_trata', title: '¿Es pirámide?', message: 'Excelente pregunta. No, es una franquicia real con productos de turismo. Tú ganas por ventas reales, no por meter gente. Te puedo enseñar exactamente cómo funciona si quieres.' },
  { category: 'seguimiento_2', title: 'Día 2', message: 'Hola [NOMBRE], ¿pudiste ver la info que te compartí? Me encantaría saber qué opinas 😊' },
  { category: 'seguimiento_2', title: 'Visto sin respuesta', message: 'Hey [NOMBRE]! Sé que estás ocupado(a). Solo quería saber si tienes alguna duda. Estoy aquí para cualquier pregunta 🙌' },
  { category: 'seguimiento_5', title: 'Día 5', message: 'Hola [NOMBRE], pasando a saludar. Tengo novedades del proyecto que creo te van a interesar. ¿Cuándo tienes 5 minutos para platicar?' },
  { category: 'seguimiento_5', title: 'Reactivación', message: '[NOMBRE], ¿recuerdas el proyecto que te comenté? Acaba de salir algo nuevo que está dando muy buenos resultados. ¿Te cuento rápido?' },
  { category: 'invitar_zoom', title: 'Casual', message: '¿Qué te parece si nos conectamos 15 minutos por Zoom? Te muestro todo con pantalla compartida. ¿Te va bien mañana a las [HORA]?' },
  { category: 'invitar_zoom', title: 'Urgencia', message: '[NOMBRE], esta semana estamos con una promo especial. Si quieres aprovecharla, ¿nos conectamos hoy o mañana 15 min por Zoom?' },
  { category: 'invitar_zoom', title: 'Profesional', message: 'Te agendo una reunión corta de 15 min donde te muestro el plan completo con números reales. ¿Prefieres por la mañana o por la tarde?' },
  { category: 'post_zoom', title: 'Cierre suave', message: '¡Gracias por tu tiempo [NOMBRE]! Como viste, el plan es claro y los resultados son reales. ¿Qué es lo que más te llamó la atención?' },
  { category: 'post_zoom', title: 'Cierre directo', message: '[NOMBRE], ya viste toda la info y los resultados del equipo. La pregunta es: ¿estás listo(a) para empezar? Te acompaño paso a paso desde el día uno.' },
  { category: 'reactivacion', title: 'Prospecto frío', message: 'Hola [NOMBRE], ¿cómo has estado? Han pasado unas semanas. El equipo ha crecido mucho desde entonces. ¿Te gustaría saber qué hay de nuevo?' },
  { category: 'reactivacion', title: 'Testimonio', message: '[NOMBRE]! Quería compartirte algo: [TESTIMONIO] acaba de hacer su primera venta esta semana. Empezó igual que tú. ¿Te animas a retomarlo?' }
];

var CATEGORY_LABELS = {
  primer_contacto: { label: 'Primer contacto', icon: '👋', color: C.accent },
  de_que_se_trata: { label: '¿De qué se trata?', icon: '❓', color: '#E040FB' },
  seguimiento_2: { label: 'Seguimiento — Día 2', icon: '📩', color: C.orange },
  seguimiento_5: { label: 'Seguimiento — Día 5+', icon: '🔄', color: '#FF6B6B' },
  invitar_zoom: { label: 'Invitación a Zoom', icon: '📹', color: C.green },
  post_zoom: { label: 'Post-Zoom cierre', icon: '🎯', color: 'rgba(255,255,255,0.55)' },
  reactivacion: { label: 'Reactivación', icon: '🧊', color: '#90CAF9' }
};

function renderScriptBank(container) {
  var scripts = DEFAULT_SCRIPTS;

  var html = '';
  html += '<div style="text-align:center;margin-bottom:16px;">';
  html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 4px;">📝 Banco de Scripts</h2>';
  html += '<p style="color:' + C.textSub + ';font-size:12px;margin:0;">Mensajes listos para copiar y personalizar</p>';
  html += '</div>';

  // Prospect name input
  html += '<div style="margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(201,168,76,0.12);border-radius:10px;">';
  html += '<label style="font-size:10px;color:' + C.textSub + ';display:block;margin-bottom:3px;">Nombre del prospecto</label>';
  html += '<input id="ob-script-name" type="text" placeholder="Ej: Carlos" style="width:100%;padding:7px 10px;border:1px solid ' + C.border + ';border-radius:8px;background:rgba(255,255,255,0.04);color:#fff;font-size:13px;outline:none;font-family:Outfit,Nunito,sans-serif;box-sizing:border-box;" />';
  html += '</div>';

  // Group by category
  var categories = {};
  scripts.forEach(function(s) {
    if (!categories[s.category]) categories[s.category] = [];
    categories[s.category].push(s);
  });

  Object.keys(categories).forEach(function(cat) {
    var catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: '📄', color: C.accent };
    html += '<div style="margin-bottom:14px;">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
    html += '<span style="font-size:16px;">' + catInfo.icon + '</span>';
    html += '<span style="font-size:13px;font-weight:700;color:' + catInfo.color + '">' + catInfo.label + '</span>';
    html += '<span style="font-size:10px;color:' + C.textSub + '">(' + categories[cat].length + ')</span>';
    html += '</div>';

    categories[cat].forEach(function(script, idx) {
      html += '<div style="background:' + C.bgCard + ';border:1px solid ' + C.border + ';border-radius:10px;padding:12px;margin-bottom:5px;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
      html += '<span style="font-size:11px;font-weight:700;">' + script.title + '</span>';
      html += '<button data-script-idx="' + cat + '-' + idx + '" class="ob-copy-btn" style="padding:3px 10px;border:1px solid rgba(255,255,255,0.10);border-radius:6px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.65);font-size:10px;font-weight:600;cursor:pointer;flex-shrink:0;">Copiar</button>';
      html += '</div>';
      html += '<div class="ob-script-text" data-raw="' + encodeURIComponent(script.message) + '" style="font-size:12px;color:rgba(255,255,255,0.7);line-height:1.4;">' + script.message.replace(/\[NOMBRE\]/g, '<span style="color:' + C.accent + ';font-weight:600;">[NOMBRE]</span>') + '</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;

  // Copy handlers
  container.querySelectorAll('.ob-copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var scriptEl = btn.closest('div').parentElement.querySelector('.ob-script-text');
      var raw = decodeURIComponent(scriptEl.getAttribute('data-raw'));
      var nameInput = document.getElementById('ob-script-name');
      var name = nameInput ? nameInput.value.trim() : '';
      var text = name ? raw.replace(/\[NOMBRE\]/g, name) : raw.replace(/\[NOMBRE\]/g, '');
      text = text.replace(/\[HORA\]/g, '').replace(/\[TESTIMONIO\]/g, '');

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          btn.textContent = '✓ Copiado';
          btn.style.color = C.green;
          btn.style.borderColor = C.green;
          setTimeout(function() { btn.textContent = 'Copiar'; btn.style.color = 'rgba(255,255,255,0.65)'; btn.style.borderColor = 'rgba(255,255,255,0.10)'; }, 2000);
        });
      }
    });
  });

  // Name input listener
  var nameInput = document.getElementById('ob-script-name');
  if (nameInput) {
    nameInput.addEventListener('input', function() {
      var name = nameInput.value.trim() || '[NOMBRE]';
      container.querySelectorAll('.ob-script-text').forEach(function(el) {
        var raw = decodeURIComponent(el.getAttribute('data-raw'));
        el.innerHTML = raw.replace(/\[NOMBRE\]/g, '<span style="color:' + C.accent + ';font-weight:600;">' + name + '</span>');
      });
    });
  }
}


// ══════════════════════════════════════════════════════════
// 6. PHOTO EDITOR MODAL
// ══════════════════════════════════════════════════════════

function openPhotoEditorModal() {
  var modal = document.createElement('div');
  modal.id = 'ob-photo-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:obFadeIn 0.3s;';

  var suitColors = [
    { hex: '#1a1a2e', name: 'Azul marino' }, { hex: '#0a3d62', name: 'Azul royal' },
    { hex: '#2d2d2d', name: 'Gris' }, { hex: '#4a0e0e', name: 'Borgoña' },
    { hex: '#0d0d0d', name: 'Negro' }, { hex: '#1b4332', name: 'Verde oscuro' },
    { hex: '#3d2b1f', name: 'Marrón' }, { hex: '#c4a35a', name: 'Beige dorado' },
    { hex: '#c2185b', name: 'Fucsia' }, { hex: '#e91e90', name: 'Rosa' }
  ];
  var shirtColors = [
    { hex: '#FFFFFF', name: 'Blanca' }, { hex: '#D6EAF8', name: 'Azul claro' },
    { hex: '#FADBD8', name: 'Rosa pálido' }, { hex: '#F9E79F', name: 'Amarillo suave' },
    { hex: '#D5F5E3', name: 'Verde menta' }, { hex: '#E8DAEF', name: 'Lavanda' },
    { hex: '#F0F0F0', name: 'Gris claro' }, { hex: '#1a1a2e', name: 'Negra' }
  ];

  var content = '<div style="background:' + C.bg + ';border:1px solid ' + C.border + ';border-radius:18px;padding:20px;max-width:420px;width:92%;max-height:85vh;overflow-y:auto;">';
  content += '<div style="text-align:center;margin-bottom:14px;">';
  content += '<div style="font-size:36px;margin-bottom:4px;">📸</div>';
  content += '<h3 style="font-size:17px;font-weight:800;margin:0 0 3px;">Tu Imagen Profesional</h3>';
  content += '<p style="color:' + C.textSub + ';font-size:11px;margin:0;">Sube tu selfie y elige tu look ejecutivo</p>';
  content += '</div>';

  // Upload
  content += '<div id="ob-photo-upload" style="border:2px dashed rgba(255,255,255,0.15);border-radius:14px;padding:24px;text-align:center;cursor:pointer;" onclick="document.getElementById(\'ob-photo-input\').click()">';
  content += '<div style="font-size:32px;margin-bottom:6px;opacity:0.5;">📷</div>';
  content += '<div style="color:' + C.textSub + ';font-size:11px;">Toca para subir tu selfie</div>';
  content += '<input id="ob-photo-input" type="file" accept="image/*" style="display:none;" />';
  content += '</div>';

  // Preview
  content += '<div id="ob-photo-preview" style="display:none;text-align:center;margin-top:10px;">';
  content += '<img id="ob-photo-img" style="max-width:100%;max-height:180px;border-radius:12px;border:1px solid ' + C.border + ';" />';
  content += '<div style="margin-top:6px;"><a href="#" id="ob-photo-change" style="color:' + C.accent + ';font-size:11px;">Cambiar foto</a></div>';
  content += '</div>';

  // Options
  content += '<div id="ob-photo-options" style="display:none;margin-top:12px;">';

  // Gender
  content += '<div style="font-size:11px;font-weight:700;color:' + C.textSub + ';margin-bottom:5px;">Género</div>';
  content += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
  content += '<button data-gender="male" class="ob-gender-opt" style="flex:1;padding:7px;border:2px solid ' + C.accent + ';border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;font-size:11px;font-weight:700;cursor:pointer;">👨 Hombre</button>';
  content += '<button data-gender="female" class="ob-gender-opt" style="flex:1;padding:7px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.04);color:' + C.textSub + ';font-size:11px;font-weight:700;cursor:pointer;">👩 Mujer</button>';
  content += '</div>';

  // Style selector (juvenil/elegante/cl\u00e1sico)
  content += '<div style="font-size:11px;font-weight:700;color:' + C.textSub + ';margin-bottom:5px;">Estilo</div>';
  content += '<div style="display:flex;gap:6px;margin-bottom:10px;">';
  content += '<button data-style="clasico" class="ob-style-opt" style="flex:1;padding:7px;border:2px solid ' + C.accent + ';border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;font-size:10px;font-weight:700;cursor:pointer;">\ud83c\udfdb Cl\u00e1sico</button>';
  content += '<button data-style="elegante" class="ob-style-opt" style="flex:1;padding:7px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.04);color:' + C.textSub + ';font-size:10px;font-weight:700;cursor:pointer;">\u2728 Elegante</button>';
  content += '<button data-style="juvenil" class="ob-style-opt" style="flex:1;padding:7px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.04);color:' + C.textSub + ';font-size:10px;font-weight:700;cursor:pointer;">\ud83d\udd25 Juvenil</button>';
  content += '</div>';

  // Suit colors
  content += '<div style="font-size:11px;font-weight:700;color:' + C.textSub + ';margin-bottom:5px;">Color del traje</div>';
  content += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">';
  suitColors.forEach(function(sc, i) {
    var bd = i === 0 ? C.accent : 'transparent';
    content += '<div data-suit="' + sc.hex + '" class="ob-suit-opt" style="width:34px;height:34px;border-radius:50%;background:' + sc.hex + ';border:2px solid ' + bd + ';cursor:pointer;" title="' + sc.name + '"></div>';
  });
  content += '</div>';

  // Shirt colors
  content += '<div style="font-size:11px;font-weight:700;color:' + C.textSub + ';margin-bottom:5px;">Color de camisa</div>';
  content += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">';
  shirtColors.forEach(function(sc, i) {
    var bd = i === 0 ? C.accent : 'transparent';
    var ring = (sc.hex === '#FFFFFF' || sc.hex === '#F0F0F0' || sc.hex === '#F9E79F' || sc.hex === '#D5F5E3' || sc.hex === '#FADBD8' || sc.hex === '#D6EAF8' || sc.hex === '#E8DAEF') ? 'box-shadow:inset 0 0 0 1px rgba(255,255,255,0.2);' : '';
    content += '<div data-shirt="' + sc.hex + '" class="ob-shirt-opt" style="width:34px;height:34px;border-radius:50%;background:' + sc.hex + ';border:2px solid ' + bd + ';cursor:pointer;' + ring + '" title="' + sc.name + '"></div>';
  });
  content += '</div>';

  // Tie
  content += '<div id="ob-tie-section">';
  content += '<div style="font-size:11px;font-weight:700;color:' + C.textSub + ';margin-bottom:5px;">Corbata</div>';
  content += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
  content += '<button data-tie="yes" class="ob-tie-opt" style="flex:1;padding:7px;border:2px solid ' + C.accent + ';border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;font-size:11px;font-weight:700;cursor:pointer;">Con corbata</button>';
  content += '<button data-tie="no" class="ob-tie-opt" style="flex:1;padding:7px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,0.04);color:' + C.textSub + ';font-size:11px;font-weight:700;cursor:pointer;">Sin corbata</button>';
  content += '</div>';
  content += '</div>';

  // Generate
  content += '<button id="ob-photo-gen" style="width:100%;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,' + C.accent + ',' + C.green + ');color:#000;font-weight:700;font-size:13px;cursor:pointer;">📸 Generar foto profesional</button>';
  content += '<p style="color:' + C.textSub + ';font-size:10px;text-align:center;margin:6px 0 0;">(En un estudio fotográfico, una imagen profesional cuesta más de $20)</p>';
  content += '</div>';

  // Result
  content += '<div id="ob-photo-result" style="display:none;text-align:center;margin-top:14px;">';
  content += '<p style="color:' + C.green + ';font-size:12px;">¡Foto generada!</p>';
  content += '</div>';

  content += '<button onclick="document.getElementById(\'ob-photo-modal\').remove()" style="width:100%;margin-top:12px;padding:9px;border:1px solid ' + C.border + ';border-radius:10px;background:transparent;color:' + C.textSub + ';font-size:11px;cursor:pointer;">Cerrar</button>';
  content += '</div>';

  modal.innerHTML = content;
  document.body.appendChild(modal);

  // ── State ──
  var selectedGender = 'male';
  var selectedSuit = '#1a1a2e';
  var selectedShirt = '#FFFFFF';
  var selectedTie = 'yes';
  var selectedStyle = 'clasico';

  // File input
  document.getElementById('ob-photo-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById('ob-photo-img').src = ev.target.result;
      document.getElementById('ob-photo-preview').style.display = 'block';
      document.getElementById('ob-photo-options').style.display = 'block';
      document.getElementById('ob-photo-upload').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // Change photo
  var changeLink = document.getElementById('ob-photo-change');
  if (changeLink) changeLink.addEventListener('click', function(e) { e.preventDefault(); document.getElementById('ob-photo-input').click(); });

  // Toggle helper
  function setupToggle(selector, stateKey, activeColor) {
    document.querySelectorAll(selector).forEach(function(btn) {
      btn.addEventListener('click', function() {
        var val = btn.getAttribute('data-' + stateKey);
        if (stateKey === 'gender') selectedGender = val;
        else if (stateKey === 'tie') selectedTie = val;
        else if (stateKey === 'style') selectedStyle = val;
        document.querySelectorAll(selector).forEach(function(b) {
          b.style.borderColor = 'transparent'; b.style.background = 'rgba(255,255,255,0.04)'; b.style.color = C.textSub;
        });
        btn.style.borderColor = C.accent; btn.style.background = 'rgba(255,255,255,0.05)'; btn.style.color = '#fff';
      });
    });
  }
  setupToggle('.ob-gender-opt', 'gender');
  setupToggle('.ob-style-opt', 'style');
  setupToggle('.ob-tie-opt', 'tie');

  // Hide tie section when female is selected
  document.querySelectorAll('.ob-gender-opt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var g = btn.getAttribute('data-gender');
      var tieSection = document.getElementById('ob-tie-section');
      if (g === 'female') {
        if (tieSection) tieSection.style.display = 'none';
        selectedTie = 'no';
      } else {
        if (tieSection) tieSection.style.display = 'block';
      }
    });
  });

  // Color circle helper
  function setupCircles(selector, onSelect) {
    document.querySelectorAll(selector).forEach(function(opt) {
      opt.addEventListener('click', function() {
        document.querySelectorAll(selector).forEach(function(o) { o.style.borderColor = 'transparent'; });
        opt.style.borderColor = C.accent;
        onSelect(opt);
      });
    });
  }
  setupCircles('.ob-suit-opt', function(o) { selectedSuit = o.getAttribute('data-suit'); });
  setupCircles('.ob-shirt-opt', function(o) { selectedShirt = o.getAttribute('data-shirt'); });

  // Generate button
  setTimeout(function() {
    var genBtn = document.getElementById('ob-photo-gen');
    if (genBtn) {
      genBtn.addEventListener('click', function() {
        var imgEl = document.getElementById('ob-photo-img');
        if (!imgEl || !imgEl.src) { showToast('Primero sube tu foto', 'error'); return; }

        // Límite de 3 fotos por usuario
        
        genBtn.textContent = '⌛ Generando con IA... (30-60 seg)';
        genBtn.style.opacity = '0.7';
        genBtn.disabled = true;

        var canvas = document.createElement('canvas');
        var img = imgEl;
        canvas.width = Math.min(img.naturalWidth || 512, 1024);
        canvas.height = Math.min(img.naturalHeight || 512, 1024);
        var ctx2d = canvas.getContext('2d');
        ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
        var base64Data = canvas.toDataURL('image/jpeg', 0.85);

        fetch('/api/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64Data, suit_color: selectedSuit, shirt_color: selectedShirt, tie_option: selectedTie, gender: selectedGender, style: selectedStyle, username: (typeof CU !== 'undefined' && CU && CU.username) ? CU.username : '' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success && (data.image_url || data.image_b64)) {
            var resultSrc = data.image_url || ('data:image/jpeg;base64,' + data.image_b64);
            imgEl.src = resultSrc;
            document.getElementById('ob-photo-result').style.display = 'block';
            document.getElementById('ob-photo-options').style.display = 'none';
            genBtn.textContent = '✅ ¡Foto lista!';
                        showToast('¡Tu foto profesional está lista!', 'success');
            if (typeof CU !== 'undefined' && CU && CU.username) {
              obApi('savePhoto', { photo_url: resultSrc }).catch(function() {});
            }
            var resultDiv = document.getElementById('ob-photo-result');
            if (resultDiv) {
              resultDiv.innerHTML = '<p style="color:' + C.green + ';font-size:12px;margin-bottom:8px;">¡Foto profesional generada!</p>';
              resultDiv.innerHTML += '<a href="' + resultSrc + '" download="mi-foto-profesional.jpg" style="display:inline-block;padding:8px 16px;background:' + C.accent + ';color:#000;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">📥 Descargar foto</a>';
              resultDiv.innerHTML += '<div style="margin-top:8px;"><button onclick="document.getElementById(\'ob-photo-result\').style.display=\'none\';document.getElementById(\'ob-photo-options\').style.display=\'block\';document.getElementById(\'ob-photo-gen\').textContent=\'📸 Generar otra versión\';document.getElementById(\'ob-photo-gen\').disabled=false;document.getElementById(\'ob-photo-gen\').style.opacity=\'1\';" style="padding:6px 14px;border:1px solid ' + C.border + ';border-radius:8px;background:transparent;color:' + C.accent + ';font-size:11px;cursor:pointer;">🔄 Probar otro estilo</button></div>';
            }
            // Mostrar fotos restantes
            if (data.photo_count && data.max_photos) {
              var remaining = data.max_photos - data.photo_count;
              if (remaining > 0) {
                showToast('Te quedan ' + remaining + ' foto(s) gratis', 'info');
              } else {
                showToast('Usaste tus 3 fotos profesionales gratis', 'info');
              }
            }
          } else if (data.error && data.photo_count >= data.max) {
            genBtn.textContent = '\ud83d\udeab L\u00edmite alcanzado (3/3)';
            genBtn.disabled = true;
            genBtn.style.opacity = '0.5';
            showToast('Ya usaste tus 3 fotos profesionales gratuitas', 'error');
          } else {
            genBtn.textContent = '📸 Generar foto profesional';
            genBtn.disabled = false;
            genBtn.style.opacity = '1';
            showToast(data.error || 'Error al generar la foto. Intenta de nuevo.', 'error');
          }
        })
        .catch(function(err) {
          genBtn.textContent = '📸 Generar foto profesional';
          genBtn.disabled = false;
          genBtn.style.opacity = '1';
          showToast('Error de conexión: ' + err.message, 'error');
        });
      });
    }
  }, 100);
}
function openFlyerGenerator() {
  showToast('Próximamente: Generador de flyers', 'info');
}


// ══════════════════════════════════════════════════════════
// 7. HOME TABS — Integración en Inicio
// ══════════════════════════════════════════════════════════

var TAB_CONFIG = [
  { id: 'ruta', label: 'Mi Ruta', icon: '🗺️', color: C.accent, render: renderOnboarding },
  { id: 'progreso', label: 'Progreso', icon: '📊', color: C.green, render: renderDashboard },
  { id: 'logros', label: 'Logros', icon: '🏆', color: C.gold, render: renderAchievements },
  { id: 'scripts', label: 'Scripts', icon: '📝', color: '#E040FB', render: renderScriptBank }
];

// Global tab switch function
window.obSwitchTab = function(tabId) {
  obState.currentTab = tabId;
  var homeEl = document.getElementById('home-content');
  if (!homeEl) return;
  renderHomeTabs(homeEl);
};

function renderHomeTabs(homeEl) {
  if (!CU) return;
  // Guard: only re-render tab bar if tab changed
  if (homeEl._lastTab === obState.currentTab && document.getElementById('ob-tab-content')) {
    var activeTab = TAB_CONFIG.find(function(t) { return t.id === obState.currentTab; });
    var contentEl = document.getElementById('ob-tab-content');
    if (activeTab && contentEl) {
      // Update tab button styles without full re-render
      homeEl.querySelectorAll('.ob-tab-btn').forEach(function(btn) {
        var isActive = btn.getAttribute('data-tab') === obState.currentTab;
        var tab = TAB_CONFIG.find(function(t) { return t.id === btn.getAttribute('data-tab'); });
        if (tab) {
          btn.style.background = isActive ? tab.color : 'transparent';
          btn.style.color = isActive ? '#000' : 'rgba(255,255,255,0.5)';
          btn.style.borderColor = isActive ? tab.color : 'rgba(255,255,255,0.08)';
          btn.style.fontWeight = isActive ? '800' : '600';
        }
      });
      activeTab.render(contentEl);
    }
    return;
  }
  homeEl._lastTab = obState.currentTab;

  var rk = (typeof RANKS !== 'undefined') ? (RANKS[CU.rank] || RANKS[0]) : { icon: '⭐', name: 'Inicio' };

  var html = '';

  // Welcome header — compact
  html += '<div style="margin-bottom:14px;">';
  html += '<div style="font-family:Outfit,Nunito,sans-serif;font-size:20px;font-weight:900;color:#fff;margin-bottom:2px;">Bienvenido, ' + CU.name.split(' ')[0] + ' 👋</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);">' + rk.icon + ' ' + rk.name + '</div>';
  html += '</div>';

  // Tab bar
  html += '<div class="ob-tab-bar">';
  TAB_CONFIG.forEach(function(tab) {
    var isActive = obState.currentTab === tab.id;
    var bgColor = isActive ? tab.color : 'transparent';
    var textColor = isActive ? '#000' : 'rgba(255,255,255,0.5)';
    var borderColor = isActive ? tab.color : 'rgba(255,255,255,0.08)';
    var fontWeight = isActive ? '800' : '600';

    html += '<button class="ob-tab-btn" data-tab="' + tab.id + '" style="';
    html += 'display:flex;align-items:center;gap:5px;';
    html += 'padding:8px 14px;border-radius:10px;';
    html += 'background:' + bgColor + ';';
    html += 'color:' + textColor + ';';
    html += 'border:1px solid ' + borderColor + ';';
    html += 'font-size:12px;font-weight:' + fontWeight + ';';
    html += 'cursor:pointer;white-space:nowrap;';
    html += 'font-family:Outfit,Nunito,sans-serif;';
    html += 'transition:all 0.2s ease;';
    html += '">';
    html += '<span style="font-size:14px;">' + tab.icon + '</span>';
    html += '<span>' + tab.label + '</span>';
    html += '</button>';
  });
  html += '</div>';

  // Content container
  html += '<div id="ob-tab-content" style="margin-top:16px;min-height:200px;"></div>';

  homeEl.innerHTML = html;

  // Attach tab click handlers
  homeEl.querySelectorAll('.ob-tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      obState.currentTab = btn.getAttribute('data-tab');
      renderHomeTabs(homeEl);
    });
  });

  // Render active tab content
  var activeTab = TAB_CONFIG.find(function(t) { return t.id === obState.currentTab; });
  var contentEl = document.getElementById('ob-tab-content');
  if (activeTab && contentEl) {
    activeTab.render(contentEl);
  }
}


// ══════════════════════════════════════════════════════════
// 8. NAVIGATION — obNavigate (legacy support)
// ══════════════════════════════════════════════════════════

window.obNavigate = function(view) {
  // Map view names to tab IDs
  var tabMap = { onboarding: 'ruta', dashboard: 'progreso', achievements: 'logros', scripts: 'scripts' };
  var tabId = tabMap[view] || view;

  // Navigate to home first, then switch tab
  if (typeof navigate === 'function') {
    navigate('home');
  }
  // Small delay to ensure home is rendered
  setTimeout(function() {
    obState.currentTab = tabId;
    var homeEl = document.getElementById('home-content');
    if (homeEl) renderHomeTabs(homeEl);
  }, 50);
};


// ══════════════════════════════════════════════════════════
// 9. CSS STYLES & RESPONSIVE
// ══════════════════════════════════════════════════════════

function injectStyles() {
  if (document.getElementById('ob-styles')) return;
  var style = document.createElement('style');
  style.id = 'ob-styles';
  style.textContent = [
    // Animations
    '@keyframes obFadeIn { from { opacity:0 } to { opacity:1 } }',
    '@keyframes obSlideUp { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }',
    '@keyframes obSlideDown { from { opacity:1;transform:translateY(0) } to { opacity:0;transform:translateY(20px) } }',
    '@keyframes obBounceIn { 0% { opacity:0;transform:scale(0.3) } 50% { opacity:1;transform:scale(1.05) } 70% { transform:scale(0.95) } 100% { transform:scale(1) } }',
    '@keyframes obPulse { 0%,100% { opacity:1 } 50% { opacity:0.6 } }',
    '@keyframes obConfettiFall { 0% { opacity:1;transform:translateY(0) rotate(0deg) } 100% { opacity:0;transform:translateY(100vh) rotate(720deg) } }',

    // Scrollbar
    '#ob-coach-panel ::-webkit-scrollbar { width:4px }',
    '#ob-coach-panel ::-webkit-scrollbar-track { background:transparent }',
    '#ob-coach-panel ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:2px }',
    '.ob-copy-btn:hover { background:rgba(255,255,255,0.08)!important }',

    // Tab bar
    '.ob-tab-bar { display:flex; gap:6px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; padding:2px 0; }',
    '.ob-tab-bar::-webkit-scrollbar { display:none }',
    '.ob-tab-btn:hover { opacity:0.85 }',
    '.ob-tab-btn:active { transform:scale(0.97) }',

    // Grids
    '.ob-metrics-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; }',
    '.ob-ach-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }',

    // ── RESPONSIVE: Mobile ──
    '@media (max-width:480px) {',
    '  #ob-coach-panel { width:calc(100% - 32px)!important; right:16px!important; bottom:76px!important; max-height:60vh!important; }',
    '  #ob-coach-btn { bottom:16px!important; right:16px!important; width:48px!important; height:48px!important; }',
    '  .ob-metrics-grid { grid-template-columns:1fr 1fr 1fr; gap:6px; }',
    '  .ob-ach-grid { grid-template-columns:1fr 1fr; gap:6px; }',
    '  .ob-tab-bar { gap:4px; }',
    '  .ob-tab-btn { padding:7px 10px!important; font-size:11px!important; }',
    '}',

    // ── Extra small screens ──
    '@media (max-width:360px) {',
    '  .ob-metrics-grid { grid-template-columns:1fr 1fr; }',
    '  .ob-tab-btn { padding:6px 8px!important; font-size:10px!important; }',
    '  .ob-tab-btn span:first-child { font-size:12px!important; }',
    '}',

    // iOS safe areas
    '@supports (padding: env(safe-area-inset-bottom)) {',
    '  #ob-coach-btn { bottom:calc(16px + env(safe-area-inset-bottom))!important; }',
    '  #ob-coach-panel { bottom:calc(76px + env(safe-area-inset-bottom))!important; }',
    '}'

  ].join('\n');
  document.head.appendChild(style);
}


// ══════════════════════════════════════════════════════════
// 10. INIT — Patch renderHome + auto-check onboarding
// ══════════════════════════════════════════════════════════

function showToast(msg, type) {
  var existing = document.getElementById('ob-toast');
  if (existing) existing.remove();

  var bgColor = type === 'success' ? C.green : type === 'error' ? C.red : C.accent;
  var toast = document.createElement('div');
  toast.id = 'ob-toast';
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:10px;background:' + bgColor + ';color:#000;font-weight:700;font-size:12px;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:obSlideDown 0.3s ease;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

function patchRenderHome() {
  if (obState.homePatched) return;
  if (typeof window.renderHome !== 'function') return;

  var originalRenderHome = window.renderHome;
  window.renderHome = function() {
    // If CU exists, render our tabbed version
    if (typeof CU !== 'undefined' && CU && CU.username) {
      var homeEl = document.getElementById('home-content');
      if (homeEl) {
        renderHomeTabs(homeEl);
        return;
      }
    }
    // Fallback to original
    originalRenderHome();
  };
  obState.homePatched = true;
}

function obInit() {
  injectStyles();

  // Try to patch renderHome immediately
  patchRenderHome();

  if (typeof CU === 'undefined' || !CU || !CU.username) {
    var checkLogin = setInterval(function() {
      if (typeof CU !== 'undefined' && CU && CU.username) {
        clearInterval(checkLogin);
        initCoachButton();
        obPostLogin();
      }
    }, 2000);
    return;
  }

  // User already logged in
  initCoachButton();
  obPostLogin();
}

function obPostLogin() {
  // Patch renderHome if not done yet
  patchRenderHome();

  // Re-render home with tabs (in case it was already rendered before patch)
  setTimeout(function() {
    var homeEl = document.getElementById('home-content');
    if (homeEl) {
      renderHomeTabs(homeEl);
    }
  }, 500);

  // Check onboarding status (for banner/prompt)
  obApi('getProgress').then(function(data) {
    if (!data.progress || !data.progress.completed_at) {
      // User hasn't completed onboarding — default to ruta tab
      obState.currentTab = 'ruta';
    }
    obApi('checkAchievements').catch(function() {});
  }).catch(function() {});
}

// ── Launch ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', obInit);
} else {
  obInit();
}

})();
