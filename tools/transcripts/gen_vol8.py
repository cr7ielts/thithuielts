# Đưa Reading VOL 8 (Test 1-8 × 3 passage) vào ngân hàng đề.
#   python gen_vol8.py           # xem thử báo cáo
#   python gen_vol8.py --save    # ghi js/data/bank-vol8.js + txt/<id>.txt
# Đề là PDF có chữ; đáp án nằm trong Key.pdf dạng ảnh nên phải OCR trước (xem tools/ocr_key8.py).
import json, os, re, sys, unicodedata
import parse_reading as P
import vol8

SP = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(SP)
SETNAME = 'Actual Test Vol 8'
ROMANS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv']
TFNG, YNNG = {'TRUE', 'FALSE', 'NOT GIVEN'}, {'YES', 'NO', 'NOT GIVEN'}
flat = lambda s: re.sub(r'[\s\-–—]', '', s.lower())


def slug(s):
    s = unicodedata.normalize('NFKD', s.lower()).replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


def norm(v):
    """chuẩn hoá đáp án OCR: 'Passage A' -> A. Không đụng tới T/F/Y/N vì dễ lẫn
    với đáp án chữ cái A-L; việc đó để refine_key() làm khi đã biết dạng câu hỏi."""
    v = v.strip().strip('.')
    m = re.match(r'(?i)^(?:passage|paragraph|section)\s+([A-L])$', v)
    if m: return m.group(1).upper()
    if v.upper() in ('NG', 'N/G'): return 'NOT GIVEN'
    if re.fullmatch(r'[A-L]', v.upper()): return v.upper()
    if v.upper() in TFNG | YNNG: return v.upper()
    return v


SHORT_TFNG = {'T': 'TRUE', 'F': 'FALSE', 'NG': 'NOT GIVEN'}
SHORT_YNNG = {'Y': 'YES', 'N': 'NO', 'NG': 'NOT GIVEN'}


# vài chữ OCR hay đọc nhầm, chỉ sửa khi dạng câu hỏi đã rõ
OCR_LETTER = {'1': 'I', '|': 'I', '0': 'O'}
OCR_ROMAN = {'m': 'iii', 'rn': 'm', 'w': 'vi', 'l': 'i'}


def refine_key(groups, key):
    """Biết dạng câu hỏi rồi mới dám hiểu T/F/Y/N là TRUE/FALSE/YES/NO,
    và mới dám sửa mấy chữ OCR đọc nhầm ('m' là iii, '1' là I…).
    Sửa xong vẫn phải qua check(): sai dải chữ cái hay không có trong khung
    đáp án là bài bị loại, nên không sợ đoán bừa lọt lưới."""
    for g in groups:
        for n in range(g['from'], g['to'] + 1):
            v = key.get(n)
            if not v: continue
            if g['kind'] in ('tfng', 'ynng'):
                table = SHORT_TFNG if g['kind'] == 'tfng' else SHORT_YNNG
                if v.upper() in table: key[n] = table[v.upper()]
            elif g['kind'] in ('letter', 'multi') and v in OCR_LETTER: key[n] = OCR_LETTER[v]
            elif g['kind'] == 'heading' and v.lower() in OCR_ROMAN: key[n] = OCR_ROMAN[v.lower()]
    return key


def group_dict(a, b, kind, instr, hmax):
    g = {'from': a, 'to': b, 'kind': kind}
    if kind in ('letter', 'multi'):
        m = re.search(r'\b([A-L])\s*' + P.DASH + r'\s*([A-L])\b', instr)
        m3 = re.search(r'\b([A-L])(?:\s*,\s*[A-L])*,?\s+(?:or|and)\s+([A-L])\b', instr)
        g['letters'] = (m.group(1) + m.group(2)) if m else (m3.group(1) + m3.group(2)) if m3 else 'AH'
        if kind == 'multi':
            m2 = re.search(r'CHOOSE (TWO|THREE|2|3)', instr.upper())
            g['pick'] = {'TWO': 2, '2': 2, 'THREE': 3, '3': 3}[m2.group(1)] if m2 else b - a + 1
    if kind == 'heading': g['max'] = max(hmax, 5)
    return g


