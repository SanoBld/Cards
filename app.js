'use strict';
/* ============================================================
   Cards v4 — app.js
   Grand public · Confettis · Shake · TTS · Direction · Levenshtein
   Révision Intelligente (SM-2) · Examen Blanc · Duel · Sync
============================================================ */

/* ═══════ STORAGE ═══════ */
const LS = {
  g:(k,d=null)=>{ try{const v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch{return d;} },
  s:(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
  d:(k)=>{ try{localStorage.removeItem(k);}catch{} }
};

let S = {
  decks:   LS.g('cards_decks', []),
  stats:   LS.g('cards_stats', {streak:0,lastDay:'',sessions:0,total:0,learned:0,daily:{}}),
  session: LS.g('cards_sess', null),
  theme:   LS.g('cards_theme', 'auto')
};
if (!S.stats.daily) S.stats.daily = {};

function save() {
  LS.s('cards_decks', S.decks);
  LS.s('cards_stats', S.stats);
  if (S.session) LS.s('cards_sess', S.session);
  else LS.d('cards_sess');
}

/* Migration depuis mc3_ keys */
(()=>{
  const old = LS.g('mc3_decks', null);
  if (old && !S.decks.length) { S.decks = old; save(); }
})();

/* ═══════ THÈME ═══════ */
function applyTheme(t) {
  const dark = t==='dark' || (t==='auto' && window.matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const ico=document.getElementById('tico'), lbl=document.getElementById('tlbl');
  if(ico) ico.textContent = dark ? '☀️' : '🌙';
  if(lbl) lbl.textContent = dark ? 'Mode clair' : 'Mode sombre';
}
function toggleTheme() {
  S.theme = S.theme==='dark' ? 'light' : 'dark';
  LS.s('cards_theme', S.theme);
  applyTheme(S.theme);
}
window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', ()=>{ if(S.theme==='auto') applyTheme('auto'); });
applyTheme(S.theme);

/* ═══════ NAVIGATION ═══════ */
let CUR = 'accueil';
function navigate(pg) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById('pg-'+pg);
  if(target) target.classList.add('active');
  document.querySelectorAll('[data-pg]').forEach(b=>b.classList.toggle('active', b.dataset.pg===pg));
  CUR = pg;
  const ej = document.getElementById('emjbar');
  if(ej) ej.classList.toggle('show', pg==='online');
  if(pg==='accueil')   { renderHome(); renderActivityChart(); }
  if(pg==='apprendre') { renderLearnSetup(); }
  if(pg==='cards')     { renderDeckMgr(); refreshImports(); }
}
document.querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.pg)));

/* ═══════ TOAST ═══════ */
function toast(msg, ico='✅', dur=3000) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${ico}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 350); }, dur);
}

