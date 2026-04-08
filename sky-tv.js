// === SKY TV â CARTELERA SEMANAL ===
// Redesigned: billboard/schedule view, admin-only event creation
// Shows 4-5 daily activities max, no hourly time slots
(function(){

// --- CSS ---
var css = document.createElement('style');
css.textContent = [
  '#sky-tv-section{font-family:"Outfit","Nunito",sans-serif;color:#F0EDE6;}',
  '.skytv-header{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px;}',
  '.skytv-header h2{margin:0;font-size:22px;font-weight:700;display:flex;align-items:center;gap:8px;}',
  '.skytv-header-actions{display:flex;gap:8px;}',
  '.skytv-btn{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#F0EDE6;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
  '.skytv-btn:hover{background:rgba(255,255,255,0.12);transform:translateY(-1px);}',
  '.skytv-btn-primary{background:linear-gradient(135deg,#C9A84C 0%,#E8D48B 25%,#C9A84C 50%,#E8D48B 75%,#C9A84C 100%);background-size:200% auto;animation:goldShimmer 6s linear infinite;border-color:rgba(201,168,76,0.20);color:#0a0a12;font-weight:700;}',
  '.skytv-btn-primary:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(201,168,76,0.25);}',
  '.skytv-countdown{background:rgba(255,255,255,0.025);border:1px solid rgba(201,168,76,0.12);border-radius:16px;padding:12px 18px;margin-bottom:14px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 24px rgba(0,0,0,0.2);position:relative;overflow:hidden;}',
  '.skytv-countdown::before{content:\"\";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.2),transparent);}',
  '.skytv-countdown-timer{font-size:28px;font-weight:800;color:#E8D48B;min-width:120px;text-align:center;}',
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
  '.skytv-today-btn{font-size:12px;padding:6px 14px;border-radius:8px;border:1px solid rgba(201,168,76,0.20);background:rgba(255,255,255,0.05);color:#E8D48B;cursor:pointer;font-weight:600;}',
  '.skytv-cartelera{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}',
  '@media(max-width:768px){.skytv-cartelera{grid-template-columns:1fr;}}',
  '.skytv-day{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:12px;min-height:120px;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
  '.skytv-day:hover{border-color:rgba(255,255,255,0.10);transform:translateY(-2px);}',
  '.skytv-day.today{border-color:rgba(201,168,76,0.25);background:rgba(201,168,76,0.03);box-shadow:0 0 20px rgba(201,168,76,0.06);}',
  '.skytv-day-header{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);}',
  '.skytv-day-name{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(240,237,230,0.5);font-weight:700;}',
  '.skytv-day-num{font-size:20px;font-weight:800;margin-top:2px;}',
  '.skytv-day.today .skytv-day-num{color:#E8D48B;}',
  '.skytv-event{background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px;margin-bottom:8px;cursor:pointer;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}',
  '.skytv-event:hover{background:rgba(255,255,255,0.08);border-color:rgba(201,168,76,0.20);transform:translateX(3px);}',
  '.skytv-event-time{font-size:11px;color:#E8D48B;font-weight:700;margin-bottom:3px;}',
  '.skytv-event-title{font-size:13px;font-weight:600;line-height:1.3;}',
  '.skytv-event-cat{display:inline-block;font-size:10px;padding:2px 8px;border-radius:6px;margin-top:4px;font-weight:600;}',
  '.skytv-cat-trading{background:rgba(255,183,0,0.15);color:#ffb700;}',
  '.skytv-cat-liderazgo{background:rgba(0,204,136,0.15);color:#00cc88;}',
  '.skytv-cat-formacion{background:rgba(136,71,255,0.15);color:#8847ff;}',
  '.skytv-cat-motivacion{background:rgba(255,71,136,0.15);color:#ff4788;}',
  '.skytv-cat-default{background:rgba(255,255,255,0.1);color:rgba(240,237,230,0.7);}',
  '.skytv-event-live{border-color:rgba(255,40,40,0.4);background:rgba(255,40,40,0.08);}',
  '.skytv-no-events{text-align:center;padding:16px 8px;color:rgba(240,237,230,0.3);font-size:12px;font-style:italic;}',
  '.skytv-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;}',
  '.skytv-modal{background:rgba(10,10,18,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 24px 64px rgba(0,0,0,0.5);animation:skyModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;}',
  '@keyframes skyModalIn{from{opacity:0;transform:scale(0.95) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}}',
  '.skytv-modal h3{margin:0 0 16px;font-size:18px;font-weight:700;}',
  '.skytv-modal-close{position:absolute;top:12px;right:16px;background:none;border:none;color:#F0EDE6;font-size:24px;cursor:pointer;}',
  '.skytv-detail-field{margin-bottom:12px;}',
  '.skytv-detail-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(240,237,230,0.4);margin-bottom:2px;}',
  '.skytv-detail-value{font-size:14px;}',
  '.skytv-zoom-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:12px;background:linear-gradient(135deg,#C9A84C 0%,#E8D48B 25%,#C9A84C 50%,#E8D48B 75%,#C9A84C 100%);background-size:200% auto;animation:goldShimmer 6s linear infinite;border:none;color:#0a0a12;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}',
  '.skytv-zoom-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 24px rgba(201,168,76,0.3);}',
  '@keyframes goldShimmer{to{background-position:200% center;}}'
].join('');
document.head.appendChild(css);

// --- STATE ---
var skyTvState = window.skyTvState || {
  currentDate: new Date(),
  eventos: [],
  liveEventos: [],
  selectedWeek: new Date(),
  userIsAdmin: false,
  countdownIdx: 0
};
window.skyTvState = skyTvState;

// --- HELPERS ---
var DIAS_ES = ['Domingo','Lunes','Martes','Mi\u00e9rcoles','Jueves','Viernes','S\u00e1bado'];
var MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getWeekDays(refDate) {
  // Start from refDate (default: today) and show next 6 days (7 total)
  var start = refDate ? new Date(refDate) : new Date();
  start.setHours(0,0,0,0);
  var days = [];
  for (var i = 0; i < 7; i++) {
    var dd = new Date(start);
    dd.setDate(start.getDate() + i);
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
function getUpcomingEvents() {
  var now = new Date();
  return skyTvState.eventos.filter(function(e) {
    var dt = new Date(e.fecha + 'T' + (e.hora_inicio || '00:00:00'));
    return dt > now;
  }).sort(function(a, b) {
    return new Date(a.fecha + 'T' + (a.hora_inicio||'00:00:00')) - new Date(b.fecha + 'T' + (b.hora_inicio||'00:00:00'));
  });
}
function getNextEvent() {
  var list = getUpcomingEvents();
  var idx = skyTvState.countdownIdx || 0;
  if (idx >= list.length) idx = 0;
  return list.length > 0 ? list[idx] : null;
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

  var allUpcoming = getUpcomingEvents();
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
  var secs = Math.floor((diff % 60000) / 1000);

  container.innerHTML = '';

  // ── Hero carousel: top 3 upcoming events, swipeable + auto-rotate ──
  var heroEvents = allUpcoming.slice(0, 3).filter(function(e){ return e.flyer_url; });
  if (heroEvents.length === 0 && next && next.flyer_url) heroEvents = [next];
  if (heroEvents.length > 0) {
    var carouselWrap = document.createElement('div');
    carouselWrap.style.cssText = 'position:relative;margin-bottom:12px;overflow:hidden;border-radius:16px;';
    var track = document.createElement('div');
    track.id = 'skytv-hero-track';
    track.style.cssText = 'display:flex;transition:transform 0.4s ease;will-change:transform;';
    for (var hi = 0; hi < heroEvents.length; hi++) {
      var he = heroEvents[hi];
      var slide = document.createElement('div');
      slide.style.cssText = 'min-width:100%;position:relative;cursor:pointer;background:#0a0a12;flex-shrink:0;';
      slide.setAttribute('data-idx', hi);
      (function(evt){ slide.onclick = function(){ openEventDetail(evt); }; })(he);
      var img = document.createElement('img');
      img.src = he.flyer_url; img.alt = he.titulo || '';
      img.style.cssText = 'width:100%;display:block;border-radius:16px;';
      var grad = document.createElement('div');
      grad.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(transparent,rgba(10,10,18,0.95));border-radius:0 0 16px 16px;';
      var info = document.createElement('div');
      info.style.cssText = 'position:absolute;bottom:12px;left:16px;right:16px;';
      var heDt = new Date(he.fecha + 'T' + (he.hora_inicio||'00:00'));
      var heNow = new Date();
      var heDiff = Math.max(0, Math.floor((heDt - heNow)/60000));
      var heTimeLabel = heDiff <= 5 ? '\uD83D\uDD34 EN VIVO' : heDiff <= 60 ? '\u23F0 En ' + heDiff + ' min' : heDiff <= 240 ? '\uD83D\uDD14 En ' + Math.floor(heDiff/60) + 'h' : formatTime(he.hora_inicio);
      info.innerHTML = '<div style="font-size:16px;font-weight:900;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.5);">' + (he.titulo||'') + '</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">'
        + '<span style="font-size:11px;color:rgba(255,255,255,0.7);">' + (he.fecha||'') + ' \u2022 ' + formatTime(he.hora_inicio) + '</span>'
        + '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,0.5);color:' + (heDiff<=5?'#E24B4A':heDiff<=60?'#FFD700':'#C9A84C') + ';font-weight:800;">' + heTimeLabel + '</span></div>';
      slide.appendChild(img); slide.appendChild(grad); slide.appendChild(info);
      track.appendChild(slide);
    }
    carouselWrap.appendChild(track);
    // Dots
    if (heroEvents.length > 1) {
      var dotsDiv = document.createElement('div');
      dotsDiv.id = 'skytv-hero-dots';
      dotsDiv.style.cssText = 'display:flex;justify-content:center;gap:6px;margin-top:8px;';
      for (var di = 0; di < heroEvents.length; di++) {
        var dot = document.createElement('div');
        dot.style.cssText = 'width:' + (di===0?'20px':'8px') + ';height:8px;border-radius:4px;background:' + (di===0?'#C9A84C':'rgba(255,255,255,0.15)') + ';transition:all 0.3s;';
        dotsDiv.appendChild(dot);
      }
      carouselWrap.appendChild(dotsDiv);
    }
    container.appendChild(carouselWrap);
    // Swipe + auto-rotate
    if (heroEvents.length > 1) {
      var _heroIdx = 0;
      var _heroTotal = heroEvents.length;
      function _heroGo(idx) {
        _heroIdx = ((idx % _heroTotal) + _heroTotal) % _heroTotal;
        var t = document.getElementById('skytv-hero-track');
        if(t) t.style.transform = 'translateX(-' + (_heroIdx * 100) + '%)';
        var dots = document.getElementById('skytv-hero-dots');
        if(dots) { var ch = dots.children; for(var x=0;x<ch.length;x++){ ch[x].style.width = x===_heroIdx?'20px':'8px'; ch[x].style.background = x===_heroIdx?'#C9A84C':'rgba(255,255,255,0.15)'; } }
        // Also update countdown to match
        skyTvState.countdownIdx = _heroIdx;
      }
      // Touch swipe
      var _sx = 0;
      track.addEventListener('touchstart', function(e){ _sx = e.touches[0].clientX; }, {passive:true});
      track.addEventListener('touchend', function(e){
        var dx = e.changedTouches[0].clientX - _sx;
        if(Math.abs(dx) > 40) { _heroGo(_heroIdx + (dx < 0 ? 1 : -1)); _resetAutoRotate(); }
      }, {passive:true});
      // Auto-rotate every 10s
      var _heroTimer = null;
      function _startAutoRotate() { _heroTimer = setInterval(function(){ _heroGo(_heroIdx + 1); }, 15000); }
      function _resetAutoRotate() { if(_heroTimer) clearInterval(_heroTimer); _startAutoRotate(); }
      _startAutoRotate();
    }
  }

  var cd = document.createElement('div');
  cd.className = 'skytv-countdown';
  cd.style.cursor = 'pointer';
  cd.onclick = function() { openEventDetail(next); };
  var timer = document.createElement('div');
  timer.className = 'skytv-countdown-timer';
  timer.id = 'skytv-timer-text';
  if (hours > 0) {
    timer.textContent = hours + 'h ' + mins + 'm ' + secs + 's';
  } else {
    timer.textContent = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
  }
  var info2 = document.createElement('div');
  info2.className = 'skytv-countdown-info';
  var label = document.createElement('div');
  label.className = 'skytv-countdown-label';
  label.id = 'skytv-timer-label';

  // Dynamic message based on time remaining
  var totalMins = Math.floor(diff / 60000);
  if (totalMins <= 5) {
    label.textContent = '\uD83D\uDD34 \u00A1La sala est\u00e1 abierta!';
    label.style.color = '#E24B4A';
    label.style.fontWeight = '900';
  } else if (totalMins <= 60) {
    label.textContent = '\u23F0 Falta menos de 1 hora';
    label.style.color = '#FFD700';
  } else if (hours <= 4) {
    label.textContent = '\uD83D\uDD14 Evento en ' + hours + ' hora' + (hours>1?'s':'');
  } else {
    label.textContent = 'Pr\u00f3ximo evento en';
  }

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
  // Timer column: countdown + calendar button below it
  var timerCol = document.createElement('div');
  timerCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;flex-shrink:0;';
  timerCol.appendChild(timer);

  var isDesktop = window.innerWidth > 768;
  var _calGcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(next.titulo || 'Evento SkyTeam') + '&dates=' + next.fecha.replace(/-/g,'') + 'T' + (next.hora_inicio||'09:00').replace(':','') + '00/' + next.fecha.replace(/-/g,'') + 'T' + (next.hora_fin||next.hora_inicio||'10:00').replace(':','') + '00&details=' + encodeURIComponent((next.descripcion || '') + (next.zoom_link ? '\nZoom: ' + next.zoom_link : '')) + '&location=' + encodeURIComponent(next.zoom_link || 'Zoom');

  if (totalMins > 5) {
    var calBtn = document.createElement('button');
    calBtn.onclick = function(e) { e.stopPropagation(); window.open(_calGcalUrl, '_blank'); };
    if (isDesktop) {
      // Desktop: button on the right side of the card
      calBtn.style.cssText = 'flex-shrink:0;padding:8px 16px;border-radius:10px;background:rgba(201,168,76,0.10);border:0.5px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:12px;font-weight:800;cursor:pointer;font-family:Outfit,Nunito,sans-serif;white-space:nowrap;';
      calBtn.textContent = '\uD83D\uDCC5 Agregar al calendario';
    } else {
      // Mobile: small button below timer
      calBtn.style.cssText = 'margin-top:6px;padding:6px 14px;border-radius:8px;background:rgba(201,168,76,0.10);border:0.5px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:11px;font-weight:800;cursor:pointer;font-family:Outfit,Nunito,sans-serif;white-space:nowrap;';
      calBtn.textContent = '\uD83D\uDCC5 Reservar';
      timerCol.appendChild(calBtn);
    }
  }

  if (next.zoom_link && totalMins <= 5) {
    var joinBtn = document.createElement('button');
    joinBtn.className = 'skytv-zoom-btn';
    joinBtn.style.cssText = isDesktop ? 'flex-shrink:0;' : 'margin-top:4px;font-size:10px;padding:4px 10px;';
    joinBtn.textContent = isDesktop ? '\uD83D\uDCF9 Unirse al Zoom' : '\uD83D\uDCF9 Zoom';
    joinBtn.style.animation = 'skytvPulse 1.5s infinite';
    joinBtn.onclick = function(e) { e.stopPropagation(); window.open(next.zoom_link, '_blank'); };
    if (isDesktop) cd.appendChild(joinBtn); else timerCol.appendChild(joinBtn);
  }

  cd.appendChild(timerCol);
  cd.appendChild(info2);
  if (isDesktop && totalMins > 5 && calBtn) cd.appendChild(calBtn);
  container.appendChild(cd);

  // Navigation arrows if multiple upcoming events
  var allUpcoming = getUpcomingEvents();
  if (allUpcoming.length > 1) {
    var navRow = document.createElement('div');
    navRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:6px;';
    var prevE = document.createElement('button');
    prevE.style.cssText = 'background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:8px;padding:4px 12px;font-size:16px;cursor:pointer;';
    prevE.textContent = '\u25C0';
    prevE.onclick = function() { skyTvState.countdownIdx = ((skyTvState.countdownIdx || 0) - 1 + allUpcoming.length) % allUpcoming.length; renderCountdown(container); };
    var dots = document.createElement('span');
    dots.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);';
    dots.textContent = ((skyTvState.countdownIdx||0)+1) + ' / ' + allUpcoming.length;
    var nextE = document.createElement('button');
    nextE.style.cssText = 'background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:8px;padding:4px 12px;font-size:16px;cursor:pointer;';
    nextE.textContent = '\u25B6';
    nextE.onclick = function() { skyTvState.countdownIdx = ((skyTvState.countdownIdx || 0) + 1) % allUpcoming.length; renderCountdown(container); };
    navRow.appendChild(prevE);
    navRow.appendChild(dots);
    navRow.appendChild(nextE);
    container.appendChild(navRow);
  }
}

// --- CARTELERA (BILLBOARD) ---
function renderCartelera() {
  var container = document.getElementById('sky-tv-section');
  if (!container) return;
  container.innerHTML = '';

  // Action buttons (no duplicate header — title is in topbar)
  var header = document.createElement('div');
  header.className = 'skytv-header';
  header.style.justifyContent = 'flex-end';
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

  // Date range navigation
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
  var isCurrentWeek = isToday(days[0]);
  weekLabel.textContent = (isCurrentWeek ? 'Hoy, ' : '') + days[0].getDate() + ' ' + MESES_ES[days[0].getMonth()] + ' \u2014 ' + days[6].getDate() + ' ' + MESES_ES[days[6].getMonth()];
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
  todayBtn.style.display = isCurrentWeek ? 'none' : 'inline-block';
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

        // Flyer thumbnail in card
        if (ev.flyer_url) {
          var thumb = document.createElement('img');
          thumb.src = ev.flyer_url;
          thumb.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:6px;';
          thumb.alt = '';
          evDiv.appendChild(thumb);
        }
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

  // Start countdown interval — only update timer text, NOT the whole carousel
  if (window._skytvCountdownInterval) clearInterval(window._skytvCountdownInterval);
  window._skytvCountdownInterval = setInterval(function() {
    var timerEl = document.getElementById('skytv-timer-text');
    var labelEl = document.getElementById('skytv-timer-label');
    if (!timerEl) return;
    var nxt = getNextEvent();
    if (!nxt) return;
    var d2 = new Date(nxt.fecha + 'T' + (nxt.hora_inicio || '00:00:00'));
    var diff2 = d2 - new Date();
    if (diff2 < 0) { renderCountdown(document.getElementById('skytv-countdown')); return; }
    var h2 = Math.floor(diff2 / 3600000);
    var m2 = Math.floor((diff2 % 3600000) / 60000);
    var s2 = Math.floor((diff2 % 60000) / 1000);
    timerEl.textContent = h2 > 0 ? h2 + 'h ' + m2 + 'm ' + s2 + 's' : String(m2).padStart(2,'0') + ':' + String(s2).padStart(2,'0');
    var totalM = Math.floor(diff2 / 60000);
    if (labelEl) {
      if (totalM <= 5) { labelEl.textContent = '\uD83D\uDD34 \u00A1La sala est\u00e1 abierta!'; labelEl.style.color = '#E24B4A'; }
      else if (totalM <= 60) { labelEl.textContent = '\u23F0 Falta menos de 1 hora'; labelEl.style.color = '#FFD700'; }
      else if (h2 <= 4) { labelEl.textContent = '\uD83D\uDD14 Evento en ' + h2 + ' hora' + (h2>1?'s':''); labelEl.style.color = ''; }
      else { labelEl.textContent = 'Pr\u00f3ximo evento en'; labelEl.style.color = ''; }
    }
  }, 1000);
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

  // Flyer — cinema-style poster
  if (ev.flyer_url) {
    var flyerWrap = document.createElement('div');
    flyerWrap.style.cssText = 'margin:-20px -22px 16px;border-radius:16px 16px 0 0;overflow:hidden;position:relative;';
    var flyerImg = document.createElement('img');
    flyerImg.src = ev.flyer_url;
    flyerImg.style.cssText = 'width:100%;max-height:400px;object-fit:cover;display:block;';
    flyerImg.alt = ev.titulo;
    // Gradient overlay at bottom for text readability
    var flyerGrad = document.createElement('div');
    flyerGrad.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(transparent,rgba(10,10,18,0.95));';
    flyerWrap.appendChild(flyerImg);
    flyerWrap.appendChild(flyerGrad);
    modal.appendChild(flyerWrap);
  }

  var title = document.createElement('h3');
  title.textContent = ev.titulo;
  title.style.cssText = 'font-size:20px;font-weight:900;margin:0 0 12px;';
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

  // Add to Calendar button (Google Calendar) — for all users
  var calBtn = document.createElement('button');
  calBtn.className = 'skytv-btn skytv-btn-primary';
  calBtn.style.cssText = 'margin-top:8px;width:100%;';
  calBtn.textContent = '\uD83D\uDCC5 Agregar a mi calendario';
  calBtn.onclick = function() {
    var startDate = ev.fecha.replace(/-/g,'') + 'T' + (ev.hora_inicio||'09:00').replace(':','') + '00';
    var endDate = ev.fecha.replace(/-/g,'') + 'T' + (ev.hora_fin||ev.hora_inicio||'10:00').replace(':','') + '00';
    var gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(ev.titulo || 'Evento SkyTeam')
      + '&dates=' + startDate + '/' + endDate
      + '&details=' + encodeURIComponent((ev.descripcion || '') + (ev.zoom_link ? '\n\nZoom: ' + ev.zoom_link : ''))
      + '&location=' + encodeURIComponent(ev.zoom_link || 'Zoom');
    window.open(gcalUrl, '_blank');
  };
  modal.appendChild(calBtn);

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
    {name:'flyer_url', label:'Flyer del evento', type:'file', value: ev.flyer_url||''}
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
    } else if (ff.type === 'file') {
      input = document.createElement('div');
      input.setAttribute('name', ff.name);
      input.style.cssText = 'display:flex;align-items:center;gap:10px;';
      var preview = document.createElement('div');
      preview.id = 'flyer-preview';
      preview.style.cssText = 'width:60px;height:60px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;';
      preview.innerHTML = ff.value ? '<img src="'+ff.value+'" style="width:100%;height:100%;object-fit:cover;">' : '<span style="font-size:24px;color:rgba(255,255,255,0.2);">\uD83D\uDDBC</span>';
      var uploadBtn = document.createElement('label');
      uploadBtn.style.cssText = 'padding:8px 14px;border-radius:8px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;';
      uploadBtn.textContent = '\uD83D\uDCF7 Subir flyer';
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.onchange = function(e) {
        var file = e.target.files[0]; if(!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          var img = new Image();
          img.onload = function() {
            var MAX = 800;
            var w = img.naturalWidth, h = img.naturalHeight;
            if(w > MAX || h > MAX) { var r = Math.min(MAX/w, MAX/h); w = Math.round(w*r); h = Math.round(h*r); }
            var c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            var b64 = c.toDataURL('image/jpeg', 0.85);
            preview.innerHTML = '<img src="'+b64+'" style="width:100%;height:100%;object-fit:cover;">';
            input._flyerData = b64;
            uploadBtn.textContent = '\u2705 Flyer cargado';
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      };
      uploadBtn.appendChild(fileInput);
      input.appendChild(preview);
      input.appendChild(uploadBtn);
      group.appendChild(lbl);
      group.appendChild(input);
      form.appendChild(group);
      continue;
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
      if(inputs[i].name) data[inputs[i].name] = inputs[i].value;
    }
    // Get flyer from upload if available
    var flyerDiv = form.querySelector('[name="flyer_url"]');
    if(flyerDiv && flyerDiv._flyerData) data.flyer_url = flyerDiv._flyerData;
    if (!data.titulo || !data.fecha || !data.hora_inicio) {
      if (typeof crmToast === 'function') crmToast('Completa t\u00edtulo, fecha y hora', 'error');
      return;
    }
    if (ev.id) {
      data.id = ev.id;
      if (typeof CU !== 'undefined' && CU && CU.username) data.username = CU.username;
      saveEvento(data, 'update', function() { overlay.remove(); loadEventos(); });
    } else {
      if (typeof CU !== 'undefined' && CU && CU.username) data.created_by = CU.username;
      saveEvento(data, 'create', function() { overlay.remove(); loadEventos(); });
    }
  };
  form.appendChild(saveBtn);

  // ── Duplicate to other days button ──
  var dupeBtn = document.createElement('button');
  dupeBtn.className = 'skytv-btn';
  dupeBtn.style.cssText = 'width:100%;padding:12px;font-size:13px;margin-top:8px;background:rgba(167,139,250,0.10);border:0.5px solid rgba(167,139,250,0.25);color:#A78BFA;font-weight:700;cursor:pointer;border-radius:10px;font-family:Outfit,Nunito,sans-serif;';
  dupeBtn.textContent = '\uD83D\uDD01 Duplicar para otros d\u00edas';
  dupeBtn.onclick = function() {
    // Collect current form data
    var data = {};
    var inputs = form.querySelectorAll('input,textarea,select');
    for (var i = 0; i < inputs.length; i++) { if(inputs[i].name) data[inputs[i].name] = inputs[i].value; }
    var flyerDiv = form.querySelector('[name="flyer_url"]');
    if(flyerDiv && flyerDiv._flyerData) data.flyer_url = flyerDiv._flyerData;
    if (!data.titulo || !data.hora_inicio) { if(typeof crmToast==='function') crmToast('Completa t\u00edtulo y hora primero','error'); return; }
    // Show day picker
    var picker = document.createElement('div');
    picker.style.cssText = 'margin-top:12px;padding:14px;border-radius:12px;background:rgba(167,139,250,0.06);border:0.5px solid rgba(167,139,250,0.15);';
    picker.innerHTML = '<div style="font-size:12px;font-weight:800;color:#A78BFA;margin-bottom:10px;">Selecciona los d\u00edas para duplicar:</div>';
    var dias = ['Lun','Mar','Mi\u00e9','Jue','Vie','S\u00e1b','Dom'];
    var checksHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    for (var d = 0; d < 7; d++) {
      checksHtml += '<label style="display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);cursor:pointer;font-size:12px;color:#F0EDE6;font-weight:600;">';
      checksHtml += '<input type="checkbox" class="_dupeDay" value="'+d+'" style="accent-color:#A78BFA;"> '+dias[d]+'</label>';
    }
    checksHtml += '</div>';
    var weeksHtml = '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">';
    weeksHtml += '<span style="font-size:11px;color:rgba(255,255,255,0.4);">Semanas:</span>';
    weeksHtml += '<select id="_dupeWeeks" style="padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.1);color:#F0EDE6;font-size:12px;">';
    weeksHtml += '<option value="1">Esta semana</option><option value="2" selected>2 semanas</option><option value="4">4 semanas</option></select></div>';
    picker.innerHTML += checksHtml + weeksHtml;
    var goBtn = document.createElement('button');
    goBtn.style.cssText = 'width:100%;padding:10px;border-radius:8px;background:linear-gradient(135deg,#A78BFA,#7C3AED);border:none;color:#fff;font-size:13px;font-weight:800;cursor:pointer;font-family:Outfit,Nunito,sans-serif;';
    goBtn.textContent = 'Crear duplicados';
    goBtn.onclick = function() {
      var checks = picker.querySelectorAll('._dupeDay:checked');
      if(!checks.length) { if(typeof crmToast==='function') crmToast('Selecciona al menos un d\u00eda','error'); return; }
      var weeks = parseInt(document.getElementById('_dupeWeeks').value) || 2;
      var selectedDays = [];
      checks.forEach(function(c){ selectedDays.push(parseInt(c.value)); });
      // Generate dates: for each selected day, create events for N weeks
      var baseFecha = data.fecha ? new Date(data.fecha + 'T12:00:00') : new Date();
      var created = 0; var total = 0;
      var today = new Date(); today.setHours(0,0,0,0);
      for (var w = 0; w < weeks; w++) {
        for (var di = 0; di < selectedDays.length; di++) {
          var targetDay = selectedDays[di]; // 0=Mon...6=Sun
          var d2 = new Date(today);
          // Set to Monday of current week + w weeks
          var currentDay = d2.getDay(); var diff = currentDay === 0 ? 6 : currentDay - 1;
          d2.setDate(d2.getDate() - diff + (w * 7) + targetDay);
          if (d2 < today) continue; // skip past dates
          var fechaStr = d2.getFullYear() + '-' + String(d2.getMonth()+1).padStart(2,'0') + '-' + String(d2.getDate()).padStart(2,'0');
          var dupData = JSON.parse(JSON.stringify(data));
          dupData.fecha = fechaStr;
          delete dupData.id; // new event
          if (typeof CU !== 'undefined' && CU && CU.username) dupData.created_by = CU.username;
          total++;
          (function(dd){ saveEvento(dd, 'create', function(){ created++; if(created===total){ if(typeof crmToast==='function') crmToast('\u2705 '+created+' eventos creados','success'); overlay.remove(); loadEventos(); } }); })(dupData);
        }
      }
      if(total === 0) { if(typeof crmToast==='function') crmToast('No hay fechas futuras para duplicar','error'); }
      else { goBtn.textContent = 'Creando ' + total + ' eventos...'; goBtn.disabled = true; }
    };
    picker.appendChild(goBtn);
    // Replace dupeBtn with picker
    if(dupeBtn.nextSibling) form.insertBefore(picker, dupeBtn.nextSibling);
    else form.appendChild(picker);
    dupeBtn.style.display = 'none';
  };
  form.appendChild(dupeBtn);

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
  var method = action === 'update' ? 'PUT' : 'POST';
  fetch('/api/eventos.js?action=' + action, {
    method: method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if(!res.ok && res.error) {
        if (typeof crmToast === 'function') crmToast('Error: ' + res.error, 'error');
        return;
      }
      if (typeof crmToast === 'function') crmToast(action === 'create' ? 'Evento creado' : 'Evento actualizado', 'success');
      // Push notification to all subscribers for new/updated events
      if (action === 'create' || action === 'update') {
        fetch('/api/push', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            action: 'broadcast',
            title: '\uD83D\uDCFA ' + (data.titulo || 'Nuevo evento'),
            body: (data.fecha || '') + ' ' + (data.hora_inicio || '') + ' \u2014 \u00A1No te lo pierdas!',
            url: '/?nav=sky-tv',
            adminKey: typeof CU !== 'undefined' && CU ? CU.username : ''
          })
        }).catch(function(){});
      }
      if (callback) callback(res);
    })
    .catch(function(err) {
      console.error('Sky TV save error:', err);
      if (typeof crmToast === 'function') crmToast('Error al guardar: ' + err.message, 'error');
    });
}

