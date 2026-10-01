/* dailyfreetoolbox 공통 분석 코드 (GA4 + 네이버 애널리틱스)
   사용법: <head> 안에 <script src="common.js"></script> 한 줄.
   각 페이지의 gtag('event', ...) 호출은 그대로 동작합니다.
   gtag 스크립트는 첫 화면 표시와 겹치지 않게 페이지가 그려진 뒤에 받습니다
   (load 뒤 · 사용자의 첫 조작 · 4초 중 가장 먼저 오는 때). */
(function () {
  // ---- Google Analytics 4 ----
  var GA_ID = 'G-Z8WYH7KGCP';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID);

  // gtag 스크립트를 받는 시점만 늦춘다. 위 대기열(dataLayer)에 쌓인 config 와
  // 로딩 전에 호출된 gtag('event', ...) 는 로딩 직후 그대로 전송된다.
  var EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  var LISTEN = { once: true, passive: true };
  var loaded = false, idleId = null, idleTimer = null, guardTimer = null;

  function cleanup() {
    for (var i = 0; i < EVENTS.length; i++) {
      window.removeEventListener(EVENTS[i], onInteract, LISTEN);
    }
    window.removeEventListener('load', onLoad);
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (guardTimer) { clearTimeout(guardTimer); guardTimer = null; }
    if (idleId !== null && window.cancelIdleCallback) {
      window.cancelIdleCallback(idleId); idleId = null;
    }
  }

  function loadGA() {
    if (loaded) return;          // 페이지당 한 번만
    loaded = true;
    cleanup();
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);
  }

  function onInteract() { loadGA(); }           // 조작한 사람은 기다리지 않게 즉시

  function schedule() {                         // load 뒤 한가해지면
    if (loaded || idleId !== null || idleTimer) return;
    if (window.requestIdleCallback) {
      idleId = window.requestIdleCallback(loadGA, { timeout: 2000 });
    } else {
      idleTimer = setTimeout(loadGA, 200);
    }
  }

  function onLoad() { schedule(); }

  for (var i = 0; i < EVENTS.length; i++) {
    window.addEventListener(EVENTS[i], onInteract, LISTEN);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', onLoad);
  guardTimer = setTimeout(loadGA, 4000);        // load 가 늦어도 4초면 받는다

  // ---- Naver Analytics ----
  var NA_ID = '260eb743dce6220';
  function initNaver() {
    if (!window.wcs_add) window.wcs_add = {};
    window.wcs_add['wa'] = NA_ID;
    if (window.wcs) { window.wcs_do(); }
  }
  var na = document.createElement('script');
  na.src = '//wcs.pstatic.net/wcslog.js';
  na.onload = initNaver;
  document.head.appendChild(na);
})();
