import os, subprocess, json, zipfile, re, html
ROOT = r'C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ls')
os.makedirs(OUT, exist_ok=True)
index = []
for dp, dn, fn in os.walk(ROOT):
    if 'Các passages' in dp: continue
    for f in fn:
        p = os.path.join(dp, f)
        rel = os.path.relpath(p, ROOT).replace('\\', '/')
        ext = f.lower().rsplit('.', 1)[-1]
        rec = {'rel': rel, 'size': os.path.getsize(p), 'ext': ext}
        if ext == 'pdf':
            t = subprocess.run(['pdftotext', '-layout', p, '-'], capture_output=True).stdout.decode('utf8', 'replace')
            rec['words'] = len(t.split())
            rec['pages'] = t.count('\f')
            name = re.sub(r'[^\w.-]+', '_', rel)
            open(os.path.join(OUT, name + '.txt'), 'w', encoding='utf8').write(t)
            rec['txt'] = name + '.txt'
        elif ext == 'docx':
            x = zipfile.ZipFile(p).read('word/document.xml').decode('utf8')
            x = re.sub(r'</w:p>', '\n', x); x = re.sub(r'<w:tab/>', '\t', x)
            t = html.unescape(re.sub(r'<[^>]+>', '', x))
            name = re.sub(r'[^\w.-]+', '_', rel)
            open(os.path.join(OUT, name + '.txt'), 'w', encoding='utf8').write(t)
            rec['txt'] = name + '.txt'; rec['words'] = len(t.split())
        index.append(rec)
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for r in sorted(index, key=lambda r: r['rel']):
    if r['ext'] in ('pdf', 'docx'): print(f"{r.get('words',0):6d}w {r.get('pages','')!s:>3}p  {r['rel']}  -> {r.get('txt')}")
