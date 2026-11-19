# NHẬP ĐỀ MỚI vào ngân hàng đề (cap-nhat-de.cmd gọi script này)
#
#   python import_new.py                  # xem thử: đọc thư mục đề mới, in báo cáo, không ghi gì
#   python import_new.py --save           # ghi vào ngân hàng đề + dời thư mục đã nhập sang "_DA NHAP"
#   python import_new.py --inbox "D:\..." # dùng thư mục khác (mặc định: OneDrive\2. IELTS\DE MOI)
#
# Cách xếp file trong thư mục đề mới (mỗi đề / mỗi bài một thư mục con, tên thư mục = tên hiển thị):
#   DE MOI\READING\Vol 10 Test 1\      đề (.docx hoặc .pdf, 1–3 passage) + đáp án (tên file có chữ key / dap an / answer)
#   DE MOI\LISTENING\Vol 10 Test 1\    đề (.docx/.pdf, 4 section) + đáp án + 4 file audio (tên có số 1..4,
#                                      vd "Part 1.mp3", "Section 2.mp3") — audio cả đề 1 file thì cắt trước thành 4 file
# Đáp án: danh sách theo số câu, mỗi dòng một câu ("1. TRUE", "Câu 14: vii", "24-26 A, C, E" …).
#
# Kết quả:
#   Reading   -> js/data/bank-extra.js (EXTRA_READING) + tools/txt/<id>.txt + tools/interactive/<id>.json
#   Listening -> js/data/bank-listening-new.js (NEW_LISTENING_BANK / NEW_LISTENING_SECTIONS)
#                + audio chép vào media/listening/<id>/ (đưa lên web cùng deploy.cmd, không cần trang Tải file)
# Bài nào không đọc chắc chắn được (thiếu đáp án, không nhận ra nhóm câu hỏi, bảng bị lỗi chữ…) thì KHÔNG nhập,
# được liệt kê trong báo cáo để giáo viên / Claude xử lý tay. Thư mục đó vẫn nằm lại trong DE MOI.
import json, os, re, sys, shutil, zipfile, html, unicodedata, datetime

import parse_reading as P
import extract_interactive as E
import vol9
from gen_vol9 import group_dict, refine, check, alts, slug, ROMANS

T = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(T)
INBOX = r'C:\Users\Admin\OneDrive\2. IELTS\DE MOI'
AUDIO = ('.mp3', '.m4a', '.wav', '.wma', '.aac', '.ogg')
nfc = lambda s: unicodedata.normalize('NFC', s)


# ---------------- đọc file ----------------
def docx_text(p):
    x = zipfile.ZipFile(p).read('word/document.xml').decode('utf8')
    x = re.sub(r'</w:p>', '\n', x); x = re.sub(r'<w:tab/>', '\t', x); x = re.sub(r'<w:br/>', '\n', x)
    return nfc(html.unescape(re.sub(r'<[^>]+>', '', x))).replace('\u00a0', ' ')


def file_text(p):
    ext = os.path.splitext(p)[1].lower()
    if ext == '.docx': return docx_text(p)
    if ext == '.pdf': return nfc(E.pdftext(p))
    if ext == '.txt': return nfc(open(p, encoding='utf8', errors='replace').read())
    return ''


def is_key(name):
    return bool(re.search(r'(?i)key|đáp\s*án|dap\s*an|answer|giải thích|explain', nfc(name)))


def split_files(d):
    fs = sorted(os.listdir(d))
    docs = [f for f in fs if os.path.splitext(f)[1].lower() in ('.docx', '.pdf', '.txt') and not f.startswith('~$')]
    keys = [os.path.join(d, f) for f in docs if is_key(f)]
    papers = [os.path.join(d, f) for f in docs if not is_key(f)]
    audio = [os.path.join(d, f) for f in fs if os.path.splitext(f)[1].lower() in AUDIO]
    return papers, keys, audio


