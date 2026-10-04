"""Copy a direct solid background from a reference slide to explicitly selected slides.
XML outside p:bg is byte-preserved. Existing outputs are refused. No media copied.
"""
import argparse
import re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as E
from office_audit import NS, slides, compare, fresh_json
from cli_support import run

def selected(value,count):
    result=set()
    for token in value.split(','):
        span=token.split('-')
        if len(span)==1:result.add(int(span[0]))
        elif len(span)==2:
            first,last=map(int,span)
            if first>last:raise ValueError('Reversed slide range is not allowed')
            result.update(range(first,last+1))
        else:raise ValueError('Use page numbers such as 1,3-5')
    if not result or min(result)<1 or max(result)>count:raise ValueError('Invalid slide selection')
    return sorted(result)
def patch(source,reference,ref_page,pages,destination):
    source,reference,destination=map(Path,(source,reference,destination))
    if destination.exists():raise FileExistsError(destination)
    with ZipFile(reference) as zr:
        order=slides(zr)
        if not 1<=ref_page<=len(order): raise ValueError('Reference page out of range')
        root=E.fromstring(zr.read(order[ref_page-1]));bg=root.find('p:cSld/p:bg',NS)
        if bg is None or bg.find('p:bgPr/a:solidFill',NS) is None:raise ValueError('Need a direct solid background; inherited/image backgrounds require separate handling')
        if bg.find('.//a:schemeClr',NS) is not None:raise ValueError('Theme background requires resolving target theme; refusing ambiguous copy')
        raw=zr.read(order[ref_page-1]).decode('utf-8')
        m=re.search(r'<p:bg(?:\s[^>]*)?>.*?</p:bg>',raw,re.S)
        if not m:raise ValueError('Unsupported namespace serialization; no output written')
        bg_xml=m.group(0)
    with ZipFile(source) as zin:
        order=slides(zin);nums=selected(pages,len(order));parts={order[i-1] for i in nums};edits={}
        for part in parts:
            raw=zin.read(part).decode('utf-8')
            if '<p:cSld' not in raw:raise ValueError('Unsupported namespace prefix; no output written')
            new,n=re.subn(r'<p:bg(?:\s[^>]*)?>.*?</p:bg>',lambda _:bg_xml,raw,count=1,flags=re.S)
            if not n:
                new,n=re.subn(r'(<p:cSld(?:\s[^>]*)?>)',lambda m:m[0]+bg_xml,raw,count=1)
            if not n:raise ValueError('Missing cSld')
            E.fromstring(new);edits[part]=new.encode('utf-8')
        destination.parent.mkdir(parents=True,exist_ok=True)
        with ZipFile(destination,'x') as zout:
            for info in zin.infolist():zout.writestr(info,edits.get(info.filename,zin.read(info.filename)))
    check=compare(source,destination,True)
    if check['out_of_scope_parts']:raise RuntimeError('Background comparison failed; retain draft for diagnosis')
    return check
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('destination');p.add_argument('--reference',required=True);p.add_argument('--reference-slide',type=int,required=True);p.add_argument('--slides',required=True);p.add_argument('--report',required=True)
    a=p.parse_args()
    if Path(a.report).exists():raise FileExistsError(a.report)
    r=patch(a.source,a.reference,a.reference_slide,a.slides,a.destination);fresh_json(a.report,r)
    print('Saved; background-only comparison passed:',len(r['changed_parts']),'parts')
if __name__=='__main__':raise SystemExit(run(main))
