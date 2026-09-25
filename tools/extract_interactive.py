# Bóc nội dung đề (bài đọc, đề bài từng nhóm, từng câu, phương án) từ PDF -> JSON để làm bài tương tác.
#   python extract_interactive.py <id>            # in JSON ra màn hình để kiểm tra
#   python extract_interactive.py <id> --save      # ghi vào interactive/<id>.json
# Đáp án vẫn lấy từ js/data/bank-*.js nên file này chỉ lo phần hiển thị.
import json, os, re, subprocess, sys, unicodedata

T = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(T)
RROOT = r'C:\Users\Admin\OneDrive\2. IELTS\5. READING IN PASSAGES'
LROOT = r'C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING'
ROMAN = r'(?:xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)'
DASH = r'[-–—]'
nfc = lambda s: unicodedata.normalize('NFC', s)


def js_items(name, const):
    """đọc mảng trong js/data/bank-*.js"""
    s = open(os.path.join(PROJ, 'js', 'data', name), encoding='utf8').read()
    body = s.split(f'export const {const} = [')[1]
    return [json.loads(l.strip().rstrip(',')) for l in body.splitlines() if l.strip().startswith('{')]


def pdftext(path, pages=None):
    cmd = ['pdftotext', '-layout']
    if pages: cmd += ['-f', str(pages[0]), '-l', str(pages[1])]
    return subprocess.run(cmd + [path, '-'], capture_output=True).stdout.decode('utf8', 'replace')


# dòng đầu/cuối trang do PDF chèn vào (không thuộc đề)
JUNK = re.compile(r'(?i)^\s*(?:'
                  r'trang\s*\d+\s*/\s*\d+'
                  r'|page\s*\d+(\s*of\s*\d+)?'
                  r'|ielts\s+(listening|reading)\b.*'
                  r'|test\s*\d+\s*$'
                  r'|\d{1,3}\s*$'
                  r')\s*$')
# khối "Disclaimer" của nhóm soạn đề in ở cuối file, hay dính vào câu hỏi cuối
DISCLAIMER = re.compile(r'(?i)^\s*(?:disclaimer\s*$|compiled, formatted, and lightly proofread|all copyright in the underlying works'
                        r'|no affiliation with|(?:for )?non-commercial educational use only|available free of charge from'
                        r'|this notice must remain intact|permission: non-commercial)')


def drop_junk(text):
    """bỏ header/footer của từng trang PDF để chúng không dính vào câu hỏi"""
    out = []
    for ln in text.split('\n'):
        t = ln.replace('\x0c', ' ')
        if JUNK.match(t) or DISCLAIMER.match(t): continue
        # footer nằm cuối dòng nội dung: "... work together. Test 2 Trang 4 / 7 IELTS LISTENING TEST"
        t = re.sub(r'(?i)\s*Test\s*\d+\s+Trang\s*\d+\s*/\s*\d+.*$', '', t)
        t = re.sub(r'(?i)\s*Trang\s*\d+\s*/\s*\d+.*$', '', t)
        out.append(t)
    return '\n'.join(out)


SMALL = {'a', 'an', 'the', 'of', 'to', 'and', 'in', 'on', 'for', 'at', 'by', 'with'}
DIRECTIVE = re.compile(r'(?i)\b(choose|write|complete|label|match|answer|letter|words?|numbers?|boxes?|list)\b')


def is_title_line(ln):
    """dòng tiêu đề bài nghe/bài đọc lẫn vào phần đề bài"""
    w = ln.split()
    if len(w) < 3 or DIRECTIVE.search(ln) or ln.rstrip().endswith(('.', ':', ',')): return False
    big = [x for x in w if x.lower() not in SMALL]
    return big and sum(x[:1].isupper() for x in big) / len(big) >= 0.7


TXT = os.path.join(T, 'txt')


def raw_text(kind, item):
    """Văn bản đề: đọc thẳng từ tài liệu gốc; máy nào không có tài liệu thì dùng bản
    đã xuất sẵn ở tools/txt/<id>.txt (sinh bằng dump_text.py)."""
    try:
        if kind == 'reading': return drop_junk(pdftext(real(RROOT, item['src'])))
        f = next((x for x in item['files'] if x['type'] == 'pdf'), item['files'][0])
        return drop_junk(pdftext(real(LROOT, f['src']), f.get('pages')))
    except (FileNotFoundError, NotADirectoryError, StopIteration, OSError):
        cache = os.path.join(TXT, item['id'] + '.txt')
        if not os.path.exists(cache): raise
        return drop_junk(open(cache, encoding='utf8').read())