def parse_keys(text):
    """đáp án theo số câu — dùng lại bộ đọc đáp án của VOL 9 (chấp nhận 'Câu 7:', '7. A', '24-26 A, C, E', danh sách 40 dòng)"""
    lines = []
    for l in text.split('\n'):
        l = re.sub(r'^\s*(?:Q\.?|Question)\s*(\d)', r'\1', l.strip(), flags=re.I)
        m = re.match(r'^(\d{1,2})\s*[.):]\s*(.+)$', l)          # "7. TRUE" / "7) TRUE" -> kiểu "Câu 7:"
        lines.append(f'Câu {m.group(1)}: {m.group(2)}' if m else l)
    old = vol9.keytext
    vol9.keytext = lambda n: '\n'.join(lines)
    try: return vol9.keys(0)
    finally: vol9.keytext = old


def setname_of(folder):
    """"Vol 10 Test 1" -> ("Actual Test Vol 10", "Test 1") · tên khác -> ("Đề mới", tên thư mục)"""
    m = re.match(r'(?i)^\s*(?:actual\s*test\s*)?vol(?:ume)?\.?\s*(\d+)\s*[-–_ ]*\s*test\s*(\d+)', folder)
    if m: return f'Actual Test Vol {m.group(1)}', f'Test {m.group(2)}'
    return 'Đề mới', folder.strip()


def existing_ids():
    ids = set()
    for f, c in [('bank-reading.js', 'READING_BANK'), ('bank-vol8.js', 'VOL8_READING'), ('bank-vol9.js', 'VOL9_READING'),
                 ('bank-extra.js', 'EXTRA_READING'), ('bank-listening.js', 'LISTENING_BANK'), ('bank-listening.js', 'LISTENING_SECTIONS'),
                 ('bank-listening-new.js', 'NEW_LISTENING_BANK'), ('bank-listening-new.js', 'NEW_LISTENING_SECTIONS')]:
        try: ids |= {x['id'] for x in E.js_items(f, c)}
        except (IndexError, FileNotFoundError): pass
    return ids


BAD_CHARS = re.compile('[\ufffd\uf0b7\uf0a7\uf076\uf0d8]')   # ký tự hỏng / ký hiệu Wingdings khi bảng bị đọc sai


def build_interactive(kind, item, text):
    """bóc nội dung làm trên máy; trả (data, lỗi)"""
    os.makedirs(os.path.join(T, 'txt'), exist_ok=True)
    cache = os.path.join(T, 'txt', item['id'] + '.txt')
    open(cache, 'w', encoding='utf8', newline='\n').write(text)
    try:
        data = E.build(item, kind, E.drop_junk(text))
        bad = E.check(data, item)
    except Exception as ex:
        data, bad = None, [f'lỗi bóc nội dung: {type(ex).__name__}: {ex}']
    if data and BAD_CHARS.search(json.dumps(data, ensure_ascii=False)):
        bad = (bad or []) + ['có ký tự hỏng (bảng / gạch đầu dòng đọc sai) — cần sửa tay']
    if bad: os.remove(cache)
    return data, bad


