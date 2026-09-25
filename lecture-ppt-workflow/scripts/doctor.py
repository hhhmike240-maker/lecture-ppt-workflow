"""Read-only dependency probe. No downloads, installs, deletion or network calls."""
import argparse,importlib.util,json,os,platform,shutil,subprocess,sys
from pathlib import Path
from office_audit import fresh_json
from cli_support import run

def probe():
    node=os.environ.get('BUPT_NODE') or shutil.which('node')
    root=Path(__file__).resolve().parents[1]
    pptxgen=(root/'node_modules'/'pptxgenjs').is_dir()
    capabilities={'parsing':sys.version_info>=(3,10),'animations':importlib.util.find_spec('lxml') is not None,'generation':bool(node and pptxgen),'rendering':False}
    issues=[]
    if not capabilities['animations']:issues.append('Animation helper needs lxml in this Python environment; no auto-install was attempted.')
    if not pptxgen: issues.append('Generation requires npm ci --ignore-scripts in this Skill directory.')
    if not node: issues.append('Generation requires Node.js 20+; set BUPT_NODE or add node to PATH.')
    if shutil.which('soffice') and shutil.which('pdftoppm'): capabilities['rendering']=True
    elif platform.system()=='Windows': issues.append('Portable rendering needs LibreOffice and Poppler; Windows PowerPoint can use render_windows.ps1.')
    else: issues.append('Rendering needs LibreOffice/soffice and Poppler/pdftoppm.')
    return {'python':sys.version.split()[0],'platform':platform.system(),'capabilities':capabilities,'issues':issues,'slideshow_playback_tested':False,'note':'Generation/import and static rendering are separate; neither proves slideshow playback.'}
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',required=True);a=p.parse_args()
    if Path(a.out).exists():raise FileExistsError(a.out)
    r=probe();fresh_json(a.out,r);print(json.dumps(r,ensure_ascii=False));return 0 if r['capabilities']['parsing'] and r['capabilities']['generation'] and r['capabilities']['animations'] else 1
if __name__=='__main__':raise SystemExit(run(main))
