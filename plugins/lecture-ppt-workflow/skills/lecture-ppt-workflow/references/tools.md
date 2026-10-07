# Tools

Dependencies and licensing limits for the public candidate are in [runtime](runtime.md). Without a generation environment you can still parse and check, but cannot promise to finish generating.

Probe Python and the presentation runtime first. When Codex offers a workspace dependency lookup, use the paths it returns. The `python`/`node` below stand for runtimes you have resolved; do not assume they are on the system PATH. Script paths are relative to this skill directory; paths in arguments are relative to the current task.

Source indexing and checks need only the Python 3.10+ standard library; the animation tool also needs lxml. Generation and rendering need an available presentation engine; the package contains no model inference, offline generator or image recognition engine. Explain what is needed before installing dependencies and prefer existing runtimes. Do not install globally into a managed runtime.

```text
node scripts/build_outline.mjs outline.json work/build-1 --template reference.pptx
node scripts/build_outline.mjs outline.json work/build-2 --lang en
python scripts/office_audit.py index lecture.docx --out work/lecture.json --images-dir work/word-images
python scripts/office_audit.py index standard.pptx --out work/standard.json
python scripts/doctor.py --out work/environment.json
python scripts/style_check.py standard.pptx --out work/style.json
python scripts/background_patch.py draft.pptx gray.pptx --reference standard.pptx --reference-slide 2 --slides 2-15 --report work/background.json
python scripts/add_animations.py draft.pptx animated.pptx --slides 2,4-6 --audit work/animations.json
python scripts/office_audit.py compare original.pptx revised.pptx --background-only --out work/diff.json
python scripts/check_coverage.py mapping.json candidate.pptx --out work/coverage.json
node scripts/render.mjs candidate.pptx work/render-new
node scripts/render.mjs candidate.pptx work/render-one-new --slide 1
node scripts/build_from_spec.mjs specification.json work/build-new
node --test tests/test_builder.mjs
python -m unittest discover -s tests -v
```

`build_outline.mjs` is the default way to build a new chapter: it takes a [lecture outline](outline.md) and writes lecture.pptx (with speaker notes, click reveals and optional template decorations), report.json (layout issues, extracted template style) and spec.json. Exit code 0: no layout errors; 1: layout errors, candidate written; 2: input error. `--lang zh|en` sets the language of messages and the template report (default: the deck language).

All outputs go to new paths and existing ones are refused. Slide numbers follow the actual show order and start at 1; example numbers are not default selections, and reversed ranges in mixed selections are refused. Without `--background-only` the compare tool only reports differences and does not judge whether they are acceptable. The generator specification is in [page specification](authoring.md); a minimal example without teacher material is included. A new candidate is not an accepted deck.

The background tool supports only direct, non-theme solid backgrounds and keeps RGB transform parameters; inherited backgrounds, picture backgrounds and theme colors need human judgment. The tool keeps bytes outside the XML unchanged and does a structural diff after removing the background. It cannot replace school logos or fix a model figure's background color.

Animations apply only to explicitly selected new slides, named reveal_1_1, reveal_1_2, reveal_2_1 and so on: objects in a group fade in together, groups advance on click, 400 ms. Existing timing, invalid group names and permanent hiding are errors and teacher animations are never silently overwritten. Do not disable the validation assertions with `python -O`. Unselected slides keep their original bytes.

The generator uses PptxGenJS from the skill directory. render.mjs exports static PNGs with LibreOffice + Poppler; on Windows, render_windows.ps1 can be used. Real PowerPoint/WPS playback is a separate check.

Content mapping JSON:

```json
{"knowledge":[{"id":"K01","source":"Notes section 1, paragraph 3","required":true,"slides":[3],"on_screen":["exact wording of the key definition"]}],"figures":[{"source":"word/media/image1.png","slides":[4],"treatment":"Keep the original figure and note its historical scope"}]}
```

The style check separately tracks slide/layout/master backgrounds, theme inputs, placeholder geometry and scaling/rotation/flips inside groups. You can pass `--policy` JSON in the form `{"size_emu":[9144000,5143500],"roles":{"subtitle":{"top_min":619125,"font_sizes_pt":[16]}}}`. Role names match actual object names; confirm the object names first instead of guessing the teacher's names from the example. Geometry out of bounds is a risk hint; only failed role rules count as errors. Fully inherited font sizes are not forced to pass. Master decorations, glyph outlines, shadows and final theme colors need a rendered review.

The index contains body and table paragraphs, the paragraphs holding original figures, highlights, comments and slide notes. You must look at the images before you understand a model. The script does not fully resolve inherited font sizes, VML objects, comment anchors or the accepted state of tracked changes; check those separately. Passing a tool is not semantic, visual or playback acceptance.

Exit codes: 0 means passed within the scope of the command, 1 means the check found problems or capabilities are missing, 2 means an input or execution error (argparse errors are also 2). Results keep their limitations; drafts are not deleted after a failure. A read-only index that cannot resolve badly damaged relationships reports an error instead of producing a fake empty index.