/* ═══════ MODAL ═══════ */
function openModal(h) { document.getElementById('mbox').innerHTML=h; document.getElementById('overlay').classList.remove('hidden'); }
function closeModal()  { document.getElementById('overlay').classList.add('hidden'); }
function closeMO(e)    { if(e.target===document.getElementById('overlay')) closeModal(); }
function esc(s)        { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ═══════ UTILS ═══════ */
function shuf(a)       { return [...a].sort(()=>Math.random()-.5); }
function normalize(s)  { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }

/* Distance de Levenshtein pour correction flexible */
function levenshtein(a, b) {
  const m=a.length, n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function checkAns(inp, exp, opts={}) {
  if(opts.strict) return inp.trim()===exp.trim();
  const ni=normalize(inp), ne=normalize(exp);
  if(ni===ne) return true;
  /* Correction flexible : 1 faute tolérée si mot > 5 lettres */
  if(opts.flexible) {
    const maxErr = ne.length>8 ? 2 : ne.length>4 ? 1 : 0;
    return levenshtein(ni, ne) <= maxErr;
  }
  return false;
}

/* ═══════ CONFETTI ═══════ */
const CONFETTI_COLORS = ['#7C6FCD','#E87E9F','#3DBE7A','#F09240','#5BC8F5','#FFD166'];
function burstConfetti(x, y) {
  for(let i=0; i<22; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left:${x - 20 + Math.random()*40}px;
      top:${y - 20 + Math.random()*40}px;
      background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};
      transform-origin:center;
      animation-delay:${Math.random()*0.15}s;
      animation-duration:${0.9+Math.random()*0.5}s;
    `;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1600);
  }
}
function showCheckmark() {
  const ov = document.createElement('div');
  ov.className = 'check-overlay';
  ov.innerHTML = '<div class="check-circle">✓</div>';
  document.body.appendChild(ov);
  setTimeout(()=>ov.remove(), 500);
}
function celebrateCorrect(event) {
  const x = event?.clientX ?? window.innerWidth/2;
  const y = event?.clientY ?? window.innerHeight/2;
  burstConfetti(x, y);
  showCheckmark();
}
function shakeEl(id) {
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; /* force reflow */
  el.classList.add('shake');
}

/* ═══════ TTS ═══════ */
let ttsVoices = [];
if(window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = ()=>{ ttsVoices = window.speechSynthesis.getVoices(); };
  ttsVoices = window.speechSynthesis.getVoices();
}
function speak(text, langHint) {
  if(!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  /* Auto-détect langue */
  const sel = document.getElementById('voiceSel');
  if(sel && sel.value) {
    const v = ttsVoices.find(x=>x.name===sel.value);
    if(v){ utt.voice=v; utt.lang=v.lang; }
    else utt.lang = sel.value;
  } else if(langHint) {
    utt.lang = langHint;
  } else {
    const nonAscii = (text.match(/[^\x00-\x7F]/g)||[]).length;
    utt.lang = nonAscii/text.length > .12 ? 'fr-FR' : 'en-US';
  }
  utt.rate = 0.88;
  window.speechSynthesis.speak(utt);
}
function getVoiceOptions() {
  const vs = ttsVoices.length ? ttsVoices : [];
  if(!vs.length) return '<option value="fr-FR">🇫🇷 Français</option><option value="en-US">🇺🇸 English</option>';
  return vs.map(v=>`<option value="${esc(v.name)}">${v.name} (${v.lang})</option>`).join('');
}
function speakCardTTS(text, btnId) {
  const btn = document.getElementById(btnId);
  if(btn) btn.classList.add('spk');
  const utt = new SpeechSynthesisUtterance(text);
  const sel = document.getElementById('voiceSel');
  if(sel && sel.value) {
    const v = ttsVoices.find(x=>x.name===sel.value);
    if(v){ utt.voice=v; utt.lang=v.lang; } else utt.lang=sel.value;
  } else {
    const nonAscii=(text.match(/[^\x00-\x7F]/g)||[]).length;
    utt.lang = nonAscii/text.length>.12?'fr-FR':'en-US';
  }
  utt.rate=0.88;
  utt.onend=()=>{ if(btn) btn.classList.remove('spk'); };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

/* ═══════ STATS ═══════ */
function recalc() {
  let t=0, l=0;
  S.decks.forEach(d=>{ t+=d.cards.length; l+=d.cards.filter(c=>c.correct>=3).length; });
  S.stats.total=t; S.stats.learned=l;
}
function bumpStreak() {
  const td = new Date().toDateString();
  if(S.stats.lastDay===td) return;
  const yd = new Date(Date.now()-864e5).toDateString();
  S.stats.streak = S.stats.lastDay===yd ? (S.stats.streak||0)+1 : 1;
  S.stats.lastDay = td;
  S.stats.sessions = (S.stats.sessions||0)+1;
  save();
}
function bumpDaily(n=1) {
  const k = new Date().toISOString().slice(0,10);
  if(!S.stats.daily) S.stats.daily={};
  S.stats.daily[k] = (S.stats.daily[k]||0)+n;
}

/* ═══════ ACCUEIL ═══════ */
let activityChartInst = null;
function renderHome() {
  recalc();
  const el = id => document.getElementById(id);
  if(el('todayDate')) el('todayDate').textContent = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  if(el('streakNum')) el('streakNum').textContent = S.stats.streak||0;
  if(el('stTotal'))   el('stTotal').textContent   = S.stats.total||0;
  if(el('stLearned')) el('stLearned').textContent = S.stats.learned||0;
  if(el('stSess'))    el('stSess').textContent    = S.stats.sessions||0;

  /* Points de la semaine */
  const wd=el('weekDots'); if(wd){ wd.innerHTML=''; const DS=['L','M','M','J','V','S','D'], td=new Date().getDay();
    DS.forEach((d,i)=>{ const e=document.createElement('div'), idx=(i+1)%7; e.className='wd'+(idx===td?' today':(i<(td===0?6:td-1)?' done':'')); e.textContent=d; wd.appendChild(e); }); }

  const dl=el('homeDecks'), em=el('homeEmpty');
  if(dl && em) {
    if(!S.decks.length){ dl.innerHTML=''; em.style.display='block'; }
    else {
      em.style.display='none';
      dl.innerHTML=S.decks.map(d=>{
        const tot=d.cards.length, done=d.cards.filter(c=>c.correct>=3).length, pct=tot?Math.round(done/tot*100):0;
        return `<div class="drow" onclick="navigate('apprendre')">
          <div class="dico" style="background:${d.color||'var(--vip)'}">${d.icon}</div>
          <div class="dnfo"><div class="dname">${esc(d.name)}</div>
          <div class="dmeta">${tot} carte${tot!==1?'s':''} · ${pct}% maîtrisé</div></div>
          <div style="width:70px;flex-shrink:0"><div class="pb"><div class="pf" style="width:${pct}%"></div></div></div>
        </div>`;
      }).join('');
    }
  }

  const ra=el('resumeArea');
  if(ra) {
    if(S.session&&S.session.queue&&S.session.queue.length>0) {
      ra.style.display='block';
      const dk=S.decks.find(d=>d.id===S.session.deckId);
      if(el('resumeInfo')) el('resumeInfo').textContent=`${dk?dk.name:'Paquet'} · ${modeLabel(S.session.mode)} · ${S.session.queue.length} carte(s) restante(s)`;
    } else { if(S.session){S.session=null;save();} ra.style.display='none'; }
  }
}

function renderActivityChart() {
  const canvas = document.getElementById('activityChart');
  if(!canvas || typeof Chart === 'undefined') return;
  const labels=[], data=[];
  for(let i=29; i>=0; i--) {
    const d=new Date(Date.now()-i*86400000), k=d.toISOString().slice(0,10);
    labels.push(i===0?'Auj.':i===1?'Hier':d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'}));
    data.push((S.stats.daily||{})[k]||0);
  }
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const gridC = isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';
  const txtC  = isDark?'#9490B4':'#9B98B8';
  if(activityChartInst) activityChartInst.destroy();
  activityChartInst = new Chart(canvas, {
    type:'bar',
    data:{ labels, datasets:[{ data,
      backgroundColor:data.map(v=>v>0?'rgba(124,111,205,.78)':'rgba(124,111,205,.12)'),
      borderColor:data.map(v=>v>0?'#7C6FCD':'transparent'),
      borderWidth:1, borderRadius:5, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>`${ctx.parsed.y} carte${ctx.parsed.y!==1?'s':''} révisée${ctx.parsed.y!==1?'s':''}`}} },
      scales:{ x:{grid:{color:gridC},ticks:{color:txtC,maxTicksLimit:8,font:{size:10}}},
               y:{grid:{color:gridC},ticks:{color:txtC,stepSize:1,font:{size:10}},beginAtZero:true} } }
  });
}

function modeLabel(m) {
  return {flashcard:'Cartes',write:'Écriture',qcm:'Quiz',match:'Association',dictee:'Dictée',srs:'Révision Intelligente',exam:'Test',duel:'Duel'}[m]||m;
}

/* ═══════ GESTION DES PAQUETS ═══════ */
const EMOJIS = ['📚','🔤','🌍','🎨','🔬','🎵','💡','🏆','🌿','⚗️','🖥️','📐','🗺️','🧮','🎭','⚽','🍎','🏛️','✈️','🌊'];
const BGCOLS = ['#EDE9F9','#FDE8EF','#E5F9EF','#FEF0E6','#EAF3FD','#FFF3E0','#FAEAFF','#EAF9F3'];

function openDeckModal(id=null) {
  const dk = id ? S.decks.find(d=>d.id===id) : null;
  openModal(`<div class="mhd"><div class="mtitle">${dk?'Modifier le paquet':'Nouveau paquet'}</div><button class="btn btng bico bsm" onclick="closeModal()">✕</button></div>
  <div class="fg"><label class="fl">Nom du paquet</label><input id="dkN" class="fi" value="${dk?esc(dk.name):''}" placeholder="Ex : Vocabulaire anglais, Capitales…" maxlength="50"/></div>
  <div class="fg"><label class="fl">Icône</label><div style="display:flex;gap:5px;flex-wrap:wrap;">${EMOJIS.map(e=>`<button onclick="pckEmo(this,'${e}')" data-emo="${e}" class="btn btng" style="font-size:22px;padding:6px;border-radius:9px;border:2px solid ${dk&&dk.icon===e?'var(--vi)':'transparent'}">${e}</button>`).join('')}</div></div>
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;"><button class="btn btng" onclick="closeModal()">Annuler</button><button class="btn btnp" onclick="saveDeck('${id||''}')">Enregistrer</button></div>`);
  if(!dk && document.querySelector('[data-emo]')) document.querySelector('[data-emo]').style.borderColor='var(--vi)';
}
function pckEmo(btn) {
  document.querySelectorAll('[data-emo]').forEach(b=>b.style.borderColor='transparent');
  btn.style.borderColor='var(--vi)';
}
function saveDeck(id) {
  const name=document.getElementById('dkN').value.trim(); if(!name){toast('Donnez un nom au paquet','⚠️');return;}
  const pk=document.querySelector('[data-emo][style*="var(--vi)"]');
  const icon=pk?pk.dataset.emo:EMOJIS[0];
  if(id){ const dk=S.decks.find(d=>d.id===id); if(dk){dk.name=name;dk.icon=icon;} }
  else S.decks.push({id:'d'+Date.now(),name,icon,color:BGCOLS[S.decks.length%BGCOLS.length],cards:[],created:Date.now()});
  save(); closeModal(); renderHome(); renderDeckMgr(); renderLearnSetup(); refreshImports();
  toast(id?'Paquet modifié !':'Paquet créé 🎉');
}
function deleteDeck(id) {
  if(!confirm('Supprimer ce paquet et toutes ses cartes ?')) return;
  S.decks=S.decks.filter(d=>d.id!==id);
  save(); renderHome(); renderDeckMgr(); renderLearnSetup(); refreshImports();
  toast('Paquet supprimé','🗑️');
}
function openCardsModal(did) {
  const dk=S.decks.find(d=>d.id===did); if(!dk) return;
  openModal(`<div class="mhd"><div class="mtitle">${dk.icon} ${esc(dk.name)} <span style="font-size:12px;color:var(--tx-m);font-weight:500">${dk.cards.length} carte${dk.cards.length!==1?'s':''}</span></div><button class="btn btng bico bsm" onclick="closeModal()">✕</button></div>
  <div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><button class="btn btnp bsm" onclick="openAddCard('${did}')">+ Ajouter une carte</button></div>
  <div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto;">${dk.cards.length===0
    ? '<div class="empty"><div class="ei">🃏</div><p>Ce paquet est vide.<br>Ajoutez votre première carte !</p></div>'
    : dk.cards.map((c,i)=>`<div class="ci"><div class="ciq" style="flex:1">${esc(c.q)}</div><div style="color:var(--tx-f);padding:0 6px;flex-shrink:0;">→</div><div class="cia" style="flex:1">${esc(c.a)}</div><span class="cibdg ${c.correct>=3?'L':'N'}">${c.correct>=3?'✓ Sus':'⊙ Nouveau'}</span><button class="btn btng bsm bico" onclick="openAddCard('${did}',${i})">✏️</button><button class="btn btnd bsm bico" onclick="delCard('${did}',${i})">🗑️</button></div>`).join('')
  }</div>`);
}
function openAddCard(did, eidx=null) {
  const dk=S.decks.find(d=>d.id===did); if(!dk) return;
  const c=eidx!=null?dk.cards[eidx]:null;
  openModal(`<div class="mhd"><div class="mtitle">${c?'Modifier la carte':'Nouvelle carte'}</div><button class="btn btng bico bsm" onclick="openCardsModal('${did}')">←</button></div>
  <div class="fg"><label class="fl">Question / Recto</label><textarea id="cQ" class="fi fta" style="min-height:76px">${c?esc(c.q):''}</textarea></div>
  <div class="fg"><label class="fl">Réponse / Verso</label><textarea id="cA" class="fi fta" style="min-height:76px">${c?esc(c.a):''}</textarea></div>
  <div style="display:flex;justify-content:flex-end;gap:9px;margin-top:12px;"><button class="btn btng" onclick="openCardsModal('${did}')">Annuler</button><button class="btn btnp" onclick="saveCard('${did}',${eidx!=null?eidx:'null'})">${c?'Modifier':'Ajouter'}</button></div>`);
}
function saveCard(did, idx) {
  const q=document.getElementById('cQ').value.trim(), a=document.getElementById('cA').value.trim();
  if(!q||!a){toast('Les deux champs sont obligatoires','⚠️');return;}
  const dk=S.decks.find(d=>d.id===did); if(!dk) return;
  const now=Date.now();
  if(idx!=null&&idx!=='null') dk.cards[idx]={...dk.cards[idx],q,a,lastModified:now};
  else dk.cards.push({q,a,correct:0,seen:0,lastModified:now});
  save(); openCardsModal(did); toast(idx!=null&&idx!=='null'?'Carte modifiée !':'Carte ajoutée ✓');
}
function delCard(did,idx) {
  const dk=S.decks.find(d=>d.id===did); if(!dk) return;
  dk.cards.splice(idx,1); save(); openCardsModal(did); toast('Carte supprimée','🗑️');
}
function renderDeckMgr() {
  const el=document.getElementById('deckMgr'); if(!el) return;
  if(!S.decks.length){ el.innerHTML=`<div class="empty"><div class="ei">📦</div><p>Aucun paquet pour l'instant.<br>Créez votre premier paquet !</p></div>`; return; }
  el.innerHTML=S.decks.map(d=>`<div class="cdsm" style="display:flex;align-items:center;gap:12px;">
    <div class="dico" style="background:${d.color||'var(--vip)'};border-radius:12px;width:40px;height:40px;flex-shrink:0;">${d.icon}</div>
    <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:14px">${esc(d.name)}</div>
    <div style="font-size:12px;color:var(--tx-m)">${d.cards.length} carte${d.cards.length!==1?'s':''}</div></div>
    <button class="btn btns bsm" onclick="openCardsModal('${d.id}')">Voir / Éditer</button>
    <button class="btn btng bsm bico" onclick="openDeckModal('${d.id}')">⚙️</button>
    <button class="btn btnd bsm bico" onclick="deleteDeck('${d.id}')">🗑️</button>
  </div>`).join('');
}
function switchCTab(tab,btn) {
  ['decks','bulk','url'].forEach(t=>{ const el=document.getElementById('ct-'+t); if(el) el.style.display=t===tab?'block':'none'; });
  document.querySelectorAll('#cardTabs .tbb').forEach(b=>b.classList.toggle('active',b===btn));
}
function refreshImports() {
  const opts=S.decks.length
    ? S.decks.map(d=>`<option value="${d.id}">${d.icon} ${esc(d.name)}</option>`).join('')
    : '<option value="">— Créez d\'abord un paquet —</option>';
  ['bulkDeck','urlDeck'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=opts; });
}

/* ═══════ IMPORT RAPIDE ═══════ */
function parseCards(txt) {
  return txt.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
    let sep=null;
    if(l.includes(' | '))sep=' | '; else if(l.includes('|'))sep='|';
    else if(l.includes(';'))sep=';'; else if(l.includes('\t'))sep='\t';
    if(!sep) return null;
    const p=l.split(sep); if(p.length<2) return null;
    return {q:p[0].trim(),a:p.slice(1).join(sep).trim(),correct:0,seen:0,lastModified:Date.now()};
  }).filter(Boolean);
}
document.addEventListener('DOMContentLoaded',()=>{
  const ta=document.getElementById('bulkTxt');
  if(ta) ta.addEventListener('input',()=>{
    const c=parseCards(ta.value);
    const bc=document.getElementById('bulkCnt');
    if(bc) bc.textContent=c.length?`→ ${c.length} carte${c.length!==1?'s':''} détectée${c.length!==1?'s':''}`:ta.value.trim()?'Aucune carte reconnue':'';
  });
});
function bulkImport() {
  const did=document.getElementById('bulkDeck').value, txt=document.getElementById('bulkTxt').value;
  if(!did){toast('Créez d\'abord un paquet','⚠️');return;}
  if(!txt.trim()){toast('Collez votre liste','⚠️');return;}
  const cards=parseCards(txt); if(!cards.length){toast('Format non reconnu. Exemple : Bonjour | Hello','⚠️');return;}
  const dk=S.decks.find(d=>d.id===did); let added=0;
  cards.forEach(c=>{if(!dk.cards.find(x=>x.q===c.q)){dk.cards.push(c);added++;}});
  save(); renderHome(); renderDeckMgr(); renderLearnSetup();
  document.getElementById('bulkTxt').value=''; document.getElementById('bulkCnt').textContent='';
  toast(`${added} carte${added!==1?'s':''} ajoutée${added!==1?'s':''} 🎉`);
}
function urlImport() {
  const url=document.getElementById('urlInp').value.trim(), did=document.getElementById('urlDeck').value;
  if(!url){toast('Entrez une adresse web','⚠️');return;}
  if(!did){toast('Créez d\'abord un paquet','⚠️');return;}
  toast('Chargement en cours…','⏳',8000);
  fetch(url).then(r=>r.text()).then(txt=>{
    const cards=parseCards(txt); if(!cards.length){toast('Aucune carte trouvée dans ce fichier','❌');return;}
    const dk=S.decks.find(d=>d.id===did); let added=0;
    cards.forEach(c=>{if(!dk.cards.find(x=>x.q===c.q)){dk.cards.push(c);added++;}});
    save(); renderHome(); renderDeckMgr(); renderLearnSetup();
    document.getElementById('urlInp').value='';
    toast(`${added} carte${added!==1?'s':''} importée${added!==1?'s':''} 🎉`);
  }).catch(()=>toast('Impossible de charger cette adresse','❌'));
}

