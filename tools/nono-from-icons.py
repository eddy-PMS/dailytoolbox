#!/usr/bin/env python3
"""
아이콘(Phosphor Icons, MIT 라이선스) -> 네모로직 도안 후보 생성

처음 한 번:  pip install resvg-py pillow

사용법
  후보 만들기:  python tools/nono-from-icons.py make 20            (20x20 후보 12개)
               python tools/nono-from-icons.py make 20 --count 20 --theme 동물
  고르기:      python tools/nono-from-icons.py pick 20 2,5,7,11,14
  주제 목록:   python tools/nono-from-icons.py themes

후보는 _incoming/nono/cand-<N>.json 에 저장되고, pick 하면 nono-art.js 항목 형식으로 출력된다.
고른 아이콘은 _incoming/nono/used-icons.txt 에 기록되어 다음 후보에서 빠진다.
"""
import sys, os, io, re, json, tarfile, argparse, urllib.request, importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # dailytoolbox/
INCOMING = os.path.join(ROOT, '_incoming', 'nono')
CACHE = os.path.join(ROOT, '_incoming', 'icons')
PHOSPHOR_VER = '2.1.1'
PHOSPHOR_URL = f'https://registry.npmjs.org/@phosphor-icons/core/-/core-{PHOSPHOR_VER}.tgz'
USED_FILE = os.path.join(INCOMING, 'used-icons.txt')

