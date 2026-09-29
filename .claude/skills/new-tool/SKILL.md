---
name: new-tool
description: 사이트에 새 도구 페이지를 만들어 추가할 때 부른다. 사용자가 "스도쿠 게임 추가해줘", "새 계산기 만들어줘", "~ 도구 추가해줘", "~ 만들어서 사이트에 넣어줘" 처럼 말하면 이 스킬이다. 페이지 구조, nav.js GROUPS·sitemap·도구 수 갱신, worker.js·랭킹 연결, 푸시 전 자체 점검 목록이 들어 있다. 이미 있는 도구를 고치는 일은 이게 아니라 CLAUDE.md B절이다.
---

# 새 도구 추가

1. 같은 그룹의 기존 도구 페이지 하나를 골라 구조를 그대로 따른다. 새 페이지에 반드시 들어갈 것:
   - **head**: `common.js`, `tool.css`, favicon 링크 3줄(`favicon.svg`·`favicon.ico`·`apple-touch-icon.png`),
     `title`·`description`·`canonical`, og 태그.
     - `canonical` 은 확장자 없는 주소(`https://dailyfreetoolbox.com/<이름>`). 사이트 전체가 이 형식이다.
     - `og:image` 는 전용 이미지가 있으면 `/og/og-<이름>.jpg`, 없으면 `/og-image.jpg`.
     - `content="…"` 안에 `"` 를 그대로 쓰지 않는다. 속성이 중간에 끊겨 검색엔진이 앞부분만 읽는다.
       `&quot;` 나 둥근따옴표(`“ ”`)를 쓴다.
   - **본문 순서**: `nav#site-nav` + `nav.js` → `nav.crumb`(홈 › 그룹 › 도구명) → `h1` → `.sub`
     → `data-ad="top"` → 도구 → `data-ad="below-result"` → `.sibs`(같은 그룹 도구 칩)
     → SEO 설명 → `data-ad="in-content"` → FAQ

2. `nav.js` GROUPS 의 알맞은 그룹에 항목(파일·제목·설명·필요 시 소제목)을 추가한다.

3. `sitemap.xml` 에 URL 을 추가한다(확장자 없는 주소 + `lastmod`).

4. 도구 수가 적힌 문구(`index.html`, `about.html` 등)를 검색해서 숫자를 갱신한다.
   홈은 실행 시 GROUPS 에서 자동 계산하지만, `about.html` 의 도구 목록은 손으로 넣어야 한다.

5. 서버 기능이 필요하면 `worker.js` 에 API 추가 + `wrangler.jsonc` 의 `run_worker_first` 에 경로 추가.
   빠지면 404 가 응답된다.
   랭킹이 붙으면 `leaderboard.js`(LB.init / LB.submit) 연결 + `worker.js` `SCORE_GAMES` 에
   규칙(허용 범위·최소 플레이 시간) 추가가 한 세트다.

6. 상표명 게임 이름(테트리스, 워들, 플래피버드 등)은 쓰지 않는다.

7. 광고·면책 문구가 필요한 종류(테스트·운세·건강)는 기존 비슷한 페이지의 문구를 따른다.

## 푸시 전 자체 점검 (필수)
새 도구뿐 아니라 도구 수정·스펙·브리프 작업에서도 같은 항목을 쓴다.

- 바꾼 `.js` 는 node 가 있으면 `node --check 파일` 로 문법 검사.
- 페이지 안 `<script>` 코드는 중괄호·따옴표 짝이 맞는지 다시 읽어서 확인.
- 새 페이지가 참조하는 파일(`/common.js`, `/nav.js`, `/tool.css`, 아이콘 등)이 실제로 있는지 확인.
- `nav.js` 수정 시 GROUPS 배열 문법(쉼표, 따옴표)을 특히 확인 — 여기가 깨지면 전 페이지 메뉴가 사라진다.
- 한글이 깨지지 않았는지(UTF-8) 확인.
- 페이지 안 JSON-LD 가 있으면 실제로 파싱되는지 확인.
