"""Create a deterministic release manifest without including the manifest itself."""
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
files=[]
for f in sorted(ROOT.rglob('*')):
    if not f.is_file() or f.name in {'MANIFEST.json'} or any(p in f.parts for p in ('__pycache__','node_modules','.venv','.git')) or f.suffix=='.pyc':
        continue
    rel=f.relative_to(ROOT).as_posix()
    files.append({'path':rel,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size})
manifest={'format':'lecture-ppt-workflow-public-manifest.v1','release':'0.1.0-alpha','date':'2026-09-24','status':'github-upload-ready-not-published','skill':'lecture-ppt-workflow','includes_runtime':False,'includes_private_course_material':False,'files':files}
(ROOT/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(files),'sha256':hashlib.sha256((ROOT/'MANIFEST.json').read_bytes()).hexdigest()},ensure_ascii=False))
