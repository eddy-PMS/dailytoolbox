#!/usr/bin/env python3
"""
네모로직 도안 PNG -> nono-art.js 격자 변환 + 논리 풀이 검증

사용법:
  python nono-import.py <폴더|파일...> [--json out.json] [--allow-guess] [--quiet]

PNG 파일 이름 규칙: <N>x<N>_<번호>_<이름>.png   예) 9x9_02_anchor.png
TXT 파일: '@ 이름 이모지' 줄 다음에 #/. 격자 (Claude가 직접 설계한 도안 검증용)
"""
import sys, os, re, json, argparse
from PIL import Image

NAME_RE = re.compile(r'(\d+)\s*[x×]\s*(\d+)[_-]?(\d+)?[_-]?(.*)', re.I)


# ---------- PNG -> 격자 ----------
def png_to_grid(path, n=None, thresh=128, fill_ratio=0.5):
    """셀마다 어두운 픽셀 비율이 fill_ratio 이상이면 칠한 칸으로 본다."""
    base = os.path.basename(path)
    m = NAME_RE.match(base)
    label = None
    if m:
        if n is None:
            n = int(m.group(1))
        label = (m.group(4) or '').rsplit('.', 1)[0].replace('_', ' ').strip() or None
    if n is None:
        raise ValueError(f'격자 크기를 알 수 없음: {base} (파일명 9x9_01_anchor.png 형식 권장)')

    im = Image.open(path).convert('L')
    w, h = im.size
    px = im.load()
    rows = []
    for r in range(n):
        y0, y1 = h * r // n, h * (r + 1) // n
        line = []
        for c in range(n):
            x0, x1 = w * c // n, w * (c + 1) // n
            # 셀 경계선 오차를 피하려고 안쪽 60%만 본다
            mx, my = (x1 - x0), (y1 - y0)
            ix0, ix1 = x0 + int(mx * 0.2), x1 - int(mx * 0.2)
            iy0, iy1 = y0 + int(my * 0.2), y1 - int(my * 0.2)
            dark = total = 0
            for y in range(max(iy0, y0), max(iy1, iy0 + 1)):
                for x in range(max(ix0, x0), max(ix1, ix0 + 1)):
                    total += 1
                    if px[x, y] < thresh:
                        dark += 1
            line.append('#' if total and dark / total >= fill_ratio else '.')
        rows.append(''.join(line))
    return n, label, rows


# ---------- 텍스트 격자 (Claude가 직접 설계한 도안) ----------
def parse_txt(path):
    """
    형식:
      @ 고양이 🐱
      ..#....#..
      .########.
      (빈 줄 또는 다음 @ 까지가 한 도안)
    """
    out, cur = [], None
    with open(path, encoding='utf-8') as fp:
        for raw in fp:
            line = raw.strip()
            if line.startswith('@'):
                if cur and cur['rows']:
                    out.append(cur)
                parts = line[1:].strip().rsplit(' ', 1)
                name, emo = (parts[0], parts[1]) if len(parts) == 2 and not parts[1].isalnum() else (line[1:].strip(), '❓')
                cur = {'name': name, 'emoji': emo, 'rows': []}
            elif line and set(line) <= set('#.') and cur is not None:
                cur['rows'].append(line)
            elif not line and cur and cur['rows']:
                out.append(cur); cur = None
    if cur and cur['rows']:
        out.append(cur)
    return out


# ---------- 논리 풀이 검증 ----------
def clues(line):
    out, run = [], 0
    for ch in line:
        if ch == 1:
            run += 1
        else:
            if run:
                out.append(run)
            run = 0
    if run:
        out.append(run)
    return out


def solve_line(clue, line):
    """DP 줄 풀이: 각 칸이 확정 가능한지 계산. 모순이면 None."""
    L, k = len(line), len(clue)
    zp = [0] * (L + 1)                       # 확정된 빈칸(0) 누적 개수
    for i, v in enumerate(line):
        zp[i + 1] = zp[i] + (1 if v == 0 else 0)
    f = [[False] * (k + 1) for _ in range(L + 1)]
    f[L][k] = True
    for i in range(L - 1, -1, -1):
        f[i][k] = f[i + 1][k] and line[i] != 1
    for j in range(k - 1, -1, -1):
        b = clue[j]
        for i in range(L - 1, -1, -1):
            v = line[i] != 1 and f[i + 1][j]
            if not v and i + b <= L and zp[i + b] - zp[i] == 0:
                e = i + b
                if e == L:
                    v = (j + 1 == k)
                elif line[e] != 1:
                    v = f[e + 1][j + 1]
            f[i][j] = v
    if not f[0][0]:
        return None
    can0 = [False] * L
    d1 = [0] * (L + 1)
    reach = [[False] * (k + 1) for _ in range(L + 1)]
    reach[0][0] = True
    for i in range(L):
        for j in range(k + 1):
            if not reach[i][j] or not f[i][j]:
                continue
            if line[i] != 1 and f[i + 1][j]:
                can0[i] = True
                reach[i + 1][j] = True
            if j < k:
                b = clue[j]
                e = i + b
                if e <= L and zp[e] - zp[i] == 0:
                    if e == L:
                        if j + 1 == k:
                            d1[i] += 1; d1[e] -= 1
                    elif line[e] != 1 and f[e + 1][j + 1]:
                        d1[i] += 1; d1[e] -= 1
                        can0[e] = True
                        reach[e + 1][j + 1] = True
    out, acc = [], 0
    for i in range(L):
        acc += d1[i]
        c1, c0 = acc > 0, can0[i]
        if not c0 and not c1:
            return None
        out.append(1 if c1 and not c0 else 0 if c0 and not c1 else -1)
    return out


