# Cắt audio cả đề thành 4 section (M4A) vào "2. LISTENING\_web\<id>-p1..p4.m4a"
# Mốc cắt: ls/sections.json (find_sections.py — dò khoảng lặng, đối chiếu transcript nếu có)
import os, json, subprocess, sys
from find_sections import real, VOLROOT, LROOT, T
import glob

OUT = os.path.join(LROOT, '_web')
sections = json.load(open(os.path.join(T, 'ls', 'sections.json')))
vol = json.load(open(os.path.join(T, 'ls', 'vol.json'), encoding='utf8'))
src_of = {tid: real(VOLROOT, v['audio']) for tid, v in vol.items()}
src_of['forecast-14'] = glob.glob(os.path.join(LROOT, 'FORECAST', 'TEST 14', '*.mp3'))[0]
src_of['forecast-15'] = os.path.join(OUT, 'forecast-15-full.m4a')

done = {}
for tid, s in sections.items():
    cuts = s.get('cuts')
    if not cuts:
        print(f'{tid}: no boundaries — keep full audio'); continue
    bounds = [0] + cuts + [s['duration']]
    for i in range(4):
        name = f'{tid}-p{i + 1}.m4a'
        if not os.path.exists(os.path.join(OUT, name)):
            subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', os.path.join(T, 'transcode.ps1'),
                            '-Src', src_of[tid], '-OutDir', OUT, '-OutName', name,
                            '-Start', str(max(0, bounds[i])), '-Stop', str(bounds[i + 1])], check=True, capture_output=True)
    done[tid] = [round(b) for b in bounds]
    print(tid, 'split at', ' '.join(f'{int(b//60)}:{int(b%60):02d}' for b in cuts), f"({s['how']})", flush=True)
json.dump(done, open(os.path.join(T, 'ls', 'split.json'), 'w'), indent=1)
