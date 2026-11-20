// 자격증 필기 모의고사 공통 스크립트 (computer-skills-2 틀을 여러 시험용으로 일반화)
// 페이지에서 먼저 window.CERT = { key, bank, std, judge:'avg'|'theory', theory:{per:2, total:30, pass:70} } 을 정한다.
// 과목 이름·과목별 문항 수·시간은 문제 파일(bank)의 subjects·exam 에서 읽는다.
(function(){
const C=window.CERT||{};
const $=id=>document.getElementById(id);
const CIRC=['①','②','③','④'];
const STD=C.std||'';
const ev=(name,p)=>{ if(typeof gtag==='function') gtag('event',C.key+'_'+name,p); };
const answerEv=(q,ok,m)=>({qid:q[0],subject:q[1],item:q[2],result:ok?'correct':'wrong',std:STD,mode:m});
let BANK=null, SUBJ={}, SUBS=[], PER={}, LIMIT=0, NEW=new Set(), NEW_FROM=null;
let mode='exam', set=[], idx=0, ans={}, checked=false, right=0, wrong=[], timer=null, left=0;
const show=(id,on)=>{ const e=$(id); if(e) e.classList.toggle('hidden',!on); };
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const isNew=q=>NEW.has(q[0]);
const short=s=>{ const m=String(SUBJ[s]||'').match(/^\S+/); return m? m[0] : ''; };
const totalQ=()=>SUBS.reduce((a,s)=>a+PER[s],0);

function load(){
  $('startExam').disabled=true; $('startPrac').disabled=true; $('loadmsg').textContent='문제를 불러오는 중이에요…';
  fetch(C.bank).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(d=>{
    BANK=d.q; SUBJ=d.subjects; SUBS=Object.keys(SUBJ).map(Number).sort((a,b)=>a-b);
    SUBS.forEach(s=>{ PER[s]=Number(d.exam.per[s]); }); LIMIT=Number(C.minutesOverride||d.exam.minutes)*60;
    NEW=new Set(d.sinceNext||[]); NEW_FROM= d.nextFrom? new Date(d.nextFrom+'T00:00:00') : null;
    const ps=$('psub'); ps.textContent='';
    SUBS.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=SUBJ[s]; ps.appendChild(o); });
    show('psubwrap',SUBS.length>1);
    $('startExam').disabled=false; $('startPrac').disabled=false; $('loadmsg').textContent=''; show('retry',false);
  }).catch(()=>{ $('loadmsg').textContent='문제를 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.'; show('retry',true); });
}
// 질문 글: 표(<table>)가 있으면 글과 표를 나눠 그린다(문제 자료는 이 사이트가 만든 것)
function drawQ(q){
  const t=q[3], i=t.indexOf('<table>');
  $('qtext').textContent= i<0? t : t.slice(0,i);
  const tb=$('qtbl'); tb.innerHTML= i<0? '' : t.slice(i); show('qtbl',i>=0);
  show('tag27', mode==='prac' && isNew(q));
}
function qPlain(q){ const i=q[3].indexOf('<table>'); return i<0? q[3] : q[3].slice(0,i)+' (표 문제)'; }

