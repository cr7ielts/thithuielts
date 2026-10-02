# Dò mốc thời gian của từng câu Listening trong lời chép audio (tools/transcripts/<id>-s<n>.json).
#   python align_listening.py forecast-01        # in bảng: câu · cách dò · mốc · đoạn lời thoại
# Không cần audio — chạy được ở mọi máy có tools/transcripts. gen_explain_listening.py gọi align() để
# sinh dữ liệu "Nghe lại" cho web.
#
# Cách dò (theo thứ tự câu, đáp án Listening luôn xuất hiện lần lượt):
#   exact  — chữ của đáp án điền từ có nguyên văn trong lời thoại (chịu được tên đánh vần H-I-L-L-M-A-N, £98, 7:30)
#   fuzzy  — gần giống (tên riêng model chép lệch 1–2 chữ)
#   option — câu chọn chữ cái: đoạn lời thoại trùng nhiều từ nhất với nội dung câu + phương án đúng
#   guess  — không dò được: lấy khoảng giữa câu trước và câu sau (web ghi "ước lượng")
import difflib, json, os, re, sys

T = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(T)
TR = os.environ.get('LISTEN_TR') or os.path.join(T, 'transcripts')

STOP = set('a an the of to and or in on at for with by from is are was were be been it its this that these those '
           'there their they them he she his her we our you your i my me as not no but so if than then very more most '
           'can could will would should may might do does did have has had about into over up out what which who when '
           'where how why all any some each other only also just'.split())


def bank_items():
    s = open(os.path.join(PROJ, 'js', 'data', 'bank-listening.js'), encoding='utf8').read()
    rows = lambda name: [json.loads(l.strip().rstrip(',')) for l in s.split(f'{name} = [')[1].split('\n];')[0].splitlines()
                         if l.strip().startswith('{')]
    return rows('LISTENING_BANK'), rows('LISTENING_SECTIONS')


def norm(w):
    """một từ -> dạng so khớp: chữ thường, bỏ dấu câu, '£98' -> '98', '7:30' -> '730', 'H-I-L-L' -> 'hill'"""
    w = w.lower().replace('’', "'").replace('‘', "'")
    w = re.sub(r'(?<=\d)[,.:](?=\d)', '', w)
    w = re.sub(r"[^\w']", '', w).strip("'")
    return w.replace('_', '')


