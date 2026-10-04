# Sinh js/data/bank-listening.js:
#   LISTENING_BANK     — đề đủ 4 section (40 câu)
#   LISTENING_SECTIONS — từng section lẻ (10 câu): audio của section + các trang PDF của section,
#                        có tiêu đề (chủ đề bài nghe), gộp các section trùng nhau giữa các đề
# Nguồn: "2. LISTENING" (Forecast, Dự đoán) + VOL 8, VOL 9 ORIGINAL EXAMS (file đề/audio đã chuyển vào "_web")
import os, re, json, fnmatch, unicodedata, subprocess, sys
import parse_reading as PR
from listening_keys import KEYS

SP = os.path.dirname(os.path.abspath(__file__))
ROOT = r'C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING'
PROJ = os.path.dirname(SP)
IDX = {unicodedata.normalize('NFC', r['rel']): r for r in json.load(open(os.path.join(SP, 'ls', 'index.json'), encoding='utf8'))}
nfc = lambda s: unicodedata.normalize('NFC', s)


def find(folder, pattern):
    d = os.path.join(ROOT, folder)
    hits = sorted(f for f in os.listdir(d) if fnmatch.fnmatch(nfc(f).lower(), nfc(pattern).lower()))
    if len(hits) != 1: raise SystemExit(f'{folder}/{pattern}: {hits}')
    return nfc(f'{folder}/{hits[0]}')


def text_of(rel):
    rel = nfc(rel)
    if rel.startswith('_web/'):
        return subprocess.run(['pdftotext', '-layout', os.path.join(ROOT, rel), '-'], capture_output=True).stdout.decode('utf8', 'replace')
    return open(os.path.join(SP, 'ls', IDX[rel]['txt']), encoding='utf8').read()


def web(name):
    if not os.path.exists(os.path.join(ROOT, '_web', name)) and '--dry' not in sys.argv: raise SystemExit(f'missing _web/{name}')
    return f'_web/{name}'


FC = 'FORECAST'
DD = 'file extra listening/DỰ ĐOÁN'
DDPDF = f'{DD}/IELTS LISTENING 2023.pdf'
DD_PAGES = {1: (1, 6), 2: (7, 11), 3: (12, 18), 4: (19, 24)}


def audios(folder, *patterns):
    return [find(folder, p) for p in patterns]


def parts(tid):
    return [web(f'{tid}-p{i}.m4a') for i in range(1, 5)]


