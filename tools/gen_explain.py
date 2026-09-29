# Kiểm tra + đưa giải thích Reading lên web:  tools/explain/<id>.json -> js/data/explain/<id>.json + js/data/bank-explain.js
#   python gen_explain.py            # kiểm tra tất cả, chỉ đưa lên bài ĐẠT
# Mỗi file: { "id": "...", "q": { "14": { "ev": ["câu nguyên văn trong bài", ...], "why": "giải thích tiếng Việt" } } }
# Luật: đủ mọi câu có trong đáp án; "why" không trống; mỗi dẫn chứng phải có NGUYÊN VĂN trong bài đọc
# (bỏ qua khác biệt khoảng trắng / dấu nháy). NOT GIVEN được phép không có dẫn chứng. "para" tự điền theo vị trí dẫn chứng.
import json, os, re, glob
import extract_interactive as E

T = E.T
OUT = os.path.join(E.PROJ, 'js', 'data', 'explain')
norm = lambda s: re.sub(r'\s+', ' ', str(s).replace('‘', "'").replace('’', "'").replace('`', "'").replace('“', '"').replace('”', '"')).strip()
items = {x['id']: x for x in E.js_items('bank-reading.js', 'READING_BANK')}
os.makedirs(OUT, exist_ok=True)
ok_ids, bad = [], 0
for f in sorted(glob.glob(os.path.join(T, 'explain', '*.json'))):
    iid = os.path.basename(f)[:-5]
    errs = []
    try:
        d = json.load(open(f, encoding='utf8'))
        inter = json.load(open(os.path.join(T, 'interactive', iid + '.json'), encoding='utf8'))
        item = items[iid]
    except Exception as e:
        print('  LỖI', iid, e); bad += 1; continue
    paras = [(p['mark'] or str(i + 1), norm(p['text'])) for i, p in enumerate(inter['passage']['paras'])]   # đoạn không có chữ cái -> số thứ tự
    for n in sorted(item['key'], key=int):
        e = d.get('q', {}).get(n)
        if not e: errs.append(f'câu {n}: thiếu'); continue
        if len(e.get('why', '').strip()) < 15: errs.append(f'câu {n}: giải thích quá ngắn')
        where = []
        for q in e.get('ev', []):
            hit = next((m for m, t in paras if norm(q) and norm(q) in t), None)
            if hit is None: errs.append(f'câu {n}: dẫn chứng không có nguyên văn trong bài: "{q[:60]}…"')
            else: where.append(hit)
        if not e.get('ev') and 'NOT GIVEN' not in item['key'][n] and 'NOT GIVEN' != item['key'][n][0]:
            errs.append(f'câu {n}: thiếu dẫn chứng')
        if where and where[0]: e['para'] = where[0]
    extra = set(d.get('q', {})) - set(item['key'])
    if extra: errs.append(f'thừa câu {sorted(extra, key=int)}')
    if errs:
        bad += 1; print('  KHÔNG ĐẠT', iid, '|', '; '.join(errs)[:400]); continue
    open(os.path.join(OUT, iid + '.json'), 'w', encoding='utf8', newline='\n').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    ok_ids.append(iid)
for f in os.listdir(OUT):
    if f.endswith('.json') and f[:-5] not in ok_ids: os.remove(os.path.join(OUT, f))
lines = ['// Danh sách bài Reading đã có giải thích chi tiết (sinh bởi tools/gen_explain.py). Nội dung: js/data/explain/<id>.json',
         'export const EXPLAIN_IDS = new Set([', *[f'  {json.dumps(i)},' for i in ok_ids], ']);']
open(os.path.join(E.PROJ, 'js', 'data', 'bank-explain.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
print(f'ĐẠT {len(ok_ids)} · không đạt {bad}')