def real(root, rel):
    d = root
    for part in rel.split('/'):
        d = os.path.join(d, next(x for x in os.listdir(d) if nfc(x) == nfc(part)))
    return d


def clean(s):
    return re.sub(r'\s+', ' ', s.replace('\u00a0', ' ')).strip()


def gapify(s):
    s = re.sub(r'[.·…]{3,}|_{3,}', ' ____ ', s)
    s = clean(s)
    s = re.sub(r'\s+([.,;:?!])', r'\1', s)          # ' .' -> '.'
    return re.sub(r'([.?!])\s*[.?!]+$', r'\1', s)   # '. .' thừa ở cuối câu


# ---------------- tách khối theo từng nhóm câu hỏi ----------------
def blocks(text, want):
    """[(from, to, text)] theo thứ tự xuất hiện, chỉ giữ nhóm nằm trong danh sách want.
    Một số đề in sai dải câu ("Questions 1-7" nhưng có tới câu 8, "Questions 36-40" nhưng
    câu bắt đầu từ 37) — dải trong bank-*.js mới đúng, nên khi không khớp cả cặp thì
    khớp theo số câu đầu, rồi tới số câu cuối."""
    heads = []
    # "Questions 14-18" hoặc nhóm một câu "Question 40"
    for m in re.finditer(r'(?im)^[^\S\n]*Questions?\s+(\d{1,2})(?:\s*(?:' + DASH + r'|to|and|&)\s*(\d{1,2}))?\b.*$', text):
        if re.search(r'(?i)which are based on|should spend', m.group(0)): continue   # dòng dẫn cả bài
        heads.append((m.start(), m.end(), int(m.group(1)), int(m.group(2) or m.group(1))))
    hits, used = [], set()
    for a, b in sorted(want):
        h = (next((h for h in heads if (h[2], h[3]) == (a, b) and h[0] not in used), None)
             or next((h for h in heads if h[2] == a and h[0] not in used), None)
             or next((h for h in heads if h[3] == b and h[0] not in used), None))
        if not h: continue
        used.add(h[0]); hits.append((h[0], a, b))
    hits.sort()
    out = []
    for i, (s0, a, b) in enumerate(hits):
        end = hits[i + 1][0] if i + 1 < len(hits) else len(text)
        out.append((a, b, text[s0:end]))
    return out


def number_single(block, n):
    """nhóm một câu ("Question 40") thường in câu hỏi không kèm số -> gắn số vào dòng hỏi đầu tiên"""
    lines = block.split('\n')
    if any(re.match(r'^[^\S\n]*' + str(n) + r'[.)]?\s+\S', ln) for ln in lines[1:]): return block
    for i, ln in enumerate(lines[1:], 1):
        t = ln.strip()
        if not t or re.match(r'(?i)^(choose|write|complete|answer|nb\b|in boxes?)', t): continue
        if re.match(r'^[A-J][.)]?\s', t): return block        # tới phương án mà chưa thấy câu hỏi
        lines[i] = ln[:len(ln) - len(ln.lstrip())] + str(n) + ' ' + t
        return '\n'.join(lines)
    return block


def numbered(block, lo, hi):
    """dòng '14 Nội dung câu' (gồm cả dòng xuống hàng) -> {n: text}"""
    lines = block.split('\n')
    cur, out = None, {}
    for ln in lines:
        m = re.match(r'^[^\S\n]*(\d{1,2})[.)]?\s+(\S.*)$', ln)
        if m and lo <= int(m.group(1)) <= hi:
            cur = int(m.group(1)); out[cur] = m.group(2)
        elif cur is not None:
            if re.match(r'^[^\S\n]*[A-H]\s+\S', ln) or re.match(r'(?i)^[^\S\n]*(questions?|choose|write|complete|list of)\b', ln): cur = None
            elif is_title_line(ln.strip()): cur = None   # tiêu đề bài đọc lẫn giữa các câu
            elif ln.strip(): out[cur] += ' ' + ln.strip()
    # số câu nằm giữa câu văn (sơ đồ, bảng, flow-chart): "Seracini used 25 ....... to ..."
    for n in range(lo, hi + 1):
        if out.get(n): continue
        t = inline_question(lines, n, lo, hi)
        if t: out[n] = t
    return {n: gapify(v) for n, v in out.items() if v.strip()}