/* ═══════ LEARN SETUP ═══════ */
let chosenMode='flashcard', chosenDeck=null, sessDirection='qa'; /* qa | aq */

function pickMode(el, mode) {
  document.querySelectorAll('.mc').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel'); chosenMode=mode;
  document.getElementById('startBtn').disabled=!chosenDeck;
  /* Afficher / masquer options spécifiques */
  const examOpts=document.getElementById('examOptions');
  if(examOpts) examOpts.style.display=mode==='exam'?'block':'none';
  const shuffRow=document.getElementById('optRow_shuffle');
  if(shuffRow) shuffRow.style.display=mode==='exam'?'none':'flex';
  renderLearnSetup();
}
function pickDeck(id) {
  chosenDeck=id; document.getElementById('startBtn').disabled=false; renderLearnSetup();
}
function setDirection(d, btn) {
  sessDirection=d;
  document.querySelectorAll('.dir-btn').forEach(b=>b.classList.toggle('active',b===btn));
}
function renderLearnSetup() {
  const g=document.getElementById('deckPickGrid'); if(!g) return;
  if(!S.decks.length){
    g.innerHTML=`<div class="empty" style="padding:18px;grid-column:1/-1"><p>Créez d'abord un paquet dans "Mes Cartes".</p></div>`;
    document.getElementById('startBtn').disabled=true; return;
  }
  g.innerHTML=S.decks.map(d=>`<div class="dpi${chosenDeck===d.id?' sel':''}" onclick="pickDeck('${d.id}')">
    <div class="de">${d.icon}</div>
    <div class="dn">${esc(d.name)}</div>
    <div class="dc">${d.cards.length} carte${d.cards.length!==1?'s':''}${chosenMode==='srs'?' · '+countDueCards(d)+' à réviser':''}</div>
  </div>`).join('');
  document.getElementById('startBtn').disabled=!chosenDeck;
}
function countDueCards(deck) {
  const now=Date.now();
  return deck.cards.filter(c=>!c.srs||c.srs.nextReview<=now).length;
}

/* ═══════ SESSION CONTROLLER ═══════ */
let sess={};
function startSession() {
  if(!chosenDeck) return;
  const dk=S.decks.find(d=>d.id===chosenDeck);
  if(!dk||dk.cards.length<2){toast('Il faut au moins 2 cartes dans le paquet','⚠️');return;}
  if(chosenMode==='srs')  { startSRS(dk);  return; }
  if(chosenMode==='exam') { startExam(dk); return; }

  const shuffle = document.getElementById('optShuffle')?.checked ?? true;
  const strict  = document.getElementById('optStrict')?.checked  ?? false;
  const flex    = document.getElementById('optFlex')?.checked    ?? true;
  let cards = dk.cards.map((c,i)=>{
    const q = sessDirection==='aq' ? c.a : c.q;
    const a = sessDirection==='aq' ? c.q : c.a;
    return {...c, q, a, origIdx:i, consec:0};
  });
  if(shuffle) cards=shuf(cards);
  sess={mode:chosenMode,deckId:chosenDeck,queue:cards,done:[],correct:0,wrong:0,total:cards.length,strict,flex,t0:Date.now(),direction:sessDirection};
  S.session=sess; bumpStreak(); save();
  document.getElementById('learnSetup').style.display='none';
  document.getElementById('learnArea').style.display='block';
  showCard();
}
function resumeSession() {
  if(!S.session) return;
  sess=S.session; chosenDeck=sess.deckId; chosenMode=sess.mode;
  navigate('apprendre');
  document.getElementById('learnSetup').style.display='none';
  document.getElementById('learnArea').style.display='block';
  showCard();
}
function exitSession(pause=true) {
  if(pause){S.session=sess;save();toast('Session sauvegardée 💾');}
  else{S.session=null;save();}
  clearInterval(matchTimer); clearInterval(examTimer);
  document.getElementById('learnSetup').style.display='block';
  document.getElementById('learnArea').style.display='none';
}
function markCard(ok, event=null) {
  const c=sess.queue.shift();
  bumpDaily(1);
  if(ok) {
    c.consec=(c.consec||0)+1;
    if(c.consec>=3){
      sess.done.push(c); sess.correct++;
      const dk=S.decks.find(d=>d.id===sess.deckId);
      if(dk&&dk.cards[c.origIdx]) dk.cards[c.origIdx].correct=Math.min(3,(dk.cards[c.origIdx].correct||0)+1);
      save();
    } else { const pos=Math.min(3,sess.queue.length); sess.queue.splice(pos,0,c); }
    if(event) celebrateCorrect(event);
  } else {
    c.consec=0; sess.wrong++; sess.queue.push(c);
  }
  S.session=sess; save();
  if(!sess.queue.length) showComplete(); else showCard();
}
function skipCard() {
  const c=sess.queue.shift(); sess.queue.push(c);
  S.session=sess; save(); showCard();
}
function showCard() {
  const area=document.getElementById('learnArea'); area.innerHTML='';
  const card=sess.queue[0];
  const pct=Math.round(sess.done.length/sess.total*100);
  const hdr=`<div class="shdr">
    <span class="sinf">${sess.done.length}/${sess.total} · ✓${sess.correct} ✗${sess.wrong}</span>
    <div class="pb" style="flex:1;max-width:200px"><div class="pf" style="width:${pct}%"></div></div>
    ${sess.mode==='match'?`<div class="tbadge">⏱ <span id="timerD">00:00</span></div>`:''}
    <button class="btn btng bsm" onclick="exitSession(true)">Pause ⏸</button>
  </div>`;
  if(sess.mode==='flashcard') doFlash(area,hdr,card);
  else if(sess.mode==='write')   doWrite(area,hdr,card);
  else if(sess.mode==='qcm')     doQCM(area,hdr,card);
  else if(sess.mode==='match')   doMatch(area,hdr);
  else if(sess.mode==='dictee')  doDictee(area,hdr,card);
}
function showComplete() {
  S.session=null; save(); recalc();
  const pct=sess.total>0?Math.round(sess.correct/Math.max(1,sess.correct+sess.wrong)*100):100;
  const sec=Math.round((Date.now()-sess.t0)/1000), m=Math.floor(sec/60), s=sec%60;
  document.getElementById('learnArea').innerHTML=`<div class="cc">
    <div class="ccico">${pct>=80?'🎉':pct>=50?'💪':'😅'}</div>
    <div class="cctitle">${pct>=80?'Excellent !':pct>=50?'Bien joué !':'Continuez !'}</div>
    <div class="ccsub">Terminé en ${m}m ${s}s</div>
    <div class="rg">
      <div class="rstat"><div class="rnum" style="color:var(--gr)">${sess.correct}</div><div style="font-size:12px;color:var(--tx-m)">Corrects</div></div>
      <div class="rstat"><div class="rnum" style="color:var(--rd)">${sess.wrong}</div><div style="font-size:12px;color:var(--tx-m)">Ratés</div></div>
      <div class="rstat"><div class="rnum" style="color:var(--vi)">${pct}%</div><div style="font-size:12px;color:var(--tx-m)">Score</div></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <button class="btn btns" onclick="exitSession(false);renderLearnSetup()">← Retour</button>
      <button class="btn btnp" onclick="startSession()">Rejouer ▶</button>
    </div>
  </div>`;
}

