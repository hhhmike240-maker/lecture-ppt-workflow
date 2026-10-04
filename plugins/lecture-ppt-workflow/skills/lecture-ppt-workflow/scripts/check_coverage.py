"""Check content-to-slide mapping and explicit on-screen evidence, not semantic truth."""
import argparse,json
from pathlib import Path
from office_audit import audit, fresh_json
from cli_support import run

def check(mapping,deck):
    data=audit(deck); pages=data['index'].get('slides',[]);errors=list(data['checks']['errors']);seen=set()
    if data['kind']!='pptx':raise ValueError('Coverage target must be PPTX')
    for item in mapping.get('knowledge',[]):
        key=item.get('id');nums=item.get('slides',[])
        if not key or key in seen:errors.append('Missing/duplicate knowledge id: '+str(key))
        seen.add(key)
        if item.get('required',True) and not nums:errors.append(f'{key}: no slide')
        if any(type(n)!=int or not 1<=n<=len(pages) for n in nums):errors.append(f'{key}: invalid slide number');continue
        joined='\n'.join(pages[n-1]['text'] for n in nums)
        for phrase in item.get('on_screen',[]):
            if phrase not in joined:errors.append(f'{key}: on-screen evidence missing: {phrase}')
    if not seen:errors.append('Empty knowledge map')
    for item in mapping.get('figures',[]):
        if not item.get('source') or not item.get('treatment'):errors.append('Figure source/treatment missing')
        nums=item.get('slides',[])
        if not nums or any(type(n)!=int or not 1<=n<=len(pages) for n in nums):errors.append('Figure slide mapping missing/invalid')
    return {'deck_sha256':data['sha256'],'errors':errors,'knowledge_items':len(seen),
      'limitations':['Map completeness depends on full lecture review.','Literal phrase checks do not validate definitions, original figures, model relationships or teaching quality.']}
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mapping');p.add_argument('deck');p.add_argument('--out',required=True);a=p.parse_args()
    if Path(a.out).exists():raise FileExistsError(a.out)
    r=check(json.loads(Path(a.mapping).read_text(encoding='utf-8')),a.deck);fresh_json(a.out,r)
    print(json.dumps(r,ensure_ascii=False));return int(bool(r['errors']))
if __name__=='__main__':raise SystemExit(run(main))