GAP = r'[.·…]{3,}'


def inline_question(lines, n, lo, hi):
    """câu có số nằm giữa dòng; ghép thêm dòng trước/sau nếu câu bị xuống dòng"""
    others = [str(x) for x in range(lo, hi + 1) if x != n]
    has_other = lambda ln: any(re.search(r'\b' + o + r'\s*' + GAP, ln) for o in others)
    idx = next((i for i, ln in enumerate(lines)
                if re.search(r'\b' + str(n) + r'\s*' + GAP, ln) or re.search(r'\b' + str(n) + r'\s*$', ln) and i + 1 < len(lines) and re.match(r'^\s*' + GAP, lines[i + 1])), None)
    if idx is None: return ''
    parts = [lines[idx]]
    prev = lines[idx - 1] if idx else ''
    if prev.strip() and not has_other(prev) and not prev.rstrip().endswith('.') \
       and not re.match(r'(?i)^\s*(questions?|choose|write|complete|section|part)\b', prev):
        parts.insert(0, prev)
    nxt = lines[idx + 1] if idx + 1 < len(lines) else ''
    if nxt.strip() and not has_other(nxt) and not re.match(r'(?i)^\s*(questions?|choose|write|complete|section|part|test)\b', nxt) \
       and (re.match(r'^\s*' + GAP, nxt) or not parts[-1].rstrip().endswith('.')):
        parts.append(nxt)
    text = ' '.join(x.strip() for x in parts)
    return re.sub(r'\b' + str(n) + r'\s*(?=' + GAP + r')', '', text)


# "6 ______", "8 $ ______", "10 ....." — ký hiệu giữa số câu và chỗ trống được giữ lại
BLANK = r'(\d{1,2})[^\S\n]*([^\w\s._·…]{0,3})[^\S\n]*(?:_{3,}|[.·…]{3,})'
BULLET = r'[\u2022\ufffd\u25aa\u25cf\u00b7*\u2212\-\u2013\u2014]'
LEADIN = re.compile(r'(?i)^(complete|choose|write|read|questions?)\b')


def is_bank_line(ln, bank):
    """dòng in khung đáp án: 'A America  B Philippines  C Australia'"""
    if not bank: return False
    texts = {o['v']: o['t'].lower() for o in bank}
    hits = 0
    for m in re.finditer(r'(?:^|\s{2,})([A-Z])[.)]?\s{1,6}(\S[^\n]*?)(?=\s{2,}[A-Z][.)]?\s|$)', ln):
        want = texts.get(m.group(1))
        if want and (want.startswith(clean(m.group(2)).lower()[:20]) or clean(m.group(2)).lower().startswith(want[:20])): hits += 1
    return hits >= 1 and not re.search(BLANK, ln)


def notes_of(blk, lo, hi, bank=None):
    """dạng điền vào ghi chú / bảng / sơ đồ: giữ nguyên bố cục, chỗ trống ghi {{số câu}}"""
    items, title, started = [], '', False
    for raw in blk.split('\n')[1:]:
        if not raw.strip(): continue
        t = raw.strip()
        indent = len(raw) - len(raw.lstrip())
        m = re.match('^(' + BULLET + r')\s+(.*)$', t)
        bullet, body = ('•', m.group(2)) if m else ('', t)
        if not body: continue
        if is_bank_line(t, bank): continue        # dòng của khung đáp án, không phải nội dung
        blank = re.search(BLANK, body)
        if not started:
            if LEADIN.match(body) or re.match(r'(?i)^(your answers|answer sheet)', body): continue
            if not bullet and not blank and len(body) < 90 and not title:
                title = body; continue          # tiêu đề khối ghi chú
        started = True
        lvl = 0 if indent < 6 else 1 if indent < 12 else 2
        prev = items[-1] if items else None
        # tiêu đề nhỏ trong ghi chú: dòng ngắn, viết hoa, không có chỗ trống
        head = not bullet and not blank and len(body) < 60 and body[:1].isupper()
        heading = head and bool(prev) and prev['bullet'] and indent <= prev['ind']
        new = (bullet or not prev
               or prev['text'].rstrip().endswith(('.', '?', '!', ':'))
               or heading or prev['head'])
        if new: items.append({'level': lvl, 'bullet': '•' if bullet else '', 'text': body, 'ind': indent, 'head': head})
        else: prev['text'] += ' ' + body
    got = set()

    def slot(m):
        got.add(int(m.group(1)))
        pre = m.group(2).strip()
        return '{{' + m.group(1) + (':' + pre if pre else '') + '}}'

    for it in items:
        it['text'] = clean(re.sub(BLANK, slot, it['text']))
        it.pop('ind', None); it.pop('head', None)
    items = [it for it in items if it['text']]
    if got != set(range(lo, hi + 1)) or not items: return None
    return {'title': title, 'items': items}


