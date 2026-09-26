# Đưa Reading VOL 9 (8 đề × 3 passage) vào ngân hàng đề.
#   python gen_vol9.py           # xem thử: in báo cáo, không ghi gì
#   python gen_vol9.py --save    # ghi js/data/bank-vol9.js + txt/<id>.txt (cho bản tương tác)
# Đề và đáp án đều là .docx chữ thật nên không cần file PDF: bài chạy ở chế độ tương tác,
# nội dung do batch_interactive.py bóc từ txt/<id>.txt.
import json, os, re, sys, unicodedata
import parse_reading as P
import vol9

SP = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(SP)
SETNAME = 'Actual Test Vol 9'
ROMANS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv']
TFNG, YNNG = {'TRUE', 'FALSE', 'NOT GIVEN'}, {'YES', 'NO', 'NOT GIVEN'}

# Sửa tay vài đáp án sai/thiếu trong file key gốc (đối chiếu với chính bài đọc).
FIXES = {
    (4, 25): ['brainwaves'],                       # key gõ nhầm "brainswaves"
    (5, 34): ['some 800 km', '800 km', 'some 800km', '800km'],
    (6, 40): ['colour coding', 'color coding', 'colour-coding',
              'colour coding system', 'color coding system'],   # bài đọc viết kiểu Anh: "colour- coding"
}

flat = lambda s: re.sub(r'[\s\-–—]', '', s.lower())


def alts(v):
    """một ô đáp án có thể ghi nhiều cách chấp nhận, ngăn bằng dấu phẩy, gạch chéo hay chữ or"""
    xs = [x.strip() for x in re.split(r'\s*/\s*|\s+or\s+|\s*,\s*', v) if x.strip()]
    return xs or [v]


def slug(s):
    s = unicodedata.normalize('NFKD', s.lower()).replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


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
    """nhóm 'other' -> tfng / ynng / heading, dựa vào chính đáp án (như gen_reading.py)"""
    for g in groups:
        if g['kind'] != 'other': continue
        vals = [key[n] for n in range(g['from'], g['to'] + 1) if n in key]
        if not vals: continue
        up = [v.upper() for v in vals]
        if all(v in TFNG for v in up) and any(v in ('TRUE', 'FALSE') for v in up): g['kind'] = 'tfng'
        elif all(v in YNNG for v in up) and any(v in ('YES', 'NO') for v in up): g['kind'] = 'ynng'
        elif all(v.lower() in ROMANS for v in vals): g['kind'] = 'heading'; g['max'] = 10
        elif all(re.fullmatch(r'[A-L]', v) for v in vals): g['kind'] = 'letter'
    return groups


def check(item, block, key):
    """kiểm tra đáp án của riêng passage này"""
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
                ls = v.split(',')
                if not all(re.fullmatch(r'[A-L]', x) for x in ls): bad.append(f'câu {n}: cần chữ cái, có "{v}"')
                elif rng and not set(ls) <= rng: bad.append(f'câu {n}: đáp án {v} ngoài dải {ab}')
            elif g['kind'] == 'gap' and not any(flat(x) in flat(tl) for x in alts(v)):
                bad.append(f'câu {n}: từ "{v}" không có trong bài đọc')
    return bad


def kind_of(groups, q):
    return next((g['kind'] for g in groups if g['from'] <= q <= g['to']), 'other')


