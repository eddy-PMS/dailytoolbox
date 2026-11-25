"""편입영어 모의고사 문제 파일 형식 검사.
사용: python tools/transfer-bank-check.py transfer-skku-bank.json
      python tools/transfer-bank-check.py teps-mock-bank.json   (텝스: school 대신 exam, minutes {all,vg,r}, 영역 area)
검사: 필수 키, 문항 id 중복, 영역·지문 id 연결, 보기 수(4~5)·정답 1개·범위, 해설 있음,
허용 표시(<u>…</u>, ____) 밖 HTML 없음, 지문 묶음 문항이 붙어 있음, 쓰지 않는 말 없음.
"""
import json, re, sys

# '기출'은 분석 근거로만 허용(성균관대 스펙 변경 이력 1). 허용 꼴을 지운 뒤 남은 '기출 문제'·'실제 기출'은 실패
ALLOWED = ['실제 기출 문제가 아니', '기출의 출제 유형', '기출 출제 유형', '기출 유형']
BANNED = ['기출 문제', '기출문제', '실제 기출', '실제 시험 문제', '적중', '합격 보장', '예상 점수', '점수 환산']
TAG = re.compile(r'<(?!/?u>)[^>]*>')


def check(path):
    d = json.load(open(path, encoding='utf-8'))
    err = []
    for k in ('school', 'title', 'source', 'checked', 'minutes', 'sections', 'passages', 'q'):
        if k not in d and not (k == 'school' and 'exam' in d):
            err.append(f'키 없음: {k}')
    if err:
        return err, d
    secs = {s['id'] for s in d['sections']}
    psgs = {p['id'] for p in d['passages']}
    ids = set()
    last_p = {}
    for n, q in enumerate(d['q']):
        if len(q) != 8:
            err.append(f'{n}번째 문항: 항목 {len(q)}개(8개여야 함)')
            continue
        qid, rnd, sec, pid, text, opts, ans, expl = q
        tag = f'id {qid}'
        if not isinstance(qid, int) or not (1 <= qid <= 99) or (rnd, qid) in ids:
            err.append(f'{tag}: id 가 1~99 정수가 아니거나 같은 회차 안에서 중복')
        ids.add((rnd, qid))
        tag = f'{rnd}회 id {qid}'
        if not isinstance(rnd, int) or rnd < 1:
            err.append(f'{tag}: 회차가 1 이상 정수가 아님')
        if sec not in secs:
            err.append(f'{tag}: 영역 id {sec} 없음')
        if pid is not None:
            if pid not in psgs:
                err.append(f'{tag}: 지문 id {pid} 없음')
            if pid in last_p and last_p[pid] != n - 1:
                err.append(f'{tag}: 지문 {pid} 문항이 떨어져 있음')
            last_p[pid] = n
        if not (4 <= len(opts) <= 5 or (sec == 'wordbox' and len(opts) == 20)) or any(not str(o).strip() for o in opts):
            err.append(f'{tag}: 보기 {len(opts)}개 또는 빈 보기')
        if len(ans) != 1 or not (1 <= ans[0] <= len(opts)):
            err.append(f'{tag}: 정답이 1개가 아니거나 범위 밖 {ans}')
        if not str(expl).strip():
            err.append(f'{tag}: 해설 없음')
        for t in [text, expl, *opts]:
            if TAG.search(str(t)):
                err.append(f'{tag}: 허용 밖 HTML')
    for p in d['passages']:
        if TAG.search(p['text']):
            err.append(f'지문 {p["id"]}: 허용 밖 HTML')
    if 'points' in d:
        pts = d['points']
        if not isinstance(pts, list) or not all(isinstance(x, list) and len(x) == 3 and x[0] <= x[1] and x[2] > 0 for x in pts):
            err.append('points 형식: [[시작id, 끝id, 점수], …]')
        else:
            for (rnd, qid) in ids:
                if not any(a <= qid <= b for a, b, _ in pts):
                    err.append(f'{rnd}회 id {qid}: points 범위 밖')
    # 영역 고르기(텝스): minutes {all,vg,r}, 영역마다 area, 회차마다 어휘 30·문법 30·독해 35(id 1~95)
    if isinstance(d['minutes'], dict):
        m = d['minutes']
        if set(m) != {'all', 'vg', 'r'} or m['all'] != m['vg'] + m['r']:
            err.append(f'minutes 는 {{all, vg, r}} 이고 all = vg + r 이어야 함: {m}')
        area = {sc['id']: sc.get('area') for sc in d['sections']}
        if any(not a for a in area.values()):
            err.append('영역에 area 없음')
        if d.get('exam') == 'teps':
            want = {'어휘': (1, 30), '문법': (31, 60), '독해': (61, 95)}
            for rnd in sorted({q[1] for q in d['q']}):
                for a, (lo, hi) in want.items():
                    got = sorted(q[0] for q in d['q'] if q[1] == rnd and area.get(q[2]) == a)
                    if got != list(range(lo, hi + 1)):
                        err.append(f'{rnd}회 {a}: id {lo}~{hi} 가 아님 ({len(got)}문항)')
    blob = json.dumps(d, ensure_ascii=False)
    for a in ALLOWED:
        blob = blob.replace(a, '')
    for w in BANNED:
        if w in blob:
            err.append(f'쓰지 않는 말: {w}')
    if '기출' in blob:
        i = blob.index('기출')
        print(f'확인 필요(실패 아님): 허용 꼴 밖 「기출」 — …{blob[max(0, i - 20):i + 20]}…')
    pen = d.get('penalty')
    if pen is not None and not (isinstance(pen, (int, float)) and 0 <= pen < 1):
        err.append('penalty 는 0 이상 1 미만 수(예 0.25, 감점 없으면 0)')
    return err, d


if __name__ == '__main__':
    e, d = check(sys.argv[1])
    print(f"문항 {len(d.get('q', []))}개 · 지문 {len(d.get('passages', []))}개 · 영역 {len(d.get('sections', []))}개")
    print('\n'.join(e) if e else '통과')
    sys.exit(1 if e else 0)