def per_question_options(block, lo, hi):
    """trắc nghiệm có phương án riêng dưới từng câu -> {n: [{v,t}]}"""
    out, cur = {}, None
    for ln in block.split('\n'):
        m = re.match(r'^[^\S\n]*(\d{1,2})[.)]?\s+\S', ln)
        if m and lo <= int(m.group(1)) <= hi:
            cur = int(m.group(1)); out.setdefault(cur, []); continue
        m2 = re.match(r'^\s{3,}([A-J])[.)]?\s+(\S.*)$', ln)
        if m2 and cur is not None:
            opts = out[cur]
            if not opts or ord(m2.group(1)) == ord(opts[-1]['v']) + 1: opts.append({'v': m2.group(1), 't': clean(m2.group(2))})
            elif opts: opts[-1]['t'] += ' ' + clean(ln)
        elif cur is not None and out.get(cur) and ln.strip() and not re.match(r'(?i)^[^\S\n]*(questions?|choose|write|complete)\b', ln):
            out[cur][-1]['t'] += ' ' + clean(ln)
    return {k: v for k, v in out.items() if len(v) >= 2}


def lettered(block, upto='H'):
    """dòng 'A nội dung phương án' -> [{v,t}] (bỏ qua dòng bắt đầu bằng số câu)"""
    out, cur = [], None
    for ln in block.split('\n'):
        m = re.match(r'^[^\S\n]*([A-' + upto + r'])[.)]?\s+(\S.*)$', ln)
        if m and (not out or ord(m.group(1)) == ord(out[-1]['v']) + 1):
            cur = {'v': m.group(1), 't': clean(m.group(2))}; out.append(cur)
        elif re.match(r'(?i)^[^\S\n]*(questions?|choose|write|complete|list of|nb)\b', ln):
            cur = None                              # dòng đề bài in ngay sau khung phương án
        elif cur is not None and ln.strip() and not re.match(r'^[^\S\n]*\d{1,2}[.) ]', ln):
            cur['t'] += ' ' + clean(ln)
        elif not ln.strip():
            cur = None
    return out


def lettered_cols(block, upto):
    """khung đáp án in thành nhiều cột: 'A America   B Philippines   C Australia'"""
    pat = re.compile(r'(?:^|\s{2,})([A-' + upto + r'])[.)]?\s{1,6}(\S.*?)(?=\s{2,}[A-' + upto + r'][.)]?\s|$)')
    out = []
    for ln in block.split('\n'):
        if len(pat.findall(ln)) < 2: continue
        for v, t in pat.findall(ln):
            if not out or ord(v) == ord(out[-1]['v']) + 1: out.append({'v': v, 't': clean(t)})
    return out