def refine(groups, key):
    for g in groups:
        if g['kind'] != 'other': continue
        vals = [key[n] for n in range(g['from'], g['to'] + 1) if n in key]
        if not vals: continue
        up = [v.upper() for v in vals]
        tf = TFNG | {'T', 'F', 'NG'}
        yn = YNNG | {'Y', 'N', 'NG'}
        if all(v in tf for v in up) and any(v in ('TRUE', 'FALSE') for v in up): g['kind'] = 'tfng'
        elif all(v in yn for v in up) and any(v in ('YES', 'NO') for v in up): g['kind'] = 'ynng'
        elif all(v.lower() in ROMANS for v in vals): g['kind'] = 'heading'; g['max'] = 10
        elif all(re.fullmatch(r'[A-L]', v) for v in vals): g['kind'] = 'letter'
    return groups


def check(item, block, key):
    bad, tl = [], P.clean(block).lower()
    for g in item['groups']:
        ab = g.get('letters') or ''
        rng = {chr(c) for c in range(ord(ab[0]), ord(ab[1]) + 1)} if len(ab) == 2 else set()
        for n in range(g['from'], g['to'] + 1):
            v = key.get(n)
            if not v: bad.append(f'câu {n}: thiếu đáp án'); continue
            u = v.upper()
            if g['kind'] == 'tfng' and u not in TFNG: bad.append(f'câu {n}: cần TRUE/FALSE/NOT GIVEN, có "{v}"')
            elif g['kind'] == 'ynng' and u not in YNNG: bad.append(f'câu {n}: cần YES/NO/NOT GIVEN, có "{v}"')
            elif g['kind'] == 'heading' and v.lower() not in ROMANS: bad.append(f'câu {n}: cần số La Mã, có "{v}"')
            elif g['kind'] in ('letter', 'multi'):
                if not re.fullmatch(r'[A-L]', u): bad.append(f'câu {n}: cần chữ cái, có "{v}"')
                elif rng and u not in rng: bad.append(f'câu {n}: đáp án {v} ngoài dải {ab}')
            elif g['kind'] == 'gap' and flat(v) not in flat(tl):
                bad.append(f'câu {n}: từ "{v}" không có trong bài đọc')
    return bad


def passage_title(block):
    """lấy tiêu đề đúng như bộ bóc nội dung tương tác nhìn thấy"""
    import extract_interactive as E
    t = E.drop_junk(block)
    p = E.passage_of(t) or E.plain_passage(t)
    return (p or {}).get('title', '')


def one_test(n, allkeys):
    t = vol8.paper(n)
    key = {q: norm(v) for q, v in allkeys.get(n, {}).items()}
    romans = re.findall(r'(?m)^\s*(' + P.ROMAN_RE + r')\s{1,}[A-Z]', t)
    hmax = max([ROMANS.index(r.lower()) + 1 for r in romans if r.lower() in ROMANS] or [10])
    out = []
    for num, block in vol8.passages(t):
        gs = P.pdf_groups(block)
        if not gs:
            out.append((None, block, [f'passage {num}: không thấy nhóm câu hỏi'])); continue
        title = passage_title(block) or vol8.title_of(block) or f'VOL 8 Test {n} Passage {num}'
        groups = refine([group_dict(a, b, kd, ins, hmax) for a, b, kd, ins in gs], key)
        for g, (a, b, kd, ins) in zip(groups, gs):
            if g['kind'] != kd: g.update(group_dict(g['from'], g['to'], g['kind'], ins, hmax))
        refine_key(groups, key)
        lo, hi = groups[0]['from'], groups[-1]['to']
        item = {
            'id': f'p{num}-{slug(title)}', 'part': num, 'title': title, 'set': SETNAME,
            'testTitle': f'Test {n}', 'files': [], 'groups': groups,
            'key': {str(q): [key[q]] for q in range(lo, hi + 1) if q in key},
        }
        out.append((item, block, check(item, block, key)))
    return out


