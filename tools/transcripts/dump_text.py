# Xuất văn bản của mọi đề ra tools/txt/<id>.txt.
# Nhờ đó máy khác (cloud session) bóc đề tương tác được mà không cần thư mục tài liệu gốc.
#   python dump_text.py            # bài nào chưa có thì xuất
#   python dump_text.py --force    # xuất lại toàn bộ
import os, sys
import extract_interactive as E


def source_of(kind, item):
    if kind == 'reading': return E.real(E.RROOT, item['src']), None
    f = next((x for x in item['files'] if x['type'] == 'pdf'), item['files'][0])
    return E.real(E.LROOT, f['src']), f.get('pages')


def main():
    force = '--force' in sys.argv
    os.makedirs(E.TXT, exist_ok=True)
    reading = E.js_items('bank-reading.js', 'READING_BANK')
    listening = E.js_items('bank-listening.js', 'LISTENING_BANK')     # gồm cả các section
    new = skip = err = 0
    for kind, items in (('reading', reading), ('listening', listening)):
        for it in items:
            p = os.path.join(E.TXT, it['id'] + '.txt')
            if os.path.exists(p) and not force: skip += 1; continue
            try:
                path, pages = source_of(kind, it)
                t = E.pdftext(path, pages)
            except Exception as e:
                print('  lỗi  ', it['id'], '|', e); err += 1; continue
            if len(t.strip()) < 200:
                print('  rỗng ', it['id']); err += 1; continue
            open(p, 'w', encoding='utf8', newline='\n').write(t)
            new += 1
    size = sum(os.path.getsize(os.path.join(E.TXT, f)) for f in os.listdir(E.TXT)) / 1024 / 1024
    print(f'xuất mới {new} · bỏ qua {skip} · lỗi {err} · tổng {size:.1f} MB trong tools/txt/')


if __name__ == '__main__':
    main()
