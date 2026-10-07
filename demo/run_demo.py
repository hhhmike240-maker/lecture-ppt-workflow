"""Reproduce the public demo: outline -> PPTX (default style, sample template, English) -> checks -> previews.

Uses explicitly installed dependencies only (npm ci in the Skill directory; lxml for Python checks).
Never installs anything, calls a model, deletes files or overwrites output.
Rendering uses PowerPoint on Windows, LibreOffice + Poppler elsewhere; pass --no-render to skip it.
"""
import argparse, json, os, subprocess, sys
from pathlib import Path

DEMO = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True, help='new output directory')
    parser.add_argument('--skill-dir', type=Path, default=DEMO.parent / 'lecture-ppt-workflow')
    parser.add_argument('--node', default=os.environ.get('LECTURE_NODE', 'node'))
    parser.add_argument('--no-render', action='store_true', help='skip static PNG previews')
    args = parser.parse_args()
    out, skill = args.out.resolve(), args.skill_dir.resolve()
    if out.exists():
        raise FileExistsError('Use a fresh output directory: ' + str(out))
    if not (skill / 'scripts' / 'build_outline.mjs').is_file():
        raise ValueError('Invalid Skill directory: ' + str(skill))
    out.mkdir(parents=True)

    def run(*command, ok=(0,)):
        result = subprocess.run([str(x) for x in command])
        if result.returncode not in ok:
            raise subprocess.CalledProcessError(result.returncode, command)
        return result.returncode

    run(sys.executable, skill / 'scripts' / 'doctor.py', '--out', out / 'environment.json', ok=(0, 1))
    # name -> (folder with outline.json and coverage-map.json, extra build arguments)
    builds = {'default': (DEMO, []), 'template': (DEMO, ['--template', DEMO / 'template' / 'sample-template.pptx']),
              'english': (DEMO / 'en', [])}
    for name, (source, extra) in builds.items():
        run(args.node, skill / 'scripts' / 'build_outline.mjs', source / 'outline.json', out / name, *extra)
        deck = out / name / 'lecture.pptx'
        run(sys.executable, skill / 'scripts' / 'check_coverage.py', source / 'coverage-map.json', deck, '--out', out / name / 'coverage.json')
        run(sys.executable, skill / 'scripts' / 'style_check.py', deck, '--out', out / name / 'style.json', ok=(0, 1))
        if args.no_render:
            continue
        preview = out / name / 'preview'
        if os.name == 'nt':
            run('powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', skill / 'scripts' / 'render_windows.ps1',
                '-InputPptx', deck, '-OutputDirectory', preview)
        else:
            run(args.node, skill / 'scripts' / 'render.mjs', deck, preview)
    summary = {name: json.loads((out / name / 'report.json').read_text(encoding='utf-8'))['summary'] for name in builds}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print('Demo complete: generation, click reveals, coverage and style checks' + ('' if args.no_render else ', static previews') +
          '. Slideshow playback and teaching quality still need a teacher\'s review.')


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):   # Chinese summaries on legacy-code-page consoles
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as e:
        print('ERROR: ' + str(e) + '. Partial output retained; retry using a new directory.', file=sys.stderr)
        raise SystemExit(2)