TESTS = [
    ('forecast-01', 'Forecast', 'Test 1', find(f'{FC}/TEST 1', 'Test 1.pdf'), None, audios(f'{FC}/TEST 1', 'P1 *.mp3', 'P2 *.mp3', 'P3 *.mp3', 'P4 *.mp3')),
    ('forecast-02', 'Forecast', 'Test 2', web('forecast-02-paper.pdf'), None, audios(f'{FC}/TEST 2', 'p1-*.mp3', 's2 *.mp3', 's3 *.mp3', 's4 *.mp3')),
    ('forecast-03', 'Forecast', 'Test 3', find(f'{FC}/TEST 3', 'Test 3.pdf'), None, audios(f'{FC}/TEST 3', 'P1 *.mp3', 'P2 *.mp3', 'PART 3 *.mp3', 'P4 *.mp3')),
    ('forecast-04', 'Forecast', 'Test 4', web('forecast-04-paper.pdf'), None, audios(f'{FC}/TEST 4', 's1 *.mp3', 's2 *.mp3', 's3 *.mp3', 's4 *.mp3')),
    ('forecast-05', 'Forecast', 'Test 5', find(f'{FC}/TEST 5', 'Test 5.pdf'), None, audios(f'{FC}/TEST 5', 's1 *.mp3', 's2 *.mp3', 's3 *.mp3', 's4 *.mp3')),
    ('forecast-06', 'Forecast', 'Test 6', find(f'{FC}/TEST 6', 'Test 6.pdf'), None, audios(f'{FC}/TEST 6', 's1 *.mp3', 's2 *.mp3', 's3*.mp3', 's4*.mp3')),
    ('forecast-07', 'Forecast', 'Test 7', find(f'{FC}/TEST 7', 'Test 7.pdf'), None, audios(f'{FC}/TEST 7', 's1 *.mp3', '2 skiing.mp3', 's3 *.mp3', 's4 *.m4a')),
    ('forecast-08', 'Forecast', 'Test 8', find(f'{FC}/TEST 8', '*KEY*.pdf'), (1, 6), [web('forecast-08-p1.m4a')] + audios(f'{FC}/TEST 8', 'Part 2 *.mp3', 'Part 3 *.mp3', 'PART 4 *.mp3')),
    ('forecast-09', 'Forecast', 'Test 9', find(f'{FC}/TEST 9', 'Test 9.pdf'), None, audios(f'{FC}/TEST 9', 'Part 1 *.mp3', 'Part 2.mp3', 'Tourism*.mp3', 'Working*.mp3')),
    ('forecast-10', 'Forecast', 'Test 10', find(f'{FC}/TEST 10', '*.pdf'), (1, 7), audios(f'{FC}/TEST 10', 'PART 1 *.mp3', 'PART 2 *.mp3', 'PART 3 *.mp3', 'PART 4 *.mp3')),
    ('forecast-11', 'Forecast', 'Test 11', web('forecast-11-paper.pdf'), None, audios(f'{FC}/TEST 11', 'P1.mp3', 'P2.mp3', 'P3.mp3', 'P4.mp3')),
    ('forecast-12', 'Forecast', 'Test 12', web('forecast-12-paper.pdf'), None, audios(f'{FC}/TEST 12', 's1.mp3', 's2.mp3', 'Part 3.mp3', 'Part 4.mp3')),
    ('forecast-13', 'Forecast', 'Test 13', find(f'{FC}/TEST 13', '*.pdf'), None, audios(f'{FC}/TEST 13', '1.mp3', '2.mp3', '3.mp3', '4.mp3')),
    ('forecast-14', 'Forecast', 'Test 14', find(f'{FC}/TEST 14', '*.pdf'), None, parts('forecast-14')),
    ('forecast-15', 'Forecast', 'Test 15', find(f'{FC}/TEST 15', '*.pdf'), None, parts('forecast-15')),
    ('forecast-16', 'Forecast', 'Test 16', web('forecast-16-paper.pdf'), None, audios(f'{FC}/TEST 16', 'P1.mp3', 'P2.mp3', 'P3.mp3', 'P4.mp3')),
    ('forecast-17', 'Forecast', 'Test 17', find(f'{FC}/TEST 17', '*.pdf'), None, audios(f'{FC}/TEST 17', '01 *.mp3', 'audio 2.mp3', 'audio 3.mp3') + [web('forecast-17-p4.m4a')]),
    ('forecast-18', 'Forecast', 'Test 18', find(f'{FC}/TEST 18', '*.pdf'), None, audios(f'{FC}/TEST 18', 'Part 1.mp3', 'Part 2.mp3', 'Part 3.mp3', 'Part 4.mp3')),
    ('forecast-19', 'Forecast', 'Test 19', web('forecast-19-paper.pdf'), None, audios(f'{FC}/TEST 19', '*task1.mp3') + [web('forecast-19-p2.m4a'), web('forecast-19-p3.m4a'), web('forecast-19-p4.m4a')]),
] + [
    (f'dudoan-{n:02d}', 'Dự đoán 2023', f'Test {n}', DDPDF, DD_PAGES[n], audios(f'{DD}/Audio/TEST {n}', '*01*.mp3', '*02*.mp3', '*03*.mp3', '*04*.mp3'))
    for n in (1, 2, 3, 4)
] + [
    (f'vol{v}-{n:02d}', f'Actual Test Vol {v}', f'Test {n}', web(f'vol{v}-{n:02d}-paper.pdf'), None, parts(f'vol{v}-{n:02d}'))
    for v in (8, 9) for n in range(1, 9)
]


# ---------------- Đáp án VOL 8/9 (tools/ls/vol.json từ dump_vol.py) -> cùng định dạng listening_keys ----------------
def vol_answer(a):
    a = re.sub(r'\s+', ' ', a.replace('\u00a0', ' ')).strip()
    if re.fullmatch(r'[A-L](\s*(,|and|&)\s*[A-L])+', a):             # "A, D" = Choose TWO
        return ','.join(sorted(re.findall(r'[A-L]', a)))
    m = re.match(r'^([A-L])\s+[A-Za-z\'"(]', a)                         # "E Head's office" = chữ cái + lời giải
    if m and not re.match(r'^(A|I)\s+[a-z]', a): return m.group(1)
    alts = [x.strip() for x in re.split(r'(?<!\d),(?!\d{3})|\s+/\s+', a) if x.strip()]
    return ' / '.join(dict.fromkeys(alts))


