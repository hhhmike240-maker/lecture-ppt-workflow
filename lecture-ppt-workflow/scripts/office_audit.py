"""Read-only DOCX/PPTX source index and package checks. Python 3.10+, standard library.

Reports explicit formatting only; visual/semantic review is still required.
Never follows external relationships or changes an input package.
"""
import argparse
import hashlib
import json
import posixpath
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile
import xml.etree.ElementTree as E
from cli_support import run

NS = dict(p='http://schemas.openxmlformats.org/presentationml/2006/main',
          a='http://schemas.openxmlformats.org/drawingml/2006/main',
          r='http://schemas.openxmlformats.org/officeDocument/2006/relationships',
          w='http://schemas.openxmlformats.org/wordprocessingml/2006/main')
def q(prefix, name): return '{'+NS[prefix]+'}'+name
def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda:f.read(1024*1024), b''): h.update(b)
    return h.hexdigest()
def relpath(part):
    return posixpath.join(posixpath.dirname(part), '_rels', posixpath.basename(part)+'.rels')
def resolve(part, target):
    path = unquote(urlsplit(target).path)
    result = posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(posixpath.dirname(part), path))
    if result == '..' or result.startswith('../'): raise ValueError('Relationship escapes package')
    return result
def relationships(z, part):
    rp = relpath(part)
    return {e.get('Id'):dict(e.attrib) for e in E.fromstring(z.read(rp))} if rp in z.namelist() else {}
def slides(z):
    root=E.fromstring(z.read('ppt/presentation.xml'))
    rels=relationships(z,'ppt/presentation.xml')
    return [resolve('ppt/presentation.xml', rels[e.get(q('r','id'))]['Target']) for e in root.findall('p:sldIdLst/p:sldId',NS)]
def text(root, prefix='a'):
    paragraphs=[root] if root.tag==q(prefix,'p') else root.findall('.//'+prefix+':p',NS)
    if paragraphs:
        return '\n'.join(''.join(e.text or '' for e in p.findall('.//'+prefix+':t',NS)) for p in paragraphs)
    return ''.join(e.text or '' for e in root.findall('.//'+prefix+':t',NS))
