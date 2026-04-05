
// ═══════════════════════════════════════════════════════════════
// SKYTEAM V2 — SKY TEAM (Mi Red) Frontend
// Dashboard, Arbol Genealogico, Ranking, Alertas, Mentor IA
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
  treeFilterStatus: 'all',
  treeFilterRank: 'all',
  treeFilterScore: 'all',
  treeFilterDays: 'all',
  rankPeriod: 'monthly',
  coachData: null,
  mentorTool: null,
  mentorChat: [],
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
    '.st-sparkline{display:flex;align-items:flex-end;gap:6px;height:100px;padding:16px 16px 8px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.06);border-radius:14px;margin-bottom:18px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}',
    '.st-spark-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;}',
    '.st-spark-bar{width:100%;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,#C9A84C,rgba(201,168,76,0.4));transition:height 0.6s cubic-bezier(0.34,1.56,0.64,1);min-height:4px;position:relative;cursor:pointer;}',
    '.st-spark-bar:hover{filter:brightness(1.3);transform:scaleY(1.05);transform-origin:bottom;}',
    '.st-spark-label{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:10px;color:#E8D48B;font-weight:700;white-space:nowrap;}',
    '.st-spark-day{font-size:9px;color:rgba(255,255,255,0.3);margin-top:6px;font-weight:600;}',

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

    '@keyframes mentorDot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}',

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
  if (status === 'new') return '#7F77DD';
  if (status === 'risk' || status === 'at_risk') return C.gold;
  return C.red;
}

function _statusLabel(status, daysSinceReg) {
  if (status === 'new') return 'Nuevo';
  if (status === 'active') return 'Activo';
  if (status === 'risk' || status === 'at_risk') return 'En riesgo';
  if (status === 'inactive') return 'Inactivo';
  return status || 'Sin datos';
}

