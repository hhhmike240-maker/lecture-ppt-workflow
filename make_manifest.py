"""Build the public candidate manifest from a fixed root-file/directory allowlist.

The default updates the generated MANIFEST.json; --out writes a new file only.
No inputs are deleted. The path scan is not a privacy or licensing certification.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys

ROOT = Path(__file__).resolve().parent
VERSION = "0.2.0"
RELEASE_DATE = "2026-10-07"
FORMAT = "lecture-ppt-workflow-public-manifest.v2"
ROOT_FILES = frozenset({
    ".gitattributes", ".gitignore", "README.md", "README.en.md", "LICENSE", "NOTICE",
    "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md", "install.py",
    "make_manifest.py", "index.html", ".nojekyll",
})
PUBLIC_DIRS = frozenset({
    ".github", "app", "docs", "demo", "lecture-ppt-workflow", "prompts", "scripts", "plugins",
})
EXCLUDED_PARTS = frozenset({
    ".git", ".agents", "scratch", "work", ".venv", "venv", "node_modules",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "dist",
    "logs", ".ssh", ".aws", ".azure",
})
EXCLUDED_SUFFIXES = frozenset({
    ".pyc", ".pyo", ".log", ".exe", ".dll", ".so", ".dylib", ".pyd",
    ".node", ".whl", ".zip", ".7z", ".rar", ".tar", ".gz", ".pem",
    ".key", ".p12", ".pfx",
})
REQUIRED_FILES = ROOT_FILES | frozenset({
    ".github/ISSUE_TEMPLATE/usage_feedback.yml",
    "docs/QUICKSTART.en.md", "docs/FAQ.md", "docs/USAGE.md", "docs/images/showcase.png",
    "app/index.html", "app/app.js", "app/vendor/pptxgen.bundle.js", "prompts/prompt.zh.md",
    "demo/PROMPTS.en.md", "demo/outline.json", "demo/lecture.pptx",
    "lecture-ppt-workflow/SKILL.md", "scripts/package_release.py",
    "plugins/lecture-ppt-workflow/.codex-plugin/plugin.json",
    "plugins/lecture-ppt-workflow/skills/lecture-ppt-workflow/SKILL.md",
})


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def checked_stat(path: Path) -> os.stat_result:
    """Reject symbolic links, Windows junctions/reparse points and special files."""
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
        raise ValueError(f"Symbolic link or reparse point is not permitted: {path.name}")
    if not (stat.S_ISREG(info.st_mode) or stat.S_ISDIR(info.st_mode)):
        raise ValueError(f"Non-regular file is not permitted: {path.name}")
    return info


def is_public_path(relative: str) -> bool:
    path = PurePosixPath(relative)
    if (not relative or "\\" in relative or path.is_absolute()
            or path.as_posix() != relative or any(p in {".", ".."} or ":" in p for p in path.parts)):
        return False
    if any(part.casefold() in EXCLUDED_PARTS or part.casefold().startswith(".env")
           for part in path.parts):
        return False
    if path.name.casefold() == "manifest.json" or path.suffix.casefold() in EXCLUDED_SUFFIXES:
        return False
    return relative in ROOT_FILES or (len(path.parts) > 1 and path.parts[0] in PUBLIC_DIRS)


def read_public_file(root: Path, relative: str) -> bytes:
    if not is_public_path(relative):
        raise ValueError(f"File outside the public allowlist: {relative}")
    checked_stat(root)
    current = root
    for part in PurePosixPath(relative).parts:
        current = current / part
        info = checked_stat(current)
    if not stat.S_ISREG(info.st_mode):
        raise ValueError(f"Expected a regular file: {relative}")
    return current.read_bytes()


def collect_files(root: Path) -> list[dict]:
    paths: list[str] = []
    checked_stat(root)
    for name in sorted(ROOT_FILES):
        paths.append(name)

    def visit(directory: Path) -> None:
        if not stat.S_ISDIR(checked_stat(directory).st_mode):
            raise ValueError(f"Expected a public directory: {directory.name}")
        for child in sorted(directory.iterdir(), key=lambda p: p.name):
            relative = child.relative_to(root).as_posix()
            # Never follow links, even if their names would otherwise be excluded.
            info = checked_stat(child)
            if not is_public_path(relative):
                continue
            if stat.S_ISDIR(info.st_mode):
                visit(child)
            else:
                paths.append(relative)

    for name in sorted(PUBLIC_DIRS):
        visit(root / name)
    missing = sorted(REQUIRED_FILES - set(paths))
    if missing:
        raise ValueError("Missing required public files: " + ", ".join(missing))
    folded = [path.casefold() for path in paths]
    if len(folded) != len(set(folded)):
        raise ValueError("Public paths collide on case-insensitive filesystems")
    result = []
    for relative in sorted(paths):
        data = read_public_file(root, relative)
        result.append({"path": relative, "sha256": digest(data), "bytes": len(data)})
    return result


def build_manifest(root: Path = ROOT) -> dict:
    files = collect_files(root)
    return {
        "format": FORMAT,
        "release": VERSION,
        "date": RELEASE_DATE,
        "status": "prepared-release-package",
        "skill": "lecture-ppt-workflow",
        "scope_scan": {
            "root_files": sorted(ROOT_FILES),
            "public_directories": sorted(PUBLIC_DIRS),
            "excluded_path_components": sorted(EXCLUDED_PARTS),
            "excluded_filename_prefixes": [".env"],
            "excluded_suffixes": sorted(EXCLUDED_SUFFIXES),
            "manifest_files_excluded": True,
            "symlinks_and_reparse_points": "rejected within scanned public paths",
            "scope": "Allowlisted paths and file hashes only. Runtime/cache/archive/key-file "
                     "patterns are excluded. This scan does not certify the absence of private "
                     "content, secrets, third-party material, or licensing issues in allowed files.",
        },
        "file_count": len(files),
        "total_bytes": sum(item["bytes"] for item in files),
        "files": files,
    }


def check_output_parents(path: Path) -> None:
    for parent in reversed(path.parents):
        if parent.exists() or parent.is_symlink():
            if not stat.S_ISDIR(checked_stat(parent).st_mode):
                raise ValueError("Output parent is not a directory")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, help="Write a new manifest here; refuse an existing path")
    parser.add_argument("--check", action="store_true", help="Check the selected manifest without writing")
    args = parser.parse_args()
    target = Path(os.path.abspath(args.out if args.out is not None else ROOT / "MANIFEST.json"))
    check_output_parents(target)
    if target.exists() or target.is_symlink():
        if not stat.S_ISREG(checked_stat(target).st_mode):
            raise ValueError("Manifest output must be a regular file")
    if args.out is not None and not args.check and target.exists():
        raise FileExistsError("--out must be a new file; existing output was preserved")
    if target.is_relative_to(ROOT) and is_public_path(target.relative_to(ROOT).as_posix()):
        raise ValueError("Manifest output must be outside the scanned public files (use scratch/)")
    result = build_manifest()
    data = json_bytes(result)
    if args.check:
        if target.read_bytes() != data:
            raise ValueError("Manifest is stale; regenerate it after final source changes")
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb" if args.out is not None else "wb") as stream:
            stream.write(data)
    print(json.dumps({"status": "pass", "mode": "check" if args.check else "write",
                      "release": VERSION, "files": result["file_count"],
                      "bytes": result["total_bytes"], "sha256": digest(data)}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        raise SystemExit(2)
