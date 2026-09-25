# Parse IELTS reading passages (PDF text) + key.docx text into answer maps, with validation.
import json, re, sys, os
from collections import Counter

SP = os.path.dirname(os.path.abspath(__file__))

DASH = r'[\-–—−]'
RANGE = re.compile(r'Questions?\s+(\d{1,2})\s*(?:' + DASH + r'|to|and|&)\s*(\d{1,2})', re.I)
SINGLE = re.compile(r'Question\s+(\d{1,2})\b(?!\s*(?:' + DASH + r'|to|and|&)\s*\d)', re.I)

TFNG = {'TRUE', 'FALSE', 'NOT GIVEN'}
YNNG = {'YES', 'NO', 'NOT GIVEN'}
ROMAN = re.compile(r'^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)$', re.I)
ROMAN_RE = r'(?:xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)'
SEP = r'\s*(?:,|và|and|&|\+|/)\s*'


def clean(s):
    s = s.replace(' ', ' ').replace('’', "'").replace('‘', "'")
    return re.sub(r'\s+', ' ', s).strip()


# ---------------- PDF: question groups ----------------
def kind_of(instr):
    s = instr.upper()
    if 'NOT GIVEN' in s and 'TRUE' in s: return 'tfng'
    if 'NOT GIVEN' in s and 'YES' in s: return 'ynng'
    if 'LIST OF HEADINGS' in s or 'CORRECT HEADING' in s: return 'heading'
    if re.search(r'CHOOSE (TWO|THREE|2|3) (LETTERS|ANSWERS|CORRECT)', s): return 'multi'
    if re.search(r'\b[A-L]\s*' + DASH + r'\s*[A-L]\b|\b[A-L],\s*[A-L],?\s+OR\s+[A-L]\b|CORRECT LETTER|WHICH PARAGRAPH|WHICH SECTION', s): return 'letter'
    if re.search(r'NO MORE THAN|ONE WORD|TWO WORDS|THREE WORDS|WORDS? AND/OR|ONLY ONE WORD|A NUMBER', s): return 'gap'
    return 'other'


def pdf_groups(t):
    heads = [(m.start(), int(m.group(1)), int(m.group(2))) for m in RANGE.finditer(t)]
    heads += [(m.start(), int(m.group(1)), int(m.group(1))) for m in SINGLE.finditer(t)]
    heads.sort()
    groups, seen = [], set()
    for i, (pos, a, b) in enumerate(heads):
        if a > b or b - a > 20 or (a, b) in seen: continue
        pre = t[max(0, pos - 40):pos].lower()
        if 'spend about' in pre or 'minutes on' in pre: continue
        seen.add((a, b))
        # next header that starts a different group (instructions often repeat "(Questions 9-13)")
        nxt = next((h[0] for h in heads[i + 1:] if (h[1], h[2]) != (a, b) and not (h[1] >= a and h[2] <= b)), len(t))
        instr = t[pos:min(nxt, pos + 700)]
        groups.append((a, b, kind_of(instr), instr))
    umbrellas = [g for g in groups if sum(1 for o in groups if o is not g and g[0] <= o[0] and o[1] <= g[1]) >= 2]
    return sorted(g for g in groups if g not in umbrellas)


# ---------------- Key parsing (kind-aware, sequential) ----------------
def strip_prefix(b):
    b = clean(b).lstrip('*').strip()
    return re.sub(r'^(?:Answer|Đáp án|Answers)\s*[:\-]\s*', '', b, flags=re.I)


def extract(b, kind):
    b = strip_prefix(b)
    if not b: return None
    if kind in ('tfng', 'ynng', 'other'):
        m = re.match(r'^(NOT GIVEN|TRUE|FALSE|YES|NO)\b', b, re.I)
        if m:
            v = m.group(1).upper()
            if kind == 'other' or (kind == 'tfng' and v in TFNG) or (kind == 'ynng' and v in YNNG): return v
        m = re.match(r'^(NG|T|F|Y|N)\b(?![\'\w])', b)
        if m and kind != 'other':
            v = {'NG': 'NOT GIVEN', 'T': 'TRUE', 'F': 'FALSE', 'Y': 'YES', 'N': 'NO'}[m.group(1)]
            if (kind == 'tfng' and v in TFNG) or (kind == 'ynng' and v in YNNG): return v
        if kind != 'other': return None
    if kind in ('heading', 'other'):
        m = re.match(r'^(?:(?:Paragraph|Section|Para\.?)\s+[A-L]\s*[:\-–—]\s*)?(' + ROMAN_RE + r')\b(?![\'\w])', b, re.I)
        if m and (kind == 'heading' or m.group(1) != m.group(1).upper() or len(m.group(1)) > 1):
            return m.group(1).lower()
        if kind == 'heading': return None
    if kind in ('letter', 'multi', 'other'):
        b2 = re.sub(r'^(?:Paragraph|Section|Para\.?)\s+', '', b, flags=re.I)
        m = re.match(r'^([A-L](?:' + SEP + r'[A-L])*)\b(?![\'\w])', b2)
        if not m:
            m = re.match(r'^[^:()]{1,60}?:\s*([A-L](?:' + SEP + r'[A-L])*)\b(?![\'\w])', b)
        if m:
            return ','.join(re.findall(r'[A-L]', m.group(1)))
        if kind != 'other': return None
    w = re.split(r'\s+\(|\(|:\s|\s[–—-]\s|\s*\(p\.', b)[0].strip().strip('.').strip('"“”\'').strip()
    if w and 0 < len(w.split()) <= 6 and not re.match(r'^(Questions?|Giải thích|Explanation|Multiple Choice|Main Aim|Chọn|Paragraph [A-L]$)', w, re.I):
        return w
    return None


