# 双语推广版验证 / Bilingual release validation

Date: 2026-10-04. Target: `v0.1.1-alpha`.

## Verified during preparation

- English README, quickstart, example prompts, FAQ and Chinese entry points reviewed against the actual installer and demo runner. Project installation uses an explicit `.agents/skills` destination; generation dependencies use a separate Python virtual environment.
- Skill descriptions and interface metadata now offer English discovery text and preserve Chinese teaching context. Language instructions preserve the source language unless translation is requested. This is a documentation/instruction change, not a measured improvement to English output quality.
- A voluntary Chinese/English GitHub issue form distinguishes demo browsing, installation blockers, successful setup, reproduced examples, original teaching decks, and repeat use. No telemetry was added. Form publication does not establish any external users.
- Public dependency installation in a fresh directory succeeded. `npm audit` reported 0 known vulnerabilities; 17 Node tests and 18 Python tests passed. The PNG insertion path now preserves aspect ratio and centers images. See [dependency verification](DEPENDENCY_CHECK_20261004.md) for the specific bug, checks, and limits.
- With the repaired dependencies, the complete original demo was regenerated: one reference slide, three before slides and three after slides. All seven PowerPoint static exports were visually inspected. Structural/style reports had no errors and style warnings were zero. Animation structure passed; actual click-through playback was not tested.
- A 60-second silent English-captioned MP4 was generated from the original Chinese demo previews. It is explicitly labeled as a static-slide walkthrough, not a screen recording. A representative frame was visually checked. No model-speed, English-output, or slideshow-playback claim follows from this video.

## Delivery checks

The plugin builder uses an explicit file allowlist and provides a read-only `--check` mode for drift, paths, local documentation links, Python syntax, and selected private-artifact markers. It copies no Node/Python runtime, dependencies, fonts, or office software, and does not configure or install a marketplace.

The release packaging script requires a new output directory. It checks the current public tree against `MANIFEST.json`, creates separate source and plugin archives, reopens each archive to check contents/hashes, and writes `SHA256SUMS`. A source manifest excludes temporary work, credentials, environments, dependency installations, and Git history. A path allowlist and marker scan cannot prove all possible privacy or licensing properties.

## Not established

Independent-device setup, independent Codex discovery/invocation, desktop plugin installation, full English-course output, LibreOffice rendering on other platforms, complex template behavior, actual slideshow playback, and external adoption remain unverified. Existing teacher feedback concerns the internal course-specific workflow. User-facing instructions and the release notes preserve these distinctions.

本次完成本机脚本、依赖、静态渲染、文档与分发检查；没有将这些结果替代为跨设备验证、英文课程质量、实际点击放映或新增用户证明。
