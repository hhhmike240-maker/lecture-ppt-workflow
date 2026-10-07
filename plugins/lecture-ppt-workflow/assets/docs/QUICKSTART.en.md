> **Source-repository guide.** The commands and prompt paths below assume a checkout of the [source repository](https://github.com/hhhmike240-maker/lecture-ppt-workflow), not the extracted plugin root or assets directory. Paths such as `install.py`, `demo/`, and `.agents/skills/` belong to that repository setup. For this plugin package, follow the [plugin README](../../README.md) instead: its Skill is under `skills/lecture-ppt-workflow`, its example inputs are under `assets/demo`, and discovery must use the actual installed plugin location. This is the 0.2.0 package.

> **源代码仓库指南。** 下方命令和提示词路径以完整源代码仓库为起点，不能直接在插件根目录执行。插件包请按上方插件说明操作：示例在 `assets/demo`，Skill 在 `skills/lecture-ppt-workflow`，应用发现需确认真实安装位置。本包为 0.2.0 版。

# Quick start

[English README](../README.en.md) · [FAQ](FAQ.md) · [中文使用指南](USAGE.md)

## A. Web page (no installation)

1. Open https://hhhmike240-maker.github.io/lecture-ppt-workflow/app/ and click "English prompt", then copy it.
2. Paste the prompt into any AI chatbot, fill in the course details at the end, and attach or paste your lecture notes.
3. Paste the AI's full answer into step 2 of the page. A preview appears automatically.
4. Optional: upload one of your decks in step 3 to reuse its logos, rules, colors and fonts; upload original figures to fill figure slides.
5. Fix red issues by asking the AI, e.g. "Slide 5 is too long; split it into two slides and output the full JSON again."
6. Click "下载 PPTX" (Download PPTX) and review the deck in PowerPoint or WPS.

The page interface is in Chinese; the steps above follow its layout from top to bottom.

## B. As a skill (Codex / Claude Code)

```bash
git clone https://github.com/hhhmike240-maker/lecture-ppt-workflow.git
cd lecture-ppt-workflow
python install.py --target claude --with-deps   # Claude Code (~/.claude/skills)
python install.py --target codex --with-deps    # Codex (~/.codex/skills)
```

Requires Python 3.10+ and Node.js 20+. Use `--target claude-project` or `--target codex-project` to install into the current project only. Existing installations are never overwritten.

Then start a new session and ask:

> Use the lecture-ppt-workflow skill to turn chapter3.docx into an editable teaching deck in the style of department-template.pptx. Two class sessions; one fictional case is fine. Render and check every slide, and tell me what I should verify.

More examples: [demo/PROMPTS.en.md](../demo/PROMPTS.en.md).

## C. Command line

```bash
cd lecture-ppt-workflow && npm ci --ignore-scripts && cd ..
node lecture-ppt-workflow/scripts/build_outline.mjs outline.json out-dir --template reference.pptx
python demo/run_demo.py --out out/full-demo
```

Outputs: `lecture.pptx`, `report.json` (layout issues, extracted template style), `spec.json`, and a copy of `outline.json`. Exit code 0 = clean, 1 = candidate written with layout errors, 2 = input error. Format reference: [outline format](../../skills/lecture-ppt-workflow/references/outline.md) (Chinese, with field tables).
