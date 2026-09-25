# Soi chất lượng nội dung đã bóc (cảnh báo mềm — không chặn như check()).
#   python audit_interactive.py reading 1
import re, sys, collections
import extract_interactive as E
from batch_interactive import items_of, one

STOP = re.compile(r'(?i)(answer sheet|you should spend|^questions?\s+\d|write your answers|reading passage \d|disclaimer|reading walks)')


def warn(data, item):
    w = []
    ps = (data.get('passage') or {}).get('paras', [])
    if data['kind'] == 'reading':
        chars = sum(len(p['text']) for p in ps)
        if len(ps) < 4: w.append(f'bài đọc chỉ {len(ps)} đoạn')
        if chars < 2000: w.append(f'bài đọc ngắn bất thường ({chars} ký tự)')
        if any(STOP.search(p['text']) for p in ps): w.append('bài đọc lẫn dòng đề bài')
        if not (data.get('passage') or {}).get('title'): w.append('không có tiêu đề bài đọc (web dùng tên bài)')
    for g in data['groups']:
        tag = f"{g['from']}-{g['to']}"
        ins = g.get('instruction', '')
        if not ins: w.append(f'{tag}: không có đề bài')
        elif len(ins) > 320 or '____' in ins: w.append(f'{tag}: đề bài lẫn nội dung câu hỏi')
        for it in g.get('notes', []):
            if STOP.search(it['text']): w.append(f'{tag}: ghi chú lẫn dòng đề bài')
        for q in g.get('questions', []):
            t = q['text']
            # dạng heading: câu hỏi chỉ là "Paragraph A" / "Section B"
            if len(t) < 15 and not (g['kind'] == 'heading' and re.match(r'(?i)^(paragraph|section) [A-Z]$', t)): w.append(f"câu {q['n']}: quá ngắn “{t}”")
            elif STOP.search(t): w.append(f"câu {q['n']}: lẫn dòng đề bài")
            # "Answer the/these questions below" là dạng trả lời ngắn, không có chỗ trống
            if g['kind'] == 'gap' and '____' not in t and not re.match(r'(?i)answer (the|these) questions?', g.get('instruction', '')):
                w.append(f"câu {q['n']}: không thấy chỗ trống")
            for o in q.get('options', []):
                if len(o['t']) < 2: w.append(f"câu {q['n']}: phương án {o['v']} trống")
                if len(o['t']) > 200: w.append(f"câu {q['n']}: phương án {o['v']} dài bất thường")
        for o in g.get('bank', []) + g.get('options', []):
            if len(o['t']) < 2: w.append(f"{tag}: phương án {o['v']} trống")
            if len(o['t']) > 200: w.append(f"{tag}: phương án {o['v']} dài bất thường")
    return w


def main():
    kind = sys.argv[1] if len(sys.argv) > 1 else 'reading'
    part = sys.argv[2] if len(sys.argv) > 2 else ''
    n_ok, tot = 0, 0
    kinds = collections.Counter()
    for it in items_of(kind, part):
        try:
            data, errs = one(kind, it)
        except Exception as e:
            print(' ', it['id'], '| lỗi:', e); continue
        if errs: continue
        tot += 1
        for g in data['groups']: kinds[g['kind'] + ('+ghi chú' if g.get('notes') else '')] += 1
        w = warn(data, it)
        if w: print(' ', it['id'], '|', '; '.join(w)[:160])
        else: n_ok += 1
    print(f'--- sạch {n_ok}/{tot} bài')
    for k, c in kinds.most_common(): print(f'  {c:4d}  nhóm {k}')


if __name__ == '__main__':
    main()