def parse_key(k, seq, kinds, group_of):
    lines = [clean(l) for l in k.split('\n')]
    lines = [l for l in lines if l]
    out = {}
    if not seq: return out
    lo = seq[0]
    num_re = re.compile(r'^(?:\*\*)?(?:Question\s*|Câu\s*)?(\d{1,2})(?:\s*(?:[-–&]|and)\s*(\d{1,2}))?\s*[.):]\s*(.*)$', re.I)
    nums = [int(m.group(1)) for l in lines for m in [num_re.match(l)] if m]
    heads = [int(m.group(1)) for l in lines for m in [RANGE.search(l)] if m and re.match(r'^(?:\*\*)?(?:Questions?|Câu)', l, re.I)]
    allnums = nums + heads
    offset = 0
    if allnums and max(allnums) <= 14 and lo >= 14: offset = lo - 1
    elif allnums and lo == 1 and min(allnums) in (14, 27): offset = -(min(allnums) - 1)

    def fill(n, v):
        if kinds.get(n) == 'multi' and ',' in v:
            grp = [q for q in seq if kinds.get(q) == 'multi' and group_of.get(q) == group_of.get(n)]
            for q in grp: out.setdefault(q, v)
            return grp[-1]
        if kinds.get(n) == 'multi':
            # single letters on separate lines: collect into the group's set
            grp = [q for q in seq if kinds.get(q) == 'multi' and group_of.get(q) == group_of.get(n)]
            prev = [out[q] for q in grp if q in out]
            letters = sorted(set(','.join(prev + [v]).split(',')))
            for q in grp: out.pop(q, None)
            filled = grp[:len(letters)]
            for q in filled: out[q] = ','.join(letters)
            return filled[-1]
        out.setdefault(n, v)
        return n

    ptr, pending = 0, None
    for l in lines:
        if re.match(r'^(Giải thích|Explanation|Lưu ý|Note|\()', l, re.I): continue
        m = RANGE.search(l)
        if m and re.match(r'^(?:\*\*)?(?:Questions?|Câu)', l, re.I):
            a = int(m.group(1)) + offset
            if a in seq: ptr = seq.index(a)
            pending = None
            rest = l[m.end():].lstrip(' :.-–')
            if rest and kinds.get(a) == 'multi':
                v = extract(rest, 'multi')
                if v and ',' in v:
                    last = fill(a, v); ptr = seq.index(last) + 1
            continue
        m = num_re.match(l) or re.match(r'^(\d{1,2})()\s+(.*)$', l)
        if m and 1 <= int(m.group(1)) + offset <= 45:
            n = int(m.group(1)) + offset
            v = extract(m.group(3), kinds.get(n, 'other'))
            if v is None: pending = n; continue
            last = fill(n, v); pending = None
            if last in seq: ptr = seq.index(last) + 1
            continue
        target = pending if pending is not None else (seq[ptr] if ptr < len(seq) else None)
        if target is None: continue
        v = extract(l, kinds.get(target, 'other'))
        if v is None: continue
        last = fill(target, v); pending = None
        if last in seq: ptr = seq.index(last) + 1
    return out