def fresh_json(path, data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x',encoding='utf-8') as f: json.dump(data,f,ensure_ascii=False,indent=2)
def package_checks(z):
    errors=[]; external=[]; warnings=[]; names=z.namelist(); parts=set(names)
    if len(parts)!=len(names): errors.append('Duplicate ZIP entry names')
    bad=z.testzip()
    if bad: errors.append('CRC failure: '+bad)
    for name in names:
        if not name.endswith(('.xml','.rels')): continue
        try: root=E.fromstring(z.read(name))
        except E.ParseError as ex:
            errors.append(f'XML parse error {name}: {ex}');continue
        if name.endswith('.rels'):
            owner='' if name=='_rels/.rels' else name.replace('/_rels/','/')[:-5]
            ids=[]
            for r in root:
                ids.append(r.get('Id')); target=r.get('Target','')
                if r.get('TargetMode')=='External':
                    external.append({'owner':owner,'target':target});continue
                try: dest=resolve(owner,target)
                except ValueError as ex: errors.append(f'{name}: {ex}');continue
                if not target or dest not in parts: errors.append(f'Missing relationship target: {name} -> {target}')
            if len(ids)!=len(set(ids)): errors.append('Duplicate relationship IDs: '+name)
        elif name.endswith('.xml'):
            rr=relationships(z,name)
            for node in root.iter():
                for key,value in node.attrib.items():
                    if key.startswith('{'+NS['r']+'}') and value and value not in rr:
                        errors.append(f'Missing relationship ID: {name} {value}')
                    elif key.startswith('{'+NS['r']+'}') and not value:
                        warnings.append(f'Empty relationship ID: {name}')
    return dict(errors=sorted(set(errors)),warnings=sorted(set(warnings)),external_relationships=external)
def ppt_index(z):
    pres=E.fromstring(z.read('ppt/presentation.xml'));size=pres.find('p:sldSz',NS)
    result={'size_emu':dict(size.attrib) if size is not None else None,'slides':[]}
    for number,part in enumerate(slides(z),1):
        root=E.fromstring(z.read(part)); ids=[n.get('id') for n in root.findall('.//p:cNvPr',NS)]
        timing=root.find('p:timing',NS); rr=relationships(z,part); notes=[]
        for r in rr.values():
            if r.get('Type','').endswith('/notesSlide') and r.get('TargetMode')!='External':
                np=resolve(part,r['Target'])
                if np in z.namelist(): notes.append(text(E.fromstring(z.read(np))))
        bg=root.find('p:cSld/p:bg',NS)
        objects=[]
        for n in root.findall('.//p:cNvPr',NS): objects.append(dict(n.attrib))
        targets=[e.get('spid') for e in root.findall('.//p:spTgt',NS)]
        fonts=sorted({e.get('typeface') for e in root.iter() if e.tag in (q('a','latin'),q('a','ea'),q('a','cs')) and e.get('typeface')})
        sizes=sorted({int(e.get('sz'))/100 for e in root.iter() if e.tag in (q('a','rPr'),q('a','defRPr'),q('a','endParaRPr')) and e.get('sz')})
        result['slides'].append(dict(number=number,part=part,text=text(root),notes=notes,
            objects=objects,explicit_fonts=fonts,explicit_font_sizes_pt=sizes,
            background_xml=E.tostring(bg,encoding='unicode') if bg is not None else None,
            has_timing=timing is not None,click_effects=len(root.findall('.//p:cTn[@nodeType="clickEffect"]',NS)),
            invalid_animation_targets=sorted(set(targets)-set(ids)),duplicate_shape_ids=len(ids)!=len(set(ids)),
            images=len(root.findall('.//p:pic',NS)),tables=len(root.findall('.//a:tbl',NS)),
            groups=len(root.findall('.//p:grpSp',NS))))
    result['limitations']=['Font sizes are explicit XML values, not fully resolved inherited/rotated/group-scaled sizes.',
        'background_xml is direct slide background; inspect layout/master and full-page pictures if null.',
        'No semantic coverage, visual layout or slideshow playback verdict.']
    return result
def doc_index(z):
    root=E.fromstring(z.read('word/document.xml')); rr=relationships(z,'word/document.xml'); blocks=[];images=[]
    for i,p in enumerate(root.findall('.//w:p',NS),1):
        item={'paragraph':i,'text':text(p,'w'),'style':None,'highlights':[],'images':[]}
        style=p.find('w:pPr/w:pStyle',NS)
        if style is not None: item['style']=style.get(q('w','val'))
        for run in p.findall('w:r',NS):
            highlight=run.find('w:rPr/w:highlight',NS)
            if highlight is not None: item['highlights'].append({'color':highlight.get(q('w','val')),'text':text(run,'w')})
        for blip in p.findall('.//a:blip',NS):
            rid=blip.get(q('r','embed'));r=rr.get(rid,{})
            if r.get('Target'):
                img=resolve('word/document.xml',r['Target']); item['images'].append(img)
                if img in z.namelist(): images.append({'paragraph':i,'part':img,'sha256':hashlib.sha256(z.read(img)).hexdigest()})
        blocks.append(item)
    tables=[[[text(c,'w') for c in row.findall('w:tc',NS)] for row in tbl.findall('w:tr',NS)] for tbl in root.findall('.//w:tbl',NS)]
    comments=[]
    if 'word/comments.xml' in z.namelist():
        comments=[{'id':c.get(q('w','id')),'text':text(c,'w')} for c in E.fromstring(z.read('word/comments.xml'))]
    return {'paragraphs':blocks,'tables':tables,'images':images,'comments':comments,
            'limitations':['Includes table paragraphs in paragraph list.','VML/embedded objects, tracked changes and headers need separate review if present.','Image pixels must be inspected; text extraction is not model interpretation.']}
def audit(path):
    path=Path(path)
    with ZipFile(path) as z:
        checks=package_checks(z)
        if 'ppt/presentation.xml' in z.namelist(): kind='pptx'; index=ppt_index(z)
        elif 'word/document.xml' in z.namelist(): kind='docx';index=doc_index(z)
        else: raise ValueError('Only OOXML PPTX/DOCX is supported')
    if kind=='pptx':
        for s in index['slides']:
            if s['invalid_animation_targets'] or s['duplicate_shape_ids']: checks['errors'].append(f"Slide {s['number']}: invalid/duplicate shape targets")
    return {'schema_version':1,'input':str(path.resolve()),'sha256':sha(path),'kind':kind,'checks':checks,'index':index}
def compare(a,b,background_only=False):
    changed=[]; forbidden=[]
    with ZipFile(a) as za,ZipFile(b) as zb:
        na,nb=set(za.namelist()),set(zb.namelist())
        active=set(slides(za)) if 'ppt/presentation.xml' in na else set()
        for name in sorted(na|nb):
            if name in na and name in nb and za.read(name)==zb.read(name): continue
            changed.append(name)
            if not background_only: continue
            if name not in active or name not in nb: forbidden.append(name);continue
            ra,rb=E.fromstring(za.read(name)),E.fromstring(zb.read(name))
            for root in (ra,rb):
                cs=root.find('p:cSld',NS);bg=cs.find('p:bg',NS)
                if bg is not None: cs.remove(bg)
            if E.tostring(ra)!=E.tostring(rb): forbidden.append(name)
    return {'source_sha256':sha(a),'output_sha256':sha(b),'changed_parts':changed,
            'background_only_requested':background_only,'out_of_scope_parts':forbidden}
def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='cmd',required=True)
    a=sub.add_parser('index');a.add_argument('source');a.add_argument('--out',required=True);a.add_argument('--images-dir')
    c=sub.add_parser('compare');c.add_argument('source');c.add_argument('output');c.add_argument('--background-only',action='store_true');c.add_argument('--out',required=True)
    args=parser.parse_args()
    if Path(args.out).exists():raise FileExistsError(args.out)
    if args.cmd=='compare':
        result=compare(args.source,args.output,args.background_only);fresh_json(args.out,result)
        print(json.dumps({'changed':len(result['changed_parts']),'out_of_scope':result['out_of_scope_parts']}));return int(bool(result['out_of_scope_parts']))
    result=audit(args.source)
    if args.images_dir:
        dest=Path(args.images_dir);dest.mkdir(parents=True,exist_ok=False)
        with ZipFile(args.source) as z:
            for name in z.namelist():
                if name.startswith('word/media/') and not name.endswith('/'):
                    with (dest/Path(name).name).open('xb') as f:f.write(z.read(name))
    fresh_json(args.out,result)
    print(json.dumps({'kind':result['kind'],'errors':result['checks']['errors'],'output':args.out},ensure_ascii=False))
    return int(bool(result['checks']['errors']))
if __name__=='__main__': raise SystemExit(run(main))
