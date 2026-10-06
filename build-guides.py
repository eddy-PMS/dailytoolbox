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
    · 표는 <div class="tw"> 로 감싸 출력된다 (좁은 화면에서 표 영역만 가로 스크롤)
[[tool:salary.html|계산기에서 바로 계산해 보세요]]  → 도구 링크 카드
[[img:파일명|alt|폭x높이|캡션]]  → 본문 이미지 (파일은 img/guide/<slug>/ 에 둔다)
    · 한 줄 전체가 이 문법일 때만. 문단 안에 섞어 쓰는 인라인 이미지는 지원 안 함
    · alt 는 필수. 폭x높이(예 1200x1500)는 없으면 경고, 캡션은 선택
    · <이름>-1200.webp 이고 같은 폴더에 -800·-400 이 둘 다 있으면 srcset 자동
    · alt·캡션 안에 | 는 쓸 수 없다
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
# 속성값(content="…") 전용. 따옴표까지 이스케이프하지 않으면 값이 중간에 끊겨
# 구글·카카오가 앞부분만 읽는다. 본문에는 esc() 를 그대로 쓴다(&quot; 는 읽기 나쁨).
def attr(s): return html.escape(str(s), quote=True)
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

IMG_NAME_RE = re.compile(r'^[A-Za-z0-9._-]+$')
IMG_SIZE_RE = re.compile(r'^(\d+)x(\d+)$')
IMG_SIZES_ATTR = '(max-width: 600px) 100vw, 520px'   # tool.css figure.gimg 최대 폭과 같게 유지


def img_parts(inside):
    """[[img:…]] 안쪽을 (파일명, alt, (폭,높이) 또는 None, 캡션 또는 None) 으로 나눈다.
    형식이 아니면 (None, 사유) 를 돌려준다. alt·캡션 안의 | 는 지원하지 않는다."""
    parts = inside.split('|')
    if len(parts) < 2:
        return None, 'alt 가 없어요 ([[img:파일|alt|폭x높이]] 형식)'
    if len(parts) > 4:
        return None, '칸이 너무 많아요. alt·캡션 안에는 | 를 쓸 수 없어요'
    name, alt = parts[0].strip(), parts[1].strip()
    if not IMG_NAME_RE.match(name):
        return None, f'파일명이 «{name}» 인데 경로 없이 영문·숫자·. _ - 만 쓸 수 있어요'
    size = cap = None
    rest = parts[2:]
    if rest:
        m = IMG_SIZE_RE.match(rest[0].strip())
        if m:
            size = (m.group(1), m.group(2)); rest = rest[1:]
        if rest:
            cap = rest[0].strip() or None
        if len(rest) > 1:
            return None, '칸이 너무 많아요. alt·캡션 안에는 | 를 쓸 수 없어요'
    return (name, alt, size, cap), None


def img_figure(name, alt, size, cap, slug):
    """<figure class="gimg"> 한 덩어리. -1200.webp 3벌이 갖춰져 있으면 srcset 을 붙인다."""
    base = f'/img/guide/{slug}'
    attrs = [f'src="{attr(base)}/{attr(name)}"']
    m = re.match(r'^(.*)-1200\.webp$', name)
    if m:
        stem = m.group(1)
        trio = [f'{stem}-{w}.webp' for w in (400, 800, 1200)]
        if all(os.path.exists(os.path.join(ROOT, 'img', 'guide', slug, f)) for f in trio[:2]):
            srcset = ', '.join(f'{base}/{f} {w}w' for f, w in zip(trio, (400, 800, 1200)))
            attrs.append(f'srcset="{attr(srcset)}"')
            attrs.append(f'sizes="{attr(IMG_SIZES_ATTR)}"')
    if size:
        attrs.append(f'width="{size[0]}" height="{size[1]}"')
    attrs.append(f'alt="{attr(alt)}"')
    attrs.append('loading="lazy" decoding="async"')
    figcap = f'\n  <figcaption>{esc(cap)}</figcaption>' if cap else ''
    return f'<figure class="gimg">\n  <img {" ".join(attrs)}>{figcap}\n</figure>'


