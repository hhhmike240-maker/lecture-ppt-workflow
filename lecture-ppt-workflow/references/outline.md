# Lecture outline format (lecture-outline v1)

An outline holds only content and layout choices; coordinates, font sizes and spacing are computed by `scripts/lib/outline.mjs`. The web page, the `build_outline.mjs` command and the skill share this code.

```json
{
  "format": "lecture-outline",
  "version": 1,
  "title": "Chapter 3 Job Analysis",
  "language": "en",
  "theme": {"primary": "#2F5D7C", "accent": "#167A85"},
  "slides": [{"layout": "cover", "title": "Chapter 3 Job Analysis"}]
}
```

Complete examples: [examples/outline.en.json](../examples/outline.en.json) (English) and [examples/outline.json](../examples/outline.json) (Chinese), 15 slides each, covering every layout except figure. Prompts for chatbots are in the repository's `prompts/prompt.en.md` and `prompts/prompt.zh.md`.

## Language

`language` is the language of the slide text. `zh…` gives a Chinese deck; any other value gives an English deck. Without `language`, an outline containing Chinese characters is Chinese and anything else is English. The deck language decides:

- labels the scripts add: agenda and review headings, "Case material", "Discussion", "Suggested analysis", "Answer:", the fictional-scenario label, the figure placeholder, and the "[TO DO]" and "[Click order]" lines in the notes;
- the default font (Microsoft YaHei for Chinese, Calibri for English; with a reference deck, English decks use its Latin font);
- how "Term: explanation" is recognized (Chinese: a term of up to 16 characters before `：` or `:`; English: up to 6 words before `: ` with a space, so times and URLs are left alone).

Issue messages follow the deck language unless `layoutOutline(outline, {lang})`, `build_outline.mjs --lang` or the web page's interface language says otherwise.

## Layouts and fields

| layout | Required | Optional | Notes |
|---|---|---|---|
| cover | title | subtitle, meta | With a template cover, centered in the template's title band |
| agenda | items (2–10) | title | Two columns above 5 items |
| section | title | number, subtitle | Sets the heading of the following slides ("number title") |
| bullets | title, points (1–8) | emphasis, style (list/cards), reveal | 2–4 "Term: explanation" points become cards; reveal=true shows points one click at a time |
| definition | term, definition | title, points (≤4) | "Term: explanation" points render as cards |
| compare | title, columns (2–3, title + points) | conclusion | |
| table | title, headers (2–6), rows (≤10) | note, boldFirstColumn | Column widths follow content; short text does not wrap |
| process | title, steps (2–6, title + text) | | Arrows are editable connectors |
| case | title, material, questions (1–4) | analysis (≤5, 2–3 short points recommended), fictional, source, label | analysis appears on click 1; without source it is labeled as a fictional teaching scenario |
| figure | title, image or placeholder | caption, points, imageSide | image is a file name (relative to the outline, or uploaded on the web page); without it a dashed placeholder is left |
| quiz | title, questions (1–4, q + answer) | options | 3–4 questions use a 2×2 grid; the answer to question n appears on click n |
| review | branches (2–5, title + items) | title, center | Structure map; keep branch titles to 1–3 words (about 8 Chinese characters) |
| closing | title | subtitle | Same style as section |

Common fields: `notes` (speaker notes; if missing on a content slide, a "[TO DO]" placeholder is written and a warning is given), `source` (citation in the footer), `section` (overrides or clears the inherited heading; null clears it).

## Theme

`font`, `latinFont`, `primary`, `accent`, `text`, `muted`, `background`, `surface`, `tint`, `line`, `border`, `warm` (#RRGGBB), `pageNumbers` (boolean), `width` (640–1280; the default 960 is 16:9, 720 is 4:3), `backgroundImage`/`coverImage` (image file names, full-slide background).

With `--template reference.pptx` or a reference deck uploaded on the web page, the theme and a `frame` are generated: the title rule position (ruleY), a heading width that avoids logos (headingRight), the page number position (footerRight), the content bottom (bottom) and the cover title band (coverTitle). Theme fields written in the outline take precedence.

## Check results

`layoutOutline()` returns `{spec, issues, summary}`. In issues:

- **error**: text overflows the slide (the font is never shrunk; trim or split as the message says), a heading longer than one line, a missing image file, and so on. The command exits with code 1 and status needs-revision, but still writes the candidate files for review.
- **warning**: missing speaker notes, more than 6 points, a figure placeholder to replace, a long source line, and so on.

Text width is estimated from Microsoft YaHei character widths (CJK characters 1 em, Latin proportionally), scaled for narrower Latin fonts (Calibri 0.86, Arial 0.93; measured with canvas `measureText`), with a line height of 1.32. The estimate is slightly conservative; always render and look at every slide.

## After generation

`finalize.mjs`, for each slide: copies template decorations and backgrounds (if any) → renumbers shape IDs (avoids duplicate IDs from PptxGenJS tables) → writes a native "on click, fade in 0.4 s" animation for shapes named `reveal_group_order`. The animation structure matches `add_animations.py` and is cross-checked by the Python tests.