# ---------------- READING ----------------
def reading_folder(d, have):
    """-> [(item, data)], [lỗi]"""
    name = os.path.basename(d)
    papers, keys, _ = split_files(d)
    if not papers: return [], ['không thấy file đề (.docx/.pdf)']
    if not keys: return [], ['không thấy file đáp án (tên file cần có chữ key / dap an / answer)']
    text = '\n'.join(file_text(p) for p in papers)
    key = {}
    for k in keys: key.update(parse_keys(file_text(k)))
    if not key: return [], ['không đọc được đáp án']
    romans = re.findall(r'(?m)^\s*(' + P.ROMAN_RE + r')\s{1,}[A-Z]', text)
    hmax = max([ROMANS.index(r.lower()) + 1 for r in romans if r.lower() in ROMANS] or [10])
    blocks = vol9.passages(text)
    if not blocks:   # một passage, không có dòng "PASSAGE n": đoán số passage theo số câu
        gs = P.pdf_groups(text)
        lo = min((a for a, *_ in gs), default=1)
        blocks = [(1 if lo <= 13 else 2 if lo <= 27 else 3, text)]
    setname, test = setname_of(name)
    out, errs = [], []
    for num, block in blocks:
        gs = P.pdf_groups(block)
        if not gs: errs.append(f'passage {num}: không thấy nhóm câu hỏi ("Questions x-y")'); continue
        title = vol9.title_of(block) or f'{name} · Passage {num}'
        groups = refine([group_dict(a, b, kd, ins, hmax) for a, b, kd, ins in gs], key)
        for g, (a, b, kd, ins) in zip(groups, gs):
            if g['kind'] != kd: g.update(group_dict(g['from'], g['to'], g['kind'], ins, hmax))
        lo, hi = groups[0]['from'], groups[-1]['to']
        kind_of = lambda q: next((g['kind'] for g in groups if g['from'] <= q <= g['to']), 'other')
        item = {'id': f'p{num}-{slug(title)}', 'part': num, 'title': title, 'set': setname, 'testTitle': test, 'files': [],
                'groups': groups, 'key': {str(q): (alts(key[q]) if kind_of(q) == 'gap' else [key[q]]) for q in range(lo, hi + 1) if q in key}}
        bad = check(item, block, key)
        if item['id'] in have: bad = [f'trùng bài đã có ({item["id"]})']
        if bad: errs.append(f'passage {num} "{title}": ' + '; '.join(bad)[:200]); continue
        data, bad = build_interactive('reading', item, block)
        if bad: errs.append(f'passage {num} "{title}": ' + '; '.join(bad)[:200]); continue
        out.append((item, data))
    return out, errs


# ---------------- LISTENING ----------------
SEC = re.compile(r'(?im)^[^\S\n]*(?:SECTION|PART)\s+([1-4])\b')


def audio_for(audio, k):
    """file audio của section k: tên có số k (Part 1, Section 1, S1, P1, _1 …)"""
    for a in audio:
        b = os.path.splitext(os.path.basename(a))[0]
        if re.search(rf'(?i)(?:part|section|sec|s|p|phần)\s*0?{k}\b', b) or re.fullmatch(rf'\D*0?{k}', b): return a
    return None


