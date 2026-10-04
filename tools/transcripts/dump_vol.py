# Trích đáp án + đề Listening VOL 8, VOL 9 (ORIGINAL EXAMS) -> ls/vol.json
import os, re, json, zipfile, html, glob, unicodedata
ROOT = r'C:\Users\Admin\OneDrive\2. IELTS\VOL 1-9 2'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ls')
os.makedirs(OUT, exist_ok=True)
nfc = lambda s: unicodedata.normalize('NFC', s)


def docx_text(p):
    x = zipfile.ZipFile(p).read('word/document.xml').decode('utf8')
    x = re.sub(r'</w:p>', '\n', x); x = re.sub(r'<w:tab/>', '\t', x); x = re.sub(r'<w:br/>', '\n', x)
    return html.unescape(re.sub(r'<[^>]+>', '', x))


def parse_key(t):
    """'Câu số N:' + dòng đáp án (các đáp án chấp nhận ngăn bằng dấu phẩy)."""
    out = {}
    lines = [l.strip() for l in t.splitlines()]
    for i, l in enumerate(lines):
        m = re.match(r'^Câu\s*số\s*(\d{1,2})(?:\s*(?:[-–&]|và|and)\s*(\d{1,2}))?\s*[:.]?\s*(.*)$', l, re.I)
        if not m: continue
        rest = m.group(3).strip()
        j = i + 1
        while not rest and j < len(lines):
            if lines[j] and lines[j] != '...': rest = lines[j]
            j += 1
        nums = [int(m.group(1))] + ([int(m.group(2))] if m.group(2) else [])
        if len(nums) == 2: nums = list(range(nums[0], nums[1] + 1))
        for n in nums: out.setdefault(n, rest)
    if out: return out
    # Kiểu bảng: "SECTION 1..4" rồi 40 đáp án theo thứ tự câu, kết thúc trước "TRANSCRIPT"
    body = t[:t.upper().find('TRANSCRIPT', t.upper().find('KEY') + 3)] if 'TRANSCRIPT' in t.upper() else t
    vals = [l for l in lines if l and not re.match(r'^(SECTION|PART)\s*\d|^VOL\s*\d|KEY$|^\.\.\.$', l, re.I)]
    vals = [l for l in (x.strip() for x in body.splitlines()) if l and not re.match(r'^(SECTION|PART)\s*\d|^VOL\s*\d.*KEY|^\.\.\.$', l, re.I)]
    if len(vals) >= 40:
        return {i + 1: v for i, v in enumerate(vals[:40])}
    return out


rel = lambda p: nfc(os.path.relpath(p, ROOT).replace('\\', '/'))
res = {}
for vol, keydir, paper_glob, audio_glob in [
    (8, 'VOL 8 - ORIGINAL EXAMS/LISTENING/TRANSCRIPT-KEY', 'VOL 8 - ORIGINAL EXAMS/LISTENING/VOL 8 TEST {n} LIS.docx', 'VOL 8 - ORIGINAL EXAMS/LISTENING/AUDIO/TEST {n} VOL 8.mp4'),
    (9, 'VOL 9 - ORIGINAL EXAMS/LISTENING/KEY - TRANSCRIPT', 'VOL 9 - ORIGINAL EXAMS/LISTENING/TEST {n}-L.docx', 'VOL 9 - ORIGINAL EXAMS/LISTENING/AUDIO/TEST {n}.mp4'),
]:
    for n in range(1, 9):
        kf = [f for f in glob.glob(os.path.join(ROOT, keydir, '*.docx')) if re.search(rf'TEST {n}\b', os.path.basename(f), re.I)]
        pf = glob.glob(os.path.join(ROOT, paper_glob.format(n=n)))
        af = glob.glob(os.path.join(ROOT, audio_glob.format(n=n)))
        tid = f'vol{vol}-{n:02d}'
        key = parse_key(docx_text(kf[0])) if len(kf) == 1 else {}
        paper = docx_text(pf[0]) if pf else ''
        open(os.path.join(OUT, f'{tid}-paper.txt'), 'w', encoding='utf8').write(paper)
        res[tid] = {'key_file': rel(kf[0]) if len(kf) == 1 else None, 'paper': rel(pf[0]) if pf else None,
                    'audio': rel(af[0]) if af else None, 'key': key}
        missing = [q for q in range(1, 41) if q not in key]
        print(tid, 'paper' if pf else 'NO PAPER', 'audio' if af else 'NO AUDIO', f'{len(key)} answers', f'missing {missing}' if missing else '')
json.dump(res, open(os.path.join(OUT, 'vol.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
