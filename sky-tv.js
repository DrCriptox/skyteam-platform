// === SKY TV â CARTELERA SEMANAL ===
// Redesigned: billboard/schedule view, admin-only event creation
// Shows 4-5 daily activities max, no hourly time slots
(function(){

// --- CSS ---
var css = document.createElement('style');
css.textContent = [
  '#sky-tv-section{font-family:"Nunito",sans-serif;color:#F0EDE6;}',
  '.skytv-header{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px;}',
  '.skytv-header h2{margin:0;font-size:22px;font-weight:700;display:flex;align-items:center;gap:8px;}',
  '.skytv-header-actions{display:flex;gap:8px;}',
  '.skytv-btn{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#F0EDE6;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s;}',
  '.skytv-btn:hover{background:rgba(255,255,255,0.12);}',
  '.skytv-btn-primary{background:linear-gradient(135deg,#0055cc,#0077ff);border-color:rgba(0,119,255,0.3);}',
  '.skytv-btn-primary:hover{background:linear-gradient(135deg,#0066dd,#0088ff);}',
  '.skytv-countdown{background:linear-gradient(135deg,rgba(0,85,204,0.15),rgba(0,119,255,0.08));border:1px solid rgba(0,119,255,0.2);border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;}',
  '.skytv-countdown-timer{font-size:28px;font-weight:800;color:#4da6ff;min-width:120px;text-align:center;}',
  '.skytv-countdown-info{flex:1;}',
  '.skytv-countdown-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(240,237,230,0.5);margin-bottom:2px;}',
  '.skytv-countdown-title{font-size:16px;font-weight:700;}',
  '.skytv-countdown-meta{font-size:12px;color:rgba(240,237,230,0.6);margin-top:2px;}',
  '.skytv-live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,40,40,0.2);border:1px solid rgba(255,40,40,0.4);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;color:#ff4444;animation:skytvPulse 2s infinite;}',
  '@keyframes skytvPulse{0%,100%{opacity:1;}50%{opacity:0.6;}}',
  '.skytv-week-nav{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:20px;}',
  '.skytv-week-label{font-size:15px;font-weight:700;min-width:180px;text-align:center;}',
  '.skytv-nav-btn{width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#F0EDE6;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:all 0.2s;}',
  '.skytv-nav-btn:hover{background:rgba(255,255,255,0.12);}',
  '.skytv-today-btn{font-size:12px;padding:6px 14px;border-radius:8px;border:1px solid rgba(0,119,255,0.3);background:rgba(0,119,255,0.1);color:#4da6ff;cursor:pointer;font-weight:600;}',
  '.skytv-cartelera{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}',
  '@media(max-width:768px){.skytv-cartelera{grid-template-columns:1fr;}}',
  '.skytv-day{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px;min-height:120px;transition:all 0.2s;}',
  '.skytv-day.today{border-color:rgba(0,119,255,0.3);background:rgba(0,119,255,0.06);}',
  '.skytv-day-header{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);}',
  '.skytv-day-name{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(240,237,230,0.5);font-weight:700;}',
  '.skytv-day-num{font-size:20px;font-weight:800;margin-top:2px;}',
  '.skytv-day.today .skytv-day-num{color:#4da6ff;}',
  '.skytv-event{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;}',
  '.skytv-event:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.15);}',
  '.skytv-event-time{font-size:11px;color:#4da6ff;font-weight:700;margin-bottom:3px;}',
  '.skytv-event-title{font-size:13px;font-weight:600;line-height:1.3;}',
  '.skytv-event-cat{display:inline-block;font-size:10px;padding:2px 8px;border-radius:6px;margin-top:4px;font-weight:600;}',
  '.skytv-cat-trading{background:rgba(255,183,0,0.15);color:#ffb700;}',
  '.skytv-cat-liderazgo{background:rgba(0,204,136,0.15);color:#00cc88;}',
  '.skytv-cat-formacion{background:rgba(136,71,255,0.15);color:#8847ff;}',
  '.skytv-cat-motivacion{background:rgba(255,71,136,0.15);color:#ff4788;}',
  '.skytv-cat-default{background:rgba(255,255,255,0.1);color:rgba(240,237,230,0.7);}',
  '.skytv-event-live{border-color:rgba(255,40,40,0.4);background:rgba(255,40,40,0.08);}',
  '.skytv-no-events{text-align:center;padding:16px 8px;color:rgba(240,237,230,0.3);font-size:12px;font-style:italic;}',
  '.skytv-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;}',
  '.skytv-modal{background:#0a1628;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;}',
  '.skytv-modal h3{margin:0 0 16px;font-size:18px;font-weight:700;}',
  '.skytv-modal-close{position:absolute;top:12px;right:16px;background:none;border:none;color:#F0EDE6;font-size:24px;cursor:pointer;}',
  '.skytv-detail-field{margin-bottom:12px;}',
  '.skytv-detail-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(240,237,230,0.4);margin-bottom:2px;}',
  '.skytv-detail-value{font-size:14px;}',
  '.skytv-zoom-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;background:linear-gradient(135deg,#0055cc,#0077ff);border:none;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;transition:all 0.2s;}',
  '.skytv-zoom-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,119,255,0.3);}'
].join('');
document.head.appendChild(css);

// --- STATE ---
var skyTvState = window.skyTvState || {
  currentDate: new Date(),
  eventos: [],
  liveEventos: [],
  selectedWeek: new Date(),
  userIsAdmin: false
};
window.skyTvState = skyTvState;

// --- HELPERS ---
var DIAS_ES = ['Domingo','Lunes','Martes','Mi\u00e9rcoles','Jueves','Viernes','S\u00e1bado'];
var MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getWeekDays(refDate) {
  var d = new Date(refDate);
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  var days = [];
  for (var i = 0; i < 7; i++) {
    var dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return days;
}

function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function formatTime(t) {
  if (!t) return '';
  return t.substring(0,5);
}

function isToday(d) {
  var now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function getCatClass(cat) {
  if (!cat) return 'skytv-cat-default';
  var c = cat.toLowerCase();
  if (c.indexOf('trading') !== -1) return 'skytv-cat-trading';
  if (c.indexOf('liderazgo') !== -1) return 'skytv-cat-liderazgo';
  if (c.indexOf('formacion') !== -1 || c.indexOf('capacitacion') !== -1) return 'skytv-cat-formacion';
  if (c.indexOf('motivacion') !== -1 || c.indexOf('mentalidad') !== -1) return 'skytv-cat-motivacion';
  return 'skytv-cat-default';
}

// --- COUNTDOWN ---
function getNextEvent() {
  var now = new Date();
  var upcoming = skyTvState.eventos.filter(function(e) {
    var dt = new Date(e.fecha + 'T' + (e.hora_inicio || '00:00:00'));
    return dt > now;
  }).sort(function(a, b) {
    return new Date(a.fecha + 'T' + a.hora_inicio) - new Date(b.fecha + 'T' + b.hora_inicio);
  });
  return upcoming.length > 0 ? upcoming[0] : null;
}

function renderCountdown(container) {
  // Check live events first
  var liveEvt = skyTvState.eventos.find(function(e) { return e.en_vivo; });
  if (liveEvt) {
    container.innerHTML = '';
    var liveDiv = document.createElement('div');
    liveDiv.className = 'skytv-countdown';
    liveDiv.style.borderColor = 'rgba(255,40,40,0.3)';
    liveDiv.style.background = 'linear-gradient(135deg,rgba(255,40,40,0.12),rgba(255,40,40,0.04))';
    var badge = document.createElement('div');
    badge.className = 'skytv-live-badge';
    badge.textContent = '\u25CF EN VIVO';
    var info = document.createElement('div');
    info.className = 'skytv-countdown-info';
    var title = document.createElement('div');
    title.className = 'skytv-countdown-title';
    title.textContent = liveEvt.titulo;
    var meta = document.createElement('div');
    meta.className = 'skytv-countdown-meta';
    meta.textContent = (liveEvt.host_nombre || '') + ' \u2022 ' + (liveEvt.categoria || '');
    info.appendChild(title);
    info.appendChild(meta);
    liveDiv.appendChild(badge);
    liveDiv.appendChild(info);
    if (liveEvt.zoom_link) {
      var joinBtn = document.createElement('button');
      joinBtn.className = 'skytv-zoom-btn';
      joinBtn.textContent = '\uD83D\uDCF9 Unirse';
      joinBtn.onclick = function() { window.open(liveEvt.zoom_link, '_blank'); };
      liveDiv.appendChild(joinBtn);
    }
    container.appendChild(liveDiv);
    return;
  }

  var next = getNextEvent();
  if (!next) {
    container.innerHTML = '';
    return;
  }
  var dt = new Date(next.fecha + 'T' + (next.hora_inicio || '00:00:00'));
  var now = new Date();
  var diff = dt - now;
  if (diff < 0) { container.innerHTML = ''; return; }
  var hours = Math.floor(diff / 3600000);
  var mins = Math.floor((diff % 3600000) / 60000);

  container.innerHTML = '';
  var cd = document.createElement('div');
  cd.className = 'skytv-countdown';
  var timer = document.createElement('div');
  timer.className = 'skytv-countdown-timer';
  timer.textContent = hours + 'h ' + mins + 'm';
  var info2 = document.createElement('div');
  info2.className = 'skytv-countdown-info';
  var label = document.createElement('div');
  label.className = 'skytv-countdown-label';
  label.textContent = 'Pr\u00f3ximo evento en';
  var title2 = document.createElement('div');
  title2.className = 'skytv-countdown-title';
  title2.textContent = next.titulo;
  var fDate = new Date(next.fecha + 'T00:00:00');
  var meta2 = document.createElement('div');
  meta2.className = 'skytv-countdown-meta';
  meta2.textContent = DIAS_ES[fDate.getDay()] + ' ' + fDate.getDate() + ' ' + MESES_ES[fDate.getMonth()] + ' a las ' + formatTime(next.hora_inicio) + ' \u2022 ' + (next.host_nombre || '');
  info2.appendChild(label);
  info2.appendChild(title2);
  info2.appendChild(meta2);
  cd.appendChild(timer);
  cd.appendChild(info2);
  container.appendChild(cd);
}

// --- CARTELERA (BILLBOARD) ---
function renderCartelera() {
  var container = document.getElementById('sky-tv-section');
  if (!container) return;
  container.innerHTML = '';

  // Header
  var header = document.createElement('div');
  header.className = 'skytv-header';
  var h2 = document.createElement('h2');
  h2.textContent = '\u26A1 SKY TV';
  header.appendChild(h2);
  var actions = document.createElement('div');
  actions.className = 'skytv-header-actions';
  var refreshBtn = document.createElement('button');
  refreshBtn.className = 'skytv-btn';
  refreshBtn.textContent = '\uD83D\uDD04 Actualizar';
  refreshBtn.onclick = function() { loadEventos(); };
  actions.appendChild(refreshBtn);
  // Admin-only: create event button
  if (skyTvState.userIsAdmin) {
    var createBtn = document.createElement('button');
    createBtn.className = 'skytv-btn skytv-btn-primary';
    createBtn.textContent = '+ Crear Evento';
    createBtn.onclick = function() { openAdminEventForm(); };
    actions.appendChild(createBtn);
  }
  header.appendChild(actions);
  container.appendChild(header);

  // Countdown
  var countdownDiv = document.createElement('div');
  countdownDiv.id = 'skytv-countdown';
  container.appendChild(countdownDiv);
  renderCountdown(countdownDiv);

  // Week navigation
  var weekNav = document.createElement('div');
  weekNav.className = 'skytv-week-nav';
  var prevBtn = document.createElement('button');
  prevBtn.className = 'skytv-nav-btn';
  prevBtn.textContent = '\u2190';
  prevBtn.onclick = function() {
    var d = new Date(skyTvState.selectedWeek);
    d.setDate(d.getDate() - 7);
    skyTvState.selectedWeek = d;
    renderCartelera();
  };
  var weekLabel = document.createElement('span');
  weekLabel.className = 'skytv-week-label';
  var days = getWeekDays(skyTvState.selectedWeek);
  weekLabel.textContent = days[0].getDate() + ' ' + MESES_ES[days[0].getMonth()] + ' - ' + days[6].getDate() + ' ' + MESES_ES[days[6].getMonth()];
  var nextBtn = document.createElement('button');
  nextBtn.className = 'skytv-nav-btn';
  nextBtn.textContent = '\u2192';
  nextBtn.onclick = function() {
    var d = new Date(skyTvState.selectedWeek);
    d.setDate(d.getDate() + 7);
    skyTvState.selectedWeek = d;
    renderCartelera();
  };
  var todayBtn = document.createElement('button');
  todayBtn.className = 'skytv-today-btn';
  todayBtn.textContent = 'Hoy';
  todayBtn.onclick = function() {
    skyTvState.selectedWeek = new Date();
    renderCartelera();
  };
  weekNav.appendChild(prevBtn);
  weekNav.appendChild(weekLabel);
  weekNav.appendChild(nextBtn);
  weekNav.appendChild(todayBtn);
  container.appendChild(weekNav);

  // Cartelera grid
  var grid = document.createElement('div');
  grid.className = 'skytv-cartelera';

  for (var i = 0; i < 7; i++) {
    var dayDate = days[i];
    var dateStr = formatDate(dayDate);
    var dayEvents = skyTvState.eventos.filter(function(e) { return e.fecha === dateStr; })
      .sort(function(a, b) { return (a.hora_inicio || '').localeCompare(b.hora_inicio || ''); });

    var dayDiv = document.createElement('div');
    dayDiv.className = 'skytv-day' + (isToday(dayDate) ? ' today' : '');

    var dayHeader = document.createElement('div');
    dayHeader.className = 'skytv-day-header';
    var dayName = document.createElement('div');
    dayName.className = 'skytv-day-name';
    dayName.textContent = DIAS_ES[dayDate.getDay()];
    var dayNum = document.createElement('div');
    dayNum.className = 'skytv-day-num';
    dayNum.textContent = dayDate.getDate();
    dayHeader.appendChild(dayName);
    dayHeader.appendChild(dayNum);
    dayDiv.appendChild(dayHeader);

    if (dayEvents.length === 0) {
      var noEv = document.createElement('div');
      noEv.className = 'skytv-no-events';
      noEv.textContent = 'Sin actividades';
      dayDiv.appendChild(noEv);
    } else {
      for (var j = 0; j < dayEvents.length; j++) {
        var ev = dayEvents[j];
        var evDiv = document.createElement('div');
        evDiv.className = 'skytv-event' + (ev.en_vivo ? ' skytv-event-live' : '');
        evDiv.dataset.eventId = ev.id;
        evDiv.onclick = (function(evt) { return function() { openEventDetail(evt); }; })(ev);

        var timeDiv = document.createElement('div');
        timeDiv.className = 'skytv-event-time';
        timeDiv.textContent = (ev.en_vivo ? '\u25CF EN VIVO \u2022 ' : '') + formatTime(ev.hora_inicio) + (ev.hora_fin ? ' - ' + formatTime(ev.hora_fin) : '');
        var titleDiv = document.createElement('div');
        titleDiv.className = 'skytv-event-title';
        titleDiv.textContent = ev.titulo;
        evDiv.appendChild(timeDiv);
        evDiv.appendChild(titleDiv);

        if (ev.categoria) {
          var catSpan = document.createElement('span');
          catSpan.className = 'skytv-event-cat ' + getCatClass(ev.categoria);
          catSpan.textContent = ev.categoria;
          evDiv.appendChild(catSpan);
        }
        dayDiv.appendChild(evDiv);
      }
    }
    grid.appendChild(dayDiv);
  }
  container.appendChild(grid);

  // Start countdown interval
  if (window._skytvCountdownInterval) clearInterval(window._skytvCountdownInterval);
  window._skytvCountdownInterval = setInterval(function() {
    var cdDiv = document.getElementById('skytv-countdown');
    if (cdDiv) renderCountdown(cdDiv);
  }, 60000);
}

// --- EVENT DETAIL MODAL ---
function openEventDetail(ev) {
  var overlay = document.createElement('div');
  overlay.className = 'skytv-modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'skytv-modal';

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'float:right;background:none;border:none;color:#F0EDE6;font-size:22px;cursor:pointer;';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = function() { overlay.remove(); };
  modal.appendChild(closeBtn);

  var title = document.createElement('h3');
  title.textContent = ev.titulo;
  modal.appendChild(title);

  if (ev.en_vivo) {
    var liveBadge = document.createElement('div');
    liveBadge.className = 'skytv-live-badge';
    liveBadge.style.marginBottom = '12px';
    liveBadge.textContent = '\u25CF EN VIVO AHORA';
    modal.appendChild(liveBadge);
  }

  var fields = [
    {label: 'Fecha', value: (function(){ var d=new Date(ev.fecha+'T00:00:00'); return DIAS_ES[d.getDay()]+' '+d.getDate()+' '+MESES_ES[d.getMonth()]+' '+d.getFullYear(); })()},
    {label: 'Horario', value: formatTime(ev.hora_inicio) + (ev.hora_fin ? ' - ' + formatTime(ev.hora_fin) : '')},
    {label: 'Categor\u00eda', value: ev.categoria || '-'},
    {label: 'Host', value: ev.host_nombre || '-'},
    {label: 'Descripci\u00f3n', value: ev.descripcion || '-'}
  ];

  for (var f = 0; f < fields.length; f++) {
    var fieldDiv = document.createElement('div');
    fieldDiv.className = 'skytv-detail-field';
    var lbl = document.createElement('div');
    lbl.className = 'skytv-detail-label';
    lbl.textContent = fields[f].label;
    var val = document.createElement('div');
    val.className = 'skytv-detail-value';
    val.textContent = fields[f].value;
    fieldDiv.appendChild(lbl);
    fieldDiv.appendChild(val);
    modal.appendChild(fieldDiv);
  }

  if (ev.zoom_link) {
    var zoomBtn = document.createElement('button');
    zoomBtn.className = 'skytv-zoom-btn';
    zoomBtn.textContent = '\uD83D\uDCF9 Unirse a Zoom';
    zoomBtn.onclick = function() { window.open(ev.zoom_link, '_blank'); };
    modal.appendChild(zoomBtn);
  } else if (ev.zoom_meeting_id) {
    var zoomInfo = document.createElement('div');
    zoomInfo.className = 'skytv-detail-field';
    var zl = document.createElement('div');
    zl.className = 'skytv-detail-label';
    zl.textContent = 'Zoom Meeting ID';
    var zv = document.createElement('div');
    zv.className = 'skytv-detail-value';
    zv.textContent = ev.zoom_meeting_id + (ev.zoom_password ? ' \u2022 Pass: ' + ev.zoom_password : '');
    zoomInfo.appendChild(zl);
    zoomInfo.appendChild(zv);
    modal.appendChild(zoomInfo);
  }

  if (ev.grabacion_url) {
    var recBtn = document.createElement('button');
    recBtn.className = 'skytv-btn';
    recBtn.style.marginTop = '8px';
    recBtn.textContent = '\u25B6 Ver Grabaci\u00f3n';
    recBtn.onclick = function() { window.open(ev.grabacion_url, '_blank'); };
    modal.appendChild(recBtn);
  }

  // Admin actions
  if (skyTvState.userIsAdmin) {
    var adminDiv = document.createElement('div');
    adminDiv.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;';
    var editBtn = document.createElement('button');
    editBtn.className = 'skytv-btn';
    editBtn.textContent = '\u270F Editar';
    editBtn.onclick = function() { overlay.remove(); openAdminEventForm(ev); };
    var delBtn = document.createElement('button');
    delBtn.className = 'skytv-btn';
    delBtn.style.borderColor = 'rgba(255,60,60,0.3)';
    delBtn.style.color = '#ff6666';
    delBtn.textContent = '\uD83D\uDDD1 Eliminar';
    delBtn.onclick = function() {
      if (confirm('\u00bfEliminar "' + ev.titulo + '"?')) {
        deleteEvento(ev.id, function() { overlay.remove(); loadEventos(); });
      }
    };
    var liveToggle = document.createElement('button');
    liveToggle.className = 'skytv-btn';
    liveToggle.style.borderColor = ev.en_vivo ? 'rgba(255,40,40,0.3)' : 'rgba(0,200,100,0.3)';
    liveToggle.style.color = ev.en_vivo ? '#ff4444' : '#00cc66';
    liveToggle.textContent = ev.en_vivo ? '\u23F9 Terminar EN VIVO' : '\uD83D\uDD34 Iniciar EN VIVO';
    liveToggle.onclick = function() {
      toggleLive(ev.id, !ev.en_vivo, function() { overlay.remove(); loadEventos(); });
    };
    adminDiv.appendChild(editBtn);
    adminDiv.appendChild(liveToggle);
    adminDiv.appendChild(delBtn);
    modal.appendChild(adminDiv);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// --- ADMIN EVENT FORM ---
function openAdminEventForm(existingEvent) {
  var ev = existingEvent || {};
  var overlay = document.createElement('div');
  overlay.className = 'skytv-modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var modal = document.createElement('div');
  modal.className = 'skytv-modal';

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'float:right;background:none;border:none;color:#F0EDE6;font-size:22px;cursor:pointer;';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = function() { overlay.remove(); };
  modal.appendChild(closeBtn);

  var title = document.createElement('h3');
  title.textContent = ev.id ? 'Editar Evento' : 'Crear Evento';
  modal.appendChild(title);

  var formFields = [
    {name:'titulo', label:'T\u00edtulo', type:'text', value: ev.titulo||'', required:true},
    {name:'descripcion', label:'Descripci\u00f3n', type:'textarea', value: ev.descripcion||''},
    {name:'categoria', label:'Categor\u00eda', type:'select', value: ev.categoria||'', options:['Trading','Liderazgo','Formaci\u00f3n','Motivaci\u00f3n','Otro']},
    {name:'fecha', label:'Fecha', type:'date', value: ev.fecha||'', required:true},
    {name:'hora_inicio', label:'Hora Inicio', type:'time', value: (ev.hora_inicio||'').substring(0,5), required:true},
    {name:'hora_fin', label:'Hora Fin', type:'time', value: (ev.hora_fin||'').substring(0,5)},
    {name:'host_nombre', label:'Host', type:'text', value: ev.host_nombre||''},
    {name:'zoom_link', label:'Link Zoom', type:'text', value: ev.zoom_link||''},
    {name:'zoom_meeting_id', label:'Zoom Meeting ID', type:'text', value: ev.zoom_meeting_id||''},
    {name:'flyer_url', label:'URL Flyer', type:'text', value: ev.flyer_url||''}
  ];

  var form = document.createElement('div');
  for (var f = 0; f < formFields.length; f++) {
    var ff = formFields[f];
    var group = document.createElement('div');
    group.style.marginBottom = '12px';
    var lbl = document.createElement('label');
    lbl.style.cssText = 'display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(240,237,230,0.5);margin-bottom:4px;';
    lbl.textContent = ff.label;
    group.appendChild(lbl);

    var input;
    if (ff.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (ff.type === 'select') {
      input = document.createElement('select');
      var emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'Seleccionar...';
      input.appendChild(emptyOpt);
      for (var o = 0; o < ff.options.length; o++) {
        var opt = document.createElement('option');
        opt.value = ff.options[o];
        opt.textContent = ff.options[o];
        if (ff.value === ff.options[o]) opt.selected = true;
        input.appendChild(opt);
      }
    } else {
      input = document.createElement('input');
      input.type = ff.type;
    }
    input.name = ff.name;
    input.value = ff.value;
    input.style.cssText = 'width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#F0EDE6;font-size:14px;box-sizing:border-box;';
    if (ff.required) input.required = true;
    group.appendChild(input);
    form.appendChild(group);
  }

  var saveBtn = document.createElement('button');
  saveBtn.className = 'skytv-btn skytv-btn-primary';
  saveBtn.style.cssText = 'width:100%;padding:12px;font-size:15px;margin-top:8px;';
  saveBtn.textContent = ev.id ? 'Guardar Cambios' : 'Crear Evento';
  saveBtn.onclick = function() {
    var data = {};
    var inputs = form.querySelectorAll('input,textarea,select');
    for (var i = 0; i < inputs.length; i++) {
      data[inputs[i].name] = inputs[i].value;
    }
    if (!data.titulo || !data.fecha || !data.hora_inicio) {
      if (typeof crmToast === 'function') crmToast('Completa t\u00edtulo, fecha y hora', 'error');
      return;
    }
    if (ev.id) {
      data.id = ev.id;
      saveEvento(data, 'update', function() { overlay.remove(); loadEventos(); });
    } else {
      saveEvento(data, 'create', function() { overlay.remove(); loadEventos(); });
    }
  };
  form.appendChild(saveBtn);
  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// --- API ---
function loadEventos(callback) {
  fetch('/api/eventos.js?action=list')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      skyTvState.eventos = Array.isArray(data) ? data : (data.data || data.eventos || []);
      renderCartelera();
      if (callback) callback();
    })
    .catch(function(err) {
      console.error('Sky TV load error:', err);
      renderCartelera();
    });
}

function saveEvento(data, action, callback) {
  fetch('/api/eventos.js?action=' + action, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (typeof crmToast === 'function') crmToast(action === 'create' ? 'Evento creado' : 'Evento actualizado', 'success');
      if (callback) callback(res);
    })
    .catch(function(err) {
      console.error('Sky TV save error:', err);
      if (typeof crmToast === 'function') crmToast('Error al guardar: ' + err.message, 'error');
    });
}

function deleteEvento(id, callback) {
  fetch('/api/eventos.js?action=delete', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id: id})
  })
    .then(function(r) { return r.json(); })
    .then(function() {
      if (typeof crmToast === 'function') crmToast('Evento eliminado', 'success');
      if (callback) callback();
    })
    .catch(function(err) {
      console.error('Sky TV delete error:', err);
    });
}

function toggleLive(id, isLive, callback) {
  fetch('/api/eventos.js?action=toggle-live', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id: id, en_vivo: isLive})
  })
    .then(function(r) { return r.json(); })
    .then(function() {
      if (typeof crmToast === 'function') crmToast(isLive ? 'Evento EN VIVO' : 'Transmisi\u00f3n finalizada', 'success');
      if (callback) callback();
    })
    .catch(function(err) {
      console.error('Sky TV live toggle error:', err);
    });
}

// --- INIT ---
window.initSkyTv = function() {
  var container = document.getElementById('sky-tv-content') || document.querySelector('#section-sky-tv .sc');
  if (container && !container.querySelector('.sky-tv-loaded')) {
    container.insertAdjacentHTML('afterbegin', '<div class="sky-tv-loading" style="text-align:center;padding:40px 20px;color:rgba(255,255,255,0.4);font-size:14px;">Cargando Sky TV...</div>');
  }
  var adminBtn = document.getElementById('nav-admin-btn') || document.querySelector('[onclick*="admin"]');
  skyTvState.userIsAdmin = !!adminBtn;
  skyTvState.selectedWeek = new Date();
  loadEventos();
};

window.renderSkyTvCalendar = renderCartelera;
window.openSkyTvEventDetail = openEventDetail;

})();
