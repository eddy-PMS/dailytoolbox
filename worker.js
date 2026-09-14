/* dailyfreetoolbox Worker — 정적 파일은 그대로 서빙하고, /api/* 만 여기서 처리 */

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
      const ref = request.headers.get('referer') || '';
      const origin = request.headers.get('origin') || '';
      const host = url.hostname;
      if (!(ref.includes(host) || origin.includes(host))) return json({ ok: false, error: 'forbidden' }, 403);

      const ip = (url.searchParams.get('ip') || '').trim();
      if (!ip || !(IPV4.test(ip) || IPV6.test(ip))) return json({ ok: false, error: 'invalid_ip' }, 400);
      if (isPrivate(ip)) return json({ ok: false, error: 'private_ip' }, 400);

      const cache = caches.default;
      const cacheKey = new Request(`https://${host}/api/geo/cache/${ip}`);
      const hit = await cache.match(cacheKey);
      if (hit) return hit;

      let up;
      try {
        up = await fetch(`https://ipwho.is/${ip}?lang=en`, { headers: { 'user-agent': 'dailyfreetoolbox/1.0' } });
      } catch (e) {
        return json({ ok: false, error: 'upstream' }, 502);
      }
      if (!up.ok) return json({ ok: false, error: 'upstream', status: up.status }, 502);
      const d = await up.json();
      if (!d.success) {
        const quota = /limit|quota|exceed/i.test(d.message || '');
        return json({ ok: false, error: quota ? 'quota' : 'not_found', message: d.message || '' }, quota ? 429 : 404);
      }
      const body = {
        ok: true, ip: d.ip, type: d.type || '',
        country: d.country || '', countryCode: d.country_code || '', flag: (d.flag && d.flag.emoji) || '',
        region: d.region || '', city: d.city || '', postal: d.postal || '',
        latitude: d.latitude ?? '', longitude: d.longitude ?? '',
        timezone: (d.timezone && d.timezone.id) || '', utcOffset: (d.timezone && d.timezone.utc) || '',
        asn: (d.connection && d.connection.asn) || '', isp: (d.connection && d.connection.isp) || '', org: (d.connection && d.connection.org) || ''
      };
      const res = json(body, 200, { 'cache-control': 'public, max-age=2592000' }); // 30일
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    }

    return env.ASSETS.fetch(request);
  }
};
