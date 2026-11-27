/* dailyfreetoolbox Worker — 정적 파일은 그대로 서빙하고, /api/* 만 여기서 처리 */


const WC_ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';
const SHARE_TTL_DAYS = 30;                       // 공유 데이터 보관 기간. 만든 시점 기준으로 고정, 열거나 플레이해도 연장되지 않음
const SHARE_TTL = 60 * 60 * 24 * SHARE_TTL_DAYS;
// 만료 시각(초 단위 unix time). 이후 모든 put 은 expirationTtl 대신 이 절대 시각을 써서 만료가 밀리지 않게 함
function expiresAtOf(createdAtMs) { return Math.floor(createdAtMs / 1000) + SHARE_TTL; }

// ===== 게임 점수 랭킹 =====
// 게임별 규칙: lower=작을수록 좋은 점수(시간), max=허용 최대, minMs=최소 플레이 시간, msPerPoint=점수당 최소 소요(ms, 조작 방지용 대략치)
//             timeIsScore=점수가 곧 소요 시간인 게임(신고한 점수와 실제 플레이 시간이 맞는지 대조)
const SCORE_GAMES = {
  order: { lower: true,  min: 4000,  max: 600000, minMs: 4000 },             // 숫자 순서 누르기: 1~30 완료 시간(ms)
  '2048': { lower: false, min: 100, max: 300000, minMs: 5000, msPerPoint: 2 }, // 2048: 점수
  reaction: { lower: true, min: 100, max: 1000, minMs: 7000 },               // 반응속도: 5회 평균(ms). 대기 1.5초×5회라 7초 미만은 불가
  'typing-ko': { lower: false, min: 60, max: 1300, minMs: 12000, units: [250, 500] }, // 타자(한글): 타/분. 주간 지정 3문장(약 300~450타), units=입력 타수를 소요시간과 대조
  'typing-en': { lower: false, min: 60, max: 1300, minMs: 12000, units: [230, 330] }, // 타자(영문): 타/분. 주간 지정 3문장(약 260~310타)
  'phone-ko': { lower: false, min: 30, max: 1000, minMs: 6000, units: [100, 190] },  // 핸드폰 타자(한글): 타/분. 문장 5개(약 115~172타), 자판 구분 없음
  'phone-en': { lower: false, min: 30, max: 1000, minMs: 6000, units: [120, 200] },  // 핸드폰 타자(영문): 타/분. 문장 5개(약 135~186타)
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
  nono: { lower: false, min: 1, max: 100, minMs: 5000, msPerPoint: 5000 },  // 100레벨 넘게 깨도 랭킹은 100까지              // 네모로직: 도달 레벨 (레벨당 5초 이상)
  water: { lower: false, min: 1, max: 60, minMs: 5000, msPerPoint: 6000 },               // 물 붓기: 도달 레벨 (레벨당 6초 이상)
  block: { lower: false, min: 10, max: 100000, minMs: 5000, msPerPoint: 25 },            // 블록 채우기: 점수
  'mine-easy': { lower: true, min: 1000,  max: 600000,  minMs: 1000,  timeIsScore: true }, // 지뢰찾기 초급(9×9·10): 완료 시간(ms)
  'mine-mid':  { lower: true, min: 8000,  max: 1200000, minMs: 8000,  timeIsScore: true }, // 지뢰찾기 중급(16×16·40)
  'mine-hard': { lower: true, min: 25000, max: 1800000, minMs: 25000, timeIsScore: true }, // 지뢰찾기 고급(16×30·99)
  cps: { lower: false, min: 10, max: 250, minMs: 9500, maxMs: 13000 },                    // CPS 테스트: 10초 동안 누른 횟수 (초당 25회가 상한)
  aim: { lower: true, min: 6000, max: 180000, minMs: 6000, timeIsScore: true }             // 에임 테스트: 과녁 30개를 맞히는 데 걸린 시간(ms). 과녁당 0.2초 미만은 불가
};
const LB_SIZE = 100;
// ===== 광고 배너 이미지 =====
const AD_IMG_MAX = 1024 * 1024;                  // 1MB. 배너 한 장으로는 충분하고 KV 값 한도(25MB)보다 훨씬 작다
const AD_IMG_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];   // SVG 는 스크립트를 담을 수 있어 받지 않는다
function adImageType(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}
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
// ===== 모의고사 의견 =====
const FB_TOOLS = { cs2: { maxQid: 200, std: '2027' }, ss2: { maxQid: 240, std: '2027' }, ipe: { maxQid: 300, std: '2027' }, wp: { maxQid: 180, std: '2027' }, acc2: { maxQid: 90, std: '2026' }, cs1: { maxQid: 180, std: '2027' }, acc1: { maxQid: 90, std: '2026' }, 'tf-skku': { maxQid: 399, std: '2026' } };   // 의견을 받는 도구: 문항 번호 범위, 출제기준 판
const FB_TTL = 60 * 60 * 24 * 400;                         // 400일 뒤 자동 삭제
const FB_DAILY_MAX = 300;                                  // 하루 저장 상한(랭킹과 KV 쓰기 한도를 함께 쓰므로)
// 글 안의 이메일·전화번호 꼴은 저장 전에 가린다
function maskContact(s) {
  return s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '***')
          .replace(/(\+?82[-.\s]?)?0?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, '***')
          .replace(/\b0\d{1,2}[-.\s)]\d{3,4}[-.\s]\d{4}\b/g, '***');
}
// ===== 편입영어 모의고사 '응시자 중 내 위치' =====
// 이 기능 저장은 D1 dtb-main(바인딩 DB, dailytoolbox 계정) tf_rank_dist·tf_rank_day. 저장 1건 = 한 batch 에 D1 쓰기 2줄, 회차당 하루 TF_RANK_ROUND_DAY(행 81개 합 최대 8,100건 = 16,200줄, 무료 하루 10만 가정), 요청 1건 = 읽기 1~2줄. KV 는 쓰지 않는다. Studio 스펙 2026-11-27-dtb-transfer-rank 변경 이력 (5)
// 저장은 학교·회차·판·점수 칸(100점 기준 1점 단위) 합계와 날짜별 응시 수뿐. IP·User-Agent·시각은 저장하지 않는다(rateOk 메모리 대조만).
// 환경 변수 TF_RANK_PAUSE === '1' 이면 저장만 멈춘다('0'·없음은 정상). 값은 대시보드에서 대표가 넣는다(코드·wrangler.jsonc 에 값 없음).
const TF_RANK_SCHOOLS = ['skku', 'sookmyung', 'sejong', 'cau', 'gachon', 'konkuk', 'kyonggi', 'khu', 'sogang', 'dankook', 'ajou', 'duksung', 'ssu', 'inha', 'hufs', 'kw', 'mju', 'tukorea', 'kau', 'swu', 'hongik', 'uos', 'police', 'catholic', 'hanyang', 'ewha'];
// 학교별 문제 파일 checked → 판 글자. 오타·해설 손질로 checked 만 바뀌면 새 checked 를 같은 판 글자로 더한다(표본 유지).
// 문항 내용·정답이 바뀌면 새 checked 를 새 판 글자('2'…)로 더한다. 옛 checked 줄은 지우지 않는다(캐시된 옛 파일 사용자용).
const TF_RANK_VERS = {
  skku: { '2026-11-23': '1', '2026-11-27': '2' }, sookmyung: { '2026-11-23': '1' }, sejong: { '2026-11-23': '1' }, cau: { '2026-11-23': '1' },
  gachon: { '2026-11-23': '1' }, konkuk: { '2026-11-23': '1' }, kyonggi: { '2026-11-23': '1' }, khu: { '2026-11-23': '1' },
  sogang: { '2026-11-23': '1' }, dankook: { '2026-11-23': '1' }, ajou: { '2026-11-23': '1' }, duksung: { '2026-11-23': '1' },
  ssu: { '2026-11-23': '1' }, inha: { '2026-11-23': '1' }, hufs: { '2026-11-23': '1' }, kw: { '2026-11-23': '1' },
  mju: { '2026-11-23': '1' }, tukorea: { '2026-11-23': '1' }, kau: { '2026-11-23': '1' }, swu: { '2026-11-23': '1' },
  hongik: { '2026-11-23': '1' }, uos: { '2026-11-23': '1' }, police: { '2026-11-23': '1' }, catholic: { '2026-11-23': '1' },
  hanyang: { '2026-11-23': '1' }, ewha: { '2026-11-24': '1' }
};
const TF_RANK_ROUNDS = 3;        // 허용 회차 1~3
const TF_RANK_ROUND_DAY = 100;   // 회차(행)당 하루(UTC) 저장 몫. 행의 d·w 로 같은 upsert 안에서 판단(판단에 쓰기 0)
const TF_RANK_KEEP_DAYS = 400;   // 마지막 저장일(dist)·그 날짜(day)로부터 400일 뒤 scheduled() 가 지운다
const TF_RANK_MIN_N = 20;        // 이 수보다 적으면 위치 대신 표본 부족
// 내 칸: 29/50*100 = 57.99999999999999 같은 부동소수 오차를 먼저 걷어 낸다
function tfRankBin(pct) { return Math.floor(Math.round(pct * 1000) / 1000); }
function utcDay(t = new Date()) { return t.toISOString().slice(0, 10).replace(/-/g, ''); }
// 학교·회차·ver 검사. 통과하면 행 키 {school, round, ver: 판 글자}, 아니면 오류 이름
function tfRankKeyOf(school, round, ver) {
  if (!TF_RANK_SCHOOLS.includes(school)) return { error: 'bad_request' };
  if (!Number.isInteger(round) || round < 1 || round > TF_RANK_ROUNDS) return { error: 'bad_request' };
  const vers = TF_RANK_VERS[school];
  if (typeof ver !== 'string' || !Object.prototype.hasOwnProperty.call(vers, ver)) return { error: 'bad_ver' };
  return { school, round, ver: vers[ver] };
}
// 저장된 b(101칸 JSON 글자) → 정수 배열
function tfRankParse(s) {
  let a; try { a = JSON.parse(s); } catch { a = null; }
  if (!Array.isArray(a) || a.length !== 101) return new Array(101).fill(0);
  return a.map(x => Number.isInteger(x) && x > 0 ? x : 0);
}
// 저장 1건 = 아래 두 문장을 env.DB.batch 한 번(한 트랜잭션). ?6 경로는 JS 에서 '$[58]' 꼴 글자로 묶는다
const TF_RANK_UPSERT = `INSERT INTO tf_rank_dist (school, round, ver, b, n, d, w) VALUES (?1, ?2, ?3, ?4, 1, ?5, 1)
ON CONFLICT (school, round, ver) DO UPDATE SET
  b = json_set(b, ?6, json_extract(b, ?6) + 1),
  n = n + 1,
  w = CASE WHEN d = ?5 THEN w + 1 ELSE 1 END,
  d = ?5
WHERE d <> ?5 OR w < ?7
RETURNING b, n, w`;
const TF_RANK_DAY_UPSERT = `INSERT INTO tf_rank_day (day, school, round, ver, n) SELECT ?1, ?2, ?3, ?4, 1 WHERE changes() = 1
ON CONFLICT (day, school, round, ver) DO UPDATE SET n = n + 1`;
// 상위 % = (나보다 높은 칸 수 + 1) / n. 정수 곱을 먼저 해 부동소수 오차를 피한다
function tfRankTop(b, n, bin) {
  if (n < TF_RANK_MIN_N) return null;
  let higher = 0; for (let i = bin + 1; i < 101; i++) higher += b[i];
  return Math.max(1, Math.ceil((higher + 1) * 100 / n));
}
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


    // ---- 편입영어 모의고사 '응시자 중 내 위치': 실전 모드를 끝내면 점수 칸 합계에 더하고 상위 % 를 돌려준다 ----
    if (url.pathname === '/api/tf-rank' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      const ip = request.headers.get('CF-Connecting-IP') || '';
      if (!rateOk('tfrx:' + ip, 60, 60 * 1000)) return json({ ok: false, error: 'rate' }, 429);
      if (!env.DB) return json({ ok: false, error: 'not_configured' }, 500);
      let b;
      try { b = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      if (!b || typeof b !== 'object') return json({ ok: false, error: 'bad_request' }, 400);
      const school = String(b.school || ''), round = b.round;
      const k = tfRankKeyOf(school, round, b.ver);
      if (k.error) return json({ ok: false, error: k.error }, 400);
      const { pct, total, answered, dur } = b;
      if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) return json({ ok: false, error: 'bad_request' }, 400);
      if (!Number.isInteger(total) || total < 10 || total > 200) return json({ ok: false, error: 'bad_request' }, 400);
      if (!Number.isInteger(answered) || answered < Math.ceil(total / 2) || answered > total) return json({ ok: false, error: 'bad_request' }, 400);
      if (typeof dur !== 'number' || !Number.isFinite(dur) || dur < answered * 8000) return json({ ok: false, error: 'bad_request' }, 400);
      if (b.website) return json({ ok: false, error: 'bad_request' }, 400);         // 숨은 칸이 채워졌으면 봇
      // 집계 여부: 같은 IP 1시간 10건, 같은 IP·같은 회차 하루 3건까지. 넘쳐도 오류 없이 위치만 보여 준다
      const use = b.count === true && rateOk('tfrh:' + ip, 10, 60 * 60 * 1000) && rateOk('tfr1:' + ip + ':' + school + ':' + round, 3, 24 * 60 * 60 * 1000);
      const today = utcDay(), paused = env.TF_RANK_PAUSE === '1';
      const bin = tfRankBin(pct);
      if (!Number.isInteger(bin) || bin < 0 || bin > 100) return json({ ok: false, error: 'bad_request' }, 400);
      let saved = false, full = false, dist = null, n = 0;
      if (use && !paused) {
        const path = '$[' + bin + ']';                // 경로는 JS 에서 글자로(SQL 안에서 숫자를 이어 붙이면 '$[58.0]' 이 될 수 있음)
        const mine = new Array(101).fill(0); mine[bin] = 1;
        try {
          const r = await env.DB.batch([
            env.DB.prepare(TF_RANK_UPSERT).bind(k.school, k.round, k.ver, JSON.stringify(mine), today, path, TF_RANK_ROUND_DAY),
            env.DB.prepare(TF_RANK_DAY_UPSERT).bind(today, k.school, k.round, k.ver)
          ]);
          const row = r[0] && r[0].results && r[0].results[0];
          if (row) { saved = true; dist = tfRankParse(row.b); n = row.n; }
          else full = true;                           // 회차당 하루 몫 찼음: 쓰기 0
        } catch (e) { console.error('tf_rank_db', e && e.message); }   // IP·User-Agent 는 남기지 않는다
      }
      if (!saved) {
        try {
          const row = await env.DB.prepare('SELECT b, n FROM tf_rank_dist WHERE school = ?1 AND round = ?2 AND ver = ?3').bind(k.school, k.round, k.ver).first();
          dist = row ? tfRankParse(row.b) : new Array(101).fill(0); n = row ? row.n : 0;
        } catch (e) { console.error('tf_rank_db', e && e.message); return json({ ok: false, error: 'db' }, 503); }
        if (use) { dist[bin] += 1; n += 1; }         // 멈춤·몫 찼음·저장 실패도 저장됐을 때와 같은 식
      }
      const out = { ok: true, n, top: tfRankTop(dist, n, bin), saved };
      if (use && paused) out.paused = true;
      if (use && full) out.full = true;
      return json(out);
    }
    // 측정용 조회: 저장된 n 과 오늘(UTC) 저장 수
    if (url.pathname === '/api/tf-rank' && request.method === 'GET') {
      if (!env.DB) return json({ ok: false, error: 'not_configured' }, 500);
      const school = url.searchParams.get('school') || '', round = Number(url.searchParams.get('round'));
      const k = tfRankKeyOf(school, round, url.searchParams.get('ver') || '');
      if (k.error) return json({ ok: false, error: k.error }, 400);
      let row;
      try { row = await env.DB.prepare('SELECT n, d, w FROM tf_rank_dist WHERE school = ?1 AND round = ?2 AND ver = ?3').bind(k.school, k.round, k.ver).first(); }
      catch (e) { console.error('tf_rank_db', e && e.message); return json({ ok: false, error: 'db' }, 503); }
      return json({ ok: true, n: row ? row.n : 0, today: row && row.d === utcDay() ? row.w : 0 }, 200, { 'cache-control': 'public, max-age=60' });
    }

    // ---- 모의고사 의견: 글·문항 번호·응시 여부만 KV 에 400일 저장. IP·기기 정보는 저장하지 않는다 ----
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      if (!isSameOrigin(request, host)) return json({ ok: false, error: 'forbidden' }, 403);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const tool = FB_TOOLS[body.tool] || (/^tf-[a-z]{2,12}$/.test(String(body.tool)) ? { maxQid: 399, std: '2026' } : null);   // 편입영어 모의고사는 학교마다 tf-<학교>, qid = 회차×100+문항
      if (!tool) return json({ ok: false, error: 'bad_tool' }, 400);
      if (body.website) return json({ ok: false, error: 'bad_request' }, 400);         // 숨은 칸이 채워졌으면 봇
      const text = maskContact(String(body.text || '').replace(/\s+/g, ' ').trim());
      if (text.length < 10 || text.length > 500) return json({ ok: false, error: 'length' }, 400);
      const qid = Number.isInteger(body.qid) && body.qid >= 1 && body.qid <= tool.maxQid ? body.qid : null;
      const took = body.took === 'yes' || body.took === 'no' ? body.took : null;
      const ip = request.headers.get('CF-Connecting-IP') || '';
      if (!rateOk('fbh:' + ip, 5, 60 * 60 * 1000) || !rateOk('fbd:' + ip, 20, 24 * 60 * 60 * 1000)) return json({ ok: false, error: 'rate' }, 429);
      const now = new Date(), kst = new Date(now.getTime() + 9 * 3600 * 1000);
      const day = kst.toISOString().slice(0, 10).replace(/-/g, '');
      const cntKey = `fbc:${body.tool}:${day}`;                          // 하루 상한 세는 키(이틀 뒤 삭제). 목록 앞머리 fb: 와 겹치지 않게 따로 둔다
      const cnt = Number(await env.WORLDCUP_KV.get(cntKey)) || 0;
      if (cnt >= FB_DAILY_MAX) return json({ ok: false, error: 'daily_full' }, 429);
      const key = `fb:${body.tool}:${day}:${wcGenId()}`;
      const exp = Math.floor(now.getTime() / 1000) + FB_TTL;
      try {
        await env.WORLDCUP_KV.put(key, JSON.stringify({ t: now.toISOString(), tool: body.tool, qid, took, text, std: tool.std }), { expiration: exp });
        await env.WORLDCUP_KV.put(cntKey, String(cnt + 1), { expirationTtl: 2 * 24 * 3600 });
      } catch (e) {
        return json({ ok: false, error: 'quota' }, 429);
      }
      return json({ ok: true });
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

    // ---- 광고 설정: 조회(공개, 5분 캐시) / 저장(관리자 토큰) ----
    if (url.pathname === '/api/ads' && request.method === 'GET') {
      if (!env.WORLDCUP_KV) return json({ ok: true, config: null }, 200, { 'cache-control': 'no-store' });
      const wantAdmin = url.searchParams.get('admin') === '1';
      if (wantAdmin) { // 관리 페이지 불러오기: 토큰을 여기서부터 검증 (시크릿 부재·불일치를 바로 알림)
        if (!env.ADMIN_TOKEN) return json({ ok: false, error: 'no_admin_token' }, 500);
        if (request.headers.get('x-admin-token') !== env.ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);
      }
      const isAdmin = wantAdmin;
      const cache = caches.default; const ck = new Request(`https://${host}/api/ads`);
      if (!isAdmin) { const hit = await cache.match(ck); if (hit) return hit; }
      const cfg = await env.WORLDCUP_KV.get('ads:config', 'json');
      const res = json({ ok: true, config: cfg || null }, 200, { 'cache-control': isAdmin ? 'no-store' : 'public, max-age=300' });
      if (!isAdmin) ctx.waitUntil(cache.put(ck, res.clone()));
      return res;
    }
    if (url.pathname === '/api/ads' && request.method === 'POST') {
      if (!env.ADMIN_TOKEN) return json({ ok: false, error: 'no_admin_token' }, 500);
      if (request.headers.get('x-admin-token') !== env.ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
      const text = JSON.stringify(body); if (text.length > 60000) return json({ ok: false, error: 'too_large' }, 413);
      body.updatedAt = new Date().toISOString();
      try {
        await env.WORLDCUP_KV.put('ads:config', JSON.stringify(body));
      } catch (e) {
        // KV 하루 쓰기 한도(무료 1,000회) 초과 등
        return json({ ok: false, error: 'kv_write_failed', detail: String(e && e.message || e).slice(0, 200) }, 500);
      }
      try { await caches.default.delete(new Request(`https://${host}/api/ads`)); } catch (e) { }
      return json({ ok: true, updatedAt: body.updatedAt });
    }

    // ---- 광고 배너 이미지: 올리기(관리자 토큰) / 내려받기(공개, 장기 캐시) / 지우기(관리자 토큰) ----
    // 관리 페이지에서 올린 이미지 파일을 KV 에 보관한다. 주소는 /api/ads/image/<id> — id 가 매번 새로 생겨 내용이 바뀌지 않으므로 오래 캐시해도 된다.
    if (url.pathname === '/api/ads/image' && request.method === 'POST') {
      if (!env.ADMIN_TOKEN) return json({ ok: false, error: 'no_admin_token' }, 500);
      if (request.headers.get('x-admin-token') !== env.ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);
      if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
      const buf = await request.arrayBuffer();
      if (!buf.byteLength) return json({ ok: false, error: 'bad_request' }, 400);
      if (buf.byteLength > AD_IMG_MAX) return json({ ok: false, error: 'too_large' }, 413);
      const type = adImageType(new Uint8Array(buf));   // 보낸 쪽이 적은 종류는 믿지 않고 파일 앞머리로 판별
      if (!type) return json({ ok: false, error: 'bad_type' }, 415);
      let id = ''; const rnd = crypto.getRandomValues(new Uint8Array(12));
      for (const b of rnd) id += WC_ID_CHARS[b % WC_ID_CHARS.length];
      try {
        await env.WORLDCUP_KV.put('adimg:' + id, buf, { metadata: { type, size: buf.byteLength, at: new Date().toISOString() } });
      } catch (e) {
        return json({ ok: false, error: 'kv_write_failed', detail: String(e && e.message || e).slice(0, 200) }, 500);
      }
      return json({ ok: true, id, url: '/api/ads/image/' + id, type, size: buf.byteLength });
    }
    if (url.pathname.startsWith('/api/ads/image/')) {
      const id = url.pathname.slice('/api/ads/image/'.length);
      if (!/^[0-9a-z]{8,16}$/.test(id)) return json({ ok: false, error: 'not_found' }, 404);
      const ck = new Request(`https://${host}/api/ads/image/${id}`);
      if (request.method === 'DELETE') {
        if (!env.ADMIN_TOKEN) return json({ ok: false, error: 'no_admin_token' }, 500);
        if (request.headers.get('x-admin-token') !== env.ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);
        if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_configured' }, 500);
        await env.WORLDCUP_KV.delete('adimg:' + id);
        try { await caches.default.delete(ck); } catch (e) { }
        return json({ ok: true });
      }
      if (request.method === 'GET') {
        if (!env.WORLDCUP_KV) return json({ ok: false, error: 'not_found' }, 404);
        const hit = await caches.default.match(ck); if (hit) return hit;
        const rec = await env.WORLDCUP_KV.getWithMetadata('adimg:' + id, 'arrayBuffer');
        if (!rec || !rec.value) return json({ ok: false, error: 'not_found' }, 404);
        const res = new Response(rec.value, { status: 200, headers: {
          'content-type': (rec.metadata && AD_IMG_TYPES.includes(rec.metadata.type)) ? rec.metadata.type : 'application/octet-stream',
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff'
        } });
        ctx.waitUntil(caches.default.put(ck, res.clone()));
        return res;
      }
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
      if (g.timeIsScore && Math.abs(dur - score) > Math.max(1500, score * 0.1)) return json({ ok: false, error: 'suspicious' }, 400);
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
  },

  // 하루 1번(wrangler.jsonc crons 41 15 * * * = KST 00:41): D1 dtb-main 의 400일 넘은 줄을 지운다(privacy 약속 — 다음 D1 작업에서도 지우지 않는다)
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    const cut = utcDay(new Date((event && event.scheduledTime ? event.scheduledTime : Date.now()) - TF_RANK_KEEP_DAYS * 24 * 3600 * 1000));
    try {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM tf_rank_day WHERE day < ?1').bind(cut),
        env.DB.prepare('DELETE FROM tf_rank_dist WHERE d < ?1').bind(cut)
      ]);
    } catch (e) { console.error('tf_rank_db', e && e.message); }
  }
};
