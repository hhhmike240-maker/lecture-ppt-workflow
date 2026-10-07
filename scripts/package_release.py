"""Package a verified public manifest into new, reproducible repository/plugin ZIPs.

Run make_manifest.py after final edits, then pass --out with a nonexistent
directory. Existing output and partial failures are retained; nothing is deleted.
Only Python's standard library is used. No download or publication is performed.
"""
from __future__ import annotations

import argparse
from collections import Counter
import json
import os
from pathlib import Path
import stat
import sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

# Loading the repository helper must not create a cache in the release sources.
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from make_manifest import (  # noqa: E402
    PUBLIC_DIRS, VERSION, build_manifest, check_output_parents, checked_stat,
    digest, json_bytes, read_public_file,
)

PLUGIN_PREFIX = "plugins/lecture-ppt-workflow/"
ZIP_DATE = (2026, 10, 7, 0, 0, 0)


def load_verified_manifest(root: Path) -> tuple[dict, bytes]:
    manifest_file = root / "MANIFEST.json"
    if not stat.S_ISREG(checked_stat(manifest_file).st_mode):
        raise ValueError("MANIFEST.json must be a regular file")
    data = manifest_file.read_bytes()
    manifest = json.loads(data)
    current = build_manifest(root)
    if manifest != current or data != json_bytes(current):
        raise ValueError("MANIFEST.json is stale or noncanonical; rerun make_manifest.py after final edits")
    return manifest, data


def archive_records(manifest: dict, manifest_data: bytes, plugin: bool) -> dict[str, dict]:
    records = {}
    for item in manifest["files"]:
        source = item["path"]
        if plugin and not source.startswith(PLUGIN_PREFIX):
            continue
        name = source[len(PLUGIN_PREFIX):] if plugin else source
        if not name or name in records:
            raise ValueError("Empty or duplicate archive member")
        records[name] = {**item, "source": source}
    if plugin:
        if ".codex-plugin/plugin.json" not in records:
            raise ValueError("The manifest does not contain the plugin metadata")
    else:
        records["MANIFEST.json"] = {"source": None, "bytes": len(manifest_data),
                                    "sha256": digest(manifest_data)}
    return records


def write_archive(root: Path, path: Path, records: dict[str, dict], manifest_data: bytes) -> None:
    with ZipFile(path, "x", compression=ZIP_DEFLATED, compresslevel=9, allowZip64=True) as archive:
        for name in sorted(records):
            item = records[name]
            data = manifest_data if item["source"] is None else read_public_file(root, item["source"])
            if len(data) != item["bytes"] or digest(data) != item["sha256"]:
                raise ValueError(f"Source changed during packaging: {name}; partial output retained")
            info = ZipInfo(name, date_time=ZIP_DATE)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=9)


def verify_archive(path: Path, records: dict[str, dict]) -> dict:
    with ZipFile(path, "r") as archive:
        names = archive.namelist()
        if names != sorted(records) or len(names) != len(set(names)):
            raise ValueError(f"Archive member set/order mismatch: {path.name}")
        if archive.testzip() is not None:
            raise ValueError(f"Archive CRC verification failed: {path.name}")
        for name in names:
            data = archive.read(name)
            expected = records[name]
            if len(data) != expected["bytes"] or digest(data) != expected["sha256"]:
                raise ValueError(f"Archive content verification failed: {path.name}: {name}")
    return {
        "name": path.name,
        "sha256": digest(path.read_bytes()),
        "archive_bytes": path.stat().st_size,
        "file_count": len(records),
        "uncompressed_bytes": sum(item["bytes"] for item in records.values()),
        "top_level_counts": dict(sorted(Counter(name.split("/")[0] for name in records).items())),
        "verified": "reopened; exact member set, CRC, byte lengths and SHA-256 checked",
    }


def package(root: Path, out: Path) -> dict:
    out = Path(os.path.abspath(out))
    check_output_parents(out)
    if out.exists() or out.is_symlink():
        raise FileExistsError("--out must be a nonexistent directory; existing output was preserved")
    if out.is_relative_to(root):
        relative = out.relative_to(root)
        if not relative.parts or relative.parts[0] in PUBLIC_DIRS:
            raise ValueError("Output cannot be inside the scanned public tree; use scratch/ or an external path")
    manifest, manifest_data = load_verified_manifest(root)
    repo_records = archive_records(manifest, manifest_data, plugin=False)
    plugin_records = archive_records(manifest, manifest_data, plugin=True)
    out.mkdir(parents=True, exist_ok=False)
    archives = []
    for kind, records in (("repository", repo_records), ("plugin", plugin_records)):
        path = out / f"lecture-ppt-workflow-{VERSION}-{kind}.zip"
        write_archive(root, path, records, manifest_data)
        archives.append(verify_archive(path, records))
    # Catch additions, removals or concurrent edits after the initial snapshot.
    if build_manifest(root) != manifest or (root / "MANIFEST.json").read_bytes() != manifest_data:
        raise ValueError("Public sources changed during packaging; outputs retained but not accepted")
    report = {
        "format": "lecture-ppt-workflow-release-contents.v1",
        "release": VERSION,
        "status": "verified-release-package",
        "manifest_sha256": digest(manifest_data),
        "manifest_file_count": manifest["file_count"],
        "repository_layout": "Repository-relative paths, plus MANIFEST.json",
        "plugin_layout": "plugins/lecture-ppt-workflow/ prefix removed; plugin metadata at archive root",
        "scope": "Packaging integrity only. No installation, invocation, privacy, licensing, or publication claim.",
        "archives": archives,
    }
    report_data = json_bytes(report)
    with (out / "CONTENTS.json").open("xb") as stream:
        stream.write(report_data)
    sums = {item["name"]: item["sha256"] for item in archives}
    sums["CONTENTS.json"] = digest(report_data)
    checksum_data = "".join(f"{sums[name]}  {name}\n" for name in sorted(sums)).encode("ascii")
    with (out / "SHA256SUMS").open("xb") as stream:
        stream.write(checksum_data)
    for name, expected in sums.items():
        if digest((out / name).read_bytes()) != expected:
            raise ValueError(f"Final checksum mismatch: {name}")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="New output directory; existing paths are refused")
    args = parser.parse_args()
    print(json.dumps(package(ROOT, args.out), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError) as exc:
        print("ERROR: " + str(exc) + ". Existing and partial output retained.", file=sys.stderr)
        raise SystemExit(2)
