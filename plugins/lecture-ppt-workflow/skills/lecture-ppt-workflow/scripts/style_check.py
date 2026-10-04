"""Read PPTX style inheritance and geometric risks without rewriting the deck.

Reports background inheritance XML, placeholder geometry, group transforms,
explicit fonts, out-of-bounds objects and optional header-role constraints.
It does not infer glyph bounds or fully resolve theme font/color transforms.
"""
import argparse, json, math
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as E
from office_audit import NS, q, slides, relationships, resolve, sha, fresh_json, text
from cli_support import run

IDENTITY=(1,0,0,1,0,0)
def mul(a,b):
    x,y,z,w,u,v=a; A,B,C,D,U,V=b
    return (x*A+z*B,y*A+w*B,x*C+z*D,y*C+w*D,x*U+z*V+u,y*U+w*V+v)
def point(m,x,y):return (m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5])
def pair(node,name,a,b,default=(0,0)):
    n=node.find('a:'+name,NS)
    return tuple(float(n.get(k,'0')) for k in (a,b)) if n is not None else default
def xf(node):
    for path in ('p:spPr/a:xfrm','p:grpSpPr/a:xfrm','p:xfrm'):
        x=node.find(path,NS)
        if x is not None:return x
def local_transform(x,group=False):
    ox,oy=pair(x,'off','x','y');w,h=pair(x,'ext','cx','cy')
    deg=float(x.get('rot','0'))/60000; c=math.cos(math.radians(deg));s=math.sin(math.radians(deg))
    fx=-1 if x.get('flipH') in ('1','true') else 1;fy=-1 if x.get('flipV') in ('1','true') else 1
    matrix=mul((1,0,0,1,ox+w/2,oy+h/2),mul((c,s,-s,c,0,0),(fx,0,0,fy,-fx*w/2,-fy*h/2)))
    if group:
        cx,cy=pair(x,'chOff','x','y');cw,ch=pair(x,'chExt','cx','cy')
        if not cw or not ch:raise ValueError('Group chExt missing/zero; cannot resolve geometry')
        matrix=mul(matrix,(w/cw,0,0,h/ch,-cx*w/cw,-cy*h/ch))
    return matrix,w,h
def linked(z,part,suffix):
    for r in relationships(z,part).values():
        if r.get('Type','').endswith('/'+suffix) and r.get('TargetMode')!='External':
            target=resolve(part,r['Target'])
            if target in z.namelist():return target,E.fromstring(z.read(target))
    return None,None
def placeholder(node):return node.find('.//p:ph',NS)
def inherited_shape(node,root):
    ph=placeholder(node)
    if ph is None or root is None:return None
    candidates=root.findall('.//p:sp',NS)
    for item in candidates:
        other=placeholder(item)
        if other is not None and other.get('idx','0')==ph.get('idx','0'):return item
    for item in candidates:
        other=placeholder(item)
        if other is not None and other.get('type','obj')==ph.get('type','obj'):return item

