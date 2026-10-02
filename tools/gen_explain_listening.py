# Sinh dữ liệu "xem lại + nghe lại" cho Listening:
#   tools/transcripts/<đề>-s<n>.json (+ tools/explain_listening/<đề>.json nếu có)
#     -> js/data/explain-listening/<đề>.json + js/data/bank-explain-listening.js
#   python gen_explain_listening.py
# Section lẻ (forecast-01-s2…) dùng chung file của đề gốc vì cùng audio, cùng số câu.
#
# tools/explain_listening/<đề>.json (viết tay, không bắt buộc):
#   { "q": { "7": { "why": "giải thích tiếng Việt", "t": [61.0, 70.5] } } }
#   "why": hiện dưới đáp án; "t": sửa mốc nghe lại khi máy dò sai (giây, tính trong audio của section đó).
import glob, json, os
import align_listening as A

OUT = os.path.join(A.PROJ, 'js', 'data', 'explain-listening')
MAN = os.path.join(A.T, 'explain_listening')


def main():
    tests, _ = A.bank_items()
    os.makedirs(OUT, exist_ok=True)
    listed, stats, bad = {}, {}, 0
    for t in tests:
        parts, q = {}, {}
        inter = A.load_inter(t['id'])
        for s in (1, 2, 3, 4):
            tr = A.load_tr(t['id'], s)
            if not tr: continue
            parts[str(s)] = {'dur': tr.get('duration'), 'lines': [[x['start'], x['end'], x['text']] for x in tr['segments']]}
            for n, r in A.align(t, s, tr, inter).items():
                q[str(n)] = {k: v for k, v in r.items() if k != 'at' and v is not None}
                stats[r['m']] = stats.get(r['m'], 0) + 1
        if not parts: continue
        errs = []
        mp = os.path.join(MAN, t['id'] + '.json')
        if os.path.exists(mp):
            for n, e in json.load(open(mp, encoding='utf8')).get('q', {}).items():
                if n not in q: errs.append(f'câu {n}: không có trong section đã chép lời'); continue
                if 'why' in e:
                    if len(e['why'].strip()) < 15: errs.append(f'câu {n}: giải thích quá ngắn')
                    else: q[n]['why'] = e['why'].strip()
                if 't' in e:
                    a, b = e['t']
                    dur = parts[str(q[n]['s'])]['dur'] or 1e9
                    if not 0 <= a < b <= dur: errs.append(f'câu {n}: mốc {e["t"]} ngoài audio')
                    else: q[n].update(t=[a, b], m='manual')
        if errs:
            bad += 1; print('  KHÔNG ĐẠT', t['id'], '|', '; '.join(errs)); continue
        open(os.path.join(OUT, t['id'] + '.json'), 'w', encoding='utf8', newline='\n').write(
            json.dumps({'id': t['id'], 'parts': parts, 'q': q}, ensure_ascii=False, separators=(',', ':')))
        listed[t['id']] = sorted(int(s) for s in parts)
    for f in glob.glob(os.path.join(OUT, '*.json')):
        if os.path.basename(f)[:-5] not in listed: os.remove(f)
    lines = ['// Đề Listening đã có lời thoại + mốc "nghe lại" từng câu (sinh bởi tools/gen_explain_listening.py).',
             '// id đề -> các section đã chép lời. Nội dung: js/data/explain-listening/<id>.json',
             'export const LISTEN_EXPLAIN = {', *[f'  {json.dumps(k)}: {json.dumps(v)},' for k, v in listed.items()], '};']
    open(os.path.join(A.PROJ, 'js', 'data', 'bank-explain-listening.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'{len(listed)} đề có lời thoại · không đạt {bad} · mốc câu: ' + ', '.join(f'{k} {v}' for k, v in sorted(stats.items())))


if __name__ == '__main__':
    main()
