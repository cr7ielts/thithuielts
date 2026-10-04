# interactive/<id>.json  ->  js/data/interactive/<id>.json  +  js/data/bank-interactive.js (danh sách id)
# Web chỉ tải nội dung của đúng bài học sinh đang làm, không tải cả ngân hàng.
import json, os, glob

T = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(T)
OUT = os.path.join(PROJ, 'js', 'data', 'interactive')
os.makedirs(OUT, exist_ok=True)

ids, kept = [], set()
for f in sorted(glob.glob(os.path.join(T, 'interactive', '*.json'))):
    d = json.load(open(f, encoding='utf8'))
    ids.append(d['id'])
    kept.add(d['id'] + '.json')
    open(os.path.join(OUT, d['id'] + '.json'), 'w', encoding='utf8', newline='\n').write(
        json.dumps(d, ensure_ascii=False, separators=(',', ':')))
# bài đã bỏ khỏi tools/interactive thì xoá luôn bản trên web
for f in os.listdir(OUT):
    if f.endswith('.json') and f not in kept: os.remove(os.path.join(OUT, f))

lines = ['// =====================================================================',
         '//  DANH SÁCH BÀI CÓ NỘI DUNG TƯƠNG TÁC (làm như thi trên máy, không xem PDF)',
         '//  Sinh bởi tools/extract_interactive.py (hoặc batch_interactive.py) + gen_interactive.py.',
         '//  Nội dung từng bài nằm ở js/data/interactive/<id>.json, chỉ tải khi học sinh vào làm.',
         '//  Bài không có trong danh sách này vẫn làm theo cách cũ (PDF + phiếu trả lời).',
         '// =====================================================================',
         'export const INTERACTIVE_IDS = new Set([']
lines += [f'  {json.dumps(i, ensure_ascii=False)},' for i in ids]
lines.append(']);')
open(os.path.join(PROJ, 'js', 'data', 'bank-interactive.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1024
print(f'{len(ids)} bài tương tác · {size:.0f} KB trong js/data/interactive/')
