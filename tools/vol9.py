# Đọc đề và đáp án Reading VOL 9 (file .docx) — dùng chung cho dump/gen.
#   VOL 9 - ORIGINAL EXAMS/READING/TEST n -R.docx        đề: 3 passage, câu 1-40
#   VOL 9 - ORIGINAL EXAMS/READING/KEY - EXPLAINATION/   đáp án: "Câu số n:" hoặc danh sách 40 dòng
import os, re, zipfile, html, glob, unicodedata

VROOT = r'C:\Users\Admin\OneDrive\2. IELTS\VOL 1-9 2\VOL 9 - ORIGINAL EXAMS\READING'
DASH = r'[-–—−]'


def docx_text(p):
    x = zipfile.ZipFile(p).read('word/document.xml').decode('utf8')
    x = re.sub(r'</w:p>', '\n', x)
    x = re.sub(r'<w:tab/>', '\t', x)
    x = re.sub(r'<w:br/>', '\n', x)
    t = html.unescape(re.sub(r'<[^>]+>', '', x))
    return unicodedata.normalize('NFC', t).replace('\u00a0', ' ')


def paper(n):
    f = glob.glob(os.path.join(VROOT, f'TEST {n} -R.docx')) or glob.glob(os.path.join(VROOT, f'TEST {n}-R.docx'))
    return docx_text(f[0])


def keytext(n):
    d = os.path.join(VROOT, 'KEY - EXPLAINATION')
    f = [x for x in glob.glob(os.path.join(d, '*.docx'))
         if re.search(r'TEST\s*' + str(n) + r'\s*-\s*R\b', os.path.basename(x), re.I)]
    return docx_text(f[0]) if f else ''


def passages(t):
    """[(số passage, chữ)] — cắt theo dòng 'PASSAGE n'"""
    hits = [(m.start(), int(m.group(1))) for m in re.finditer(r'(?im)^[^\S\n]*PASSAGE\s+([123])\b', t)]
    out = []
    for i, (pos, num) in enumerate(hits):
        end = hits[i + 1][0] if i + 1 < len(hits) else len(t)
        out.append((num, t[pos:end]))
    return out


def title_of(block):
    """tiêu đề bài đọc: dòng ngay sau 'Read the text and answer questions x-y'"""
    lines = [re.sub(r'^[^0-9A-Za-z]+', '', l).strip() for l in block.split('\n')]
    pick = ''
    for i, l in enumerate(lines):
        if re.search(r'(?i)read the (text|passage)', l):
            tail = re.sub(r'(?i)^.*?read the (text|passage)[^\n]*', '', l).strip()
            for nxt in ([tail] if tail else []) + lines[i + 1:]:
                if nxt and not re.match(r'(?i)^(questions?\b|\d{1,2}[\s.)_])', nxt): pick = nxt; break
            break
    if not pick:
        for l in lines[1:]:
            if l and not re.match(r'(?i)^(read|questions?|passage|\d)', l): pick = l; break
    # tiêu đề dính liền câu giới thiệu: "…in LondonThis exhibition promises…"
    if len(pick) > 55:
        m = re.search(r'(?<=[a-z])(?=[A-Z])', pick[20:])
        if m: pick = pick[:20 + m.start()]
    return pick.strip()


HEAD = re.compile(r'(?i)^(vol\s*\d|passage\s*[123]\b|test\s*\d|key\b|đáp án|answers?\b)')
STOP = re.compile(r'(?i)^(vol\s*\d+\s*test\s*\d+\s*explanation|explanation|giải thích)')
FILLER = re.compile(r'^[.\-–—…\s]*$')


def keys(n):
    """{số câu: đáp án} — chấp nhận cả kiểu "Câu số 7:" lẫn danh sách 40 dòng liền"""
    out, q = {}, 1
    lines = [l.strip() for l in keytext(n).split('\n')]
    i, started = 0, False
    while i < len(lines):
        l = lines[i]; i += 1
        if not l or FILLER.match(l): continue
        if STOP.match(l) and started: break
        m = re.match(r'(?i)^câu\s*(?:số|hỏi)?\s*(\d{1,2})(?:\s*' + DASH + r'\s*(\d{1,2}))?\s*:?\s*(.*)$', l)
        if m:
            a, b = int(m.group(1)), int(m.group(2) or m.group(1))
            v = m.group(3).strip()
            while not v and i < len(lines):
                nxt = lines[i].strip(); i += 1
                if nxt and not FILLER.match(nxt): v = nxt
            for x in range(a, b + 1): out[x] = clean_ans(v)
            q = b + 1; started = True; continue
        if HEAD.match(l): continue
        m = re.match(r'^(\d{1,2})\s*' + DASH + r'\s*(\d{1,2})\.?\s*(.+)$', l)   # "24-26. A, B, D"
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            v = ','.join(x.strip() for x in re.split(r'[,/&]| and ', m.group(3)) if x.strip())
            for x in range(a, b + 1): out[x] = v
            q = b + 1; started = True; continue
        out[q] = clean_ans(l); q += 1; started = True
    return {k: v for k, v in out.items() if 1 <= k <= 40 and v}


def clean_ans(v):
    """"D wood" -> D · "vii An uncertain future" -> vii · bỏ chú thích trong ngoặc"""
    v = re.sub(r'\s+', ' ', v).strip().strip('.').strip()
    v = re.sub(r'\s*\(.*$', '', v).strip()
    m = re.match(r'^([A-K])\s+\S', v)
    if m: return m.group(1)
    m = re.match(r'(?i)^(xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\s+\S', v)
    if m: return m.group(1).lower()
    m = re.match(r'^([A-K](?:\s*,\s*[A-K])+)$', v)
    if m: return ','.join(re.findall(r'[A-K]', m.group(1)))
    return v