/* ═══════ MODE CARTES (FLASHCARD) ═══════ */
let fcFlip=false;
function doFlash(area,hdr,card) {
  fcFlip=false;
  area.innerHTML=hdr+`<div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
    <div class="fcw" id="fcWrap" onclick="flipFC()">
      <div class="fc" id="fcEl">
        <div class="fcf">
          <button class="fc-tts" id="ttsFront" onclick="event.stopPropagation();speakCardTTS('${esc(card.q)}','ttsFront')" title="Écouter">🔊</button>
          <div class="fclbl">Question</div>
          <div class="fctext">${esc(card.q)}</div>
          <div class="fc-hint">Appuyez sur <span class="kbd">Espace</span> ou cliquez pour voir la réponse</div>
        </div>
        <div class="fcf fcb">
          <button class="fc-tts" id="ttsBack" onclick="event.stopPropagation();speakCardTTS('${esc(card.a)}','ttsBack')" title="Écouter">🔊</button>
          <div class="fclbl">Réponse</div>
          <div class="fctext">${esc(card.a)}</div>
        </div>
      </div>
    </div>
    <div class="kbd-hint">
      <span class="kbd">Espace</span> Retourner &nbsp;
      <span class="kbd">←</span> Pas encore &nbsp;
      <span class="kbd">→</span> Je savais !
    </div>
    <div class="fcact" id="fcActs" style="display:none;">
      <button class="btn btnd" id="btnWrong" onclick="markCard(false)">✗ Pas encore</button>
      <button class="btn btns" onclick="skipCard()">↷ Passer</button>
      <button class="btn btnG" id="btnRight" onclick="markCard(true,event)">✓ Je savais !</button>
    </div>
  </div>`;
}
function flipFC() {
  fcFlip=!fcFlip;
  const fc=document.getElementById('fcEl'); if(fc) fc.classList.toggle('flipped',fcFlip);
  const a=document.getElementById('fcActs'); if(a&&fcFlip) a.style.display='flex';
}

/* ═══════ MODE ÉCRITURE ═══════ */
function doWrite(area,hdr,card) {
  area.innerHTML=hdr+`<div class="wa">
    <div class="wq">
      <button class="fc-tts" id="ttsQ" onclick="speakCardTTS('${esc(card.q)}','ttsQ')" title="Écouter" style="position:absolute;top:12px;right:12px;">🔊</button>
      <div class="fclbl">Question</div>
      <div class="qt">${esc(card.q)}</div>
    </div>
    <input type="text" class="fi" id="wInp" placeholder="Tapez votre réponse…" autocomplete="off" autocorrect="off" spellcheck="false" style="font-size:16px;text-align:center;padding:14px;"/>
    <div id="wFB" style="display:none;"></div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="btn btns" onclick="skipCard()">Passer →</button>
      <button class="btn btnp" onclick="submitWrite()">Valider ✓</button>
    </div>
    <div class="kbd-hint"><span class="kbd">Entrée</span> Valider</div>
  </div>`;
  setTimeout(()=>{ const i=document.getElementById('wInp'); if(i) i.focus(); },60);
}
function submitWrite(ev) {
  const inp=document.getElementById('wInp'); if(!inp||!inp.value.trim()){if(inp)inp.focus();return;}
  const card=sess.queue[0];
  const ok=checkAns(inp.value, card.a, {strict:sess.strict, flexible:sess.flex});
  const fb=document.getElementById('wFB');
  fb.className='afb '+(ok?'ok animOk':'bad');
  fb.innerHTML=ok?`✓ Correct ! <strong>${esc(card.a)}</strong>`:
    checkAns(inp.value,card.a,{flexible:true})&&!ok?
    `🔡 Presque ! La bonne orthographe : <strong>${esc(card.a)}</strong>`:
    `✗ La bonne réponse : <strong>${esc(card.a)}</strong>`;
  fb.style.display='block'; inp.disabled=true;
  const btn=document.querySelector('.wa .btnp'); if(btn) btn.disabled=true;
  if(ok) celebrateCorrect(ev||null);
  else shakeEl('wInp');
  setTimeout(()=>markCard(ok), ok?750:1700);
}

/* ═══════ MODE QUIZ (QCM) ═══════ */
function doQCM(area,hdr,card) {
  const dk=S.decks.find(d=>d.id===sess.deckId);
  const others=shuf(dk.cards.filter(c=>normalize(c.a)!==normalize(card.a)).map(c=>sess.direction==='aq'?c.q:c.a)).slice(0,3);
  while(others.length<3) others.push('–');
  const choices=shuf([card.a,...others]);
  const LETS=['A','B','C','D'];
  area.innerHTML=hdr+`<div class="qcmw">
    <div class="qcmq">
      <button class="fc-tts" id="ttsQcm" onclick="speakCardTTS('${esc(card.q)}','ttsQcm')" title="Écouter" style="position:absolute;top:12px;right:12px;">🔊</button>
      <div class="fclbl">Question</div>
      <div class="qt">${esc(card.q)}</div>
    </div>
    <div class="qcmc" id="qcmc">${choices.map((ch,i)=>`
      <button class="qc" id="qcBtn${i}" onclick="pickQCM(this,'${esc(ch)}','${esc(card.a)}',event)">
        <div class="qcl">${LETS[i]}</div><span>${esc(ch)}</span>
      </button>`).join('')}
    </div>
    <div class="kbd-hint" style="margin-top:10px;"><span class="kbd">A</span><span class="kbd">B</span><span class="kbd">C</span><span class="kbd">D</span> Sélectionner</div>
  </div>`;
}
function pickQCM(btn, chosen, correct, ev) {
  const ok=chosen===correct;
  document.querySelectorAll('.qc').forEach(b=>{
    b.classList.add('locked');
    if(b.querySelector('span').textContent===correct) b.classList.add('correct');
    else if(b===btn&&!ok) b.classList.add('wrong');
  });
  if(ok) celebrateCorrect(ev||null);
  setTimeout(()=>markCard(ok), ok?700:1600);
}

/* ═══════ MODE ASSOCIATION ═══════ */
let matchTimer=null, matchStart=0, matchSel=null, matchPairs=[];
function doMatch(area,hdr) {
  clearInterval(matchTimer);
  const cards=shuf([...sess.queue]).slice(0,Math.min(6,sess.queue.length));
  matchPairs=cards.map(c=>({id:c.q+'__'+c.a,q:c.q,a:c.a}));
  const qs=shuf(matchPairs.map(p=>({id:p.id,txt:p.q,tp:'q'})));
  const as=shuf(matchPairs.map(p=>({id:p.id,txt:p.a,tp:'a'})));
  const tiles=shuf([...qs,...as]); matchSel=null; matchStart=Date.now();
  area.innerHTML=hdr+`<div class="maw">
    <p style="font-size:12.5px;color:var(--tx-m);margin-bottom:12px;text-align:center;">Associez chaque question à sa réponse !</p>
    <div class="matg" id="matg">${tiles.map(t=>`<div class="mt" data-id="${esc(t.id)}" data-tp="${t.tp}" onclick="mtClick(this)">${esc(t.txt)}</div>`).join('')}</div>
    <div id="matMsg" style="text-align:center;margin-top:14px;font-size:13px;font-weight:700;min-height:20px;"></div>
  </div>`;
  matchTimer=setInterval(()=>{ const el=document.getElementById('timerD'); if(!el){clearInterval(matchTimer);return;} const s=Math.floor((Date.now()-matchStart)/1000); el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); },500);
}
function mtClick(tile) {
  if(tile.classList.contains('matched')||tile.classList.contains('fout')) return;
  if(!matchSel){tile.classList.add('sel');matchSel=tile;return;}
  if(matchSel===tile){tile.classList.remove('sel');matchSel=null;return;}
  const a=matchSel, b=tile; a.classList.remove('sel');
  if(a.dataset.id===b.dataset.id&&a.dataset.tp!==b.dataset.tp){
    a.classList.add('matched'); b.classList.add('matched');
    document.getElementById('matMsg').innerHTML='<span style="color:var(--grd)">✓ Bonne paire !</span>';
    sess.correct++;
    const rect=b.getBoundingClientRect();
    burstConfetti(rect.left+rect.width/2, rect.top+rect.height/2);
    setTimeout(()=>{
      a.classList.add('fout'); b.classList.add('fout');
      setTimeout(()=>{
        try{a.remove();b.remove();}catch{}
        const rem=document.querySelectorAll('.mt:not(.matched):not(.fout)');
        if(rem.length===0){ clearInterval(matchTimer); const n=matchPairs.length; for(let i=0;i<n;i++) markCard(true); }
      },400);
    },280);
  } else {
    a.classList.add('wfl'); b.classList.add('wfl');
    document.getElementById('matMsg').innerHTML='<span style="color:var(--rd)">✗ Ce n\'est pas la bonne paire</span>';
    sess.wrong++;
    setTimeout(()=>{a.classList.remove('wfl');b.classList.remove('wfl');},450);
  }
  matchSel=null;
}