function startExam(){
  const now=new Date();
  const pool=BANK.filter(q=>!isNew(q) || (NEW_FROM && now>=NEW_FROM));
  set=SUBS.flatMap(s=>shuffle(pool.filter(q=>q[1]===s)).slice(0,PER[s]));
  mode='exam'; idx=0; ans={}; begin();
  left=LIMIT; tick(); clearInterval(timer); timer=setInterval(()=>{ left--; tick(); if(left<=0){ clearInterval(timer); finishExam(true); } },1000);
  ev('started',{mode:'exam'});
}
function startPrac(list){
  const s=+$('psub').value||SUBS[0]; mode='prac';
  set= list || shuffle(BANK.filter(q=>q[1]===s)).slice(0,Math.max(PER[s],10));
  idx=0; right=0; wrong=[]; ans={}; begin();
  if(!list) ev('started',{mode:'practice'});
}
function begin(){
  show('setup',false); show('result',false); show('quiz',true);
  show('timer',mode==='exam'); show('sheetwrap',mode==='exam'); show('prev',mode==='exam'); show('submit',mode==='exam'); show('check',mode==='prac');
  render(); $('quiz').scrollIntoView({block:'start'});
}
function tick(){ const h=Math.floor(left/3600), m=Math.floor(left%3600/60), s=left%60; $('timer').textContent=`남은 시간 ${h?h+':'+String(m).padStart(2,'0'):m}:${String(s).padStart(2,'0')}`; $('timer').classList.toggle('low',left<=300); }
function render(){
  const q=set[idx]; checked=false;
  const inS= mode==='exam'? set.filter(x=>x[1]===q[1]).indexOf(q)+1 : idx+1;
  const tot= mode==='exam'? PER[q[1]] : set.length;
  $('qno').textContent=`${SUBS.length>1?short(q[1])+' ':''}${inS} / ${tot}`;
  $('qbar').style.width=(idx/set.length*100)+'%';
  drawQ(q);
  const box=$('opts'); box.textContent='';
  q[4].forEach((t,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='opt'; b.dataset.i=i+1;
    const no=document.createElement('span'); no.className='no'; no.textContent=i+1;
    const tx=document.createElement('span'); tx.textContent=t;
    b.appendChild(no); b.appendChild(tx); b.addEventListener('click',()=>pick(i+1)); box.appendChild(b);
  });
  markSel(); show('expl',false); $('expl').textContent='';
  if(mode==='prac'){ $('check').disabled=!ans[idx]; show('check',true); show('next',false); }
  else { $('prev').disabled= idx===0; $('next').textContent= idx+1<set.length? '다음' : '마지막 문제예요'; $('next').disabled= idx+1>=set.length; show('next',true); drawSheet(); }
}
function markSel(){ document.querySelectorAll('#opts .opt').forEach(b=>b.classList.toggle('sel',ans[idx]===+b.dataset.i)); }
function pick(i){ if(checked) return; ans[idx]=i; markSel(); if(mode==='prac') $('check').disabled=false; else drawSheet(); }
function drawSheet(){
  const sh=$('sheet'); sh.textContent='';
  set.forEach((q,i)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=i+1; b.setAttribute('aria-label',`${i+1}번${ans[i]?' (답함)':''}`);
    if(ans[i]) b.classList.add('done'); if(i===idx) b.classList.add('cur'); b.addEventListener('click',()=>{ idx=i; render(); }); sh.appendChild(b); });
  let from=1; const parts=SUBS.length>1? SUBS.map(s=>{ const t=`${from}~${from+PER[s]-1}번 ${short(s)}`; from+=PER[s]; return t; }) : [];
  $('sheetinfo').textContent=`답한 문제 ${Object.keys(ans).length} / ${set.length}`+(parts.length?' · '+parts.join(', '):'');
}
function check(){
  const q=set[idx], a=q[5][0], ok=ans[idx]===a; checked=true;
  if(ok) right++; else wrong.push(q);
  ev('answer',answerEv(q,ok,'practice'));
  document.querySelectorAll('#opts .opt').forEach(b=>{ const i=+b.dataset.i; b.disabled=true; b.classList.remove('sel'); if(i===a) b.classList.add('right'); else if(i===ans[idx]) b.classList.add('wrong'); });
  const e=$('expl'); e.textContent='';
  const h=document.createElement('b'); h.className=ok?'ok':'no'; h.textContent=(ok?'맞았어요. ':'틀렸어요. ')+'정답 '+CIRC[a-1];
  const p=document.createElement('div'); p.style.marginTop='6px'; p.textContent='해설: '+q[6];
  e.appendChild(h); e.appendChild(p); show('expl',true);
  show('check',false); show('next',true); $('next').disabled=false; $('next').textContent= idx+1<set.length? '다음 문제' : '결과 보기';
}
// 합격 판정 — avg: 과목마다 40점 이상 + 평균 60점 이상 / theory: 이론만 푸는 시험(실무 합산 합격선 안내)
function judge(sc,cnt){
  const r1=v=>Math.round(v*10)/10;
  if(C.judge==='theory'){
    const T=C.theory, got=cnt*T.per, need=Math.max(0,T.pass-got);
    return {pass:null, avg:r1(got/T.total*100), got, msg:`이론 ${got}점 / ${T.total}점 — 합격은 이론과 실무를 합쳐 ${T.pass}점 이상이라, 이 점수면 실무에서 ${need}점 이상(${100-T.total}점 만점)이 필요해요.`};
  }
  const avg=r1(SUBS.reduce((a,s)=>a+sc[s],0)/SUBS.length), low=SUBS.filter(s=>sc[s]<40).map(short);
  if(!low.length && avg>=60) return {pass:true, avg, msg:'합격선을 넘었어요 — 과목별 40점, 평균 60점 이상'};
  const why=[]; if(low.length) why.push(`${low.join('·')}이 40점 미만이에요`); if(avg<60) why.push('평균이 60점 미만이에요');
  return {pass:false, avg, msg:'아직 합격선 아래예요 — '+why.join(' / ')};
}
function reviewList(list, into){
  if(!list.length) return;
  const rv=document.createElement('div'); rv.className='review'; const h=document.createElement('h2'); h.textContent='틀린 문제'; rv.appendChild(h);
  list.forEach(({q,mine})=>{ const d=document.createElement('details'); const s=document.createElement('summary'); s.textContent=`${SUBS.length>1?short(q[1])+' · ':''}${qPlain(q)}`;
    const p0=document.createElement('p'); p0.textContent= mine? '내 답: '+CIRC[mine-1]+' '+q[4][mine-1] : '내 답: 고르지 않음';
    const a=document.createElement('p'); a.textContent='정답: '+CIRC[q[5][0]-1]+' '+q[4][q[5][0]-1];
    const e=document.createElement('p'); e.textContent='해설: '+q[6];
    d.appendChild(s); if(q[3].includes('<table>')){ const t=document.createElement('div'); t.className='qtbl'; t.innerHTML=q[3].slice(q[3].indexOf('<table>')); d.appendChild(t); }
    d.appendChild(p0); d.appendChild(a); d.appendChild(e); rv.appendChild(d); });
  into.appendChild(rv);
}
function finishExam(timeout){
  clearInterval(timer); show('quiz',false); show('result',true);
  const sc={}, hit={}, wl=[]; let cnt=0; SUBS.forEach(s=>{ sc[s]=0; hit[s]=0; });
  set.forEach((q,i)=>{ const ok=ans[i]===q[5][0]; if(ok){ hit[q[1]]++; cnt++; } else wl.push({q,mine:ans[i]}); ev('answer',answerEv(q,ok,'exam')); });
  SUBS.forEach(s=>{ sc[s]=Math.round(hit[s]/PER[s]*1000)/10; });
  const j=judge(sc,cnt); const r=$('result'); r.textContent='';
  if(timeout){ const n=document.createElement('p'); n.className='note'; n.textContent=`${LIMIT/60}분이 지나 자동으로 채점했어요.`; r.appendChild(n); }
  const t=document.createElement('table'); const tb=document.createElement('tbody');
  const row=(a,b,bold)=>{ const tr=document.createElement('tr'); const x=document.createElement('td'), y=document.createElement('td'); y.className='r'; x.textContent=a; y.textContent=b; if(bold){ x.style.fontWeight=y.style.fontWeight='700'; } tr.appendChild(x); tr.appendChild(y); tb.appendChild(tr); };
  t.innerHTML='<thead><tr><th>'+(SUBS.length>1?'과목':'구분')+'</th><th class="r">'+(C.judge==='theory'?'맞힌 문제':'점수')+'</th></tr></thead>';
  if(C.judge==='theory'){ SUBS.forEach(s=>row(SUBJ[s],`${hit[s]} / ${PER[s]}`)); row('이론 점수',`${j.got}점 / ${C.theory.total}점`,true); }
  else { SUBS.forEach(s=>row(SUBJ[s],sc[s]+'점')); if(SUBS.length>1) row('평균',j.avg+'점',true); }
  t.appendChild(tb);
  const v=document.createElement('p'); v.className='verdict '+(j.pass===null?'':(j.pass?'pass':'fail')); v.textContent=j.msg;
  const note=document.createElement('p'); note.className='note'; note.textContent=(C.judge==='theory'? `이론 문항당 ${C.theory.per}점으로 셌어요.` : '과목마다 100점 만점으로 환산한 점수예요.')+' 새로 만든 연습 문제라 실제 시험 점수와 같지는 않아요.';
  r.appendChild(t); r.appendChild(v); r.appendChild(note); r.appendChild(buttons(wl.map(x=>x.q)));
  reviewList(wl, r); r.appendChild(fbForm(wl.map(x=>x.q), set)); r.scrollIntoView({block:'start'});
  const p={avg:j.avg,std:STD}; SUBS.forEach(s=>{ p['score'+s]=sc[s]; }); if(j.pass!==null) p.pass=j.pass?1:0;
  ev('result',p);
}
function finishPrac(){
  const n=idx+(checked?1:0); show('quiz',false);
  if(n===0){ toStart(); return; }
  show('result',true); const r=$('result'); r.textContent='';
  const big=document.createElement('div'); big.className='big-result'; big.textContent=`${right} / ${n} 문제`;
  const sm=document.createElement('small'); sm.textContent=`정답률 ${(right/n*100).toFixed(1)}%`; big.appendChild(sm);
  r.appendChild(big); r.appendChild(buttons(wrong.slice())); reviewList(wrong.map(q=>({q,mine:null})), r);
  r.querySelectorAll('.review p').forEach(p=>{ if(p.textContent==='내 답: 고르지 않음') p.remove(); });
  r.appendChild(fbForm(wrong.slice(), set.slice(0,n))); r.scrollIntoView({block:'start'});
}
function buttons(wl){
  const row=document.createElement('div'); row.className='btn-row';
  const again=document.createElement('button'); again.className='btn'; again.textContent='새 문제로 다시 풀기'; again.addEventListener('click',toStart); row.appendChild(again);
  if(wl.length){ const rw=document.createElement('button'); rw.className='btn-ghost'; rw.textContent='틀린 문제만 다시 풀기'; rw.addEventListener('click',()=>startPrac(shuffle(wl.slice()))); row.appendChild(rw); }
  return row;
}
// 의견 보내기: 글 10~500자 + (선택) 문항·응시 여부. 서버는 IP 를 저장하지 않는다
function fbForm(wrongQs, solved){
  const d=document.createElement('details'); d.className='fb';
  const s=document.createElement('summary'); s.textContent='이 모의고사에 대한 의견 남기기'; d.appendChild(s);
  const g=document.createElement('p'); g.className='note'; g.textContent='실제 시험 문제 문장은 적지 말아 주세요. 이름·연락처 같은 개인정보도 적지 말아 주세요. 답장은 드리지 않아요.'; d.appendChild(g);
  const ta=document.createElement('textarea'); ta.maxLength=500; ta.placeholder='문제가 이상했던 점, 실제 시험과 달랐던 점 등을 10자 이상 적어 주세요.'; ta.setAttribute('aria-label','의견 글'); d.appendChild(ta);
  const sel=document.createElement('select'); sel.setAttribute('aria-label','의견을 남길 문항(선택)');
  const o0=document.createElement('option'); o0.value=''; o0.textContent='문항 고르기(선택)'; sel.appendChild(o0);
  const seen=new Set(); [...wrongQs, ...solved].forEach(q=>{ if(seen.has(q[0])) return; seen.add(q[0]); const o=document.createElement('option'); o.value=q[0]; const t=qPlain(q); o.textContent=`${wrongQs.includes(q)?'[틀림] ':''}${SUBS.length>1?short(q[1])+' · ':''}${t.length>28?t.slice(0,28)+'…':t}`; sel.appendChild(o); });
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
      const r=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tool:C.key,text,qid:sel.value?Number(sel.value):null,took:took.value||null,website:hp.value})});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){ st.textContent='보내 주셔서 고마워요. 문제를 고칠 때 참고할게요.'; ta.value=''; ta.disabled=true; sel.disabled=true; took.disabled=true; ev('feedback',{std:STD}); return; }
      st.textContent= j.error==='daily_full'? '오늘은 의견이 많아 잠시 뒤에 다시 보내 주세요.' : '잠시 뒤 다시 보내 주세요.';
    }catch(e){ st.textContent='잠시 뒤 다시 보내 주세요.'; }
    btn.disabled=false;
  });
  return d;
}
function toStart(){ clearInterval(timer); show('quiz',false); show('result',false); show('setup',true); $('setup').scrollIntoView({block:'start'}); }
$('startExam').addEventListener('click',()=>{ if(BANK) startExam(); });
$('startPrac').addEventListener('click',()=>{ if(BANK) startPrac(); });
$('retry').addEventListener('click',load);
$('prev').addEventListener('click',()=>{ if(idx>0){ idx--; render(); } });
$('next').addEventListener('click',()=>{ if(mode==='exam'){ if(idx+1<set.length){ idx++; render(); } return; } if(idx+1<set.length){ idx++; render(); $('quiz').scrollIntoView({block:'start'}); } else finishPrac(); });
$('check').addEventListener('click',check);
$('submit').addEventListener('click',()=>finishExam(false));
$('quit').addEventListener('click',()=>{ if(mode==='prac' && (idx>0||checked)) finishPrac(); else toStart(); });
load();
})();
