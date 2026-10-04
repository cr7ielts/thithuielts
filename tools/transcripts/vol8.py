# Đọc đề Reading VOL 8 (PDF có chữ) và đáp án (Key.pdf là ảnh chụp Google Docs nên phải OCR).
#   Đề:      VOL 8 - ORIGINAL EXAMS/READING/Test n.pdf   — 3 passage, câu 1-40
#   Đáp án:  tools/key8_ocr.txt — sinh bằng tools/ocr_key8.py (rapidocr); chỉ có Test 1-8
import os, re, subprocess

VROOT = r'C:\Users\Admin\OneDrive\2. IELTS\VOL 1-9 2\VOL 8 - ORIGINAL EXAMS\READING'
T = os.path.dirname(os.path.abspath(__file__))
KEYFILE = os.path.join(T, 'key8_ocr.txt')
DASH = r'[-–—−]'
SPANS = [(1, 13), (14, 26), (27, 40)]


def paper(n):
    f = os.path.join(VROOT, f'Test {n}.pdf')
    if not os.path.exists(f) and n == 11: f = os.path.join(VROOT, 'Tets 11.pdf')
    return subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True).stdout.decode('utf8', 'replace')


def heads(t):
    """[(vị trí, câu đầu, câu cuối)] của các dòng 'Questions a-b'"""
    out = []
    for m in re.finditer(r'(?im)^[^\S\n]*Questions?\s+(\d{1,2})\s*(?:' + DASH + r'|to|and|&)\s*(\d{1,2})\b.*$', t):
        a, b = int(m.group(1)), int(m.group(2))
        if a < b <= 40 and b - a <= 20: out.append((m.start(), a, b))
    return out


def passages(t):
    """[(số passage, chữ)] — đề VOL 8 không ghi 'PASSAGE n' nên cắt theo dải câu hỏi.
    Bài đọc của passage sau nằm giữa nhóm câu cuối của passage trước và nhóm câu đầu
    của chính nó: tìm chỗ bắt đầu một loạt dòng dài (đoạn văn) sau dòng 'Questions…'."""
    hs = heads(t)
    out = []
    for i, (lo, hi) in enumerate(SPANS):
        mine = [h for h in hs if lo <= h[1] <= hi]
        if not mine: continue
        later = [h for h in hs if h[1] > hi]
        end = later[0][0] if later else len(t)
        start = 0
        if i:
            prev = [h for h in hs if h[1] < lo]
            lo0 = prev[0][0] if prev else 0
            start = lo0 + body_start(t[lo0:mine[0][0]])
        out.append((i + 1, t[start:end]))
    return out


def body_start(region):
    """vị trí bắt đầu bài đọc trong đoạn chữ giữa hai nhóm câu hỏi.
    Bài đọc = một loạt dòng dài KHÔNG phải dòng câu hỏi đánh số hay dòng có chỗ trống."""
    lines = [(m.start(), m.group(0)) for m in re.finditer(r'(?m)^.*$', region)]
    heads_idx = [k for k, (_, l) in enumerate(lines) if re.match(r'(?i)^[^\S\n]*questions?\s+\d', l)]
    k0 = heads_idx[-1] + 1 if heads_idx else 0

    def prose(l):
        l = l.strip()
        return (len(l) >= 60 and '_' not in l and not l[:1].isdigit()
                and not re.match(r'^[\u2022\ufffd*\-]\s', l))

    for k in range(k0, len(lines)):
        nxt = [l for _, l in lines[k:k + 6] if l.strip()]
        if len(nxt) >= 4 and sum(1 for l in nxt if prose(l)) >= 4:
            # lùi tối đa 2 dòng để lấy cả tiêu đề, không lùi qua dòng câu hỏi còn sót
            j = k
            while j > k0 and k - j < 2:
                pv = lines[j - 1][1].strip()
                if not pv or len(pv) > 90 or '_' in pv or pv[:1].isdigit(): break
                j -= 1
            return lines[j][0]
    return lines[k0][0] if k0 < len(lines) else 0