def md_to_html(md, tools, slug=None, where='원고', line_offset=0):
    lines = md.split('\n'); out = []; i = 0; toc = []; faq = []; imgs = []
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
            ic = f'<img class="ic" src="/icons/{t["slug"]}.webp" width="40" height="40" alt="" loading="lazy" decoding="async">'
            out.append(f'<a class="toolcta" href="/{f[:-5]}">{ic}<span><b>{esc(t["title"])}</b><small>{esc(label)}</small></span><span class="go">›</span></a>')
            i += 1; continue
        m = re.match(r'^\[\[img:(.*)\]\]$', st)
        if m:
            flush_para(para); para = []
            at = f'{where}:{line_offset + i + 1}'
            got, why = img_parts(m.group(1))
            if got is None:
                raise SystemExit(f'{at} [[img]] {why}')
            name, alt, size, cap = got
            if not alt:
                raise SystemExit(f'{at} [[img]] alt 누락')
            path = os.path.join(ROOT, 'img', 'guide', slug or '', name)
            if not os.path.exists(path):
                raise SystemExit(f'{at} [[img]] 파일이 없어요 → img/guide/{slug}/{name}')
            if not size:
                print(f'  [경고] {at} [[img]] 폭x높이가 없어 width·height 를 넣지 못했어요 ({name})')
            out.append(img_figure(name, alt, size, cap, slug))
            imgs.append(f'{SITE}/img/guide/{slug}/{name}')
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
                # 휴대폰에서 넓은 표가 본문을 밀지 않도록 가로 스크롤 박스로 감싼다
                out.append('<div class="tw">' + h + '</tbody></table></div>')
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
    return '\n'.join(out), toc, faq, imgs

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
    # 오류 메시지의 줄 번호를 원고 파일 기준으로 맞추기 위한 머리말 길이
    meta['_line_offset'] = md_text.count(chr(10), 0, m.start(2))
    meta['tools'] = [x.strip() for x in meta.get('tools', '').split(',') if x.strip()]
    srcs = []
    for part in meta.get('sources', '').split(';'):
        if '|' in part:
            n, u = part.split('|', 1); srcs.append((n.strip(), u.strip()))
        elif part.strip(): srcs.append((part.strip(), ''))
    meta['sources'] = srcs
    return meta, body

# ---------- 템플릿 ----------
def og_image(slug=None):
    """글 전용 OG 이미지가 og/ 에 실제로 있으면 그걸 쓰고, 없으면 기본 이미지.
    없는 파일을 가리키면 공유 시 미리보기가 깨지므로 파일 존재를 확인한 뒤 쓴다."""
    if slug:
        f = f'og-guide-{slug}.jpg'
        if os.path.exists(os.path.join(ROOT, 'og', f)):
            return f'{SITE}/og/{f}'
    return f'{SITE}/og-image.jpg'

