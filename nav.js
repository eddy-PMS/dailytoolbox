/* dailyfreetoolbox 공통 네비게이션
   사용법: <nav id="site-nav" data-accent="#2f4a5e"></nav> 바로 아래에 <script src="nav.js"></script>
   메뉴를 바꾸려면 아래 GROUPS만 수정하면 모든 페이지에 반영됩니다. */
(function () {
  var GROUPS = [
    { label: '생활', items: [
      ['salary.html', '연봉 실수령액'],
      ['severance.html', '퇴직금 계산기'],
      ['loan.html', '대출 이자 계산기'],
      ['vat.html', '부가세 계산기'],
      ['age.html', '만 나이 계산기'],
      ['dday.html', 'D-day 계산기'],
      ['charcount.html', '글자수 세기'],
      ['image-compress.html', '이미지 용량 줄이기'],
      ['qrcode.html', 'QR코드 생성기'],
      ['myip.html', '내 IP 주소 확인'],
      ['ipgeo.html', 'IP 위치 조회'],
      ['unit.html', '단위 변환기'],
      ['exchange.html', '환율 계산기'],
      ['rent.html', '전월세·중개수수료'],
      ['lotto.html', '로또 번호 생성기'],
      ['password.html', '비밀번호 생성기'],
      ['percent.html', '퍼센트 계산기'],
      ['discount.html', '할인율 계산기'],
      ['pdf-merge.html', 'PDF 합치기'],
      ['pdf-split.html', 'PDF 분할하기'],
      ['image-to-pdf.html', '이미지 → PDF']
    ]},
    { label: '가족', items: [
      ['pregnancy.html', '출산예정일·임신 주수'],
      ['ovulation.html', '배란일·가임기'],
      ['baby-age.html', '아기 개월수·백일·돌'],
      ['pet-age.html', '강아지·고양이 나이']
    ]},
    { label: '직장·사업', items: [
      ['parttime.html', '알바 급여 계산기'],
      ['raise.html', '연봉 인상률 계산기'],
      ['annual-leave.html', '연차 계산기'],
      ['wage-convert.html', '시급·월급·연봉 변환'],
      ['unemployment.html', '실업급여 계산기'],
      ['freelancer-tax.html', '3.3% 프리랜서 세금'],
      ['margin.html', '마진율 계산기'],
      ['platform-fee.html', '카드·배달앱 수수료'],
      ['breakeven.html', '손익분기점 계산기'],
      ['roas.html', 'ROAS 계산기'],
      ['cac-ltv.html', 'CAC·LTV 계산기'],
      ['worktime.html', '근무시간·야근 계산기'],
      ['utm.html', 'UTM 생성기']
    ]},
    { label: '학생', items: [
      ['gpa.html', '학점 계산기'],
      ['school-grade.html', '내신 등급 계산기'],
      ['pomodoro.html', '뽀모도로 타이머']
    ]},
    { label: '게임·재미', items: [
      ['sens.html', '마우스 감도 변환기'],
      ['reaction.html', '반응속도 테스트'],
      ['typing.html', '타자 속도 테스트'],
      ['ladder.html', '사다리타기'],
      ['team.html', '팀 나누기'],
      ['random-pick.html', '랜덤 뽑기'],
      ['kakao-analyzer.html', '카카오톡 대화 분석기'],
      ['quote-card.html', '감성 문구 카드'],
      ['ascii-art.html', '아스키 아트 생성기'],
      ['mbti-test.html', '간이 MBTI 테스트'],
      ['worldcup.html', '이상형 월드컵'],
      ['balance-game.html', '밸런스 게임 생성기'],
      ['fortune.html', '오늘의 운세 & 궁합'],
      ['stress-test.html', '스트레스 지수 테스트']
    ]},
    { label: '군대', items: [
      ['discharge.html', '전역일 계산기'],
      ['military-savings.html', '군적금 만기 계산기']
    ]},
    { label: '헬스', items: [
      ['onerm.html', '1RM 계산기'],
      ['macros.html', '단백질·칼로리 계산기'],
      ['bmi.html', 'BMI·체지방률'],
      ['pace.html', '러닝 페이스 계산기']
    ]},
    { label: '재테크', items: [
      ['avgprice.html', '평단가 계산기'],
      ['avgdown.html', '물타기 계산기'],
      ['compound.html', '복리·적금 계산기'],
      ['mortgage.html', '주택담보대출 한도'],
      ['jeonse-loan.html', '전세대출 이자'],
      ['car-loan.html', '자동차 할부']
    ]},
    { label: '중국어', items: [
      ['pinyin.html', '병음 변환기'],
      ['hanja.html', '한자 음훈 조회'],
      ['chinese-convert.html', '간체↔번체 변환'],
      ['tone-drill.html', '성조 훈련'],
      ['hsk-test.html', 'HSK 레벨 테스트']
    ]},
    { label: '일본어', items: [
      ['furigana.html', '후리가나 표시기'],
      ['jp-verb.html', '동사 활용표'],
      ['kana-quiz.html', '가나 퀴즈'],
      ['jlpt-test.html', 'JLPT 레벨 테스트']
    ]},
    { label: '영어', items: [
      ['ipa.html', 'IPA 발음 변환'],
      ['sentence.html', '문장 구조 분석'],
      ['level-test.html', '영어 레벨 테스트'],
      ['readability.html', '지문 난이도 체커'],
      ['etymology.html', '어원 분석기'],
      ['irregular-verbs.html', '불규칙동사 표·퀴즈'],
      ['cloze.html', '빈칸 문제 생성기'],
      ['spelling-quiz.html', '스펠링 퀴즈']
    ]},
    { label: '공통', items: [
      ['tts.html', '발음 듣기'],
      ['dictation.html', '받아쓰기 연습'],
      ['wordlist.html', '단어장 추출기'],
      ['stroke-order.html', '한자 획순'],
      ['romanize.html', '이름 로마자 변환']
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
    + '#site-footer-links{width:100%;max-width:680px;margin:36px auto 0;padding-top:16px;border-top:1px solid rgba(0,0,0,.12);display:flex;justify-content:center;gap:18px;font-size:12px}'
    + '#site-footer-links a{color:rgba(0,0,0,.5);text-decoration:none}'
    + '#site-footer-links a:hover{color:rgba(0,0,0,.85)}'
    + '#site-footer-links a.active{color:var(--nav-accent);font-weight:700}'
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

  // 페이지 하단에 소개·개인정보처리방침 링크 삽입
  function addFooterLinks() {
    if (document.getElementById('site-footer-links')) return;
    var hasOwn = document.querySelector('footer a[href="privacy.html"]');
    if (hasOwn) return;
    var box = document.createElement('div');
    box.id = 'site-footer-links';
    box.style.setProperty('--nav-accent', accent);
    box.innerHTML = '<a href="index.html">홈</a>'
      + '<a href="about.html"' + (path === 'about.html' ? ' class="active"' : '') + '>사이트 소개</a>'
      + '<a href="privacy.html"' + (path === 'privacy.html' ? ' class="active"' : '') + '>개인정보처리방침</a>';
    var main = document.querySelector('main');
    if (main && main.parentNode) main.parentNode.insertBefore(box, main.nextSibling); else document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFooterLinks); else addFooterLinks();

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
