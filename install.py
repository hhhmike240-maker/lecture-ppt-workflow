"""Install the lecture-ppt-workflow Skill for an AI coding agent. Never overwrites an existing Skill.

Targets:
  claude          ~/.claude/skills            (Claude Code, all projects)
  codex           $CODEX_HOME/skills or ~/.codex/skills (Codex, all projects)
  claude-project  ./.claude/skills            (Claude Code, current project only)
  codex-project   ./.agents/skills            (Codex, current project only)
Or pass --skills-dir to choose any folder.
"""
import argparse, os, shutil, subprocess, sys
from pathlib import Path

NAME = 'lecture-ppt-workflow'
SOURCE = Path(__file__).resolve().parent / NAME


def target_dir(target, skills_dir):
    if skills_dir:
        return Path(skills_dir)
    home = Path.home()
    return {
        'claude': home / '.claude' / 'skills',
        'codex': Path(os.environ.get('CODEX_HOME', str(home / '.codex'))) / 'skills',
        'claude-project': Path.cwd() / '.claude' / 'skills',
        'codex-project': Path.cwd() / '.agents' / 'skills',
    }[target]


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--target', choices=['claude', 'codex', 'claude-project', 'codex-project'], default='codex')
    p.add_argument('--skills-dir', type=Path, help='install into this skills folder instead of a named target')
    p.add_argument('--with-deps', action='store_true', help='also run "npm ci --ignore-scripts" in the installed Skill')
    a = p.parse_args()
    sys.path.insert(0, str(SOURCE / 'scripts'))
    from validate_skill import validate
    result = validate(SOURCE)
    if result['errors']:
        raise ValueError(result['errors'])
    target = target_dir(a.target, a.skills_dir) / NAME
    if target.exists():
        raise FileExistsError(f'Refusing to overwrite existing Skill: {target}\n'
                              'Rename or remove it yourself first if you want a fresh copy.')
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE, target, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'node_modules', '.venv'))
    print('Installed:', target)
    npm = ['npm', 'ci', '--ignore-scripts', '--prefix', str(target)]
    if a.with_deps:
        print('Running:', ' '.join(npm))
        subprocess.run(npm, check=True, shell=os.name == 'nt')
    else:
        print('Next, install the generation dependencies (Node.js 20+ required):')
        print('  ' + ' '.join(f'"{x}"' if ' ' in x else x for x in npm))
    print('Optional, for editing animations in existing decks: python -m pip install -r "' + str(target / 'requirements.txt') + '"')
    agent = 'agent' if a.skills_dir else ('Claude Code' if a.target.startswith('claude') else 'Codex')
    print(f'Then start a new {agent} session and ask, for example:')
    print('  "Use the lecture-ppt-workflow skill to turn lecture.docx into teaching slides."')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as e:
        print('ERROR:', e, file=sys.stderr)
        raise SystemExit(2)