function _memberActivityLabel(m) {
  var regDays = m.days_since_registration;
  if (regDays != null && regDays <= 1) return 'Se uni\u00f3 hoy';
  if (regDays != null && regDays <= 2) return 'Se uni\u00f3 ayer';
  if (regDays != null && regDays <= 7) return 'Se uni\u00f3 hace ' + regDays + ' d\u00edas';
  if (m.streak_last_date) {
    var lastDays = Math.ceil((Date.now() - new Date(m.streak_last_date).getTime()) / 86400000);
    if (lastDays <= 1) return 'Activo hoy';
    if (lastDays <= 2) return 'Activo ayer';
    return '\u00daltima actividad hace ' + lastDays + 'd';
  }
  if (regDays != null && regDays < 999) return 'Registrado hace ' + regDays + ' d\u00edas';
  return '';
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

  // Fetch data — API expects action:'dashboard', user, ref
  var userRef = CU.ref || CU.username || '';
  var body = JSON.stringify({ action: 'dashboard', user: CU.username, ref: userRef });

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
    { id: 'mentor',    icon: '🧠', label: 'Mentor IA' }
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
    case 'mentor':    html += renderSTMentor();    break;
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

  // ── 4. Growth Sparkline (interactive) ──
  html += '<div>';
  var growthRaw = net.growth_weekly || [];
  if (growthRaw.length > 0) {
    // Normalize: can be [{label,count}] or [number]
    var growth = growthRaw.map(function(g) {
      return typeof g === 'object' ? { label: g.label || '', count: g.count || 0 } : { label: '', count: g || 0 };
    });
    var totalWeek = growth.reduce(function(s, g) { return s + g.count; }, 0);
    html += '<div class="st-section-title">\uD83D\uDCC8 Crecimiento Semanal <span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:400;">(' + totalWeek + ' nuevos)</span></div>';
    var maxG = Math.max.apply(null, growth.map(function(g) { return g.count; }));
    if (maxG === 0) maxG = 1;

    html += '<div class="st-sparkline">';
    for (var k = 0; k < growth.length; k++) {
      var pct = Math.max(5, Math.round((growth[k].count / maxG) * 100));
      var barColor = growth[k].count > 0 ? 'linear-gradient(180deg,#C9A84C,#1D9E75)' : 'rgba(255,255,255,0.06)';
      html += '<div class="st-spark-col">';
      html += '<div class="st-spark-bar" style="height:' + pct + '%;background:' + barColor + ';" title="' + growth[k].label + ': ' + growth[k].count + ' nuevos">';
      if (growth[k].count > 0) html += '<span class="st-spark-label">' + growth[k].count + '</span>';
      html += '</div>';
      html += '<div class="st-spark-day">' + growth[k].label + '</div>';
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
  html += '<button class="st-quick-btn" onclick="switchSTTab(\'mentor\')">🧠 Mentor IA</button>';
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

  // Filter bar
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">';

  // Status filter
  html += '<select id="st-filter-status" onchange="stState.treeFilterStatus=this.value;_refreshTree()" style="' + _filterSelectCSS() + '">';
  html += '<option value="all">Todos</option>';
  html += '<option value="active"' + (stState.treeFilterStatus === 'active' ? ' selected' : '') + '>Activos</option>';
  html += '<option value="new"' + (stState.treeFilterStatus === 'new' ? ' selected' : '') + '>Nuevos</option>';
  html += '<option value="risk"' + (stState.treeFilterStatus === 'risk' ? ' selected' : '') + '>En riesgo</option>';
  html += '<option value="inactive"' + (stState.treeFilterStatus === 'inactive' ? ' selected' : '') + '>Inactivos</option>';
  html += '</select>';

  // Rank filter (Innova ranks)
  html += '<select id="st-filter-rank" onchange="stState.treeFilterRank=this.value;_refreshTree()" style="' + _filterSelectCSS() + '">';
  html += '<option value="all">Rango: Todos</option>';
  var rankOptions = [
    {v:'0',l:'\u26AA Cliente'},{v:'1',l:'\uD83E\uDEA8 INN 200'},{v:'2',l:'\uD83D\uDC9C INN 500'},
    {v:'3',l:'\uD83D\uDC8E NOVA 1500'},{v:'4',l:'\u2764\uFE0F NOVA 5K'},{v:'5',l:'\uD83D\uDC9A NOVA 10K'},
    {v:'6',l:'\uD83D\uDC8E NOVA DIAMOND'},{v:'7',l:'\uD83D\uDC8E\uD83D\uDC8E NOVA 50K'},{v:'8',l:'\uD83D\uDC8E\uD83D\uDC8E\uD83D\uDC8E NOVA 100K'}
  ];
  rankOptions.forEach(function(ro) {
    html += '<option value="' + ro.v + '"' + (stState.treeFilterRank === ro.v ? ' selected' : '') + '>' + ro.l + '</option>';
  });
  html += '</select>';

  // Score filter
  html += '<select id="st-filter-score" onchange="stState.treeFilterScore=this.value;_refreshTree()" style="' + _filterSelectCSS() + '">';
  html += '<option value="all">Score: Todos</option>';
  html += '<option value="high"' + (stState.treeFilterScore === 'high' ? ' selected' : '') + '>Alto (50+)</option>';
  html += '<option value="mid"' + (stState.treeFilterScore === 'mid' ? ' selected' : '') + '>Medio (10-49)</option>';
  html += '<option value="low"' + (stState.treeFilterScore === 'low' ? ' selected' : '') + '>Bajo (0-9)</option>';
  html += '</select>';

  // Days filter
  html += '<select id="st-filter-days" onchange="stState.treeFilterDays=this.value;_refreshTree()" style="' + _filterSelectCSS() + '">';
  html += '<option value="all">D\u00edas: Todos</option>';
  html += '<option value="critical"' + (stState.treeFilterDays === 'critical' ? ' selected' : '') + '>Cr\u00edtico (\u22647d)</option>';
  html += '<option value="warning"' + (stState.treeFilterDays === 'warning' ? ' selected' : '') + '>Alerta (8-15d)</option>';
  html += '<option value="ok"' + (stState.treeFilterDays === 'ok' ? ' selected' : '') + '>OK (16+d)</option>';
  html += '</select>';

  // CSV export button
  html += '<button onclick="_exportTeamCSV()" style="padding:6px 12px;border-radius:8px;background:rgba(29,158,117,0.10);border:1px solid rgba(29,158,117,0.25);color:#1D9E75;font-size:11px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;white-space:nowrap;">CSV</button>';

  html += '</div>';

  // Active filter count
  var activeFilters = 0;
  if (stState.treeFilterStatus !== 'all') activeFilters++;
  if (stState.treeFilterRank !== 'all') activeFilters++;
  if (stState.treeFilterScore !== 'all') activeFilters++;
  if (stState.treeFilterDays !== 'all') activeFilters++;
  if (activeFilters > 0) {
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
    html += '<span style="font-size:11px;color:rgba(255,255,255,0.4);">' + activeFilters + ' filtro' + (activeFilters > 1 ? 's' : '') + ' activo' + (activeFilters > 1 ? 's' : '') + '</span>';
    html += '<button onclick="_clearTreeFilters()" style="font-size:10px;padding:3px 10px;border-radius:6px;background:rgba(226,75,74,0.08);border:1px solid rgba(226,75,74,0.20);color:#E24B4A;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">Limpiar</button>';
    html += '</div>';
  }

  // Tree list
  html += '<div id="st-tree-list-container" class="st-tree-list">';
  html += _buildTreeHTML();
  html += '</div>';

  return html;
}

function _filterSelectCSS() {
  return 'padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#F0EDE6;font-size:11px;font-weight:600;outline:none;font-family:Outfit,Nunito,sans-serif;cursor:pointer;min-width:0;flex:1;max-width:140px;';
}

function _refreshTree() {
  var container = document.getElementById('st-tree-list-container');
  if (container) container.innerHTML = _buildTreeHTML();
}
window._refreshTree = _refreshTree;

function _clearTreeFilters() {
  stState.treeFilterStatus = 'all';
  stState.treeFilterRank = 'all';
  stState.treeFilterScore = 'all';
  stState.treeFilterDays = 'all';
  renderSkyTeam();
}
window._clearTreeFilters = _clearTreeFilters;

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

  // Apply filters to members
  var hasFilters = stState.treeFilterStatus !== 'all' || stState.treeFilterRank !== 'all' || stState.treeFilterScore !== 'all' || stState.treeFilterDays !== 'all';
  var showFlat = !!search || hasFilters;

  var pool = members;
  if (search || hasFilters) {
    pool = members.filter(function(m) {
      // Search
      if (search) {
        var name = (m.name || '').toLowerCase();
        var uname = (m.username || '').toLowerCase();
        if (name.indexOf(search) === -1 && uname.indexOf(search) === -1) return false;
      }
      // Status filter
      if (stState.treeFilterStatus !== 'all' && m.status !== stState.treeFilterStatus) return false;
      // Rank filter (compare by rank number)
      if (stState.treeFilterRank !== 'all') {
        if (String(m.rank || 0) !== stState.treeFilterRank) return false;
      }
      // Score filter
      if (stState.treeFilterScore !== 'all') {
        var sc = m.sky_score || _scoreParts(m).total || 0;
        if (stState.treeFilterScore === 'high' && sc < 50) return false;
        if (stState.treeFilterScore === 'mid' && (sc < 10 || sc >= 50)) return false;
        if (stState.treeFilterScore === 'low' && sc >= 10) return false;
      }
      // Days filter
      if (stState.treeFilterDays !== 'all') {
        var days = m.days_remaining != null ? m.days_remaining : 999;
        if (stState.treeFilterDays === 'critical' && days > 7) return false;
        if (stState.treeFilterDays === 'warning' && (days <= 7 || days > 15)) return false;
        if (stState.treeFilterDays === 'ok' && days <= 15) return false;
      }
      return true;
    });
  }

  // Flat view (search or filter active)
  if (showFlat) {
    if (pool.length === 0) {
      var msg = search ? 'No se encontraron resultados para "' + _safe(stState.treeSearch) + '"' : 'Ning\u00fan miembro coincide con los filtros';
      return '<div class="st-tree-empty">' + msg + '</div>';
    }
    var html = '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:8px;">' + pool.length + ' miembro' + (pool.length !== 1 ? 's' : '') + '</div>';
    for (var j = 0; j < pool.length; j++) {
      html += _renderTreeNode(pool[j], 0, childrenMap, true);
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


// ── CSV Export ───────────────────────────────────────────────

function _exportTeamCSV() {
  var d = stState.data;
  if (!d || !d.members) return;
  var members = d.members;

  var rows = [['Nombre', 'Usuario', 'Nivel', 'Rango', 'Sky Score', 'Prospectos', 'Ventas', 'Estado', 'D\u00edas Restantes', 'Registro', 'WhatsApp']];
  members.forEach(function(m) {
    var rk = _getRank(m.rank);
    var sc = m.sky_score || _scoreParts(m).total || 0;
    var created = m.created_at ? m.created_at.split('T')[0] : '';
    rows.push([
      '"' + (m.name || '').replace(/"/g, '""') + '"',
      m.username || '',
      m.level || '',
      rk.name,
      sc,
      m.prospectos_count || 0,
      m.ventas || 0,
      _statusLabel(m.status),
      m.days_remaining != null ? m.days_remaining : '',
      created,
      m.whatsapp || ''
    ]);
  });

  var csv = rows.map(function(r) { return r.join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'skyteam_red_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('CSV descargado');
}
window._exportTeamCSV = _exportTeamCSV;


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
//  TAB: MENTOR IA (21 tools)
// ═══════════════════════════════════════════════════════════════

function renderSTMentor() {
  var d = stState.data;

  var html = '';

  // Chat header
  html += '<div style="display:flex;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:16px;">';
  html += '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7F77DD,#C9A84C);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🧠</div>';
  html += '<div><div style="font-size:16px;font-weight:800;color:#fff;">Mentor IA</div>';
  html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);">Tu coach de liderazgo personal · Disponible 24/7</div></div></div>';

  // Chat messages area
  html += '<div id="mentor-chat-area" style="min-height:300px;max-height:50vh;overflow-y:auto;overscroll-behavior:contain;margin-bottom:16px;scroll-behavior:smooth;">';

  // Show conversation history or welcome message
  if (!stState.mentorChat || stState.mentorChat.length === 0) {
    // Welcome message
    html += renderMentorMessage('¡Hola' + (CU ? ', ' + CU.name.split(' ')[0] : '') + '! 👋 Soy tu Mentor IA. Estoy aquí para ayudarte a crecer como líder y hacer crecer tu equipo.\n\n¿En qué puedo ayudarte hoy?');

    // Smart suggestion chips — adapt to user's context
    var chips = [];
    if (d && d.alerts) {
      var urgentes = d.alerts.filter(function(a){return a.category==='urgente';});
      if (urgentes.length > 0) chips.push('🔴 Tengo '+urgentes.length+' alertas urgentes');
    }
    if (d && d.members) {
      var inactivos = d.members.filter(function(m){return m.status==='inactive';});
      if (inactivos.length > 0) chips.push('¿Quién necesita que lo reactive?');
      var sinOnb = d.members.filter(function(m){return m.onboarding_day<=1 && m.level===1;});
      if (sinOnb.length > 0) chips.push('Hay socios sin avanzar en onboarding');
    }
    if (typeof crmProspectos !== 'undefined' && crmProspectos) {
      var calientes = crmProspectos.filter(function(p){return (p.temperatura||0)>=70 && p.etapa!=='cerrado_ganado';});
      if (calientes.length > 0) chips.push('🔥 Tengo '+calientes.length+' prospectos calientes');
      var sinContacto = crmProspectos.filter(function(p){var d2=p.updated_at?Math.ceil((Date.now()-new Date(p.updated_at).getTime())/86400000):999;return d2>=5 && p.etapa!=='cerrado_ganado' && p.etapa!=='cerrado_perdido';});
      if (sinContacto.length > 0) chips.push('Prospectos sin seguimiento');
    }
    if (typeof agendaBookings !== 'undefined' && agendaBookings) {
      var hoy = agendaBookings.filter(function(b){if(!b.fecha_iso)return false;var h=(new Date(b.fecha_iso).getTime()-Date.now())/3600000;return h>0&&h<=24;});
      if (hoy.length > 0) chips.push('📅 Tengo citas hoy');
    }
    // Always include emotional + general
    chips.push('¿Cómo me siento hoy?');
    chips.push('Dame un plan de accion para hoy');
    // Limit to 5 most relevant
    chips = chips.slice(0, 5);

    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 12px 56px;">';
    chips.forEach(function(c) {
      html += '<button onclick="mentorSendChat(\''+c.replace(/'/g,"\\'")+'\')" style="padding:8px 14px;border-radius:20px;background:rgba(127,119,221,0.08);border:1px solid rgba(127,119,221,0.20);color:#7F77DD;font-size:12px;font-weight:600;cursor:pointer;font-family:Outfit,Nunito,sans-serif;transition:all 0.2s;" onmouseover="this.style.background=\'rgba(127,119,221,0.15)\'" onmouseout="this.style.background=\'rgba(127,119,221,0.08)\'">'+c+'</button>';
    });
    html += '</div>';

    // Contextual capability hint — based on what the user needs right now
    var hint = '';
    if (d && d.members) {
      var totalM = d.members.length;
      var activeM = d.members.filter(function(m){return m.status==='active';}).length;
      var pctActive = totalM > 0 ? Math.round(activeM/totalM*100) : 0;
      if (pctActive < 50) hint = '💡 Puedo ayudarte a identificar quién necesita una llamada urgente y qué decirle según su personalidad (Código BANK).';
      else if (d.alerts && d.alerts.filter(function(a){return a.category==='urgente';}).length > 2) hint = '💡 Tienes alertas urgentes. Pregúntame y te digo exactamente a quién llamar primero y qué decirle.';
      else if (totalM < 10) hint = '💡 Tu equipo está creciendo. Puedo ayudarte a crear un plan de acción semanal para duplicar tu red este mes.';
      else hint = '💡 Cuéntame cómo te sientes hoy — puedo ayudarte con lo emocional, lo estratégico, o lo operativo. Estoy aquí para todo.';
    } else {
      hint = '💡 Soy tu mentor personal. Puedo analizar tu equipo, preparar tus eventos, ayudarte con cierres, y hasta trabajar contigo en lo emocional. Pregúntame lo que quieras.';
    }
    html += '<div style="margin-left:56px;padding:10px 14px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.12);border-radius:12px;font-size:11px;color:rgba(201,168,76,0.7);line-height:1.4;">' + hint + '</div>';

  } else {
    // Render conversation history
    stState.mentorChat.forEach(function(msg) {
      if (msg.role === 'user') {
        html += renderUserMessage(msg.text);
      } else {
        html += renderMentorMessage(msg.text);
      }
    });
  }

  html += '</div>';

  // Input bar
  html += '<div style="display:flex;gap:8px;padding:12px 0;border-top:1px solid rgba(255,255,255,0.06);">';
  html += '<input type="text" id="mentor-chat-input" placeholder="Escríbele a tu Mentor..." onkeydown="if(event.key===\'Enter\')mentorSendChat()" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:14px;color:#F0EDE6;font-size:14px;padding:12px 16px;outline:none;font-family:Outfit,Nunito,sans-serif;" onfocus="this.style.borderColor=\'rgba(127,119,221,0.30)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.08)\'">';
  html += '<button onclick="mentorToggleVoice()" id="mentor-mic-btn" style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.5);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;">🎤</button>';
  html += '<button onclick="mentorSendChat()" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#7F77DD,#C9A84C);border:none;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">➤</button>';
  html += '</div>';

  return html;
}

function renderMentorMessage(text) {
  var escaped = _safe(text).replace(/\n/g, '<br>');
  return '<div style="display:flex;gap:10px;margin-bottom:14px;">'
    + '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7F77DD,#C9A84C);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🧠</div>'
    + '<div style="flex:1;background:rgba(127,119,221,0.06);border:1px solid rgba(127,119,221,0.12);border-radius:4px 16px 16px 16px;padding:12px 16px;font-size:13px;color:#F0EDE6;line-height:1.6;">' + escaped + '</div>'
    + '</div>';
}

function renderUserMessage(text) {
  var escaped = _safe(text).replace(/\n/g, '<br>');
  return '<div style="display:flex;gap:10px;margin-bottom:14px;justify-content:flex-end;">'
    + '<div style="max-width:80%;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.15);border-radius:16px 4px 16px 16px;padding:12px 16px;font-size:13px;color:#F0EDE6;line-height:1.5;">' + escaped + '</div>'
    + '</div>';
}

// ── renderMentorTool: handles all 21 tools ──

function renderMentorTool(toolId, d) {
  var members = d.members || [];
  var alerts = d.alerts || [];
  var net = d.network || {};

  // Back button
  var html = '<div style="margin-bottom:16px;">';
  html += '<button onclick="stSetMentorTool(null)" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px 14px;color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">← Volver</button>';
  html += '</div>';

  // TOOL: metas
  if (toolId === 'metas') {
    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:16px;">🎯 Metas de Lider</div>';

    var goals = JSON.parse(localStorage.getItem('mentor_goals_'+(typeof CU!=='undefined'&&CU?CU.username:'')) || '{}');
    if (!goals.inn200) goals = {inn200:0, inn500:0, nova:0, cierres:0, directos:0};

    var curInn200 = members.filter(function(m){return m.rank>=1;}).length;
    var curInn500 = members.filter(function(m){return m.rank>=2;}).length;
    var curNova = members.filter(function(m){return m.rank>=3;}).length;
    var curDirectos = members.filter(function(m){return m.level===1;}).length;

    var metas = [
      {key:'inn200', label:'INN 200 en mi red', current:curInn200, icon:'🌱'},
      {key:'inn500', label:'INN 500 en mi red', current:curInn500, icon:'⭐'},
      {key:'nova', label:'Nova+ en mi red', current:curNova, icon:'🔥'},
      {key:'directos', label:'Directos activos', current:curDirectos, icon:'👥'},
      {key:'cierres', label:'Cierres este mes', current:(typeof CU!=='undefined'&&CU?CU.ventas||0:0), icon:'💰'}
    ];

    metas.forEach(function(m) {
      var goal = goals[m.key] || 0;
      var pctM = goal > 0 ? Math.min(100, Math.round(m.current/goal*100)) : 0;
      var color = pctM >= 100 ? '#1D9E75' : pctM >= 50 ? '#C9A84C' : '#E24B4A';

      html += '<div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:8px;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
      html += '<div style="font-size:13px;font-weight:600;color:#fff;">'+m.icon+' '+m.label+'</div>';
      html += '<div style="font-size:12px;font-weight:800;color:'+color+';">'+m.current+' / '+(goal||'—')+'</div>';
      html += '</div>';
      if (goal > 0) {
        html += '<div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;"><div style="height:100%;width:'+pctM+'%;background:'+color+';border-radius:3px;transition:width 0.5s;"></div></div>';
        if (pctM < 100) {
          var faltantes = goal - m.current;
          html += '<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:4px;">Te faltan '+faltantes+' para tu meta</div>';
        } else {
          html += '<div style="font-size:10px;color:#1D9E75;margin-top:4px;">Meta alcanzada!</div>';
        }
      }
      html += '<input type="number" value="'+(goal||'')+'" placeholder="Meta..." min="0" onchange="mentorSaveGoal(\''+m.key+'\',this.value)" style="margin-top:6px;width:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:6px;color:#F0EDE6;font-size:11px;padding:4px 8px;outline:none;font-family:Outfit,Nunito,sans-serif;">';
      html += '</div>';
    });
  }

  // TOOL: bank_code
  else if (toolId === 'bank_code') {
    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">🏦 Codigo BANK</div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Perfila a tus socios para comunicarte mejor.</div>';

    var codes = [
      {id:'B', name:'Blueprint', color:'#3B82F6', icon:'🔵', desc:'Planificador. Necesita datos, estructura, plan paso a paso. No lo presiones, dale informacion.', speak:'Hablale con datos: "El plan tiene 7 pasos. En el paso 1 haras..."'},
      {id:'A', name:'Action', color:'#EF4444', icon:'🔴', desc:'Competitivo. Quiere resultados rapidos, no procesos. Desafialo.', speak:'Hablale de resultados: "Cuanto quieres ganar este mes? Yo te muestro como."'},
      {id:'N', name:'Nurturing', color:'#F59E0B', icon:'💛', desc:'Emocional. Le importan las relaciones y ayudar. Conecta emocionalmente.', speak:'Hablale de impacto: "Imagina ayudar a 10 familias a tener libertad financiera."'},
      {id:'K', name:'Knowledge', color:'#10B981', icon:'💚', desc:'Analitico. Necesita investigar, comparar, entender todo. Dale espacio.', speak:'Hablale con logica: "Mira los numeros: el ROI promedio es 300% en 90 dias."'}
    ];

    var directos = members.filter(function(m){return m.level===1;});
    html += '<select id="mentor-bank-member" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:16px;">';
    html += '<option value="">Selecciona un socio...</option>';
    directos.forEach(function(m) {
      var saved = localStorage.getItem('bank_'+(m.username||m.ref));
      html += '<option value="'+(m.username||m.ref)+'">' + _safe(m.name||m.username) + (saved ? ' ('+saved+')' : '') + '</option>';
    });
    html += '</select>';

    codes.forEach(function(c) {
      html += '<div onclick="mentorSetBANK(\''+c.id+'\')" style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor=\''+c.color+'40\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.06)\'">';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
      html += '<div style="font-size:20px;">'+c.icon+'</div>';
      html += '<div style="font-size:14px;font-weight:700;color:'+c.color+';">'+c.name+'</div></div>';
      html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.4;margin-bottom:6px;">'+c.desc+'</div>';
      html += '<div style="font-size:11px;color:'+c.color+';font-style:italic;">"'+c.speak+'"</div>';
      html += '</div>';
    });
  }

  // TOOL: emocional
  else if (toolId === 'emocional') {
    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">🧘 Coach Emocional</div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Como te sientes hoy? Responde honestamente.</div>';

    html += '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:20px;">';
    var moods = [{e:'😫',v:2,l:'Mal'},{e:'😐',v:4,l:'Regular'},{e:'🙂',v:6,l:'Bien'},{e:'😊',v:8,l:'Muy bien'},{e:'🔥',v:10,l:'Imparable'}];
    moods.forEach(function(m) {
      html += '<div onclick="mentorSetMood('+m.v+')" style="text-align:center;cursor:pointer;padding:10px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);transition:all 0.2s;" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">';
      html += '<div style="font-size:28px;">'+m.e+'</div>';
      html += '<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:2px;">'+m.l+'</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">En tu vida personal, te gustaria contarme algo?</div>';
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:10px;">Si algo no te deja tener la energia a tope y el enfoque full, cuentamelo y te ayudo a resolverlo.</div>';
    var blocks = [
      {id:'rechazo', label:'😰 Miedo al rechazo'},
      {id:'impostor', label:'🎭 No me siento capaz'},
      {id:'tiempo', label:'⏰ No tengo tiempo'},
      {id:'resultados', label:'📉 No veo resultados'},
      {id:'equipo', label:'👥 Mi equipo no avanza'},
      {id:'motivacion', label:'😔 Perdi la motivacion'},
      {id:'pareja', label:'💔 Problemas de pareja'},
      {id:'dinero', label:'💸 Problemas economicos'}
    ];
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:16px;">';
    blocks.forEach(function(b) {
      html += '<button onclick="mentorHandleBlock(\''+b.id+'\')" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);font-size:12px;cursor:pointer;font-family:Outfit,Nunito,sans-serif;text-align:left;transition:all 0.2s;">'+b.label+'</button>';
    });
    html += '</div>';

    html += '<div id="mentor-emocional-response"></div>';
  }

  // TOOL: frases
  else if (toolId === 'frases') {
    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:16px;">🔥 Frases de Poder</div>';

    var frases = [
      {author:'Jim Rohn', text:'No desees que sea mas facil, desea ser mejor. No desees menos problemas, desea mas habilidades.'},
      {author:'Eric Worre', text:'El network marketing no es perfecto, es mejor. Mejor que cualquier otra opcion para la persona promedio.'},
      {author:'Robert Kiyosaki', text:'Los ricos construyen redes. Los demas buscan trabajo.'},
      {author:'Jordan Adler', text:'Tu negocio crece exactamente a la velocidad a la que tu creces como persona.'},
      {author:'John C. Maxwell', text:'Un lider es grande no por su poder, sino por su habilidad de empoderar a otros.'},
      {author:'Zig Ziglar', text:'Puedes tener todo lo que quieras en la vida si ayudas a suficientes personas a conseguir lo que quieren.'},
      {author:'Tony Robbins', text:'El secreto del exito es aprender a usar el dolor y el placer en lugar de dejar que ellos te usen a ti.'},
      {author:'Napoleon Hill', text:'Lo que la mente puede concebir y creer, lo puede lograr.'},
      {author:'Les Brown', text:'No tienes que ser grande para empezar, pero tienes que empezar para ser grande.'},
      {author:'Grant Cardone', text:'El exito no es un lujo ni un privilegio. El exito es tu deber, obligacion y responsabilidad.'}
    ];

    frases.sort(function() { return Math.random() - 0.5; });

    frases.forEach(function(f) {
      html += '<div style="background:rgba(255,255,255,0.025);border-left:3px solid #C9A84C;border-radius:0 12px 12px 0;padding:14px 16px;margin-bottom:10px;">';
      html += '<div style="font-size:14px;color:#F0EDE6;font-style:italic;line-height:1.5;">"'+f.text+'"</div>';
      html += '<div style="font-size:11px;color:#C9A84C;font-weight:700;margin-top:6px;">— '+f.author+'</div>';
      html += '</div>';
    });

    html += '<button onclick="mentorShareFrase()" style="width:100%;padding:12px;border-radius:10px;background:rgba(201,168,76,0.10);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">📱 Compartir frase al equipo</button>';
  }

  // TOOL: home_meeting
  else if (toolId === 'home_meeting') {
    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;">🏠 Home Meetings</div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Planifica reuniones en casa de tus socios.</div>';

    html += '<input type="text" id="mentor-hm-host" placeholder="Anfitrion (nombre del socio)" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;box-sizing:border-box;">';
    html += '<input type="text" id="mentor-hm-place" placeholder="Lugar / Direccion" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;box-sizing:border-box;">';
    html += '<input type="datetime-local" id="mentor-hm-date" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;box-sizing:border-box;">';
    html += '<input type="number" id="mentor-hm-guests" placeholder="Invitados esperados" min="1" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;box-sizing:border-box;">';
    html += '<button onclick="mentorSaveHomeMeeting()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">💾 Programar Home Meeting</button>';

    var savedHM = JSON.parse(localStorage.getItem('mentor_hm_'+(typeof CU!=='undefined'&&CU?CU.username:'')) || '[]');
    if (savedHM.length > 0) {
      html += '<div style="margin-top:16px;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">PROXIMOS HOME MEETINGS</div>';
      savedHM.forEach(function(hm) {
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:6px;">';
        html += '<div style="font-size:20px;">🏠</div>';
        html += '<div style="flex:1;"><div style="font-size:13px;font-weight:600;color:#fff;">'+_safe(hm.host)+'</div>';
        html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+_safe(hm.place)+' · '+hm.date+' · '+hm.guests+' invitados</div></div>';
        html += '</div>';
      });
    }
  }

  // TOOL: reconocimientos
  else if (toolId === 'reconocimientos') {
    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:16px;">🏆 Reconocimientos</div>';

    var directosRec = members.filter(function(m){return m.level===1;}).sort(function(a,b){return (b.sky_score||0)-(a.sky_score||0);});

    directosRec.slice(0, 10).forEach(function(m) {
      var rk = (typeof RANKS !== 'undefined' && RANKS[m.rank]) ? RANKS[m.rank] : {icon:'👤',name:'Socio'};
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:6px;">';
      html += '<div style="width:36px;height:36px;border-radius:50%;background:rgba(201,168,76,0.1);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#C9A84C;">'+_safe((m.name||'?').substring(0,2).toUpperCase())+'</div>';
      html += '<div style="flex:1;"><div style="font-size:13px;font-weight:600;color:#fff;">'+_safe(m.name||m.username)+'</div>';
      html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+rk.icon+' '+rk.name+' · Score: '+(m.sky_score||0)+'</div></div>';
      html += '<button onclick="mentorCelebrate(\''+_safe(m.name||m.username)+'\')" style="padding:6px 10px;border-radius:8px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:10px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">🎉 Celebrar</button>';
      html += '</div>';
    });
  }

  // DEFAULT: AI-powered tools (scorecard, proyeccion, duplicacion, analisis_red, alertas_pred, onb_buddy, evento_mensual, zoom_semanal, agenda_lider, lenguaje, capacitacion, patrones, plan_lider, resumen, desafios_eq)
  else {
    var toolNames = {
      scorecard:'📊 Scorecard del Lider',proyeccion:'📈 Proyeccion de Rango',duplicacion:'🔄 Reporte de Duplicacion',
      analisis_red:'🔍 Analisis de Red',alertas_pred:'⚠️ Alertas Predictivas',onb_buddy:'🤝 Onboarding Buddy',
      evento_mensual:'🎪 Evento Mensual',zoom_semanal:'💻 Zoom Semanal',agenda_lider:'📋 Agenda de Lider',
      lenguaje:'💬 Lenguaje de Lider',capacitacion:'🎓 Capacitacion Tracker',patrones:'🌟 Patrones de Exito',
      plan_lider:'📝 Plan Semanal',resumen:'📄 Resumen Ejecutivo',desafios_eq:'🏆 Desafios de Equipo'
    };
    var name = toolNames[toolId] || toolId;

    html += '<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:16px;">'+name+'</div>';
    html += '<div id="mentor-ai-result" style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">Cargando analisis...</div>';

    // Auto-fetch AI analysis
    html += '<scr'+'ipt>setTimeout(function(){mentorAIAnalysis("'+toolId+'")},500);<\/scr'+'ipt>';
  }

  return html;
}

function net_total(d) {
  if (d.network && d.network.total_members != null) return d.network.total_members;
  if (d.members) return d.members.length;
  return 0;
}

// ── Mentor helper functions ──

window.stSetMentorTool = function(id) { stState.mentorTool = id; renderSkyTeam(); };

window.mentorSaveGoal = function(key, val) {
  var goals = JSON.parse(localStorage.getItem('mentor_goals_'+(typeof CU!=='undefined'&&CU?CU.username:'')) || '{}');
  goals[key] = parseInt(val) || 0;
  localStorage.setItem('mentor_goals_'+(typeof CU!=='undefined'&&CU?CU.username:''), JSON.stringify(goals));
  if(typeof showToast === 'function') showToast('Meta guardada');
};

window.mentorSetBANK = function(code) {
  var sel = document.getElementById('mentor-bank-member');
  if (!sel || !sel.value) { if(typeof showToast==='function') showToast('Selecciona un socio primero','error'); return; }
  localStorage.setItem('bank_'+sel.value, code);
  if(typeof showToast==='function') showToast('Codigo BANK guardado: '+code);
};

window.mentorSetMood = function(val) {
  var div = document.getElementById('mentor-emocional-response');
  if (!div) return;
  if (val >= 8) {
    div.innerHTML = '<div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.2);border-radius:12px;padding:16px;margin-top:12px;"><div style="font-size:14px;font-weight:700;color:#1D9E75;margin-bottom:8px;">🔥 Excelente energia!</div><div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.5;">Agradece este momento. Gracias a Dios por la vida, la salud, tu familia, y este equipo que confio en ti. Aprovecha esta energia: llama a tus prospectos calientes, agenda cierres, y comparte esa luz con tu equipo. Hay familias que dependen de que tu sigas adelante. ¡Hoy es tu dia! 💪</div></div>';
  } else if (val >= 5) {
    div.innerHTML = '<div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:16px;margin-top:12px;"><div style="font-size:14px;font-weight:700;color:#C9A84C;margin-bottom:8px;">💪 Estas bien, pero hay mas para ti</div><div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.5;">Agradece lo que tienes: vida, salud, un equipo, herramientas que otros desearian tener. Para subir tu energia: escucha un audio de tu lider 10 min, llama a alguien de tu equipo que este ganando, y recuerda POR QUE empezaste este camino. Tu familia y tu equipo necesitan la mejor version de ti. ¡Vamos con todo! 🔥</div></div>';
  } else {
    div.innerHTML = '<div style="background:rgba(127,119,221,0.08);border:1px solid rgba(127,119,221,0.2);border-radius:12px;padding:16px;margin-top:12px;"><div style="font-size:14px;font-weight:700;color:#7F77DD;margin-bottom:8px;">💜 Respira. Todo va a estar bien.</div><div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.5;">Primero: agradece. Tienes vida, tienes salud, tienes un equipo que cree en ti, tienes lideres que construyeron este sistema PARA TI. Muchos desearian estar donde tu estas. Los momentos dificiles son temporales — los resultados de tu esfuerzo son permanentes. Cada gran lider paso por esto y SIGUIO. Ahora cuentame: que te esta quitando energia? Selecciona abajo y trabajemos juntos para resolverlo. No estas solo. 🙏</div></div>';
  }
};

window.mentorHandleBlock = function(blockId) {
  var div = document.getElementById('mentor-emocional-response');
  if (!div) return;

  var responses = {
    rechazo: {title:'El rechazo es redireccionamiento',story:'Agradece cada rechazo — te esta acercando al SI. Oprah Winfrey fue rechazada como presentadora. Steve Jobs fue despedido de su propia empresa. Walt Disney fue rechazado 302 veces para financiar Disneyland. Ellos no pararon. Tu tampoco. Cada NO es un filtro que te acerca a las personas correctas. Tus lideres pasaron por lo mismo y hoy tienen equipos enormes. Este sistema funciona — confia en el proceso.',action:'ACCION AHORA: Llama a 3 personas nuevas HOY. No para vender — para conectar. Tu equipo depende de que sigas. Hay familias que van a cambiar su vida gracias a que TU no te rendiste hoy.'},
    impostor: {title:'Tu ya eres suficiente',story:'Agradece que tienes la valentia de intentar — el 95% de las personas nunca lo hace. Sara Blakely (fundadora de Spanx) vendio fax puerta a puerta antes de crear un imperio. No tenia experiencia en moda. Pero tenia un sistema. TU tienes SKYTEAM, tienes lideres que ya recorrieron el camino, tienes IA que te ayuda. No necesitas ser perfecto — necesitas ser constante. Tus lideres confiaron en ti por algo.',action:'ACCION AHORA: Escribe 3 logros que ya tienes desde que empezaste. Luego abre Sky Sales y genera tu primer contenido de hoy. La accion mata al miedo. Tu equipo te necesita siendo ejemplo.'},
    tiempo: {title:'30 minutos cambian todo',story:'Agradece que tienes este negocio que puedes construir en tus tiempos libres — millones desearian tener esta oportunidad. Dwayne "The Rock" Johnson entrenaba a las 4am mientras trabajaba tiempo completo. 30 minutos al dia son 15 horas al mes. Ese tiempo construye imperios. Tus lideres diseñaron herramientas para que hagas MAS en MENOS tiempo. Usa el Plan Diario — esta hecho para ti.',action:'ACCION AHORA: Abre tu Plan Diario y bloquea 30 minutos AHORA MISMO. 10 min prospectar, 10 min seguimiento, 10 min capacitarte. Si no actuas hoy, manana te sentiras igual pero con un dia menos. Tu equipo esta esperando.'},
    resultados: {title:'Los resultados estan en camino',story:'Agradece el proceso — cada paso cuenta aunque no lo veas. El bambu chino no crece nada durante 5 anos. En el ano 6 crece 25 metros en 6 semanas. Pero durante esos 5 anos estaba creando raices. TU estas creando raices ahora. J.K. Rowling fue rechazada por 12 editoriales antes de Harry Potter. Los resultados son MATEMATICOS: si duplicas las acciones, duplicas los resultados. Confia en tus lideres y en el sistema.',action:'ACCION AHORA: Duplica tu actividad esta semana. Si invitas 3, invita 6. Si agendas 1 cierre, agenda 3. Los numeros no mienten. Hazlo por tu familia, por tu equipo, por las familias que van a cambiar gracias a ti.'},
    equipo: {title:'Tu equipo crece cuando TU creces',story:'Agradece tener un equipo — muchos lideres empezaron completamente solos. John Maxwell dice: "Todo sube y baja por el liderazgo." Tu equipo es tu espejo. Si quieres que prospecten, prospecta tu primero. Si quieres que asistan al Zoom, asiste tu primero. Un mensaje de "como estas?" a un socio vale mas que 10 capacitaciones. Tus lideres te dieron el ejemplo — ahora daselo a tu equipo.',action:'ACCION AHORA: Envia un mensaje PERSONAL (no de negocio) a cada directo. "Hola, como estas? Queria saber de ti." Reconecta como persona. Luego agenda un 1-a-1 con tu directo mas activo. Edificalo. Celebralo. El equipo responde al amor, no a la presion.'},
    motivacion: {title:'La disciplina supera a la motivacion',story:'Agradece estar aqui — muchos ya se rindieron. Kobe Bryant entrenaba a las 4am TODOS los dias, con o sin ganas. No esperaba motivacion — creo habitos. Tu Plan Diario es tu habito. Tus lideres no llegaron donde estan por motivacion — llegaron por disciplina. Y hoy tienen la vida que soñaron. Ese es tu futuro si no paras. "El exito no es un sprint, es un maraton." — Tony Robbins',action:'ACCION AHORA: Escribe tu POR QUE en grande y ponlo donde lo veas cada manana. Luego abre tu Plan Diario y completa UNA sola tarea. Solo una. El movimiento genera motivacion, no al reves. Tu familia cuenta contigo.'},
    pareja: {title:'Tu relacion se fortalece con tu crecimiento',story:'Agradece a tu pareja — esta ahi contigo. Muchos grandes lideres tuvieron momentos de tension en sus relaciones. Jeff Bezos dijo que los primeros anos de Amazon casi destruyen su matrimonio. Pero la vision era mas grande que el problema temporal. Tu pareja tal vez no entiende tu negocio HOY, pero cuando vea los resultados, va a ser tu mayor fan. La clave: NO discutas sobre el negocio. DEMUESTRA con resultados. El amor y el exito no compiten — se complementan. Todo pasa, todo se resuelve. Respira.',action:'ACCION AHORA: Abrazala(o). Dile que la(o) amas. Agradecele por su paciencia. Luego vuelve a enfocarte en tu negocio con MAS energia. Cuando logres tus metas, esa persona va a estar orgullosa de haberte apoyado. Convierte el problema en combustible. Trabaja por tu familia HOY.'},
    dinero: {title:'Esta situacion es EXACTAMENTE por lo que empezaste',story:'Agradece este momento de presion — te esta mostrando POR QUE necesitas este negocio. Sylvester Stallone vendio a su perro por $25 porque no tenia para comer. Meses despues vendio el guion de Rocky y lo primero que hizo fue comprar a su perro de vuelta por $15,000. Los problemas economicos son TEMPORALES. Este negocio es tu solucion, no tu problema. Cada cierre, cada socio nuevo, es un paso hacia tu libertad financiera. Tus lideres pasaron por esto y hoy viven diferente. Tu turno.',action:'ACCION AHORA: La mejor terapia para problemas de dinero es PRODUCIR. Abre Sky Prospects, contacta a tus 3 prospectos mas calientes, y agenda un cierre para esta semana. Un cierre puede cambiar tu mes. No te detengas. Mientras mas rapido actues, mas rapido cambia tu situacion. Tu familia necesita que hoy seas tu mejor version. ¡VAMOS!'}
  };

  var r = responses[blockId] || {title:'Todo tiene solucion',story:'Agradece este momento. Cada desafio es una oportunidad disfrazada. Tienes vida, salud, un equipo, lideres que creen en ti, y herramientas que otros desearian. Todo pasa. Todo se resuelve. La accion es la unica medicina.',action:'ACCION AHORA: Respira profundo 3 veces. Luego abre tu seccion de trabajo y haz UNA sola tarea. El movimiento genera claridad. Tu equipo te necesita. Vamos.'};

  div.innerHTML = '<div style="background:rgba(127,119,221,0.08);border:1px solid rgba(127,119,221,0.15);border-radius:14px;padding:18px;margin-top:12px;">'
    + '<div style="font-size:15px;font-weight:800;color:#7F77DD;margin-bottom:10px;">💜 '+r.title+'</div>'
    + '<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:12px;">'+r.story+'</div>'
    + '<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;"><div style="font-size:10px;color:#C9A84C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Tu accion ahora</div>'
    + '<div style="font-size:12px;color:#F0EDE6;line-height:1.5;">'+r.action+'</div></div></div>';
};

window.mentorSaveHomeMeeting = function() {
  var host = document.getElementById('mentor-hm-host');
  var place = document.getElementById('mentor-hm-place');
  var date = document.getElementById('mentor-hm-date');
  var guests = document.getElementById('mentor-hm-guests');
  if (!host||!host.value||!date||!date.value) { if(typeof showToast==='function') showToast('Completa los campos','error'); return; }
  var saved = JSON.parse(localStorage.getItem('mentor_hm_'+(typeof CU!=='undefined'&&CU?CU.username:'')) || '[]');
  saved.push({host:host.value,place:place?place.value:'',date:date.value,guests:guests?guests.value:'0'});
  localStorage.setItem('mentor_hm_'+(typeof CU!=='undefined'&&CU?CU.username:''), JSON.stringify(saved));
  if(typeof showToast==='function') showToast('🏠 Home Meeting programado');
  stState.mentorTool = 'home_meeting';
  renderSkyTeam();
};

window.mentorCelebrate = function(name) {
  var msg = '🎉🏆 Felicidades ' + name + '! Tu esfuerzo y dedicacion estan dando frutos. Sigue asi, el equipo esta orgulloso de ti! 💪🔥 #SkyTeam #LideresQueInspiran';
  if (navigator.share) {
    navigator.share({title:'Reconocimiento SkyTeam', text:msg}).catch(function(){});
  } else {
    if (navigator.clipboard) navigator.clipboard.writeText(msg);
    if(typeof showToast==='function') showToast('🎉 Mensaje de celebracion copiado');
  }
};

window.mentorShareFrase = function() {
  var frases = document.querySelectorAll('[style*="font-style:italic"]');
  if (frases.length > 0) {
    var random = frases[Math.floor(Math.random()*frases.length)];
    var text = random.textContent + ' #SkyTeam #MotivacionDiaria';
    if (navigator.share) {
      navigator.share({title:'Frase de Poder — SkyTeam', text:text}).catch(function(){});
    } else {
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      if(typeof showToast==='function') showToast('Frase copiada');
    }
  }
};

// AI-powered mentor analysis for tools not manually implemented
window.mentorAIAnalysis = function(toolId) {
  var div = document.getElementById('mentor-ai-result');
  if (!div || !stState.data) return;

  var d = stState.data;
  var members = d.members || [];
  var summary = 'Equipo de ' + (typeof CU!=='undefined'&&CU?CU.name:'Lider') + ': ' + members.length + ' socios. ';
  summary += 'Activos: ' + (d.network?d.network.active_7d:0) + '. ';
  summary += 'Directos: ' + members.filter(function(m){return m.level===1;}).length + '. ';
  summary += 'Top 3: ' + members.slice(0,3).map(function(m){return (m.name||m.username)+' (score:'+m.sky_score+', rango:'+m.rank+')';}).join(', ') + '. ';
  summary += 'Alertas urgentes: ' + (d.alerts?d.alerts.filter(function(a){return a.category==='urgente';}).length:0);

  var prompts = {
    scorecard: 'Genera un scorecard del lider (0-100) evaluando: retencion de equipo, crecimiento mensual, duplicacion, actividad personal. Da la calificacion con explicacion corta de cada area. Formato: lista con puntaje.',
    proyeccion: 'Analiza el equipo y proyecta cuando podria subir de rango el lider. Incluye que necesita lograr (numero de ventas, directos activos, etc). Se especifico con plazos.',
    duplicacion: 'Genera un reporte de duplicacion: que niveles estan duplicando (sus referidos traen gente) y cuales no. Identifica los cuellos de botella y da acciones concretas.',
    analisis_red: 'Analiza la red completa: fortalezas, debilidades, oportunidades. Identifica los socios clave y los que necesitan atencion inmediata. Da 5 recomendaciones accionables.',
    alertas_pred: 'Genera alertas predictivas: quien tiene mayor probabilidad de abandonar, quien esta a punto de subir de rango, que tendencias ves en la actividad del equipo. Se especifico con nombres.',
    onb_buddy: 'Sugiere asignacion de buddies: para cada socio nuevo (registrado en ultimos 14 dias), recomienda un socio experimentado como mentor. Explica por que cada par funciona.',
    evento_mensual: 'Planifica el proximo evento mensual presencial: agenda sugerida (90 min), quien deberia dar testimonio, roles para los directos, meta de asistencia, y mensaje de invitacion.',
    zoom_semanal: 'Prepara la agenda para el zoom semanal del equipo: temas a tratar, quien deberia participar, dinamica sugerida (20 min max por tema). Incluye un mensaje de invitacion para WhatsApp.',
    agenda_lider: 'Genera la rutina semanal ideal para este lider: Lunes a Viernes, que hacer cada dia (30-60 min), enfocado en crecimiento de red. Incluye llamadas, reuniones, capacitacion, contenido.',
    lenguaje: 'Genera 5 mensajes ejemplo para diferentes situaciones de liderazgo: motivar al equipo, corregir sin desmotivar, celebrar un logro, presionar resultados, reactivar un inactivo. Tono profesional pero cercano.',
    capacitacion: 'Analiza que socios del equipo han completado el onboarding y cuales no. Genera un plan de capacitacion: que modulos priorizar, como hacer seguimiento, y mensaje para enviar a los que estan atrasados.',
    patrones: 'Analiza los patrones de exito del equipo: que tienen en comun los socios top (actividad, velocidad de onboarding, tipo de prospectos). Contrasta con los que no avanzan. Da 3 conclusiones accionables.',
    plan_lider: 'Genera el plan de accion de esta semana para el lider: 5 acciones prioritarias con nombres especificos del equipo. Incluye quien contactar, que decir, y que resultado esperar.',
    resumen: 'Genera el resumen ejecutivo semanal: metricas clave, logros destacados, areas de mejora, proyeccion para la proxima semana. Formato: 5 secciones cortas.',
    desafios_eq: 'Crea 3 desafios gamificados para el equipo esta semana: nombre creativo, descripcion, meta, premio/reconocimiento. Enfocados en prospectar, cerrar, y capacitarse.'
  };

  var prompt = prompts[toolId] || 'Analiza el equipo y da recomendaciones para mejorar.';

  if (typeof _skyFetch === 'function') {
    _skyFetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: 'Eres un mentor experto en network marketing y liderazgo de equipos. Respondes en espanol. Eres directo, motivador, y das acciones concretas con nombres cuando los tienes. Usa formato con emojis y puntos clave. NO uses markdown.',
        messages: [{ role: 'user', content: summary + '\n\nTarea: ' + prompt }]
      })
    }).then(function(r){return r.json()}).then(function(data) {
      var text = data.content && data.content[0] ? data.content[0].text : 'No se pudo generar el analisis.';
      div.innerHTML = '<div style="font-size:13px;color:#F0EDE6;line-height:1.6;white-space:pre-wrap;">'+_safe(text)+'</div>';
    }).catch(function() {
      div.innerHTML = '<div style="color:#E24B4A;font-size:12px;">Error conectando con IA. Intenta de nuevo.</div>';
    });
  } else {
    div.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:12px;">Funcion de IA no disponible.</div>';
  }
};


// ═══════════════════════════════════════════════════════════════
//  MENTOR IA CHAT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

var _mentorVoiceRec = null;

window.mentorSendChat = function(presetText) {
  var input = document.getElementById('mentor-chat-input');
  var text = presetText || (input ? input.value.trim() : '');
  if (!text) return;

  // Stop voice if recording
  if (_mentorVoiceRec) { var r = _mentorVoiceRec; _mentorVoiceRec = null; r.stop(); var mb = document.getElementById('mentor-mic-btn'); if(mb){mb.style.background='rgba(255,255,255,0.06)';mb.style.borderColor='rgba(255,255,255,0.10)';mb.innerHTML='🎤';} }

  // Initialize chat array if needed
  if (!stState.mentorChat) stState.mentorChat = [];

  // Add user message
  stState.mentorChat.push({ role: 'user', text: text });

  // Clear input
  if (input) input.value = '';

  // Re-render to show user message
  renderSkyTeam();

  // Show typing indicator
  setTimeout(function() {
    var area = document.getElementById('mentor-chat-area');
    if (area) {
      area.innerHTML += '<div id="mentor-typing" style="display:flex;gap:10px;margin-bottom:14px;"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7F77DD,#C9A84C);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🧠</div><div style="background:rgba(127,119,221,0.06);border:1px solid rgba(127,119,221,0.12);border-radius:4px 16px 16px 16px;padding:12px 20px;"><div style="display:flex;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.3);animation:mentorDot 1.4s infinite;animation-delay:0s;"></span><span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.3);animation:mentorDot 1.4s infinite;animation-delay:0.2s;"></span><span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.3);animation:mentorDot 1.4s infinite;animation-delay:0.4s;"></span></div></div></div>';
      area.scrollTop = area.scrollHeight;
    }
  }, 100);

  // Build RICH context from team data + CRM + agenda + BANK
  var d = stState.data;
  var context = '';
  if (d && d.members) {
    context = 'RED: ' + d.members.length + ' socios. Activos: ' + (d.network ? d.network.active_7d : 0) + '. Nuevos mes: ' + (d.network ? d.network.new_this_month : 0) + '.\n';

    // Detailed info per DIRECT member (level 1)
    var directos = d.members.filter(function(m){return m.level===1;});
    if (directos.length > 0) {
      context += 'DIRECTOS (' + directos.length + '):\n';
      directos.forEach(function(m) {
        var bankCode = localStorage.getItem('bank_' + (m.username || m.ref)) || 'sin asignar';
        var bday = m.birthday || localStorage.getItem('skyteam_birthday_' + m.username) || '';
        var bdayStr = '';
        if (bday) {
          var parts = bday.split('-');
          var meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
          bdayStr = parseInt(parts[2]) + ' ' + meses[parseInt(parts[1])];
          // Check if birthday is within next 7 days
          var today = new Date();
          var bdayThisYear = new Date(today.getFullYear(), parseInt(parts[1])-1, parseInt(parts[2]));
          var daysUntilBday = Math.ceil((bdayThisYear - today) / 86400000);
          if (daysUntilBday >= 0 && daysUntilBday <= 7) bdayStr += ' (CUMPLE EN ' + daysUntilBday + ' DIAS!)';
        }
        var rk = (typeof RANKS !== 'undefined' && RANKS[m.rank]) ? RANKS[m.rank].name : 'R'+m.rank;
        var hasLanding = m.ref ? 'SI' : 'NO';
        context += '- ' + (m.name||m.username) + ': ' + rk + ', score:' + (m.sky_score||0) + ', dias:' + (m.days_remaining||'?') + ', estado:' + (m.status||'?');
        // Prospect breakdown by stage
        var etapas = m.prospectos_por_etapa || {};
        var prospDetail = 'prospectos:' + (m.prospectos_count||0) + '(';
        if (etapas.nuevo) prospDetail += 'nuevos:'+etapas.nuevo+',';
        if (etapas.contactado) prospDetail += 'contactados:'+etapas.contactado+',';
        if (etapas.interesado) prospDetail += 'interesados:'+etapas.interesado+',';
        if (etapas.presentacion) prospDetail += 'presentacion:'+etapas.presentacion+',';
        if (etapas.seguimiento) prospDetail += 'seguimiento:'+etapas.seguimiento+',';
        if (etapas.cerrado_ganado) prospDetail += 'CERRADOS:'+etapas.cerrado_ganado+',';
        if (etapas.cerrado_perdido) prospDetail += 'perdidos:'+etapas.cerrado_perdido+',';
        prospDetail = prospDetail.replace(/,$/, '') + ')';
        context += ', ' + prospDetail + ', citas:' + (m.bookings_count||0) + ', onboarding:dia' + (m.onboarding_day||0) + '/7';
        context += ', racha:' + (m.streak_current||0) + 'd, xp:' + (m.xp||0) + ', ventas:' + (m.ventas||0);
        context += ', landing:' + hasLanding + ', BANK:' + bankCode;
        if (bdayStr) context += ', cumple:' + bdayStr;
        context += '\n';
      });
    }

    // Summary of deeper levels
    var nivel2 = d.members.filter(function(m){return m.level===2;});
    var nivel3plus = d.members.filter(function(m){return m.level>=3;});
    if (nivel2.length > 0) context += 'NIVEL 2: ' + nivel2.length + ' socios (activos:' + nivel2.filter(function(m){return m.status==='active';}).length + ').\n';
    if (nivel3plus.length > 0) context += 'NIVELES 3-10: ' + nivel3plus.length + ' socios.\n';

    // Alerts
    var urgentes = (d.alerts||[]).filter(function(a){return a.category==='urgente';});
    var atencion = (d.alerts||[]).filter(function(a){return a.category==='atencion';});
    if (urgentes.length > 0) context += 'URGENTES: ' + urgentes.slice(0,5).map(function(a){return a.message;}).join('; ') + '\n';
    if (atencion.length > 0) context += 'ATENCION: ' + atencion.slice(0,3).map(function(a){return a.message;}).join('; ') + '\n';
  }
  // CRM data
  if (typeof crmProspectos !== 'undefined' && crmProspectos) {
    var activos = crmProspectos.filter(function(p){return p.etapa!=='cerrado_ganado'&&p.etapa!=='cerrado_perdido';});
    var calientes = activos.filter(function(p){return (p.temperatura||0)>=70;});
    context += 'CRM: ' + crmProspectos.length + ' prospectos (' + activos.length + ' activos, ' + calientes.length + ' calientes).\n';
  }
  if (CU) context += 'LIDER: ' + CU.name + ', rango ' + CU.rank + ', usuario ' + CU.username + '.\n';

  // Build conversation for AI
  var messages = [];
  stState.mentorChat.forEach(function(m) {
    messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
  });

  var systemPrompt = 'Eres el Mentor IA de SKYTEAM — un coach de liderazgo experto en network marketing. Tu nombre es Mentor. Respondes en español, eres cercano, motivador, directo y siempre orientado a la ACCION.\n\n'
    + 'REGLAS CRITICAS:\n'
    + '- SIEMPRE orienta hacia la retencion, la accion y el crecimiento\n'
    + '- NUNCA sugieras dejar el negocio, tomarse un break, o culpar a lideres\n'
    + '- Edifica SIEMPRE a los lideres del equipo y al sistema SKYTEAM\n'
    + '- Incluye gratitud (Dios, vida, familia, lideres, equipo, sistema)\n'
    + '- Usa nombres REALES del equipo — tienes los datos de cada socio\n'
    + '- Si preguntan sobre emociones/pareja/dinero: empatia + accion rapida + historias de exito\n'
    + '- Cuenta historias de lideres famosos cuando sea relevante\n'
    + '- Cada 3-4 mensajes menciona UNA capacidad tuya de forma natural\n\n'
    + 'COMO ANALIZAR SOCIOS:\n'
    + '- Cada socio tiene: rango, score, dias restantes, prospectos, citas, onboarding, racha, landing, Codigo BANK\n'
    + '- Si el BANK es "B" (Blueprint): hablarle con datos y estructura\n'
    + '- Si el BANK es "A" (Action): hablarle de resultados rapidos y desafios\n'
    + '- Si el BANK es "N" (Nurturing): hablarle de impacto emocional y relaciones\n'
    + '- Si el BANK es "K" (Knowledge): hablarle con logica y numeros\n'
    + '- Si no tiene BANK asignado, sugiere al lider que lo perfilen\n'
    + '- Si un socio tiene onboarding dia 0-1 despues de 7 dias: URGENTE que lo guien\n'
    + '- Si un socio no tiene prospectos: necesita ayuda con su lista de contactos\n'
    + '- Si no creo landing (ref): necesita activar Sky Sales\n'
    + '- Si tiene cumpleaños pronto: recordar al lider que lo celebre\n'
    + '- Los CLIENTES (rango 0) necesitan enfoque en educacion y rutas de aprendizaje\n'
    + '- Los socios con membresia por vencer necesitan renovar URGENTE\n\n'
    + 'TUS CAPACIDADES:\n'
    + 'Analizar red, Codigo BANK, Zoom semanal, Home Meetings, Proyeccion rango, Plan semanal, '
    + 'Coach emocional, Frases de poder, Reconocimientos, Duplicacion, Scorecard, Metas, Desafios, '
    + 'Preparar mensajes segun personalidad, Planificar eventos, Rutina de lider\n\n'
    + 'DATOS DEL EQUIPO:\n' + context + '\n'
    + 'Responde conciso (max 3-4 parrafos). Emojis moderados. NO uses markdown. Cuando des consejo sobre un socio especifico, adapta el tono segun su Codigo BANK.';

  // Call AI
  if (typeof _skyFetch === 'function') {
    _skyFetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      var responseText = data.content && data.content[0] ? data.content[0].text : 'Disculpa, no pude procesar tu mensaje. Intenta de nuevo.';
      stState.mentorChat.push({ role: 'mentor', text: responseText });
      renderSkyTeam();
      // Scroll to bottom after render
      setTimeout(function() {
        var area = document.getElementById('mentor-chat-area');
        if (area) area.scrollTop = area.scrollHeight;
      }, 100);
    }).catch(function(err) {
      stState.mentorChat.push({ role: 'mentor', text: 'Error de conexion. Verifica tu internet e intenta de nuevo. 🙏' });
      renderSkyTeam();
    });
  }
};

window.mentorToggleVoice = function() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    if(typeof showToast === 'function') showToast('Tu navegador no soporta voz','error');
    return;
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var btn = document.getElementById('mentor-mic-btn');

  if (_mentorVoiceRec) {
    var rec = _mentorVoiceRec;
    _mentorVoiceRec = null;
    rec.stop();
    if(btn) { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.10)'; btn.innerHTML = '🎤'; }
    // Auto-send on stop
    var input = document.getElementById('mentor-chat-input');
    if(input && input.value.trim()) mentorSendChat();
    return;
  }

  _mentorVoiceRec = new SR();
  _mentorVoiceRec.lang = 'es-MX';
  _mentorVoiceRec.continuous = true;
  _mentorVoiceRec.interimResults = true;

  if(btn) { btn.style.background = 'rgba(220,38,38,0.2)'; btn.style.borderColor = 'rgba(220,38,38,0.4)'; btn.innerHTML = '🔴'; }

  _mentorVoiceRec.onresult = function(e) {
    var transcript = '';
    for(var i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    var input = document.getElementById('mentor-chat-input');
    if(input) input.value = transcript;
  };

  _mentorVoiceRec.onend = function() {
    // If user didn't press stop, keep listening (continuous mode)
    if (_mentorVoiceRec) {
      try { _mentorVoiceRec.start(); } catch(e) {
        if(btn) { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.10)'; btn.innerHTML = '🎤'; }
        _mentorVoiceRec = null;
      }
      return;
    }
    if(btn) { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.10)'; btn.innerHTML = '🎤'; }
  };

  _mentorVoiceRec.start();
};


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
  html += '<div class="st-detail-stat-val" style="color:' + _statusColor(status) + ';">' + _statusLabel(status) + '</div>';
  html += '<div class="st-detail-stat-label">' + _memberActivityLabel(m) + '</div>';
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
