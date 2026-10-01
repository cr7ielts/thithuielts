# Chép lời audio Listening -> tools/transcripts/<id>-s<n>.txt (để viết giải thích).
# Chạy trên máy có OneDrive:
#   pip install faster-whisper
#   python tools/transcribe_listening.py            (tất cả, bỏ qua file đã có)
#   python tools/transcribe_listening.py forecast-01 vol9-03   (chỉ vài đề)
# Mặc định dùng model "small" chạy CPU; có GPU thì đặt WHISPER_DEVICE=cuda, WHISPER_MODEL=medium.
import json, os, re, sys

ROOT = r'C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING'
T = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(T, 'transcripts')
JS = os.path.join(T, '..', 'js', 'data', 'bank-listening.js')

src = open(JS, encoding='utf8').read()
bank = json.loads(re.search(r'LISTENING_BANK = (\[.*?\n\]);', src, re.S).group(1))
want = set(sys.argv[1:])

from faster_whisper import WhisperModel
model = WhisperModel(os.environ.get('WHISPER_MODEL', 'small'),
                     device=os.environ.get('WHISPER_DEVICE', 'cpu'),
                     compute_type=os.environ.get('WHISPER_COMPUTE', 'int8'))
os.makedirs(OUT, exist_ok=True)

for t in bank:
    if want and t['id'] not in want: continue
    for f in t['files']:
        if f['type'] != 'audio': continue
        m = re.search(r'(\d)$', f['label'])
        if not m: continue
        out = os.path.join(OUT, f"{t['id']}-s{m.group(1)}.txt")
        if os.path.exists(out): continue
        audio = os.path.join(ROOT, f['src'])
        if not os.path.exists(audio):
            print('thiếu audio', audio); continue
        print('->', out, flush=True)
        segs, _ = model.transcribe(audio, language='en', vad_filter=True)
        lines = [f"[{int(s.start)//60:02d}:{int(s.start)%60:02d}] {s.text.strip()}" for s in segs]
        open(out, 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
print('xong — commit thư mục tools/transcripts rồi push')