# ---------------- Validation ----------------
def validate(it):
    t = it.get('pdftext') or ''
    groups = pdf_groups(t)
    problems = []
    if not groups: problems.append('no question groups found in PDF')
    seq = sorted({n for a, b, _, _ in groups for n in range(a, b + 1)})
    kinds, group_of = {}, {}
    for gi, (a, b, kind, _) in enumerate(groups):
        for n in range(a, b + 1): kinds[n] = kind; group_of[n] = gi
    key = parse_key(it.get('keytext') or '', seq, kinds, group_of)
    if seq and len(seq) < 10: problems.append(f'only {len(seq)} questions detected')
    missing = [n for n in seq if n not in key]
    if missing: problems.append(f'missing answers for {missing}')
    tl = clean(t).lower()
    word_total = word_miss = 0
    for n in seq:
        v = key.get(n)
        if v is None: continue
        kind = kinds.get(n, 'other'); u = v.upper()
        if kind == 'tfng' and u not in TFNG: problems.append(f'Q{n} expects T/F/NG, got "{v}"')
        if kind == 'ynng' and u not in YNNG: problems.append(f'Q{n} expects Y/N/NG, got "{v}"')
        if kind == 'heading' and not ROMAN.match(v): problems.append(f'Q{n} expects heading, got "{v}"')
        if kind in ('letter', 'multi') and not re.fullmatch(r'[A-L](,[A-L])*', v): problems.append(f'Q{n} expects letter, got "{v}"')
        if kind == 'gap':
            word_total += 1
            alts = [x.strip().lower() for x in re.split(r'\s*/\s*|\s+or\s+', v) if x.strip()]
            if not any(a in tl for a in alts): word_miss += 1
    if word_total >= 3 and word_miss / word_total > 0.4:
        problems.append(f'{word_miss}/{word_total} gap answers not in passage (key may belong to another passage)')
    # cross-check 1: passage title cited in the key, e.g. "(P1 - A Bri... p. 1)" or "(Babies cry... p. 2)"
    kt = it.get('keytext') or ''
    fn = re.sub(r'[^a-z0-9]', '', re.sub(r'^(?:\d+\.\s*)?P\d\s*-\s*', '', it['pdf'], flags=re.I).lower())
    cites = re.findall(r'\((?:\d+\.\s*)?(?:P\d\s*-\s*)?([A-Za-z][^()]{2,40}?)\s*(?:\.\.\.|…)\s*p\.?\s*\d', kt)
    cites = [re.sub(r'[^a-z0-9]', '', c.lower()) for c in cites]
    cites = [c for c in cites if len(c) >= 4]
    if cites:
        bad = [c for c in cites if not fn.startswith(c[:len(fn)]) and not fn.startswith(c)]
        if len(bad) > len(cites) / 2:
            problems.append(f'key cites another passage: "{cites[0]}" vs file "{fn[:30]}"')
    # cross-check 2: English option text quoted in brackets should appear in the PDF
    quotes = re.findall(r'\(([A-Za-z][A-Za-z ,\'\-]{15,80})\)', kt)
    pdfn = re.sub(r'[^a-z]', '', tl)
    if len(quotes) >= 4:
        found = sum(1 for q in quotes if re.sub(r'[^a-z]', '', q.lower())[:25] in pdfn)
        if found / len(quotes) < 0.3:
            problems.append(f'only {found}/{len(quotes)} quoted options found in PDF (key may belong to another passage)')
    return groups, {n: key[n] for n in seq if n in key}, problems


def title_of(it):
    t = it['folder'].replace('_', ':').strip()
    t = re.sub(r':\s*$', '?', t)
    return re.sub(r'\s+', ' ', t)


def main():
    items = json.load(open(os.path.join(SP, 'rd', 'all.json'), encoding='utf8'))
    results = []
    for it in items:
        if not it.get('pdf'):
            results.append({'folder': it['folder'], 'part': it['part'], 'ok': False, 'problems': ['no PDF']}); continue
        groups, key, problems = validate(it)
        t = it.get('pdftext') or ''
        romans = re.findall(r'(?m)^\s*(' + ROMAN_RE + r')\s{1,}[A-Z]', t)
        order = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv']
        hmax = max([order.index(r.lower()) + 1 for r in romans if r.lower() in order] or [10])
        gout = []
        for a, b, k, instr in groups:
            g = {'from': a, 'to': b, 'kind': k}
            if k in ('letter', 'multi'):
                m = re.search(r'\b([A-L])\s*' + DASH + r'\s*([A-L])\b', instr)
                m3 = re.search(r'\b([A-L])(?:\s*,\s*[A-L])*,?\s+(?:or|and)\s+([A-L])\b', instr)
                g['letters'] = (m.group(1) + m.group(2)) if m else (m3.group(1) + m3.group(2)) if m3 else 'AH'
                if k == 'multi':
                    m2 = re.search(r'CHOOSE (TWO|THREE|2|3)', instr.upper())
                    g['pick'] = {'TWO': 2, '2': 2, 'THREE': 3, '3': 3}[m2.group(1)] if m2 else b - a + 1
            if k == 'heading': g['max'] = max(hmax, 5)
            gout.append(g)
        results.append({
            'part': it['part'], 'folder': it['folder'], 'pdf': it['pdf'], 'title': title_of(it),
            'groups': gout, 'key': key, 'problems': problems, 'ok': not problems,
        })

    json.dump(results, open(os.path.join(SP, 'rd', 'parsed.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    c = Counter(r['ok'] for r in results)
    print('OK', c[True], 'problem', c[False])
    if len(sys.argv) > 1:
        for r in results:
            if not r['ok'] and (sys.argv[1] == 'all' or sys.argv[1] in r['folder']):
                print('--', r['part'], r['folder'], r['problems'][:3], r.get('groups'))


if __name__ == '__main__':
    main()