/* ═══════ MODE DICTÉE ═══════ */
let spkCnt=0;
function doDictee(area,hdr,card) {
  spkCnt=0;
  const voices=getVoiceOptions();
  area.innerHTML=hdr+`<div class="dtw">
    <p style="font-size:13px;color:var(--tx-m);">Appuyez sur le bouton pour entendre la réponse, puis écrivez-la.</p>
    <div class="fg" style="width:100%;max-width:320px;">
      <label class="fl">Voix</label>
      <select class="fi fsel" id="voiceSel">${voices}</select>
    </div>
    <button class="lstnbtn" id="lstnBtn" onclick="speakDictee()">🔊</button>
    <div id="spkCnt" style="font-size:13px;color:var(--tx-m);font-weight:500;">Cliquez pour écouter</div>
    <div class="wq" style="width:100%;"><div class="fclbl">Indice (question)</div><div class="qt" style="font-size:17px;">${esc(card.q)}</div></div>
    <input type="text" class="fi" id="dtInp" placeholder="Écrivez ce que vous avez entendu…" autocomplete="off" style="text-align:center;font-size:15px;" onkeydown="if(event.key==='Enter')submitDictee()"/>
    <div id="dtFB" style="display:none;"></div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="btn btns" onclick="skipCard()">Passer →</button>
      <button class="btn btnp" onclick="submitDictee()">Valider ✓</button>
    </div>
    <div class="kbd-hint"><span class="kbd">Entrée</span> Valider</div>
  </div>`;
}
function speakDictee() {
  const card=sess.queue[0]; if(!card) return;
  const btn=document.getElementById('lstnBtn'); if(btn) btn.classList.add('spk');
  spkCnt++; const cnt=document.getElementById('spkCnt'); if(cnt) cnt.textContent=`Écoute n°${spkCnt}`;
  speakCardTTS(card.a, 'lstnBtn');
  setTimeout(()=>{ const i=document.getElementById('dtInp'); if(i) i.focus(); },200);
}
function submitDictee(ev) {
  const inp=document.getElementById('dtInp'); if(!inp||!inp.value.trim()){if(inp)inp.focus();return;}
  const card=sess.queue[0];
  const ok=checkAns(inp.value, card.a, {strict:sess.strict, flexible:sess.flex});
  const fb=document.getElementById('dtFB');
  fb.className='afb '+(ok?'ok':'bad');
  fb.innerHTML=ok?`✓ Correct ! "${esc(card.a)}"`:`✗ La bonne réponse : <strong>${esc(card.a)}</strong>`;
  fb.style.display='block'; inp.disabled=true;
  if(ok) celebrateCorrect(ev||null); else shakeEl('dtInp');
  setTimeout(()=>markCard(ok), ok?750:1700);
}

/* ═══════ RACCOURCIS CLAVIER ═══════ */
document.addEventListener('keydown', e=>{
  const tag=e.target.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;

  /* Carte Flash */
  if(sess.mode==='flashcard') {
    if(e.key===' '){e.preventDefault(); if(document.getElementById('fcEl')) flipFC();}
    if(e.key==='ArrowRight'&&fcFlip){ e.preventDefault(); markCard(true); }
    if(e.key==='ArrowLeft'&&fcFlip){  e.preventDefault(); markCard(false); }
    if(e.key==='ArrowDown'){  e.preventDefault(); skipCard(); }
  }
  /* Write & Dictée */
  if(e.key==='Enter'){
    if(sess.mode==='write')  submitWrite();
    if(sess.mode==='dictee') submitDictee();
  }
  /* QCM : A B C D */
  if(sess.mode==='qcm' && ['a','b','c','d'].includes(e.key.toLowerCase())) {
    const idx=['a','b','c','d'].indexOf(e.key.toLowerCase());
    const btn=document.getElementById('qcBtn'+idx);
    if(btn&&!btn.classList.contains('locked')) btn.click();
  }
  /* SRS */
  if(sess.mode==='srs') {
    if(e.key==='1') { const b=document.querySelector('.srs-btn.again'); if(b)b.click(); }
    if(e.key==='2') { const b=document.querySelector('.srs-btn.hard'); if(b)b.click(); }
    if(e.key==='3') { const b=document.querySelector('.srs-btn.good'); if(b)b.click(); }
    if(e.key==='4') { const b=document.querySelector('.srs-btn.easy'); if(b)b.click(); }
    if(e.key===' ') { e.preventDefault(); flipSRS(); }
  }
});

/* ═══════ RÉVISION INTELLIGENTE (SM-2) ═══════ */
let srsSess={};
function startSRS(dk) {
  const now=Date.now();
  let due=dk.cards.map((c,i)=>({...c,origIdx:i})).filter(c=>!c.srs||c.srs.nextReview<=now);
  if(!due.length){ toast('Rien à réviser aujourd\'hui ! Revenez demain 😊','📅',4000); return; }
  due=shuf(due);
  srsSess={deckId:dk.id,queue:[...due],total:due.length,done:0,t0:Date.now()};
  sess.mode='srs';
  bumpStreak(); save();
  document.getElementById('learnSetup').style.display='none';
  document.getElementById('learnArea').style.display='block';
  showSRSCard();
}
function showSRSCard() {
  const area=document.getElementById('learnArea'); area.innerHTML='';
  if(!srsSess.queue||!srsSess.queue.length){ showSRSComplete(); return; }
  const card=srsSess.queue[0];
  const pct=Math.round(srsSess.done/srsSess.total*100);
  area.innerHTML=`<div class="shdr">
    <span class="sinf">${srsSess.done}/${srsSess.total} · Révision Intelligente</span>
    <div class="pb" style="flex:1;max-width:200px"><div class="pf" style="width:${pct}%"></div></div>
    <button class="btn btng bsm" onclick="exitSRS()">Pause ⏸</button>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
    <div class="fcw" id="srsFCW" onclick="flipSRS()">
      <div class="fc" id="srsFCEl">
        <div class="fcf">
          <button class="fc-tts" id="ttsSrsF" onclick="event.stopPropagation();speakCardTTS('${esc(card.q)}','ttsSrsF')" title="Écouter">🔊</button>
          <div class="fclbl">Question</div>
          <div class="fctext">${esc(card.q)}</div>
          <div class="fc-hint">Cliquez ou <span class="kbd">Espace</span> pour révéler</div>
        </div>
        <div class="fcf fcb">
          <button class="fc-tts" id="ttsSrsB" onclick="event.stopPropagation();speakCardTTS('${esc(card.a)}','ttsSrsB')" title="Écouter">🔊</button>
          <div class="fclbl">Réponse</div>
          <div class="fctext">${esc(card.a)}</div>
          ${card.srs?`<div style="font-size:11px;color:var(--tx-f);margin-top:10px;">Intervalle actuel : ${card.srs.interval}j</div>`:''}
        </div>
      </div>
    </div>
    <div class="srs-btns" id="srsBtns" style="display:none;">
      <button class="srs-btn again" onclick="sm2Update(1)">🔁 À revoir<span class="srs-sub">Bientôt</span></button>
      <button class="srs-btn hard" onclick="sm2Update(3)">😓 Difficile<span class="srs-sub">${srsSrsInterval(card,3)}j</span></button>
      <button class="srs-btn good" onclick="sm2Update(4)">👍 Bien<span class="srs-sub">${srsSrsInterval(card,4)}j</span></button>
      <button class="srs-btn easy" onclick="sm2Update(5)">⭐ Facile<span class="srs-sub">${srsSrsInterval(card,5)}j</span></button>
    </div>
    <div class="kbd-hint"><span class="kbd">Espace</span> Révéler &nbsp; <span class="kbd">1</span>–<span class="kbd">4</span> Évaluer</div>
  </div>`;
}
function srsSrsInterval(card,q) {
  const s=card.srs||{n:0,ef:2.5,interval:1};
  if(q<3) return 1;
  if(s.n===0) return 1;
  if(s.n===1) return 6;
  return Math.round(s.interval*s.ef);
}
function flipSRS() {
  const fc=document.getElementById('srsFCEl'); if(fc) fc.classList.add('flipped');
  const b=document.getElementById('srsBtns'); if(b) b.style.display='flex';
  const w=document.getElementById('srsFCW'); if(w) w.onclick=null;
}
function sm2Update(q) {
  const card=srsSess.queue.shift();
  const dk=S.decks.find(d=>d.id===srsSess.deckId);
  const oc=dk?dk.cards[card.origIdx]:null;
  if(!oc) return;
  let {n=0,ef=2.5,interval=1}=oc.srs||{};
  if(q>=3){
    if(n===0)     interval=1;
    else if(n===1) interval=6;
    else           interval=Math.round(interval*ef);
    ef=Math.max(1.3,ef+(0.1-(5-q)*(0.08+(5-q)*0.02))); n++;
  } else { n=0; interval=1; }
  oc.srs={n,ef,interval,nextReview:Date.now()+interval*86400000,lastReview:Date.now()};
  oc.lastModified=Date.now();
  bumpDaily(1);
  if(q>=4) burstConfetti(window.innerWidth/2, window.innerHeight/2);
  srsSess.done++;
  save(); showSRSCard();
}
function exitSRS() {
  sess.mode='flashcard';
  document.getElementById('learnSetup').style.display='block';
  document.getElementById('learnArea').style.display='none';
  srsSess={};
}
function showSRSComplete() {
  const sec=Math.round((Date.now()-srsSess.t0)/1000), m=Math.floor(sec/60), s=sec%60;
  document.getElementById('learnArea').innerHTML=`<div class="cc">
    <div class="ccico">🧠</div>
    <div class="cctitle">Révision du jour terminée !</div>
    <div class="ccsub">${srsSess.total} carte${srsSess.total!==1?'s':''} révisée${srsSess.total!==1?'s':''} en ${m}m ${s}s</div>
    <div class="rg">
      <div class="rstat"><div class="rnum" style="color:var(--vi)">${srsSess.total}</div><div style="font-size:12px;color:var(--tx-m)">Révisées</div></div>
    </div>
    <p style="font-size:13px;color:var(--tx-m);max-width:320px;margin:0 auto 20px;">L'application a calculé le meilleur moment pour réviser chaque carte. Revenez demain !</p>
    <button class="btn btns" onclick="exitSRS();renderLearnSetup()">← Retour</button>
  </div>`;
  srsSess={};
}

