
// ═══════════════════════════════════════════════════════════════
// SKYTEAM V2 — SKY TEAM (Mi Red) Frontend
// Dashboard, Arbol Genealogico, Ranking, Alertas, Coach IA
// Nebula Premium Design — Glassmorphism + Gold Accents
// ═══════════════════════════════════════════════════════════════

(function() {
'use strict';

// ── API ──
var TEAM_API = '/api/team';

// ── Colors ──
var C = {
  bg: '#050508',
  bgCard: 'rgba(255,255,255,0.025)',
  bgCardHover: 'rgba(255,255,255,0.05)',
  accent: '#C9A84C',
  gold: '#C9A84C',
  green: '#1D9E75',
  red: '#E24B4A',
  teal: '#1D9E75',
  purple: '#7F77DD',
  orange: '#E8D48B',
  textMain: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.06)',
  glow: 'rgba(255,255,255,0.08)'
};

// ── State ──
var stState = {
  tab: 'dashboard',
  data: null,
  treeExpanded: {},
  treeSearch: '',
  rankPeriod: 'monthly',
  coachData: null,
  loading: false,
  cache: null,
  cacheTime: 0
};

// ═══════════════════════════════════════════════════════════════
//  CSS INJECTION
// ═══════════════════════════════════════════════════════════════

var _stCssInjected = false;

function injectSkyTeamCSS() {
  if (_stCssInjected) return;
  _stCssInjected = true;

  var css = document.createElement('style');
  css.id = 'sky-team-css';
  css.textContent = [

    // ── Base ──
    '#skyteam-content{font-family:"Outfit","Nunito",sans-serif;color:#F0EDE6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}',

    // ── Loading skeleton ──
    '.st-skeleton{padding:20px;}',
    '.st-skel-bar{height:14px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:stShimmer 1.5s infinite;margin-bottom:12px;}',
    '.st-skel-bar.w60{width:60%;}',
    '.st-skel-bar.w80{width:80%;}',
    '.st-skel-bar.w40{width:40%;}',
    '.st-skel-block{height:80px;border-radius:16px;background:linear-gradient(90deg,rgba(255,255,255,0.02) 25%,rgba(255,255,255,0.05) 50%,rgba(255,255,255,0.02) 75%);background-size:200% 100%;animation:stShimmer 1.5s infinite;margin-bottom:14px;}',
    '@keyframes stShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}',

    // ── Tab Bar ──
    '.st-tab-bar{display:flex;gap:6px;padding:12px 0 16px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}',
    '.st-tab-bar::-webkit-scrollbar{display:none;}',
    '.st-tab-btn{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.025);color:rgba(240,237,230,0.55);cursor:pointer;font-size:13px;font-weight:600;font-family:"Outfit","Nunito",sans-serif;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
    '.st-tab-btn:hover{background:rgba(255,255,255,0.05);color:rgba(240,237,230,0.8);transform:translateY(-1px);}',
    '.st-tab-on{background:rgba(201,168,76,0.12)!important;border-color:rgba(201,168,76,0.25)!important;color:#E8D48B!important;box-shadow:0 2px 12px rgba(201,168,76,0.1);}',
    '.st-tab-off{background:rgba(255,255,255,0.025);border-color:rgba(255,255,255,0.06);color:rgba(240,237,230,0.55);}',
    '.st-tab-icon{font-size:15px;line-height:1;}',

    // ── Section headers ──
    '.st-section-title{font-size:15px;font-weight:700;margin:20px 0 12px;color:#F0EDE6;display:flex;align-items:center;gap:8px;}',
    '.st-section-sub{font-size:12px;color:rgba(240,237,230,0.4);margin:-8px 0 14px;}',

    // ── Card base ──
    '.st-card{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.06);border-radius:16px;padding:16px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;}',
    '.st-card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);}',
    '.st-card:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.2);}',

    // ── Stat card (hero stats) ──
    '.st-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}',
    '.st-stat-card{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;text-align:center;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;}',
    '.st-stat-card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent);}',
    '.st-stat-card:hover{transform:translateY(-2px);border-color:rgba(201,168,76,0.15);}',
    '.st-stat-icon{font-size:22px;margin-bottom:4px;}',
    '.st-stat-val{font-size:26px;font-weight:800;color:#F0EDE6;line-height:1.1;}',
    '.st-stat-label{font-size:11px;color:rgba(240,237,230,0.45);margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}',

    // ── Top directs cards ──
    '.st-top-directs{display:flex;flex-direction:column;gap:10px;margin-bottom:18px;}',
    '.st-direct-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px 14px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;}',
    '.st-direct-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(201,168,76,0.2);transform:translateX(4px);}',
    '.st-direct-avatar{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}',
    '.st-direct-info{flex:1;min-width:0;}',
    '.st-direct-name{font-size:14px;font-weight:700;color:#F0EDE6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.st-direct-rank{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:6px;font-weight:600;margin-top:2px;}',
    '.st-direct-score{font-size:20px;font-weight:800;color:#E8D48B;flex-shrink:0;}',

    // ── Score bar (3 segments) ──
    '.st-score-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,0.06);margin-top:6px;gap:1px;}',
    '.st-score-seg{height:100%;border-radius:2px;transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1);}',
    '.st-score-seg.prospects{background:#1D9E75;}',
    '.st-score-seg.sales{background:#C9A84C;}',
    '.st-score-seg.day{background:#7F77DD;}',

    // ── Needs attention cards ──
    '.st-attention-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 14px;margin-bottom:8px;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;}',
    '.st-attention-card:hover{background:rgba(255,255,255,0.04);transform:translateX(3px);}',
    '.st-attention-border{position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;}',
    '.st-attention-icon{font-size:18px;flex-shrink:0;margin-left:8px;}',
    '.st-attention-msg{flex:1;font-size:13px;color:rgba(240,237,230,0.8);line-height:1.4;}',
    '.st-attention-btn{padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#F0EDE6;cursor:pointer;font-size:12px;font-weight:600;font-family:"Outfit","Nunito",sans-serif;transition:all 0.3s ease;flex-shrink:0;}',
    '.st-attention-btn:hover{background:rgba(255,255,255,0.1);transform:scale(1.03);}',

    // ── Growth sparkline ──
    '.st-sparkline{display:flex;align-items:flex-end;gap:6px;height:80px;padding:12px 16px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.06);border-radius:14px;margin-bottom:18px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}',
    '.st-spark-bar{flex:1;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,#C9A84C,rgba(201,168,76,0.4));transition:height 0.6s cubic-bezier(0.34,1.56,0.64,1);min-height:4px;position:relative;}',
    '.st-spark-bar:hover{background:linear-gradient(180deg,#E8D48B,rgba(201,168,76,0.6));}',
    '.st-spark-label{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:10px;color:rgba(240,237,230,0.5);font-weight:600;white-space:nowrap;}',

    // ── Quick actions ──
    '.st-quick-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}',
    '.st-quick-btn{display:flex;align-items:center;gap:6px;padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#F0EDE6;cursor:pointer;font-size:13px;font-weight:600;font-family:"Outfit","Nunito",sans-serif;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
    '.st-quick-btn:hover{background:rgba(255,255,255,0.08);border-color:rgba(201,168,76,0.2);transform:translateY(-2px);}',
    '.st-quick-btn-gold{background:linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.06));border-color:rgba(201,168,76,0.2);color:#E8D48B;}',
    '.st-quick-btn-gold:hover{background:linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.1));box-shadow:0 4px 16px rgba(201,168,76,0.12);}',

    // ── Tree (Arbol) ──
    '.st-tree-search{width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#F0EDE6;font-size:14px;font-family:"Outfit","Nunito",sans-serif;outline:none;margin-bottom:14px;transition:border-color 0.3s ease;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-sizing:border-box;}',
    '.st-tree-search::placeholder{color:rgba(240,237,230,0.3);}',
    '.st-tree-search:focus{border-color:rgba(201,168,76,0.3);box-shadow:0 0 0 3px rgba(201,168,76,0.08);}',
    '.st-tree-list{display:flex;flex-direction:column;gap:4px;}',
    '.st-tree-node{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.05);border-radius:12px;cursor:pointer;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;}',
    '.st-tree-node:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);transform:translateX(3px);}',
    '.st-tree-status{position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;}',
    '.st-tree-avatar{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}',
    '.st-tree-info{flex:1;min-width:0;}',
    '.st-tree-name{font-size:13px;font-weight:700;color:#F0EDE6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.st-tree-rank-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:1px 6px;border-radius:5px;font-weight:600;margin-left:6px;vertical-align:middle;}',
    '.st-tree-score{font-size:13px;font-weight:700;color:#E8D48B;flex-shrink:0;display:flex;align-items:center;gap:6px;}',
    '.st-tree-mini-bar{width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden;display:flex;gap:1px;}',
    '.st-tree-days-pill{font-size:10px;padding:2px 8px;border-radius:6px;font-weight:600;flex-shrink:0;white-space:nowrap;}',
    '.st-tree-chevron{font-size:14px;color:rgba(240,237,230,0.3);flex-shrink:0;transition:transform 0.3s ease;cursor:pointer;}',
    '.st-tree-chevron.expanded{transform:rotate(90deg);}',
    '.st-tree-children{margin-left:20px;display:flex;flex-direction:column;gap:4px;margin-top:4px;}',
    '.st-tree-empty{text-align:center;padding:40px 20px;color:rgba(240,237,230,0.3);font-size:14px;}',

    // ── Ranking ──
    '.st-rank-toggle{display:flex;gap:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:4px;margin-bottom:18px;}',
    '.st-rank-opt{flex:1;padding:8px 12px;border-radius:9px;border:none;background:transparent;color:rgba(240,237,230,0.5);cursor:pointer;font-size:13px;font-weight:600;font-family:"Outfit","Nunito",sans-serif;transition:all 0.3s ease;text-align:center;}',
    '.st-rank-opt.active{background:rgba(201,168,76,0.12);color:#E8D48B;box-shadow:0 2px 8px rgba(201,168,76,0.08);}',
    '.st-rank-opt:hover:not(.active){color:rgba(240,237,230,0.7);}',

    // ── Podium ──
    '.st-podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:24px;padding:16px 8px 0;}',
    '.st-podium-col{display:flex;flex-direction:column;align-items:center;flex:1;max-width:120px;}',
    '.st-podium-block{width:100%;border-radius:14px 14px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:16px 8px 12px;position:relative;overflow:hidden;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}',
    '.st-podium-block::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);}',
    '.st-podium-1{background:linear-gradient(180deg,rgba(201,168,76,0.15),rgba(201,168,76,0.04));border:0.5px solid rgba(201,168,76,0.2);min-height:140px;}',
    '.st-podium-2{background:linear-gradient(180deg,rgba(192,192,192,0.1),rgba(192,192,192,0.03));border:0.5px solid rgba(192,192,192,0.15);min-height:110px;}',
    '.st-podium-3{background:linear-gradient(180deg,rgba(205,127,50,0.1),rgba(205,127,50,0.03));border:0.5px solid rgba(205,127,50,0.15);min-height:90px;}',
    '.st-podium-medal{font-size:28px;margin-bottom:6px;}',
    '.st-podium-avatar{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;border:2px solid rgba(255,255,255,0.1);}',
    '.st-podium-name{font-size:12px;font-weight:700;color:#F0EDE6;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-bottom:2px;}',
    '.st-podium-score{font-size:16px;font-weight:800;color:#E8D48B;}',

    // ── Ranking list ──
    '.st-rank-list{display:flex;flex-direction:column;gap:6px;}',
    '.st-rank-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.05);border-radius:12px;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;}',
    '.st-rank-row:hover{background:rgba(255,255,255,0.05);transform:translateX(3px);}',
    '.st-rank-row.is-me{border-color:rgba(201,168,76,0.2);background:rgba(201,168,76,0.04);}',
    '.st-rank-pos{font-size:14px;font-weight:800;color:rgba(240,237,230,0.35);width:24px;text-align:center;flex-shrink:0;}',
    '.st-rank-row.is-me .st-rank-pos{color:#E8D48B;}',
    '.st-rank-avatar{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;}',
    '.st-rank-info{flex:1;min-width:0;}',
    '.st-rank-name{font-size:13px;font-weight:700;color:#F0EDE6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.st-rank-score-col{display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;}',
    '.st-rank-score-val{font-size:16px;font-weight:800;color:#E8D48B;}',
    '.st-rank-mini-bars{display:flex;gap:2px;margin-top:3px;}',
    '.st-rank-mini-seg{width:16px;height:4px;border-radius:2px;}',

    // ── Alerts ──
    '.st-alert-group{margin-bottom:18px;}',
    '.st-alert-header{font-size:14px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px;color:rgba(240,237,230,0.7);}',
    '.st-alert-card{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.05);border-radius:12px;margin-bottom:8px;position:relative;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}',
    '.st-alert-card:hover{background:rgba(255,255,255,0.04);transform:translateX(3px);}',
    '.st-alert-border{position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;}',
    '.st-alert-icon{font-size:18px;flex-shrink:0;margin-left:8px;}',
    '.st-alert-text{flex:1;font-size:13px;color:rgba(240,237,230,0.8);line-height:1.4;}',
    '.st-alert-btn{padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#F0EDE6;cursor:pointer;font-size:12px;font-weight:600;font-family:"Outfit","Nunito",sans-serif;transition:all 0.3s ease;flex-shrink:0;}',
    '.st-alert-btn:hover{background:rgba(255,255,255,0.1);}',
    '.st-alert-empty{text-align:center;padding:40px 20px;color:rgba(240,237,230,0.3);font-size:15px;}',

    // ── Coach IA ──
    '.st-coach-section{margin-bottom:20px;}',
    '.st-daily3{display:flex;flex-direction:column;gap:8px;margin-bottom:18px;}',
    '.st-daily3-card{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.06);border-radius:14px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;}',
    '.st-daily3-card:hover{background:rgba(255,255,255,0.05);transform:translateX(4px);border-color:rgba(201,168,76,0.15);}',
    '.st-daily3-num{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,rgba(201,168,76,0.15),rgba(127,119,221,0.1));border:1px solid rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#E8D48B;flex-shrink:0;}',
    '.st-daily3-text{flex:1;font-size:13px;color:rgba(240,237,230,0.8);line-height:1.4;}',
    '.st-daily3-text strong{color:#F0EDE6;}',
    '.st-daily3-action{font-size:11px;color:#E8D48B;font-weight:600;}',

    '.st-coach-load-btn{width:100%;padding:14px;border-radius:14px;border:1px solid rgba(127,119,221,0.2);background:linear-gradient(135deg,rgba(127,119,221,0.08),rgba(201,168,76,0.05));color:#E8D48B;cursor:pointer;font-size:14px;font-weight:700;font-family:"Outfit","Nunito",sans-serif;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
    '.st-coach-load-btn:hover{background:linear-gradient(135deg,rgba(127,119,221,0.15),rgba(201,168,76,0.1));transform:translateY(-2px);box-shadow:0 6px 24px rgba(127,119,221,0.12);}',

    '.st-coach-rec-card{padding:14px 16px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.05);border-radius:12px;margin-bottom:8px;position:relative;padding-left:20px;transition:all 0.3s ease;}',
    '.st-coach-rec-card::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;background:linear-gradient(180deg,#7F77DD,#C9A84C);}',
    '.st-coach-rec-num{font-size:11px;font-weight:800;color:#7F77DD;margin-bottom:4px;}',
    '.st-coach-rec-text{font-size:13px;color:rgba(240,237,230,0.8);line-height:1.5;}',

    '.st-insight-card{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.05);border-radius:12px;margin-bottom:8px;}',
    '.st-insight-icon{font-size:18px;flex-shrink:0;}',
    '.st-insight-text{font-size:13px;color:rgba(240,237,230,0.7);line-height:1.4;}',

    // ── Spinner ──
    '.st-spinner{display:flex;align-items:center;justify-content:center;padding:30px;}',
    '.st-spin-dot{width:8px;height:8px;border-radius:50%;background:#C9A84C;margin:0 4px;animation:stBounce 1.4s infinite ease-in-out both;}',
    '.st-spin-dot:nth-child(1){animation-delay:-0.32s;}',
    '.st-spin-dot:nth-child(2){animation-delay:-0.16s;}',
    '@keyframes stBounce{0%,80%,100%{transform:scale(0);opacity:0.4;}40%{transform:scale(1);opacity:1;}}',

    // ── Member Detail Overlay ──
    '.st-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0;}',
    '.st-detail-sheet{width:100%;max-width:480px;max-height:85vh;overflow-y:auto;overscroll-behavior:contain;background:rgba(10,10,18,0.97);border:0.5px solid rgba(255,255,255,0.08);border-radius:24px 24px 0 0;padding:24px 20px 32px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 -16px 64px rgba(0,0,0,0.5);animation:stSheetIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;font-family:"Outfit","Nunito",sans-serif;color:#F0EDE6;}',
    '@keyframes stSheetIn{from{opacity:0;transform:translateY(60px);}to{opacity:1;transform:translateY(0);}}',
    '.st-detail-handle{width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);margin:0 auto 20px;}',
    '.st-detail-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;}',
    '.st-detail-avatar{width:56px;height:56px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;border:2px solid rgba(255,255,255,0.1);flex-shrink:0;}',
    '.st-detail-name{font-size:20px;font-weight:800;color:#F0EDE6;}',
    '.st-detail-rank{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:7px;font-weight:600;margin-top:3px;}',
    '.st-detail-days{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:10px;font-size:13px;font-weight:700;margin-bottom:16px;}',
    '.st-detail-score-section{margin-bottom:18px;}',
    '.st-detail-score-total{font-size:28px;font-weight:800;color:#E8D48B;margin-bottom:6px;}',
    '.st-detail-score-bar{height:10px;border-radius:5px;background:rgba(255,255,255,0.06);overflow:hidden;display:flex;gap:2px;}',
    '.st-detail-score-seg{height:100%;border-radius:3px;transition:width 0.6s ease;}',
    '.st-detail-score-legend{display:flex;gap:14px;margin-top:8px;flex-wrap:wrap;}',
    '.st-detail-legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(240,237,230,0.5);}',
    '.st-detail-legend-dot{width:8px;height:8px;border-radius:3px;}',
    '.st-detail-progress{margin-bottom:16px;}',
    '.st-detail-progress-bar{height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden;margin-top:6px;}',
    '.st-detail-progress-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#C9A84C,#E8D48B);transition:width 0.6s ease;}',
    '.st-detail-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px;}',
    '.st-detail-stat{text-align:center;padding:10px 6px;background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.05);border-radius:10px;}',
    '.st-detail-stat-val{font-size:18px;font-weight:800;color:#F0EDE6;}',
    '.st-detail-stat-label{font-size:10px;color:rgba(240,237,230,0.4);margin-top:2px;text-transform:uppercase;font-weight:600;letter-spacing:0.3px;}',
    '.st-detail-wa-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;font-size:15px;font-weight:700;font-family:"Outfit","Nunito",sans-serif;cursor:pointer;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);margin-top:8px;}',
    '.st-detail-wa-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(37,211,102,0.25);}',
    '.st-detail-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#F0EDE6;font-size:16px;cursor:pointer;transition:all 0.3s ease;}',
    '.st-detail-close:hover{background:rgba(255,255,255,0.15);}',

    // ── Responsive ──
    '@media(max-width:600px){',
    '  .st-stats-grid{grid-template-columns:repeat(2,1fr);}',
    '  .st-stat-val{font-size:22px;}',
    '  .st-podium-col{max-width:100px;}',
    '  .st-podium-avatar{width:36px;height:36px;font-size:14px;}',
    '  .st-podium-score{font-size:14px;}',
    '  .st-tree-children{margin-left:12px;}',
    '  .st-detail-stats-grid{grid-template-columns:repeat(2,1fr);}',
    '  .st-rank-mini-bars{display:none;}',
    '}',
    '@media(min-width:900px){',
    '  .st-stats-grid{grid-template-columns:repeat(3,1fr);gap:14px;}',
    '  .st-dash-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;}',
    '  .st-rank-list{max-width:700px;}',
    '  .st-tree-list{max-width:800px;}',
    '  .st-detail-sheet{border-radius:24px;margin-bottom:40px;}',
    '}',

    // ── Gold shimmer keyframe (shared) ──
    '@keyframes stGoldShimmer{to{background-position:200% center;}}',

    '' // trailing empty for safe join
  ].join('\n');
  document.head.appendChild(css);
}


// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function _safe(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function _getRank(r) {
  if (typeof RANKS !== 'undefined' && RANKS[r]) return RANKS[r];
  return { name: 'N/A', icon: '-', color: '#888', bg: 'rgba(136,136,136,0.15)', border: 'rgba(136,136,136,0.3)' };
}