function deleteEvento(id, callback) {
  var username = (typeof CU !== 'undefined' && CU && CU.username) ? CU.username : '';
  fetch('/api/eventos.js?action=delete&id=' + encodeURIComponent(id) + '&username=' + encodeURIComponent(username), {
    method: 'DELETE'
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
    body: JSON.stringify({id: id, en_vivo: isLive, username: (typeof CU !== 'undefined' && CU && CU.username) ? CU.username : undefined})
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

// --- SKY TV NOTIFICATION ENGINE ---
var _skyTvNotifSent = {};
var _skyTvNotifInterval = null;

function checkSkyTvNotifications() {
  if (!skyTvState.eventos || !skyTvState.eventos.length) return;
  if (typeof pushNotification !== 'function') return;
  var now = new Date();

  skyTvState.eventos.forEach(function(ev) {
    if (!ev.fecha || !ev.hora_inicio) return;
    var dt = new Date(ev.fecha + 'T' + ev.hora_inicio);
    var diff = (dt - now) / 60000; // diff in minutes
    var evId = ev.id || ev.titulo;
    var cat = (ev.categoria || '').toLowerCase();
    var isLiderazgo = cat.indexOf('trading') === -1; // trading = solo 1h + en vivo; todo lo demás = cadencia completa

    // Google Calendar URL for "Agregar a calendario"
    var _gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(ev.titulo || 'Evento SkyTeam')
      + '&dates=' + ev.fecha.replace(/-/g,'') + 'T' + (ev.hora_inicio||'09:00').replace(':','') + '00'
      + '/' + ev.fecha.replace(/-/g,'') + 'T' + (ev.hora_fin||ev.hora_inicio||'10:00').replace(':','') + '00'
      + '&details=' + encodeURIComponent((ev.descripcion||'') + (ev.zoom_link ? '\nZoom: '+ev.zoom_link : ''));

    // 8 hours before (liderazgo only — trading skips this)
    if (isLiderazgo && diff > 7*60 && diff <= 8*60 && !_skyTvNotifSent['8h_' + evId]) {
      _skyTvNotifSent['8h_' + evId] = true;
      pushNotification({
        id: 'skytv_8h_'+evId, type: 'event', icon: '\uD83D\uDCC5',
        title: '\uD83D\uDCC5 Evento en 8 horas',
        subtitle: ev.titulo + ' \u2014 ' + formatTime(ev.hora_inicio),
        msg: 'Prep\u00e1rate para la sesi\u00f3n de hoy. \u00A1Agr\u00e9galo a tu calendario!',
        action: {label: '\uD83D\uDCC5 Agregar a calendario', url: _gcalUrl}
      });
    }

    // 4 hours before (liderazgo only — trading skips this)
    if (isLiderazgo && diff > 3*60 && diff <= 4*60 && !_skyTvNotifSent['4h_' + evId]) {
      _skyTvNotifSent['4h_' + evId] = true;
      pushNotification({
        id: 'skytv_4h_'+evId, type: 'event', icon: '\u23F0',
        title: '\u23F0 Evento en 4 horas',
        subtitle: ev.titulo + ' \u2014 ' + formatTime(ev.hora_inicio),
        msg: 'No olvides conectarte. \u00A1Agr\u00e9galo a tu calendario!',
        action: {label: '\uD83D\uDCC5 Agregar a calendario', url: _gcalUrl}
      });
    }

    // 1 hour before — reminder
    if (diff > 30 && diff <= 60 && !_skyTvNotifSent['1h_'+evId]) {
      _skyTvNotifSent['1h_'+evId] = true;
      pushNotification({
        id: 'skytv_1h_'+evId, type: 'event', icon: '\uD83D\uDCFA',
        title: '\uD83D\uDCFA \u00A1Evento en 1 hora!',
        subtitle: ev.titulo + ' \u2014 ' + formatTime(ev.hora_inicio),
        msg: (ev.host_nombre ? 'Con ' + ev.host_nombre + '. ' : '') + 'Prep\u00e1rate para conectarte.',
        action: {label: '\uD83D\uDCC5 Agregar a calendario', url: _gcalUrl}
      });
    }

    // 5 minutes before — sala abierta
    if (diff > 0 && diff <= 5 && !_skyTvNotifSent['5m_'+evId]) {
      _skyTvNotifSent['5m_'+evId] = true;
      pushNotification({
        id: 'skytv_5m_'+evId, type: 'booking', icon: '\uD83D\uDD34',
        title: '\uD83D\uDD34 \u00A1La sala est\u00e1 abierta!',
        subtitle: ev.titulo + ' \u2014 Estamos a punto de comenzar',
        msg: '\u00A1\u00DAnete ahora! La sesi\u00f3n inicia en minutos.',
        action: ev.zoom_link ? {label: '\uD83D\uDCF9 Unirse al Zoom', url: ev.zoom_link} : {label: '\uD83D\uDCFA Ver Sky TV', url: 'javascript:navigate("sky-tv")'}
      });
    }

    // Event is LIVE — sala abierta
    if (ev.en_vivo && !_skyTvNotifSent['live_'+evId]) {
      _skyTvNotifSent['live_'+evId] = true;
      pushNotification({
        id: 'skytv_live_'+evId, type: 'event', icon: '🔴',
        title: '🔴 ¡EN VIVO ahora!',
        subtitle: ev.titulo + (ev.host_nombre ? ' con ' + ev.host_nombre : ''),
        msg: '¡La sala ya está abierta! Únete ahora.',
        action: ev.zoom_link ? {label: '📹 Unirse a Zoom', url: ev.zoom_link} : {label: '📺 Ver Sky TV', url: 'javascript:navigate("sky-tv")'}
      });
    }
  });
}

// --- FLOATING LIVE BANNER (appears on ANY page when event is live) ---
var _skyTvLiveBanner = null;

function checkLiveBanner() {
  if (!skyTvState.eventos || !skyTvState.eventos.length) return;
  var liveEv = skyTvState.eventos.find(function(ev) { return ev.en_vivo; });

  if (liveEv && !_skyTvLiveBanner) {
    // Create floating banner
    var b = document.createElement('div');
    b.id = 'sky-live-float';
    b.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9995;background:rgba(10,10,18,0.92);border:1.5px solid rgba(220,38,38,0.5);border-radius:18px;padding:16px 20px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 12px 40px rgba(220,38,38,0.2),0 0 80px rgba(220,38,38,0.06);cursor:pointer;animation:skyLivePulse 2.5s ease-in-out infinite;max-width:360px;font-family:Outfit,Nunito,sans-serif;';
    b.innerHTML = '<div style="width:12px;height:12px;border-radius:50%;background:#DC2626;box-shadow:0 0 8px rgba(220,38,38,0.8);flex-shrink:0;animation:skyLiveDot 1.5s ease-in-out infinite;"></div>'
      + '<div style="flex:1;min-width:0;"><div style="font-size:11px;font-weight:800;color:#DC2626;text-transform:uppercase;letter-spacing:1.5px;">● EN VIVO AHORA</div>'
      + '<div style="font-size:14px;font-weight:700;color:#fff;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (liveEv.titulo || 'Evento en vivo') + '</div>'
      + (liveEv.host_nombre ? '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:1px;">con ' + liveEv.host_nombre + '</div>' : '')
      + '</div>'
      + '<div style="background:linear-gradient(135deg,#DC2626,#B91C1C);color:#fff;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;white-space:nowrap;letter-spacing:0.5px;">Unirse →</div>';

    b.onclick = function() {
      if (liveEv.zoom_link) {
        window.open(liveEv.zoom_link, '_blank');
      } else if (typeof navigate === 'function') {
        navigate('sky-tv');
      }
    };

    // Close button
    var closeBtn = document.createElement('div');
    closeBtn.style.cssText = 'position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(255,255,255,0.5);cursor:pointer;';
    closeBtn.textContent = '✕';
    closeBtn.onclick = function(e) {
      e.stopPropagation();
      b.remove();
      _skyTvLiveBanner = 'dismissed';
    };
    b.appendChild(closeBtn);

    document.body.appendChild(b);
    _skyTvLiveBanner = b;

    // Add animations if not already
    if (!document.getElementById('sky-live-css')) {
      var css = document.createElement('style');
      css.id = 'sky-live-css';
      css.textContent = '@keyframes skyLivePulse{0%,100%{box-shadow:0 8px 32px rgba(220,38,38,0.25),0 0 60px rgba(220,38,38,0.08);}50%{box-shadow:0 8px 32px rgba(220,38,38,0.4),0 0 80px rgba(220,38,38,0.15);}}@keyframes skyLiveDot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.7);}}@media(max-width:768px){#sky-live-float{bottom:80px;right:12px;left:12px;max-width:none;}}';
      document.head.appendChild(css);
    }

  } else if (!liveEv && _skyTvLiveBanner && _skyTvLiveBanner !== 'dismissed') {
    // Remove banner when event is no longer live
    if (_skyTvLiveBanner.remove) _skyTvLiveBanner.remove();
    _skyTvLiveBanner = null;
  }
}

function startSkyTvNotifEngine() {
  if (_skyTvNotifInterval) clearInterval(_skyTvNotifInterval);
  checkSkyTvNotifications();
  checkLiveBanner();
  _skyTvNotifInterval = setInterval(function() {
    checkSkyTvNotifications();
    checkLiveBanner();
  }, 60000);
}

// --- INIT ---
window.initSkyTv = function() {
  if (window._skyTvInitialized) return;
  window._skyTvInitialized = true;
  skyTvState.userIsAdmin = !!(typeof CU !== 'undefined' && CU && CU.isAdmin);
  skyTvState.selectedWeek = new Date();
  loadEventos(function() { startSkyTvNotifEngine(); });
};

window.renderSkyTvCalendar = renderCartelera;
window.openSkyTvEventDetail = openEventDetail;

})();