VOLKEYS = {tid: {int(k): vol_answer(v) for k, v in rec['key'].items()} for tid, rec in
           json.load(open(os.path.join(SP, 'ls', 'vol.json'), encoding='utf8')).items()}
ALLKEYS = {**KEYS, **VOLKEYS}

KEY_INSIDE = {'forecast-08', 'forecast-10'}   # đề dùng chung file với trang đáp án

IS_LETTER = re.compile(r'^[A-L](,[A-L])*$')
KEY_PAGE = re.compile(r'(?m)^\s*\d{1,2}[.)]?\s+\S.*\s{2,}\d{1,2}[.)]?\s+\S')


def build(tid, set_, title, paper, pages, auds):
    key = dict(ALLKEYS[tid])
    assert sorted(key) == list(range(1, 41)), (tid, sorted(set(range(1, 41)) - set(key)))
    full = text_of(paper)
    pg = full.split('\f')
    t = '\f'.join(pg[pages[0] - 1:pages[1]]) if pages else full
    warns = []
    last = t.split('\f')[-1] if '\f' in t else t[-1500:]
    if len(KEY_PAGE.findall(last)) >= 8: warns.append('paper may include the answer key on its last page')
    groups_pdf = [g for g in PR.pdf_groups(t) if 1 <= g[0] <= g[1] <= 40]
    kind_of, instr_of, gid = {}, {}, {}
    for a, b, k, ins in sorted(groups_pdf, key=lambda g: (g[1] - g[0])):
        for n in range(a, b + 1):
            if n not in kind_of: kind_of[n] = k; instr_of[n] = ins; gid[n] = (a, b)
    for q in range(1, 41):
        m = re.match(r'^([A-L])\s*[.)]?\s+\S', key[q])
        if m and kind_of.get(q) in ('letter', 'multi'): key[q] = m.group(1)
    n = 1
    while n <= 40:
        if kind_of.get(n) == 'multi' and IS_LETTER.match(key[n]) and ',' not in key[n]:
            pick = 3 if re.search(r'CHOOSE\s+THREE', instr_of.get(n, '').upper()) else 2
            chunk = [q for q in range(n, n + pick) if q <= 40 and kind_of.get(q) == 'multi' and gid.get(q) == gid.get(n)]
            if len(chunk) == pick:
                s_ = ','.join(sorted({key[q] for q in chunk}))
                for q in chunk: key[q] = s_
                n += pick; continue
        n += 1
    final = {}
    for n in range(1, 41):
        a = key[n]; letter = bool(IS_LETTER.match(a))
        pk = kind_of.get(n)
        if ',' in a and letter: k = 'multi'
        elif pk in ('letter', 'multi') and letter: k = 'letter' if pk == 'multi' else pk
        elif pk == 'gap' and not letter: k = 'gap'
        else:
            k = 'letter' if letter else 'gap'
            if pk in ('letter', 'multi', 'gap'): warns.append(f'Q{n}: paper says {pk}, key "{a}"')
        final[n] = k
    groups, n = [], 1
    while n <= 40:
        k, g0 = final[n], gid.get(n)
        m = n
        # nhóm không vượt qua ranh giới section (10, 20, 30)
        while m + 1 <= 40 and m % 10 != 0 and final[m + 1] == k and gid.get(m + 1) == g0 and (k != 'multi' or key[m + 1] == key[n]):
            m += 1
        g = {'from': n, 'to': m, 'kind': k}
        if k in ('letter', 'multi'):
            ins = instr_of.get(n, '')
            mm = re.search(r'\b([A-L])\s*' + PR.DASH + r'\s*([A-L])\b', ins) or re.search(r'\b([A-L])(?:\s*,\s*[A-L])*,?\s+(?:or|and)\s+([A-L])\b', ins)
            hi = max(c for q in range(n, m + 1) for c in key[q].split(','))
            rng = ('A' + mm.group(2)) if mm else 'A' + max(hi, 'C')
            if hi > rng[1]: rng = 'A' + hi
            g['letters'] = rng
        groups.append(g)
        n = m + 1
    files = [{'src': paper, 'path': f'bank/listening/{tid}/paper.pdf', 'type': 'pdf', 'label': 'PDF'}]
    if pages: files[0]['pages'] = list(pages)
    if tid in KEY_INSIDE: files[0]['keyInside'] = True   # file đề có trang đáp án ở cuối -> không cho mở cả file
    for i, a in enumerate(auds, 1):
        ext = a.rsplit('.', 1)[-1].lower()
        label = 'Full test' if len(auds) == 1 else f'Part {i}'
        files.append({'src': a, 'path': f'bank/listening/{tid}/audio-{i}.{ext}', 'type': 'audio', 'label': label})
    kout = {q: [x.strip() for x in key[q].split(' / ')] for q in range(1, 41)}
    item = {'id': tid, 'set': set_, 'title': title, 'files': files, 'groups': groups, 'key': kout}
    return item, warns, pg, pages


