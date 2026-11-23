"""대학별 편입영어 모의고사 페이지 만들기 — 공통 틀 하나 + 학교별 설정.

사용: python tools/transfer-pages.py            (설정 있는 학교 전부)
      python tools/transfer-pages.py skku cau   (고른 학교만)

학교 하나 = tools/transfer-schools/<slug>.json (문구·FAQ) + <slug>.seo.html (SEO 본문)
          + transfer-<slug>-bank.json (문제, Studio 파일 그대로)
페이지 코드는 transfer-mock.js·transfer-mock.css 를 함께 쓴다.
'다른 대학 편입영어 모의고사' 칩 줄은 nav.js GROUPS 의 '편입' 항목에서 만든다(자기 학교 빼고, nav 순서).
학교를 nav.js 에 추가했으면 이 스크립트를 다시 돌려 모든 학교 페이지의 칩 줄을 맞춘다.
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG_DIR = os.path.join(ROOT, 'tools', 'transfer-schools')
SITE = 'https://dailyfreetoolbox.com'

# 같은 그룹(공부·어학) 칩 — 모든 학교 페이지 공통
SIBS = [('level-test', '영어 레벨 테스트'), ('readability', '지문 난이도 체커'), ('etymology', '어원 분석기'),
        ('sentence', '문장 구조 분석'), ('memory-speed', '영단어 암기 속도 측정기'), ('wordlist', '단어장 추출기')]


def chip(slug, label):
    ic = f'/icons/{slug}.webp' if os.path.isfile(os.path.join(ROOT, 'icons', f'{slug}.webp')) else '/icons/cat-study.webp'
    return f'<a href="/{slug}"><img class="sic" src="{ic}" width="34" height="34" alt="" loading="lazy" decoding="async"><span>{html.escape(label)}</span></a>'


def transfer_items():
    """nav.js '편입' 소제목 항목 [(파일 slug, 제목)]"""
    src = open(os.path.join(ROOT, 'nav.js'), encoding='utf-8').read()
    groups = json.loads(re.search(r'var GROUPS = (\[.*?\]);\n', src, re.S).group(1))
    return [(it[0][:-5], it[1]) for g in groups for it in g['items'] if it[3] == '편입']


def page(c):
    s, name, univ = c['slug'], c['name'], c['univ']
    url = f'{SITE}/transfer-{s}'
    esc = lambda t: html.escape(t, quote=True)
    title, desc = c['title'], c['description']
    og = SITE + c.get('og_image', '/og-image.jpg')
    seo = open(os.path.join(CFG_DIR, f'{s}.seo.html'), encoding='utf-8').read().strip()
    faq = c['faq']
    ld_app = json.dumps({"@context": "https://schema.org", "@type": "WebApplication", "name": f"{name} 편입영어 모의고사", "url": url,
                         "applicationCategory": "EducationalApplication", "operatingSystem": "Any",
                         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "KRW"}, "description": desc}, ensure_ascii=False)
    ld_faq = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}, ensure_ascii=False)
    faq_html = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in faq)
    others = [(f, t) for f, t in transfer_items() if f != f'transfer-{s}']
    other_row = ('<div class="sibs tf-schools"><div class="lb">다른 대학 편입영어 모의고사</div><div class="chips">'
                 + ''.join(chip(f, t.replace(' 편입영어 모의고사', '')) for f, t in others) + '</div></div>\n') if others else ''
    sibs = ('<div class="sibs"><div class="lb">공부·어학 도구 더 보기</div><div class="chips">' + ''.join(chip(f, t) for f, t in SIBS)
            + '<a class="more" href="/#공부·어학">전체 보기 →</a></div></div>')
    ic = f'/icons/transfer-{s}.webp' if os.path.isfile(os.path.join(ROOT, 'icons', f'transfer-{s}.webp')) else '/icons/cat-study.webp'
    tf = json.dumps({"school": s, "bank": f"/transfer-{s}-bank.json", "fb": f"tf-{s}"}, ensure_ascii=False)
    sub = f'{name} 편입영어 {c["years"]}학년도 기출 유형을 분석해 새로 만든 문제 {c.get("rounds_label", "3회분")}으로, 영역별 점수와 틀린 문제 해설을 바로 확인해요.'
    note = (f'이 문제는 {name} 편입영어 {c["years"]}학년도 기출의 출제 유형(문항 수·영역·문제 꼴)을 분석해 새로 만든 연습 문제예요. '
            f'실제 기출 문제가 아니며, 시험 정보는 {univ} 입학처 모집요강이 기준이에요(확인일 {c["checked"]}).')
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="naver-site-verification" content="852adc0d7cb49c870de02857b2624318467fe862" />
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="keywords" content="{esc(c['keywords'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:locale" content="ko_KR">
<script type="application/ld+json">
{ld_app}
</script>
<script src="/common.js"></script>
<link rel="stylesheet" href="/tool.css">
<link rel="stylesheet" href="/cert-mock.css">
<link rel="stylesheet" href="/transfer-mock.css">
<style>
:root {{ --accent:{c['accent']}; --accent-deep:{c['accent_deep']}; }}
</style>
<script type="application/ld+json">{ld_faq}</script>
</head>
<body>
<!-- 이 파일은 tools/transfer-pages.py 가 만든다. 고칠 때는 tools/transfer-schools/{s}.json·{s}.seo.html 을 고치고 다시 돌린다 -->

<nav id="site-nav" data-accent="{c['accent']}"></nav>
<script src="/nav.js"></script>

<main>
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><a href="/#공부·어학">공부·어학</a><span>›</span>{name} 편입영어 모의고사</nav>
  <h1><img class="h1ic" src="{ic}" width="32" height="32" alt="">{name} 편입영어 모의고사</h1>
  <p class="sub">{sub}</p>
  <div class="ad-slot" data-ad="top"></div>

  <div class="card" id="setup">
    <div class="pick hidden" id="roundwrap"><span class="plb">회차</span><div class="rseg" id="rounds" role="group" aria-label="회차 고르기"></div></div>
    <div class="modes">
      <button class="btn" id="startExam" type="button" disabled>실전 모드</button>
      <button class="btn-ghost" id="startPrac" type="button" disabled>한 문제씩 풀기</button>
    </div>
    <p class="status" id="loadmsg"></p>
    <div class="btn-row"><button class="btn-ghost hidden" id="retry" type="button">다시 시도</button></div>
    <p class="note hidden" id="rulenote"></p>
    <div id="lastwrap"></div>
    <p class="note">실전 모드는 시험 시간이 지나면 자동으로 채점하고, 끝에 맞은 수·영역별 정답률·틀린 문제 해설을 보여 줘요. 한 문제씩 풀기는 고르자마자 정답과 해설을 확인해요. 독해는 지문 하나에 문항이 여러 개 이어져요.</p>
  </div>
  <div class="card hidden" id="quiz">
    <div class="qhead"><span id="qno"></span><span class="timer" id="timer"></span></div>
    <div class="bar"><i id="qbar" style="width:0%"></i></div>
    <div class="qwrap" id="qwrap">
      <div class="psg hidden" id="psg"><div class="lb" id="psglb"></div><div class="psgtx" id="psgtx"></div></div>
      <div class="qbox">
        <p class="qtext" id="qtext"></p>
        <div class="opts" id="opts"></div>
        <div class="expl hidden" id="expl"></div>
      </div>
    </div>
    <div class="btn-row"><button class="btn-ghost" id="prev" type="button">이전</button><button class="btn" id="check" type="button" disabled>정답 확인</button><button class="btn" id="next" type="button">다음</button><button class="btn-ghost" id="mark" type="button">다시 볼 문제 표시</button><button class="btn" id="submit" type="button">제출하고 채점</button><button class="btn-ghost" id="quit" type="button">그만두기</button></div>
    <div id="sheetwrap"><div class="sheet-lb" id="sheetinfo"></div><div class="sheet" id="sheet"></div></div>
  </div>
  <div class="card hidden" id="result"></div>
  <p class="note">{note}</p>
  <div class="ad-slot" data-ad="below-result"></div>
{other_row}{sibs}
<section class="seo">
{seo}
</section>
<div class="ad-slot" data-ad="in-content"></div>
<section class="seo faq"><h2>자주 묻는 질문</h2>{faq_html}</section>
  <footer>{c['footer']}<br><span class="version-tag">{c['version']}</span></footer>
</main>

<script>window.TF={tf};</script>
<script src="/transfer-mock.js"></script>

</body>
</html>
'''


def main(args):
    slugs = args or sorted(f[:-5] for f in os.listdir(CFG_DIR) if f.endswith('.json'))
    for s in slugs:
        c = json.load(open(os.path.join(CFG_DIR, f'{s}.json'), encoding='utf-8'))
        if not os.path.isfile(os.path.join(ROOT, f'transfer-{s}-bank.json')):
            print(f'건너뜀 {s}: transfer-{s}-bank.json 없음'); continue
        out = page(c)
        for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', out, re.S):
            json.loads(m)
        with open(os.path.join(ROOT, f'transfer-{s}.html'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(out)
        print(f'만듦 transfer-{s}.html')


if __name__ == '__main__':
    main(sys.argv[1:])
