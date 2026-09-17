/* dailyfreetoolbox Worker — 정적 파일은 그대로 서빙하고, /api/* 만 여기서 처리 */


const WC_ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';
const SHARE_TTL_DAYS = 30;                       // 공유 데이터 보관 기간. 만든 시점 기준으로 고정, 열거나 플레이해도 연장되지 않음
const SHARE_TTL = 60 * 60 * 24 * SHARE_TTL_DAYS;
// 만료 시각(초 단위 unix time). 이후 모든 put 은 expirationTtl 대신 이 절대 시각을 써서 만료가 밀리지 않게 함
function expiresAtOf(createdAtMs) { return Math.floor(createdAtMs / 1000) + SHARE_TTL; }

// ===== 게임 점수 랭킹 =====
// 게임별 규칙: lower=작을수록 좋은 점수(시간), max=허용 최대, minMs=최소 플레이 시간, msPerPoint=점수당 최소 소요(ms, 조작 방지용 대략치)
const SCORE_GAMES = {
  order: { lower: true,  min: 4000,  max: 600000, minMs: 4000 },             // 숫자 순서 누르기: 1~30 완료 시간(ms)
  '2048': { lower: false, min: 100, max: 300000, minMs: 5000, msPerPoint: 2 }, // 2048: 점수
  reaction: { lower: true, min: 100, max: 1000, minMs: 7000 },               // 반응속도: 5회 평균(ms). 대기 1.5초×5회라 7초 미만은 불가
  'typing-ko': { lower: false, min: 60, max: 1300, minMs: 12000, units: [250, 500] }, // 타자(한글): 타/분. 주간 지정 3문장(약 300~450타), units=입력 타수를 소요시간과 대조
  'typing-en': { lower: false, min: 60, max: 1300, minMs: 12000, units: [230, 330] }, // 타자(영문): 타/분. 주간 지정 3문장(약 260~310타)
  color: { lower: false, min: 1, max: 80, minMs: 3000, msPerPoint: 450 },              // 틀린 색 찾기: 도달 단계 (60초 제한)
  math: { lower: false, min: 1, max: 100, minMs: 58000, maxMs: 75000 },                // 암산 스피드: 60초 정답 수
  'vocab-mid': { lower: false, min: 1, max: 60, minMs: 58000, maxMs: 75000 },          // 영단어 퀴즈(중등): 60초 정답 수
  'vocab-high': { lower: false, min: 1, max: 60, minMs: 58000, maxMs: 75000 },         // 영단어 퀴즈(고등)
  'vocab-toeic': { lower: false, min: 1, max: 60, minMs: 58000, maxMs: 75000 },        // 영단어 퀴즈(토익)
  digit: { lower: false, min: 3, max: 20, minMs: 3000, msPerPoint: 2200 },              // 숫자 외우기(순서): 최대 자릿수
  'digit-rev': { lower: false, min: 3, max: 20, minMs: 3000, msPerPoint: 2200 },        // 숫자 외우기(역순)
  periph: { lower: false, min: 1, max: 60, minMs: 2000, msPerPoint: 1200 },             // 주변시 숫자 읽기: 도달 단계
  mot: { lower: false, min: 1, max: 40, minMs: 6000, msPerPoint: 6000 },                // 점 추적: 도달 단계 (단계당 7초 이상)
  reverse: { lower: false, min: 1, max: 150, minMs: 58000, maxMs: 75000 },              // 반대로 누르기: 60초 정답 수
  gonogo: { lower: false, min: 1, max: 200, minMs: 3000, msPerPoint: 450 },             // 참기 게임: 초록 신호 성공 수
  'nono-5': { lower: true, min: 3000, max: 3600000, minMs: 3000 },                       // 네모로직 5×5: 완료 시간(ms)
  'nono-10': { lower: true, min: 15000, max: 3600000, minMs: 15000 },                    // 네모로직 10×10
  'nono-15': { lower: true, min: 40000, max: 7200000, minMs: 40000 },                    // 네모로직 15×15
  water: { lower: false, min: 1, max: 60, minMs: 5000, msPerPoint: 6000 },               // 물 붓기: 도달 레벨 (레벨당 6초 이상)
  block: { lower: false, min: 10, max: 100000, minMs: 5000, msPerPoint: 25 }             // 블록 채우기: 점수
};
const LB_SIZE = 100;
const BAD_WORDS = ['시발','씨발','씨팔','ㅅㅂ','병신','ㅂㅅ','좆','존나','개새','새끼','니미','엿먹','fuck','shit','bitch','sex','섹스','자지','보지','창녀','걸레'];
const rateMap = new Map(); // ip → [timestamps] (인스턴스 단위, 간이 제한)
function rateOk(ip, limit, windowMs) {
  const now = Date.now(); const arr = (rateMap.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now); rateMap.set(ip, arr); if (rateMap.size > 5000) rateMap.clear();
  return true;
}
function weekKey(d = new Date()) { // ISO 주차: YYYY-Www
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil((((t - y0) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}
function cleanName(v) {
  let n = String(v || '').replace(/[<>"'&\\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 8);
  if (n.length < 2) return null;
  const low = n.toLowerCase().replace(/\s/g, '');
  if (BAD_WORDS.some(w => low.includes(w))) return null;
  return n;
}
function better(g, a, b) { return g.lower ? a < b : a > b; }
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


    // ---- 밸런스 게임: 짧은 공유 링크 (제목 + A/B 질문 목록을 KV 에 30일 저장) ----
    if (url.pathname === '/api/balance' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const title = String(body.title || '밸런스 게임').slice(0, 60);
      const pairs = (Array.isArray(body.pairs) ? body.pairs.slice(0, 100) : [])
        .map(p => Array.isArray(p) ? [String(p[0] || '').slice(0, 80), String(p[1] || '').slice(0, 80)] : null)
        .filter(p => p && p[0] && p[1]);
      if (pairs.length < 1) return json({ ok: false, error: 'need_more_items' }, 400);
      const id = wcGenId();
      const createdAt = Date.now(), expiresAt = expiresAtOf(createdAt);
      try {
        await env.WORLDCUP_KV.put('bg:' + id, JSON.stringify({ title, pairs, createdAt, expiresAt }), { expiration: expiresAt });
      } catch (e) {
        return json({ ok: false, error: 'quota' }, 429);
      }
      return json({ ok: true, id, expiresAt });
    }
    if (url.pathname === '/api/balance' && request.method === 'GET') {
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const id = (url.searchParams.get('id') || '').trim();
      if (!/^[0-9a-z]{4,16}$/.test(id)) return json({ ok: false, error: 'invalid_id' }, 400);
      const data = await env.WORLDCUP_KV.get('bg:' + id, 'json');
      if (!data) return json({ ok: false, error: 'not_found' }, 404);
      return json({ ok: true, title: data.title, pairs: data.pairs, expiresAt: data.expiresAt || expiresAtOf(data.createdAt || Date.now()) }, 200, { 'cache-control': 'public, max-age=3600' });
    }

    // ---- 축구 라인업: 짧은 공유 링크 (경기 정보·명단·배치·메모를 KV 에 30일 저장) ----
    if (url.pathname === '/api/lineup' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      let b;
      try { b = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const str = (v, n) => String(v || '').slice(0, n);
      const size = [5, 6, 7, 8, 9, 11].includes(+b.size) ? +b.size : 11;
      const players = (Array.isArray(b.players) ? b.players.slice(0, 40) : []).map(p => ({ name: str(p && p.name, 12), no: str(p && p.no, 2) })).filter(p => p.name);
      const slots = (Array.isArray(b.slots) ? b.slots.slice(0, 11) : []).map(s => ({
        x: Math.max(0, Math.min(100, +s.x || 0)), y: Math.max(0, Math.min(100, +s.y || 0)),
        role: str(s && s.role, 2), p: (Number.isInteger(s && s.p) && s.p >= 0 && s.p < players.length) ? s.p : null
      }));
      if (!slots.some(s => s.p != null)) return json({ ok: false, error: 'need_more_items' }, 400);
      const data = { team: str(b.team, 30), vs: str(b.vs, 30), when: str(b.when, 30), place: str(b.place, 30), size, formation: str(b.formation, 12), color: Math.max(0, Math.min(7, +b.color || 0)), players, slots, memo: str(b.memo, 1000) };
      const id = wcGenId();
      const createdAt = Date.now(), expiresAt = expiresAtOf(createdAt);
      try {
        await env.WORLDCUP_KV.put('lu:' + id, JSON.stringify({ data, createdAt, expiresAt }), { expiration: expiresAt });
      } catch (e) {
        return json({ ok: false, error: 'quota' }, 429);
      }
      return json({ ok: true, id, expiresAt });
    }
    if (url.pathname === '/api/lineup' && request.method === 'GET') {
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const id = (url.searchParams.get('id') || '').trim();
      if (!/^[0-9a-z]{4,16}$/.test(id)) return json({ ok: false, error: 'invalid_id' }, 400);
      const rec = await env.WORLDCUP_KV.get('lu:' + id, 'json');
      if (!rec) return json({ ok: false, error: 'not_found' }, 404);
      return json({ ok: true, data: rec.data, expiresAt: rec.expiresAt }, 200, { 'cache-control': 'public, max-age=3600' });
    }

    // ---- 게임 랭킹: 조회 ----
    if (url.pathname === '/api/score' && request.method === 'GET') {
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const game = url.searchParams.get('game') || '';
      if (!SCORE_GAMES[game]) return json({ ok: false, error: 'unknown_game' }, 400);
      const wk = weekKey();
      const [all, week] = await Promise.all([env.WORLDCUP_KV.get(`lb:${game}:all`, 'json'), env.WORLDCUP_KV.get(`lb:${game}:${wk}`, 'json')]);
      return json({ ok: true, week: wk, all: all || [], weekly: week || [] }, 200, { 'cache-control': 'public, max-age=30' });
    }
    // ---- 게임 랭킹: 등록 (100위 안에 들 때만 KV 에 씀) ----
    if (url.pathname === '/api/score' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const ip = request.headers.get('cf-connecting-ip') || '0';
      if (!rateOk(ip, 5, 60000)) return json({ ok: false, error: 'rate' }, 429);
      let b; try { b = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const game = String(b.game || ''); const g = SCORE_GAMES[game];
      if (!g) return json({ ok: false, error: 'unknown_game' }, 400);
      const name = cleanName(b.name); if (!name) return json({ ok: false, error: 'bad_name' }, 400);
      const score = Math.round(+b.score), dur = Math.round(+b.duration || 0);
      if (!Number.isFinite(score) || score < g.min || score > g.max) return json({ ok: false, error: 'bad_score' }, 400);
      if (dur < g.minMs || (g.maxMs && dur > g.maxMs) || (g.msPerPoint && dur < score * g.msPerPoint)) return json({ ok: false, error: 'suspicious' }, 400);
      if (g.units) { // 타수/분 = units / (dur/60000) 이 신고 점수와 맞는지 (±10%)
        const units = Math.round(+b.units || 0);
        if (units < g.units[0] || units > g.units[1]) return json({ ok: false, error: 'suspicious' }, 400);
        const calc = units / (dur / 60000);
        if (Math.abs(calc - score) > Math.max(20, score * 0.1)) return json({ ok: false, error: 'suspicious' }, 400);
      }
      const meta = String(b.meta || '').slice(0, 20);
      const entry = { n: name, s: score, m: meta, d: new Date().toISOString().slice(0, 10) };
      const wk = weekKey();
      const keys = [`lb:${game}:all`, `lb:${game}:${wk}`];
      const boards = await Promise.all(keys.map(k => env.WORLDCUP_KV.get(k, 'json')));
      const ranks = [], writes = [];
      const lists = boards.map(bd => Array.isArray(bd) ? bd : []);
      lists.forEach((list, i) => {
        let pos = list.findIndex(e => better(g, score, e.s)); if (pos < 0) pos = list.length;
        if (pos >= LB_SIZE) { ranks.push(null); return; }
        list.splice(pos, 0, entry); if (list.length > LB_SIZE) list.length = LB_SIZE;
        ranks.push(pos + 1);
        const opts = i === 1 ? { expirationTtl: 60 * 60 * 24 * 21 } : {};  // 주간 보드는 3주 뒤 자동 삭제
        writes.push(env.WORLDCUP_KV.put(keys[i], JSON.stringify(list), opts));
      });
      let saved = true;
      try { await Promise.all(writes); } catch (e) { saved = false; }
      return json({ ok: true, saved, rankAll: ranks[0], rankWeek: ranks[1], week: wk, all: lists[0], weekly: lists[1] });
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
      const createdAt = Date.now(), expiresAt = expiresAtOf(createdAt);
      const payload = JSON.stringify({ title, items: cleanItems, stats: {}, totalPlays: 0, createdAt, expiresAt });
      if (payload.length > 24_000_000) return json({ ok: false, error: 'too_large' }, 413);
      const id = wcGenId();
      try {
        await env.WORLDCUP_KV.put('wc:' + id, payload, { expiration: expiresAt });
      } catch (e) {
        return json({ ok: false, error: 'quota' }, 429);
      }
      return json({ ok: true, id, expiresAt });
    }

    // ---- 이상형 월드컵: 불러오기 ----
    if (url.pathname === '/api/worldcup' && request.method === 'GET') {
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const id = (url.searchParams.get('id') || '').trim();
      if (!/^[0-9a-z]{4,16}$/.test(id)) return json({ ok: false, error: 'invalid_id' }, 400);
      const data = await env.WORLDCUP_KV.get('wc:' + id, 'json');
      if (!data) return json({ ok: false, error: 'not_found' }, 404);
      return json({ ok: true, title: data.title, items: data.items, stats: data.stats || {}, totalPlays: data.totalPlays || 0, expiresAt: data.expiresAt || expiresAtOf(data.createdAt || Date.now()) });
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
      // 만료 시각은 만들 때 정한 값 그대로 (투표해도 연장되지 않음). 예전 데이터에 expiresAt 이 없으면 생성 시각 기준으로 계산
      if (!data.expiresAt) data.expiresAt = expiresAtOf(data.createdAt || Date.now());
      try {
        await env.WORLDCUP_KV.put(key, JSON.stringify(data), { expiration: data.expiresAt });
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
          const rewriter = new HTMLRewriter()
            .on('title', { element(el) { el.setInnerContent(`${wcTitle} - 이상형 월드컵`); } })
            .on('meta[name="description"]', { element(el) { el.setAttribute('content', wcDesc); } })
            .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', wcTitle); } })
            .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', wcDesc); } })
            // 카카오 스크랩은 og:url 이 공유 주소와 다르면 og:url 쪽 메타를 읽을 수 있어, 공유 링크 자체를 og:url 로 지정
            .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', `https://${url.hostname}/worldcup?id=${id}`); } });
          // 공유 썸네일은 항목 사진 대신 월드컵 전용 이미지를 고정 사용 (사용자 사진은 비율이 제각각이라 잘려 보임)
          return rewriter.transform(assetRes);
        }
      }
    }

    // ---- 밸런스 게임 공유 페이지: 제목·설명을 게임 내용으로 치환 ----
    if ((url.pathname === '/balance-game.html' || url.pathname === '/balance-game') && url.searchParams.has('id') && env.WORLDCUP_KV) {
      const id = url.searchParams.get('id');
      if (/^[0-9a-z]{4,16}$/.test(id)) {
        const data = await env.WORLDCUP_KV.get('bg:' + id, 'json');
        if (data && Array.isArray(data.pairs) && data.pairs.length >= 1) {
          const assetRes = await env.ASSETS.fetch(request);
          const bgTitle = data.title || '밸런스 게임';
          const bgDesc = `${data.pairs[0][0]} vs ${data.pairs[0][1]}${data.pairs.length > 1 ? ` 외 ${data.pairs.length - 1}문제` : ''} — 당신의 선택은?`;
          return new HTMLRewriter()
            .on('title', { element(el) { el.setInnerContent(`${bgTitle} - 밸런스 게임`); } })
            .on('meta[name="description"]', { element(el) { el.setAttribute('content', bgDesc); } })
            .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', bgTitle); } })
            .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', bgDesc); } })
            .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', `https://${url.hostname}/balance-game?id=${id}`); } })
            .transform(assetRes);
        }
      }
    }

    // ---- 라인업 공유 페이지: 제목·설명을 경기 정보로 치환 ----
    if ((url.pathname === '/lineup.html' || url.pathname === '/lineup') && url.searchParams.has('id') && env.WORLDCUP_KV) {
      const id = url.searchParams.get('id');
      if (/^[0-9a-z]{4,16}$/.test(id)) {
        const rec = await env.WORLDCUP_KV.get('lu:' + id, 'json');
        if (rec && rec.data) {
          const d = rec.data;
          const assetRes = await env.ASSETS.fetch(request);
          const luTitle = `${d.team || '우리 팀'} 라인업${d.when ? ' · ' + d.when : ''}`;
          const starters = d.slots.filter(s => s.p != null).length;
          const luDesc = `${d.size}인제 ${d.formation} · 선발 ${starters}명${d.vs ? ' · vs ' + d.vs : ''}${d.place ? ' · ' + d.place : ''}`;
          return new HTMLRewriter()
            .on('title', { element(el) { el.setInnerContent(`${luTitle} - 축구 라인업`); } })
            .on('meta[name="description"]', { element(el) { el.setAttribute('content', luDesc); } })
            .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', luTitle); } })
            .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', luDesc); } })
            .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', `https://${url.hostname}/lineup?id=${id}`); } })
            .transform(assetRes);
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};
