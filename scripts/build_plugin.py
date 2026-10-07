"""Synchronize the public plugin allowlist without deletion or installation.

Run from any directory. --check performs a read-only synchronization and
structure check. New source files must be added deliberately to the allowlists.
This builder never copies an arbitrary source tree or removes stale files.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
from urllib.parse import unquote, urlsplit

NAME = "lecture-ppt-workflow"
VERSION = "0.2.0"
REPO_URL = "https://github.com/hhhmike240-maker/lecture-ppt-workflow"
REPO = Path(__file__).resolve().parents[1]
PLUGIN = REPO / "plugins" / NAME
SKILL_FILES = (
    "SKILL.md", "agents/openai.yaml", "course-profile.example.json",
    "package.json", "package-lock.json", "requirements.txt",
    "examples/minimal.json", "examples/outline.json", "examples/outline.en.json",
    "references/animation.md", "references/authoring.md",
    "references/course-profile.md", "references/feedback.md", "references/outline.md",
    "references/runtime.md", "references/tools.md", "references/workflow.md",
    "scripts/add_animations.py", "scripts/background_patch.py",
    "scripts/build_from_spec.mjs", "scripts/build_outline.mjs", "scripts/check_coverage.py",
    "scripts/cli_support.py", "scripts/doctor.py", "scripts/office_audit.py",
    "scripts/render_windows.ps1", "scripts/render.mjs",
    "scripts/style_check.py", "scripts/validate_skill.py",
    "scripts/lib/finalize.mjs", "scripts/lib/outline.mjs",
    "scripts/lib/pptx_core.mjs", "scripts/lib/template.mjs",
    "tests/test_builder.mjs", "tests/test_extended.py", "tests/test_js_reveal.py",
    "tests/test_outline.mjs", "tests/test_package.mjs",
    "tests/test_public_builder.mjs", "tests/test_images.mjs",
    "tests/test_selection.py", "tests/test_tools.py",
)
DEMO_FILES = (
    "lecture.md", "outline.json", "coverage-map.json", "lecture.pptx", "lecture-template.pptx",
    "PROMPTS.md", "run_demo.py", "template/sample-template.pptx",
    "en/lecture.md", "en/outline.json", "en/coverage-map.json", "en/lecture.pptx",
    *[f"preview/{i:03d}.png" for i in range(1, 16)],
    *[f"preview-template/{i:03d}.png" for i in range(1, 16)],
)
DOC_FILES = (
    "PROVENANCE.md", "FAQ.md", "FAQ.en.md", "USAGE.md", "VALIDATION_20261007.md",
    "images/showcase.png", "images/showcase.en.png", "images/template.png",
)
OPTIONAL_FILES = (
    "README.en.md", "docs/QUICKSTART.en.md", "demo/PROMPTS.en.md",
    "prompts/prompt.zh.md", "prompts/prompt.en.md",
)
ROOT_FILES = ("LICENSE", "NOTICE", "CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md")
LEGACY_DOCS: tuple[str, ...] = ()
FORBIDDEN_PARTS = {"node_modules", "__pycache__", ".git", ".venv", "scratch", "logs"}
LINK = re.compile(r"(!?\[[^\]\n]*\]\()([^\s)]+)(\))")


def within(path: Path, root: Path) -> bool:
    return path.resolve().is_relative_to(root.resolve())


def reject_linked_parents(path: Path) -> None:
    for entry in (path, *path.parents):
        if entry.exists() or entry.is_symlink():
            info = entry.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
                raise ValueError("Linked or reparse-point path is not allowed")


def safe_source(relative: str) -> Path:
    path = REPO / relative
    reject_linked_parents(path)
    if not within(path, REPO) or path.is_symlink() or not path.is_file():
        raise ValueError(f"Missing, escaping, or symlink source: {relative}")
    if any(part in FORBIDDEN_PARTS for part in path.relative_to(REPO).parts):
        raise ValueError(f"Forbidden source: {relative}")
    return path


def manifest() -> dict:
    return {
        "name": NAME, "version": VERSION,
        "description": "Lecture notes to editable teaching slides with speaker notes, click reveals and template reuse.",
        "author": {"name": "hhhmike240-maker", "url": "https://github.com/hhhmike240-maker"},
        "homepage": REPO_URL, "repository": REPO_URL, "license": "MIT",
        "keywords": ["teaching", "lecture", "powerpoint", "pptx", "education", "slides", "codex-skill"],
        "skills": "./skills/",
        "interface": {
            "displayName": "Lecture PPT Workflow",
            "shortDescription": "Turn lecture notes into editable teaching slides.",
            "longDescription": "Write a lecture outline from your notes and build an editable deck with computed layouts, speaker notes, click-to-reveal case analyses and quiz answers, knowledge-coverage checks, and optional reuse of your reference deck's logos, rules, colors and fonts. Teachers review the result.",
            "developerName": "hhhmike240-maker", "category": "Productivity",
            "capabilities": ["Read", "Write"], "websiteURL": REPO_URL,
            "defaultPrompt": [
                "Turn my handout and reference deck into editable lecture slides with teaching notes.",
                "Revise only the slides I name, preserve the knowledge, and explain each change.",
                "根据我的讲义和标准课件制作教学 PPT，先检查环境，保留授课备注并逐页核验。",
            ],
            "brandColor": "#385F8E",
            "screenshots": ["./assets/docs/images/showcase.png", "./assets/docs/images/template.png"],
        },
    }


def mappings() -> dict[str, str]:
    result = {f"{NAME}/{p}": f"skills/{NAME}/{p}" for p in SKILL_FILES}
    result.update({f"demo/{p}": f"assets/demo/{p}" for p in DEMO_FILES})
    result.update({f"docs/{p}": f"assets/docs/{p}" for p in DOC_FILES})
    result.update({p: f"assets/{p}" for p in ROOT_FILES})
    for p in OPTIONAL_FILES:
        if (REPO / p).is_file():
            result[p] = f"assets/{p}"
    return result


def rewrite_markdown(data: bytes, source: Path, destination: str, mapping: dict[str, str]) -> bytes:
    text = data.decode("utf-8-sig")
    def replace(match: re.Match) -> str:
        raw = match[2]
        link = urlsplit(raw.strip("<>"))
        if link.scheme or link.netloc or not link.path:
            return match[0]
        target = (source.parent / unquote(link.path)).resolve()
        if not within(target, REPO):
            raise ValueError(f"Escaping markdown link in {source.relative_to(REPO)}: {raw}")
        relative = target.relative_to(REPO).as_posix()
        dest = mapping.get(relative)
        if target.is_dir():
            directory_targets = {
                ".": ".", NAME: f"skills/{NAME}", "demo": "assets/demo",
                "docs": "assets/docs", "demo/preview": "assets/demo/preview", "demo/en": "assets/demo/en",
                "demo/preview-template": "assets/demo/preview-template", "prompts": "assets/prompts",
            }
            dest = directory_targets.get(relative)
        if relative == "README.md":
            dest = "README.md"
        if dest:
            rewritten = Path(os.path.relpath(PLUGIN / dest, (PLUGIN / destination).parent)).as_posix()
        elif target.is_file():
            # A deliberate link to a source-repository utility, not a copied dependency.
            rewritten = REPO_URL + "/blob/main/" + relative
        else:
            raise ValueError(f"Unresolved markdown link in {source.relative_to(REPO)}: {raw}")
        if link.fragment:
            rewritten += "#" + link.fragment
        return match[1] + rewritten + match[3]
    return LINK.sub(replace, text).encode("utf-8")


def planned_files() -> dict[str, bytes]:
    mapping = mappings()
    result: dict[str, bytes] = {}
    for relative, destination in mapping.items():
        source = safe_source(relative)
        data = source.read_bytes()
        if source.suffix.lower() == ".md":
            data = rewrite_markdown(data, source, destination, mapping)
        if relative in {
            "README.en.md", "docs/QUICKSTART.en.md", "docs/FAQ.en.md", "docs/USAGE.md",
            "demo/PROMPTS.en.md", "demo/PROMPTS.md",
        }:
            plugin_readme = Path(os.path.relpath(PLUGIN / "README.md", (PLUGIN / destination).parent)).as_posix()
            preface = (
                f"> **Source-repository guide.** The commands and prompt paths below assume a checkout of "
                f"the [source repository]({REPO_URL}), not the extracted plugin root or assets directory. "
                "Paths such as `install.py`, `demo/`, and `.agents/skills/` belong to that repository setup. "
                f"For this plugin package, follow the [plugin README]({plugin_readme}) instead: "
                "its Skill is under `skills/lecture-ppt-workflow`, its example inputs are under `assets/demo`, "
                "and discovery must use the actual installed plugin location. "
                "This is the 0.2.0 package.\n\n"
                "> **源代码仓库指南。** 下方命令和提示词路径以完整源代码仓库为起点，不能直接在插件根目录执行。"
                "插件包请按上方插件说明操作：示例在 `assets/demo`，Skill 在 `skills/lecture-ppt-workflow`，"
                "应用发现需确认真实安装位置。本包为 0.2.0 版。\n\n"
            )
            data = preface.encode("utf-8") + data
        if relative == "demo/run_demo.py":
            text = data.decode("utf-8")
            old = "default=DEMO.parent / 'lecture-ppt-workflow'"
            new = "default=DEMO.parents[1] / 'skills' / 'lecture-ppt-workflow'"
            if old not in text and new not in text:
                raise ValueError("Demo skill lookup changed; review plugin adaptation before copying.")
            data = text.replace(old, new).encode("utf-8")
        result[destination] = data
    result[".codex-plugin/plugin.json"] = (json.dumps(manifest(), ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    for name in LEGACY_DOCS:
        result[f"assets/docs/{name}"] = (
            f"# {name.removesuffix('.md').replace('_', ' ').title()}\n\n"
            "This path is retained for compatibility. Plugin installation and use are documented in "
            "the [bilingual plugin README](../../README.md). The [validation history](VALIDATION.md) "
            "records what was actually checked; [provenance](PROVENANCE.md) describes the bundled material.\n\n"
            "本路径为兼容旧链接保留。插件安装和试用请以[中英文插件说明](../../README.md)为准；"
            "维护者推广草稿不属于插件使用指南。\n"
        ).encode("utf-8")
    result["assets/README.md"] = b"# Plugin documentation\n\nSee the [bilingual plugin README](../README.md).\n"
    return result


def structure_errors() -> list[str]:
    errors = []
    config = json.loads((PLUGIN / ".codex-plugin/plugin.json").read_text(encoding="utf-8"))
    if config.get("name") != PLUGIN.name or config.get("version") != VERSION:
        errors.append("Plugin identity/version mismatch")
    if config.get("skills") != "./skills/":
        errors.append("Invalid skill root")
    for path in [config["skills"], *config["interface"].get("screenshots", [])]:
        target = PLUGIN / path
        if not path.startswith("./") or not within(target, PLUGIN) or not target.exists():
            errors.append(f"Invalid manifest resource: {path}")
    for file in PLUGIN.rglob("*"):
        relative = file.relative_to(PLUGIN)
        if file.is_symlink() or not within(file, PLUGIN):
            errors.append(f"Symlink or escaping path: {relative}")
            continue
        if any(part in FORBIDDEN_PARTS for part in relative.parts) or file.suffix in {".pyc", ".log"}:
            errors.append(f"Forbidden runtime/private artifact: {relative}")
        if not file.is_file():
            continue
        if file.suffix == ".py":
            try:
                ast.parse(file.read_text(encoding="utf-8-sig"))
            except SyntaxError as exc:
                errors.append(f"Python syntax: {relative}: {exc.msg}")
        if file.suffix in {".md", ".json", ".yaml", ".py", ".mjs", ".ps1"}:
            content = file.read_text(encoding="utf-8-sig")
            if re.search(r"C:[/\\]+Users[/\\]+ASUS|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", content, re.I):
                errors.append(f"Private machine path or private key marker: {relative}")
            if file.suffix == ".md":
                for match in LINK.finditer(content):
                    link = urlsplit(match[2].strip("<>"))
                    if link.scheme or link.netloc or not link.path:
                        continue
                    target = (file.parent / unquote(link.path)).resolve()
                    if not within(target, PLUGIN) or not target.exists():
                        errors.append(f"Missing/escaping link: {relative}: {match[2]}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Report drift without changing files")
    args = parser.parse_args()
    reject_linked_parents(REPO)
    reject_linked_parents(PLUGIN)
    planned = planned_files()
    if not (PLUGIN / "README.md").is_file():
        raise ValueError("Missing maintained plugin README.md; restore it from the source repository.")
    drift = []
    for relative, data in planned.items():
        destination = PLUGIN / relative
        reject_linked_parents(destination)
        if not within(destination, PLUGIN) or destination.is_symlink():
            raise ValueError(f"Unsafe destination: {relative}")
        if destination.exists() and not destination.is_file():
            raise ValueError(f"Destination is not a file: {relative}")
        if not destination.exists() or destination.read_bytes() != data:
            drift.append(relative)
            if not args.check:
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
    errors = structure_errors()
    known = set(planned) | {"README.md"}
    extras = sorted(p.relative_to(PLUGIN).as_posix() for p in PLUGIN.rglob("*") if p.is_file() and p.relative_to(PLUGIN).as_posix() not in known)
    if extras:
        errors.append("Unmanaged files retained; review before distribution: " + ", ".join(extras))
    digest = hashlib.sha256()
    for relative in sorted(known):
        file = PLUGIN / relative
        if file.is_file():
            digest.update(relative.encode("utf-8") + b"\0" + file.read_bytes())
    result = {
        "status": "pass" if not errors and not (args.check and drift) else "fail",
        "mode": "check" if args.check else "synchronize",
        "version": VERSION, "planned_file_count": len(planned),
        "changed_or_drifted": drift, "errors": errors,
        "content_sha256": digest.hexdigest(),
        "scope": "Allowlist, file paths, local Markdown links, selected private-artifact markers, and Python syntax only. No app installation, invocation, cross-device, rendering, or slideshow claim.",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return int(result["status"] != "pass")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        raise SystemExit(2)
