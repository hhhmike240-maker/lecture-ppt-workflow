"""Compose README showcase images from rendered demo previews (maintainer helper, needs Pillow).

Usage: python scripts/make_showcase.py --font path/to/CJK-font.ttc
       python scripts/make_showcase.py --english path/to/english/preview
Writes docs/images/showcase.png and docs/images/template.png, or with --english only
docs/images/showcase.en.png from a rendering of demo/en/outline.json (refuses to overwrite).
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG, INK, MUTED = (244, 246, 248), (31, 45, 56), (91, 107, 118)


def card(img, width):
    img = img.convert('RGB').resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    pad = 14
    canvas = Image.new('RGBA', (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((pad, pad + 4, pad + img.width, pad + img.height + 4), 10, fill=(20, 40, 60, 60))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(7)))
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), 8, fill=255)
    canvas.paste(img, (pad, pad), mask)
    return canvas


def grid(paths, cols, width, gap, out, title, font):
    cards = [card(Image.open(p), width) for p in paths]
    cw, ch = cards[0].size
    rows = (len(cards) + cols - 1) // cols
    top = 86 if title else 24
    sheet = Image.new('RGBA', (cols * cw + (cols - 1) * gap + 48, top + rows * ch + (rows - 1) * gap + 24), BG + (255,))
    if title:
        ImageDraw.Draw(sheet).text((38, 28), title, font=font, fill=INK)
    for i, c in enumerate(cards):
        sheet.alpha_composite(c, (24 + (i % cols) * (cw + gap), top + (i // cols) * (ch + gap)))
    sheet.convert('RGB').save(out, optimize=True)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--font')
    p.add_argument('--english', type=Path, help='folder with 001.png ... rendered from demo/en/outline.json')
    a = p.parse_args()
    out = ROOT / 'docs' / 'images'
    out.mkdir(parents=True, exist_ok=True)
    pick = ['004', '005', '007', '009', '012', '014']
    if a.english:
        if (out / 'showcase.en.png').exists():
            raise FileExistsError(out / 'showcase.en.png')
        grid([a.english / f'{n}.png' for n in pick], 3, 420, 4, out / 'showcase.en.png', None, None)
        print('Created', out / 'showcase.en.png')
        return
    if not a.font:
        p.error('--font is required for the Chinese images')
    font, small = ImageFont.truetype(a.font, 30), ImageFont.truetype(a.font, 24)
    for name in ('showcase.png', 'template.png'):
        if (out / name).exists():
            raise FileExistsError(out / name)
    grid([ROOT / 'demo' / 'preview' / f'{n}.png' for n in pick], 3, 420, 4, out / 'showcase.png', None, font)
    # Same outline, default style vs the sample reference deck.
    left, right = card(Image.open(ROOT / 'demo' / 'preview' / '005.png'), 520), card(Image.open(ROOT / 'demo' / 'preview-template' / '005.png'), 520)
    sheet = Image.new('RGBA', (left.width * 2 + 60, left.height + 70), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((38, 18), '默认风格', font=small, fill=MUTED)
    d.text((left.width + 58, 18), '上传你的课件后：自动套用标志、横线、配色', font=small, fill=MUTED)
    sheet.alpha_composite(left, (24, 54)); sheet.alpha_composite(right, (left.width + 44, 54))
    sheet.convert('RGB').save(out / 'template.png', optimize=True)
    print('Created', out / 'showcase.png', out / 'template.png')


if __name__ == '__main__':
    main()