# ---------------- Section: trang PDF + tiêu đề ----------------
HEAD = lambda s: re.compile(rf'(?im)^\W*(?:SECTION|PART)\s*{s}\b|Questions?\s+{(s - 1) * 10 + 1}\s*(?:{PR.DASH}|to|and)')


def section_pages(pg, pages):
    """Trang (đánh số trong file) của từng section; None nếu không xác định được (đề là ảnh scan)."""
    lo, hi = (pages or (1, len(pg)))[0], (pages or (1, len(pg)))[1]
    lo, hi = max(1, lo), min(hi, len(pg))
    start = {}
    for s in range(1, 5):
        for p in range(lo, hi + 1):
            if HEAD(s).search(pg[p - 1]): start[s] = p; break
    if 1 not in start and len(start) >= 1: start[1] = lo
    out = {}
    for s in range(1, 5):
        if s not in start: out[s] = None; continue
        nxt = next((start[x] for x in range(s + 1, 5) if x in start), hi + 1)
        end = nxt - 1
        if nxt <= hi:
            m = HEAD(s + 1).search(pg[nxt - 1]) if s < 4 else None
            if m and len(pg[nxt - 1][:m.start()].strip()) > 150: end = nxt   # section còn dở trên trang sau
        out[s] = [start[s], max(start[s], end)]
    # trang không đọc được chữ -> không chắc chắn, hiện cả đề
    for s, r in out.items():
        if r and all(len(pg[p - 1].split()) < 15 for p in range(r[0], r[1] + 1)): out[s] = None
    return out


SKIP = re.compile(r'^(complete|write|choose|answer|label|questions?|section|part|example|test|ielts|listening|match|what|which|who|when|where|why|how|nb|you|look|list|circle|notes?|for each|version|page|comments?|statements?|name|names|options?|people|features|reasons?|advantages?|disadvantages?|places?|children|study|table|map|plan|date|time|cost|type|details?|issues|advice|attractions|timing|present|theorists|problems?|\(|[A-L]\b|[a-l][).]\s)', re.I)