/* ═══════ TEST (EXAMEN BLANC) ═══════ */
let examSess={}, examTimer=null;
function startExam(dk) {
  const durMin=parseInt(document.getElementById('examDuration')?.value||'0')||0;
  const type=document.getElementById('examType')?.value||'qcm'; /* qcm | write */
  const cards=shuf([...dk.cards]).map(c=>{
    const q = sessDirection==='aq' ? c.a : c.q;
    const a = sessDirection==='aq' ? c.q : c.a;
    return {...c,q,a};
  });
  examSess={deckId:dk.id,cards,idx:0,results:[],dur:durMin*60000,type,t0:Date.now(),timeUp:false};
  bumpStreak(); save();
  document.getElementById('learnSetup').style.display='none';
  document.getElementById('learnArea').style.display='block';
  if(durMin>0) startExamTimer(durMin*60000);
  showExamCard();
}
function startExamTimer(ms) {
  clearInterval(examTimer);
  examTimer=setInterval(()=>{
    const left=ms-(Date.now()-examSess.t0);
    const el=document.getElementById('examTimerVal'); if(!el){clearInterval(examTimer);return;}
    if(left<=0){ clearInterval(examTimer); examSess.timeUp=true; showExamResults(); return; }
    const m2=Math.floor(left/60000), s2=Math.floor((left%60000)/1000);
    el.textContent=String(m2).padStart(2,'0')+':'+String(s2).padStart(2,'0');
    if(el.parentElement) el.parentElement.classList.toggle('danger',left<30000);
  },500);
}
function showExamCard() {
  const area=document.getElementById('learnArea'); area.innerHTML='';
  if(examSess.idx>=examSess.cards.length){ clearInterval(examTimer); showExamResults(); return; }
  const card=examSess.cards[examSess.idx];
  const prog=examSess.idx+1, tot=examSess.cards.length;
  const timerHtml=examSess.dur>0?`<div class="exam-timer" id="examTimerVal">--:--</div>`:'';
  const isWrite=examSess.type==='write';

  let ansHtml='';
  if(isWrite){
    ansHtml=`<div class="wa" style="margin-top:0;">
      <input type="text" class="fi" id="examWInp" placeholder="Tapez votre réponse…" autocomplete="off" autocorrect="off" spellcheck="false" style="font-size:16px;text-align:center;padding:14px;" onkeydown="if(event.key==='Enter')examWriteSubmit()"/>
      <div id="examWFB" style="display:none;"></div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:4px;">
        <button class="btn btns" onclick="examSkip()">Passer →</button>
        <button class="btn btnp" onclick="examWriteSubmit()">Valider ✓</button>
      </div>
    </div>`;
  } else {
    const dk=S.decks.find(d=>d.id===examSess.deckId);
    const others=shuf((dk?dk.cards:[]).filter(c=>normalize(c.a)!==normalize(card.a)).map(c=>c.a)).slice(0,3);
    while(others.length<3) others.push('–');
    const choices=shuf([card.a,...others]); const LETS=['A','B','C','D'];
    ansHtml=`<div class="qcmc">${choices.map((ch,i)=>`
      <button class="qc" onclick="examPick(this,'${esc(ch)}','${esc(card.a)}',event)">
        <div class="qcl">${LETS[i]}</div><span>${esc(ch)}</span>
      </button>`).join('')}</div>`;
  }

  area.innerHTML=`<div class="exam-hdr">
    <span style="font-size:13.5px;font-weight:700;color:var(--tx-m)">Question ${prog}/${tot}</span>
    ${timerHtml}
    <button class="btn btnd bsm" onclick="clearInterval(examTimer);showExamResults()">Terminer</button>
  </div>
  <div class="pb" style="margin-bottom:17px;"><div class="pf" style="width:${Math.round((prog-1)/tot*100)}%"></div></div>
  <div class="qcmw">
    <div class="qcmq">
      <button class="fc-tts" id="ttsExam" onclick="speakCardTTS('${esc(card.q)}','ttsExam')" title="Écouter" style="position:absolute;top:12px;right:12px;">🔊</button>
      <div class="fclbl">Question ${prog}</div>
      <div class="qt">${esc(card.q)}</div>
    </div>
    ${ansHtml}
  </div>`;
  if(isWrite) setTimeout(()=>{ const i=document.getElementById('examWInp'); if(i)i.focus(); },60);
}
function examWriteSubmit(ev) {
  const inp=document.getElementById('examWInp'); if(!inp||!inp.value.trim()){if(inp)inp.focus();return;}
  const card=examSess.cards[examSess.idx];
  const ok=checkAns(inp.value, card.a, {strict:false,flexible:true});
  const fb=document.getElementById('examWFB');
  fb.className='afb '+(ok?'ok':'bad');
  fb.innerHTML=ok?`✓ Correct ! <strong>${esc(card.a)}</strong>`:`✗ Bonne réponse : <strong>${esc(card.a)}</strong>`;
  fb.style.display='block'; inp.disabled=true;
  examSess.results.push({q:card.q,a:card.a,given:inp.value,ok});
  bumpDaily(1);
  examSess.idx++;
  if(ok) celebrateCorrect(ev||null); else shakeEl('examWInp');
  setTimeout(()=>showExamCard(), ok?800:1700);
}
function examPick(btn, chosen, correct, ev) {
  const ok=chosen===correct;
  document.querySelectorAll('.qc').forEach(b=>{
    b.classList.add('locked');
    if(b.querySelector('span').textContent===correct) b.classList.add('correct');
    else if(b===btn&&!ok) b.classList.add('wrong');
  });
  examSess.results.push({q:examSess.cards[examSess.idx].q,a:correct,given:chosen,ok});
  bumpDaily(1);
  examSess.idx++;
  if(ok) celebrateCorrect(ev||null);
  setTimeout(()=>showExamCard(), ok?650:1500);
}
function examSkip() {
  examSess.results.push({q:examSess.cards[examSess.idx].q,a:examSess.cards[examSess.idx].a,given:'',ok:false});
  examSess.idx++;
  showExamCard();
}
function showExamResults() {
  clearInterval(examTimer);
  const area=document.getElementById('learnArea'); area.innerHTML='';
  const res=examSess.results;
  const ok=res.filter(r=>r.ok).length, tot=res.length||examSess.cards.length;
  const pct=tot?Math.round(ok/tot*100):0;
  const sec=Math.round((Date.now()-examSess.t0)/1000), m=Math.floor(sec/60), s=sec%60;
  const rows=res.map(r=>`<div class="exam-row ${r.ok?'ok':'bad'}">
    <span class="er">${r.ok?'✅':'❌'}</span>
    <span class="eq">${esc(r.q)}</span>
    <span class="ea">${r.ok?esc(r.a):`${r.given?esc(r.given)+' → ':''}${esc(r.a)}`}</span>
  </div>`).join('');
  if(pct===100) burstConfetti(window.innerWidth/2, window.innerHeight/2);
  area.innerHTML=`<div class="cc">
    <div class="ccico">${examSess.timeUp?'⏰':pct>=80?'🏆':pct>=50?'💪':'😅'}</div>
    <div class="cctitle">${examSess.timeUp?'Temps écoulé !':pct>=80?'Excellent résultat !':pct>=50?'Bien joué !':'Continuez !'}</div>
    <div class="ccsub">Test terminé en ${m}m ${s}s</div>
    <div class="rg">
      <div class="rstat"><div class="rnum" style="color:var(--gr)">${ok}</div><div style="font-size:12px;color:var(--tx-m)">Bonne${ok!==1?'s':''} réponse${ok!==1?'s':''}</div></div>
      <div class="rstat"><div class="rnum" style="color:var(--rd)">${tot-ok}</div><div style="font-size:12px;color:var(--tx-m)">Erreur${tot-ok!==1?'s':''}</div></div>
      <div class="rstat"><div class="rnum" style="color:var(--vi)">${pct}%</div><div style="font-size:12px;color:var(--tx-m)">Score</div></div>
    </div>
    ${rows.length?`<div style="text-align:left;width:100%;max-width:560px;margin:0 auto 18px;">
      <div class="shd">Détail des réponses</div>
      <div class="exam-score-list">${rows}</div>
    </div>`:''}
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <button class="btn btns" onclick="exitSession(false);renderLearnSetup()">← Retour</button>
      <button class="btn btnp" onclick="startExam(S.decks.find(d=>d.id===examSess.deckId))">Repasser 🔁</button>
    </div>
  </div>`;
  examSess={};
}

