# v0.1.1-alpha — English onboarding and feedback / 双语介绍与反馈

## English

Instructors and teaching assistants can now start with an English README, a project-scoped quickstart, English invocation examples, and a bilingual FAQ. The Chinese entry point remains available. A voluntary usage-feedback issue form asks whether installation, the demo, or an original teaching deck worked. A 60-second English-captioned video walks through the original Chinese demo slides; it is not a screen recording.

This update also fixes real image insertion failures and pins `image-size` to 2.0.4 while retaining PptxGenJS 4.0.1. Fresh installation passed 17 Node tests and 18 Python tests, with 0 known vulnerabilities reported by npm audit. The complete seven-slide reference/before/after demo was regenerated, structurally checked, statically exported through Windows PowerPoint, and visually reviewed.

The source ZIP is the recommended starting point. The separate plugin ZIP uses the supported `.codex-plugin/plugin.json` compatibility layout and includes local installation instructions; it has passed structural checks, not desktop installation or discovery tests. Both packages omit runtimes, fonts, office software and `node_modules`. `SHA256SUMS` records archive checksums.

The demo and detailed workflow references remain mainly Chinese. Independent-device setup, independent Codex invocation, full English-course output, other-platform rendering, complex templates and actual slideshow playback remain unverified. Teachers still review subject accuracy and classroom suitability. Download or clone counts do not establish actual users.

## 中文

增加英文 README、项目安装教程、英文调用示例、中英文 FAQ 与自愿使用反馈表单，保留中文首页。新增 60 秒英文字幕的原创中文课件静态导览，不宣称操作录屏或动画播放演示。

修复插入图片时调用不存在方法的问题；保留 PptxGenJS 4.0.1，将 image-size 锁定到 2.0.4。新隔离安装通过 17 项 Node 和 18 项 Python 测试，npm audit 为 0。参考页、修改前与修改后共 7 页重新生成并完成 PowerPoint 静态导出和逐页检查。

推荐先下载源码包。插件包属于可试用的独立分发形式，仅完成结构检查，尚未完成桌面安装和发现验证；安装依赖与字体需用户自行准备。完整英文课程输出、第二台电脑、跨平台、复杂模板和实际点击放映仍需分别验证。

[English README](../README.en.md) · [中文首页](../README.md) · [验证记录](VALIDATION_20261004.md) · [反馈 / Feedback](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose)