SKIP_TITLE = re.compile(r'(?i)^(questions?|reading passage|you should spend|choose|write|complete|look at|match|'
                        r'do the following|which paragraph|read the|true|false|not given|yes\b|no\b|list of)')


def title_of(block):
    for ln in block.split('\n'):
        s = re.sub(r'^[^0-9A-Za-z]+', '', ln).strip()
        if not 4 <= len(s) <= 90 or SKIP_TITLE.match(s): continue
        if '_' in s or s[:1].isdigit() or not re.search(r'[A-Za-z]{3}', s): continue
        return s
    return ''


# ---------------- đáp án từ bản OCR ----------------
TAB = re.compile(r'(?i)\bTEST\s*\d{1,2}\b')
NUMLINE = re.compile(r'^(\d{1,2})[.)]\s*(.*)$')


def ocr_lines(page):
    """gộp các ô chữ cùng một dòng (chênh lệch toạ độ dọc <= 6) thành một dòng"""
    out = []
    for l in page.split('\n'):
        if '\t' not in l: continue
        y, t = l.split('\t', 1)
        y, t = int(y), t.strip()
        if out and abs(out[-1][0] - y) <= 6 and not NUMLINE.match(t):
            out[-1] = (out[-1][0], out[-1][1] + ' ' + t)
        else:
            out.append((y, t))
    return [t for _, t in out]


def answer_of(rest):
    """phần đứng trước dấu hai chấm là đáp án; bỏ chữ của thanh bên (TEST n)"""
    rest = TAB.sub(' ', rest).strip()
    m = re.match(r'^([^:]{1,40}?)\s*:', rest)
    v = (m.group(1) if m else rest).strip(' .,')
    if len(v.split()) > 4 or not re.search(r'[A-Za-z0-9]', v): return ''   # đáp án có thể là số (296, 1806)
    return v


def keys():
    """{số đề: {số câu: đáp án}}.

    File đáp án là ảnh chụp Google Docs nên không biết mỗi trang thuộc đề nào.
    Cách làm: ghép các câu trả lời theo thứ tự, cắt thành từng đoạn mỗi khi số câu
    giảm (sang đề mới), rồi đối chiếu các từ điền của đoạn đó với chữ trong từng
    file đề để biết đoạn ấy là đề số mấy.
    """
    if not os.path.exists(KEYFILE): return {}
    txt = open(KEYFILE, encoding='utf8').read()
    seq = []
    for page in txt.split('===== TRANG ')[1:]:
        for ln in ocr_lines(page):
            m = NUMLINE.match(ln)
            if not m: continue
            n, v = int(m.group(1)), answer_of(m.group(2))
            # chỉ nhận dòng có số câu rõ ràng; câu nào OCR sót thì để thiếu,
            # thà thiếu còn hơn đoán sai đáp án
            if 1 <= n <= 40 and v: seq.append((n, v))

    runs, cur = [], []
    for n, v in seq:
        if cur and n < cur[-1][0]: runs.append(cur); cur = []
        cur.append((n, v))
    if cur: runs.append(cur)

    flat = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    fixed = re.compile(r'(?i)^(true|false|not given|ng|yes|no|[a-l]|[ivx]+)$')
    papers = {}
    out = {}
    for run in runs:
        k = {}
        for n, v in run: k.setdefault(n, v)
        if len(k) < 25: continue                      # đoạn vụn, bỏ
        words = [v for v in k.values() if len(v) > 3 and not fixed.match(v)]
        if not words: continue
        best, score = None, 0
        for n in range(1, 13):
            if n not in papers: papers[n] = flat(paper(n))
            hit = sum(1 for w in words if flat(w) in papers[n])
            if hit > score: best, score = n, hit
        # phải khớp rõ ràng mới nhận (ít nhất 2/3 số từ điền nằm trong đúng đề đó)
        if best and score >= max(3, len(words) * 2 // 3): out[best] = k
    return out
