// 대학별 편입영어 모의고사 공통 스크립트 — 지문 묶음(지문 하나에 문항 여러 개)을 지원한다
// 페이지에서 먼저 window.TF = { school:'skku', bank:'/transfer-skku-bank.json', fb:'tf-skku' } 을 정한다.
// 문제 파일: {school,title,source,checked,minutes,sections:[{id,name}],passages:[{id,text}],q:[[id,회차,영역id,지문id|null,문제,[보기],[정답번호],해설]]}
(function(){
const C=window.TF||{};
const $=id=>document.getElementById(id);
const CIRC=['①','②','③','④','⑤'];
// 기록은 회차별로 따로: tf_last_<학교>_r<회차>. 문항 id 는 회차 안에서만 겹치지 않는다
const ev=(name,p)=>{ if(typeof gtag==='function') gtag('event','tf_'+name,Object.assign({school:C.school,round:ROUND},p)); };
let T0=0, BANK=null, SEC={}, PSG={}, LIMIT=0, ROUNDS=[], ROUND=1, POINTS=null, PENALTY=0;
// 문항별 배점(데이터 최상위 points:[[시작id,끝id,점수],…])이 있으면 끝 화면 점수를 배점 합으로
const fr=v=>({0.25:'1/4',0.5:'1/2',0.2:'1/5',0.3333:'1/3'})[v]||`${Math.round(v*100)}%`;
const ptOf=q=>{ if(!POINTS) return 1; const r=POINTS.find(([a,b])=>q[0]>=a&&q[0]<=b); return r? r[2] : 0; };
const storeKey=()=>'tf_last_'+C.school+'_r'+ROUND;
let mode='exam', set=[], idx=0, ans={}, marks={}, checked=false, right=0, wrong=[], timer=null, left=0, retryRun=false;
const show=(id,on)=>{ const e=$(id); if(e) e.classList.toggle('hidden',!on); };
// 문항 글: 밑줄 <u>…</u> 만 살리고 나머지는 글자 그대로
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rich=s=>esc(s).replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/g,'<u>$1</u>');
const plain=s=>String(s).replace(/<\/?u>/g,'');
// 낱말 상자(보기 20개): 번호 대신 (A)~(T), 지문 id 가 -box 로 끝나면 상자를 격자로 그린다
const lab=(q,i)=> q[5].length>5? String.fromCharCode(65+i) : CIRC[i];
const isBoxP=pid=>/-box$/.test(String(pid));
const boxHtml=t=>{ const m=[...String(t).matchAll(/\(([A-T])\)\s*([^()]+?)(?=\s*\([A-T]\)|\s*$)/g)]; return m.length? '<div class="boxgrid">'+m.map(x=>'<span><b>'+x[1]+'</b> '+esc(x[2].trim())+'</span>').join('')+'</div>' : paras(t); };
const paras=s=>String(s).split(/\n+/).map(p=>'<p>'+rich(p)+'</p>').join('');
function store(){ try{ return JSON.parse(localStorage.getItem(storeKey()))||null; }catch(e){ return null; } }
function save(v){ try{ localStorage.setItem(storeKey(),JSON.stringify(v)); }catch(e){} }

function load(){
  $('startExam').disabled=true; $('startPrac').disabled=true; $('loadmsg').textContent='문제를 불러오는 중이에요…';
  fetch(C.bank).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(d=>{
    BANK=d.q; SEC={}; d.sections.forEach(s=>{ SEC[s.id]=s.name; }); PSG={}; (d.passages||[]).forEach(p=>{ PSG[p.id]=p.text; });
    /* 시험 시간이 없는 학교(minutes null)는 시간 제한 없이 풀고 걸린 시간만 보여 준다 */ LIMIT=Number(d.minutes)>0? Number(d.minutes)*60 : 0; POINTS=Array.isArray(d.points)&&d.points.length? d.points : null; PENALTY=Number(d.penalty)>0&&Number(d.penalty)<1? Number(d.penalty) : 0;
    const rn=$('rulenote'); if(rn){ rn.textContent=(PENALTY? `실전 모드는 이 학교 방식대로 틀린 문항마다 그 문항 배점의 ${fr(PENALTY)}을 빼요(답하지 않은 문항은 0점). 한 문제씩 풀기는 감점하지 않아요. ` : '')+(LIMIT? '' : `${C.name||'이 학교'} 문제지에는 시험 시간이 적혀 있지 않아 시간 제한 없이 풀어요. 실전 모드는 끝나면 걸린 시간을 보여 줘요.`); show('rulenote',!!PENALTY||!LIMIT); } ROUNDS=[...new Set(BANK.map(q=>q[1]))].sort((a,b)=>a-b);
    if(!ROUNDS.includes(ROUND)) ROUND=ROUNDS[0];
    const rs=$('rounds'); rs.textContent='';
    ROUNDS.forEach(r=>{ const b=document.createElement('button'); b.type='button'; b.textContent=r+'회'; b.dataset.r=r; b.setAttribute('aria-pressed',r===ROUND?'true':'false'); if(r===ROUND) b.classList.add('on');
      b.addEventListener('click',()=>{ ROUND=r; rs.querySelectorAll('button').forEach(x=>{ const on=+x.dataset.r===r; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on?'true':'false'); }); label(); lastBox(); }); rs.appendChild(b); });
    show('roundwrap',ROUNDS.length>1); label();
    $('startExam').disabled=false; $('startPrac').disabled=false; $('loadmsg').textContent=''; show('retry',false); lastBox();
  }).catch(()=>{ $('loadmsg').textContent='문제를 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.'; show('retry',true); });
}
const roundQs=()=>BANK.filter(q=>q[1]===ROUND);
function label(){ $('startExam').textContent=`${ROUNDS.length>1?ROUND+'회 ':''}실전 모드 (${roundQs().length}문항 · ${LIMIT? LIMIT/60+'분' : '시간 제한 없음'})`; $('startPrac').textContent=`${ROUNDS.length>1?ROUND+'회 ':''}한 문제씩 풀기`; }
// 이 기기에 남은 지난번 틀린 문제
function lastBox(){
  const L=store(), b=$('lastwrap'); b.textContent=''; if(!L||!BANK) return;
  const ids=new Set(L.wrong||[]), qs=roundQs().filter(q=>ids.has(q[0]));
  const p=document.createElement('p'); p.className='note'; p.textContent=`${ROUNDS.length>1?ROUND+'회 ':''}지난번 기록(${L.d}): ${L.n}문항 중 ${L.c}문항 맞음`+(qs.length?` · 틀린 문제 ${qs.length}개`:''); b.appendChild(p);
  if(qs.length){ const btn=document.createElement('button'); btn.type='button'; btn.className='btn-ghost'; btn.textContent='지난번 틀린 문제 다시 풀기'; btn.addEventListener('click',()=>startPrac(qs,true)); const row=document.createElement('div'); row.className='btn-row'; row.appendChild(btn); b.appendChild(row); }
}

