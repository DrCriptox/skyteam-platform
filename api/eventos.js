// api/eventos.js - Sky TV: Events API + Zoom SDK Signature
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY || '';
const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET || '';
const crypto = require('crypto');

function generateZoomSignature(mn, role) {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const h = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = base64url(JSON.stringify({ sdkKey: ZOOM_SDK_KEY, mn: String(mn), role, iat, exp, tokenExp: exp }));
  return h + '.' + p + '.' + crypto.createHmac('sha256', ZOOM_SDK_SECRET).update(h+'.'+p).digest('base64url');
}
function base64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const SB = (u,o={}) => fetch(SUPABASE_URL+'/rest/v1/'+u, {...o, headers: {apikey:SUPABASE_SERVICE_KEY, Authorization:'Bearer '+SUPABASE_SERVICE_KEY, 'Content-Type':'application/json', Prefer:'return=representation', ...(o.headers||{})}});
  const { action } = req.query;
  const _adminCache = {};
  const isAdmin = async (u) => {
    if (!u) return false;
    const k = u.toLowerCase();
    if (_adminCache[k] !== undefined) return _adminCache[k];
    // Fallback hardcoded for safety + DB check
    if (['yonfer','admin','dryonfer','legend'].includes(k)) { _adminCache[k] = true; return true; }
    try { const r = await SB('users?username=eq.'+encodeURIComponent(k)+'&select=is_admin&limit=1'); const d = await r.json(); _adminCache[k] = !!(d && d[0] && d[0].is_admin); } catch(e) { _adminCache[k] = false; }
    return _adminCache[k];
  };
  try {
    if (action==='list') {
      // Auto-cleanup: delete events older than 6 days (flyer images included)
      var sixDaysAgo = new Date(Date.now() - 6*86400000).toISOString().split('T')[0];
      try { await SB('eventos_equipo?fecha=lt.'+sixDaysAgo, {method:'DELETE'}); } catch(e){}
      const {desde,hasta,categoria}=req.query; let u='eventos_equipo?select=*&order=fecha.asc,hora_inicio.asc'; if(desde)u+='&fecha=gte.'+desde; if(hasta)u+='&fecha=lte.'+hasta; if(categoria&&categoria!=='todos')u+='&categoria=eq.'+categoria; return res.status(200).json({ok:true,eventos:await(await SB(u)).json()});
    }
    if (action==='get') { const d=await(await SB('eventos_equipo?id=eq.'+req.query.id)).json(); return res.status(200).json({ok:true,evento:d[0]||null}); }
    if (action==='create'&&req.method==='POST') { const b=req.body; if(!b.created_by)return res.status(400).json({ok:false,error:'created_by required'}); if(!await isAdmin(b.created_by))return res.status(403).json({ok:false,error:'Solo admins r7-r8'}); const d=await(await SB('eventos_equipo',{method:'POST',body:JSON.stringify({titulo:b.titulo,descripcion:b.descripcion||'',categoria:b.categoria||'capacitacion',fecha:b.fecha,hora_inicio:b.hora_inicio,hora_fin:b.hora_fin,zoom_meeting_id:b.zoom_meeting_id||'',zoom_password:b.zoom_password||'',zoom_link:b.zoom_link||'',flyer_url:b.flyer_url||'',grabacion_url:b.grabacion_url||'',recurrente:b.recurrente||false,recurrencia_tipo:b.recurrencia_tipo||'',recurrencia_dias:b.recurrencia_dias||'',host_nombre:b.host_nombre||'',host_rango:b.host_rango||'',en_vivo:false,created_by:b.created_by})})).json(); return res.status(201).json({ok:true,evento:d[0]}); }
    if (action==='update'&&req.method==='PUT') { const b=req.body; if(!b.id||!b.username)return res.status(400).json({ok:false,error:'id+username required'}); if(!await isAdmin(b.username))return res.status(403).json({ok:false,error:'Solo admins'}); const u={}; ['titulo','descripcion','categoria','fecha','hora_inicio','hora_fin','zoom_meeting_id','zoom_password','zoom_link','flyer_url','grabacion_url','recurrente','recurrencia_tipo','recurrencia_dias','host_nombre','host_rango','en_vivo'].forEach(f=>{if(b[f]!==undefined)u[f]=b[f]}); u.updated_at=new Date().toISOString(); const d=await(await SB('eventos_equipo?id=eq.'+b.id,{method:'PATCH',body:JSON.stringify(u)})).json(); return res.status(200).json({ok:true,evento:d[0]}); }
    if (action==='delete'&&req.method==='DELETE') { const{id,username}=req.query; if(!id||!username)return res.status(400).json({ok:false,error:'id+username required'}); if(!await isAdmin(username))return res.status(403).json({ok:false,error:'Solo admins'}); await SB('eventos_equipo?id=eq.'+id,{method:'DELETE'}); return res.status(200).json({ok:true}); }
    if (action==='toggle_live'&&req.method==='POST') { const{id,en_vivo,username}=req.body; if(!await isAdmin(username))return res.status(403).json({ok:false,error:'Solo admins'}); await SB('eventos_equipo?id=eq.'+id,{method:'PATCH',body:JSON.stringify({en_vivo:!!en_vivo,updated_at:new Date().toISOString()})}); return res.status(200).json({ok:true,en_vivo:!!en_vivo}); }
    if (action==='zoom_signature'&&req.method==='POST') { const{meetingNumber,role}=req.body; if(!meetingNumber)return res.status(400).json({ok:false,error:'meetingNumber required'}); return res.status(200).json({ok:true,signature:generateZoomSignature(meetingNumber,role||0),sdkKey:ZOOM_SDK_KEY}); }
    return res.status(400).json({ok:false,error:'Unknown action: '+action});
  } catch(err) { return res.status(500).json({ok:false,error:err.message}); }
};