def lettered_grid(block, upto):
    """khung đáp án in dạng lưới, có dòng chỉ còn một ô ("J diseases"), thứ tự có thể lộn (G E F),
    hoặc hai ô chỉ cách nhau một dấu cách ("A natural evolution B creative thought").
    Trả về đủ A..upto theo thứ tự, hoặc [] nếu không đọc đủ."""
    pat = re.compile(r'(?:^|\s{2,})([A-' + upto + r'])[.)]?\s{1,6}(\S.*?)(?=\s{2,}[A-' + upto + r'][.)]?\s|$)')
    rows = []
    for i, ln in enumerate(block.split('\n')):
        if re.match(r'^[^\S\n]*\d', ln): continue
        cells = []
        for v, t in pat.findall(ln):
            # tách tiếp ô dính nhau bằng một dấu cách, chỉ khi chữ cái kế tiếp đúng thứ tự
            while True:
                nxt = chr(ord(v) + 1)
                m = re.search(r'\s' + nxt + r'\s+(?=\S)', t) if nxt <= upto else None
                if not m or not t[:m.start()].strip(): break
                cells.append((v, clean(t[:m.start()]))); v, t = nxt, t[m.end():]
            cells.append((v, clean(t)))
        if cells: rows.append((i, cells))
    multi = [i for i, c in rows if len(c) >= 2]
    got = {}
    for i, cells in rows:
        # dòng một ô chỉ nhận khi nằm sát các dòng nhiều ô và ngắn (tránh câu văn mở đầu bằng "A ...")
        if len(cells) == 1 and not (any(abs(i - j) <= 3 for j in multi) and len(cells[0][1]) < 60): continue
        for v, t in cells: got.setdefault(v, t)
    want = [chr(c) for c in range(ord('A'), ord(upto) + 1)]
    if sorted(got) != want or not multi: return []
    return [{'v': v, 't': got[v]} for v in want]


def headings(block):
    out = []
    for ln in block.split('\n'):
        m = re.match(r'^[^\S\n]*(' + ROMAN + r')\s+(\S.*)$', ln)
        if m: out.append({'v': m.group(1), 't': clean(m.group(2))})
    return out


def instruction(block, lo):
    """các dòng đề bài trước câu đầu tiên"""
    keep = []
    for ln in block.split('\n')[1:]:
        if re.match(r'^[^\S\n]*(' + str(lo) + r')\b', ln): break
        if re.match(r'^[^\S\n]*(' + ROMAN + r'|[A-H])\s+\S', ln): break
        # đã sang phần ghi chú/bảng/sơ đồ thì dừng
        if re.search(BLANK, ln) or re.match(r'^[^\S\n]*' + BULLET + r'\s', ln): break
        if re.search(r'(?i)answer sheet|^\s*Test \d|Trang \d', ln): continue
        if is_title_line(ln.strip()): continue
        if ln.strip(): keep.append(clean(ln))
    return ' '.join(keep).strip()


# ---------------- bài đọc (Reading) ----------------
def passage_of(text):
    marks = list(re.finditer(r'(?m)^[^\S\n]*([A-J])\s{1,4}(?=[A-Z“"‘\'`])', text))
    # bài đọc kết thúc ở dòng "Questions N" (hoặc tiêu đề phần đề in lại: "READING PASSAGE 2 / You should spend…")
    qlines = [m.start() for m in re.finditer(r'(?im)^[^\S\n]*(?:Questions?\s+\d|reading passage\s*\d|you should spend about)', text)]
    q_between = lambda a, b: any(a < q < b for q in qlines)
    # thử mọi chữ A làm điểm bắt đầu; chuỗi A, B, C… dừng khi gặp dòng "Questions N"
    # (chữ cái sau đó là phương án của câu hỏi, không phải đoạn văn) -> giữ chuỗi dài nhất
    # đoạn A thật phải dài; phương án trắc nghiệm "A ..." in trước bài đọc thì ngắn
    gap_next = {m.start(): (marks[i + 1].start() if i + 1 < len(marks) else len(text)) - m.end() for i, m in enumerate(marks)}
    best, best_size = None, 0
    for s0 in (m for m in marks if m.group(1) == 'A' and gap_next[m.start()] >= 150):
        chain, expect, skipped = [], 'A', False
        for m in marks:
            if m.start() < s0.start(): continue
            if chain and q_between(chain[-1].start(), m.start()): break
            if m.group(1) == expect:
                chain.append(m); expect = chr(ord(expect) + 1)
            elif len(chain) >= 3 and not skipped and m.group(1) == chr(ord(expect) + 1):
                # đề gốc quên in một chữ đánh dấu đoạn (có D, F nhưng không có E): giữ như bản in
                chain.append(m); expect = chr(ord(expect) + 2); skipped = True
        if len(chain) < 3: continue
        end = next((q for q in qlines if q > chain[-1].end()), len(text))
        if end - chain[0].start() > best_size: best, best_size = (chain, end), end - chain[0].start()
    if not best: return None
    chain, end = best
    start = chain[0].start()
    paras = []
    for i, m in enumerate(chain):
        stop = chain[i + 1].start() if i + 1 < len(chain) else end
        paras.append({'mark': m.group(1), 'text': clean(text[m.end():stop])})
    head = [l for l in text[:start].split('\n') if l.strip()]
    title = clean(head[-1]) if head else ''
    if re.match(r'(?i)^\d|questions?|paragraph', title): title = ''
    return {'title': title, 'paras': paras}