function startExam(){
  set=roundQs(); mode='exam'; idx=0; ans={}; marks={}; begin();
  T0=Date.now(); clearInterval(timer);
  if(LIMIT){ left=LIMIT; tick(); timer=setInterval(()=>{ left--; tick(); if(left<=0){ clearInterval(timer); finishExam(true); } },1000); }
  ev('started',{mode:'exam'});
}
function startPrac(list,retry){
  mode='prac'; retryRun=!!retry; set= list? list.slice() : roundQs();
  idx=0; right=0; wrong=[]; ans={}; begin();
  if(!list) ev('started',{mode:'practice'});
}
function begin(){
  show('setup',false); show('result',false); show('quiz',true);
  show('timer',mode==='exam'&&LIMIT>0); show('sheetwrap',mode==='exam'); show('prev',mode==='exam'); show('submit',mode==='exam'); show('mark',mode==='exam'); show('check',mode==='prac');
  render(); $('quiz').scrollIntoView({block:'start'});
}
function tick(){ const h=Math.floor(left/3600), m=Math.floor(left%3600/60), s=left%60; $('timer').textContent=`남은 시간 ${h?h+':'+String(m).padStart(2,'0'):m}:${String(s).padStart(2,'0')}`; $('timer').classList.toggle('low',left<=300); }
function render(){
  const q=set[idx]; checked=false;
  $('qno').textContent=`${SEC[q[2]]||''} · ${idx+1} / ${set.length}`;
  $('qbar').style.width=(idx/set.length*100)+'%';
  const pid=q[3], ps=$('psg');
  if(pid && PSG[pid]!=null){
    const same=set.filter(x=>x[3]===pid), first=set.indexOf(same[0])+1, last=set.indexOf(same[same.length-1])+1, rng= same.length>1? `[${first}~${last}]` : `[${first}]`;
    const isBox=isBoxP(pid);
    $('psglb').textContent= isBox? `${rng} 아래 상자에서 빈칸에 알맞은 낱말을 고르세요.` : `${rng} 다음 글을 읽고 물음에 답하세요.`;
    $('psgtx').innerHTML= isBox? boxHtml(PSG[pid]) : paras(PSG[pid]); ps.classList.remove('hidden'); $('qwrap').classList.toggle('two',!isBox);
  } else { ps.classList.add('hidden'); $('qwrap').classList.remove('two'); }
  $('qtext').innerHTML=rich(q[4]);
  const box=$('opts'); box.textContent=''; box.classList.toggle('many',q[5].length>5);
  q[5].forEach((t,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='opt'; b.dataset.i=i+1;
    const no=document.createElement('span'); no.className='no'; no.textContent= q[5].length>5? lab(q,i) : i+1;
    const tx=document.createElement('span'); tx.innerHTML=rich(t);
    b.appendChild(no); b.appendChild(tx); b.addEventListener('click',()=>pick(i+1)); box.appendChild(b);
  });
  markSel(); show('expl',false); $('expl').textContent='';
  if(mode==='prac'){ $('check').disabled=!ans[idx]; show('check',true); show('next',false); }
  else { $('prev').disabled= idx===0; $('next').textContent= idx+1<set.length? '다음' : '마지막 문제예요'; $('next').disabled= idx+1>=set.length; show('next',true); $('mark').textContent= marks[idx]? '표시 지우기' : '다시 볼 문제 표시'; drawSheet(); }
}
function markSel(){ document.querySelectorAll('#opts .opt').forEach(b=>b.classList.toggle('sel',ans[idx]===+b.dataset.i)); }
function pick(i){ if(checked) return; ans[idx]=i; markSel(); if(mode==='prac') $('check').disabled=false; else drawSheet(); }
function drawSheet(){
  const sh=$('sheet'); sh.textContent='';
  set.forEach((q,i)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=i+1; b.setAttribute('aria-label',`${i+1}번${ans[i]?' (답함)':''}${marks[i]?' (표시함)':''}`);
    if(ans[i]) b.classList.add('done'); if(marks[i]) b.classList.add('mk'); if(i===idx) b.classList.add('cur'); b.addEventListener('click',()=>{ idx=i; render(); }); sh.appendChild(b); });
  const nm=Object.keys(marks).filter(k=>marks[k]).length;
  $('sheetinfo').textContent=`답한 문제 ${Object.keys(ans).length} / ${set.length}`+(nm?` · 표시한 문제 ${nm}`:'');
}
const answerEv=(q,ok,m)=>({qid:q[0],section:q[2],result:ok?'correct':'wrong',mode:m});
function check(){
  const q=set[idx], a=q[6][0], ok=ans[idx]===a; checked=true;
  if(ok) right++; else wrong.push(q);
  ev('answer',answerEv(q,ok,'practice'));
  document.querySelectorAll('#opts .opt').forEach(b=>{ const i=+b.dataset.i; b.disabled=true; b.classList.remove('sel'); if(i===a) b.classList.add('right'); else if(i===ans[idx]) b.classList.add('wrong'); });
  const e=$('expl'); e.textContent='';
  const h=document.createElement('b'); h.className=ok?'ok':'no'; h.textContent=(ok?'맞았어요. ':'틀렸어요. ')+'정답 '+lab(q,a-1);
  const p=document.createElement('div'); p.style.marginTop='6px'; p.textContent='해설: '+q[7];
  e.appendChild(h); e.appendChild(p); show('expl',true);
  show('check',false); show('next',true); $('next').disabled=false; $('next').textContent= idx+1<set.length? '다음 문제' : '결과 보기';
}
// 영역별 정답률 막대
function secBars(list, okOf){
  const ids=[...new Set(list.map(q=>q[2]))], w=document.createElement('div'); w.className='secs';
  const h=document.createElement('h2'); h.textContent='영역별 정답률'; w.appendChild(h);
  ids.forEach(id=>{ const qs=list.filter(q=>q[2]===id), c=qs.filter(okOf).length, pct=Math.round(c/qs.length*100);
    const row=document.createElement('div'); row.className='srow';
    const n=document.createElement('span'); n.className='sn'; n.textContent=SEC[id]||id;
    const bar=document.createElement('span'); bar.className='sbar'; const i=document.createElement('i'); i.style.width=pct+'%'; bar.appendChild(i);
    const v=document.createElement('span'); v.className='sv'; v.textContent=`${c}/${qs.length} · ${pct}%`;
    row.appendChild(n); row.appendChild(bar); row.appendChild(v); w.appendChild(row); });
  return w;
}
function reviewList(list, into){
  if(!list.length) return;
  const rv=document.createElement('div'); rv.className='review'; const h=document.createElement('h2'); h.textContent='틀린 문제'; rv.appendChild(h);
  list.forEach(({q,mine})=>{ const d=document.createElement('details'); const s=document.createElement('summary'); s.textContent=`${SEC[q[2]]||''} · ${plain(q[4])}`;
    d.appendChild(s);
    if(q[3] && PSG[q[3]]!=null){ const pd=document.createElement('details'); pd.className='rpsg'; const ps=document.createElement('summary'); ps.textContent='지문 보기'; const pt=document.createElement('div'); pt.className='psgtx'; pt.innerHTML=paras(PSG[q[3]]); pd.appendChild(ps); pd.appendChild(pt); d.appendChild(pd); }
    if(mine!==undefined){ const p0=document.createElement('p'); p0.textContent= mine? '내 답: '+lab(q,mine-1)+' '+plain(q[5][mine-1]) : '내 답: 고르지 않음'; d.appendChild(p0); }
    const a=document.createElement('p'); a.textContent='정답: '+lab(q,q[6][0]-1)+' '+plain(q[5][q[6][0]-1]);
    const e=document.createElement('p'); e.textContent='해설: '+q[7];
    d.appendChild(a); d.appendChild(e); rv.appendChild(d); });
  into.appendChild(rv);
}
function today(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function finishExam(timeout){
  clearInterval(timer); show('quiz',false); show('result',true);
  const wl=[]; let cnt=0;
  set.forEach((q,i)=>{ const ok=ans[i]===q[6][0]; if(ok) cnt++; else wl.push({q,mine:ans[i]}); ev('answer',answerEv(q,ok,'exam')); });
  const raw=set.reduce((a,q,i)=>a+(ans[i]===q[6][0]?ptOf(q):0),0), full=Math.round(set.reduce((a,q)=>a+ptOf(q),0)*100)/100;
  const minus=PENALTY? set.reduce((a,q,i)=>a+(ans[i]&&ans[i]!==q[6][0]?ptOf(q)*PENALTY:0),0) : 0;
  const got=Math.max(0,Math.round((raw-minus)*100)/100);
  const score= POINTS? got : Math.round(got/set.length*1000)/10; const r=$('result'); r.textContent='';
  if(timeout){ const n=document.createElement('p'); n.className='note'; n.textContent=`${LIMIT/60}분이 지나 자동으로 채점했어요.`; r.appendChild(n); }
  if(!LIMIT){ const sec=Math.round((Date.now()-T0)/1000), n=document.createElement('p'); n.className='note'; n.textContent=`걸린 시간 ${Math.floor(sec/60)}분 ${sec%60}초`; r.appendChild(n); }
  const big=document.createElement('div'); big.className='big-result'; big.textContent=`${set.length}문항 중 ${cnt}문항 맞았어요`;
  const sm=document.createElement('small'); sm.textContent=(POINTS? `(배점 합 ${got}점 / ${full}점` : `(100점 환산 ${score}점`)+(PENALTY? (POINTS? ` · 오답 감점 ${Math.round(minus*100)/100}점 반영)` : ' · 오답 감점 반영)') : ')'); big.appendChild(sm); r.appendChild(big);
  r.appendChild(secBars(set,q=>ans[set.indexOf(q)]===q[6][0]));
  const note=document.createElement('p'); note.className='note'; note.textContent=(POINTS? '문항별 배점을 더한 점수예요. ' : '맞은 문항 수를 100점으로 환산한 점수예요. ')+(PENALTY? `틀린 문항은 배점의 ${fr(PENALTY)}을 뺐고, 답하지 않은 문항은 0점으로 셌어요. ` : '')+'실제 시험 점수와는 다를 수 있어요.'; r.appendChild(note);
  r.appendChild(buttons(wl.map(x=>x.q)));
  reviewList(wl, r); r.appendChild(fbForm(wl.map(x=>x.q), set)); r.scrollIntoView({block:'start'});
  save({d:today(), n:set.length, c:cnt, wrong:wl.map(x=>x.q[0])});
  ev('result',Object.assign({score}, POINTS? {full} : {}, PENALTY? {penalty:PENALTY} : {}));
}
function finishPrac(){
  const n=idx+(checked?1:0); show('quiz',false);
  if(n===0){ toStart(); return; }
  show('result',true); const r=$('result'); r.textContent='';
  const done=set.slice(0,n), wset=new Set(wrong);
  const big=document.createElement('div'); big.className='big-result'; big.textContent=`${n}문항 중 ${right}문항 맞았어요`;
  const sm=document.createElement('small'); sm.textContent=`정답률 ${(right/n*100).toFixed(1)}%`; big.appendChild(sm);
  r.appendChild(big); r.appendChild(secBars(done,q=>!wset.has(q))); r.appendChild(buttons(wrong.slice())); reviewList(wrong.map(q=>({q})), r);
  r.appendChild(fbForm(wrong.slice(), done)); r.scrollIntoView({block:'start'});
  // 다시 풀기 기록: 이번에 다시 맞힌 문제는 지난번 틀린 목록에서 뺀다
  const L=store();
  if(retryRun && L){ const fixed=new Set(done.filter(q=>!wset.has(q)).map(q=>q[0])); L.wrong=(L.wrong||[]).filter(id=>!fixed.has(id)); save(L); }
  else if(!retryRun) save({d:today(), n, c:right, wrong:wrong.map(q=>q[0])});
}
function buttons(wl){
  const row=document.createElement('div'); row.className='btn-row';
  if(wl.length){ const rw=document.createElement('button'); rw.className='btn'; rw.textContent='틀린 문제만 다시 풀기'; rw.addEventListener('click',()=>startPrac(wl.slice(),true)); row.appendChild(rw); }
  const again=document.createElement('button'); again.className= wl.length? 'btn-ghost' : 'btn'; again.textContent='처음부터 다시'; again.addEventListener('click',toStart); row.appendChild(again);
  return row;
}
// 의견 보내기: 글 10~500자 + (선택) 문항·응시 여부. 서버는 IP 를 저장하지 않는다
function fbForm(wrongQs, solved){
  const d=document.createElement('details'); d.className='fb';
  const s=document.createElement('summary'); s.textContent='이 모의고사에 대한 의견 남기기'; d.appendChild(s);
  const g=document.createElement('p'); g.className='note'; g.textContent='실제 시험 문제 문장은 적지 말아 주세요. 이름·연락처 같은 개인정보도 적지 말아 주세요. 답장은 드리지 않아요.'; d.appendChild(g);
  const ta=document.createElement('textarea'); ta.maxLength=500; ta.placeholder='문제가 이상했던 점, 해설이 헷갈린 점 등을 10자 이상 적어 주세요.'; ta.setAttribute('aria-label','의견 글'); d.appendChild(ta);
  const sel=document.createElement('select'); sel.setAttribute('aria-label','의견을 남길 문항(선택)');
  const o0=document.createElement('option'); o0.value=''; o0.textContent='문항 고르기(선택)'; sel.appendChild(o0);
  const seen=new Set(); [...wrongQs, ...solved].forEach(q=>{ if(seen.has(q[0])) return; seen.add(q[0]); const o=document.createElement('option'); o.value=q[0]; const t=plain(q[4]); o.textContent=`${wrongQs.includes(q)?'[틀림] ':''}${SEC[q[2]]||''} · ${t.length>28?t.slice(0,28)+'…':t}`; sel.appendChild(o); });
  const took=document.createElement('select'); took.setAttribute('aria-label','실제 시험 응시 여부(선택)');
  [['','실제 시험 응시 여부(선택)'],['yes','실제 시험을 봤어요'],['no','아직 안 봤어요']].forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.textContent=t; took.appendChild(o); });
  const row=document.createElement('div'); row.className='fb-row'; row.appendChild(sel); row.appendChild(took); d.appendChild(row);
  const hp=document.createElement('input'); hp.type='text'; hp.name='website'; hp.tabIndex=-1; hp.autocomplete='off'; hp.className='fb-hp'; hp.setAttribute('aria-hidden','true'); d.appendChild(hp);
  const btn=document.createElement('button'); btn.type='button'; btn.className='btn'; btn.textContent='의견 보내기';
  const st=document.createElement('p'); st.className='status'; st.setAttribute('role','status');
  const br=document.createElement('div'); br.className='btn-row'; br.appendChild(btn); d.appendChild(br); d.appendChild(st);
  btn.addEventListener('click',async()=>{
    const text=ta.value.trim();
    if(text.length<10){ st.textContent='10자 이상 적어 주세요.'; return; }
    btn.disabled=true; st.textContent='보내는 중이에요…';
    try{
      const r=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tool:C.fb,text,qid:sel.value?ROUND*100+Number(sel.value):null,took:took.value||null,website:hp.value})});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){ st.textContent='보내 주셔서 고마워요. 문제를 고칠 때 참고할게요.'; ta.value=''; ta.disabled=true; sel.disabled=true; took.disabled=true; ev('feedback',{}); return; }
      st.textContent= j.error==='daily_full'? '오늘은 의견이 많아 잠시 뒤에 다시 보내 주세요.' : '잠시 뒤 다시 보내 주세요.';
    }catch(e){ st.textContent='잠시 뒤 다시 보내 주세요.'; }
    btn.disabled=false;
  });
  return d;
}
function toStart(){ clearInterval(timer); show('quiz',false); show('result',false); show('setup',true); lastBox(); $('setup').scrollIntoView({block:'start'}); }
$('startExam').addEventListener('click',()=>{ if(BANK) startExam(); });
$('startPrac').addEventListener('click',()=>{ if(BANK) startPrac(); });
$('retry').addEventListener('click',load);
$('prev').addEventListener('click',()=>{ if(idx>0){ idx--; render(); } });
$('next').addEventListener('click',()=>{ if(mode==='exam'){ if(idx+1<set.length){ idx++; render(); } return; } if(idx+1<set.length){ const keep=set[idx][3] && set[idx][3]===set[idx+1][3]; idx++; render(); if(!keep) $('quiz').scrollIntoView({block:'start'}); else $('qtext').scrollIntoView({block:'center'}); } else finishPrac(); });
$('mark').addEventListener('click',()=>{ marks[idx]=!marks[idx]; render(); });
$('check').addEventListener('click',check);
$('submit').addEventListener('click',()=>{ const n=set.length-Object.keys(ans).length; if(n>0 && !confirm(`아직 답하지 않은 문제가 ${n}개 있어요. 제출하고 채점할까요?`)) return; finishExam(false); });
$('quit').addEventListener('click',()=>{ if(mode==='prac' && (idx>0||checked)) finishPrac(); else toStart(); });
load();
})();
