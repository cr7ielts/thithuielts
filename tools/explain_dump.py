# In gọn bài đọc + câu hỏi + đáp án của các bài Reading tương tác (để viết giải thích).
#   python explain_dump.py <id> [<id> ...]
#   python explain_dump.py --todo reading 1     # liệt kê bài Passage 1 chưa có giải thích
import json, os, re, sys
import extract_interactive as E

T = E.T


def dump(iid):
    item = next(x for x in E.js_items('bank-reading.js', 'READING_BANK') if x['id'] == iid)
    d = json.load(open(os.path.join(T, 'interactive', iid + '.json'), encoding='utf8'))
    print(f'### {iid} — {item["title"]}')
    for p in d['passage']['paras']:
        print(f'[{p["mark"] or "·"}] {p["text"]}')
    for g in d['groups']:
        print(f'\n-- Q{g["from"]}-{g["to"]} {g["kind"]}: {g.get("instruction", "")[:160]}')
        for o in g.get('bank', []) + g.get('options', []): print(f'   {o["v"]}. {o["t"]}')
        for it in g.get('notes', []): print('   •', it['text'])
        for q in g.get('questions', []):
            print(f'   {q["n"]}. {q["text"]}' + ''.join(f'\n      {o["v"]}. {o["t"]}' for o in q.get('options', [])))
    print('\nKEY:', ' | '.join(f'{n}={"/".join(v)}' for n, v in sorted(item['key'].items(), key=lambda kv: int(kv[0]))))


if __name__ == '__main__':
    if sys.argv[1] == '--todo':
        part = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        done = {f[:-5] for f in os.listdir(os.path.join(T, 'explain'))} if os.path.isdir(os.path.join(T, 'explain')) else set()
        ids = [x['id'] for x in E.js_items('bank-reading.js', 'READING_BANK')
               if (not part or x['part'] == part) and os.path.exists(os.path.join(T, 'interactive', x['id'] + '.json')) and x['id'] not in done]
        print(len(ids), 'bài chưa có giải thích'); print('\n'.join(ids))
    else:
        for i in sys.argv[1:]: dump(i); print()
