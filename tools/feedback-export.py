"""모의고사 의견(KV fb:<도구>:…)을 CSV 로 내보낸다. 읽기만 하고 지우지 않는다.

  python tools/feedback-export.py            # cs2(컴활 2급) 의견 → _specs/feedback/cs2-YYYYMMDD.csv
  python tools/feedback-export.py cs2 --local # wrangler dev 로컬 KV 에서 읽기(시험용)

wrangler 로그인이 된 PC 에서 실행한다(Cloudflare 계정 권한 필요). KV 이름은 wrangler.jsonc 의 WORLDCUP_KV.
"""
import csv, datetime, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def wrangler(*args):
    cmd = ['npx', 'wrangler', 'kv', *args, '--binding', 'WORLDCUP_KV']
    cmd.append('--local' if LOCAL else '--remote')
    out = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', shell=(os.name == 'nt'))
    if out.returncode != 0:
        sys.exit('wrangler 실패: ' + (out.stderr or out.stdout)[-500:])
    return out.stdout


args = [a for a in sys.argv[1:] if not a.startswith('--')]
LOCAL = '--local' in sys.argv
tool = args[0] if args else 'cs2'
keys = [k['name'] for k in json.loads(wrangler('key', 'list', '--prefix', f'fb:{tool}:'))]
rows = []
for k in keys:
    try:
        v = json.loads(wrangler('key', 'get', k, '--text'))
    except ValueError:
        continue
    took = {'yes': '봤어요', 'no': '아직'}.get(v.get('took'), '')
    rows.append([v.get('t', ''), v.get('qid') or '', took, v.get('std', ''), v.get('text', ''), k])
rows.sort()
out_dir = os.path.join(ROOT, '_specs', 'feedback'); os.makedirs(out_dir, exist_ok=True)
path = os.path.join(out_dir, f'{tool}-{datetime.date.today():%Y%m%d}.csv')
with open(path, 'w', encoding='utf-8-sig', newline='') as f:   # 엑셀에서 한글이 깨지지 않게 BOM
    w = csv.writer(f)
    w.writerow(['보낸 시각(UTC)', '문항 번호', '실제 응시', '출제기준', '의견', 'KV 키'])
    w.writerows(rows)
print(f'{len(rows)}건 → {path}')