/* ═══════ MULTIJOUEUR ═══════ */
let mpP=null, mpC=null, mpCs=[], mpPs=[], mpH=false, mpN='';
function mpCreate() {
  mpN=document.getElementById('mpNick').value.trim()||'Joueur'; mpH=true;
  const id='CARDS-'+(Math.random().toString(36).substr(2,4)).toUpperCase()+'-'+Math.floor(Math.random()*9000+1000);
  mpP=new Peer(id,{debug:0});
  mpP.on('open',()=>{
    mpSetSt(true,'Salle ouverte');
    document.getElementById('onCon').style.display='none';
    document.getElementById('onRoom').style.display='block';
    document.getElementById('myRoomCode').textContent=id;
    mpRP();
  });
  mpP.on('connection',c=>{
    mpCs.push(c);
    c.on('data',d=>mpHD(d,c));
    c.on('close',()=>{ mpCs=mpCs.filter(x=>x!==c); mpPs=mpPs.filter(p=>p.cid!==c.connectionId); mpRP(); });
  });
  mpP.on('error',()=>toast('Erreur de connexion','❌'));
}
function mpShowJoin() { document.getElementById('joinForm').style.display='block'; }
function mpJoin() {
  mpN=document.getElementById('mpNick').value.trim()||'Joueur';
  const code=document.getElementById('joinCode').value.trim().toUpperCase();
  if(!code){toast('Entrez un code de salle','⚠️');return;}
  mpP=new Peer('P-'+Date.now(),{debug:0});
  mpP.on('open',()=>{
    mpC=mpP.connect(code,{reliable:true});
    mpC.on('open',()=>{ mpC.send({type:'join',nick:mpN}); mpSetSt(true,'Connecté'); document.getElementById('onCon').style.display='none'; document.getElementById('onRoom').style.display='block'; document.getElementById('myRoomCode').textContent=code; mpRP(); toast('Connecté ! 🎉'); });
    mpC.on('data',d=>mpHD(d));
    mpC.on('close',()=>{ mpSetSt(false,'Déconnecté'); toast('Connexion perdue','📡'); });
  });
  mpP.on('error',()=>toast('Code invalide','❌'));
}
function mpHD(data,sender) {
  if(data.type==='join'){ mpPs.push({nick:data.nick,cid:sender?.connectionId}); mpRP(); mpBC({type:'roster',players:mpPs.map(p=>p.nick)},sender); toast(`${data.nick} a rejoint 👋`); }
  if(data.type==='roster'){ mpPs=data.players.map(n=>({nick:n})); mpRP(); }
  if(data.type==='emoji') spawnEmoji(data.emoji);
  if(data.type==='duel_start') recvDuelStart(data);
  if(data.type==='duel_card')  recvDuelCard(data);
  if(data.type==='duel_hit')   recvDuelHit(data);
  if(data.type==='duel_end')   recvDuelEnd(data);
}
function mpBC(d,ex) { mpCs.filter(c=>c!==ex).forEach(c=>{try{c.send(d);}catch{}}); if(mpC&&mpC.open&&mpC!==ex) try{mpC.send(d);}catch{}; }
function mpSend(d) { mpBC(d,null); }
function mpRP() {
  const l=document.getElementById('playerList'); if(!l) return;
  const all=[{nick:mpN+(mpH?' (hôte)':'')},...mpPs];
  l.innerHTML=all.map(p=>`<div class="pcard"><div class="av">${p.nick.charAt(0).toUpperCase()}</div>${esc(p.nick)}</div>`).join('');
  const db=document.getElementById('duelStartBtn');
  if(db) db.style.display=(mpH&&mpPs.length>0)?'flex':'none';
}
function mpSetSt(on,txt) { const d=document.getElementById('odot'),t=document.getElementById('ostxt'); if(d)d.className='dot'+(on?' on':''); if(t)t.textContent=txt; }
function mpDisconnect() { if(mpP)mpP.destroy(); mpP=mpC=null; mpCs=[];mpPs=[];mpH=false; document.getElementById('onCon').style.display='block'; document.getElementById('onRoom').style.display='none'; mpSetSt(false,'Non connecté'); toast('Déconnecté'); }
function sendEmoji(e) { spawnEmoji(e); mpBC({type:'emoji',emoji:e}); }
function spawnEmoji(e) { const el=document.createElement('div'); el.className='ef'; el.textContent=e; el.style.left=Math.random()*80+10+'vw'; el.style.bottom='100px'; document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }

