# -*- coding: utf-8 -*-
"""
생활 가이드 생성기 — guide/src/*.md → guide/*.html
사용: 프로젝트 폴더에서  python build-guides.py
  · guide/index.html (목록), guide/<slug>.html (글) 생성
  · 도구 페이지에 "관련 가이드" 블록, 홈에 "생활 가이드" 섹션, sitemap.xml 에 URL 자동 반영
외부 패키지 필요 없음 (Python 3.8+)

마크다운 파일 형식:
---
title: 2026 연봉 실수령액 계산 방법
description: 한 줄 설명 (검색 결과·카드에 표시)
date: 2026-09-19          # 작성일
updated: 2026-09-19       # 마지막 확인/갱신일
category: 돈·일           # 계산·생활 / 돈·일 / 가족·건강 / 공부·어학 / 재미
tools: salary.html, severance.html   # 관련 도구 (첫 번째가 대표 도구)
keywords: 실수령액 계산, 4대보험 요율
sources: 국세청 간이세액표 | https://... ; 국민연금공단 | https://...
draft: true               # (선택) 넣어두면 빌드에서 제외됨. 발행할 때 이 줄을 지운다
---
본문 (## 제목, ### 소제목, 문단, - 목록, 1. 목록, | 표 |, > 인용, **굵게**, [링크](url))
[[tool:salary.html|계산기에서 바로 계산해 보세요]]  → 도구 링크 카드
:::tip 제목
내용
:::
"""
import os, re, glob, json, html, datetime, sys

# 콘솔이 cp949여도 한글·특수문자(—, ·) 출력이 깨지거나 멈추지 않게
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'guide', 'src')
OUT = os.path.join(ROOT, 'guide')
SITE = 'https://dailyfreetoolbox.com'
CAT_ACCENT = {'계산·생활': '#2f7d4f', '돈·일': '#2f7d4f', '가족·건강': '#2f7d4f', '공부·어학': '#2f7d4f', '재미': '#2f7d4f'}

# ---------- 도구 목록 (nav.js 에서 읽음) ----------
def load_tools():
    src = open(os.path.join(ROOT, 'nav.js'), encoding='utf-8').read()
    m = re.search(r'var GROUPS = (\[.*?\]);', src, re.S)
    groups = json.loads(m.group(1))
    tools = {}
    for g in groups:
        for it in g['items']:
            tools[it[0]] = {'title': it[1], 'desc': it[2], 'group': g['label'], 'icon': g['icon'], 'slug': it[0][:-5]}
    return tools

