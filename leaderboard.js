/* 공용 게임 랭킹 위젯
   사용: LB.init({ game:'order', el:'#lb', lower:true, format:v=>..., label:'기록' })
        LB.submit(score, { duration, meta, units })  → 등록 폼 표시 (units: 타자처럼 단위 수로 검증하는 게임만)
*/
window.LB = (function () {
  const S = { game: null, el: null, lower: false, format: v => v, label: '점수', data: null, tab: 'weekly', pending: null };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = sel => S.el.querySelector(sel);

  function css() {
    if (document.getElementById('lb-css')) return;
    const st = document.createElement('style'); st.id = 'lb-css';
    st.textContent = `.lb{border:1px solid var(--line);border-radius:3px;background:#fffdf8;padding:14px 16px;margin-top:16px}
.lb h2{font-size:15px;margin:0 0 10px;color:var(--ink)}
.lb .lb-tabs{display:flex;gap:6px;margin-bottom:10px}.lb .lb-tab{flex:1;padding:7px;border:1px solid var(--line);border-radius:3px;background:#fff;font-size:13px;color:var(--ink-soft);cursor:pointer;font-family:inherit}.lb .lb-tab.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.lb table{width:100%;border-collapse:collapse;font-size:14px}.lb td,.lb th{padding:6px 4px;border-bottom:1px solid var(--paper-deep);text-align:left}.lb th{font-size:12px;color:var(--ink-soft);font-weight:700}
.lb td.rk{width:34px;color:var(--ink-soft);font-weight:700}.lb td.sc{text-align:right;font-weight:700;white-space:nowrap}.lb td.dt{text-align:right;color:var(--ink-soft);font-size:12px;white-space:nowrap}
.lb tr.me td{background:#fff3e0}
.lb .lb-more{width:100%;margin-top:8px;padding:8px;border:1px dashed var(--line);border-radius:3px;background:none;font-size:13px;color:var(--ink-soft);cursor:pointer;font-family:inherit}
.lb .lb-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 12px;padding:12px;border:1px solid var(--accent);border-radius:3px;background:#fff}
.lb .lb-form .sc{font-weight:700;font-size:15px;white-space:nowrap}.lb .lb-form input{flex:1;min-width:120px;padding:9px 10px;font-size:14px}
.lb .lb-form button{padding:9px 14px}
.lb .lb-msg{font-size:13px;margin-top:6px;color:var(--ink-soft)}.lb .lb-msg.ok{color:#2f7d4f}.lb .lb-msg.bad{color:#b23b3b}
.lb .lb-empty{color:#a39a89;font-size:13px;padding:14px;text-align:center;border:1px dashed var(--line);border-radius:3px}`;
    document.head.appendChild(st);
  }

  async function load() {
    try { const r = await fetch('/api/score?game=' + encodeURIComponent(S.game)); const d = await r.json(); if (d.ok) S.data = d; } catch (e) { }
    render();
  }

  function rows(list, myName, myScore) {
    if (!list || !list.length) return '<div class="lb-empty">아직 기록이 없어요. 첫 번째 기록의 주인공이 되어보세요!</div>';
    const showAll = S.expanded; const items = showAll ? list : list.slice(0, 10);
    const tr = items.map((e, i) => `<tr class="${myName && e.n === myName && e.s === myScore ? 'me' : ''}"><td class="rk">${i + 1}</td><td>${esc(e.n)}${e.m ? ` <span style="font-size:11px;color:var(--ink-soft)">${esc(e.m)}</span>` : ''}</td><td class="sc">${esc(S.format(e.s))}</td><td class="dt">${esc((e.d || '').slice(5).replace('-', '.'))}</td></tr>`).join('');
    return `<table><thead><tr><th>순위</th><th>닉네임</th><th style="text-align:right">${esc(S.label)}</th><th></th></tr></thead><tbody>${tr}</tbody></table>${list.length > 10 && !showAll ? `<button class="lb-more" data-act="more">전체 ${list.length}위까지 보기</button>` : ''}`;
  }

  function render() {
    const d = S.data || { all: [], weekly: [] };
    const list = S.tab === 'weekly' ? d.weekly : d.all;
    const p = S.pending;
    const form = p ? `<div class="lb-form"><span class="sc">내 ${esc(S.label)} ${esc(S.format(p.score))}</span><input type="text" id="lbName" maxlength="8" placeholder="닉네임 (2~8자)" value="${esc(localStorage.getItem('lb_name') || '')}"><button class="btn" data-act="submit">랭킹에 등록</button><div class="lb-msg" id="lbMsg" style="width:100%">100위 안에 들면 이번 주·전체 랭킹에 올라가요.</div></div>` : '';
    S.el.innerHTML = `<div class="lb"><h2>🏆 랭킹</h2>${form}<div class="lb-tabs"><button class="lb-tab ${S.tab === 'weekly' ? 'on' : ''}" data-tab="weekly">이번 주</button><button class="lb-tab ${S.tab === 'all' ? 'on' : ''}" data-tab="all">전체</button></div>${rows(list, S.lastName, S.lastScore)}<div class="lb-msg" id="lbNote">${S.noteHtml || ''}</div></div>`;
    S.el.querySelectorAll('.lb-tab').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; S.expanded = false; render(); }));
    const more = $('[data-act="more"]'); if (more) more.addEventListener('click', () => { S.expanded = true; render(); });
    const sb = $('[data-act="submit"]'); if (sb) sb.addEventListener('click', doSubmit);
    const inp = $('#lbName'); if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
  }

  async function doSubmit() {
    const p = S.pending; if (!p) return;
    const name = ($('#lbName').value || '').trim(); const msg = $('#lbMsg');
    if (name.length < 2) { msg.className = 'lb-msg bad'; msg.textContent = '닉네임을 2자 이상 입력해주세요.'; return; }
    localStorage.setItem('lb_name', name);
    const btn = $('[data-act="submit"]'); btn.disabled = true; msg.className = 'lb-msg'; msg.textContent = '등록 중…';
    try {
      const r = await fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game: S.game, name, score: p.score, duration: p.duration || 0, meta: p.meta || '', units: p.units || 0 }) });
      const d = await r.json();
      if (!d.ok) {
        const M = { bad_name: '사용할 수 없는 닉네임이에요. 다른 닉네임을 써주세요.', rate: '너무 자주 등록했어요. 1분 뒤 다시 시도해주세요.', suspicious: '기록을 확인할 수 없어 등록되지 않았어요.', bad_score: '등록할 수 없는 점수예요.' };
        msg.className = 'lb-msg bad'; msg.textContent = M[d.error] || '등록에 실패했어요. 잠시 후 다시 시도해주세요.'; btn.disabled = false; return;
      }
      S.data = { all: d.all, weekly: d.weekly }; S.lastName = name; S.lastScore = p.score; S.pending = null;
      const parts = []; if (d.rankWeek) parts.push(`이번 주 ${d.rankWeek}위`); if (d.rankAll) parts.push(`전체 ${d.rankAll}위`);
      S.noteHtml = parts.length ? `<span class="ok">🎉 ${esc(name)}님, ${parts.join(' · ')}에 올랐어요!</span>` : '아쉽지만 100위 안에는 들지 못했어요. 다시 도전해보세요!';
      if (parts.length && d.rankWeek) S.tab = 'weekly'; else if (d.rankAll) S.tab = 'all';
      render();
      if (typeof gtag === 'function') gtag('event', 'score_submitted', { game: S.game, rank_week: d.rankWeek || 0 });
    } catch (e) { msg.className = 'lb-msg bad'; msg.textContent = '네트워크 오류로 등록하지 못했어요.'; btn.disabled = false; }
  }

  return {
    init(o) { S.game = o.game; S.el = typeof o.el === 'string' ? document.querySelector(o.el) : o.el; S.lower = !!o.lower; S.format = o.format || (v => v); S.label = o.label || '점수'; css(); render(); load(); },
    submit(score, o) { S.pending = { score, duration: (o && o.duration) || 0, meta: (o && o.meta) || '', units: (o && o.units) || 0 }; S.noteHtml = ''; render(); const f = $('.lb-form'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    refresh: load
  };
})();
