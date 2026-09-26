# Khảo sát + xuất văn bản đề READING trong "VOL 1-9 2" (ORIGINAL EXAMS) -> tools/vol_reading/
# Chạy trên máy có thư mục tài liệu gốc, xong commit + push thư mục tools/vol_reading
# để máy khác (cloud session) dựng full test Reading mà không cần tài liệu gốc.
#
#   python dump_vol_reading.py            # file nào chưa xuất thì xuất
#   python dump_vol_reading.py --force    # xuất lại toàn bộ
#
# Kết quả:
#   vol_reading/manifest.json    danh sách MỌI file trong VOL 1-9 (tên, cỡ) — để biết cấu trúc thư mục
#   vol_reading/txt/<đường dẫn>.txt   văn bản của các file đề / đáp án liên quan Reading
# File OneDrive "chỉ trên mạng" (biểu tượng đám mây) sẽ được tải về khi script đọc tới;
# chỉ file Word/PDF liên quan Reading bị tải, audio/video thì không.
import os, re, sys, json, zipfile, html, subprocess, unicodedata

ROOT = os.environ.get('VOL_ROOT', r'C:\Users\Admin\OneDrive\2. IELTS\VOL 1-9 2')   # VOL_ROOT: đổi chỗ khi thử
T = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(T, 'vol_reading')
nfc = lambda s: unicodedata.normalize('NFC', s)
rel = lambda p: nfc(os.path.relpath(p, ROOT).replace('\\', '/'))

# file cần xuất chữ: đường dẫn có chữ READ, hoặc là file đáp án (KEY / ANSWER / ĐÁP ÁN)
WANT = re.compile(r'(?i)read|\bkey\b|answer|đáp\s*án|dap\s*an|-r\.|\br\.(docx|pdf)$|test\s*\d+\s*-?\s*r\b')
SKIP = re.compile(r'(?i)listen|transcript|audio|speak|writ')     # thư mục Listening / Speaking / Writing


def docx_text(p):
    x = zipfile.ZipFile(p).read('word/document.xml').decode('utf8')
    x = re.sub(r'</w:p>', '\n', x); x = re.sub(r'<w:tab/>', '\t', x); x = re.sub(r'<w:br/>', '\n', x)
    return html.unescape(re.sub(r'<[^>]+>', '', x))


def pdf_text(p):
    r = subprocess.run(['pdftotext', '-layout', p, '-'], capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode('utf8', 'replace')[:200])
    return r.stdout.decode('utf8', 'replace')


def main():
    if not os.path.isdir(ROOT): raise SystemExit('Không thấy thư mục: ' + ROOT)
    force = '--force' in sys.argv
    os.makedirs(os.path.join(OUT, 'txt'), exist_ok=True)
    manifest, new, skip, err, todo = [], 0, 0, 0, []
    for d, dirs, files in os.walk(ROOT):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(d, f)
            r = rel(p)
            try: size = os.path.getsize(p)
            except OSError: size = -1
            manifest.append({'path': r, 'size': size})
            ext = os.path.splitext(f)[1].lower()
            if ext not in ('.docx', '.pdf', '.doc'): continue
            if not WANT.search(r) or (SKIP.search(r) and not re.search(r'(?i)read', r)): continue
            if ext == '.doc':
                todo.append(r); continue            # Word đời cũ: cần mở bằng Word lưu lại thành .docx
            outp = os.path.join(OUT, 'txt', r + '.txt')
            if os.path.exists(outp) and not force: skip += 1; continue
            try:
                t = docx_text(p) if ext == '.docx' else pdf_text(p)
            except Exception as e:
                print('  lỗi ', r, '|', e); err += 1; continue
            if len(t.strip()) < 10:           # file đáp án có thể rất ngắn
                print('  rỗng', r, '(PDF scan?)'); err += 1; continue
            os.makedirs(os.path.dirname(outp), exist_ok=True)
            open(outp, 'w', encoding='utf8', newline='\n').write(t)
            print('  xuất', r); new += 1
    json.dump({'root': 'VOL 1-9 2', 'files': manifest, 'doc_old_format': todo},
              open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'--- {len(manifest)} file trong VOL 1-9 · xuất mới {new} · bỏ qua {skip} · lỗi {err}')
    if todo: print(f'--- {len(todo)} file .doc đời cũ chưa đọc được (mở bằng Word, Save As .docx rồi chạy lại):', *todo[:10], sep='\n    ')
    print('Xong. Tiếp theo: git add tools/vol_reading && git commit -m "Xuất văn bản Reading VOL 1-9" && git push')


if __name__ == '__main__':
    main()