# ---------- 마크다운 ----------
def esc(s): return html.escape(s, quote=False)
def inline(s):
    s = esc(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
    def link(m):
        url = m.group(2); ext = ' target="_blank" rel="noopener"' if url.startswith('http') else ''
        return f'<a href="{url}"{ext}>{m.group(1)}</a>'
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', link, s)
    return s
def slugify(t):
    return re.sub(r'[^0-9a-zA-Z가-힣]+', '-', t).strip('-').lower()

def md_to_html(md, tools):
    lines = md.split('\n'); out = []; i = 0; toc = []; faq = []
    def flush_para(buf):
        if buf: out.append('<p>' + inline(' '.join(buf)) + '</p>')
    para = []
    while i < len(lines):
        ln = lines[i]
        st = ln.strip()
        if not st:
            flush_para(para); para = []; i += 1; continue
        m = re.match(r'^(#{2,3})\s+(.+)$', st)
        if m:
            flush_para(para); para = []
            lvl = len(m.group(1)); txt = m.group(2).strip(); sid = slugify(txt)
            if lvl == 2: toc.append((sid, txt))
            out.append(f'<h{lvl} id="{sid}">{inline(txt)}</h{lvl}>'); i += 1; continue
        if st.startswith('?? '):
            flush_para(para); para = []
            q = st[3:].strip(); j = i + 1; ans = []
            while j < len(lines) and lines[j].strip() and not lines[j].strip().startswith(('?? ', '## ', '### ')):
                ans.append(lines[j].strip()); j += 1
            a = ' '.join(ans)
            faq.append((q, a))
            out.append(f'<details><summary>{inline(q)}</summary><p>{inline(a)}</p></details>')
            i = j; continue
        m = re.match(r'^\[\[tool:([a-z0-9-]+\.html)(?:\|(.+?))?\]\]$', st)
        if m:
            flush_para(para); para = []
            f = m.group(1); t = tools.get(f, {'title': f, 'desc': '', 'slug': f[:-5]})
            label = m.group(2) or t['title']
            ic = f'<img class="ic" src="/icons/{t["slug"]}.webp" width="34" height="34" alt="" loading="lazy" decoding="async">'
            out.append(f'<a class="toolcta" href="/{f}">{ic}<span><b>{esc(t["title"])}</b><small>{esc(label)}</small></span><span class="go">바로 계산하기 →</span></a>')
            i += 1; continue
        if st.startswith(':::'):
            flush_para(para); para = []
            title = st[3:].strip(); j = i + 1; body = []
            while j < len(lines) and lines[j].strip() != ':::':
                body.append(lines[j]); j += 1
            kind, _, ttl = title.partition(' ')
            out.append(f'<div class="callout"><b>{esc(ttl or ("참고" if kind=="tip" else kind))}</b> ' + inline(' '.join(x.strip() for x in body if x.strip())) + '</div>')
            i = j + 1; continue
        if st.startswith('|'):
            flush_para(para); para = []
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.match(r'^:?-{2,}:?$', c) for c in cells): rows.append(cells)
                i += 1
            if rows:
                h = '<table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in rows[0]) + '</tr></thead><tbody>'
                for r in rows[1:]: h += '<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>'
                out.append(h + '</tbody></table>')
            continue
        if re.match(r'^[-*]\s+', st) or re.match(r'^\d+\.\s+', st):
            flush_para(para); para = []
            ordered = bool(re.match(r'^\d+\.\s+', st)); items = []
            while i < len(lines):
                s2 = lines[i].strip()
                if (ordered and re.match(r'^\d+\.\s+', s2)) or (not ordered and re.match(r'^[-*]\s+', s2)):
                    items.append(re.sub(r'^(\d+\.|[-*])\s+', '', s2)); i += 1
                elif s2 and lines[i].startswith('  ') and items:
                    items[-1] += ' ' + s2; i += 1
                else: break
            tag = 'ol' if ordered else 'ul'
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>')
            continue
        if st.startswith('>'):
            flush_para(para); para = []
            q = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                q.append(lines[i].strip()[1:].strip()); i += 1
            out.append('<blockquote>' + inline(' '.join(q)) + '</blockquote>'); continue
        if st == '---':
            flush_para(para); para = []; out.append('<hr>'); i += 1; continue
        para.append(st); i += 1
    flush_para(para)
    return '\n'.join(out), toc, faq

def is_draft(meta):
    return str(meta.get('draft', '')).strip().lower() in ('true', 'y', 'yes', '1')

def parse(md_text):
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', md_text, re.S)
    if not m: raise SystemExit('frontmatter 형식 오류')
    meta = {}
    for ln in m.group(1).split('\n'):
        if ':' in ln:
            k, v = ln.split(':', 1); meta[k.strip()] = v.strip()
    body = m.group(2)
    meta['tools'] = [x.strip() for x in meta.get('tools', '').split(',') if x.strip()]
    srcs = []
    for part in meta.get('sources', '').split(';'):
        if '|' in part:
            n, u = part.split('|', 1); srcs.append((n.strip(), u.strip()))
        elif part.strip(): srcs.append((part.strip(), ''))
    meta['sources'] = srcs
    return meta, body