def inspect(source,policy=None):
    policy=policy or {}; result={'sha256':sha(source),'slides':[],'errors':[], 'warnings':[]}
    with ZipFile(source) as z:
        pres=E.fromstring(z.read('ppt/presentation.xml'));size=pres.find('p:sldSz',NS)
        if size is None:raise ValueError('Missing slide dimensions')
        sw,sh=float(size.get('cx')),float(size.get('cy'));result['size_emu']=[sw,sh]
        expected=policy.get('size_emu')
        if expected and list(expected)!=[sw,sh]:result['errors'].append('Slide dimensions differ from policy')
        for num,part in enumerate(slides(z),1):
            root=E.fromstring(z.read(part));lp,layout=linked(z,part,'slideLayout')
            mp,master=linked(z,lp,'slideMaster') if lp else (None,None)
            tp,theme=linked(z,mp,'theme') if mp else (None,None)
            info={'number':num,'part':part,'layout':lp,'master':mp,'theme':tp,'objects':[], 'background':None}
            for p,r in ((part,root),(lp,layout),(mp,master)):
                bg=r.find('p:cSld/p:bg',NS) if r is not None else None
                if bg is not None:
                    info['background']={'source':p,'xml':E.tostring(bg,encoding='unicode')};break
            # Preserve theme/color/style inputs in report instead of inventing resolved values.
            info['inheritance_inputs']={}
            for name,r in [('layout',layout),('master',master),('theme',theme)]:
                if r is None:continue
                paths=('p:txStyles','p:clrMap','p:clrMapOvr','a:themeElements/a:fontScheme','a:themeElements/a:clrScheme')
                info['inheritance_inputs'][name]=[E.tostring(n,encoding='unicode') for path in paths for n in r.findall(path,NS)]
            def walk(tree,m=IDENTITY):
                if tree is None:return
                for node in tree:
                    if node.tag not in [q('p',v) for v in ('sp','pic','cxnSp','graphicFrame','grpSp')]:continue
                    nv=node.find('.//p:cNvPr',NS);name=nv.get('name','') if nv is not None else '';sid=nv.get('id') if nv is not None else None
                    x=xf(node);origin='slide'; ls=inherited_shape(node,layout);ms=inherited_shape(ls if ls is not None else node,master)
                    if x is None:
                        for label,n in [('layout',ls),('master',ms)]:
                            if n is not None and xf(n) is not None:x=xf(n);origin=label;break
                    if x is None:
                        result['warnings'].append(f'Slide {num} object {sid}: unresolved geometry');continue
                    group=node.tag==q('p','grpSp')
                    try:local,w,h=local_transform(x,group)
                    except ValueError as ex:result['warnings'].append(f'Slide {num}: {ex}');continue
                    combined=mul(m,local)
                    if group:walk(node,combined);continue
                    pts=[point(combined,a,b) for a,b in [(0,0),(w,0),(0,h),(w,h)]]
                    box=[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)]
                    explicit=sorted({float(n.get('sz'))/100 for n in node.iter() if n.get('sz') and n.tag in (q('a','rPr'),q('a','defRPr'),q('a','endParaRPr'))})
                    info['objects'].append({'id':sid,'name':name,'text':text(node),'bounds_emu':box,'geometry_source':origin,'explicit_font_sizes_pt':explicit,'group_transform':list(m)})
                    if box[0]<-12700 or box[1]<-12700 or box[2]>sw+12700 or box[3]>sh+12700:
                        result['warnings'].append(f'Slide {num} object {sid}: out-of-bounds (may be intentional decoration)')
                    rule=policy.get('roles',{}).get(name)
                    if rule:
                        if 'top_min' in rule and box[1]<rule['top_min']:result['errors'].append(f'Slide {num} {name}: above allowed area')
                        if 'bottom_max' in rule and box[3]>rule['bottom_max']:result['errors'].append(f'Slide {num} {name}: below allowed area')
                        if 'font_sizes_pt' in rule and any(v not in rule['font_sizes_pt'] for v in explicit):result['errors'].append(f'Slide {num} {name}: explicit font size differs')
            walk(root.find('p:cSld/p:spTree',NS));result['slides'].append(info)
    result['limitations']=['Bounds use group scale, rotation and flip, not glyphs/shadows.', 'Placeholder positions follow idx/type matches; complex placeholder overrides require inspection.', 'Theme colors/fonts, paragraph defaults and glyph sizes remain inheritance inputs, not claimed resolved values.', 'Master/layout decorative objects are not included in slide object bounds; inspect rendered pages.']
    return result
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('--out',required=True);p.add_argument('--policy');a=p.parse_args()
    if Path(a.out).exists():raise FileExistsError(a.out)
    result=inspect(a.source,json.loads(Path(a.policy).read_text(encoding='utf-8')) if a.policy else None)
    fresh_json(a.out,result);print(json.dumps({'errors':result['errors'],'warnings':len(result['warnings']),'slides':len(result['slides'])}));return int(bool(result['errors']))
if __name__=='__main__':raise SystemExit(run(main))
