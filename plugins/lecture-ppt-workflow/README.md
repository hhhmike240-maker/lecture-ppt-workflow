# Lecture PPT Workflow · 教学课件工作流

**An early-access Codex plugin for teacher-guided, editable lecture slides.** Use a chapter handout, your own reference deck, and feedback to draft or revise slides while tracking knowledge coverage, teaching notes, and layout checks. Maintainer: [hhhmike240-maker](https://github.com/hhhmike240-maker).

This **0.1.1-alpha early-access package** bundles the `lecture-ppt-workflow` skill, local helper scripts, and an original three-slide demonstration. It requires an AI agent plus a working local environment. Teachers review factual accuracy and the final presentation.

![Original demonstration after revision](assets/demo/preview-after/002.png)

## Try it

The simplest current route is the [repository quick start](https://github.com/hhhmike240-maker/lecture-ppt-workflow#readme), which installs the standalone skill. This directory is a separate plugin distribution option; copying it alone does not install or activate a plugin.

For a local plugin trial, use a repo marketplace that you control:

1. Put this entire directory at `plugins/lecture-ppt-workflow` in your chosen repository.
2. Add an entry to that repository's `.agents/plugins/marketplace.json`. Use name `lecture-ppt-workflow`, local source path `./plugins/lecture-ppt-workflow`, installation policy `AVAILABLE`, authentication policy `ON_INSTALL`, and category `Productivity`. Preserve any existing entries. This package does not create or change a marketplace.
3. Follow the current desktop plugin install flow for that marketplace, then open a new task and confirm the bundled skill is available before relying on it. If using the CLI to register a non-default marketplace, `codex plugin marketplace add ./local-marketplace-root` registers the source; complete installation and testing in the desktop app.

These steps follow [OpenAI's local plugin documentation](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually), checked 2026-10-04. The existing `.codex-plugin/plugin.json` layout remains a supported compatibility format. Local marketplace distribution is separate from public-directory publication. This package has **not** been installed or discovery-tested through the desktop UI in this release preparation.

## Prepare the tools

The plugin does not install dependencies automatically. Run the following commands **from this plugin's root directory**, which contains `README.md`, `skills`, and `assets`. Use a writable development copy, not an installed application cache. Start with a fresh `.venv-plugin` directory; keep any existing environment and choose a new name if necessary.

Windows PowerShell:

```powershell
python -m venv .venv-plugin
.\.venv-plugin\Scripts\python.exe -m pip install -r skills/lecture-ppt-workflow/requirements.txt
npm ci --ignore-scripts --prefix skills/lecture-ppt-workflow
.\.venv-plugin\Scripts\python.exe -B skills/lecture-ppt-workflow/scripts/doctor.py --out scratch/plugin-environment-1.json
```

macOS or Linux:

```sh
python3 -m venv .venv-plugin
.venv-plugin/bin/python -m pip install -r skills/lecture-ppt-workflow/requirements.txt
npm ci --ignore-scripts --prefix skills/lecture-ppt-workflow
.venv-plugin/bin/python -B skills/lecture-ppt-workflow/scripts/doctor.py --out scratch/plugin-environment-1.json
```

Use Python 3.10+ and Node 20+. Indexing and most checks use Python's standard library; animations need `lxml`. Generation uses PptxGenJS. The complete demo runner chooses **PowerPoint on Windows** and **LibreOffice plus Poppler on other platforms**. It does not fall back to LibreOffice on Windows. The doctor rendering flag probes LibreOffice and Poppler, not PowerPoint COM. Obtain fonts and presentation software separately under their own licenses. See [runtime details](skills/lecture-ppt-workflow/references/runtime.md). The bundled [English repository quick start](assets/docs/QUICKSTART.en.md) explains the separate standalone-Skill setup; its root-level commands are not plugin commands.

To reproduce the scripted demo from this plugin root after preparing the required renderer, run the matching command with a fresh output path:

```powershell
.\.venv-plugin\Scripts\python.exe -B assets/demo/run_demo.py --out scratch/plugin-demo-1 --skill-dir skills/lecture-ppt-workflow
```

```sh
.venv-plugin/bin/python -B assets/demo/run_demo.py --out scratch/plugin-demo-1 --skill-dir skills/lecture-ppt-workflow
```

This reproduces reviewed specifications without calling a model. Cross-platform rendering and actual click-through playback remain separate, unverified checks. When using the installed plugin in a task, give the agent the prepared environment and helper-script paths and have it confirm both; installing dependencies into this source copy does not prove that an application's cached plugin has them.

## First task

Attach your handout and reference slides to a new task, then use:

> Use the lecture-ppt-workflow skill. Draft a short editable lecture deck from my handout using my reference deck's visual style. Check the environment first, map knowledge points to slides, preserve original figures and teaching notes, and save a new file. Render and review each slide, then state what still needs teacher or slideshow verification.

For the original demo, provide [lecture.md](assets/demo/lecture.md) and [standard.pptx](assets/demo/standard.pptx). See the [English prompts](assets/demo/PROMPTS.en.md) or [Chinese prompts](assets/demo/PROMPTS.md). The bundled preview shows a scripted, reviewed example; it does not prove automatic first-task success. Keep the full plugin directory because the skill depends on its scripts and references.

## 中文使用说明

本插件帮助教师把章节讲义和标准课件整理成可编辑教学 PPT，并根据反馈修订。支持新章知识版、情境增强、限定修改和样式提取；保留知识映射、授课备注及必要来源说明。**本包为 0.1.1-alpha 早期试用包。**

推荐先按[仓库首页](https://github.com/hhhmike240-maker/lecture-ppt-workflow#readme)试用独立 Skill。需要插件形式时，将整个目录放入自己仓库的 `plugins/lecture-ppt-workflow`，按上方步骤配置自己控制的仓库市场，再在桌面应用安装并新建任务核验。文件复制、结构验证和实际被应用发现是三项不同检查；本包不宣称已上架公共目录。

使用时提供讲义、自己有权使用的标准 PPT，以及本次修改范围。首次使用先检查 Python、Node、字体与渲染软件；在插件根目录按上方命令新建独立 Python 环境并手动安装公开依赖。完整演示在 Windows 使用 PowerPoint，其他系统使用 LibreOffice 与 Poppler；Windows 不会自动回退。可先用本包 `assets/demo` 中的原创三页示例。明确输入“请使用 lecture-ppt-workflow”，由模型确认实际加载位置和运行环境后再生成。

教师需审核知识准确性、课程适用性、素材权利及最终放映。自动检查不替代逐页看图；静态预览不证明点击动画能在所有软件中运行。所有成果写入新路径；删除文件前先询问，不自动发布或外传材料。

## Included files and limits

- [Skill instructions](skills/lecture-ppt-workflow/SKILL.md), its references, helper scripts, dependency declarations, and regression tests.
- [Original demo](assets/demo/lecture.md), editable before/after decks, specifications, prompts, and static preview images.
- [Provenance](assets/docs/PROVENANCE.md), [validation history](assets/docs/VALIDATION.md), [license](assets/LICENSE), and [notice](assets/NOTICE).

No fonts, office suite, `node_modules`, model, cloud service, or telemetry is included. Materials handled by the host AI agent remain subject to that host's own data handling and account settings. Complex templates, cross-platform rendering, and dynamic slideshow behavior need separate verification. No measured time savings or broad compatibility are claimed.

Original project files use the MIT license; third-party tools and newly supplied materials keep their own terms. The rules, scripts, and original teaching demo were developed with AI assistance; packaging adds no claim of ownership over dependency software or teacher materials.

Maintainers can run `python scripts/build_plugin.py` from the source repository to synchronize the explicit public-file allowlist, or add `--check` to inspect drift without changing files. The builder never deletes files, installs software, edits marketplace configuration, or publishes anything. Structural validation is a release check, not an application installation test.
