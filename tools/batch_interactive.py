# Bóc hàng loạt nội dung đề sang dạng tương tác.
#   python batch_interactive.py reading 1          # xem thử: in danh sách đạt / không đạt
#   python batch_interactive.py reading 1 --save   # ghi các bài ĐẠT vào interactive/<id>.json
# Bài không đạt vẫn giữ nguyên cách làm cũ (PDF + phiếu trả lời).
import json, os, sys, collections
import extract_interactive as E


def items_of(kind, part):
    if kind == 'reading':
        xs = E.js_items('bank-reading.js', 'READING_BANK') + E.js_items('bank-vol9.js', 'VOL9_READING')
        return [x for x in xs if not part or x['part'] == int(part)]
    if kind == 'listening':
        return E.js_items('bank-listening.js', 'LISTENING_BANK')
    if kind == 'section':
        xs = E.js_items('bank-listening.js', 'LISTENING_SECTIONS')
        return [x for x in xs if not part or str(x.get('section')) == str(part)]
    raise SystemExit('kind: reading | listening | section')


def one(kind, item):
    data = E.build(item, kind, E.raw_text(kind, item))
    return data, E.check(data, item)


def main():
    kind = sys.argv[1] if len(sys.argv) > 1 else 'reading'
    part = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else ''
    save = '--save' in sys.argv
    items = items_of(kind, part)
    ok, bad = [], []
    for it in items:
        try:
            data, errs = one(kind, it)
        except Exception as e:
            data, errs = None, [f'lỗi: {type(e).__name__}: {e}']
        if errs: bad.append((it['id'], errs))
        else:
            ok.append(it['id'])
            if save:
                os.makedirs(os.path.join(E.T, 'interactive'), exist_ok=True)
                json.dump(data, open(os.path.join(E.T, 'interactive', it['id'] + '.json'), 'w', encoding='utf8'),
                          ensure_ascii=False, indent=1)
    print(f'ĐẠT {len(ok)}/{len(items)}' + (' — đã ghi vào interactive/' if save else ''))
    print('--- không đạt ---')
    for i, errs in bad: print(' ', i, '|', '; '.join(errs)[:150])
    why = collections.Counter(e.split(':')[0].split('[')[0].strip() for _, errs in bad for e in errs)
    print('--- lý do hay gặp ---')
    for w, c in why.most_common(12): print(f'  {c:4d}  {w}')


if __name__ == '__main__':
    main()
