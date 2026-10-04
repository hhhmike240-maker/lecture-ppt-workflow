# Quick start

[English overview](../README.en.md) · [中文使用说明](USAGE.md) · [Example prompts](../demo/PROMPTS.en.md)

This guide separates inspecting the included deck, installing the Skill for Codex, and reproducing the demo. All paths and commands assume you are in the repository root. The included slides and lecture notes are in Chinese; complete English slide output has not yet been validated. Detailed Skill rules and references remain primarily in Chinese.

## 1. Get the repository

Clone the public repository, or download and extract its source archive from GitHub:

```text
git clone https://github.com/hhhmike240-maker/lecture-ppt-workflow.git
cd lecture-ppt-workflow
```

Keep the entire directory, not just `SKILL.md`. Before running Python commands, confirm that `python --version` reports 3.10 or later. On systems where only `python3` is available, use `python3` for the initial commands below.

## 2. Inspect the existing demo

This path needs only Python 3.10+ and its standard library. It does not install the Skill or call a model:

```text
python lecture-ppt-workflow/scripts/office_audit.py index demo/after.pptx --out scratch/check-1/index.json
python lecture-ppt-workflow/scripts/style_check.py demo/after.pptx --out scratch/check-1/style.json
```

Read `scratch/check-1/index.json` for package checks, slide text, and notes. Read `scratch/check-1/style.json` for detected geometry errors, warnings, and checker limitations. Review the [included previews](../demo/preview-after) and open [after.pptx](../demo/after.pptx) in your presentation software for visual and playback inspection.

Use a new path such as `scratch/check-2/` for another run. A clean report is a structural result; it does not establish teaching accuracy, readable layout, or correct animation playback.

## 3. Install a project-scoped Skill

From the repository root:

```text
python install.py --skills-dir .agents/skills
python .agents/skills/lecture-ppt-workflow/scripts/validate_skill.py
```

This creates `.agents/skills/lecture-ppt-workflow`, leaving any separately installed personal Skill in place. The installer validates and copies the source package. It does not download dependencies and refuses to overwrite an existing destination. For a fresh trial after an existing installation, use another checkout rather than deleting your working copy.

Open this repository as your Codex project, start a new task, and enter:

```text
Use $lecture-ppt-workflow. Confirm that you can discover and read its
SKILL.md. Before generating anything, report which required tools and
fonts are available and which are missing.
```

If discovery fails, record the exact project path, installed Skill path, Codex version, and error. A copied directory or a passing validator is not proof that the Skill was loaded. The public package has not yet been verified through discovery and invocation in an independent Codex task.

Without the explicit `--skills-dir` option, the installer's current default is `$CODEX_HOME/skills`, or `~/.codex/skills` when that variable is unset. The project-scoped commands above make the destination explicit.

## 4. Prepare generation dependencies

Generation and rendering require more than the inspection commands:

| Requirement | Purpose |
|---|---|
| Node.js 20+ and npm | Run the PptxGenJS-based generation adapter |
| Locked npm dependencies | Install explicitly into the installed Skill directory |
| Python 3.10+ with `lxml` | Apply animation changes; use a dedicated virtual environment |
| Suitable, legally installed fonts | The Chinese demo specifies Microsoft YaHei; fonts are not bundled |
| PowerPoint on Windows | Used by the demo runner for static exports through PowerPoint COM |
| LibreOffice and Poppler on other platforms | The renderer expects `soffice` and `pdftoppm` on `PATH`; this path remains unvalidated |

Install the system tools and fonts appropriate to your machine. Check `node --version` and `npm --version` before proceeding. The project does not bundle these tools, office software, or fonts. If you substitute fonts, render and review every page again.

On **Windows PowerShell**, create a virtual environment and install dependencies there:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .agents/skills/lecture-ppt-workflow/requirements.txt
npm ci --ignore-scripts --prefix .agents/skills/lecture-ppt-workflow
.\.venv\Scripts\python.exe .agents/skills/lecture-ppt-workflow/scripts/doctor.py --out scratch/environment-1.json
```

On **macOS or Linux**, the corresponding commands are:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r .agents/skills/lecture-ppt-workflow/requirements.txt
npm ci --ignore-scripts --prefix .agents/skills/lecture-ppt-workflow
.venv/bin/python .agents/skills/lecture-ppt-workflow/scripts/doctor.py --out scratch/environment-1.json
```

Using the virtual environment's Python directly avoids activation changes and keeps `lxml` out of system or managed Python environments. A host without Python's `venv` support must supply that support before these commands can work. Local instructions for other platforms are provided for trial; they do not imply tested compatibility.

Read the doctor report rather than relying only on its exit status. It probes dependencies, does not install anything, and does not verify fonts or slideshow playback. Its `rendering` flag checks LibreOffice and Poppler; it does not detect PowerPoint COM. On Windows, that flag may be false even when PowerPoint export is available. Conversely, the Windows demo runner always chooses PowerPoint and does not automatically fall back to LibreOffice.

## 5. Reproduce the reviewed demo

After supplying the required dependencies and rendering tools, run one command for your platform.

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe demo/run_demo.py --out scratch/demo-run-1 --skill-dir .agents/skills/lecture-ppt-workflow
```

macOS or Linux:

```sh
.venv/bin/python demo/run_demo.py --out scratch/demo-run-1 --skill-dir .agents/skills/lecture-ppt-workflow
```

The script uses the Python that launched it and `node` from `PATH`. If necessary, add `--node` followed by the full path to your Node executable.

It reproduces the reviewed specifications in `demo/specs.py`: a one-slide reference deck, three-slide before and after decks, a fade-in on the revised scenario slide, static PNG previews, and JSON audit results. Look for `after.pptx`, the `standard-build/` and `before-build/` directories, and the `preview-*` directories under your output path.

This runner does not call a model or turn arbitrary Word documents into slides. Reproducing it tests the scripts and static export path, not the complete Codex teaching workflow. It refuses an existing output directory and retains partial output after a failure; retry with a new directory after resolving the error.

## 6. Try your own teaching task

In the Codex project, provide your lecture notes, a reference PPTX you may use, the intended audience, language, and scope. Start with an [example prompt](../demo/PROMPTS.en.md). Ask Codex to use the virtual environment and installed Skill paths you prepared above.

Check that required knowledge and figures appear on slides, speaker notes support the lesson, labels and sources remain visible, and the final relationship diagram matches the chapter. Then test the actual slide show yourself. For revisions, name the file, slide, object, and desired result, and request a new output file.

The local [validation record](VALIDATION.md) covers script checks and PowerPoint static exports. It does not establish fresh-device installation, independent Codex invocation, English output quality, or dynamic slideshow playback. The one instructor's feedback described in the README belongs to the internal project context; external public-package results have not been established.

## Get help

[Create an issue](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose) with your operating system, Codex/Python/Node/presentation software versions, exact command or prompt, expected and actual behavior, and a small permitted example. Remove personal data and private materials from reports. Keep existing inputs, working files, and failure logs for diagnosis; do not delete them merely to retry.
