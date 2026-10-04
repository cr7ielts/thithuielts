# Chép lời audio Listening (kèm mốc thời gian từng từ) -> tools/transcripts/<id>-s<n>.json
# Dùng cho phần xem lại bài: học sinh bấm "Nghe lại" để nghe đúng đoạn chứa đáp án câu mình làm sai.
# Chạy trên máy có OneDrive (cần file audio gốc):
#   pip install faster-whisper
#   python tools/transcribe_listening.py                       (tất cả, bỏ qua file đã có)
#   python tools/transcribe_listening.py forecast-01 vol9-03   (chỉ vài đề)
#   python tools/transcribe_listening.py --force forecast-01   (chép lại)
# Mặc định dùng model "small" chạy CPU (~1/3 thời lượng audio); có GPU thì đặt WHISPER_DEVICE=cuda,
# WHISPER_MODEL=medium. Xong: python tools/gen_explain_listening.py rồi commit tools/transcripts + js/data.
import json, os, re, sys

ROOT = r'C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING'
T = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(T, 'transcripts')
JS = os.path.join(T, '..', 'js', 'data', 'bank-listening.js')

src = open(JS, encoding='utf8').read()
bank = [json.loads(l.strip().rstrip(',')) for l in src.split('LISTENING_BANK = [')[1].split('\n];')[0].splitlines() if l.strip().startswith('{')]
force = '--force' in sys.argv
want = {a for a in sys.argv[1:] if not a.startswith('--')}

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
        s = int(m.group(1))
        out = os.path.join(OUT, f"{t['id']}-s{s}.json")
        if os.path.exists(out) and not force: continue
        audio = os.path.join(ROOT, f['src'])
        if not os.path.exists(audio):
            print('thiếu audio', audio); continue
        # mồi bằng đáp án của section: model chép đúng tên riêng, số nhà… nên dò mốc đáp án chính xác hơn
        keys = [v[0] for n, v in sorted(t['key'].items(), key=lambda x: int(x[0]))
                if (int(n) - 1) // 10 + 1 == s and not re.fullmatch(r'[A-J](,\s*[A-J])*', v[0])]
        prompt = 'IELTS Listening. ' + (', '.join(keys) + '.' if keys else '')
        print('->', out, flush=True)
        segs, info = model.transcribe(audio, language='en', vad_filter=True, word_timestamps=True,
                                      initial_prompt=prompt, condition_on_previous_text=False)
        data = {'id': t['id'], 'section': s, 'path': f['path'], 'model': os.environ.get('WHISPER_MODEL', 'small'),
                'duration': round(info.duration, 2),
                'segments': [{'start': round(x.start, 2), 'end': round(x.end, 2), 'text': x.text.strip(),
                              'words': [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for w in (x.words or [])]}
                             for x in segs]}
        open(out, 'w', encoding='utf8', newline='\n').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('xong — chạy python tools/gen_explain_listening.py, rồi commit tools/transcripts và js/data')
