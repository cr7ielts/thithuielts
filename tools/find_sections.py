# Dò thời điểm bắt đầu Section 2/3/4 trong audio cả đề.
#  1) transcript có mốc giờ (VOL 9) -> dùng mốc giờ
#  2) không có -> dò khoảng lặng: [lặng >=18s][câu thông báo ngắn <=35s][lặng >=15s] => ranh giới ở cuối khoảng lặng đầu
import os, re, json, sys, subprocess, zipfile, html, glob, unicodedata
from silences import silences

T = os.path.dirname(os.path.abspath(__file__))
VOLROOT = r'C:\Users\Admin\OneDrive\2. IELTS\VOL 1-9 2'
LROOT = r'C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING'
WAV = os.path.join(T, 'wav')
os.makedirs(WAV, exist_ok=True)


def docx_text(p):
    x = zipfile.ZipFile(p).read('word/document.xml').decode('utf8')
    x = re.sub(r'</w:p>', '\n', x)
    return html.unescape(re.sub(r'<[^>]+>', '', x))


def secs(s):
    p = [int(x) for x in s.split(':')]
    return p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]


def transcript_starts(docx):
    s = docx_text(docx)
    starts = {}
    # "SECTION 1..4" còn xuất hiện ở phần đáp án phía trên -> lấy mốc giờ lớn nhất theo sau tiêu đề
    for m in re.finditer(r'(?im)^\s*(?:section|part)\s*([2-4])\b.*$', s):
        t = re.search(r'\((\d+:\d\d(?::\d\d)?)', s[m.start():m.start() + 400])
        if t: starts[int(m.group(1))] = max(starts.get(int(m.group(1)), 0), secs(t.group(1)))
    ok = len(starts) == 3 and 0 < starts[2] < starts[3] < starts[4]
    return [starts[k] for k in (2, 3, 4)] if ok else None


def silence_starts(wav):
    sil, dur = silences(wav)
    # đề có "10 phút chép đáp án" im lặng ở cuối -> chỉ xét phần trước khoảng lặng dài đó
    end = min([a for a, b in sil if b - a >= 240] or [dur])
    cands = []
    for (a1, b1), (a2, b2) in zip(sil, sil[1:]):
        if b1 - a1 >= 18 and b2 - a2 >= 7 and 3 <= a2 - b1 <= 35 and 180 < b1 < end - 120:
            cands.append(b1)
    return cands, dur, sil, end


def sequential(cands):
    out = []
    for c in cands:
        if not out or c - out[-1] >= 180: out.append(c)
    return out if len(out) == 3 else None


def choose(cands, tr, dur):
    """Mỗi ranh giới: chỗ chuyển dò được (cuối 30s kiểm tra bài) gần mốc transcript nhất trong ±100s.
    Mốc transcript thô (gộp đoạn) nên chỉ dùng để khoanh vùng; không có thì dùng dãy dò được."""
    tr = [t if t and t > 120 else None for t in (tr or [None] * 3)]
    if not any(tr):
        cuts, how = sequential(cands), 'silence'
    else:
        cuts, how = [], 'silence+transcript'
        for i, t in enumerate(tr):
            lo = (cuts[-1] + 180) if cuts else 180
            if t:
                near = [c for c in cands if abs(c - t) <= 100 and c >= lo]
                if near: cuts.append(min(near, key=lambda c: abs(c - t)))
                else: cuts.append(t - 12); how = 'transcript'
            else:
                nxt = next((x for x in tr[i + 1:] if x), dur) - 180
                pick = [c for c in cands if lo <= c <= nxt]
                if not pick: return None, 'none'
                cuts.append(pick[0])
    if not cuts: return None, 'none'
    b = [0] + cuts + [dur]
    if not all(180 <= b[i + 1] - b[i] <= 900 for i in range(4)): return None, 'none'
    return cuts, how


def to_wav(src, name):
    dst = os.path.join(WAV, name)
    if not os.path.exists(dst):
        subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', os.path.join(T, 'transcode.ps1'),
                        '-Src', src, '-OutDir', WAV, '-OutName', name, '-Format', 'wav'], check=True, capture_output=True)
    return dst


def real(root, rel):
    d = root
    for part in rel.split('/'):
        d = os.path.join(d, next(x for x in os.listdir(d) if unicodedata.normalize('NFC', x) == unicodedata.normalize('NFC', part)))
    return d


if __name__ == '__main__':
    vol = json.load(open(os.path.join(T, 'ls', 'vol.json'), encoding='utf8'))
    result = {}
    jobs = [(tid, real(VOLROOT, v['audio']), real(VOLROOT, v['key_file'])) for tid, v in vol.items()]
    jobs += [('forecast-14', glob.glob(os.path.join(LROOT, 'FORECAST', 'TEST 14', '*.mp3'))[0], None),
             ('forecast-15', os.path.join(LROOT, '_web', 'forecast-15-full.m4a'), None)]
    for tid, audio, key in jobs:
        wav = to_wav(audio, tid + '.wav')
        cands, dur, sil, end = silence_starts(wav)
        det = sequential(cands)
        tr = transcript_starts(key) if key else None
        fmt = lambda xs: ' '.join(f'{int(x//60)}:{int(x%60):02d}' for x in xs) if xs else '—'
        diff = ' diff ' + ' '.join(f'{d - t:+.0f}s' for d, t in zip(det, tr)) if det and tr else ''
        cuts, how = choose(cands, tr, end)
        print(f'{tid}: {dur/60:5.1f} min | transcript {fmt(tr)} | detected {fmt(det)}{diff} => {fmt(cuts)} [{how}]')
        result[tid] = {'duration': dur, 'transcript': tr, 'detected': det, 'cuts': cuts, 'how': how}
    json.dump(result, open(os.path.join(T, 'ls', 'sections.json'), 'w'), indent=1)
