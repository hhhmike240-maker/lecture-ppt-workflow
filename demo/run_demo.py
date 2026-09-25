"""Run the public PptxGenJS demonstration using explicitly installed dependencies.
Never installs dependencies, calls a model, deletes files or overwrites output.
"""
import argparse, json, os, subprocess, sys
from pathlib import Path
from specs import specifications

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--skill-dir',type=Path,default=Path(__file__).resolve().parents[1]/'lecture-ppt-workflow')
    parser.add_argument('--node',default=os.environ.get('BUPT_NODE','node'))
    args=parser.parse_args()
    out=args.out.resolve(); skill=args.skill_dir.resolve()
    if out.exists(): raise FileExistsError('Use a fresh output directory: '+str(out))
    if not (skill/'scripts/doctor.py').is_file(): raise ValueError('Invalid installed Skill directory')
    out.mkdir(parents=True)
    def run(*command):
        subprocess.run([str(x) for x in command],check=True)
    doctor=subprocess.run([sys.executable,str(skill/'scripts/doctor.py'),'--out',str(out/'environment.json')],capture_output=True,text=True)
    (out/'doctor.stdout.txt').write_text(doctor.stdout,encoding='utf-8');(out/'doctor.stderr.txt').write_text(doctor.stderr,encoding='utf-8')
    if doctor.returncode not in (0,1): raise subprocess.CalledProcessError(doctor.returncode,doctor.args)
    for name,spec in specifications().items():
        specpath=out/(name+'.json')
        specpath.write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8')
        run(args.node,skill/'scripts/build_from_spec.mjs',specpath,out/(name+'-build'))
        source=out/(name+'-build')/'candidate.pptx'
        if name=='after':
            run(sys.executable,skill/'scripts/add_animations.py',source,out/'after.pptx','--slides','2','--audit',out/'animation.json')
            source=out/'after.pptx'
        run(sys.executable,skill/'scripts/office_audit.py','index',source,'--out',out/(name+'-index.json'))
        run(sys.executable,skill/'scripts/style_check.py',source,'--out',out/(name+'-style.json'))
        preview=out/('preview-'+name)
        if os.name=='nt': run('powershell','-NoProfile','-ExecutionPolicy','Bypass','-File',skill/'scripts/render_windows.ps1','-InputPptx',source,'-OutputDirectory',preview)
        else: run(args.node,skill/'scripts/render.mjs',source,preview)
    print('Completed public PptxGenJS generation, animation, structural checks and static export; not model invocation or slideshow testing.')

if __name__=='__main__':
    try: main()
    except (OSError,ValueError,subprocess.CalledProcessError) as e:
        print('ERROR: '+str(e)+'. Partial output retained; retry using a new directory.',file=sys.stderr)
        raise SystemExit(2)