def listening_folder(d, have):
    """-> (bài cả đề, [section], {đường dẫn audio nguồn: đích}), [lỗi]"""
    name = os.path.basename(d)
    papers, keys, audio = split_files(d)
    if not papers: return None, ['không thấy file đề (.docx/.pdf)']
    if not keys: return None, ['không thấy file đáp án']
    srcs = [audio_for(audio, k) for k in range(1, 5)]
    if not all(srcs):
        return None, [f'cần 4 file audio có số 1–4 trong tên (đang có {len(audio)} file' + (': cắt audio cả đề thành 4 phần trước' if len(audio) == 1 else '') + ')']
    text = '\n'.join(file_text(p) for p in papers)
    key = {}
    for k in keys: key.update(parse_keys(file_text(k)))
    if len(key) < 40: return None, [f'đáp án chỉ có {len(key)}/40 câu']
    setname, test = setname_of(name)
    tid = slug(f'{setname} {test}' if setname != 'Đề mới' else name)
    if tid in have: return None, [f'trùng đề đã có ({tid})']
    hits = [(m.start(), int(m.group(1))) for m in SEC.finditer(text)]
    parts = {}
    for i, (pos, k) in enumerate(hits):
        parts.setdefault(k, text[pos:hits[i + 1][0] if i + 1 < len(hits) else len(text)])
    if sorted(parts) != [1, 2, 3, 4]: return None, ['không tách được 4 section trong đề (cần dòng "SECTION 1"… hoặc "PART 1"…)']
    copies, secs, errs = {}, [], []
    for k in range(1, 5):
        block = parts[k]
        gs = P.pdf_groups(block)
        groups = refine([group_dict(a, b, kd, ins, 10) for a, b, kd, ins in gs], key)
        if not groups or groups[0]['from'] != (k - 1) * 10 + 1 or groups[-1]['to'] != k * 10:
            errs.append(f'section {k}: nhóm câu hỏi không đủ {(k - 1) * 10 + 1}–{k * 10}'); continue
        kind_of = lambda q: next((g['kind'] for g in groups if g['from'] <= q <= g['to']), 'other')
        ext = os.path.splitext(srcs[k - 1])[1].lower()
        path = f'media/listening/{tid}/audio-{k}{ext}'
        copies[srcs[k - 1]] = os.path.join(PROJ, *path.split('/'))
        lines = [l.strip() for l in block.split('\n')[1:] if l.strip() and not re.match(r'(?i)^questions?\b', l.strip())]
        sec = {'id': f'{tid}-s{k}', 'test': tid, 'set': setname, 'testTitle': test, 'section': k,
               'title': (lines[0][:80] if lines else f'Section {k}'),
               'files': [{'src': '', 'path': path, 'type': 'audio', 'label': f'Section {k}'}],
               'groups': groups, 'key': {str(q): (alts(key[q]) if kind_of(q) == 'gap' else [key[q]]) for q in range((k - 1) * 10 + 1, k * 10 + 1) if q in key}}
        data, bad = build_interactive('section', sec, block)
        if bad: errs.append(f'section {k}: ' + '; '.join(bad)[:200]); continue
        secs.append((sec, data))
    drop = lambda ids: [os.remove(c) for c in (os.path.join(T, 'txt', i + '.txt') for i in ids) if os.path.exists(c)]
    if errs: drop([s['id'] for s, _ in secs]); return None, errs
    full = {'id': tid, 'set': setname, 'title': test, 'files': [f for s, _ in secs for f in s['files']],
            'groups': [g for s, _ in secs for g in s['groups']], 'key': {q: v for s, _ in secs for q, v in s['key'].items()}}
    fdata, bad = build_interactive('listening', full, text)
    if bad: drop([s['id'] for s, _ in secs]); return None, ['cả đề: ' + '; '.join(bad)[:200]]
    return (full, fdata, secs, copies), []


