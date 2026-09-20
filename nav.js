// 공통 내비게이션 · 검색 · 푸터 · 사이드 광고 자리 (전 페이지 공용)
// 그룹·도구 데이터는 index.html 카드와 동일하며 window.TOOLBOX 로 노출됨
(function () {
  var GROUPS = [{"label":"계산·생활","icon":"🧮","items":[["salary.html","연봉 실수령액","2026년 4대보험·소득세 반영, 세후 월급 계산",""],["severance.html","퇴직금 계산기","입사·퇴사일과 최근 급여로 예상 퇴직금",""],["loan.html","대출 이자 계산기","원리금균등·원금균등·만기일시 비교와 상환표",""],["vat.html","부가세 계산기","공급가액·부가세·합계 어느 쪽이든 입력",""],["age.html","만 나이 계산기","만 나이·연 나이·세는 나이와 다음 생일 D-day",""],["dday.html","D-day 계산기","남은 날짜 세기, 날짜 더하기·빼기",""],["charcount.html","글자수 세기","공백 포함·제외, 바이트, 원고지 매수까지",""],["image-compress.html","이미지 용량 줄이기","업로드 없이 내 기기에서 압축·리사이즈·변환",""],["qrcode.html","QR코드 생성기","URL·텍스트·와이파이 QR을 PNG로",""],["myip.html","내 IP 주소 확인","공인 IP와 대략적 위치, 통신사, 접속 정보",""],["ipgeo.html","IP 위치 조회","IP 주소로 국가·도시·통신사·시간대 확인",""],["unit.html","단위 변환기","평↔㎡, cm↔inch, kg↔lb, 온도·속도 환산",""],["exchange.html","환율 계산기","ECB 고시 환율로 달러·엔·유로·위안 환산",""],["rent.html","전월세·중개수수료","전세↔월세 전환액과 복비 상한",""],["lotto.html","로또 번호 생성기","고정·제외 번호 지정, 최대 10게임",""],["password.html","비밀번호 생성기","안전한 무작위 비밀번호, 강도 표시",""],["percent.html","퍼센트 계산기","몇 %인지, N%는 얼마, 증감률",""],["discount.html","할인율 계산기","할인가·할인율·정가 역산, 쿠폰 중복 할인",""],["pdf-merge.html","PDF 합치기","여러 PDF를 순서대로 하나로, 업로드 없이",""],["pdf-split.html","PDF 분할하기","페이지 범위 추출, 낱장·N쪽씩 나누기",""],["image-to-pdf.html","이미지 → PDF","사진·스캔 여러 장을 A4 PDF 한 파일로",""],["discharge.html","전역일 계산기","입대일·군종으로 전역 D-day, 복무율, 진급일",""],["military-savings.html","군적금 만기 계산기","장병내일준비적금 매칭·이자 합친 수령액",""]]},{"label":"돈·일","icon":"💼","items":[["parttime.html","알바 급여 계산기","2026 최저시급, 주휴·야간·연장수당 반영",""],["raise.html","연봉 인상률 계산기","인상률·실수령 변화, N년 뒤 연봉 전망",""],["annual-leave.html","연차 계산기","입사일 기준 올해 연차와 발생일",""],["leave-pay.html","연차수당 계산기","미사용 연차 1일 통상임금과 수당",""],["wage-convert.html","시급·월급·연봉 변환","하나만 넣으면 전부 환산",""],["unemployment.html","실업급여 계산기","2026 상·하한 반영, 지급일수와 총액",""],["freelancer-tax.html","3.3% 프리랜서 세금","원천징수 후 실수령, 세전 역산",""],["margin.html","마진율 계산기","원가·판매가·마진율, 마크업 차이",""],["platform-fee.html","카드·배달앱 수수료","수수료 빼고 실제 정산금",""],["breakeven.html","손익분기점 계산기","고정비·개당 이익으로 본전 판매량과 목표 판매량",""],["roas.html","ROAS 계산기","광고수익률·ROI·CPA, 손익분기 ROAS",""],["cac-ltv.html","CAC·LTV 계산기","고객획득비용·생애가치, LTV/CAC 비율",""],["worktime.html","근무시간·야근 계산기","출퇴근 시간으로 연장·야간 가산수당",""],["utm.html","UTM 생성기","캠페인 추적 URL, 네이버·구글·카카오 프리셋",""],["avgprice.html","평단가 계산기","나눠 산 주식·코인의 평균 단가와 수익률",""],["avgdown.html","물타기 계산기","추가 매수 후 평단, 목표 평단까지 필요 수량",""],["compound.html","복리·적금 계산기","매달 적립 시 만기 금액과 세후 이자",""],["mortgage.html","주택담보대출 한도","2026 LTV·시가 한도·스트레스 DSR 반영 대출 가능액",""],["jeonse-loan.html","전세대출 이자","월 이자·총 이자, 전세 vs 월세 실질 부담 비교",""],["car-loan.html","자동차 할부","월 납입금·총 이자, 잔가유예·취득세 포함 비용",""]]},{"label":"가족·건강","icon":"👨‍👩‍👧","items":[["pregnancy.html","출산예정일·임신 주수","마지막 생리일로 예정일, 현재 주수, 검사 시기",""],["ovulation.html","배란일·가임기","3개월치 배란일과 가임기, 다음 생리 예정일",""],["baby-age.html","아기 개월수·백일·돌","생후 며칠·개월수, 백일·돌 날짜",""],["pet-age.html","강아지·고양이 나이","반려동물 나이를 사람 나이로 환산",""],["onerm.html","1RM 계산기","중량×횟수로 최대 중량, 훈련 % 표",""],["macros.html","단백질·칼로리 계산기","목표별 하루 칼로리와 탄단지 권장량",""],["bmi.html","BMI·체지방률","키·몸무게·둘레로 체지방률 추정",""],["pace.html","러닝 페이스 계산기","페이스↔완주 시간, 거리별 예상 기록",""],["lineup.html","축구 라인업 & 전술판","포메이션 고르고 선수 배치, 이미지·링크로 팀원에게 공유",""]]},{"label":"공부·어학","icon":"📚","items":[["gpa.html","학점 계산기","4.5·4.3·100점 환산, 누적 평점","학생"],["school-grade.html","내신 등급 계산기","석차·점수로 9등급·5등급","학생"],["pomodoro.html","뽀모도로 타이머","25분 집중 5분 휴식, 알림음","학생"],["ipa.html","IPA 발음 변환","단어의 발음기호와 참고용 한글 표기를 함께","영어"],["sentence.html","문장 구조 분석","품사를 색으로 구분하고 주어·동사를 표시","영어"],["level-test.html","영어 레벨 테스트","기초부터 실무 어휘까지 20문제로 진단","영어"],["readability.html","지문 난이도 체커","붙여넣은 지문이 토익·수능 어느 수준인지 분석","영어"],["etymology.html","어원 분석기","접두사·어근·접미사로 쪼개서 뜻을 유추","영어"],["irregular-verbs.html","불규칙동사 표·퀴즈","75개 변화표 검색과 과거형·과거분사 입력 퀴즈","영어"],["cloze.html","빈칸 문제 생성기","지문의 핵심 단어를 빈칸으로 바꿔 바로 풀고 채점","영어"],["spelling-quiz.html","스펠링 퀴즈","내 단어 목록으로 듣고 철자 입력하는 시험","영어"],["furigana.html","후리가나 표시기","문장을 붙여넣으면 한자 위에 읽는 법을 자동으로","일본어"],["jp-verb.html","동사 활용표","동사 하나로 ます·て·た·ない·가능·수동·사역형까지","일본어"],["kana-quiz.html","가나 퀴즈","히라가나·가타카나를 행별로 골라 퀴즈로 암기","일본어"],["jlpt-test.html","JLPT 레벨 테스트","N5부터 N1까지, 단어 20개로 보는 내 수준","일본어"],["pinyin.html","병음 변환기","한자를 입력하면 글자마다 병음과 성조를 색으로 표시","중국어"],["hanja.html","한자 음훈 조회","한자를 입력하면 훈(뜻)과 음을 바로, 2만여 자 수록","중국어"],["chinese-convert.html","간체↔번체 변환","간체자와 번체자를 서로 변환, 대만·홍콩 표기 지원","중국어"],["tone-drill.html","성조 훈련","같은 음절의 1~4성을 듣고 비교하고 퀴즈로 구분","중국어"],["hsk-test.html","HSK 레벨 테스트","단어 20개로 알아보는 내 중국어 어휘 수준","중국어"],["tts.html","발음 듣기","영어·일본어·중국어 문장을 원어민 음성으로, 속도 조절 가능","어학 공통"],["dictation.html","받아쓰기 연습","문장을 듣고 받아쓰면 틀린 부분을 바로 표시","어학 공통"],["wordlist.html","단어장 추출기","지문에서 자주 나온 단어를 뽑아 단어장 CSV로","어학 공통"],["stroke-order.html","한자 획순","한자·간지 쓰는 순서를 애니메이션으로","어학 공통"],["romanize.html","이름 로마자 변환","여권 영문 이름을 표기법대로, 성씨 관용 표기 포함","어학 공통"]]},{"label":"퍼즐·게임","icon":"🎮","items":[["game2048.html","2048 게임","타일 합쳐 2048 만들기, 점수 랭킹 등록",""],["nonogram.html","네모로직 (노노그램)","5×5부터 30×30까지 100레벨, 도달 레벨 랭킹",""],["water-sort.html","물 붓기 퍼즐","색깔 물을 병에 옮겨 정리, 레벨 랭킹",""],["block-fill.html","블록 채우기","조각 놓고 줄 지우기, 시간 제한 없는 점수 랭킹",""],["order.html","숫자 순서 누르기","1~30을 순서대로 빨리! 이번 주·전체 랭킹 도전",""],["color-find.html","틀린 색 찾기","살짝 다른 색 한 칸 찾기, 60초 단계 랭킹",""],["math-speed.html","암산 스피드","60초 사칙연산, 정답 수 랭킹",""],["vocab-quiz.html","영단어 스피드 퀴즈","뜻 맞히기 60초, 중등·고등·토익 급별 랭킹",""],["typing.html","타자 속도 테스트","한글·영문 분당 타수와 정확도",""],["sens.html","마우스 감도 변환기","발로란트·CS2·오버워치·에이펙스 감도 변환, eDPI·cm/360",""]]},{"label":"두뇌·감각 훈련","icon":"🧠","items":[["reaction.html","반응속도 테스트","초록색이 되면 클릭, 5회 평균 ms와 등급",""],["digit-span.html","숫자 외우기","숫자가 사라지면 순서대로 입력, 최대 자릿수 랭킹",""],["periph.html","주변시 숫자 읽기","가운데 보며 가장자리 숫자 읽기, 시야 훈련",""],["mot.html","점 추적 (MOT)","움직이는 점 여러 개 동시에 따라가기",""],["reverse.html","반대로 누르기","파랑은 그대로·빨강은 반대로, 선택 반응 60초",""],["gonogo.html","참기 게임 (Go/No-Go)","초록은 누르고 빨강은 참기, 충동 억제",""]]},{"label":"테스트·재미","icon":"🎉","items":[["ladder.html","사다리타기","이름 클릭하면 길 따라가는 온라인 사다리",""],["team.html","팀 나누기","이름 넣고 팀 수 정하면 랜덤 편성",""],["random-pick.html","랜덤 뽑기","메뉴·발표 순서·당첨자 무작위 추첨",""],["kakao-analyzer.html","카카오톡 대화 분석기","말수·답장속도·자주 쓴 단어, 업로드 없이 분석",""],["quote-card.html","감성 문구 카드","문장 넣으면 인스타 감성 이미지로",""],["ascii-art.html","아스키 아트 생성기","글자를 큰 문자로, 사진을 문자 그림으로",""],["iq-test.html","IQ 테스트","수리·언어·논리·공간 25문항 15분, 추정 IQ와 영역별 강점",""],["mbti-test.html","간이 MBTI 테스트","20문항으로 알아보는 16가지 성격 유형 (참고용)",""],["worldcup.html","이상형 월드컵","항목 넣으면 토너먼트 자동 생성, 공유 링크",""],["balance-game.html","밸런스 게임 생성기","이거 vs 저거 질문 만들고 친구에게 공유",""],["fortune.html","사주 보기 & 오늘의 운세·궁합","만세력 기준 사주팔자·오행·일간 풀이, 일진 운세와 사주 궁합",""],["stress-test.html","스트레스 지수 테스트","15문항으로 요즘 나의 스트레스 점검 (참고용)",""]]}];
  window.TOOLBOX = { groups: GROUPS };

  var nav = document.getElementById('site-nav');
  if (!nav) return;
  var accent = nav.getAttribute('data-accent') || '#2b5fd9';
  var path = location.pathname.split('/').pop() || 'index.html';
  if (path === '') path = 'index.html';
  if (path.indexOf('.') < 0) path += '.html';   // /salary 처럼 확장자 없는 주소도 salary.html 로 취급
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var css = ''
    + '#site-nav{--nav-accent:' + accent + ';width:calc(100% + 40px);margin:0 -20px 26px;background:#fff;border-bottom:1px solid rgba(0,0,0,.1);font-family:inherit;position:relative;z-index:60}'
    + '#site-nav *{box-sizing:border-box}'
    + '#site-nav .nb-in{max-width:1040px;margin:0 auto;padding:0 20px;height:54px;display:flex;align-items:center;gap:10px}'
    + '#site-nav .nb-logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:rgba(0,0,0,.85);font-size:15px;font-weight:700;white-space:nowrap;margin-right:4px;flex:none}'
    + '#site-nav .nb-d{width:22px;height:22px;display:block;flex:none;margin:0 1px 0 3px}'
    + '#site-nav .nb-groups{display:flex;align-items:center;gap:0;flex:0 1 auto;min-width:0;white-space:nowrap}'
    + '#site-nav .nb-groups a,#site-nav .nb-groups button{font-family:inherit;font-size:13px;color:rgba(0,0,0,.66);text-decoration:none;padding:6px 7px;border-radius:3px;background:none;border:none;cursor:pointer;line-height:1.4;white-space:nowrap}'
    + '#site-nav .nb-groups a:hover,#site-nav .nb-groups button:hover{background:rgba(0,0,0,.06);color:rgba(0,0,0,.88)}'
    + '#site-nav .nav-group{position:relative}'
    + '#site-nav .nav-group>button{display:flex;align-items:center;gap:4px}'
    + '#site-nav .nav-group>button .caret{font-size:8px;opacity:.55}'
    + '#site-nav .nav-group.has-active>button{color:var(--nav-accent);font-weight:700}'
    + '#site-nav .nb-guide{flex:none}#site-nav .nb-guide.active{color:var(--nav-accent);font-weight:700}'
    + '#site-nav .nav-menu{display:none;position:absolute;top:100%;left:0;min-width:200px;max-height:70vh;overflow:auto;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:4px;box-shadow:0 8px 22px rgba(0,0,0,.1);padding:6px;z-index:70;flex-direction:column;gap:1px;margin-top:2px}'
    + '#site-nav .nav-menu::before{content:"";position:absolute;left:0;right:0;top:-8px;height:8px}'
    + '#site-nav .nav-menu a{display:block;white-space:nowrap;font-size:13px}'
    + '#site-nav .nav-menu .sub{font-size:11px;color:rgba(0,0,0,.45);padding:8px 9px 2px;font-weight:700}'
    + '#site-nav .nav-menu a.active{background:var(--nav-accent);color:#fff}'
    + '#site-nav .nav-group.open .nav-menu{display:flex}'
    + '@media (hover:hover){#site-nav .nav-group:hover .nav-menu{display:flex}}'
    + '#site-nav .nb-search{position:relative}'
    + '#site-nav .nb-search input{width:100%;padding:7px 12px 7px 32px;border:1px solid rgba(0,0,0,.14);border-radius:16px;font-size:13px;font-family:inherit;background:#fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2357534b%27 stroke-width=%272.2%27%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%277%27/%3E%3Cpath d=%27M20 20l-4-4%27/%3E%3C/svg%3E") 10px center/15px no-repeat;color:inherit}'
    + '#site-nav .nb-search input:focus{outline:none;border-color:var(--nav-accent)}'
    + '#site-nav .nb-results{display:none;position:absolute;top:100%;right:0;left:0;margin-top:4px;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:4px;box-shadow:0 8px 22px rgba(0,0,0,.1);padding:4px;z-index:80;max-height:60vh;overflow:auto}'
    + '#site-nav .nb-results.show{display:block}'
    + '#site-nav .nb-results a{display:block;padding:8px 10px;border-radius:3px;text-decoration:none;color:rgba(0,0,0,.85);font-size:13px}'
    + '#site-nav .nb-results a small{display:block;color:rgba(0,0,0,.5);font-size:11px;margin-top:1px}'
    + '#site-nav .nb-results a:hover,#site-nav .nb-results a.sel{background:rgba(0,0,0,.06)}'
    + '#site-nav .nb-results .none{padding:10px;font-size:12px;color:rgba(0,0,0,.5)}'
    + '#site-nav .nb-burger{display:none;margin-left:auto;width:40px;height:40px;border:none;background:none;cursor:pointer;flex-direction:column;justify-content:center;gap:5px;align-items:center;padding:0}'
    + '#site-nav .nb-burger i{display:block;width:22px;height:2px;background:rgba(0,0,0,.8);border-radius:2px}'
    + '#site-nav .nb-drawer{display:none;position:fixed;inset:54px 0 0 0;background:#f7faff;overflow:auto;padding:12px 16px 40px;z-index:65}'
    + '#site-nav.drawer-open .nb-drawer{display:block}'
    + '#site-nav .nb-drawer .nb-search{width:100%;margin:0 0 12px}'
    + '#site-nav .nb-drawer details{border:1px solid rgba(0,0,0,.1);border-radius:4px;background:#fff;margin-bottom:8px}'
    + '#site-nav .nb-drawer summary{padding:12px 14px;font-size:15px;font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}'
    + '#site-nav .nb-drawer summary::-webkit-details-marker{display:none}'
    + '#site-nav .nb-drawer summary small{font-weight:400;font-size:12px;color:rgba(0,0,0,.45)}'
    + '#site-nav .nb-drawer .dl{padding:0 8px 8px}'
    + '#site-nav .nb-drawer .dl a{display:block;padding:9px 8px;font-size:14px;color:rgba(0,0,0,.8);text-decoration:none;border-radius:3px}'
    + '#site-nav .nb-drawer .dl a.active{background:var(--nav-accent);color:#fff}'
    + '#site-nav .nb-drawer .dl .sub{font-size:11px;color:rgba(0,0,0,.45);padding:8px 8px 2px;font-weight:700}'
    + '#site-nav .nb-drawer .dl-foot{margin-top:14px;font-size:13px;display:flex;gap:14px;justify-content:center}'
    + '#site-nav .nb-drawer .dl-foot a{color:rgba(0,0,0,.55);text-decoration:none}'
    + '@media (max-width:1040px){#site-nav .nb-groups{display:none}#site-nav .nb-burger{display:flex}}'
    + 'body.nb-lock{overflow:hidden}'
    + '#site-footer-links{width:100%;max-width:680px;margin:40px auto 0;padding-top:16px;border-top:1px solid rgba(0,0,0,.12);font-size:12px;text-align:center;line-height:2}'
    + '#site-footer-links a{color:rgba(0,0,0,.5);text-decoration:none;margin:0 6px}'
    + '#site-footer-links a:hover{color:rgba(0,0,0,.85)}'
    + '#site-footer-links a.active{color:var(--nav-accent);font-weight:700}'
    + '#side-ad{display:none;position:fixed;top:80px;left:calc(50% + 370px);width:300px}'
    + '@media (min-width:1100px){#side-ad{display:block}}'
    + '#side-ad .ad-slot{margin:0}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ---- 데스크톱 바 ----
  function groupMenu(g) {
    var h = '', lastSub = '';
    g.items.forEach(function (it) {
      if (it[3] && it[3] !== lastSub) { h += '<div class="sub">' + esc(it[3]) + '</div>'; lastSub = it[3]; }
      h += '<a href="/' + it[0] + '" role="menuitem"' + (it[0] === path ? ' class="active" aria-current="page"' : '') + '>' + esc(it[1]) + '</a>';
    });
    return h;
  }
  var bar = '<div class="nb-in"><a class="nb-logo" href="/"><img class="nb-d" src="/favicon.svg" width="22" height="22" alt=""><b>데일리 프리 툴박스</b></a><div class="nb-groups">';
  GROUPS.forEach(function (g) {
    var hasActive = g.items.some(function (it) { return it[0] === path; });
    var shortLabel = g.label.replace(' 훈련', '');   // 상단 바는 짧게, 드롭다운·드로어는 전체 이름
    bar += '<div class="nav-group' + (hasActive ? ' has-active' : '') + '"><button type="button" aria-haspopup="true" aria-expanded="false">' + esc(shortLabel) + ' <span class="caret">▼</span></button><div class="nav-menu" role="menu">' + groupMenu(g) + '</div></div>';
  });
  bar += '<a href="/guide/" class="nb-guide' + (location.pathname.indexOf('/guide/') === 0 ? ' active' : '') + '">📝 가이드</a></div><button class="nb-burger" type="button" aria-label="메뉴 열기" aria-expanded="false"><i></i><i></i><i></i></button></div>';
  // ---- 모바일 드로어 ----
  var drawer = '<div class="nb-drawer"><div class="nb-search"><input type="search" placeholder="도구 검색" aria-label="도구 검색" autocomplete="off"><div class="nb-results"></div></div>';
  GROUPS.forEach(function (g) {
    var hasActive = g.items.some(function (it) { return it[0] === path; });
    drawer += '<details' + (hasActive ? ' open' : '') + '><summary>' + g.icon + ' ' + esc(g.label) + ' <small>' + g.items.length + '개</small></summary><div class="dl">' + groupMenu(g) + '</div></details>';
  });
  drawer += '<div class="dl-foot"><a href="/">홈</a><a href="/guide/">생활 가이드</a><a href="/about.html">사이트 소개</a><a href="/privacy.html">개인정보처리방침</a></div></div>';
  nav.innerHTML = bar + drawer;

  // ---- 드롭다운 동작 ----
  var groups = nav.querySelectorAll('.nav-group');
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  function closeAll() { groups.forEach(function (o) { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); }); }
  groups.forEach(function (g) {
    var btn = g.querySelector('button'), t = null;
    btn.addEventListener('click', function (e) { e.stopPropagation(); var open = !g.classList.contains('open'); closeAll(); if (open) { g.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); } });
    if (!canHover) return;
    g.addEventListener('mouseenter', function () { if (t) { clearTimeout(t); t = null; } g.classList.add('open'); });
    g.addEventListener('mouseleave', function () { t = setTimeout(function () { g.classList.remove('open'); }, 150); });
  });
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); setDrawer(false); } });

  // ---- 햄버거 ----
  var burger = nav.querySelector('.nb-burger');
  function setDrawer(open) { nav.classList.toggle('drawer-open', open); document.body.classList.toggle('nb-lock', open); burger.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { var i = nav.querySelector('.nb-drawer input'); if (i) setTimeout(function () { i.focus(); }, 50); } }
  burger.addEventListener('click', function (e) { e.stopPropagation(); setDrawer(!nav.classList.contains('drawer-open')); });

  // ---- 검색 (제목·설명 부분 일치, 초성 검색 지원) ----
  var ALL = []; GROUPS.forEach(function (g) { g.items.forEach(function (it) { ALL.push({ f: it[0], t: it[1], d: it[2], g: g.label }); }); });
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function cho(s) { var o = ''; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); o += (c >= 0xAC00 && c <= 0xD7A3) ? CHO[Math.floor((c - 0xAC00) / 588)] : s[i]; } return o; }
  function isCho(q) { return /^[ㄱ-ㅎ]+$/.test(q); }
  function search(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    var choQ = isCho(q);
    return ALL.map(function (x) {
      var t = x.t.toLowerCase(), d = x.d.toLowerCase(); var s = 0;
      if (choQ) { if (cho(x.t).indexOf(q) >= 0) s = 3; }
      else { if (t.indexOf(q) === 0) s = 5; else if (t.indexOf(q) >= 0) s = 4; else if (d.indexOf(q) >= 0) s = 2; else if (x.g.toLowerCase().indexOf(q) >= 0) s = 1; }
      return s ? { x: x, s: s } : null;
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 8).map(function (r) { return r.x; });
  }
  // 네비 안뿐 아니라 페이지 본문(홈 히어로 등)의 .nb-search 도 같은 로직으로 동작시킨다
  function bindSearchBoxes() {
  document.querySelectorAll('.nb-search').forEach(function (box) {
    if (box.getAttribute('data-nb-bound')) return;
    box.setAttribute('data-nb-bound', '1');
    var input = box.querySelector('input'), res = box.querySelector('.nb-results'), sel = -1;
    if (!input || !res) return;
    function render() {
      var list = search(input.value);
      if (!input.value.trim()) { res.classList.remove('show'); res.innerHTML = ''; return; }
      res.innerHTML = list.length ? list.map(function (x, i) { return '<a href="/' + x.f + '" class="' + (i === sel ? 'sel' : '') + '">' + esc(x.t) + '<small>' + esc(x.g) + ' · ' + esc(x.d) + '</small></a>'; }).join('') : '<div class="none">검색 결과가 없어요</div>';
      res.classList.add('show');
    }
    input.addEventListener('input', function () { sel = -1; render(); });
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (e) {
      var links = res.querySelectorAll('a');
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(links.length - 1, sel + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(-1, sel - 1); render(); }
      else if (e.key === 'Enter') { var l = links[sel >= 0 ? sel : 0]; if (l) location.href = l.getAttribute('href'); }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) res.classList.remove('show'); });
    input.addEventListener('click', function (e) { e.stopPropagation(); });
  });
  }
  bindSearchBoxes();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindSearchBoxes);

  // ---- 푸터 링크 + 사이드 광고 자리 ----
  function addExtras() {
    if (!document.getElementById('site-footer-links')) {
      var box = document.createElement('div'); box.id = 'site-footer-links'; box.style.setProperty('--nav-accent', accent);
      var g = GROUPS.map(function (x) { return '<a href="/#' + encodeURIComponent(x.label) + '">' + esc(x.label) + '</a>'; }).join('');
      box.innerHTML = '<div>' + g + '</div><div><a href="/">홈</a><a href="/guide/"' + (location.pathname.indexOf('/guide/') === 0 ? ' class="active"' : '') + '>생활 가이드</a><a href="/about.html"' + (path === 'about.html' ? ' class="active"' : '') + '>사이트 소개</a><a href="/privacy.html"' + (path === 'privacy.html' ? ' class="active"' : '') + '>개인정보처리방침</a></div>';
      var main = document.querySelector('main');
      if (main && main.parentNode) main.parentNode.insertBefore(box, main.nextSibling); else document.body.appendChild(box);
    }
    if (!document.getElementById('side-ad') && path !== 'index.html' && path !== 'ads-admin.html') {
      var aside = document.createElement('aside'); aside.id = 'side-ad'; aside.innerHTML = '<div class="ad-slot" data-ad="side"></div>'; document.body.appendChild(aside);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addExtras); else addExtras();

  // 광고 로더 (설정은 ads-admin.html 에서, 전 페이지 자동 적용)
  if (path !== 'ads-admin.html') { var adsS = document.createElement('script'); adsS.src = '/ads.js'; adsS.defer = true; document.head.appendChild(adsS); }
})();
