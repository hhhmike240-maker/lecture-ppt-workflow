# Example requests for Codex / Claude Code

After installing the skill (see the [quick start](../docs/QUICKSTART.en.md)), put your notes and reference deck in the working folder and ask in plain language. For the web page, use the [universal prompt](../prompts/prompt.en.md) instead.

## New chapter

> Use lecture-ppt-workflow to turn `chapter3.docx` into a teaching deck for two class sessions, in the style of `department-template.pptx`. Put the figures from the notes on figure slides. One fictional case is fine if labeled. Check the environment first, render and review every slide, and list what I should verify.

## Try the sample

> Use lecture-ppt-workflow with `demo/lecture.md` as the notes and `demo/template/sample-template.pptx` as the reference deck. Build into `out/try-1` and tell me which layout each slide uses.

## Revise from feedback

> Slide 5 is crowded; split it into two. Add a "Typical roles" column to the table on slide 9. Leave everything else unchanged, build into a new folder, and summarize the changes.

## Interaction slides only

> From section 2 of `chapter2-notes.docx`, make a quiz slide (two questions, answers revealed on click) and a case slide in the style of `chapter2.pptx`, as a separate small file. I will insert them with PowerPoint's "Reuse Slides".

## Check only

> Review `chapter1.pptx`: render every slide and look for overflow, overlaps and inconsistent font sizes; compare with `notes.docx` and list key concepts that are not on screen. Do not modify files.
