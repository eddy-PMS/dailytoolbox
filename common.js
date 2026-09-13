/* dailyfreetoolbox 공통 분석 코드 (GA4 + 네이버 애널리틱스)
   사용법: <head> 안에 <script src="common.js"></script> 한 줄.
   각 페이지의 gtag('event', ...) 호출은 그대로 동작합니다. */
(function () {
  // ---- Google Analytics 4 ----
  var GA_ID = 'G-Z8WYH7KGCP';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID);
  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(ga);

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
