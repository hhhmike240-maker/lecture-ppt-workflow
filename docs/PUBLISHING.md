# 发布与推广操作 / Publishing and outreach

Public repository: [hhhmike240-maker/lecture-ppt-workflow](https://github.com/hhhmike240-maker/lecture-ppt-workflow). This guide replaces the original upload checklist for the bilingual `0.1.1-alpha` work; the older documents are retained as release history.

## Rebuild a release

From the source repository, after updating docs and running relevant validation:

```text
python -B scripts/build_plugin.py
python -B scripts/build_plugin.py --check
python -B lecture-ppt-workflow/scripts/validate_skill.py
python -B make_manifest.py
python -B scripts/package_release.py --out dist/release-0.1.1-alpha
```

The output directory must not already exist. Use another name when repeating the operation; the scripts do not delete old outputs. Review the source and plugin ZIP file lists and `SHA256SUMS`. Do not upload `scratch`, `work`, `.venv`, private course materials, dependency installations, or credentials.

Use [the release notes](RELEASE_0.1.1-alpha.md) for the prerelease description. Retain previous releases. The new tag must identify the exact commit whose archive contents were checked. Upload the source ZIP, plugin ZIP and checksum file, then verify the public URLs and filenames. A release is not an official plugin-directory listing.

## Outreach prepared in this repository

- [中文文案](PROMOTION_COPY.md) and [English announcement/group invitation](OUTREACH.en.md).
- [60-second video](media/lecture-ppt-workflow-overview.mp4), with explicit static-demo labeling.
- [Usage feedback form](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose) and [FAQ](FAQ.md).

Invite a small group already interested in teaching or course preparation to try the original example. Ask how far they got, rather than asking only for a Star. Share only where the community permits project posts; no community or personal messages have been sent as part of preparing these materials.

## What counts as adoption

Use a concrete user report of successful installation, a completed example, a deck made from their own notes, or repeat use. Traffic clones, source downloads, and Release asset downloads are distribution signals. They cannot identify actual users or show whether the workflow worked. Public issues are optional; no feedback is not proof of no use.

The [promotion plan](PROMOTION_PLAN.md) treats trial counts as goals and records remaining validation gaps. Do not present those goals as achieved results.