# 아이콘 이름: (한국어 이름, 이모지, 주제)
ICONS = {
    # 동물
    'cat': ('고양이', '🐱', '동물'), 'dog': ('강아지', '🐶', '동물'), 'fish': ('물고기', '🐟', '동물'),
    'fish-simple': ('열대어', '🐠', '동물'), 'bird': ('새', '🐦', '동물'), 'butterfly': ('나비', '🦋', '동물'),
    'horse': ('말', '🐴', '동물'), 'rabbit': ('토끼', '🐰', '동물'), 'cow': ('젖소', '🐮', '동물'),
    'paw-print': ('발바닥', '🐾', '동물'), 'bug-beetle': ('딱정벌레', '🪲', '동물'), 'bug': ('벌레', '🐛', '동물'),
    'shrimp': ('새우', '🦐', '동물'), 'feather': ('깃털', '🪶', '동물'), 'bone': ('뼈다귀', '🦴', '동물'),
    'egg': ('달걀', '🥚', '동물'), 'egg-crack': ('깨진 달걀', '🐣', '동물'),
    # 자연
    'tree': ('나무', '🌳', '자연'), 'tree-evergreen': ('전나무', '🌲', '자연'), 'tree-palm': ('야자수', '🌴', '자연'),
    'cactus': ('선인장', '🌵', '자연'), 'flower': ('꽃', '🌸', '자연'), 'flower-lotus': ('연꽃', '🪷', '자연'),
    'flower-tulip': ('튤립', '🌷', '자연'), 'leaf': ('나뭇잎', '🍃', '자연'), 'clover': ('네잎클로버', '🍀', '자연'),
    'acorn': ('도토리', '🌰', '자연'), 'plant': ('새싹', '🌱', '자연'), 'potted-plant': ('화분', '🪴', '자연'),
    'mountains': ('산', '⛰️', '자연'), 'island': ('섬', '🏝️', '자연'), 'sun': ('해', '☀️', '자연'),
    'moon': ('초승달', '🌙', '자연'), 'moon-stars': ('달과 별', '🌌', '자연'), 'star': ('별', '⭐', '자연'),
    'cloud': ('구름', '☁️', '자연'), 'cloud-rain': ('비구름', '🌧️', '자연'), 'cloud-lightning': ('천둥구름', '⛈️', '자연'),
    'cloud-snow': ('눈구름', '🌨️', '자연'), 'snowflake': ('눈송이', '❄️', '자연'), 'rainbow': ('무지개', '🌈', '자연'),
    'lightning': ('번개', '⚡', '자연'), 'fire': ('불꽃', '🔥', '자연'), 'drop': ('물방울', '💧', '자연'),
    'tornado': ('회오리', '🌪️', '자연'), 'waves': ('파도', '🌊', '자연'), 'planet': ('토성', '🪐', '자연'),
    'shooting-star': ('별똥별', '🌠', '자연'), 'meteor': ('혜성', '☄️', '자연'), 'globe-hemisphere-east': ('지구', '🌏', '자연'),
    'grains': ('벼 이삭', '🌾', '자연'),
    # 음식
    'avocado': ('아보카도', '🥑', '음식'), 'carrot': ('당근', '🥕', '음식'), 'cherries': ('체리', '🍒', '음식'),
    'orange': ('오렌지', '🍊', '음식'), 'orange-slice': ('오렌지 조각', '🍊', '음식'), 'pepper': ('고추', '🌶️', '음식'),
    'pizza': ('피자', '🍕', '음식'), 'hamburger': ('햄버거', '🍔', '음식'), 'ice-cream': ('아이스크림', '🍦', '음식'),
    'popsicle': ('아이스바', '🍡', '음식'), 'cake': ('케이크', '🎂', '음식'), 'cookie': ('쿠키', '🍪', '음식'),
    'bread': ('식빵', '🍞', '음식'), 'cheese': ('치즈', '🧀', '음식'), 'coffee': ('커피', '☕', '음식'),
    'coffee-bean': ('커피콩', '🫘', '음식'), 'beer-stein': ('맥주잔', '🍺', '음식'), 'wine': ('와인잔', '🍷', '음식'),
    'martini': ('칵테일', '🍸', '음식'), 'champagne': ('샴페인', '🍾', '음식'), 'onigiri': ('주먹밥', '🍙', '음식'),
    'popcorn': ('팝콘', '🍿', '음식'), 'bowl-steam': ('따끈한 국', '🍜', '음식'), 'cooking-pot': ('냄비', '🍲', '음식'),
    'fork-knife': ('포크와 나이프', '🍴', '음식'),
    # 탈것
    'anchor': ('닻', '⚓', '탈것'), 'airplane': ('비행기', '✈️', '탈것'), 'rocket': ('로켓', '🚀', '탈것'),
    'sailboat': ('돛단배', '⛵', '탈것'), 'boat': ('보트', '🚤', '탈것'), 'car': ('자동차', '🚗', '탈것'),
    'bus': ('버스', '🚌', '탈것'), 'bicycle': ('자전거', '🚲', '탈것'), 'motorcycle': ('오토바이', '🏍️', '탈것'),
    'train': ('기차', '🚆', '탈것'), 'tractor': ('트랙터', '🚜', '탈것'), 'truck': ('트럭', '🚚', '탈것'),
    'jeep': ('지프', '🚙', '탈것'), 'ambulance': ('구급차', '🚑', '탈것'), 'fire-truck': ('소방차', '🚒', '탈것'),
    'police-car': ('경찰차', '🚓', '탈것'), 'taxi': ('택시', '🚕', '탈것'), 'scooter': ('킥보드', '🛴', '탈것'),
    'flying-saucer': ('비행접시', '🛸', '탈것'), 'parachute': ('낙하산', '🪂', '탈것'), 'cable-car': ('케이블카', '🚡', '탈것'),
    'bulldozer': ('불도저', '🚧', '탈것'), 'crane': ('크레인', '🏗️', '탈것'), 'drone': ('드론', '🛸', '탈것'),
    # 건물·장소
    'house': ('집', '🏠', '건물'), 'castle-turret': ('성', '🏰', '건물'), 'church': ('교회', '⛪', '건물'),
    'lighthouse': ('등대', '🗼', '건물'), 'windmill': ('풍차', '🌬️', '건물'), 'barn': ('헛간', '🏚️', '건물'),
    'tent': ('텐트', '⛺', '건물'), 'tipi': ('원뿔 천막', '⛺', '건물'), 'bridge': ('다리', '🌉', '건물'),
    'city': ('도시', '🏙️', '건물'), 'factory': ('공장', '🏭', '건물'), 'storefront': ('가게', '🏪', '건물'),
    # 물건
    'umbrella': ('우산', '☂️', '물건'), 'key': ('열쇠', '🔑', '물건'), 'lock': ('자물쇠', '🔒', '물건'),
    'bell': ('종', '🔔', '물건'), 'crown': ('왕관', '👑', '물건'), 'diamond': ('다이아몬드', '💎', '물건'),
    'gift': ('선물', '🎁', '물건'), 'balloon': ('풍선', '🎈', '물건'), 'trophy': ('트로피', '🏆', '물건'),
    'medal': ('메달', '🏅', '물건'), 'lightbulb': ('전구', '💡', '물건'), 'scissors': ('가위', '✂️', '물건'),
    'hammer': ('망치', '🔨', '물건'), 'wrench': ('렌치', '🔧', '물건'), 'axe': ('도끼', '🪓', '물건'),
    'sword': ('검', '⚔️', '물건'), 'shield': ('방패', '🛡️', '물건'), 'bomb': ('폭탄', '💣', '물건'),
    'magnet': ('자석', '🧲', '물건'), 'hourglass': ('모래시계', '⏳', '물건'), 'alarm': ('자명종', '⏰', '물건'),
    'watch': ('손목시계', '⌚', '물건'), 'eyeglasses': ('안경', '👓', '물건'), 'sunglasses': ('선글라스', '🕶️', '물건'),
    'camera': ('카메라', '📷', '물건'), 'compass': ('나침반', '🧭', '물건'), 'binoculars': ('쌍안경', '🔭', '물건'),
    'flashlight': ('손전등', '🔦', '물건'), 'campfire': ('모닥불', '🏕️', '물건'), 'flag': ('깃발', '🚩', '물건'),
    'flag-checkered': ('체크 깃발', '🏁', '물건'), 'ticket': ('티켓', '🎫', '물건'), 'television': ('텔레비전', '📺', '물건'),
    'radio': ('라디오', '📻', '물건'), 'phone': ('전화기', '📞', '물건'), 'envelope': ('편지', '✉️', '물건'),
    'paper-plane': ('종이비행기', '🛩️', '물건'), 'mailbox': ('우편함', '📫', '물건'), 'bathtub': ('욕조', '🛁', '물건'),
    'bed': ('침대', '🛏️', '물건'), 'armchair': ('안락의자', '💺', '물건'), 'couch': ('소파', '🛋️', '물건'),
    'lamp': ('스탠드', '🪔', '물건'), 'door': ('문', '🚪', '물건'), 'ladder': ('사다리', '🪜', '물건'),
    'broom': ('빗자루', '🧹', '물건'), 'basket': ('바구니', '🧺', '물건'), 'shopping-cart': ('카트', '🛒', '물건'),
    'yarn': ('털실', '🧶', '물건'), 'piggy-bank': ('돼지 저금통', '🐷', '물건'), 'treasure-chest': ('보물상자', '💰', '물건'),
    'coin': ('동전', '🪙', '물건'), 'traffic-cone': ('고깔', '🚧', '물건'), 'traffic-signal': ('신호등', '🚦', '물건'),
    'gas-pump': ('주유기', '⛽', '물건'), 'fire-extinguisher': ('소화기', '🧯', '물건'), 'lifebuoy': ('구명튜브', '🛟', '물건'),
    'book': ('책', '📖', '물건'), 'pencil': ('연필', '✏️', '물건'), 'paint-brush': ('붓', '🖌️', '물건'),
    'palette': ('팔레트', '🎨', '물건'), 'backpack': ('배낭', '🎒', '물건'), 'suitcase': ('여행가방', '🧳', '물건'),
    'handbag': ('핸드백', '👜', '물건'), 'atom': ('원자', '⚛️', '물건'), 'dna': ('DNA', '🧬', '물건'),
    'flask': ('플라스크', '⚗️', '물건'), 'microscope': ('현미경', '🔬', '물건'), 'test-tube': ('시험관', '🧪', '물건'),
    # 옷
    't-shirt': ('티셔츠', '👕', '옷'), 'dress': ('원피스', '👗', '옷'), 'boot': ('부츠', '👢', '옷'),
    'sneaker': ('운동화', '👟', '옷'), 'high-heel': ('하이힐', '👠', '옷'), 'baseball-cap': ('야구모자', '🧢', '옷'),
    'cowboy-hat': ('카우보이 모자', '🤠', '옷'), 'chef-hat': ('요리사 모자', '👨‍🍳', '옷'), 'graduation-cap': ('학사모', '🎓', '옷'),
    'hoodie': ('후드티', '🧥', '옷'), 'sock': ('양말', '🧦', '옷'), 'pants': ('바지', '👖', '옷'),
    # 놀이·음악·스포츠
    'guitar': ('기타', '🎸', '놀이'), 'piano-keys': ('피아노 건반', '🎹', '놀이'), 'music-note': ('음표', '🎵', '놀이'),
    'music-notes': ('음표 두 개', '🎶', '놀이'), 'headphones': ('헤드폰', '🎧', '놀이'), 'microphone': ('마이크', '🎤', '놀이'),
    'puzzle-piece': ('퍼즐 조각', '🧩', '놀이'), 'game-controller': ('게임패드', '🎮', '놀이'), 'dice-five': ('주사위', '🎲', '놀이'),
    'spade': ('스페이드', '♠️', '놀이'), 'club': ('클로버 무늬', '♣️', '놀이'), 'heart': ('하트', '❤️', '놀이'),
    'ghost': ('유령', '👻', '놀이'), 'skull': ('해골', '💀', '놀이'), 'alien': ('외계인', '👽', '놀이'),
    'robot': ('로봇', '🤖', '놀이'), 'smiley': ('웃는 얼굴', '😊', '놀이'), 'smiley-wink': ('윙크', '😉', '놀이'),
    'mask-happy': ('가면', '🎭', '놀이'), 'joystick': ('조이스틱', '🕹️', '놀이'), 'cassette-tape': ('카세트테이프', '📼', '놀이'),
    'vinyl-record': ('레코드판', '💿', '놀이'), 'disco-ball': ('미러볼', '🪩', '놀이'), 'confetti': ('폭죽', '🎉', '놀이'),
    'pinwheel': ('바람개비', '🎐', '놀이'), 'beach-ball': ('비치볼', '🏖️', '놀이'), 'film-slate': ('슬레이트', '🎬', '놀이'),
    'soccer-ball': ('축구공', '⚽', '놀이'), 'basketball': ('농구공', '🏀', '놀이'), 'baseball': ('야구공', '⚾', '놀이'),
    'football': ('럭비공', '🏈', '놀이'), 'tennis-ball': ('테니스공', '🎾', '놀이'), 'volleyball': ('배구공', '🏐', '놀이'),
    'bowling-ball': ('볼링공', '🎳', '놀이'), 'golf': ('골프', '⛳', '놀이'), 'boxing-glove': ('권투 장갑', '🥊', '놀이'),
    'barbell': ('역기', '🏋️', '놀이'), 'ping-pong': ('탁구', '🏓', '놀이'),
    # 사람·몸
    'hand-peace': ('브이', '✌️', '사람'), 'thumbs-up': ('좋아요', '👍', '사람'), 'hand-waving': ('손인사', '👋', '사람'),
    'footprints': ('발자국', '👣', '사람'), 'person-simple-run': ('달리기', '🏃', '사람'),
    'person-simple-swim': ('수영', '🏊', '사람'), 'person-simple-ski': ('스키', '⛷️', '사람'),
    'person-simple-bike': ('자전거 타기', '🚴', '사람'), 'baby': ('아기', '👶', '사람'), 'eye': ('눈', '👁️', '사람'),
    'ear': ('귀', '👂', '사람'), 'tooth': ('이', '🦷', '사람'), 'brain': ('뇌', '🧠', '사람'),
    'yin-yang': ('음양', '☯️', '사람'), 'infinity': ('무한대', '♾️', '사람'), 'peace': ('평화', '☮️', '사람'),
}


