/* dailyfreetoolbox 공통 네비게이션
   사용법: <nav id="site-nav" data-accent="#2f4a5e"></nav> 바로 아래에 <script src="nav.js"></script>
   메뉴를 바꾸려면 아래 GROUPS만 수정하면 모든 페이지에 반영됩니다. */
(function () {
  var GROUPS = [
    { label: '중국어', items: [
      ['pinyin.html', '병음 변환기'],
      ['hsk-test.html', 'HSK 레벨 테스트']
    ]},
    { label: '일본어', items: [
      ['furigana.html', '후리가나 표시기'],
      ['kana-quiz.html', '가나 퀴즈'],
      ['jlpt-test.html', 'JLPT 레벨 테스트']
    ]},
    { label: '영어', items: [
      ['ipa.html', 'IPA 발음 변환'],
      ['level-test.html', '영어 레벨 테스트'],
      ['readability.html', '지문 난이도 체커'],
      ['etymology.html', '어원 분석기']
    ]},
    { label: '공통', items: [
      ['tts.html', '발음 듣기'],
      ['wordlist.html', '단어장 추출기'],
      ['stroke-order.html', '한자 획순']
    ]}
  ];

  var nav = document.getElementById('site-nav');
  if (!nav) return;
  var accent = nav.getAttribute('data-accent') || '#2f4a5e';

  var path = location.pathname.split('/').pop() || 'index.html';
  if (path === '') path = 'index.html';

  var css = ''
    + '#site-nav{--nav-accent:' + accent + ';width:100%;max-width:680px;display:flex;align-items:center;gap:4px;margin:0 auto 28px;padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,.12);flex-wrap:wrap;font-family:inherit;position:relative}'
    + '#site-nav a,#site-nav button{font-family:inherit;font-size:13px;color:rgba(0,0,0,.62);text-decoration:none;padding:6px 12px;border-radius:3px;background:none;border:none;cursor:pointer;line-height:1.4;transition:background .15s ease,color .15s ease}'
    + '#site-nav a:hover,#site-nav button:hover{background:rgba(0,0,0,.06);color:rgba(0,0,0,.88)}'
    + '#site-nav .nav-home.active{background:var(--nav-accent);color:#fffdf8}'
    + '#site-nav .nav-group{position:relative}'
    + '#site-nav .nav-group>button{display:flex;align-items:center;gap:5px}'
    + '#site-nav .nav-group>button .caret{font-size:9px;opacity:.6;transition:transform .15s ease}'
    + '#site-nav .nav-group.has-active>button{color:var(--nav-accent);font-weight:700}'
    + '#site-nav .nav-menu{display:none;position:absolute;top:100%;left:0;min-width:170px;background:#fffdf8;border:1px solid rgba(0,0,0,.12);border-radius:3px;box-shadow:0 6px 18px rgba(0,0,0,.08);padding:6px;z-index:50;flex-direction:column;gap:2px;margin-top:4px}'
    + '#site-nav .nav-menu::before{content:"";position:absolute;left:0;right:0;top:-6px;height:6px}'
    + '#site-nav .nav-menu a{display:block;white-space:nowrap}'
    + '#site-nav .nav-menu a.active{background:var(--nav-accent);color:#fffdf8}'
    + '#site-nav .nav-group.open .nav-menu{display:flex}'
    + '#site-nav .nav-group.open>button .caret{transform:rotate(180deg)}'
    + '@media (hover:hover){#site-nav .nav-group:hover .nav-menu{display:flex}#site-nav .nav-group:hover>button .caret{transform:rotate(180deg)}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var homeActive = path === 'index.html';
  var html = '<a href="index.html" class="nav-home' + (homeActive ? ' active' : '') + '">홈</a>';

  GROUPS.forEach(function (g) {
    var hasActive = g.items.some(function (it) { return it[0] === path; });
    html += '<div class="nav-group' + (hasActive ? ' has-active' : '') + '">'
      + '<button type="button" aria-haspopup="true" aria-expanded="false">' + g.label + ' <span class="caret">▼</span></button>'
      + '<div class="nav-menu" role="menu">';
    g.items.forEach(function (it) {
      html += '<a href="' + it[0] + '" role="menuitem"' + (it[0] === path ? ' class="active" aria-current="page"' : '') + '>' + it[1] + '</a>';
    });
    html += '</div></div>';
  });

  nav.innerHTML = html;

  // 터치/클릭 토글 (모바일) + 마우스 hover 유예 (데스크톱)
  var groups = nav.querySelectorAll('.nav-group');
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  groups.forEach(function (g) {
    var btn = g.querySelector('button');
    var closeTimer = null;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !g.classList.contains('open');
      groups.forEach(function (o) { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
      if (willOpen) { g.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
    if (!canHover) return;
    g.addEventListener('mouseenter', function () {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      g.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    });
    g.addEventListener('mouseleave', function () {
      closeTimer = setTimeout(function () {
        g.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }, 150);
    });
  });
  document.addEventListener('click', function () {
    groups.forEach(function (o) { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') groups.forEach(function (o) { o.classList.remove('open'); });
  });
})();
