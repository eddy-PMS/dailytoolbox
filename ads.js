/* 광고 로더 — nav.js 가 모든 페이지에서 자동으로 불러옴
   /api/ads 의 설정(관리 페이지 ads-admin.html 에서 저장)을 읽어 .ad-slot[data-ad=…] 자리에 광고를 넣는다.
   설정 구조:
   { enabled:true, client:'ca-pub-xxxx', excludePages:['privacy.html'],
     slots:{ top:{enabled, type:'adsense'|'html'|'image', slot:'1234567890', format:'auto'|'horizontal'|'rectangle', html:'',
                  img:'/api/ads/image/<id>', href:'https://…', alt:'', w:728, h:90,      // type:'image' 일 때 — 이미지 배너
                  minH:{m:100,d:90}, exclude:['game2048.html'],
                  rules:[ {pages:['salary.html','pyeong.html'], type:'image', img, href, alt, w, h} ]   // 페이지별 배너. 맞는 첫 규칙이 기본 배너 대신 나온다
                }, ... } }
   미리보기: 아무 페이지나 ?adpreview=1 로 열면 설정과 무관하게 슬롯 자리를 라벨 박스로 표시 */
(function () {
  var path = location.pathname.split('/').pop() || 'index.html'; if (path === '') path = 'index.html';
  if (path.indexOf('.') < 0) path += '.html';
  if (path === 'ads-admin.html') return;
  var preview = /[?&]adpreview=1/.test(location.search);
  var mobile = window.innerWidth < 720;
  var LABEL = { top: '상단', 'below-result': '결과 아래', 'in-content': '본문 중간', side: '왼쪽 세로', 'side-box': '오른쪽 박스', infeed: '인피드' };

  function slots() { return Array.prototype.slice.call(document.querySelectorAll('.ad-slot[data-ad]')); }

  function showPreview() {
    slots().forEach(function (el) {
      var k = el.getAttribute('data-ad'); var h = k === 'side' ? 600 : (k === 'side-box' ? 250 : (k === 'top' && !mobile ? 90 : 100));
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

  // 페이지별 규칙: 이 페이지가 들어 있는 첫 규칙을 쓰고, 없으면 자리의 기본 배너를 쓴다
  function creativeFor(sc) {
    var rules = sc.rules || [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i] && (rules[i].pages || []).indexOf(path) >= 0) return rules[i];
    }
    return sc;
  }

  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|\/(?!\/))/i.test(u) ? u : ''; }

  // 이미지 배너. 설정값을 HTML 로 이어 붙이지 않고 요소를 직접 만들어 넣는다
  function imageBanner(el, c, k) {
    var src = safeUrl(c.img); if (!src) return false;
    var href = safeUrl(c.href);
    var img = document.createElement('img');
    img.src = src; img.alt = c.alt || ''; img.decoding = 'async';
    if (+c.w > 0 && +c.h > 0) { img.width = +c.w; img.height = +c.h; }
    img.style.cssText = 'max-width:100%;height:auto;display:block;margin:0 auto;border:0';
    var box = img;
    if (href) {
      box = document.createElement('a');
      box.href = href; box.target = '_blank'; box.rel = 'sponsored noopener';
      box.style.cssText = 'display:block';
      box.appendChild(img);
      box.addEventListener('click', function () {
        if (typeof gtag === 'function') gtag('event', 'ad_banner_click', { slot: k, page: path, banner: src.split('/').pop() });
      });
    }
    el.appendChild(box);
    return true;
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
      var c = creativeFor(sc);
      if (c.type === 'image') { if (imageBanner(el, c, k)) any = true; return; }
      if (c.type === 'html' && c.html) { el.innerHTML = c.html; runScripts(el); any = true; return; }
      if (c.type === 'adsense' && c.slot && cfg.client) {
        loadAdsense(cfg.client);
        var ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.display = 'block';
        ins.setAttribute('data-ad-client', cfg.client); ins.setAttribute('data-ad-slot', c.slot);
        // 사이드 두 자리는 고정 크기. 표준 규격이라야 제대로 채워진다 (레일 폭은 nav.js 참고)
        if (k === 'side') { ins.style.width = (window.innerWidth >= 1380 ? 300 : 160) + 'px'; ins.style.height = '600px'; }
        else if (k === 'side-box') { ins.style.width = '300px'; ins.style.height = '250px'; }
        else { ins.setAttribute('data-ad-format', c.format || sc.format || 'auto'); ins.setAttribute('data-full-width-responsive', 'true'); }
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