# ---------------- ghi kết quả ----------------
def write_js(path, header, consts):
    lines = ['// =====================================================================', *[f'//  {h}' for h in header],
             '// =====================================================================']
    for name, items in consts:
        lines.append(f'export const {name} = [')
        lines += ['  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) + ',' for x in items]
        lines.append('];')
    open(path, 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')


def save_interactive(item_id, data):
    os.makedirs(os.path.join(T, 'interactive'), exist_ok=True)
    json.dump(data, open(os.path.join(T, 'interactive', item_id + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)


def main():
    save = '--save' in sys.argv
    inbox = sys.argv[sys.argv.index('--inbox') + 1] if '--inbox' in sys.argv else INBOX
    if not os.path.isdir(inbox):
        os.makedirs(os.path.join(inbox, 'READING'), exist_ok=True)
        os.makedirs(os.path.join(inbox, 'LISTENING'), exist_ok=True)
        print(f'Đã tạo thư mục đề mới: {inbox}\n  Bỏ đề vào READING\\<tên đề>\\ hoặc LISTENING\\<tên đề>\\ rồi chạy lại.')
        return 0
    have = existing_ids()
    done_dirs, report = [], []
    new_read, new_lt, new_ls, copies = [], [], [], {}

    rdir = os.path.join(inbox, 'READING')
    for f in sorted(os.listdir(rdir)) if os.path.isdir(rdir) else []:
        d = os.path.join(rdir, f)
        if not os.path.isdir(d) or f.startswith('_'): continue
        ok, errs = reading_folder(d, have)
        report.append(f'READING  {f}: nhập {len(ok)} passage' + (f' · LỖI: ' + ' | '.join(errs) if errs else ''))
        for item, data in ok:
            new_read.append(item); have.add(item['id'])
            if save: save_interactive(item['id'], data)
        if ok and not errs: done_dirs.append(d)

    ldir = os.path.join(inbox, 'LISTENING')
    for f in sorted(os.listdir(ldir)) if os.path.isdir(ldir) else []:
        d = os.path.join(ldir, f)
        if not os.path.isdir(d) or f.startswith('_'): continue
        res, errs = listening_folder(d, have)
        if errs: report.append(f'LISTENING {f}: KHÔNG nhập · LỖI: ' + ' | '.join(errs)); continue
        full, fdata, secs, cp = res
        report.append(f'LISTENING {f}: nhập cả đề + 4 section ({full["id"]})')
        new_lt.append(full); have.add(full['id'])
        new_ls += [s for s, _ in secs]
        copies.update(cp)
        if save:
            save_interactive(full['id'], fdata)
            for s, data in secs: save_interactive(s['id'], data)
        done_dirs.append(d)

    print('\n'.join(report) if report else 'Thư mục đề mới đang trống.')
    total = len(new_read) + len(new_lt)
    if not save:
        for x in new_read + new_lt + new_ls:
            c = os.path.join(T, 'txt', x['id'] + '.txt')
            if os.path.exists(c) and x['id'] not in existing_ids(): os.remove(c)
        print(f'\n(xem thử) sẽ nhập {len(new_read)} passage Reading, {len(new_lt)} đề Listening. Chạy với --save để ghi.')
        return 0
    if not total:
        print('\nKhông có bài mới nào nhập được.')
        return 0

    # Reading: nối vào bank-extra.js
    old = E.js_items('bank-extra.js', 'EXTRA_READING')
    if new_read: write_js(os.path.join(PROJ, 'js', 'data', 'bank-extra.js'),
             ['NGÂN HÀNG ĐỀ READING — ĐỀ SƯU TẦM / ĐỀ MỚI (không có trong sách Cambridge / VOL 1-9)',
              'Đề sưu tầm: thêm tay. Đề mới: tools/import_new.py (cap-nhat-de.cmd). Không có PDF nên làm thẳng trên web (files: []);',
              'nội dung hiển thị ở js/data/interactive/<id>.json, giải thích ở js/data/explain/<id>.json'],
             [('EXTRA_READING', old + new_read)])
    # Listening: bank-listening-new.js
    if new_lt:
        try:
            lt, ls = E.js_items('bank-listening-new.js', 'NEW_LISTENING_BANK'), E.js_items('bank-listening-new.js', 'NEW_LISTENING_SECTIONS')
        except (IndexError, FileNotFoundError):
            lt, ls = [], []
        write_js(os.path.join(PROJ, 'js', 'data', 'bank-listening-new.js'),
                 ['NGÂN HÀNG ĐỀ LISTENING — ĐỀ MỚI (tools/import_new.py, cap-nhat-de.cmd)',
                  'Audio ở media/listening/<id>/ (đưa lên hosting cùng deploy.cmd, không qua Firebase Storage).'],
                 [('NEW_LISTENING_BANK', lt + new_lt), ('NEW_LISTENING_SECTIONS', ls + new_ls)])
        for src, dst in copies.items():
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    # dời thư mục đã nhập xong
    stamp = datetime.date.today().isoformat()
    for d in done_dirs:
        dst = os.path.join(inbox, '_DA NHAP', stamp, os.path.basename(os.path.dirname(d)), os.path.basename(d))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(d, dst)
    print(f'\nĐÃ NHẬP {len(new_read)} passage Reading, {len(new_lt)} đề Listening. Thư mục đã nhập chuyển sang "_DA NHAP\\{stamp}".')
    return 0


if __name__ == '__main__':
    sys.exit(main())