def key_variants(ans):
    """'(the) museum' -> ['the museum', 'museum']"""
    out = {re.sub(r'\s+', ' ', re.sub(r'[()]', '', ans)).strip(), re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', '', ans)).strip()}
    return [v for v in out if v]


def similar(a, b):
    return a == b or (len(a) >= 5 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.84)


def stream_of(tr):
    """[(token, start, end, seg, c0, c1)] — c0/c1: vị trí trong text của segment để tô trên web"""
    out = []
    for si, seg in enumerate(tr['segments']):
        cur = 0
        for w, a, b in seg.get('words') or []:
            k = seg['text'].find(w, cur) if w else -1
            c0, c1 = (k, k + len(w)) if k >= 0 else (None, None)
            if k >= 0:
                cur = k + len(w)
                # không tô dấu câu dính theo từ: "Road," "Hillman."
                while c1 - c0 > 1 and seg['text'][c1 - 1] in '.,;:!?"\'”’)': c1 -= 1
                while c1 - c0 > 1 and seg['text'][c0] in '"\'“‘(': c0 += 1
            for part in re.split(r'\s+|(?<=[a-z])-(?=[a-z]{2})', w.lower()):   # "well-known" giữ, "mid-morning" tách
                t = norm(part)
                if t: out.append((t, a, b, si, c0, c1))
    return out


def find_all(stream, toks):
    """mọi vị trí (i, j, kind) mà chuỗi stream[i:j] khớp toks; một token đáp án được ghép từ nhiều token lời
    thoại (tên đánh vần từng chữ cái 'h i l l m a n')"""
    hits = []
    for i in range(len(stream)):
        j, ok, kind = i, True, 'exact'
        for kt in toks:
            if j >= len(stream): ok = False; break
            if stream[j][0] == kt: j += 1; continue
            # ghép các token ngắn liên tiếp (đánh vần)
            acc, m = '', j
            while m < len(stream) and len(acc) < len(kt) and len(stream[m][0]) <= 2:
                acc += stream[m][0]; m += 1
                if acc == kt: break
            if acc == kt and m > j + 1: j = m; continue
            # từ có gạch nối bị tách: "mid-morning" / "mid morning" -> "midmorning"
            acc, m = '', j
            while m < len(stream) and m < j + 3 and len(acc) < len(kt):
                acc += stream[m][0]; m += 1
            if acc == kt and m > j + 1: j = m; continue
            if similar(kt, stream[j][0]): j += 1; kind = 'fuzzy'; continue
            ok = False; break
        if ok: hits.append((i, j, kind))
    return hits


def content(text):
    words = (norm(x) for x in re.split(r'[\s/-]+', text or ''))
    return {(w[:-1] if len(w) > 3 and w.endswith('s') else w)[:5] for w in words if len(w) >= 3 and w not in STOP}


def cues_for(n, item, inter):
    """câu chữ cái: nội dung câu + nội dung phương án đúng"""
    key = (item['key'].get(str(n)) or [''])[0]
    letters = [x.strip() for x in key.split(',')] if re.fullmatch(r'[A-J](\s*,\s*[A-J])*', key) else []
    if not letters: return None
    qtext, opts = '', []
    for g in (inter or {}).get('groups', []):
        if not g['from'] <= n <= g['to']: continue
        opts = g.get('bank') or g.get('options') or []
        for q in g.get('questions', []):
            if q['n'] == n:
                qtext = q.get('text', ''); opts = q.get('options') or opts
    words = content(qtext)
    for o in opts:
        if o['v'] in letters: words |= content(o['t'])
    return words


def align(item, s, tr, inter=None):
    """{n: {'s', 't':[a,b], 'at':[a,b], 'hit':[seg,c0,c1]|None, 'm'}} cho các câu của section s"""
    stream = stream_of(tr)
    segs = tr['segments']
    dur = tr.get('duration') or (segs[-1]['end'] if segs else 0)
    nums = sorted(int(n) for n in item['key'] if (int(n) - 1) // 10 + 1 == s)
    found, cursor = {}, 0
    multi_done = {}
    for n in nums:
        key = item['key'][str(n)]
        cues = cues_for(n, item, inter)
        if cues is None:
            best = None
            for ans in key:
                for v in key_variants(ans):
                    toks = [norm(x) for x in v.split() if norm(x)]
                    if not toks: continue
                    hits = find_all(stream, toks)
                    after = [h for h in hits if h[0] >= cursor]
                    h = (after or hits or [None])[0]
                    if h and (best is None or (h[0] >= cursor, -h[0]) > (best[0] >= cursor, -best[0])): best = h
            if best:
                i, j, kind = best
                found[n] = {'at': [stream[i][1], stream[j - 1][2]], 'tok': (i, j), 'm': kind}
                cursor = j
            continue
        # câu chữ cái: cùng nhóm "chọn 2 đáp án" thì dùng chung mốc
        if key[0] in multi_done: found[n] = dict(multi_done[key[0]]); continue
        t0 = stream[cursor][1] if cursor < len(stream) else 0
        best, bscore = None, 0
        for si, seg in enumerate(segs):
            if seg['end'] < t0 - 2 or seg['start'] > t0 + 120: continue
            own = cues & content(seg['text'])
            # từ khoá nói tràn sang câu sau thì cộng nửa điểm
            nxt = cues & content(segs[si + 1]['text']) - own if si + 1 < len(segs) else set()
            sc = len(own) + 0.5 * len(nxt)
            if sc > bscore: best, bscore = si, sc
        if best is not None and bscore >= max(2, len(cues) // 3):
            seg = segs[best]
            idx = [k for k, x in enumerate(stream) if x[3] == best]
            found[n] = {'at': [seg['start'], seg['end']], 'seg': best, 'tok': (idx[0], idx[-1] + 1) if idx else None, 'm': 'option'}
            if idx: cursor = idx[-1] + 1
            if ',' in key[0]: multi_done[key[0]] = found[n]
    out = {}
    for k, n in enumerate(nums):
        f = found.get(n)
        if f:
            a0, a1 = f['at']
            # bắt đầu nghe từ ~8 giây trước đáp án, tròn theo đầu câu nói; kết thúc sau đáp án ~3 giây
            st = max(0.0, a0 - 8)
            seg0 = next((x for x in segs if x['start'] <= st < x['end']), None)
            if seg0 and st - seg0['start'] <= 6: st = seg0['start']
            en = a1 + 3
            seg1 = next((x for x in segs if x['start'] <= a1 <= x['end']), None)
            if seg1 and seg1['end'] - a1 <= 10: en = max(en, seg1['end'] + 0.5)
            hit = [f['seg'], 0, len(segs[f['seg']]['text'])] if f['m'] == 'option' else None
            if f.get('tok') and f['m'] != 'option':
                i, j = f['tok']
                if stream[i][3] == stream[j - 1][3] and stream[i][4] is not None and stream[j - 1][5] is not None:
                    hit = [stream[i][3], stream[i][4], stream[j - 1][5]]
            out[n] = {'s': s, 't': [round(st, 1), round(min(en, dur), 1)], 'at': [round(a0, 1), round(a1, 1)], 'hit': hit, 'm': f['m']}
        else:
            prev = max((found[m]['at'][1] for m in nums[:k] if m in found), default=0.0)
            nxt = min((found[m]['at'][0] for m in nums[k + 1:] if m in found), default=dur)
            st, en = max(0.0, prev - 2), min(dur, nxt + 2)
            if en - st > 60: en = st + 60
            out[n] = {'s': s, 't': [round(st, 1), round(en, 1)], 'at': None, 'hit': None, 'm': 'guess'}
    return out


def load_tr(test_id, s):
    p = os.path.join(TR, f'{test_id}-s{s}.json')
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None


def load_inter(test_id):
    p = os.path.join(PROJ, 'js', 'data', 'interactive', test_id + '.json')
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None


def main():
    tests, _ = bank_items()
    want = set(sys.argv[1:])
    for t in tests:
        if want and t['id'] not in want: continue
        inter = load_inter(t['id'])
        for s in (1, 2, 3, 4):
            tr = load_tr(t['id'], s)
            if not tr: continue
            res = align(t, s, tr, inter)
            print(f"== {t['id']} section {s}  ·  " + ' '.join(f"{m}:{sum(1 for x in res.values() if x['m'] == m)}"
                                                         for m in ('exact', 'fuzzy', 'option', 'guess')))
            for n, r in sorted(res.items()):
                seg = r['hit'][0] if r['hit'] else None
                txt = tr['segments'][seg]['text'][:70] if seg is not None else ''
                print(f"  {n:>2} {r['m']:<6} {r['t'][0]:>6.1f}-{r['t'][1]:<6.1f} {t['key'][str(n)][0][:18]:<18} {txt}")


if __name__ == '__main__':
    main()
