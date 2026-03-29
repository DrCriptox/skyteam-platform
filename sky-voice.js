// === SKY VOICE MIC SYSTEM ===
// Adds voice recording buttons to all AI textareas
// Supports: tap to start/stop + long-press (hold to talk)
// Uses Web Speech API (SpeechRecognition) for transcription
(function(){
var micCSS=document.createElement('style');
micCSS.textContent='.sky-mic-btn{width:36px;height:36px;min-width:36px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;position:relative;vertical-align:bottom;margin-left:6px;}.sky-mic-btn:hover{background:rgba(255,60,60,0.15);border-color:rgba(255,60,60,0.3);}.sky-mic-btn.recording{background:rgba(255,40,40,0.25);border-color:rgba(255,40,40,0.6);animation:skyMicPulse 1s ease-in-out infinite;}.sky-mic-btn .mic-icon{font-size:16px;line-height:1;}.sky-mic-btn.recording .mic-icon{display:none;}.sky-mic-btn .stop-icon{width:14px;height:14px;background:#ff3333;border-radius:3px;display:none;}.sky-mic-btn.recording .stop-icon{display:block;}@keyframes skyMicPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,40,40,0.4);}50%{box-shadow:0 0 0 8px rgba(255,40,40,0);}}';
document.head.appendChild(micCSS);
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SR){console.warn('SkyVoice: SpeechRecognition not supported');return;}
function skyMic(targetId,opts){
  opts=opts||{};
  var target=document.getElementById(targetId);
  if(!target)return null;
  if(target.dataset.skyMic)return null;
  target.dataset.skyMic='1';
  var btn=document.createElement('button');
  btn.type='button';btn.className='sky-mic-btn';
  btn.title='Micr\u00f3fono: tap para iniciar/parar, mantener presionado para hablar';
  var sp=document.createElement('span');sp.className='mic-icon';sp.textContent='\uD83C\uDF99\uFE0F';
  var sd=document.createElement('div');sd.className='stop-icon';
  btn.appendChild(sp);btn.appendChild(sd);
  var rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang='es-ES';
  var isRec=false,lpTimer=null,isLP=false,buffer='';
  rec.onresult=function(e){
    var final='',interim='';
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal)final+=e.results[i][0].transcript;
      else interim+=e.results[i][0].transcript;
    }
    if(final){
      var cur=target.value;
      target.value=cur+(cur&&!cur.endsWith(' ')?  ' ':'')+final.trim();
      target.dispatchEvent(new Event('input',{bubbles:true}));
      buffer+=final;
    }
  };
  rec.onerror=function(e){
    stopRec();
    if(e.error!=='aborted'&&e.error!=='no-speech'){
      if(typeof crmToast==='function')crmToast('Error mic: '+e.error,'error');
    }
  };
  rec.onend=function(){if(isRec){try{rec.start();}catch(x){stopRec();}}};
  function startRec(){
    if(isRec)return;isRec=true;buffer='';
    btn.classList.add('recording');
    try{rec.start();}catch(x){isRec=false;btn.classList.remove('recording');}
  }
  function stopRec(){
    isRec=false;btn.classList.remove('recording');
    try{rec.stop();}catch(x){}
    if(isLP&&buffer.trim()&&opts.autoSend){
      setTimeout(function(){if(typeof opts.autoSend==='function')opts.autoSend();},300);
    }
    isLP=false;
  }
  btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();
    if(lpTimer){lpTimer=null;return;}
    if(isRec)stopRec();else startRec();
  });
  btn.addEventListener('mousedown',function(e){e.preventDefault();
    lpTimer=setTimeout(function(){isLP=true;lpTimer=null;startRec();},500);
  });
  btn.addEventListener('mouseup',function(){if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}if(isLP&&isRec)stopRec();});
  btn.addEventListener('mouseleave',function(){if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}if(isLP&&isRec)stopRec();});
  btn.addEventListener('touchstart',function(e){e.preventDefault();
    lpTimer=setTimeout(function(){isLP=true;lpTimer=null;startRec();},500);
  },{passive:false});
  btn.addEventListener('touchend',function(e){e.preventDefault();
    if(lpTimer){clearTimeout(lpTimer);lpTimer=null;if(!isRec)startRec();else stopRec();}
    else if(isLP&&isRec)stopRec();
  },{passive:false});
  if(opts.insertAfter){
    var ref=document.getElementById(opts.insertAfter);
    if(ref&&ref.parentElement)ref.parentElement.insertBefore(btn,ref.nextSibling);
    else target.parentElement.appendChild(btn);
  }else{target.parentElement.appendChild(btn);}
  return btn;
}
window.skyMicInit=function(){
  skyMic('agente-input',{insertAfter:'agente-send-btn',autoSend:function(){var b=document.getElementById('agente-send-btn');if(b)b.click();}});
  skyMic('crm-interaction-texto');
  skyMic('crm-wa-context');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',window.skyMicInit);
else window.skyMicInit();
})();
