"""Create a 60-second captioned walkthrough of the original demo slides.

Uses an explicitly supplied ffmpeg executable. No downloads, model calls,
file deletion or output replacement. This is not a screen recording.
"""
import argparse
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SCENES = [
    ('preview-standard/001.png', 'Start with your lecture notes and a reference deck.',
     'Bring the content. Keep the instructor in charge.'),
    ('preview-before/002.png', 'Before: a dense teaching scenario.',
     'This fictional Chinese example is included in the repository.'),
    ('preview-after/002.png', 'After: materials, discussion, and reference analysis.',
     'The slide separates the teaching stages into clear regions.'),
    ('preview-after/003.png', 'Close with the chapter relationships.',
     'Editable PowerPoint content and speaker notes support review.'),
    ('preview-after/001.png', 'Try a small example before your own chapter.',
     'Python, Node, fonts, and presentation software are required.'),
    ('preview-after/002.png', 'Try it. Tell us what worked or where you got stuck.',
     'github.com/hhhmike240-maker/lecture-ppt-workflow'),
]

def stamp(seconds):
    return f'0:{seconds // 60:02d}:{seconds % 60:02d}.00'

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ffmpeg', required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--work', type=Path, required=True)
    a = p.parse_args()
    out, work = a.out.resolve(), a.work.resolve()
    if out.exists() or work.exists():
        raise FileExistsError('Choose new output and work paths.')
    for asset, _, _ in SCENES:
        if not (ROOT / 'demo' / asset).is_file():
            raise FileNotFoundError(asset)
    work.mkdir(parents=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for asset, _, _ in SCENES:
        path = (ROOT / 'demo' / asset).as_posix().replace("'", "'\\''")
        lines.extend([f"file '{path}'", 'duration 10'])
    lines.append(lines[-2])
    (work / 'slides.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 900
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Arial,30,&H00FFFFFF,&H00FFFFFF,&H001D1010,&H001D1010,0,0,0,0,100,100,0,0,1,0,0,7,64,64,20,1
Style: Caption,Arial,27,&H00FFFFFF,&H00FFFFFF,&H001D1010,&H001D1010,0,0,0,0,100,100,0,0,1,0,0,7,64,64,20,1
Style: Note,Arial,19,&H00BDB8AE,&H00BDB8AE,&H001D1010,&H001D1010,0,0,0,0,100,100,0,0,1,0,0,7,64,64,20,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events = [
        'Dialogue: 0,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\pos(64,22)}LECTURE PPT WORKFLOW',
        'Dialogue: 0,0:00:00.00,0:01:00.00,Note,,0,0,0,,{\\pos(64,67)}Original Chinese demo | Visual walkthrough, not a screen recording',
    ]
    for index, (_, title, subtitle) in enumerate(SCENES):
        start, end = stamp(index * 10), stamp((index + 1) * 10)
        events.extend([
            f'Dialogue: 0,{start},{end},Caption,,0,0,0,,{{\\pos(64,783)}}{title}',
            f'Dialogue: 0,{start},{end},Note,,0,0,0,,{{\\pos(64,830)}}{subtitle}',
        ])
    (work / 'captions.ass').write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
    subprocess.run([
        str(Path(a.ffmpeg).resolve()), '-hide_banner', '-loglevel', 'warning', '-n',
        '-f', 'concat', '-safe', '0', '-i', 'slides.txt',
        '-vf', 'scale=1152:648,pad=1280:900:64:116:color=0x101D2B,ass=captions.ass,fps=12',
        '-t', '60', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)
    ], cwd=work, check=True)
    print(f'Created {out.name}: 60-second static-slide walkthrough, no audio.')

if __name__ == '__main__':
    main()
