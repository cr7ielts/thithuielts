# Generate js/data/bank-reading.js + a problems report from rd/parsed.json
import json, os, re

SP = os.path.dirname(os.path.abspath(__file__))
PROJ = r'C:\Users\Admin\OneDrive\.claude\ielts-mock'
P = json.load(open(os.path.join(SP, 'rd', 'parsed.json'), encoding='utf8'))


def slug(s):
    s = s.lower().replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


out, seen = [], set()
for r in P:
    if not r['ok']: continue
    sid = f"p{r['part']}-{slug(r['folder'])}"
    while sid in seen: sid += '-2'
    seen.add(sid)
    key = {}
    for n, v in r['key'].items():
        alts = [a.strip() for a in re.split(r'\s*/\s*|\s+OR\s+', v) if a.strip()] if not re.fullmatch(r'[A-L](,[A-L])+', v) else [v]
        key[int(n)] = alts
    range_bad = False
    for g in r['groups']:
        if g['kind'] in ('letter', 'multi'):
            used = [c for n in range(g['from'], g['to'] + 1) for v in key.get(n, []) for c in v.split(',')]
            hi = max(used or ['A'])
            if hi > g['letters'][1]:
                if g['letters'] == 'AH': g['letters'] = 'A' + hi
                else: range_bad = True
        if g['kind'] != 'other': continue
        vals = [key[n][0] for n in range(g['from'], g['to'] + 1) if n in key]
        if vals and all(v in ('TRUE', 'FALSE', 'NOT GIVEN') for v in vals) and 'TRUE' in vals + ['TRUE'] and not any(v in ('YES', 'NO') for v in vals):
            if any(v in ('TRUE', 'FALSE') for v in vals): g['kind'] = 'tfng'
        elif vals and all(v in ('YES', 'NO', 'NOT GIVEN') for v in vals) and any(v in ('YES', 'NO') for v in vals):
            g['kind'] = 'ynng'
        elif vals and all(re.fullmatch(r'(?:xv|xiv|xiii|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)', v) for v in vals):
            g['kind'] = 'heading'; g['max'] = 10
    if range_bad:
        r['ok'] = False
        r['problems'].append('answer letter outside the range given in the question (groups may be misread)')
        continue
    out.append({
        'id': sid, 'part': int(r['part']), 'title': r['title'],
        'src': f"Passage {r['part']}/{r['folder']}/{r['pdf']}",
        'groups': r['groups'], 'key': key,
    })
out.sort(key=lambda x: (x['part'], x['title'].lower()))

lines = [
    '// =====================================================================',
    '//  NGÂN HÀNG ĐỀ READING — sinh tự động từ thư mục "5. READING IN PASSAGES"',
    '//  (PDF đề + key.docx). Mỗi bài: id, part (1-3), title, src (đường dẫn file PDF',
    '//  trong thư mục gốc), groups (dạng câu hỏi), key (đáp án chấp nhận).',
    '//  File PDF được giáo viên tải lên Firebase Storage tại bank/reading/<id>.pdf',
    '//  qua trang Bank → Import. Không sửa tay file này — chạy lại script sinh.',
    '// =====================================================================',
    'export const READING_BANK = [',
]
for x in out:
    lines.append('  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) + ',')
lines.append('];')
open(os.path.join(PROJ, 'js', 'data', 'bank-reading.js'), 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')

bad = [r for r in P if not r['ok']]
rep = ['# Reading bank — bài chưa đưa lên web', '',
       f'Đã đưa lên: **{len(out)}** bài. Chưa đưa lên: **{len(bad)}** bài (cần sửa file đáp án hoặc PDF rồi chạy lại).', '',
       '| Passage | Bài | Lý do |', '|---|---|---|']
for r in sorted(bad, key=lambda r: (r['part'], r['folder'])):
    reason = '; '.join(r['problems'][:2]).replace('|', '/')
    rep.append(f"| {r['part']} | {r['folder']} | {reason} |")
open(os.path.join(PROJ, 'bank-report.md'), 'w', encoding='utf8', newline='\n').write('\n'.join(rep) + '\n')
print('bank items', len(out), 'problems', len(bad), 'bytes', os.path.getsize(os.path.join(PROJ, 'js', 'data', 'bank-reading.js')))