function _getInitials(name) {
  if (!name) return '??';
  var parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function _statusColor(status) {
  if (status === 'active') return C.green;
  if (status === 'risk' || status === 'at_risk') return C.gold;
  return C.red;
}

function _daysPillColor(days) {
  if (days <= 7) return { bg: 'rgba(226,75,74,0.15)', border: 'rgba(226,75,74,0.3)', color: '#E24B4A' };
  if (days <= 15) return { bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.3)', color: '#E8D48B' };
  return { bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.25)', color: '#1D9E75' };
}

function _scoreParts(m) {
  var p = (m.prospects_score || m.prospects || 0);
  var s = (m.sales_score || m.sales || 0);
  var d = (m.day_score || m.daily_streak || 0);
  var total = p + s + d;
  return { prospects: p, sales: s, day: d, total: total };
}

function _scoreBarHTML(m, height) {
  var h = height || 6;
  var sc = _scoreParts(m);
  var total = sc.total || 1;
  var pw = Math.round((sc.prospects / total) * 100);
  var sw = Math.round((sc.sales / total) * 100);
  var dw = 100 - pw - sw;
  if (dw < 0) dw = 0;
  return '<div class="st-score-bar" style="height:' + h + 'px">' +
    '<div class="st-score-seg prospects" style="width:' + pw + '%"></div>' +
    '<div class="st-score-seg sales" style="width:' + sw + '%"></div>' +
    '<div class="st-score-seg day" style="width:' + dw + '%"></div>' +
  '</div>';
}

function _miniScoreBar(m) {
  var sc = _scoreParts(m);
  var max = Math.max(sc.prospects, sc.sales, sc.day, 1);
  var pw = Math.round((sc.prospects / max) * 16);
  var sw = Math.round((sc.sales / max) * 16);
  var dw = Math.round((sc.day / max) * 16);
  return '<div class="st-rank-mini-bars">' +
    '<div class="st-rank-mini-seg" style="width:' + pw + 'px;background:#1D9E75;"></div>' +
    '<div class="st-rank-mini-seg" style="width:' + sw + 'px;background:#C9A84C;"></div>' +
    '<div class="st-rank-mini-seg" style="width:' + dw + 'px;background:#7F77DD;"></div>' +
  '</div>';
}

function _rankBadgeHTML(rank, small) {
  var r = _getRank(rank);
  var fs = small ? '10px' : '11px';
  var pad = small ? '1px 6px' : '2px 8px';
  return '<span class="' + (small ? 'st-tree-rank-badge' : 'st-direct-rank') + '" style="background:' + r.bg + ';color:' + r.color + ';border:0.5px solid ' + r.border + ';font-size:' + fs + ';padding:' + pad + ';">' +
    r.icon + ' ' + _safe(r.name) +
  '</span>';
}

function _avatarHTML(name, rank, size) {
  var r = _getRank(rank);
  var sz = size || 32;
  var br = Math.round(sz * 0.31);
  return '<div style="width:' + sz + 'px;height:' + sz + 'px;border-radius:' + br + 'px;background:' + r.bg + ';border:1.5px solid ' + r.border + ';display:flex;align-items:center;justify-content:center;font-size:' + Math.round(sz * 0.38) + 'px;font-weight:700;color:' + r.color + ';flex-shrink:0;">' +
    _getInitials(name) +
  '</div>';
}

function _spinnerHTML() {
  return '<div class="st-spinner"><div class="st-spin-dot"></div><div class="st-spin-dot"></div><div class="st-spin-dot"></div></div>';
}

function _skeletonHTML() {
  return '<div class="st-skeleton">' +
    '<div class="st-skel-bar w60"></div>' +
    '<div class="st-skel-block"></div>' +
    '<div class="st-skel-bar w80"></div>' +
    '<div class="st-skel-block"></div>' +
    '<div class="st-skel-bar w40"></div>' +
    '<div class="st-skel-block"></div>' +
  '</div>';
}


// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

function initSkyTeam() {
  if (typeof CU === 'undefined' || !CU) return;

  injectSkyTeamCSS();

  var el = document.getElementById('skyteam-content');
  if (!el) return;

  // Show loading skeleton
  el.innerHTML = _skeletonHTML();
  stState.loading = true;

  // Check cache (5 min)
  var now = Date.now();
  if (stState.cache && (now - stState.cacheTime) < 300000) {
    stState.data = stState.cache;
    stState.loading = false;
    renderSkyTeam();
    return;
  }

  // Fetch data
  var body = JSON.stringify({ action: 'get_team', username: CU.username });

  try {
  _skyFetch(TEAM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  }, 15000)
  .then(function(r) { return r.json(); })
  .then(function(data) {
    stState.loading = false;
    if (data && data.success !== false) {
      stState.data = data;
      stState.cache = data;
      stState.cacheTime = Date.now();
      renderSkyTeam();
    } else {
      var el2 = document.getElementById('skyteam-content');
      if (el2) {
        el2.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3);font-family:Outfit,Nunito,sans-serif;">' +
          '<div style="font-size:40px;margin-bottom:12px;">📡</div>' +
          '<div style="font-size:15px;font-weight:600;">No se pudieron cargar los datos</div>' +
          '<div style="font-size:13px;margin-top:6px;">Verifica tu conexion e intenta de nuevo</div>' +
          '<button onclick="initSkyTeam()" style="margin-top:16px;padding:10px 24px;border-radius:12px;border:1px solid rgba(201,168,76,0.2);background:rgba(201,168,76,0.1);color:#E8D48B;cursor:pointer;font-size:14px;font-weight:600;font-family:Outfit,Nunito,sans-serif;">Reintentar</button>' +
        '</div>';
      }
    }
  })
  .catch(function(err) {
    stState.loading = false;
    console.error('[SkyTeam] Fetch error:', err);
    var el2 = document.getElementById('skyteam-content');
    if (el2) {
      el2.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3);font-family:Outfit,Nunito,sans-serif;">' +
        '<div style="font-size:40px;margin-bottom:12px;">⚠️</div>' +
        '<div style="font-size:15px;font-weight:600;">Error de conexion</div>' +
        '<button onclick="initSkyTeam()" style="margin-top:16px;padding:10px 24px;border-radius:12px;border:1px solid rgba(201,168,76,0.2);background:rgba(201,168,76,0.1);color:#E8D48B;cursor:pointer;font-size:14px;font-weight:600;font-family:Outfit,Nunito,sans-serif;">Reintentar</button>' +
      '</div>';
    }
  });
  } catch(e) { stState.loading = false; console.error('[SkyTeam] _skyFetch error:', e); }
}