# ---------- 템플릿 ----------
def head_common(title, desc, canonical, keywords, extra_ld):
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
<meta name="keywords" content="{esc(keywords)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:locale" content="ko_KR">
{extra_ld}
<script src="/common.js"></script>
<link rel="stylesheet" href="/tool.css">
'''

def render_guide(meta, body_md, slug, tools, all_guides):
    accent = CAT_ACCENT.get(meta.get('category', ''), '#2f7d4f')
    content, toc, faq = md_to_html(body_md, tools)
    # 본문 중간 광고: 두 번째 h2 앞
    h2s = [m.start() for m in re.finditer(r'<h2 ', content)]
    if len(h2s) >= 2:
        p = h2s[1]; content = content[:p] + '<div class="ad-slot" data-ad="in-content"></div>\n' + content[p:]
    chars = len(re.sub(r'<[^>]+>', '', content)); mins = max(1, round(chars / 600))
    canonical = f'{SITE}/guide/{slug}.html'
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": meta['title'], "description": meta.get('description', ''), "image": [f"{SITE}/og-image.jpg"], "datePublished": meta.get('date', ''), "dateModified": meta.get('updated', meta.get('date', '')), "author": {"@type": "Organization", "name": "데일리 프리 툴박스", "url": SITE + "/"}, "publisher": {"@type": "Organization", "name": "데일리 프리 툴박스", "logo": {"@type": "ImageObject", "url": f"{SITE}/apple-touch-icon.png"}}, "mainEntityOfPage": {"@type": "WebPage", "@id": canonical}, "inLanguage": "ko"}, ensure_ascii=False)
    faq_ld = ''
    if len(faq) >= 2:
        faq_ld = '\n<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}, ensure_ascii=False) + '</script>' 
    crumbs = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "홈", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "생활 가이드", "item": SITE + "/guide/"}, {"@type": "ListItem", "position": 3, "name": meta['title'], "item": canonical}]}, ensure_ascii=False)
    toc_html = ('<nav class="guide-toc"><b>목차</b><ol>' + ''.join(f'<li><a href="#{sid}">{esc(t)}</a></li>' for sid, t in toc) + '</ol></nav>') if len(toc) >= 3 else ''
    tools_html = ''
    if meta['tools']:
        cards = ''.join(f'<a href="/{f}"><img class="tic" src="/icons/{tools[f]["slug"]}.webp" width="28" height="28" alt="" loading="lazy" decoding="async"><span><b>{esc(tools[f]["title"])}</b><small>{esc(tools[f]["desc"])}</small></span><span class="go">›</span></a>' for f in meta['tools'] if f in tools)
        tools_html = f'<section class="guide-tools"><h2>이 글과 함께 쓰는 도구</h2><div class="grid">{cards}</div></section>'
    src_html = ''
    if meta['sources']:
        src_html = '<div class="guide-sources"><b>참고 자료</b><ul>' + ''.join((f'<li><a href="{esc(u)}" target="_blank" rel="noopener">{esc(n)}</a></li>' if u else f'<li>{esc(n)}</li>') for n, u in meta['sources']) + f'</ul>마지막 확인일 {esc(meta.get("updated", meta.get("date","")))} · 제도·요율은 바뀔 수 있으니 중요한 결정 전에는 원 출처를 확인하세요.</div>'
    others = [g for g in all_guides if g['slug'] != slug and g['meta'].get('category') == meta.get('category')][:4]
    more_html = ''
    if others:
        more_html = '<section class="guide-tools"><h2>같은 주제의 다른 글</h2><div class="guide-list">' + ''.join(f'<a class="guide-card" href="/guide/{g["slug"]}.html"><img class="gic" src="/icons/ui-guide.webp" width="30" height="30" alt="" loading="lazy" decoding="async"><span class="tx"><b>{esc(g["meta"]["title"])}</b><p>{esc(g["meta"].get("description",""))}</p></span></a>' for g in others) + '</div></section>'
    return head_common(meta['title'] + ' | 데일리 프리 툴박스 생활 가이드', meta.get('description', ''), canonical, meta.get('keywords', ''), f'<script type="application/ld+json">{ld}</script>\n<script type="application/ld+json">{crumbs}</script>{faq_ld}') + f'''<style>:root {{ --accent:{accent}; --accent-deep:#23603c; }}</style>
</head>
<body class="guide-page">

<nav id="site-nav" data-accent="{accent}"></nav>
<script src="/nav.js"></script>

<main>
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><a href="/guide/">생활 가이드</a><span>›</span><a href="/guide/#{esc(meta.get('category',''))}">{esc(meta.get('category',''))}</a></nav>
  <h1>{esc(meta['title'])}</h1>
  <p class="sub">{esc(meta.get('description',''))}</p>
  <div class="guide-meta"><span>📅 {esc(meta.get('date',''))} 작성</span><span>🔄 {esc(meta.get('updated', meta.get('date','')))} 확인</span><span>⏱ 약 {mins}분</span></div>
  <div class="ad-slot" data-ad="top"></div>
  {toc_html}
  <article class="guide">
{content}
  </article>
  {tools_html}
  <div class="ad-slot" data-ad="below-result"></div>
  {src_html}
  {more_html}
  <footer>이 글은 일반적인 정보 제공을 목적으로 하며 법률·세무·의료 자문이 아니에요. 개별 상황은 전문가나 관련 기관에 확인하세요.</footer>
</main>

</body>
</html>
'''

def render_index(all_guides):
    canonical = f'{SITE}/guide/'
    cats = []
    for g in all_guides:
        c = g['meta'].get('category', '기타')
        if c not in cats: cats.append(c)
    sections = ''
    for c in cats:
        items = [g for g in all_guides if g['meta'].get('category', '기타') == c]
        cards = ''.join(f'<a class="guide-card" href="/guide/{g["slug"]}.html"><b>{esc(g["meta"]["title"])}</b><p>{esc(g["meta"].get("description",""))}</p><small>{esc(g["meta"].get("updated", g["meta"].get("date","")))} · 관련 도구 {len(g["meta"]["tools"])}개</small></a>' for g in items)
        sections += f'<section class="group" id="{esc(c)}" style="--accent:{CAT_ACCENT.get(c,"#2f7d4f")}"><div class="group-head" style="margin:26px 0 10px"><h2 style="font-size:17px;margin:0">{esc(c)}</h2><span class="count" style="font-size:12px;color:var(--ink-soft);margin-left:8px">{len(items)}편</span></div><div class="guide-list">{cards}</div></section>'
    ld = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage", "name": "생활 가이드", "url": canonical, "description": "연봉·퇴직금·실업급여·연차·사주처럼 매일 쓰는 도구 뒤에 있는 규칙과 계산법을 정리한 글 모음"}, ensure_ascii=False)
    return head_common('생활 가이드 - 계산기 뒤의 규칙과 방법을 정리한 글 | 데일리 프리 툴박스', '연봉 실수령액·퇴직금·실업급여·연차·사주 보는 법처럼 도구를 쓰기 전에 알아두면 좋은 규칙과 계산 방법을 정리한 생활 가이드. 각 글에서 관련 계산기로 바로 이동.', canonical, '생활 가이드, 계산 방법, 실수령액 계산법, 퇴직금 계산법, 실업급여 조건, 연차 계산법, 사주 보는 법', f'<script type="application/ld+json">{ld}</script>') + '''<style>:root { --accent:#2f7d4f; --accent-deep:#23603c; }</style>
</head>
<body class="guide-page">

<nav id="site-nav" data-accent="#2f7d4f"></nav>
<script src="/nav.js"></script>

<main>
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span>생활 가이드</nav>
  <h1>생활 가이드</h1>
  <p class="sub">계산기에 숫자를 넣기 전에 알아두면 좋은 규칙과 계산 방법을 정리했어요. 각 글에서 관련 도구로 바로 이동할 수 있어요.</p>
  <div class="ad-slot" data-ad="top"></div>
''' + sections + '''
  <div class="ad-slot" data-ad="below-result"></div>
  <footer>글은 일반적인 정보 제공을 목적으로 하며, 제도·요율은 바뀔 수 있어요. 각 글의 마지막 확인일과 참고 자료를 함께 봐주세요.</footer>
</main>

</body>
</html>
'''

# ---------- 도구 페이지 / 홈 / 사이트맵 갱신 ----------
def inject(text, start, end, block):
    if start in text:
        return re.sub(re.escape(start) + r'.*?' + re.escape(end), start + block + end, text, count=1, flags=re.S)
    return None

def update_tool_pages(all_guides, tools):
    by_tool = {}
    for g in all_guides:
        for f in g['meta']['tools']: by_tool.setdefault(f, []).append(g)
    n = 0
    for f, gs in by_tool.items():
        path = os.path.join(ROOT, f)
        if not os.path.exists(path): continue
        s = open(path, encoding='utf-8').read()
        block = ('\n<div class="guides-rel"><div class="lb"><img src="/icons/ui-guide.webp" width="22" height="22" alt="">관련 가이드</div>'
                 + ''.join(f'<a href="/guide/{g["slug"]}.html">'
                           f'<img class="gic" src="/icons/ui-guide.webp" width="28" height="28" alt="" loading="lazy" decoding="async">'
                           f'<span class="tx">{esc(g["meta"]["title"])}<small>{esc(g["meta"].get("updated", g["meta"].get("date","")))}</small></span>'
                           f'<span class="go">›</span></a>' for g in gs[:4]) + '</div>\n')
        new = inject(s, '<!-- guides:tool:start -->', '<!-- guides:tool:end -->', block)
        if new is None:
            m = re.search(r'<div class="sibs">.*?</div></div>\n', s, re.S)
            if not m: print('  [skip] sibs 블록 없음:', f); continue
            new = s[:m.end()] + '<!-- guides:tool:start -->' + block + '<!-- guides:tool:end -->\n' + s[m.end():]
        if new != s: open(path, 'w', encoding='utf-8').write(new); n += 1
    print(f'도구 페이지 관련 가이드 반영: {n}개')

def update_home(all_guides):
    path = os.path.join(ROOT, 'index.html'); s = open(path, encoding='utf-8').read()
    latest = sorted(all_guides, key=lambda g: g['meta'].get('updated', g['meta'].get('date', '')), reverse=True)[:6]
    # 홈에서는 제목만 (설명까지 넣으면 제목이 길어 읽기 어려움). 구조는 도구 카드와 동일하게
    cards = ''.join(f'<a class="card" href="/guide/{g["slug"]}.html"><img class="cic" src="/icons/ui-guide.webp" width="34" height="34" alt="" loading="lazy" decoding="async"><span class="ct"><div class="title">{esc(g["meta"]["title"])}</div></span></a>\n      ' for g in latest)
    block = f'''
  <section class="group" id="생활 가이드" style="--card-accent:#2f7d4f">
    <div class="group-head"><h2><img class="hic" src="/icons/ui-guide.webp" width="26" height="26" alt="">생활 가이드</h2><span class="count">{len(all_guides)}편</span><a class="all" href="/guide/">전체 보기 →</a></div>
    <div class="cards">
      {cards}</div>
  </section>
'''
    new = inject(s, '<!-- guides:home:start -->', '<!-- guides:home:end -->', block)
    if new is None:
        anchor = '<section class="pop">'
        i = s.index(anchor); j = s.index('</section>', i) + len('</section>')
        new = s[:j] + '\n<!-- guides:home:start -->' + block + '<!-- guides:home:end -->' + s[j:]
    open(path, 'w', encoding='utf-8').write(new); print('홈 생활 가이드 섹션 반영')

def update_sitemap(all_guides):
    path = os.path.join(ROOT, 'sitemap.xml'); s = open(path, encoding='utf-8').read()
    urls = f'  <url>\n    <loc>{SITE}/guide/</loc>\n  </url>\n' + ''.join(f'  <url>\n    <loc>{SITE}/guide/{g["slug"]}.html</loc>\n    <lastmod>{g["meta"].get("updated", g["meta"].get("date",""))}</lastmod>\n  </url>\n' for g in all_guides)
    new = inject(s, '<!-- guides:start -->\n', '<!-- guides:end -->\n', urls)
    if new is None:
        new = s.replace('</urlset>', '<!-- guides:start -->\n' + urls + '<!-- guides:end -->\n</urlset>')
    open(path, 'w', encoding='utf-8').write(new); print('sitemap 반영')

def main():
    os.makedirs(SRC, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    tools = load_tools()
    guides = []
    md_files = sorted(glob.glob(os.path.join(SRC, '*.md')))
    if not md_files:
        print('guide/src/ 에 원고(.md)가 없어요. 원고를 넣고 다시 실행하세요.'); return
    drafts = []
    for p in md_files:
        meta, body = parse(open(p, encoding='utf-8').read())
        slug = os.path.splitext(os.path.basename(p))[0]
        if is_draft(meta):
            drafts.append((slug, meta.get('title', ''))); continue
        guides.append({'slug': slug, 'meta': meta, 'body': body})
    if drafts:
        print(f'초안 제외: {len(drafts)}편 (발행하려면 머리말의 draft 줄을 지우세요)')
        for slug, title in drafts:
            stale = ' ← 이전에 발행된 파일이 남아 있음' if os.path.exists(os.path.join(OUT, slug + '.html')) else ''
            print(f'  - {slug}{stale}  ({title})')
    if not guides:
        print('발행할 원고가 없어요 (전부 draft). 빌드를 중단합니다.'); return
    guides.sort(key=lambda g: g['meta'].get('date', ''), reverse=True)
    for g in guides:
        html_out = render_guide(g['meta'], g['body'], g['slug'], tools, guides)
        open(os.path.join(OUT, g['slug'] + '.html'), 'w', encoding='utf-8').write(html_out)
        print('생성:', f'guide/{g["slug"]}.html', f'({g["meta"]["title"]})')
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(render_index(guides))
    print('생성: guide/index.html')
    update_tool_pages(guides, tools); update_home(guides); update_sitemap(guides)

if __name__ == '__main__':
    main()
