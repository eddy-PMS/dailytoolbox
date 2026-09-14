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

    return env.ASSETS.fetch(request);
  }
};