def title_from_text(chunk):
    for line in chunk.split('\n'):
        l = re.sub(r'\s{2,}.*$', '', line.strip()).strip(' :-–•�')   # cột đầu của bảng
        if not l or SKIP.match(l): continue
        if re.search(r'\.{3}|…|_{3}|\?|\d{1,2}\s*\.{2}|^\d', l): continue
        w = l.split()
        if not (1 <= len(w) <= 9) or len(l) > 70: continue
        if sum(1 for x in w if x[:1].isupper()) < max(1, len(w) // 2): continue
        return l
    return None


def title_from_audio(src):
    if src.startswith('_web/'): return None      # file do máy cắt/chuyển đổi, tên không mang nghĩa
    name = os.path.splitext(src.split('/')[-1])[0]
    name = re.sub(r'^(?:p|s|part|section|task)?\s*\d+\s*[-_ ]\s*', '', name, flags=re.I).strip()
    name = name.replace('-', ' ') if name.count('-') >= 2 else name
    if len(name.split()) < 2 or re.fullmatch(r'(audio|track|part|section|test).*', name, re.I): return None
    return name[:1].upper() + name[1:]


TITLE_OVERRIDES = json.load(open(os.path.join(SP, 'section_titles.json'), encoding='utf8')) if os.path.exists(os.path.join(SP, 'section_titles.json')) else {}


def section_items(item, pg, pages):
    out = []
    audios = [f for f in item['files'] if f['type'] == 'audio']
    if len(audios) != 4: return out
    sp = section_pages(pg, pages)
    for s in range(1, 5):
        q0, q1 = (s - 1) * 10 + 1, s * 10
        groups = [dict(g, **{'from': max(g['from'], q0), 'to': min(g['to'], q1)}) for g in item['groups'] if g['from'] <= q1 and g['to'] >= q0]
        pdf = dict(item['files'][0])
        if sp[s]: pdf['pages'] = sp[s]
        elif pages: pdf['pages'] = list(pages)
        chunk = '\f'.join(pg[p - 1] for p in range(sp[s][0], sp[s][1] + 1)) if sp[s] else ''
        if chunk:
            m = HEAD(s).search(chunk); chunk = chunk[m.end():] if m else chunk
            if s < 4:
                m2 = HEAD(s + 1).search(chunk); chunk = chunk[:m2.start()] if m2 else chunk
        sid = f"{item['id']}-s{s}"
        title = TITLE_OVERRIDES.get(sid) or title_from_audio(audios[s - 1]['src']) or title_from_text(chunk) or ''
        out.append({'_chunk': chunk, 'id': sid, 'test': item['id'], 'set': item['set'], 'testTitle': item['title'], 'section': s, 'title': title,
                    'files': [pdf, dict(audios[s - 1], label=f'Section {s}')], 'groups': groups,
                    'key': {q: item['key'][q] for q in range(q0, q1 + 1)}})
    return out


def main():
    tests, sections, report = [], [], []
    for spec in TESTS:
        item, warns, pg, pages = build(*spec)
        tests.append(item)
        sections += section_items(item, pg, pages)
        report += [(item['id'], w) for w in warns]
        for w in warns: print('  !', item['id'], w)
    # gộp section trùng (cùng đáp án = cùng bài nghe), giữ bản đầu tiên, ghi "có trong" các đề khác
    def same(a, b):   # cùng section và mọi câu có ít nhất một đáp án chung
        return a['section'] == b['section'] and all({x.lower() for x in a['key'][q]} & {x.lower() for x in b['key'][q]} for q in a['key'])
    seen, uniq = {}, []
    for s in sections:
        sig = next((k for k, v in seen.items() if same(v, s)), None) or s['id']
        if sig in seen:
            old = seen[sig]
            if 'pages' not in old['files'][0] and 'pages' in s['files'][0]:
                # giữ bản có chia trang PDF rõ ràng, bản cũ chuyển thành "có trong"
                keep_title = old['title'] or s['title']
                also = old.get('alsoIn', []) + [f"{old['set']} · {old['testTitle']}"]
                old.clear(); old.update(s, title=keep_title, alsoIn=also)
            else:
                old.setdefault('alsoIn', []).append(f"{s['set']} · {s['testTitle']}")
                if not old['title'] and s['title']: old['title'] = s['title']
            continue
        seen[sig] = s; uniq.append(s)
    chunks = {s['id']: s.pop('_chunk') for s in sections}
    for s in uniq:
        s['_chunk'] = chunks[s['id']] if '--chunks' in sys.argv else ''
        if '--chunks' not in sys.argv: s.pop('_chunk')
        if s['title'].isupper(): s['title'] = s['title'].capitalize()
        if not s['title']: s['title'] = f"{s['set']} {s['testTitle']} — Section {s['section']}"
    hdr = ['// =====================================================================',
           '//  NGÂN HÀNG ĐỀ LISTENING — sinh tự động bởi tools/gen_listening.py',
           '//  LISTENING_BANK: đề đủ 40 câu · LISTENING_SECTIONS: từng section (10 câu)',
           '//  File đề/audio: Firebase Storage bank/listening/<id>/… (tải lên ở Ngân hàng đề → Tải file đề lên).',
           '// =====================================================================']
    js = hdr + ['export const LISTENING_BANK = ['] + ['  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) + ',' for x in tests] + ['];', '']
    js += ['export const LISTENING_SECTIONS = ['] + ['  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) + ',' for x in uniq] + ['];']
    # --dry: không kiểm tra file audio đã cắt; --out <thư mục web>: ghi ra bản khác (dùng khi thử)
    dest = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else (None if '--dry' in sys.argv else PROJ)
    if dest:
        open(os.path.join(dest, 'js', 'data', 'bank-listening.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(js) + '\n')
    json.dump(report, open(os.path.join(SP, 'ls', 'warnings.json'), 'w', encoding='utf8'), ensure_ascii=False)
    print(f'{len(tests)} tests, {len(sections)} sections -> {len(uniq)} unique')
    if '--chunks' in sys.argv:
        for s in uniq:
            if s['id'] in TITLE_OVERRIDES: continue
            print('=====', s['id'], '|', s['title']); print(re.sub(r'\s+', ' ', s.pop('_chunk', ''))[:420])
    if '--titles' in sys.argv:
        for s in uniq:
            print(f"{s['id']:<16} S{s['section']} p{s['files'][0].get('pages')} | {s['title']}" + (f"   (+{', '.join(s['alsoIn'])})" if s.get('alsoIn') else ''))


if __name__ == '__main__':
    main()
