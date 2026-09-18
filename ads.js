/* 광고 로더 — nav.js 가 모든 페이지에서 자동으로 불러옴
   /api/ads 의 설정(관리 페이지 ads-admin.html 에서 저장)을 읽어 .ad-slot[data-ad=…] 자리에 광고를 넣는다.
   설정 구조:
   { enabled:true, client:'ca-pub-xxxx', excludePages:['privacy.html'],
     slots:{ top:{enabled, type:'adsense'|'html', slot:'1234567890', format:'auto'|'horizontal'|'rectangle', html:'', minH:{m:100,d:90}, exclude:['game2048.html']}, ... } }
   미리보기: 아무 페이지나 ?adpreview=1 로 열면 설정과 무관하게 슬롯 자리를 라벨 박스로 표시 */
(function () {
  var path = location.pathname.split('/').pop() || 'index.html'; if (path === '') path = 'index.html';
  var preview = /[?&]adpreview=1/.test(location.search);
  var mobile = window.innerWidth < 720;
  var LABEL = { top: '상단', 'below-result': '결과 아래', 'in-content': '본문 중간', side: '사이드', infeed: '인피드' };

  function slots() { return Array.prototype.slice.call(document.querySelectorAll('.ad-slot[data-ad]')); }

  function showPreview() {
    slots().forEach(function (el) {
      var k = el.getAttribute('data-ad'); var h = k === 'side' ? 600 : (k === 'top' && !mobile ? 90 : 100);
      el.style.minHeight = h + 'px'; el.innerHTML = '<div style="height:' + h + 'px;display:flex;align-items:center;justify-content:center;border:2px dashed #c9a227;background:#fff3bf;color:#7a5a00;font:700 13px sans-serif;border-radius:4px">광고 자리: ' + (LABEL[k] || k) + ' (' + k + ')</div>';
    });
  }

  function runScripts(el) {
    el.querySelectorAll('script').forEach(function (old) {
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
      s.text = old.text; old.parentNode.replaceChild(s, old);
    });
  }

  var adsenseLoaded = false;
  function loadAdsense(client) {
    if (adsenseLoaded || !client) return; adsenseLoaded = true;
    var s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    document.head.appendChild(s);
  }

  function apply(cfg) {
    if (!cfg || !cfg.enabled) return;
    if ((cfg.excludePages || []).indexOf(path) >= 0) return;
    var any = false;
    slots().forEach(function (el) {
      var k = el.getAttribute('data-ad'); var sc = cfg.slots && cfg.slots[k];
      if (!sc || !sc.enabled) return;
      if ((sc.exclude || []).indexOf(path) >= 0) return;
      var mh = sc.minH ? (mobile ? sc.minH.m : sc.minH.d) : 0;
      if (mh) el.style.minHeight = mh + 'px';
      if (sc.type === 'html' && sc.html) { el.innerHTML = sc.html; runScripts(el); any = true; return; }
      if (sc.type === 'adsense' && sc.slot && cfg.client) {
        loadAdsense(cfg.client);
        var ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.display = 'block';
        ins.setAttribute('data-ad-client', cfg.client); ins.setAttribute('data-ad-slot', sc.slot);
        if (k === 'side') { ins.style.width = '300px'; ins.style.height = '600px'; }
        else { ins.setAttribute('data-ad-format', sc.format || 'auto'); ins.setAttribute('data-full-width-responsive', 'true'); }
        el.appendChild(ins);
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
        any = true;
      }
    });
    if (any && cfg.client && cfg.autoAds) loadAdsense(cfg.client);
  }

  function boot() {
    if (preview) { showPreview(); return; }
    fetch('/api/ads').then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) apply(d.config); }).catch(function () { });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