SKIP_PARA = re.compile(r'(?i)^\s*(reading passage\s*\d|you should spend about|read the (text|passage)|the reading passage has)')


def plain_passage(text):
    """bài đọc không đánh dấu đoạn A, B, C -> tách đoạn theo dòng trống"""
    end = len(text)
    m = re.search(r'(?im)^[^\S\n]*Questions?\s+\d', text)
    if m: end = m.start()
    blocks = [clean(b) for b in re.split(r'\n[^\S\n]*\n', text[:end])]
    blocks = [b for b in blocks if b and not SKIP_PARA.match(b)]
    if not blocks: return None
    title = ''
    paras = []
    for b in blocks:
        if len(b) < 90 and not paras and not title and not b.endswith(('.', '!', ',', ';', ':')):
            title = b; continue
        if len(b) < 40 and not paras: continue          # dòng lẻ trước bài đọc
        paras.append({'mark': '', 'text': b})
    # đoạn quá ngắn ở cuối thường là chú thích/đề bài lẫn vào
    while paras and len(paras[-1]['text']) < 40: paras.pop()
    if len(paras) < 3 or sum(len(x['text']) for x in paras) < 1200: return None
    return {'title': title, 'paras': paras}


def build(item, kind, text):
    want = {(g['from'], g['to']) for g in item['groups']}
    groups = []
    for a, b, blk in blocks(text, want):
        g = next(x for x in item['groups'] if (x['from'], x['to']) == (a, b))
        if a == b: blk = number_single(blk, a)
        out = {'from': a, 'to': b, 'kind': g['kind'], 'instruction': instruction(blk, a)}
        if g['kind'] == 'heading':
            out['bank'] = headings(blk)
        per_q = per_question_options(blk, a, b) if g['kind'] == 'letter' else {}
        if g['kind'] in ('letter', 'multi') and len(per_q) < (b - a + 1) / 2:
            ab = g.get('letters') or 'AH'
            need = ord(ab[1]) - ord(ab[0]) + 1
            opts = lettered(blk, ab[1])
            if len(opts) < need:
                cols = lettered_cols(blk, ab[1])
                if len(cols) > len(opts): opts = cols
            if len(opts) != need and ab[0] == 'A':
                grid = lettered_grid(blk, ab[1])
                if grid: opts = grid
            # nhóm "matching"/heading: phương án nằm chung một khung
            if opts: out['options' if g['kind'] == 'multi' else 'bank'] = opts
            per_q = {}
        # đoạn tóm tắt có chỗ trống: điền từ, hoặc chọn chữ cái từ khung đáp án
        notes = notes_of(blk, a, b, out.get('bank')) if g['kind'] in ('gap', 'other', 'letter', 'heading') else None
        if notes and g['kind'] in ('letter', 'heading') and not out.get('bank'): notes = None
        if notes:
            out['notes'] = notes['items']
            if notes['title']: out['noteTitle'] = notes['title']
            # dòng dẫn vào bảng/ghi chú đã nằm trong phần nội dung -> bỏ khỏi đề bài
            for _ in range(2):
                for dup in (notes['items'][0]['text'], notes['title']):
                    if dup and out['instruction'].endswith(dup):
                        out['instruction'] = out['instruction'][:-len(dup)].strip()
            # dòng đầu ghi chú bị ngắt giữa câu ("...associated with" / "24 ....") -> cắt từ tiêu đề trở đi
            i = out['instruction'].find(notes['title']) if len(notes['title']) >= 15 else -1
            if i > 0: out['instruction'] = out['instruction'][:i].strip()
            groups.append(out)
            continue
        qs = numbered(blk, a, b)
        if g['kind'] != 'multi':
            out['questions'] = [{'n': n, 'text': qs.get(n, ''), **({'options': per_q[n]} if per_q.get(n) else {})}
                                for n in range(a, b + 1)]
        groups.append(out)
    data = {'id': item['id'], 'kind': kind, 'groups': groups}
    if kind == 'reading':
        p, q = passage_of(text), plain_passage(text)
        size = lambda x: sum(len(i['text']) for i in x['paras']) if x else 0
        # đánh dấu đoạn A, B, C chỉ dùng khi lấy được gần đủ bài; nếu không thì tách theo dòng trống
        data['passage'] = p if p and size(p) >= max(1200, 0.6 * size(q)) else (q or p)
        if not data['passage']: del data['passage']
        if two_columns(text): data['columns'] = 2      # check() sẽ loại, bài giữ chế độ PDF
    # tiêu đề bài in lại ở đầu/cuối mỗi trang, hay dính vào câu hỏi -> bỏ đi
    titles = [t for t in (item.get('title'), (data.get('passage') or {}).get('title')) if t]
    for g in groups:
        g['instruction'] = strip_titles(g.get('instruction', ''), titles)
        for it in g.get('notes', []): it['text'] = strip_titles(it['text'], titles)
        for q in g.get('questions', []):
            q['text'] = strip_titles(q['text'], titles)
            # dạng heading: ô ví dụ ("Answer", "vi") in cạnh cột "Paragraph A"
            m = re.match(r'((?:Paragraph|Section)\s+[A-Z])\s+\S', q['text']) if g['kind'] == 'heading' else None
            if m: q['text'] = m.group(1)
            for o in q.get('options', []): o['t'] = strip_titles(o['t'], titles) or o['t']
        # phương án trùng tên bài (câu "chọn tiêu đề phù hợp nhất") thì giữ nguyên
        for o in g.get('options', []) + g.get('bank', []): o['t'] = strip_titles(o['t'], titles) or o['t']
    return data


