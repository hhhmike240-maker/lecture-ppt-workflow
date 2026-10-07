# Local page-specification builder

> For new chapter decks, prefer the [lecture outline](outline.md) and `build_outline.mjs`: you write only content and the layout is computed. The low-level specification on this page is for special slides where every coordinate must be set by hand.

Use it to create new slides from content that has already been reviewed. It is not an automatic Word-to-slides layout engine and is not for lossless rewriting of an existing deck. The model still reads the materials, chooses layouts, covers the knowledge and reviews the visuals. Limited revisions should use conservative patches first; do not treat this tool as a general converter for teachers' decks.

## Running

Follow the [runtime and licensing boundaries](runtime.md) first. Before generating, install the locked public npm dependencies in this skill directory:

```text
npm ci --ignore-scripts
```

Do not write this computer's paths into the skill. Then use the bundled public adapter:

```text
node scripts/build_from_spec.mjs examples/minimal.json work/build-new
python scripts/add_animations.py work/build-new/candidate.pptx work/animated.pptx --slides 1 --audit work/animation.json
node scripts/render.mjs work/animated.pptx work/render-new
```

The builder writes only into a brand-new directory: candidate.pptx, build-receipt.json and any inspect files the adapter produces. It refuses an existing directory, and on failure it keeps the diagnostics instead of deleting them. All files stay candidates until content, animation, final package structure and every slide's visuals have been checked. Use `render_windows.ps1` for static export with PowerPoint on Windows; LibreOffice + Poppler for cross-platform static export. Real slideshow playback still needs its own test.

## Specification

The top-level JSON has `version` 1, `font` (an explicit font name), `slideSize` (width/height in pixels) and `slides`. 96 px = 1 inch; 16 pt is about 21.333 px. Take fonts from the current standard rather than copying the example.

Each slide needs its own `id`, non-empty speaker `notes` in the course language, and `elements`. A `background` color is optional. Every element needs a unique `name`; all except connectors have a `position` with left, top, width and height. Coordinates must stay on the canvas.

- shape: `geometry` can be textbox, rect, roundRect, ellipse or line; `fontSize` is required when there is text. `bold`, `color`, `fill`, `lineColor` and `lineWidth` can be set. Text and shapes are native and editable. A thin rectangle with positive height can serve as a rule.
- image: `path` is a local PNG/JPEG path resolved relative to the specification file; remote URLs are not allowed. Images are embedded whole with contain fit, not stretched or cropped by default, and need `alt`. Text inside an embedded image is not editable; do not call it a native figure. The image `name` is only used inside the specification; exported object names may differ.
- table: `values` is a non-empty matrix of strings/numbers with equal column counts; `fontSize` is required; `columnWidths` (pixels) is optional. Exported as a native table with a fixed simple blue header; complex template tables need to be built with the real API, not forced into this format.
- connector: `from`/`to` name shapes on the same slide; `fromSide`/`toSide` must be left/right/top/bottom; `arrow` is optional. A line must have a teaching reason; do not use causal-looking arrows to fake a theoretical relationship.

**Shapes** that should appear on click are named reveal_1_1, reveal_1_2, reveal_2_1 and so on; then run the animation tool separately. The builder does not set animations itself and does not guarantee image/table/connector names for animation; to animate those in groups, work from the actual exported object IDs and verify again. Never make a stepwise reveal of key content permanently hidden.

## Boundaries

An existing background picture can be the first image on each slide with editable content on top; this keeps the look, but logos, decorations and rules in that background remain raster and are not an editable master. If the user needs an editable master, use real template import and object reuse instead of delivering something lesser. This tool does not detect safe content areas or estimate text overflow; set coordinates against the standard and check by rendering.

Not supported: running arbitrary JS, fetching images from the network, writing knowledge automatically, equations, charts, audio and video, or keeping every external extension after export. Complex slides can be built directly with the current presentation engine and checked with the same scripts; do not claim this small builder covers every PowerPoint feature.
