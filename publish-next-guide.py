# -*- coding: utf-8 -*-
"""
대기 중인 초안 하나를 발행 상태로 바꾼다 (GitHub Actions 에서 매일 실행)

  · guide/publish-order.txt 에 적힌 순서대로 고른다.
  · 그 파일에 없거나 순서가 끝났으면 남은 초안 중 파일명 순으로 고른다.
  · 고른 원고의 draft 줄을 지우고 date·updated 를 발행일(한국시간)로 바꾼다.
  · 발행할 초안이 없으면 종료 코드 3 으로 끝낸다 (작업 없음, 오류 아님).

빌드와 커밋은 하지 않는다. 워크플로가 이어서 처리한다.
"""
import os, sys, glob, datetime

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'guide', 'src')
ORDER = os.path.join(ROOT, 'guide', 'publish-order.txt')
TRUE = ('true', 'y', 'yes', '1')


def head_value(line, key):
    """'key: 값' 형태면 값을 돌려주고, 아니면 None"""
    if not line.lower().startswith(key + ':'):
        return None
    return line.split(':', 1)[1].strip()


def is_draft(path):
    for line in open(path, encoding='utf-8'):
        v = head_value(line.strip(), 'draft')
        if v is not None and v.lower() in TRUE:
            return True
    return False


def pick():
    drafts = [p for p in sorted(glob.glob(os.path.join(SRC, '*.md'))) if is_draft(p)]
    if not drafts:
        return None, []
    by_slug = {os.path.splitext(os.path.basename(p))[0]: p for p in drafts}
    if os.path.exists(ORDER):
        for line in open(ORDER, encoding='utf-8'):
            slug = line.split('#')[0].strip()
            if slug and slug in by_slug:
                return by_slug[slug], drafts
    return drafts[0], drafts          # 순서 파일에 없으면 파일명 순


def publish(path, today):
    out, title = [], ''
    for line in open(path, encoding='utf-8').read().split('\n'):
        st = line.strip()
        v = head_value(st, 'draft')
        if v is not None and v.lower() in TRUE:
            continue                                   # draft 줄은 통째로 버린다
        if st.lower().startswith('date:'):
            line = 'date: ' + today
        elif st.lower().startswith('updated:'):
            line = 'updated: ' + today
        elif st.lower().startswith('title:'):
            title = head_value(st, 'title') or ''
        out.append(line)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out))
    return title


def main():
    path, drafts = pick()
    if not path:
        print('발행할 초안이 없어요. 오늘은 넘어갑니다.')
        return 3

    today = (datetime.datetime.now(datetime.timezone.utc)
             + datetime.timedelta(hours=9)).strftime('%Y-%m-%d')   # 한국시간
    slug = os.path.splitext(os.path.basename(path))[0]
    title = publish(path, today)

    print('발행:', slug, '·', title)
    print('발행일:', today, '· 남은 초안:', len(drafts) - 1, '편')
    with open(os.environ.get('GITHUB_OUTPUT', os.devnull), 'a', encoding='utf-8') as f:
        f.write('slug=%s\n' % slug)
        f.write('title=%s\n' % (title or slug))
        f.write('left=%d\n' % (len(drafts) - 1))
    return 0


if __name__ == '__main__':
    sys.exit(main())