def head_common(title, desc, canonical, keywords, extra_ld, og_img=None):
    og_img = og_img or f'{SITE}/og-image.jpg'
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
<meta name="description" content="{attr(desc)}">
<meta name="keywords" content="{attr(keywords)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="{attr(title)}">
<meta property="og:description" content="{attr(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:locale" content="ko_KR">
{extra_ld}
<script src="/common.js"></script>
<link rel="stylesheet" href="/tool.css">
'''

def render_guide(meta, body_md, slug, tools, all_guides, line_offset=0):
    accent = CAT_ACCENT.get(meta.get('category', ''), '#2f7d4f')
    content, toc, faq, body_imgs = md_to_html(
        body_md, tools, slug, f'guide/src/{slug}.md', line_offset)
    # 본문 중간 광고: 두 번째 h2 앞
    h2s = [m.start() for m in re.finditer(r'<h2 ', content)]
    if len(h2s) >= 2:
        p = h2s[1]; content = content[:p] + '<div class="ad-slot" data-ad="in-content"></div>\n' + content[p:]
    chars = len(re.sub(r'<[^>]+>', '', content)); mins = max(1, round(chars / 600))
    canonical = f'{SITE}/guide/{slug}'
    ld = json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": meta['title'], "description": meta.get('description', ''), "image": [og_image(slug)] + body_imgs, "datePublished": meta.get('date', ''), "dateModified": meta.get('updated', meta.get('date', '')), "author": {"@type": "Organization", "name": "데일리 프리 툴박스", "url": SITE + "/"}, "publisher": {"@type": "Organization", "name": "데일리 프리 툴박스", "logo": {"@type": "ImageObject", "url": f"{SITE}/apple-touch-icon.png"}}, "mainEntityOfPage": {"@type": "WebPage", "@id": canonical}, "inLanguage": "ko"}, ensure_ascii=False)
    faq_ld = ''
    if len(faq) >= 2:
        faq_ld = '\n<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}, ensure_ascii=False) + '</script>' 
    crumbs = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "홈", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "생활 가이드", "item": SITE + "/guide/"}, {"@type": "ListItem", "position": 3, "name": meta['title'], "item": canonical}]}, ensure_ascii=False)
    toc_html = ('<nav class="guide-toc"><b>목차</b><ol>' + ''.join(f'<li><a href="#{sid}">{esc(t)}</a></li>' for sid, t in toc) + '</ol></nav>') if len(toc) >= 3 else ''
    tools_html = ''
    if meta['tools']:
        cards = ''.join(f'<a href="/{f[:-5]}"><img class="tic" src="/icons/{tools[f]["slug"]}.webp" width="34" height="34" alt="" loading="lazy" decoding="async"><span><b>{esc(tools[f]["title"])}</b><small>{esc(tools[f]["desc"])}</small></span><span class="go">›</span></a>' for f in meta['tools'] if f in tools)
        tools_html = f'<section class="guide-tools"><h2>이 글과 함께 쓰는 도구</h2><div class="grid">{cards}</div></section>'
    src_html = ''
    if meta['sources']:
        src_html = '<div class="guide-sources"><b>참고 자료</b><ul>' + ''.join((f'<li><a href="{esc(u)}" target="_blank" rel="noopener">{esc(n)}</a></li>' if u else f'<li>{esc(n)}</li>') for n, u in meta['sources']) + f'</ul>마지막 확인일 {esc(meta.get("updated", meta.get("date","")))} · 제도·요율은 바뀔 수 있으니 중요한 결정 전에는 원 출처를 확인하세요.</div>'
    others = [g for g in all_guides if g['slug'] != slug and g['meta'].get('category') == meta.get('category')][:4]
    more_html = ''
    if others:
        more_html = '<section class="guide-tools"><h2>같은 주제의 다른 글</h2><div class="guide-list">' + ''.join(f'<a class="guide-card" href="/guide/{g["slug"]}"><img class="gic" src="/icons/ui-guide.webp" width="30" height="30" alt="" loading="lazy" decoding="async"><span class="tx"><b>{esc(g["meta"]["title"])}</b></span></a>' for g in others) + '</div></section>'
    # title 접미사 없음 — 도구 페이지 111개가 "제목 - 설명" 형식으로 사이트명을 붙이지 않는다.
    # 예전 " | 데일리 프리 툴박스 생활 가이드"(20자) 때문에 검색 결과에서 뒷부분이 잘렸다.
    return head_common(meta['title'], meta.get('description', ''), canonical, meta.get('keywords', ''), f'<script type="application/ld+json">{ld}</script>\n<script type="application/ld+json">{crumbs}</script>{faq_ld}', og_image(slug)) + f'''<style>:root {{ --accent:{accent}; --accent-deep:#23603c; }}</style>
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
        # .guide-card 는 display:flex 이므로 본문은 .tx 로 감싼다. 안 감싸면 제목·날짜가 가로로 나뉜다.
        # 설명은 넣지 않는다 — 제목이 길어 카드가 커지고 목록에서 고르기 어려워진다(제목은 두 줄까지, tool.css).
        cards = ''.join(
            f'<a class="guide-card" href="/guide/{g["slug"]}">'
            f'<img class="gic" src="/icons/ui-guide.webp" width="30" height="30" alt="" loading="lazy" decoding="async">'
            f'<span class="tx"><b>{esc(g["meta"]["title"])}</b>'
            f'<small>{esc(g["meta"].get("updated", g["meta"].get("date","")))} · 관련 도구 {len(g["meta"]["tools"])}개</small></span></a>'
            for g in items)
        sections += f'<section class="group" id="{esc(c)}" style="--accent:{CAT_ACCENT.get(c,"#2f7d4f")}"><div class="group-head" style="margin:26px 0 10px"><h2 style="font-size:17px;margin:0">{esc(c)}</h2><span class="count" style="font-size:12px;color:var(--ink-soft);margin-left:8px">{len(items)}편</span></div><div class="guide-list">{cards}</div></section>'
    ld = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage", "name": "생활 가이드", "url": canonical, "description": "연봉·퇴직금·실업급여·연차·사주처럼 매일 쓰는 도구 뒤에 있는 규칙과 계산법을 정리한 글 모음"}, ensure_ascii=False)
    return head_common('생활 가이드 - 계산기 뒤의 규칙과 방법을 정리한 글 | 데일리 프리 툴박스', '연봉 실수령액·퇴직금·실업급여·연차·사주 보는 법처럼 도구를 쓰기 전에 알아두면 좋은 규칙과 계산 방법을 정리한 생활 가이드. 각 글에서 관련 계산기로 바로 이동.', canonical, '생활 가이드, 계산 방법, 실수령액 계산법, 퇴직금 계산법, 실업급여 조건, 연차 계산법, 사주 보는 법', f'<script type="application/ld+json">{ld}</script>') + '''<style>:root { --accent:#2f7d4f; --accent-deep:#23603c; }</style>
</head>
<body class="guide-page">

<nav id="site-nav" data-accent="#2f7d4f"></nav>
<script src="/nav.js"></script>

<main>
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span>생활 가이드</nav>
  <h1><img class="h1ic" src="/icons/ui-guide.webp" width="32" height="32" alt="">생활 가이드</h1>
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
                 + ''.join(f'<a href="/guide/{g["slug"]}">'
                           f'<img class="gic" src="/icons/ui-guide.webp" width="34" height="34" alt="" loading="lazy" decoding="async">'
                           f'<span class="tx">{esc(g["meta"]["title"])}</span>'
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
    cards = ''.join(f'<a class="card" href="/guide/{g["slug"]}"><img class="cic" src="/icons/ui-guide.webp" width="34" height="34" alt="" loading="lazy" decoding="async"><span class="ct"><div class="title">{esc(g["meta"]["title"])}</div></span></a>\n      ' for g in latest)
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

def git_first_dates():
    """파일별 처음 추가된 커밋 날짜(YYYY-MM-DD). 얕은 클론·git 오류면 None."""
    import subprocess
    try:
        shallow = subprocess.run(['git', 'rev-parse', '--is-shallow-repository'],
                                 cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if shallow != 'false':
            return None
        out = subprocess.run(['git', '-c', 'core.quotepath=false', 'log', '--diff-filter=A', '--pretty=format:%cs', '--name-only'],
                             cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout
    except Exception:
        return None
    dates, cur = {}, None
    for ln in out.split('\n'):
        ln = ln.strip()
        if not ln:
            continue
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', ln):
            cur = ln
        else:
            dates[ln] = cur           # 최신 커밋부터 나오므로 마지막에 덮어쓴 값이 처음 추가된 날
    return dates

PAREN_TAIL = re.compile(r'\s*\(.*?\)\s*$')    # 제목 끝의 괄호 설명 — '네모로직 (노노그램)' → '네모로직'

def update_home_new(tools, n=6):
    """홈 히어로의 "신규" 칩을 가장 최근에 추가된 도구 n개로 바꾼다.
    추가일은 git 에 처음 커밋된 날. 아직 커밋 전인 새 도구는 오늘로 보고 맨 앞에 둔다.
    같은 날 추가된 도구끼리는 nav.js GROUPS 에 적힌 순서를 따른다."""
    first = git_first_dates()
    if first is None:
        print('  (git 이력을 읽지 못해 홈 신규 목록은 그대로 둠)'); return
    path = os.path.join(ROOT, 'index.html'); s = open(path, encoding='utf-8').read()
    today = datetime.date.today().isoformat()
    order = list(tools)                                    # GROUPS 순서
    ranked = sorted(order, key=lambda f: (first.get(f) or today, -order.index(f)), reverse=True)[:n]
    # 주의: 깃허브 자동 빌드는 파이썬 3.11 이라 f-string 의 { } 안에 역슬래시를 쓸 수 없다. 정규식은 밖에서 처리한다.
    short = lambda f: esc(PAREN_TAIL.sub('', tools[f]['title']))
    chips = ''.join(f'<a href="{tools[f]["slug"]}">{short(f)}</a>' for f in ranked)
    new = inject(s, '<!-- new:home:start -->', '<!-- new:home:end -->', chips)
    if new is None:                                        # 처음 한 번: 손으로 적혀 있던 칩을 표시 주석으로 감싼다
        m = re.search(r'(<div class="hero-hot"><span class="lb">.*?</span>)(.*?)(</div>)', s, flags=re.S)
        if not m:
            print('  (홈에서 신규 목록 자리를 찾지 못함)'); return
        new = s[:m.start(2)] + '<!-- new:home:start -->' + chips + '<!-- new:home:end -->' + s[m.end(2):]
    if new != s:
        open(path, 'w', encoding='utf-8').write(new)
    print('홈 신규 목록 반영:', ', '.join(tools[f]['slug'] for f in ranked))

def update_home_popular(tools, n=6):
    """홈 "인기 도구" 카드를 guide/popular-order.txt 에 적힌 순서대로 다시 쓴다.
    한 줄 형식: slug | 카드 제목 | 짧은 설명 | 배경색 (slug 뒤는 생략 가능). 파일이 없으면 홈을 그대로 둔다."""
    order = os.path.join(OUT, 'popular-order.txt')
    if not os.path.exists(order):
        return
    picked = []
    for line in open(order, encoding='utf-8'):
        line = line.split('#')[0].strip() if line.lstrip().startswith('#') else line.strip()
        if not line:
            continue
        cols = [c.strip() for c in line.split('|')] + ['', '', '']
        f = cols[0] + '.html'
        if f not in tools or any(p[0] == f for p in picked):
            continue                                       # nav.js 에 없는 도구·중복은 건너뛴다
        t = tools[f]
        title = cols[1] or re.sub(r'\s*\(.*?\)\s*$', '', t['title'])
        desc = cols[2] or re.split(r'[,·]', t['desc'])[0].strip()
        bg = cols[3] if re.fullmatch(r'#[0-9a-fA-F]{3,8}', cols[3]) else '#eef3fb'
        picked.append((f, title, desc, bg))
        if len(picked) == n:
            break
    if not picked:
        print('  (popular-order.txt 에 쓸 수 있는 도구가 없어 홈 인기 도구는 그대로 둠)'); return
    path = os.path.join(ROOT, 'index.html'); s = open(path, encoding='utf-8').read()
    cards = '\n' + ''.join(
        f'      <a class="pop-card" href="{tools[f]["slug"]}"><span class="ic" style="background:{bg}"><img src="/icons/{tools[f]["slug"]}.webp" width="34" height="34" alt=""></span>'
        f'<span class="t">{esc(title)}</span><span class="d">{esc(desc)}</span></a>\n' for f, title, desc, bg in picked) + '    '
    new = inject(s, '<!-- pop:home:start -->', '<!-- pop:home:end -->', cards)
    if new is None:                                        # 처음 한 번: 손으로 적혀 있던 카드를 표시 주석으로 감싼다
        m = re.search(r'(<div class="pop-cards">)(.*?)(</div>\s*</section>)', s, flags=re.S)
        if not m:
            print('  (홈에서 인기 도구 자리를 찾지 못함)'); return
        new = s[:m.start(2)] + '<!-- pop:home:start -->' + cards + '<!-- pop:home:end -->' + s[m.end(2):]
    if new != s:
        open(path, 'w', encoding='utf-8').write(new)
    print('홈 인기 도구 반영:', ', '.join(tools[f]['slug'] for f, *_ in picked))

def update_sitemap(all_guides):
    path = os.path.join(ROOT, 'sitemap.xml'); s = open(path, encoding='utf-8').read()
    # 목록 페이지는 글이 추가될 때 바뀌므로 가장 최근 글 날짜를 쓴다
    newest = max((g['meta'].get('updated', g['meta'].get('date', '')) for g in all_guides), default='')
    urls = f'  <url>\n    <loc>{SITE}/guide/</loc>\n    <lastmod>{newest}</lastmod>\n  </url>\n' + ''.join(f'  <url>\n    <loc>{SITE}/guide/{g["slug"]}</loc>\n    <lastmod>{g["meta"].get("updated", g["meta"].get("date",""))}</lastmod>\n  </url>\n' for g in all_guides)
    new = inject(s, '<!-- guides:start -->\n', '<!-- guides:end -->\n', urls)
    if new is None:
        new = s.replace('</urlset>', '<!-- guides:start -->\n' + urls + '<!-- guides:end -->\n</urlset>')
    open(path, 'w', encoding='utf-8').write(new); print('sitemap 반영')

def git_dates():
    """파일별 마지막 커밋 날짜(YYYY-MM-DD).
    얕은 클론에서는 모든 파일이 같은 날짜로 보여 잘못된 값이 되므로 빈 값을 돌려준다."""
    import subprocess
    try:
        shallow = subprocess.run(['git', 'rev-parse', '--is-shallow-repository'],
                                 cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if shallow != 'false':
            print('  (얕은 클론이라 sitemap lastmod 는 손대지 않음)')
            return {}
        out = subprocess.run(['git', 'log', '--pretty=format:%cs', '--name-only'],
                             cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout
    except Exception as e:
        print('  (git 을 읽지 못해 sitemap lastmod 는 그대로 둠:', e, ')')
        return {}
    dates, cur = {}, None
    for ln in out.split('\n'):
        ln = ln.strip()
        if not ln:
            continue
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', ln):
            cur = ln
        else:
            dates.setdefault(ln, cur)   # 최신 커밋부터 나오므로 처음 만난 값이 마지막 수정일
    return dates

def refresh_sitemap_lastmod():
    """가이드 블록 밖(도구·문서 페이지)의 <lastmod> 를 실제 마지막 수정일로 맞춘다.
    구글은 lastmod 가 정확할 때만 참고하므로 지어내지 않고 커밋 날짜를 쓴다."""
    dates = git_dates()
    if not dates:
        return
    path = os.path.join(ROOT, 'sitemap.xml'); s = open(path, encoding='utf-8').read()
    head, sep, tail = s.partition('<!-- guides:start -->')

    def one(m):
        block, url = m.group(0), m.group(1)
        rel = url[len(SITE):].strip('/')
        f = 'index.html' if rel == '' else rel + '.html'
        d = dates.get(f)
        if not d:
            return block
        if '<lastmod>' in block:
            return re.sub(r'<lastmod>[^<]*</lastmod>', f'<lastmod>{d}</lastmod>', block)
        return block.replace(f'<loc>{url}</loc>', f'<loc>{url}</loc>\n    <lastmod>{d}</lastmod>')

    n = len(re.findall(r'<loc>', head))
    head = re.sub(r'  <url>\s*<loc>([^<]+)</loc>.*?</url>', one, head, flags=re.S)
    open(path, 'w', encoding='utf-8').write(head + sep + tail)
    print(f'sitemap lastmod 반영 ({n}개 주소)')

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
        html_out = render_guide(g['meta'], g['body'], g['slug'], tools, guides, g['meta'].get('_line_offset', 0))
        open(os.path.join(OUT, g['slug'] + '.html'), 'w', encoding='utf-8').write(html_out)
        print('생성:', f'guide/{g["slug"]}.html', f'({g["meta"]["title"]})')
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(render_index(guides))
    print('생성: guide/index.html')
    update_tool_pages(guides, tools); update_home(guides); update_home_new(tools); update_home_popular(tools); update_sitemap(guides); refresh_sitemap_lastmod()

if __name__ == '__main__':
    main()