def one_test(n):
    """-> [(item, chữ của passage, lỗi)]"""
    t, key = vol9.paper(n), vol9.keys(n)
    romans = re.findall(r'(?m)^\s*(' + P.ROMAN_RE + r')\s{1,}[A-Z]', t)
    hmax = max([ROMANS.index(r.lower()) + 1 for r in romans if r.lower() in ROMANS] or [10])
    out = []
    for num, block in vol9.passages(t):
        gs = P.pdf_groups(block)
        if not gs:
            out.append((None, block, [f'passage {num}: không thấy nhóm câu hỏi'])); continue
        title = vol9.title_of(block) or f'VOL 9 Test {n} Passage {num}'
        groups = refine([group_dict(a, b, kd, ins, hmax) for a, b, kd, ins in gs], key)
        # nhóm vừa đổi sang 'letter' thì phải tính lại dải chữ cái từ đề bài
        for g, (a, b, kd, ins) in zip(groups, gs):
            if g['kind'] != kd: g.update(group_dict(g['from'], g['to'], g['kind'], ins, hmax))
        lo, hi = groups[0]['from'], groups[-1]['to']
        item = {
            'id': f'p{num}-{slug(title)}', 'part': num, 'title': title, 'set': SETNAME,
            'testTitle': f'Test {n}', 'files': [], 'groups': groups,
            # khóa dạng chuỗi cho giống lúc đọc lại từ JSON
            'key': {str(q): FIXES.get((n, q)) or (alts(key[q]) if kind_of(groups, q) == 'gap' else [key[q]])
                    for q in range(lo, hi + 1) if q in key},
        }
        out.append((item, block, check(item, block, {**key, **{q: ' or '.join(v) for (tn, q), v in FIXES.items() if tn == n}})))
    return out


def main():
    save = '--save' in sys.argv
    rows = [(n,) + r for n in range(1, 9) for r in one_test(n)]
    import extract_interactive as E
    have = {x['id'] for x in E.js_items('bank-reading.js', 'READING_BANK')}
    os.makedirs(os.path.join(SP, 'txt'), exist_ok=True)

    items, skipped = [], []
    for n, item, block, errs in rows:
        if item is None: print(f'  Test {n} · ? | ' + '; '.join(errs)[:110]); continue
        if errs: print(f"  Test {n} · {item['id']:44.44} | " + '; '.join(errs)[:110]); continue
        if item['id'] in have: skipped.append((n, item['id'])); continue     # bài này ngân hàng đã có
        # phải bóc được nội dung tương tác thì bài mới dùng được (không có PDF dự phòng)
        open(os.path.join(SP, 'txt', item['id'] + '.txt'), 'w', encoding='utf8', newline='\n').write(block)
        from batch_interactive import one
        try:
            data, bad = one('reading', item)
        except Exception as ex:
            data, bad = None, [f'lỗi bóc nội dung: {ex}']
        if bad:
            print(f"  Test {n} · {item['id']:44.44} | nội dung: " + '; '.join(bad)[:100])
            os.remove(os.path.join(SP, 'txt', item['id'] + '.txt')); continue
        items.append((item, block))

    print(f'DÙNG ĐƯỢC {len(items)}/{len(rows)} passage' + (f' · bỏ {len(skipped)} bài ngân hàng đã có' if skipped else ''))
    for n, i in skipped: print(f'  (đã có) Test {n} · {i}')
    if not save:
        print('(chạy lại với --save để ghi file)')
        for item, _ in items: os.remove(os.path.join(SP, 'txt', item['id'] + '.txt'))
        return
    lines = ['// =====================================================================',
             '//  NGÂN HÀNG ĐỀ READING — ACTUAL TEST VOL 9 (sinh bởi tools/gen_vol9.py)',
             '//  Nguồn: "VOL 1-9 2/VOL 9 - ORIGINAL EXAMS/READING" (đề .docx + đáp án .docx).',
             '//  Không có file PDF nên bài chạy thẳng ở chế độ làm trên web (files: []);',
             '//  nội dung hiển thị nằm ở js/data/interactive/<id>.json.',
             '// =====================================================================',
             'export const VOL9_READING = [']
    for item, block in items:
        lines.append('  ' + json.dumps(item, ensure_ascii=False, separators=(',', ':')) + ',')
    lines.append('];')
    open(os.path.join(PROJ, 'js', 'data', 'bank-vol9.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'đã ghi {len(items)} bài vào js/data/bank-vol9.js và txt/')


if __name__ == '__main__':
    main()
