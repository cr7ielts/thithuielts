import os,re,zipfile,subprocess,json,sys
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rd')
os.makedirs(OUT, exist_ok=True)
os.chdir(r'C:\Users\Admin\OneDrive\2. IELTS\5. READING IN PASSAGES')
def docx_text(path):
    x=zipfile.ZipFile(path).read('word/document.xml').decode('utf8')
    x=re.sub(r'</w:p>','\n',x); x=re.sub(r'<w:tab/>','\t',x); x=re.sub(r'<w:br/>','\n',x)
    t=re.sub(r'<[^>]+>','',x)
    import html; return html.unescape(t)
items=[]
for p in ['Passage 1','Passage 2','Passage 3']:
    for d in sorted(os.listdir(p)):
        full=os.path.join(p,d)
        if not os.path.isdir(full): continue
        files=os.listdir(full)
        pdf=[f for f in files if f.lower().endswith('.pdf')]
        key=[f for f in files if f.lower().endswith('.docx')]
        rec={'part':p[-1],'folder':d,'pdf':pdf[0] if pdf else None,'key':key[0] if key else None}
        if pdf:
            t=subprocess.run(['pdftotext','-layout',os.path.join(full,pdf[0]),'-'],capture_output=True).stdout.decode('utf8','replace')
            rec['pdftext']=t
        if key: rec['keytext']=docx_text(os.path.join(full,key[0]))
        items.append(rec)
json.dump(items,open(os.path.join(OUT,'all.json'),'w',encoding='utf8'),ensure_ascii=False)
print(len(items))