def load_checker():
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('nono_import', os.path.join(here, 'nono-import.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def ensure_icons():
    """Phosphor 아이콘 패키지를 한 번 내려받아 _incoming/icons 에 풀어 둔다 (git 제외 폴더)."""
    base = os.path.join(CACHE, f'phosphor-{PHOSPHOR_VER}')
    fill_dir = os.path.join(base, 'fill')
    if os.path.isdir(fill_dir) and len(os.listdir(fill_dir)) > 1000:
        return base
    os.makedirs(base, exist_ok=True)
    print(f'아이콘 내려받는 중: {PHOSPHOR_URL}')
    data = urllib.request.urlopen(PHOSPHOR_URL, timeout=60).read()
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tf:
        for m in tf.getmembers():
            mm = re.match(r'package/assets/(fill|bold)/(.+\.svg)$', m.name)
            if mm and m.isfile():
                d = os.path.join(base, mm.group(1))
                os.makedirs(d, exist_ok=True)
                with open(os.path.join(d, mm.group(2)), 'wb') as fp:
                    fp.write(tf.extractfile(m).read())
            elif m.name == 'package/LICENSE' and m.isfile():
                with open(os.path.join(base, 'LICENSE'), 'wb') as fp:
                    fp.write(tf.extractfile(m).read())
    return base


_RENDER_CACHE = {}


def coverage_map(svg_path, n):
    """아이콘을 N x N 칸으로 나눴을 때 칸마다 칠해진 비율(0~1)."""
    key = (svg_path, n)
    if key in _RENDER_CACHE:
        return _RENDER_CACHE[key]
    import resvg_py
    from PIL import Image
    png = resvg_py.svg_to_bytes(svg_path=svg_path, width=480, height=480, background='#ffffff')
    im = Image.open(io.BytesIO(bytes(png))).convert('L')
    bb = Image.eval(im, lambda v: 255 - v).getbbox()
    if not bb:
        _RENDER_CACHE[key] = None
        return None
    im = im.crop(bb).point(lambda v: 0 if v < 128 else 255)
    w, h = im.size
    s = max(w, h)
    sq = Image.new('L', (s, s), 255)
    sq.paste(im, ((s - w) // 2, (s - h) // 2))
    small = sq.resize((n, n), Image.BOX)           # 칸 평균 밝기
    px = small.load()
    cov = [[1 - px[c, r] / 255 for c in range(n)] for r in range(n)]
    _RENDER_CACHE[key] = cov
    return cov


def render_grid(svg_path, n, cov):
    m = coverage_map(svg_path, n)
    if m is None:
        return None
    return [''.join('#' if v >= cov else '.' for v in row) for row in m]


def empty_lines(rows):
    n = len(rows)
    er = sum(1 for r in rows if '#' not in r)
    ec = sum(1 for j in range(n) if all(r[j] == '.' for r in rows))
    return er + ec


def score(rows):
    """0에 가까울수록 좋은 도안. 칠함 비율 45% 근처, 빈 줄 적고, 구멍(내부 디테일)이 있을수록 좋다."""
    n = len(rows)
    fill = sum(r.count('#') for r in rows) / (n * n)
    runs = sum(len([x for x in r.split('.') if x]) for r in rows)
    runs += sum(len([x for x in ''.join(r[j] for r in rows).split('.') if x]) for j in range(n))
    detail = runs / (2 * n)                    # 줄당 평균 덩어리 수
    return abs(fill - 0.45) * 3 + empty_lines(rows) / n + max(0, 1.6 - detail)


def load_used():
    if not os.path.exists(USED_FILE):
        return set()
    with open(USED_FILE, encoding='utf-8') as fp:
        return {l.strip() for l in fp if l.strip()}


def existing_names():
    p = os.path.join(ROOT, 'nono-art.js')
    if not os.path.exists(p):
        return set()
    with open(p, encoding='utf-8') as fp:
        return set(re.findall(r"n\s*:\s*['\"]([^'\"]+)['\"]", fp.read()))


def cmd_make(args):
    ni = load_checker()
    base = ensure_icons()
    n = args.size
    used = load_used()
    names_taken = set() if args.allow_dup_names else existing_names()
    cands = []
    for icon, (ko, emo, theme) in ICONS.items():
        if args.theme and theme != args.theme:
            continue
        if icon in used or ko in names_taken:
            continue
        for style in (['fill', 'bold'] if args.bold else ['fill']):
            path = os.path.join(base, style, f'{icon}-{style}.svg')
            if not os.path.exists(path):
                continue
            best = None
            for cov in (0.5, 0.42, 0.58, 0.35, 0.65):
                rows = render_grid(path, n, cov)
                if not rows:
                    continue
                fill = sum(r.count('#') for r in rows) / (n * n)
                if not (0.22 <= fill <= 0.72):
                    continue
                if empty_lines(rows) > n * 0.35:
                    continue
                st, _ = ni.check(rows)
                if st != 'ok':
                    continue
                sc = score(rows)
                if best is None or sc < best[0]:
                    best = (sc, rows, cov)
            if best:
                cands.append({'icon': icon, 'style': style, 'name': ko, 'emoji': emo, 'theme': theme,
                              's': n, 'rows': best[1], 'score': round(best[0], 3)})
    cands.sort(key=lambda c: c['score'])
    cands = cands[:args.count]
    os.makedirs(INCOMING, exist_ok=True)
    out = os.path.join(INCOMING, f'cand-{n}.json')
    with open(out, 'w', encoding='utf-8') as fp:
        json.dump(cands, fp, ensure_ascii=False, indent=1)
    for i, c in enumerate(cands, 1):
        fill = sum(r.count('#') for r in c['rows'])
        print(f"\n[{i}] {c['emoji']} {c['name']} ({c['icon']}{'' if c['style']=='fill' else ', 윤곽'})  칠함 {fill}/{n*n}")
        print(ni.preview(c['rows']))
    print(f'\n후보 {len(cands)}개 저장: {out}')
    print(f'고르기: python tools/nono-from-icons.py pick {n} 1,2,3')


def cmd_pick(args):
    n = args.size
    p = os.path.join(INCOMING, f'cand-{n}.json')
    with open(p, encoding='utf-8') as fp:
        cands = json.load(fp)
    idx = [int(x) for x in re.split(r'[,\s]+', args.numbers.strip()) if x]
    chosen = [cands[i - 1] for i in idx if 1 <= i <= len(cands)]
    with open(USED_FILE, 'a', encoding='utf-8') as fp:
        for c in chosen:
            fp.write(c['icon'] + '\n')
    print('nono-art.js 항목:')
    for c in chosen:
        rows = ', '.join(f"'{r}'" for r in c['rows'])
        print(f"  {{ n:'{c['name']}', e:'{c['emoji']}', s:{c['s']}, r:[{rows}] }},")


def cmd_themes(args):
    from collections import Counter
    cnt = Counter(t for _, _, t in ICONS.values())
    used = load_used()
    for t, k in cnt.items():
        left = sum(1 for ic, (_, _, tt) in ICONS.items() if tt == t and ic not in used)
        print(f'{t}: {k}개 (남은 {left})')


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    m = sub.add_parser('make'); m.add_argument('size', type=int)
    m.add_argument('--count', type=int, default=12)
    m.add_argument('--theme', help='동물/자연/음식/탈것/건물/물건/옷/놀이/사람')
    m.add_argument('--bold', action='store_true', help='윤곽선(bold) 스타일도 후보에 포함')
    m.add_argument('--allow-dup-names', action='store_true', help='nono-art.js에 이미 있는 이름도 허용')
    p = sub.add_parser('pick'); p.add_argument('size', type=int); p.add_argument('numbers')
    sub.add_parser('themes')
    args = ap.parse_args()
    {'make': cmd_make, 'pick': cmd_pick, 'themes': cmd_themes}[args.cmd](args)


if __name__ == '__main__':
    main()