/* ═══════ DUEL ═══════ */
let duelState={active:false,deckCards:[],idx:0,myScore:0,oppScore:0,locked:false};
function openDuelSetup() {
  if(!mpH){toast('Seul l\'hôte peut lancer le duel','⚠️');return;}
  if(!S.decks.length){toast('Créez d\'abord un paquet','⚠️');return;}
  openModal(`<div class="mhd"><div class="mtitle">⚔️ Lancer le Duel</div><button class="btn btng bico bsm" onclick="closeModal()">✕</button></div>
  <p style="font-size:13.5px;color:var(--tx-m);margin-bottom:16px;">Vous recevrez tous les deux la même question en même temps. Le premier à donner la bonne réponse marque un point !</p>
  <div class="fg"><label class="fl">Choisir un paquet</label><select class="fi fsel" id="duelDeckSel">${S.decks.map(d=>`<option value="${d.id}">${d.icon} ${esc(d.name)} (${d.cards.length} cartes)</option>`).join('')}</select></div>
  <div style="display:flex;justify-content:flex-end;gap:9px;margin-top:14px;"><button class="btn btng" onclick="closeModal()">Annuler</button><button class="btn btnp" onclick="launchDuel()">⚔️ Lancer le duel !</button></div>`);
}
function launchDuel() {
  const did=document.getElementById('duelDeckSel')?.value; if(!did) return;
  const dk=S.decks.find(d=>d.id===did); if(!dk||!dk.cards.length){toast('Paquet vide','⚠️');return;}
  closeModal();
  const cards=shuf([...dk.cards]);
  duelState={active:true,deckCards:cards,idx:0,myScore:0,oppScore:0,locked:false,isHost:true};
  mpSend({type:'duel_start',cards:cards.map(c=>({q:c.q,a:c.a}))});
  showDuelArea(); sendDuelCard();
}
function recvDuelStart(data) { duelState={active:true,deckCards:data.cards,idx:0,myScore:0,oppScore:0,locked:false,isHost:false}; navigate('online'); showDuelArea(); }
function showDuelArea() {
  if(!document.getElementById('duelArea')){ const div=document.createElement('div'); div.id='duelArea'; const room=document.getElementById('onRoom'); if(room) room.after(div); }
  const area=document.getElementById('duelArea'); if(!area) return;
  const oppNick=mpPs.length?mpPs[0].nick:'Adversaire';
  area.innerHTML=`<div style="margin-top:14px;">
    <div class="shd">⚔️ Duel en cours !</div>
    <div class="duel-score">
      <div class="duel-player" id="dp-me"><div class="dp-nick">${esc(mpN)} (moi)</div><div class="dp-pts" id="dp-my-score">0</div></div>
      <div style="font-size:26px;display:flex;align-items:center;color:var(--tx-f)">vs</div>
      <div class="duel-player" id="dp-opp"><div class="dp-nick">${esc(oppNick)}</div><div class="dp-pts" id="dp-opp-score">0</div></div>
    </div>
    <div class="duel-card-area" id="duelCardArea"><div class="duel-status">En attente de la première question…</div></div>
    <div id="duelInputArea"></div>
  </div>`;
  if(document.getElementById('onRoom')) document.getElementById('onRoom').style.display='block';
}
function sendDuelCard() { if(!duelState.active)return; if(duelState.idx>=duelState.deckCards.length){sendDuelEnd();return;} const card=duelState.deckCards[duelState.idx]; duelState.locked=false; mpSend({type:'duel_card',card:{q:card.q,a:card.a},idx:duelState.idx}); displayDuelCard(card); }
function recvDuelCard(data) { duelState.idx=data.idx; duelState.locked=false; displayDuelCard(data.card); }
function displayDuelCard(card) {
  const area=document.getElementById('duelCardArea'), inp=document.getElementById('duelInputArea'); if(!area||!inp) return;
  area.innerHTML=`<div class="duel-q">${esc(card.q)}</div>`;
  inp.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
    <input type="text" class="fi" id="duelInp" placeholder="Tapez votre réponse…" autocomplete="off" autocorrect="off" spellcheck="false" style="font-size:15px;text-align:center;max-width:420px;"/>
    <button class="btn btnp" onclick="submitDuelAnswer('${esc(card.a)}')">Valider ✓</button>
  </div>`;
  setTimeout(()=>{ const i=document.getElementById('duelInp'); if(i)i.focus(); },80);
  document.getElementById('duelInp')?.addEventListener('keydown',e=>{ if(e.key==='Enter') submitDuelAnswer(card.a); });
}
function submitDuelAnswer(correct) {
  if(duelState.locked) return;
  const inp=document.getElementById('duelInp'); if(!inp||!inp.value.trim()){inp?.focus();return;}
  if(checkAns(inp.value,correct,{flexible:true})){
    duelState.locked=true; duelState.myScore++;
    updateDuelScores(); mpSend({type:'duel_hit',scorer:mpN,idx:duelState.idx});
    burstConfetti(window.innerWidth/2, window.innerHeight/2);
    toast('+1 ⚡ Tu as répondu le premier !','🏆');
    bumpDaily(1);
    if(duelState.isHost) setTimeout(()=>{ duelState.idx++; sendDuelCard(); },1900);
  } else {
    shakeEl('duelInp');
    inp.value=''; inp.focus();
  }
}
function recvDuelHit(data) { if(data.scorer!==mpN){duelState.oppScore++;duelState.locked=true;} updateDuelScores(); toast(`${esc(data.scorer)} a répondu en premier !`,'⚡'); if(!duelState.isHost){const inp=document.getElementById('duelInp');if(inp)inp.disabled=true;} }
function updateDuelScores() { const me=document.getElementById('dp-my-score'),op=document.getElementById('dp-opp-score'); if(me)me.textContent=duelState.myScore; if(op)op.textContent=duelState.oppScore; const dp1=document.getElementById('dp-me'),dp2=document.getElementById('dp-opp'); if(dp1&&dp2){dp1.classList.toggle('leader',duelState.myScore>duelState.oppScore);dp2.classList.toggle('leader',duelState.oppScore>duelState.myScore);} }
function sendDuelEnd() { mpSend({type:'duel_end'}); showDuelEnd(); }
function recvDuelEnd() { showDuelEnd(); }
function showDuelEnd() {
  const area=document.getElementById('duelInputArea'); if(!area) return;
  const win=duelState.myScore>duelState.oppScore, tie=duelState.myScore===duelState.oppScore;
  if(win) burstConfetti(window.innerWidth/2, window.innerHeight/3);
  area.innerHTML=`<div class="cc" style="padding:20px 0;">
    <div class="ccico">${win?'🏆':tie?'🤝':'💪'}</div>
    <div class="cctitle">${win?'Tu as gagné !':tie?'Égalité !':'Bien joué !'}</div>
    <div class="rg">
      <div class="rstat"><div class="rnum" style="color:var(--vi)">${duelState.myScore}</div><div style="font-size:12px;color:var(--tx-m)">Tes points</div></div>
      <div class="rstat"><div class="rnum" style="color:var(--tx-m)">${duelState.oppScore}</div><div style="font-size:12px;color:var(--tx-m)">Adversaire</div></div>
    </div>
    <button class="btn btnp" onclick="duelState.active=false;document.getElementById('duelArea')?.remove()">Fermer</button>
  </div>`;
  duelState.active=false;
}

/* ═══════ SYNCHRONISATION ═══════ */
let syncP=null;

/* Étape 1 : afficher le panneau d'envoi selon la commande */
function openSyncSend() {
  const area=document.getElementById('syncPanel'); if(area) area.style.display='block';
  genSyncQR();
}
function openSyncReceive() {
  const a=document.getElementById('syncReceivePanel'); if(a) a.style.display='block';
}

function genSyncQR() {
  const area=document.getElementById('syncSend'); if(!area) return;
  area.style.display='block';
  const id='SYNC-'+(Math.random().toString(36).substr(2,5).toUpperCase());
  document.getElementById('syncId').textContent=id;
  const qe=document.getElementById('qrcode'); qe.innerHTML='';
  try{ new QRCode(qe,{text:location.href.split('?')[0]+'?sid='+id,width:160,height:160,colorDark:'#1C1B2E',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M}); }
  catch{ qe.innerHTML='<p style="font-size:12px;color:var(--tx-m)">QR Code indisponible</p>'; }
  if(syncP) syncP.destroy();
  syncP=new Peer(id,{debug:0});
  syncP.on('open',()=>toast('Prêt à envoyer ! Scannez le QR code.','📡'));
  syncP.on('connection',c=>{
    c.on('open',()=>{ c.send({type:'sd',decks:S.decks,stats:S.stats}); toast('Cartes envoyées, attente de confirmation…','⏳'); });
    c.on('data',d=>{ if(d.type==='ack'){ toast('Transfert réussi ✅'); setTimeout(()=>{try{c.close();}catch{}},400); setTimeout(()=>{try{if(syncP)syncP.destroy();syncP=null;}catch{}},1000); } });
    c.on('close',()=>{try{if(syncP)syncP.destroy();syncP=null;}catch{}});
  });
  syncP.on('error',()=>{});
}
function syncReceive() {
  const id=document.getElementById('syncRcvId').value.trim().toUpperCase();
  if(!id){toast('Entrez le code de l\'autre appareil','⚠️');return;}
  const p=new Peer('R-'+Date.now(),{debug:0});
  p.on('open',()=>{
    const c=p.connect(id,{reliable:true});
    c.on('open',()=>toast('Connexion établie, réception…','📡'));
    c.on('data',d=>{
      if(d.type==='sd'){
        const cnt=d.decks.reduce((s,dk)=>s+dk.cards.length,0);
        if(!confirm(`Recevoir ${d.decks.length} paquet(s) (${cnt} cartes) ?`)){ c.send({type:'ack'}); p.destroy(); return; }
        mergeDecksSync(d.decks);
        c.send({type:'ack'});
        setTimeout(()=>{try{p.destroy();}catch{}},600);
        toast('Synchronisation réussie 🎉');
      }
    });
    c.on('error',()=>{toast('Code invalide ou expiré','❌');p.destroy();});
    c.on('close',()=>{try{p.destroy();}catch{}});
  });
  p.on('error',()=>toast('Connexion impossible','❌'));
}
function mergeDecksSync(remoteDecks) {
  remoteDecks.forEach(rd=>{
    const ex=S.decks.find(dk=>dk.name===rd.name);
    if(ex){
      rd.cards.forEach(rc=>{
        const lc=ex.cards.find(c=>c.q===rc.q);
        if(!lc){ ex.cards.push({...rc,lastModified:rc.lastModified||Date.now()}); }
        else if((rc.lastModified||0)>(lc.lastModified||0)) Object.assign(lc,rc);
      });
    } else { S.decks.push(rd); }
  });
  save(); renderHome(); renderDeckMgr(); renderLearnSetup(); refreshImports();
}

/* ═══════ PWA & MISE À JOUR ═══════ */
let dip=null;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); dip=e; document.getElementById('installBtn').style.display='flex'; });
function installPWA() { if(dip){ dip.prompt(); dip.userChoice.then(()=>{ dip=null; document.getElementById('installBtn').style.display='none'; }); } }

if('serviceWorker' in navigator) {
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        nw.addEventListener('statechange',()=>{
          if(nw.state==='installed'&&navigator.serviceWorker.controller) showUpdateBanner();
        });
      });
    }).catch(()=>{});
  });
  navigator.serviceWorker.addEventListener('message',e=>{ if(e.data?.type==='SW_UPDATED') showUpdateBanner(); });
}
function showUpdateBanner() { const b=document.getElementById('updateBanner'); if(b) b.classList.add('show'); }
function applyUpdate() { window.location.reload(); }

/* ═══════ SUPPRIMER LES DONNÉES ═══════ */
function clearAll() {
  if(!confirm('⚠️ Effacer toutes vos données ?\nUn fichier de sauvegarde sera téléchargé automatiquement.')) return;
  const blob=new Blob([JSON.stringify({decks:S.decks,stats:S.stats},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='sauvegarde-cards-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>{ localStorage.clear(); location.reload(); },500);
}

/* ═══════ INIT ═══════ */
(()=>{
  const p=new URLSearchParams(location.search);
  const sid=p.get('sid');
  if(sid){ navigate('infos'); const el=document.getElementById('syncRcvId'); if(el)el.value=sid; setTimeout(syncReceive,1500); }
  if(p.get('action')==='resume'&&S.session) setTimeout(resumeSession,500);
  if(p.get('mode')==='srs') setTimeout(()=>{ navigate('apprendre'); const el=document.querySelector('[data-mode="srs"]'); if(el) pickMode(el,'srs'); },400);
})();

renderHome();
window.addEventListener('load',()=>{ renderActivityChart(); });
renderLearnSetup();
refreshImports();
