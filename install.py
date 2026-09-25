"""Install the independent public candidate; never overwrite an existing Skill."""
import argparse, os, shutil, sys
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--skills-dir', type=Path)
    a=p.parse_args()
    name='lecture-ppt-workflow'
    source=Path(__file__).resolve().parent/name
    sys.path.insert(0,str(source/'scripts'))
    from validate_skill import validate
    result=validate(source)
    if result['errors']: raise ValueError(result['errors'])
    base=a.skills_dir or Path(os.environ.get('CODEX_HOME',str(Path.home()/'.codex')))/'skills'
    target=base/name
    if target.exists(): raise FileExistsError('Refusing existing Skill: '+str(target))
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copytree(source,target,ignore=shutil.ignore_patterns('__pycache__','*.pyc','node_modules','.venv'))
    print('Installed:',target)
    print('Open a new task and explicitly invoke $lecture-ppt-workflow. Copying is not discovery verification.')
    print('Install public dependencies explicitly: npm ci --ignore-scripts --prefix "'+str(target)+'"')
    print('For animations: python -m pip install -r "'+str(target/'requirements.txt')+'" in a dedicated virtual environment.')

if __name__=='__main__':
    try: main()
    except (OSError,ValueError) as e:
        print('ERROR:',e,file=sys.stderr)
        raise SystemExit(2)
