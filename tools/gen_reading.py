# Generate js/data/bank-reading.js + a problems report from rd/parsed.json
import json, os, re

SP = os.path.dirname(os.path.abspath(__file__))
PROJ = r'C:\Users\Admin\OneDrive\.claude\ielts-mock'
P = json.load(open(os.path.join(SP, 'rd', 'parsed.json'), encoding='utf8'))


def slug(s):
    s = s.lower().replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


# Sửa tay 10 bài dò lại ngày 2026-09-25: đề PDF gốc ghi sai dải "Questions a-b"
# (thiếu câu cuối của nhóm, hoặc lặp số câu sang nhóm sau), nên bộ sinh cắt sai nhóm.
# Đáp án bổ sung lấy từ key.docx của chính bài đó. 'nhóm cũ': 'nhóm đúng' (None = bỏ nhóm).
FIXES = {
    'p1-tunnelling-under-the-thames': ({'1-7': '1-8'}, {8: 'TRUE', 9: 'worm'}),
    'p2-ideal-homes': ({'24-26': '23-26'}, {23: 'FALSE'}),
    'p2-keeping-an-eye-on-shoppers': ({'19-23': None}, {}),          # câu dẫn, không phải nhóm
    'p2-the-impact-of-invasive-species': ({'14-18': '14-19'}, {19: 'D'}),
    'p3-images-and-places': ({'27-31': '27-32'}, {32: 'ii'}),
    'p3-looking-at-daily-life-in-ancient-rome': ({'31-35': '31-36'}, {36: 'NO'}),
    'p3-research-into-the-effects-of-different-teaching-styles': ({'27-31': '27-33'}, {32: 'H', 33: 'E'}),
    'p3-science-in-the-kitchen': ({'27-30': '27-31'}, {31: 'NOT GIVEN'}),
    'p3-sea-change-for-salinity': ({'36-40': '37-40'}, {}),          # câu bắt đầu từ 37
    'p3-when-people-are-deaf-to-music': ({'32-36': '32-35'}, {}),    # câu 36 thuộc nhóm sau
}


def apply_fix(sid, groups, key):
    moves, adds = FIXES[sid]
    for old, new in moves.items():
        a, b = (int(x) for x in old.split('-'))
        g = next((g for g in groups if (g['from'], g['to']) == (a, b)), None)
        if g is None: raise SystemExit(f'{sid}: không thấy nhóm {old} để sửa')
        if new is None: groups.remove(g)
        else: g['from'], g['to'] = (int(x) for x in new.split('-'))
    for n, v in adds.items(): key[n] = [v]
    groups.sort(key=lambda g: g['from'])


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
    if sid in FIXES: apply_fix(sid, r['groups'], key)
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
