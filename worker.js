/* dailyfreetoolbox Worker — 정적 파일은 그대로 서빙하고, /api/* 만 여기서 처리 */


const WC_ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';
const VOTE_SAMPLE_AFTER = 100; // 이 참여 수부터 표본 집계
const VOTE_SAMPLE_RATE = 5;    // 5회 중 1회만 KV 에 기록
function wcGenId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let s = '';
  for (const b of bytes) s += WC_ID_CHARS[b % WC_ID_CHARS.length];
  return s;
}
function isSameOrigin(request, host) {
  // referer/origin 의 hostname 이 우리 호스트와 정확히 같아야 통과 (문자열 포함 검사는 우회 가능)
  for (const h of ['origin', 'referer']) {
    const v = request.headers.get(h);
    if (!v) continue;
    try { if (new URL(v).hostname === host) return true; } catch (e) {}
  }
  return false;
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]{2,39}$/;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });
}

function isPrivate(ip) {
  return /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(ip);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname;

    // ---- 내 IP ----
    if (url.pathname === '/api/myip') {
      const cf = request.cf || {};
      return json({
        ip: request.headers.get('cf-connecting-ip') || '',
        country: cf.country || '', region: cf.region || '', city: cf.city || '', postalCode: cf.postalCode || '',
        latitude: cf.latitude || '', longitude: cf.longitude || '', timezone: cf.timezone || '',
        asn: cf.asn || '', isp: cf.asOrganization || '', colo: cf.colo || '',
        userAgent: request.headers.get('user-agent') || ''
      });
    }

    // ---- 임의 IP 위치 조회 (ipwho.is 무료 API + 엣지 캐시) ----
    if (url.pathname === '/api/geo') {
      // 우리 사이트에서 온 요청만 허용 (외부에서 프록시로 남용 방지)
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);

      const ip = (url.searchParams.get('ip') || '').trim();
      if (!ip || !(IPV4.test(ip) || IPV6.test(ip))) return json({ ok: false, error: 'invalid_ip' }, 400);
      if (isPrivate(ip)) return json({ ok: false, error: 'private_ip' }, 400);

      const cache = caches.default;
      const cacheKey = new Request(`https://${host}/api/geo/cache/${ip}`);
      const hit = await cache.match(cacheKey);
      if (hit) return hit;

      // 여러 무료 제공처를 순서대로 시도 (한 곳이 막혀도 동작하도록)
      const providers = [
        { name: 'ipwho.is', url: `https://ipwho.is/${ip}`, parse: d => d.success ? ({ country: d.country, cc: d.country_code, flag: d.flag && d.flag.emoji, region: d.region, city: d.city, postal: d.postal, lat: d.latitude, lon: d.longitude, tz: d.timezone && d.timezone.id, utc: d.timezone && d.timezone.utc, asn: d.connection && d.connection.asn, isp: d.connection && d.connection.isp, org: d.connection && d.connection.org, type: d.type }) : (/(limit|quota|exceed)/i.test(d.message || '') ? 'quota' : null) },
        { name: 'freeipapi', url: `https://freeipapi.com/api/json/${ip}`, parse: d => d.countryName ? ({ country: d.countryName, cc: d.countryCode, flag: '', region: d.regionName, city: d.cityName, postal: d.zipCode, lat: d.latitude, lon: d.longitude, tz: (d.timeZones && d.timeZones[0]) || '', utc: '', asn: '', isp: d.asnOrganization || '', org: '', type: d.ipVersion === 6 ? 'IPv6' : 'IPv4' }) : null },
        { name: 'ipapi.co', url: `https://ipapi.co/${ip}/json/`, parse: d => d.error ? (/(quota|limit|throttl)/i.test(d.reason || '') ? 'quota' : null) : ({ country: d.country_name, cc: d.country_code, flag: '', region: d.region, city: d.city, postal: d.postal, lat: d.latitude, lon: d.longitude, tz: d.timezone, utc: d.utc_offset, asn: (d.asn || '').replace(/^AS/, ''), isp: d.org, org: d.org, type: d.version || '' }) }
      ];
      let info = null, quota = false, errors = [];
      for (const p of providers) {
        try {
          const r = await fetch(p.url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; dailyfreetoolbox/1.0; +https://dailyfreetoolbox.com)', 'accept': 'application/json' }, cf: { cacheTtl: 0 } });
          if (!r.ok) { errors.push(p.name + ':' + r.status); continue; }
          const d = await r.json();
          const parsed = p.parse(d);
          if (parsed === 'quota') { quota = true; errors.push(p.name + ':quota'); continue; }
          if (!parsed) { errors.push(p.name + ':nodata'); continue; }
          info = parsed; break;
        } catch (e) { errors.push(p.name + ':' + (e && e.message ? e.message.slice(0, 40) : 'err')); }
      }
      if (!info) {
        return json({ ok: false, error: quota ? 'quota' : 'upstream', detail: errors.join(' | ') }, quota ? 429 : 502);
      }
      const body = {
        ok: true, ip, type: info.type || '',
        country: info.country || '', countryCode: info.cc || '', flag: info.flag || '',
        region: info.region || '', city: info.city || '', postal: info.postal || '',
        latitude: info.lat ?? '', longitude: info.lon ?? '',
        timezone: info.tz || '', utcOffset: info.utc || '',
        asn: info.asn || '', isp: info.isp || '', org: info.org || ''
      };
      const res = json(body, 200, { 'cache-control': 'public, max-age=2592000' }); // 30일
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    }


    // ---- 이상형 월드컵: 만들기 ----
    if (url.pathname === '/api/worldcup' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const title = String(body.title || '이상형 월드컵').slice(0, 60);
      const items = Array.isArray(body.items) ? body.items.slice(0, 64) : [];
      if (items.length < 2) return json({ ok: false, error: 'need_more_items' }, 400);
      const cleanItems = items.map(it => ({
        name: String((it && it.name) || '').slice(0, 40),
        img: typeof (it && it.img) === 'string' ? it.img.slice(0, 6_000_000) : ''
      })).filter(it => it.name);
      if (cleanItems.length < 2) return json({ ok: false, error: 'need_more_items' }, 400);
      const payload = JSON.stringify({ title, items: cleanItems, stats: {}, totalPlays: 0, createdAt: Date.now() });
      if (payload.length > 24_000_000) return json({ ok: false, error: 'too_large' }, 413);
      const id = wcGenId();
      try {
        await env.WORLDCUP_KV.put('wc:' + id, payload, { expirationTtl: 60 * 60 * 24 * 180 });
      } catch (e) {
        return json({ ok: false, error: 'quota' }, 429);
      }
      return json({ ok: true, id });
    }

    // ---- 이상형 월드컵: 불러오기 ----
    if (url.pathname === '/api/worldcup' && request.method === 'GET') {
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const id = (url.searchParams.get('id') || '').trim();
      if (!/^[0-9a-z]{4,16}$/.test(id)) return json({ ok: false, error: 'invalid_id' }, 400);
      const data = await env.WORLDCUP_KV.get('wc:' + id, 'json');
      if (!data) return json({ ok: false, error: 'not_found' }, 404);
      return json({ ok: true, title: data.title, items: data.items, stats: data.stats || {}, totalPlays: data.totalPlays || 0 });
    }

    // ---- 이상형 월드컵: 결과 반영(승률 집계) ----
    if (url.pathname === '/api/worldcup/vote' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const id = String(body.id || '').trim();
      const playedIdx = Array.isArray(body.playedIdx) ? body.playedIdx.filter(n => Number.isInteger(n)) : [];
      const championIdx = Number.isInteger(body.championIdx) ? body.championIdx : null;
      if (!/^[0-9a-z]{4,16}$/.test(id) || championIdx === null) return json({ ok: false, error: 'bad_request' }, 400);
      const key = 'wc:' + id;
      const data = await env.WORLDCUP_KV.get(key, 'json');
      if (!data) return json({ ok: false, error: 'not_found' }, 404);
      data.stats = data.stats || {};
      data.totalPlays = data.totalPlays || 0;
      // KV 쓰기 한도(무료: 하루 1,000회, 같은 키 초당 1회) 보호용 표본 집계:
      // 참여 100회까지는 전부 기록하고, 그 뒤로는 5회 중 1회만 기록하되 5배 가중치로 더한다(비율은 그대로, 쓰기 횟수는 1/5).
      const weight = data.totalPlays >= VOTE_SAMPLE_AFTER ? VOTE_SAMPLE_RATE : 1;
      if (weight > 1 && Math.random() * weight >= 1) {
        return json({ ok: true, stats: data.stats, totalPlays: data.totalPlays, sampled: true });
      }
      for (const i of playedIdx) {
        if (i < 0 || i >= data.items.length) continue;
        data.stats[i] = data.stats[i] || { played: 0, champion: 0 };
        data.stats[i].played += weight;
      }
      if (championIdx >= 0 && championIdx < data.items.length) {
        data.stats[championIdx] = data.stats[championIdx] || { played: 0, champion: 0 };
        data.stats[championIdx].champion += weight;
      }
      data.totalPlays += weight;
      try {
        await env.WORLDCUP_KV.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 180 });
      } catch (e) {
        // 쓰기 한도 초과 시에도 플레이는 정상 종료되도록 현재 통계를 그대로 돌려준다
        return json({ ok: true, stats: data.stats, totalPlays: data.totalPlays, sampled: true, saved: false });
      }
      return json({ ok: true, stats: data.stats, totalPlays: data.totalPlays });
    }

    // ---- 이상형 월드컵 페이지: 공유된 월드컵이면 카카오톡 등 미리보기용 제목/설명/이미지를 실제 내용으로 바꿔치기 ----
    if ((url.pathname === '/worldcup.html' || url.pathname === '/worldcup') && url.searchParams.has('id') && env.WORLDCUP_KV) {
      const id = url.searchParams.get('id');
      if (/^[0-9a-z]{4,16}$/.test(id)) {
        const data = await env.WORLDCUP_KV.get('wc:' + id, 'json');
        if (data && Array.isArray(data.items) && data.items.length >= 2) {
          const assetRes = await env.ASSETS.fetch(request);
          const wcTitle = data.title || '이상형 월드컵';
          const wcDesc = `${data.items[0].name} vs ${data.items[1].name} 등 ${data.items.length}개 항목 중 최고를 골라보세요!`;
          const firstImg = (data.items.find(it => /^https?:\/\//.test(it.img || '')) || {}).img || '';
          const rewriter = new HTMLRewriter()
            .on('title', { element(el) { el.setInnerContent(`${wcTitle} - 이상형 월드컵`); } })
            .on('meta[name="description"]', { element(el) { el.setAttribute('content', wcDesc); } })
            .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', wcTitle); } })
            .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', wcDesc); } });
          if (firstImg) {
            // 페이지 기본 og:image(사이트 대표 이미지)를 월드컵 첫 항목 이미지로 교체
            rewriter.on('meta[property="og:image"]', { element(el) { el.setAttribute('content', firstImg); } })
                    .on('meta[property="og:image:width"]', { element(el) { el.remove(); } })
                    .on('meta[property="og:image:height"]', { element(el) { el.remove(); } });
          }
          return rewriter.transform(assetRes);
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};