def main():
    save = '--save' in sys.argv
    allkeys = vol8.keys()
    print('đáp án OCR được:', {t: len(v) for t, v in sorted(allkeys.items())})
    import extract_interactive as E
    from batch_interactive import one
    have = {x['id'] for x in E.js_items('bank-reading.js', 'READING_BANK')} | \
           {x['id'] for x in E.js_items('bank-vol9.js', 'VOL9_READING')}
    os.makedirs(os.path.join(SP, 'txt'), exist_ok=True)

    items, skipped, rows = [], [], 0
    # bài đọc đã có trên web (kể cả từ nguồn khác) -> khỏi thêm trùng
    seen_text = {}
    import glob
    for f in glob.glob(os.path.join(PROJ, 'js', 'data', 'interactive', '*.json')):
        d0 = json.load(open(f, encoding='utf8'))
        ps = (d0.get('passage') or {}).get('paras') or []
        if ps: seen_text[' '.join(ps[0]['text'].split())[:150]] = d0['id']
    for n in sorted(allkeys):
        for item, block, errs in one_test(n, allkeys):
            rows += 1
            if item is None: print(f'  Test {n} · ? | ' + '; '.join(errs)[:110]); continue
            if errs: print(f"  Test {n} · {item['id']:44.44} | " + '; '.join(errs)[:110]); continue
            if item['id'] in have: skipped.append((n, item['id'])); continue
            open(os.path.join(SP, 'txt', item['id'] + '.txt'), 'w', encoding='utf8', newline='\n').write(block)
            try:
                data, bad = one('reading', item)
            except Exception as ex:
                data, bad = None, [f'lỗi bóc nội dung: {ex}']
            if bad:
                print(f"  Test {n} · {item['id']:44.44} | nội dung: " + '; '.join(bad)[:95])
                os.remove(os.path.join(SP, 'txt', item['id'] + '.txt')); continue
            # đề VOL 8 không ghi mốc passage nên chỗ cắt dễ lệch: nếu bài đọc bóc ra
            # trùng với một passage trước thì chắc chắn cắt sai -> bỏ, tránh việc
            # học sinh đọc bài này mà trả lời câu hỏi của bài khác
            head = ' '.join((data.get('passage') or {}).get('paras', [{}])[0].get('text', '').split())[:150]
            if head and head in seen_text:
                print(f"  Test {n} · {item['id']:44.44} | cắt sai: bài đọc trùng {seen_text[head]}")
                os.remove(os.path.join(SP, 'txt', item['id'] + '.txt')); continue
            seen_text[head] = item['id']
            have.add(item['id'])
            items.append((item, block))
    print(f'DÙNG ĐƯỢC {len(items)}/{rows} passage' + (f' · bỏ {len(skipped)} bài đã có' if skipped else ''))
    for n, i in skipped: print(f'  (đã có) Test {n} · {i}')
    if not save:
        for item, _ in items: os.remove(os.path.join(SP, 'txt', item['id'] + '.txt'))
        print('(chạy lại với --save để ghi file)')
        return
    lines = ['// =====================================================================',
             '//  NGÂN HÀNG ĐỀ READING — ACTUAL TEST VOL 8 (sinh bởi tools/gen_vol8.py)',
             '//  Đề: "VOL 1-9 2/VOL 8 - ORIGINAL EXAMS/READING/Test n.pdf" (PDF có chữ).',
             '//  Đáp án: Key.pdf là ảnh chụp Google Docs -> OCR bằng tools/ocr_key8.py.',
             '//  Không có file PDF trên web: bài chạy ở chế độ làm trực tiếp (files: []).',
             '// =====================================================================',
             'export const VOL8_READING = [']
    for item, block in items:
        lines.append('  ' + json.dumps(item, ensure_ascii=False, separators=(',', ':')) + ',')
    lines.append('];')
    open(os.path.join(PROJ, 'js', 'data', 'bank-vol8.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'đã ghi {len(items)} bài vào js/data/bank-vol8.js và txt/')


if __name__ == '__main__':
    main()