def two_columns(text):
    """bài đọc in 2 cột: pdftotext -layout đặt hai cột cạnh nhau trên cùng dòng nên câu chữ bị trộn"""
    rows = re.findall(r'(?m)^[^\S\n]*\S.{18,}?\S[^\S\n]{4,}\S.{15,}$', text)
    return len(rows) >= 15


def strip_titles(t, titles):
    """bỏ tiêu đề bài khi nó bị in lẫn vào đầu/cuối câu (không đụng từ nằm giữa câu)"""
    for ti in titles:
        ti = ti.strip()
        if not ti: continue
        if clean(t).lower() == ti.lower(): return ""
        if len(ti.split()) < 2: continue        # tiêu đề một từ dễ trùng từ trong câu
        m = re.match(r'\s*' + re.escape(ti) + r'\s+', t, re.I)
        # chỉ cắt khi phần còn lại bắt đầu một câu mới (chữ hoa)
        if m and t[m.end():m.end() + 1].isupper(): t = t[m.end():]
        m = re.search(r'\s+' + re.escape(ti) + r'\s*$', t, re.I)
        if m: t = t[:m.start()]
    return clean(t)


def para_matching(g, item, marks):
    """nhóm 'chọn đoạn văn chứa thông tin' — phương án chính là các đoạn A, B, C… nên không có khung riêng"""
    src = next((x for x in item['groups'] if (x['from'], x['to']) == (g['from'], g['to'])), {})
    ab = src.get('letters') or ''
    if len(ab) != 2: return False
    need = {chr(c) for c in range(ord(ab[0]), ord(ab[1]) + 1)}
    if marks and need <= marks: return True
    return bool(re.search(r'(?i)which (paragraph|section)', g.get('instruction', '')))


