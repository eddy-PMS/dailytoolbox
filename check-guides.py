# -*- coding: utf-8 -*-
"""
가이드·도구 점검기 — 빌드 전에 조용히 깨지는 것들을 잡아준다
사용: 프로젝트 폴더에서  python check-guides.py

검사 항목
  [원고]  머리말 필수 항목 누락, :::/?? 문법 오류
  [도구]  가이드가 가리키는 도구가 실제로 있는지, nav.js 에 등록돼 있는지
  [문법]  [[tool:...]] 규칙(소문자·숫자·하이픈 + .html)에 안 맞아 카드로 안 바뀌는 줄
  [삽입]  도구 페이지에 "관련 가이드" 블록을 넣을 자리(마커 또는 sibs 블록)가 있는지
  [색인]  nav.js 에 있는데 sitemap.xml 에 빠진 도구 페이지

오류가 하나라도 있으면 종료 코드 1 (빌드 전에 멈추라는 뜻)
외부 패키지 필요 없음 (Python 3.8+)
"""
import os, re, glob, json, sys

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'guide', 'src')
SITE = 'https://dailyfreetoolbox.com'
REQUIRED = ['title', 'description', 'date', 'updated', 'category', 'tools', 'keywords', 'sources']
CATEGORIES = ['계산·생활', '돈·일', '가족·건강', '공부·어학', '재미']
TOOL_RE = re.compile(r'^\[\[tool:([a-z0-9-]+\.html)(?:\|(.+?))?\]\]$')

errors, warns = [], []
def err(where, msg): errors.append((where, msg))
def warn(where, msg): warns.append((where, msg))


def load_nav_tools():
    src = open(os.path.join(ROOT, 'nav.js'), encoding='utf-8').read()
    m = re.search(r'var GROUPS = (\[.*?\]);', src, re.S)
    if not m:
        err('nav.js', 'GROUPS 배열을 찾지 못했어요. 파일이 깨졌는지 확인하세요.')
        return {}
    tools = {}
    for g in json.loads(m.group(1)):
        for it in g['items']:
            tools[it[0]] = it[1]
    return tools


def parse_front(text):
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', text, re.S)
    if not m: return None, None
    meta = {}
    for ln in m.group(1).split('\n'):
        if ':' in ln:
            k, v = ln.split(':', 1); meta[k.strip()] = v.strip()
    return meta, m.group(2)


def check_body(where, body, nav, referenced):
    depth = 0
    for n, ln in enumerate(body.split('\n'), 1):
        st = ln.strip()
        if st.startswith(':::'):
            depth = 0 if depth else 1
        if '[[tool:' in st:
            m = TOOL_RE.match(st)
            if not m:
                err(where, f'{n}행: [[tool:...]] 문법에 안 맞아 링크 카드로 안 바뀌어요 → {st[:60]}')
            else:
                referenced.add(m.group(1))
                check_tool(where, m.group(1), nav, f'{n}행 본문')
        if st.startswith('?? ') and len(st) < 5:
            err(where, f'{n}행: ?? 뒤 질문이 비었어요')
    if depth: err(where, '::: 블록이 열리고 닫히지 않았어요')

    for n, ln in enumerate(body.split('\n'), 1):
        if ln.strip().startswith('?? '):
            nxt = body.split('\n')[n] if n < len(body.split('\n')) else ''
            if not nxt.strip():
                err(where, f'{n}행: FAQ 질문 다음 줄에 답이 없어요 → {ln.strip()[:40]}')


def check_tool(where, f, nav, ctx):
    if not os.path.exists(os.path.join(ROOT, f)):
        err(where, f'{ctx}: {f} 파일이 없어요 (링크가 404가 됩니다)')
    elif f not in nav:
        err(where, f'{ctx}: {f} 가 nav.js GROUPS 에 없어요 (카드 제목이 파일명으로 나옵니다)')


def main():
    nav = load_nav_tools()
    referenced = set()
    files = sorted(glob.glob(os.path.join(SRC, '*.md')))
    if not files:
        print('guide/src/ 에 원고가 없어요.'); return 0

    published = drafts = 0
    for p in files:
        where = os.path.relpath(p, ROOT).replace('\\', '/')
        meta, body = parse_front(open(p, encoding='utf-8').read())
        if meta is None:
            err(where, '머리말(--- 로 감싼 부분) 형식이 잘못됐어요'); continue

        if str(meta.get('draft', '')).strip().lower() in ('true', 'y', 'yes', '1'):
            drafts += 1
        else:
            published += 1

        for k in REQUIRED:
            if not meta.get(k): err(where, f'머리말에 {k} 가 없어요')
        if meta.get('category') and meta['category'] not in CATEGORIES:
            err(where, f'category 가 «{meta["category"]}» 인데 허용값은 {" / ".join(CATEGORIES)} 예요')
        for k in ('date', 'updated'):
            if meta.get(k) and not re.match(r'^\d{4}-\d{2}-\d{2}$', meta[k]):
                err(where, f'{k} 가 YYYY-MM-DD 형식이 아니에요 → {meta[k]}')
        src = meta.get('sources', '')
        if src and '|' not in src and not src.startswith(('인용한', '없음')):
            warn(where, 'sources 에 URL(| 뒤)이 없어요. "이름 | 주소" 형식을 권장해요')

        meta_tools = [x.strip() for x in meta.get('tools', '').split(',') if x.strip()]
        if not meta_tools:
            err(where, 'tools 가 비었어요 (관련 도구 페이지에 가이드 블록이 안 붙습니다)')
        for f in meta_tools:
            referenced.add(f)
            check_tool(where, f, nav, '머리말 tools')

        check_body(where, body, nav, referenced)

        if not re.search(r'^\[\[tool:', body, re.M):
            warn(where, '본문에 도구 링크 카드([[tool:...]])가 하나도 없어요')

    # 도구 페이지에 가이드 블록을 넣을 자리가 있는지
    for f in sorted(referenced):
        path = os.path.join(ROOT, f)
        if not os.path.exists(path): continue
        s = open(path, encoding='utf-8').read()
        if '<!-- guides:tool:start -->' in s: continue
        if not re.search(r'<div class="sibs">.*?</div></div>\n', s, re.S):
            err(f, '마커도 sibs 블록도 없어 "관련 가이드" 블록이 안 들어가요 (빌드가 [skip] 처리)')

    # sitemap 에 빠진 도구
    sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    listed = set(re.findall(r'<loc>\s*(.*?)\s*</loc>', sm))
    missing = [f for f in sorted(nav) if f'{SITE}/{f}' not in listed]
    for f in missing:
        warn('sitemap.xml', f'{f} 가 sitemap 에 없어요 ({nav[f]})')

    print(f'원고 {len(files)}편 (발행 {published} / 초안 {drafts}) · 도구 {len(nav)}개 검사')
    print()
    for where, msg in errors: print(f'  [오류] {where} — {msg}')
    for where, msg in warns: print(f'  [경고] {where} — {msg}')
    if not errors and not warns: print('  문제 없음. 빌드해도 됩니다.')
    elif not errors: print(f'\n오류 없음 (경고 {len(warns)}건). 빌드해도 됩니다.')
    else: print(f'\n오류 {len(errors)}건. 고치고 다시 실행하세요.')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