// ═══════════════════════════════════════════════════════════════
//  RENDER MAIN
// ═══════════════════════════════════════════════════════════════

function renderSkyTeam() {
  var el = document.getElementById('skyteam-content');
  if (!el || !stState.data) return;

  var tabs = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'arbol',     icon: '🌳', label: 'Arbol' },
    { id: 'ranking',   icon: '🏆', label: 'Ranking' },
    { id: 'alertas',   icon: '🔔', label: 'Alertas' },
    { id: 'coach',     icon: '🤖', label: 'Coach IA' }
  ];

  var html = '';

  // Tab bar
  html += '<div class="st-tab-bar">';
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var cls = (stState.tab === t.id) ? 'st-tab-btn st-tab-on' : 'st-tab-btn st-tab-off';
    html += '<button class="' + cls + '" onclick="switchSTTab(\'' + t.id + '\')">';
    html += '<span class="st-tab-icon">' + t.icon + '</span>';
    html += t.label;
    html += '</button>';
  }
  html += '</div>';

  // Content
  html += '<div class="st-tab-content">';
  switch (stState.tab) {
    case 'dashboard': html += renderSTDashboard(); break;
    case 'arbol':     html += renderSTArbol();     break;
    case 'ranking':   html += renderSTRanking();   break;
    case 'alertas':   html += renderSTAlertas();   break;
    case 'coach':     html += renderSTCoach();     break;
    default:          html += renderSTDashboard();
  }
  html += '</div>';

  el.innerHTML = html;

  // Bind tree search if on arbol tab
  if (stState.tab === 'arbol') {
    var searchInput = document.getElementById('st-tree-search-input');
    if (searchInput) {
      searchInput.value = stState.treeSearch;
      searchInput.addEventListener('input', function(e) {
        stState.treeSearch = e.target.value;
        var listEl = document.getElementById('st-tree-list-container');
        if (listEl) {
          listEl.innerHTML = _buildTreeHTML();
        }
      });
    }
  }
}