def _propagate(g, rc, cc, nr, nc):
    changed = True
    while changed:
        changed = False
        for i in range(nr):
            res = solve_line(rc[i], g[i])
            if res is None:
                return False
            for j in range(nc):
                if g[i][j] == -1 and res[j] != -1:
                    g[i][j] = res[j]; changed = True
        for j in range(nc):
            col = [g[i][j] for i in range(nr)]
            res = solve_line(cc[j], col)
            if res is None:
                return False
            for i in range(nr):
                if g[i][j] == -1 and res[i] != -1:
                    g[i][j] = res[i]; changed = True
    return True


def solve_by_lines(rows_clues, cols_clues, nr, nc):
    """줄 단위 논리 추론만 반복. 모두 확정되면 '논리로 풀림'."""
    g = [[-1] * nc for _ in range(nr)]
    if not _propagate(g, rows_clues, cols_clues, nr, nc):
        return None
    return g


def count_solutions(rc, cc, nr, nc, cap=2, budget=4000):
    """줄 추론이 막히면 한 칸씩 가정해 보면서 해의 개수를 cap까지 센다."""
    state = {'nodes': 0}

    def rec(g):
        state['nodes'] += 1
        if state['nodes'] > budget:
            return cap                       # 너무 오래 걸리면 '유일하지 않음'으로 취급
        if not _propagate(g, rc, cc, nr, nc):
            return 0
        spot = next(((i, j) for i in range(nr) for j in range(nc) if g[i][j] == -1), None)
        if spot is None:
            return 1
        i, j = spot
        total = 0
        for v in (1, 0):
            g2 = [row[:] for row in g]
            g2[i][j] = v
            total += rec(g2)
            if total >= cap:
                return total
        return total

    return rec([[-1] * nc for _ in range(nr)])


def check(rows):
    g = [[1 if ch == '#' else 0 for ch in r] for r in rows]
    nr, nc = len(g), len(g[0])
    rc = [clues(r) for r in g]
    cc = [clues([g[i][j] for i in range(nr)]) for j in range(nc)]
    if any(len(r) != nc for r in rows):
        return 'bad-shape', None
    if all(v == 0 for r in g for v in r):
        return 'empty', None
    sol = solve_by_lines(rc, cc, nr, nc)
    if sol == 'too-big':
        return 'too-big', None
    if sol is None:
        return 'unsolvable', None
    if any(v == -1 for r in sol for v in r):
        # 줄 추론으로는 못 끝냄 -> 추측했을 때 정답이 유일한지 확인
        cnt = count_solutions(rc, cc, nr, nc)
        return ('guess-unique' if cnt == 1 else 'ambiguous'), None
    if sol != g:
        return 'not-unique', None
    return 'ok', None


def preview(rows):
    return '\n'.join(r.replace('#', '■').replace('.', '·') for r in rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--json', help='결과를 JSON으로 저장')
    ap.add_argument('--quiet', action='store_true')
    ap.add_argument('--allow-guess', action='store_true', help="정답이 유일하면 추측이 필요한 도안도 통과시킴")
    args = ap.parse_args()

    files = []
    for p in args.paths:
        if os.path.isdir(p):
            files += [os.path.join(p, f) for f in sorted(os.listdir(p))
                      if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.txt'))]
        else:
            files.append(p)

    results = []
    for f in files:
        if f.lower().endswith('.txt'):
            for d in parse_txt(f):
                rows = d['rows']
                n = len(rows)
                status = 'bad-shape' if any(len(r) != n for r in rows) else check(rows)[0]
                filled = sum(r.count('#') for r in rows)
                results.append({'file': os.path.basename(f), 'n': n, 'name': d['name'], 'emoji': d['emoji'],
                                'rows': rows, 'status': status, 'filled': filled})
                if not args.quiet:
                    print(f"\n=== {d['emoji']} {d['name']}  {n}x{n}  [{status}]  칠함 {filled}/{n*n} ===")
                    print(preview(rows))
            continue
        try:
            n, label, rows = png_to_grid(f)
        except Exception as e:
            print(f'[읽기 실패] {os.path.basename(f)}: {e}')
            continue
        status, _ = check(rows)
        filled = sum(r.count('#') for r in rows)
        results.append({'file': os.path.basename(f), 'n': n, 'name': label,
                        'rows': rows, 'status': status, 'filled': filled})
        if not args.quiet:
            print(f"\n=== {os.path.basename(f)}  {n}x{n}  {label or ''}  [{status}]  칠함 {filled}/{n*n} ===")
            print(preview(rows))

    passing = {'ok', 'guess-unique'} if args.allow_guess else {'ok'}
    ok = [r for r in results if r['status'] in passing]
    print(f"\n----- 요약: 통과 {len(ok)} / 전체 {len(results)} -----")
    for r in results:
        if r['status'] not in passing:
            print(f"  제외 {r['file']} {r['name'] or ''}: {r['status']}")

    if args.json:
        with open(args.json, 'w', encoding='utf-8') as fp:
            json.dump(results, fp, ensure_ascii=False, indent=1)
        print(f'JSON 저장: {args.json}')

    print('\nnono-art.js 형식:')
    for r in ok:
        rows = ', '.join(f"'{x}'" for x in r['rows'])
        print(f"  {{ n:'{r['name'] or '이름'}', e:'{r.get('emoji', '❓')}', s:{r['n']}, r:[{rows}] }},")


if __name__ == '__main__':
    main()
