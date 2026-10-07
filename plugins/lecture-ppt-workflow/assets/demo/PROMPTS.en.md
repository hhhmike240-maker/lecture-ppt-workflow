> **Source-repository guide.** The commands and prompt paths below assume a checkout of the [source repository](https://github.com/hhhmike240-maker/lecture-ppt-workflow), not the extracted plugin root or assets directory. Paths such as `install.py`, `demo/`, and `.agents/skills/` belong to that repository setup. For this plugin package, follow the [plugin README](../../README.md) instead: its Skill is under `skills/lecture-ppt-workflow`, its example inputs are under `assets/demo`, and discovery must use the actual installed plugin location. This is the 0.2.0 package.

> **源代码仓库指南。** 下方命令和提示词路径以完整源代码仓库为起点，不能直接在插件根目录执行。插件包请按上方插件说明操作：示例在 `assets/demo`，Skill 在 `skills/lecture-ppt-workflow`，应用发现需确认真实安装位置。本包为 0.2.0 版。

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