// ═══════════════════════════════════════════════════════════════
//  TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════════

function renderSTDashboard() {
  var d = stState.data;
  if (!d) return _spinnerHTML();

  var net = d.network || {};
  var members = d.members || [];
  var alerts = d.alerts || [];

  var html = '';

  // ── 1. Hero Stats ──
  html += '<div class="st-stats-grid">';

  html += '<div class="st-stat-card">';
  html += '<div class="st-stat-icon">👥</div>';
  html += '<div class="st-stat-val">' + (net.total_members || 0) + '</div>';
  html += '<div class="st-stat-label">Total Socios</div>';
  html += '</div>';

  html += '<div class="st-stat-card">';
  html += '<div class="st-stat-icon">🔥</div>';
  html += '<div class="st-stat-val">' + (net.active_7d || 0) + '</div>';
  html += '<div class="st-stat-label">Activos 7d</div>';
  html += '</div>';

  html += '<div class="st-stat-card">';
  html += '<div class="st-stat-icon">✨</div>';
  html += '<div class="st-stat-val">' + (net.new_this_month || 0) + '</div>';
  html += '<div class="st-stat-label">Nuevos mes</div>';
  html += '</div>';

  html += '</div>';

  // ── 2. Top 3 Directs ──
  var directs = members.filter(function(m) { return m.level === 1; });
  directs.sort(function(a, b) {
    return (_scoreParts(b).total) - (_scoreParts(a).total);
  });
  var top3 = directs.slice(0, 3);

  if (top3.length > 0) {
    html += '<div class="st-section-title">⭐ Top Directos</div>';
    html += '<div class="st-top-directs">';

    for (var i = 0; i < top3.length; i++) {
      var m = top3[i];
      var sc = _scoreParts(m);
      var rk = _getRank(m.rank);

      html += '<div class="st-direct-card" onclick="openMemberDetail(\'' + _safe(m.username) + '\')">';
      html += _avatarHTML(m.name || m.username, m.rank, 40);
      html += '<div class="st-direct-info">';
      html += '<div class="st-direct-name">' + _safe(m.name || m.username) + '</div>';
      html += _rankBadgeHTML(m.rank, false);
      html += _scoreBarHTML(m, 5);
      html += '</div>';
      html += '<div class="st-direct-score">' + sc.total + '</div>';
      html += '</div>';
    }

    html += '</div>';
  }

  // ── Dashboard two-column wrapper for desktop ──
  html += '<div class="st-dash-two-col">';

  // ── 3. Needs Attention ──
  var urgentAlerts = alerts.filter(function(a) {
    return a.category === 'urgente' || a.category === 'atencion';
  });
  var attAlerts = urgentAlerts.slice(0, 5);

  html += '<div>';
  if (attAlerts.length > 0) {
    html += '<div class="st-section-title">⚠️ Requieren Atencion</div>';
    for (var j = 0; j < attAlerts.length; j++) {
      var al = attAlerts[j];
      var borderColor = al.category === 'urgente' ? C.red : C.gold;
      var alIcon = al.category === 'urgente' ? '🔴' : '🟡';

      html += '<div class="st-attention-card">';
      html += '<div class="st-attention-border" style="background:' + borderColor + ';"></div>';
      html += '<div class="st-attention-icon">' + alIcon + '</div>';
      html += '<div class="st-attention-msg">' + _safe(al.message || al.text || '') + '</div>';

      if (al.whatsapp) {
        html += '<button class="st-attention-btn" onclick="window.open(\'https://wa.me/' + _safe(al.whatsapp) + '\',\'_blank\')">Contactar</button>';
      } else if (al.username) {
        html += '<button class="st-attention-btn" onclick="openMemberDetail(\'' + _safe(al.username) + '\')">Ver perfil</button>';
      }

      html += '</div>';
    }
  } else {
    html += '<div class="st-section-title">✅ Todo en orden</div>';
    html += '<div style="text-align:center;padding:20px;color:rgba(240,237,230,0.3);font-size:13px;">Sin alertas urgentes</div>';
  }
  html += '</div>';

  // ── 4. Growth Sparkline ──
  html += '<div>';
  var growth = net.growth_weekly || [];
  if (growth.length > 0) {
    html += '<div class="st-section-title">📈 Crecimiento Semanal</div>';
    var maxG = Math.max.apply(null, growth);
    if (maxG === 0) maxG = 1;

    html += '<div class="st-sparkline">';
    var dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    for (var k = 0; k < growth.length; k++) {
      var pct = Math.round((growth[k] / maxG) * 100);
      if (pct < 5) pct = 5;
      var lbl = dayLabels[k] || '';
      html += '<div class="st-spark-bar" style="height:' + pct + '%;" title="' + lbl + ': ' + growth[k] + '">';
      html += '<span class="st-spark-label">' + growth[k] + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '</div>'; // end two-col

  // ── 5. Quick Actions ──
  html += '<div class="st-section-title">⚡ Acciones Rapidas</div>';
  html += '<div class="st-quick-actions">';
  html += '<button class="st-quick-btn st-quick-btn-gold" onclick="switchSTTab(\'arbol\')">🌳 Ver Arbol</button>';
  html += '<button class="st-quick-btn" onclick="switchSTTab(\'ranking\')">🏆 Ranking</button>';
  html += '<button class="st-quick-btn" onclick="switchSTTab(\'coach\')">🤖 Coach IA</button>';
  html += '<button class="st-quick-btn" onclick="switchSTTab(\'alertas\')">🔔 Alertas</button>';
  html += '</div>';

  return html;
}


// ═══════════════════════════════════════════════════════════════
//  TAB: ARBOL
// ═══════════════════════════════════════════════════════════════

function renderSTArbol() {
  var d = stState.data;
  if (!d) return _spinnerHTML();

  var html = '';

  // Search
  html += '<input id="st-tree-search-input" class="st-tree-search" type="text" placeholder="Buscar por nombre o usuario..." />';

  // Tree list
  html += '<div id="st-tree-list-container" class="st-tree-list">';
  html += _buildTreeHTML();
  html += '</div>';

  return html;
}

function _buildTreeHTML() {
  var d = stState.data;
  if (!d || !d.members) return '<div class="st-tree-empty">Sin miembros en tu red</div>';

  var members = d.members || [];
  var search = (stState.treeSearch || '').toLowerCase();

  // Build hierarchy map
  var childrenMap = {};
  var roots = [];

  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var parentRef = m.sponsor || m.parent || null;

    if (m.level === 1 || !parentRef) {
      // Level 1 members are roots — don't add them as children
      roots.push(m);
    } else {
      if (!childrenMap[parentRef]) childrenMap[parentRef] = [];
      childrenMap[parentRef].push(m);
    }
  }

  // If search is active, filter and show flat
  if (search) {
    var filtered = members.filter(function(m) {
      var name = (m.name || '').toLowerCase();
      var uname = (m.username || '').toLowerCase();
      return name.indexOf(search) !== -1 || uname.indexOf(search) !== -1;
    });

    if (filtered.length === 0) {
      return '<div class="st-tree-empty">No se encontraron resultados para "' + _safe(stState.treeSearch) + '"</div>';
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
      html += _renderTreeNode(filtered[j], 0, childrenMap, true);
    }
    return html;
  }

  // Deduplicate roots
  var rootUsernames = {};
  var uniqueRoots = [];
  for (var r = 0; r < roots.length; r++) {
    var ref = roots[r].username || roots[r].ref;
    if (!rootUsernames[ref]) {
      rootUsernames[ref] = true;
      uniqueRoots.push(roots[r]);
    }
  }

  if (uniqueRoots.length === 0) {
    return '<div class="st-tree-empty">Sin miembros en tu red</div>';
  }

  var html2 = '';
  for (var k = 0; k < uniqueRoots.length; k++) {
    html2 += _renderTreeNode(uniqueRoots[k], 0, childrenMap, false);
  }
  return html2;
}

function _renderTreeNode(m, depth, childrenMap, flat) {
  var ref = m.username || m.ref || '';
  var status = m.status || 'active';
  var sc = _scoreParts(m);
  var rk = _getRank(m.rank);
  var days = m.days_remaining != null ? m.days_remaining : (m.days_left != null ? m.days_left : null);
  var indent = depth * 20;
  var children = childrenMap[ref] || [];
  var hasChildren = !flat && children.length > 0;
  var expanded = !!stState.treeExpanded[ref];

  var html = '';

  html += '<div class="st-tree-node" style="margin-left:' + indent + 'px;" onclick="openMemberDetail(\'' + _safe(ref) + '\')">';

  // Status border
  html += '<div class="st-tree-status" style="background:' + _statusColor(status) + ';"></div>';

  // Avatar
  html += _avatarHTML(m.name || ref, m.rank, 32);

  // Info
  html += '<div class="st-tree-info">';
  html += '<div class="st-tree-name">' + _safe(m.name || ref);
  html += _rankBadgeHTML(m.rank, true);
  html += '</div>';
  html += '</div>';

  // Score
  html += '<div class="st-tree-score">';
  html += sc.total;
  html += '<div class="st-tree-mini-bar">';
  var maxSc = Math.max(sc.prospects, sc.sales, sc.day, 1);
  html += '<div style="width:' + Math.round((sc.prospects / maxSc) * 12) + 'px;height:4px;background:#1D9E75;border-radius:2px;"></div>';
  html += '<div style="width:' + Math.round((sc.sales / maxSc) * 12) + 'px;height:4px;background:#C9A84C;border-radius:2px;"></div>';
  html += '<div style="width:' + Math.round((sc.day / maxSc) * 12) + 'px;height:4px;background:#7F77DD;border-radius:2px;"></div>';
  html += '</div>';
  html += '</div>';

  // Days pill
  if (days != null) {
    var dp = _daysPillColor(days);
    html += '<div class="st-tree-days-pill" style="background:' + dp.bg + ';border:0.5px solid ' + dp.border + ';color:' + dp.color + ';">' + days + 'd</div>';
  }

  // Chevron
  if (hasChildren) {
    html += '<div class="st-tree-chevron ' + (expanded ? 'expanded' : '') + '" onclick="event.stopPropagation();_toggleTreeNode(\'' + _safe(ref) + '\')">';
    html += '&#9654;';
    html += '</div>';
  }

  html += '</div>';

  // Render children if expanded
  if (hasChildren && expanded) {
    html += '<div class="st-tree-children">';
    for (var c = 0; c < children.length; c++) {
      html += _renderTreeNode(children[c], depth + 1, childrenMap, false);
    }
    html += '</div>';
  }

  return html;
}

function _toggleTreeNode(ref) {
  stState.treeExpanded[ref] = !stState.treeExpanded[ref];
  var listEl = document.getElementById('st-tree-list-container');
  if (listEl) {
    listEl.innerHTML = _buildTreeHTML();
  }
}
window._toggleTreeNode = _toggleTreeNode;


// ═══════════════════════════════════════════════════════════════
//  TAB: RANKING
// ═══════════════════════════════════════════════════════════════

function renderSTRanking() {
  var d = stState.data;
  if (!d) return _spinnerHTML();

  var members = (d.members || []).slice();
  var html = '';

  // ── Period toggle ──
  var periods = [
    { id: 'weekly', label: 'Semanal' },
    { id: 'monthly', label: 'Mensual' },
    { id: 'all', label: 'Historico' }
  ];

  html += '<div class="st-rank-toggle">';
  for (var p = 0; p < periods.length; p++) {
    var pr = periods[p];
    var active = (stState.rankPeriod === pr.id) ? ' active' : '';
    html += '<button class="st-rank-opt' + active + '" onclick="window._stSetRankPeriod(\'' + pr.id + '\')">' + pr.label + '</button>';
  }
  html += '</div>';

  // Sort by sky_score
  members.sort(function(a, b) {
    var scoreA = a.sky_score != null ? a.sky_score : _scoreParts(a).total;
    var scoreB = b.sky_score != null ? b.sky_score : _scoreParts(b).total;
    return scoreB - scoreA;
  });

  // ── Podium (top 3) ──
  if (members.length >= 3) {
    html += _renderPodium(members.slice(0, 3));
  } else if (members.length > 0) {
    html += _renderPodium(members.slice(0, members.length));
  }

  // ── Rank list (4+) ──
  var cuUsername = (typeof CU !== 'undefined' && CU) ? CU.username : '';

  if (members.length > 3) {
    html += '<div class="st-rank-list">';
    for (var i = 3; i < members.length; i++) {
      var m = members[i];
      var sc = m.sky_score != null ? m.sky_score : _scoreParts(m).total;
      var rk = _getRank(m.rank);
      var isMe = (m.username === cuUsername);

      html += '<div class="st-rank-row' + (isMe ? ' is-me' : '') + '" onclick="openMemberDetail(\'' + _safe(m.username) + '\')">';
      html += '<div class="st-rank-pos">#' + (i + 1) + '</div>';
      html += _avatarHTML(m.name || m.username, m.rank, 34);
      html += '<div class="st-rank-info">';
      html += '<div class="st-rank-name">' + _safe(m.name || m.username) + ' ' + _rankBadgeHTML(m.rank, true) + '</div>';
      html += '</div>';
      html += '<div class="st-rank-score-col">';
      html += '<div class="st-rank-score-val">' + sc + '</div>';
      html += _miniScoreBar(m);
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // If no members
  if (members.length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:rgba(240,237,230,0.3);font-size:14px;">';
    html += '<div style="font-size:40px;margin-bottom:8px;">🏆</div>';
    html += 'Aun no hay miembros en el ranking';
    html += '</div>';
  }

  return html;
}

function _renderPodium(top) {
  // Reorder: 2nd, 1st, 3rd
  var order = [];
  if (top.length >= 2) order.push({ m: top[1], pos: 2, cls: 'st-podium-2', medal: '🥈' });
  if (top.length >= 1) order.push({ m: top[0], pos: 1, cls: 'st-podium-1', medal: '🥇' });
  if (top.length >= 3) order.push({ m: top[2], pos: 3, cls: 'st-podium-3', medal: '🥉' });

  var html = '<div class="st-podium">';

  for (var i = 0; i < order.length; i++) {
    var o = order[i];
    var m = o.m;
    var sc = m.sky_score != null ? m.sky_score : _scoreParts(m).total;

    html += '<div class="st-podium-col" onclick="openMemberDetail(\'' + _safe(m.username) + '\')" style="cursor:pointer;">';
    html += '<div class="st-podium-block ' + o.cls + '">';
    html += '<div class="st-podium-medal">' + o.medal + '</div>';
    html += _avatarHTML(m.name || m.username, m.rank, 44);
    html += '<div class="st-podium-name">' + _safe(m.name || m.username) + '</div>';
    html += '<div class="st-podium-score">' + sc + '</div>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  TAB: ALERTAS
// ═══════════════════════════════════════════════════════════════

function renderSTAlertas() {
  var d = stState.data;
  if (!d) return _spinnerHTML();

  var alerts = d.alerts || [];

  if (alerts.length === 0) {
    return '<div class="st-alert-empty">' +
      '<div style="font-size:48px;margin-bottom:12px;">🎉</div>' +
      '<div style="font-size:16px;font-weight:600;color:rgba(240,237,230,0.5);">Tu equipo esta al dia</div>' +
      '<div style="font-size:13px;margin-top:6px;color:rgba(240,237,230,0.3);">No hay alertas pendientes</div>' +
    '</div>';
  }

  // Group by category
  var groups = { urgente: [], atencion: [], positivo: [] };

  for (var i = 0; i < alerts.length; i++) {
    var al = alerts[i];
    var cat = al.category || 'atencion';
    if (groups[cat]) {
      groups[cat].push(al);
    } else {
      groups.atencion.push(al);
    }
  }

  var html = '';

  // Urgente
  if (groups.urgente.length > 0) {
    html += '<div class="st-alert-group">';
    html += '<div class="st-alert-header">🔴 Urgente (' + groups.urgente.length + ')</div>';
    for (var u = 0; u < groups.urgente.length; u++) {
      html += _renderAlertCard(groups.urgente[u], C.red, '🔴');
    }
    html += '</div>';
  }

  // Atencion
  if (groups.atencion.length > 0) {
    html += '<div class="st-alert-group">';
    html += '<div class="st-alert-header">🟡 Atencion (' + groups.atencion.length + ')</div>';
    for (var a = 0; a < groups.atencion.length; a++) {
      html += _renderAlertCard(groups.atencion[a], C.gold, '🟡');
    }
    html += '</div>';
  }

  // Positivo
  if (groups.positivo.length > 0) {
    html += '<div class="st-alert-group">';
    html += '<div class="st-alert-header">🟢 Positivo (' + groups.positivo.length + ')</div>';
    for (var p = 0; p < groups.positivo.length; p++) {
      html += _renderAlertCard(groups.positivo[p], C.green, '🟢');
    }
    html += '</div>';
  }

  return html;
}

function _renderAlertCard(al, borderColor, icon) {
  var html = '<div class="st-alert-card">';
  html += '<div class="st-alert-border" style="background:' + borderColor + ';"></div>';
  html += '<div class="st-alert-icon">' + icon + '</div>';
  html += '<div class="st-alert-text">' + _safe(al.message || al.text || '') + '</div>';

  if (al.whatsapp) {
    html += '<button class="st-alert-btn" onclick="event.stopPropagation();window.open(\'https://wa.me/' + _safe(al.whatsapp) + '\',\'_blank\')">Contactar</button>';
  } else if (al.username) {
    html += '<button class="st-alert-btn" onclick="event.stopPropagation();openMemberDetail(\'' + _safe(al.username) + '\')">Ver perfil</button>';
  }

  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  TAB: COACH IA
// ═══════════════════════════════════════════════════════════════

function renderSTCoach() {
  var d = stState.data;
  if (!d) return _spinnerHTML();

  var members = d.members || [];
  var html = '';

  // ── 1. Daily 3 ──
  html += '<div class="st-section-title">🎯 Tus 3 Acciones del Dia</div>';
  html += '<div class="st-daily3">';

  // Action 1: Closest to expiring (still active)
  var closestExpire = null;
  var closestDays = 9999;
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var days = m.days_remaining != null ? m.days_remaining : (m.days_left != null ? m.days_left : null);
    var status = m.status || 'active';
    if (days != null && days > 0 && (status === 'active' || status === 'risk' || status === 'at_risk') && days < closestDays) {
      closestDays = days;
      closestExpire = m;
    }
  }

  if (closestExpire) {
    html += '<div class="st-daily3-card" onclick="openMemberDetail(\'' + _safe(closestExpire.username) + '\')">';
    html += '<div class="st-daily3-num">1</div>';
    html += '<div class="st-daily3-text">Renueva a <strong>' + _safe(closestExpire.name || closestExpire.username) + '</strong> — quedan ' + closestDays + ' dias</div>';
    html += '<div class="st-daily3-action">Ver &rarr;</div>';
    html += '</div>';
  } else {
    html += '<div class="st-daily3-card">';
    html += '<div class="st-daily3-num">1</div>';
    html += '<div class="st-daily3-text">Todos tus socios tienen buena vigencia</div>';
    html += '</div>';
  }

  // Action 2: Closest to next rank
  var closestRank = null;
  var closestRankGap = 9999;
  for (var j = 0; j < members.length; j++) {
    var m2 = members[j];
    var nextRank = (m2.rank || 0) + 1;
    if (typeof RANKS !== 'undefined' && RANKS[nextRank]) {
      var gap = m2.points_to_next_rank || m2.gap_to_next || null;
      if (gap != null && gap < closestRankGap && gap > 0) {
        closestRankGap = gap;
        closestRank = m2;
      }
    }
  }

  if (closestRank) {
    var nextRk = _getRank((closestRank.rank || 0) + 1);
    html += '<div class="st-daily3-card" onclick="openMemberDetail(\'' + _safe(closestRank.username) + '\')">';
    html += '<div class="st-daily3-num">2</div>';
    html += '<div class="st-daily3-text">Motiva a <strong>' + _safe(closestRank.name || closestRank.username) + '</strong> — a ' + closestRankGap + ' pts de ' + _safe(nextRk.name) + '</div>';
    html += '<div class="st-daily3-action">Ver &rarr;</div>';
    html += '</div>';
  } else {
    html += '<div class="st-daily3-card">';
    html += '<div class="st-daily3-num">2</div>';
    html += '<div class="st-daily3-text">Motiva a tu equipo a escalar de rango</div>';
    html += '</div>';
  }

  // Action 3: Most recently inactive direct
  var directInactive = members.filter(function(m) {
    return m.level === 1 && (m.status === 'inactive' || m.status === 'expired');
  });
  directInactive.sort(function(a, b) {
    var dateA = a.last_active || a.last_login || '';
    var dateB = b.last_active || b.last_login || '';
    return dateB > dateA ? 1 : (dateB < dateA ? -1 : 0);
  });

  if (directInactive.length > 0) {
    var reactivate = directInactive[0];
    html += '<div class="st-daily3-card" onclick="openMemberDetail(\'' + _safe(reactivate.username) + '\')">';
    html += '<div class="st-daily3-num">3</div>';
    html += '<div class="st-daily3-text">Reactiva a <strong>' + _safe(reactivate.name || reactivate.username) + '</strong></div>';
    html += '<div class="st-daily3-action">Ver &rarr;</div>';
    html += '</div>';
  } else {
    html += '<div class="st-daily3-card">';
    html += '<div class="st-daily3-num">3</div>';
    html += '<div class="st-daily3-text">Todos tus directos estan activos — excelente!</div>';
    html += '</div>';
  }

  html += '</div>';

  // ── 2. AI Recommendations ──
  html += '<div class="st-section-title">🤖 Recomendaciones IA</div>';

  if (stState.coachData && stState.coachData.recommendations) {
    var recs = stState.coachData.recommendations;
    for (var r = 0; r < recs.length; r++) {
      html += '<div class="st-coach-rec-card">';
      html += '<div class="st-coach-rec-num">Recomendacion #' + (r + 1) + '</div>';
      html += '<div class="st-coach-rec-text">' + _safe(typeof recs[r] === 'string' ? recs[r] : (recs[r].text || recs[r].message || JSON.stringify(recs[r]))) + '</div>';
      html += '</div>';
    }
  } else if (stState.loading) {
    html += _spinnerHTML();
  } else {
    html += '<button class="st-coach-load-btn" id="st-coach-load-btn" onclick="_loadCoachRecommendations()">';
    html += '🤖 Cargar recomendaciones IA';
    html += '</button>';
  }

  // ── 3. Smart Insights ──
  html += '<div class="st-section-title" style="margin-top:22px;">💡 Insights</div>';

  var totalMembers = net_total(d);
  var activeMembers = members.filter(function(m) { return m.status === 'active'; }).length;
  var topMember = members.length > 0 ? members.slice().sort(function(a, b) {
    return (_scoreParts(b).total) - (_scoreParts(a).total);
  })[0] : null;

  var directsAll = members.filter(function(m) { return m.level === 1; });
  var directsOnboarded = directsAll.filter(function(m) {
    return m.onboarding_day >= 7 || m.onboarding_complete;
  });
  var onboardPct = directsAll.length > 0 ? Math.round((directsOnboarded.length / directsAll.length) * 100) : 0;

  html += '<div class="st-insight-card">';
  html += '<div class="st-insight-icon">📊</div>';
  html += '<div class="st-insight-text">Tu red tiene <strong>' + activeMembers + '</strong> socios activos de <strong>' + totalMembers + '</strong></div>';
  html += '</div>';

  if (topMember) {
    var topSc = topMember.sky_score != null ? topMember.sky_score : _scoreParts(topMember).total;
    html += '<div class="st-insight-card">';
    html += '<div class="st-insight-icon">⭐</div>';
    html += '<div class="st-insight-text">Top socio: <strong>' + _safe(topMember.name || topMember.username) + '</strong> con Sky Score <strong>' + topSc + '</strong></div>';
    html += '</div>';
  }

  html += '<div class="st-insight-card">';
  html += '<div class="st-insight-icon">🎓</div>';
  html += '<div class="st-insight-text"><strong>' + onboardPct + '%</strong> de tus directos completaron onboarding</div>';
  html += '</div>';

  return html;
}

function net_total(d) {
  if (d.network && d.network.total_members != null) return d.network.total_members;
  if (d.members) return d.members.length;
  return 0;
}

function _loadCoachRecommendations() {
  var btn = document.getElementById('st-coach-load-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = _spinnerHTML();
  }

  stState.loading = true;

  var body = JSON.stringify({
    action: 'coach',
    username: (typeof CU !== 'undefined' && CU) ? CU.username : ''
  });

  try {
  _skyFetch(TEAM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  }, 20000)
  .then(function(r) { return r.json(); })
  .then(function(data) {
    stState.loading = false;
    if (data && data.recommendations) {
      stState.coachData = data;
    } else if (data && data.message) {
      stState.coachData = { recommendations: [{ text: data.message }] };
    } else {
      stState.coachData = { recommendations: [{ text: 'No hay recomendaciones disponibles en este momento.' }] };
    }
    renderSkyTeam();
  })
  .catch(function(err) {
    stState.loading = false;
    console.error('[SkyTeam Coach] Error:', err);
    stState.coachData = { recommendations: [{ text: 'Error cargando recomendaciones. Intenta de nuevo.' }] };
    renderSkyTeam();
  });
  } catch(e) { stState.loading = false; console.error('[SkyTeam Coach] _skyFetch error:', e); }
}
window._loadCoachRecommendations = _loadCoachRecommendations;


// ═══════════════════════════════════════════════════════════════
//  MEMBER DETAIL OVERLAY
// ═══════════════════════════════════════════════════════════════

function openMemberDetail(username) {
  var d = stState.data;
  if (!d || !d.members) return;

  var m = null;
  for (var i = 0; i < d.members.length; i++) {
    if (d.members[i].username === username || d.members[i].ref === username) {
      m = d.members[i];
      break;
    }
  }
  if (!m) return;

  var rk = _getRank(m.rank);
  var sc = _scoreParts(m);
  var skyScore = m.sky_score != null ? m.sky_score : sc.total;
  var days = m.days_remaining != null ? m.days_remaining : (m.days_left != null ? m.days_left : null);
  var dp = days != null ? _daysPillColor(days) : null;
  var status = m.status || 'active';
  var onbDay = m.onboarding_day || m.ob_day || 0;
  var onbPct = Math.min(Math.round((onbDay / 7) * 100), 100);

  var prospects = m.prospects_score || m.prospects || 0;
  var appointments = m.appointments || m.citas || 0;
  var streak = m.daily_streak || m.streak || 0;
  var xp = m.xp || 0;
  var sales = m.sales_score || m.sales || 0;

  // Determine if CU is sponsor (direct)
  var cuUsername = (typeof CU !== 'undefined' && CU) ? CU.username : '';
  var isDirect = (m.level === 1 || m.sponsor === cuUsername || m.parent === cuUsername);
  var whatsapp = m.whatsapp || m.phone || '';

  // Build overlay
  var overlay = document.createElement('div');
  overlay.className = 'st-overlay';
  overlay.id = 'st-detail-overlay';

  var html = '<div class="st-detail-sheet" onclick="event.stopPropagation();" style="position:relative;">';

  // Handle
  html += '<div class="st-detail-handle"></div>';

  // Close
  html += '<button class="st-detail-close" onclick="_closeMemberDetail()">&times;</button>';

  // Header
  html += '<div class="st-detail-header">';
  html += _avatarHTML(m.name || username, m.rank, 56);
  html += '<div>';
  html += '<div class="st-detail-name">' + _safe(m.name || username) + '</div>';
  html += '<div class="st-detail-rank" style="background:' + rk.bg + ';color:' + rk.color + ';border:0.5px solid ' + rk.border + ';">';
  html += rk.icon + ' ' + _safe(rk.name);
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // Days pill
  if (days != null && dp) {
    html += '<div class="st-detail-days" style="background:' + dp.bg + ';border:0.5px solid ' + dp.border + ';color:' + dp.color + ';">';
    html += '⏳ ' + days + ' dias restantes';
    html += '</div>';
  }

  // Sky Score
  html += '<div class="st-detail-score-section">';
  html += '<div style="font-size:12px;color:rgba(240,237,230,0.4);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:4px;">Sky Score</div>';
  html += '<div class="st-detail-score-total">' + skyScore + '</div>';

  // Score bar
  var totalSc = sc.total || 1;
  var pw = Math.round((sc.prospects / totalSc) * 100);
  var sw = Math.round((sc.sales / totalSc) * 100);
  var dw = 100 - pw - sw;
  if (dw < 0) dw = 0;
  html += '<div class="st-detail-score-bar">';
  html += '<div class="st-detail-score-seg" style="width:' + pw + '%;background:#1D9E75;"></div>';
  html += '<div class="st-detail-score-seg" style="width:' + sw + '%;background:#C9A84C;"></div>';
  html += '<div class="st-detail-score-seg" style="width:' + dw + '%;background:#7F77DD;"></div>';
  html += '</div>';

  // Legend
  html += '<div class="st-detail-score-legend">';
  html += '<div class="st-detail-legend-item"><div class="st-detail-legend-dot" style="background:#1D9E75;"></div>Prospectos: ' + sc.prospects + '</div>';
  html += '<div class="st-detail-legend-item"><div class="st-detail-legend-dot" style="background:#C9A84C;"></div>Ventas: ' + sc.sales + '</div>';
  html += '<div class="st-detail-legend-item"><div class="st-detail-legend-dot" style="background:#7F77DD;"></div>Dia: ' + sc.day + '</div>';
  html += '</div>';
  html += '</div>';

  // Onboarding
  html += '<div class="st-detail-progress">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
  html += '<div style="font-size:13px;font-weight:600;">Onboarding</div>';
  html += '<div style="font-size:12px;color:rgba(240,237,230,0.5);">Dia ' + onbDay + ' de 7</div>';
  html += '</div>';
  html += '<div class="st-detail-progress-bar">';
  html += '<div class="st-detail-progress-fill" style="width:' + onbPct + '%;"></div>';
  html += '</div>';
  html += '</div>';

  // Stats grid
  html += '<div class="st-detail-stats-grid">';

  html += '<div class="st-detail-stat">';
  html += '<div class="st-detail-stat-val">' + prospects + '</div>';
  html += '<div class="st-detail-stat-label">Prospectos</div>';
  html += '</div>';

  html += '<div class="st-detail-stat">';
  html += '<div class="st-detail-stat-val">' + appointments + '</div>';
  html += '<div class="st-detail-stat-label">Citas</div>';
  html += '</div>';

  html += '<div class="st-detail-stat">';
  html += '<div class="st-detail-stat-val">' + streak + 'd</div>';
  html += '<div class="st-detail-stat-label">Racha</div>';
  html += '</div>';

  html += '<div class="st-detail-stat">';
  html += '<div class="st-detail-stat-val">' + xp + '</div>';
  html += '<div class="st-detail-stat-label">XP</div>';
  html += '</div>';

  html += '<div class="st-detail-stat">';
  html += '<div class="st-detail-stat-val">' + sales + '</div>';
  html += '<div class="st-detail-stat-label">Ventas</div>';
  html += '</div>';

  html += '<div class="st-detail-stat">';
  html += '<div class="st-detail-stat-val" style="color:' + _statusColor(status) + ';">' + _safe(status) + '</div>';
  html += '<div class="st-detail-stat-label">Estado</div>';
  html += '</div>';

  html += '</div>';

  // WhatsApp button (only if CU is direct sponsor)
  if (isDirect && whatsapp) {
    var waNum = whatsapp.replace(/[^0-9]/g, '');
    html += '<button class="st-detail-wa-btn" onclick="window.open(\'https://wa.me/' + waNum + '\',\'_blank\')">';
    html += '📱 WhatsApp';
    html += '</button>';
  }

  html += '</div>';

  overlay.innerHTML = html;

  // Click overlay to close
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      _closeMemberDetail();
    }
  });

  document.body.appendChild(overlay);
}

function _closeMemberDetail() {
  var overlay = document.getElementById('st-detail-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(function() {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 200);
  }
}
window._closeMemberDetail = _closeMemberDetail;


// ═══════════════════════════════════════════════════════════════
//  TAB SWITCH
// ═══════════════════════════════════════════════════════════════

function switchSTTab(tab) {
  stState.tab = tab;
  renderSkyTeam();
}


// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

window.initSkyTeam = initSkyTeam;
window.switchSTTab = switchSTTab;
window.openMemberDetail = openMemberDetail;
window.renderSkyTeam = renderSkyTeam;
window._stSetRankPeriod = function(p) { stState.rankPeriod = p; renderSkyTeam(); };

})();