def check(data, item):
    bad = []
    marks = {p['mark'] for p in (data.get('passage') or {}).get('paras', []) if p['mark']}
    nums = {q['n'] for g in data['groups'] for q in g.get('questions', [])}
    for g in data['groups']:
        if g.get('notes'):
            nums |= {int(n) for it in g['notes'] for n in re.findall(r'{{(\d+)', it['text'])}
    want = {n for g in item['groups'] for n in range(g['from'], g['to'] + 1)}
    if data['kind'] == 'reading' and 'passage' not in data: bad.append('không tách được bài đọc')
    for g in data['groups']:
        if g['kind'] == 'heading' and len(g.get('bank', [])) < (g['to'] - g['from'] + 1): bad.append(f"{g['from']}-{g['to']}: thiếu danh sách heading")
        if g['kind'] == 'multi' and len(g.get('options', [])) < 4: bad.append(f"{g['from']}-{g['to']}: thiếu phương án")
        if g['kind'] == 'letter' and not g.get('bank') and not all(q.get('options') for q in g.get('questions', [])) \
           and not para_matching(g, item, marks):
            bad.append(f"{g['from']}-{g['to']}: thiếu phương án A/B/C")
        for q in g.get('questions', []):
            if not q['text']: bad.append(f"câu {q['n']}: trống")
            if any(not o['t'] for o in q.get('options', [])): bad.append(f"câu {q['n']}: có phương án trống")
            # đề in thêm câu ngoài khoảng của nhóm (vd. nhóm 14-18 mà có câu 19) và đáp án không có câu đó
            m = re.search(r'(?:^|\s)' + str(q['n'] + 1) + r'\s+[A-Za-z]', q['text'])
            if m and str(q['n'] + 1) not in (item.get('key') or {}): bad.append(f"câu {q['n'] + 1} có trong đề nhưng không có đáp án")
        if any(not o['t'] for o in g.get('options', []) + g.get('bank', [])): bad.append(f"{g['from']}-{g['to']}: có phương án trống")
        # dòng câu hỏi (số câu + câu văn) lọt vào phần đề bài: đề in sai số câu hoặc bóc lệch nhóm
        m = re.search(r'(?<![-–\d])\b(\d{1,2})\s+[A-Z`‘\'"][a-z]', g.get('instruction', ''))
        if m: bad.append(f"{g['from']}-{g['to']}: câu {m.group(1)} lọt vào đề bài")
    # đáp án đúng phải nằm trong các lựa chọn hiện ra
    key = item.get('key') or {}
    for g in data['groups']:
        if g['kind'] not in ('letter', 'heading', 'multi'): continue
        shared = {o['v'].lower() for o in g.get('bank', []) + g.get('options', [])}
        if not shared and para_matching(g, item, marks): shared = {m.lower() for m in marks}
        for n in range(g['from'], g['to'] + 1):
            q = next((x for x in g.get('questions', []) if x['n'] == n), {})
            vs = {o['v'].lower() for o in q.get('options', [])} or shared
            ans = key.get(str(n)) or []
            if g['kind'] == 'multi':
                ans = [a for n2 in range(g['from'], g['to'] + 1) for a in key.get(str(n2)) or []]
            if vs and ans and not all(v in vs for a in ans for v in re.split(r'\s*[,&]\s*|\s+and\s+', a.lower()) if v):
                bad.append(f"câu {n}: đáp án {ans} không có trong lựa chọn"); break
    for p in (data.get('passage') or {}).get('paras', []):
        # đoạn văn nuốt cả mốc đoạn sau: "...games. F The players..." -> tách đoạn sai
        nxt = chr(ord(p['mark']) + 1) if p['mark'] and p['mark'] < 'J' else ''
        if nxt and re.search(r'[.!?\'"”’]\s' + '[' + nxt + r'-J]' + r'\s[A-Z‘“"\'`]', p['text']):
            bad.append(f"đoạn {p['mark']} lẫn mốc đoạn sau"); break
    if data.get('columns') == 2: bad.append('bài đọc in 2 cột, không tách được đoạn')
    miss = sorted(want - nums - {n for g in data['groups'] if g['kind'] == 'multi' for n in range(g['from'], g['to'] + 1)})
    if miss: bad.append(f'thiếu câu {miss}')
    return bad


def main():
    iid = sys.argv[1]
    reading = js_items('bank-reading.js', 'READING_BANK')
    listening = js_items('bank-listening.js', 'LISTENING_BANK')
    sections = js_items('bank-listening.js', 'LISTENING_SECTIONS')
    item = next((x for x in reading if x['id'] == iid), None)
    if item:
        kind = 'reading'
    else:
        item = next((x for x in listening + sections if x['id'] == iid), None)
        if not item: raise SystemExit('không có bài id này')
        kind = 'section' if 'section' in item else 'listening'
    text = raw_text(kind, item)
    data = build(item, kind, text)
    bad = check(data, item)
    print(json.dumps(data, ensure_ascii=False, indent=1))
    print('\n--- kiểm tra:', 'ĐẠT' if not bad else bad, file=sys.stderr)
    if '--save' in sys.argv and not bad:
        os.makedirs(os.path.join(T, 'interactive'), exist_ok=True)
        json.dump(data, open(os.path.join(T, 'interactive', iid + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print('đã ghi interactive/' + iid + '.json', file=sys.stderr)


if __name__ == '__main__':
    main()
