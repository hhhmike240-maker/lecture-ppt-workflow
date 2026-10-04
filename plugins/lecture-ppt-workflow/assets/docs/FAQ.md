# 使用问答 / Frequently asked questions

[中文首页](../../README.md) · [English overview](../README.en.md)

### 适合谁？ / Who is it for?

已经有讲义和参考课件，希望制作新章或按明确反馈修订的教师与助教。

Instructors and teaching assistants who have lecture notes and a reference deck, and want to create a new chapter or revise specific slides with instructor review.

### 是独立软件吗？ / Is this a standalone app?

这是 Codex Skill 与本地辅助脚本。理解内容和设计页面需要支持 Skill 的模型环境；脚本复现 JSON 规格，不自行理解讲义。

It is a Codex Skill with local helper scripts. An agent interprets the source material and designs the deck. The deterministic demo builds an already-authored JSON specification; it does not call a model.

### 需要哪些环境？ / What do I need?

解析和检查需 Python 3.10+；生成需 Node 20+ 和 npm 依赖；动画需 lxml；演示需要字体与演示软件。Windows 的完整 demo 使用 PowerPoint，其他平台走 LibreOffice 与 Poppler。先看 [English quickstart](QUICKSTART.en.md) 或 [中文使用说明](https://github.com/hhhmike240-maker/lecture-ppt-workflow/blob/main/docs/USAGE.md)。

Parsing/checking requires Python 3.10+. Generation also needs Node 20+ and the npm dependencies; animation needs lxml. The full demo uses PowerPoint on Windows and LibreOffice plus Poppler elsewhere. Rendering also needs appropriate fonts. Those tools and fonts are not bundled.

### 支持英文课件吗？ / Is English supported?

提供英文介绍、安装步骤和调用提示，支持指定沟通与输出语言；当前原始示例和详细参考主要是中文。尚无独立的英文课程质量验证或跨平台兼容保证。

English introductions, setup instructions, and invocation examples are provided. You can request an output language, but the bundled course demo and detailed references are mainly Chinese. English-course output quality has not been independently validated.

### 免费吗？ / What does it cost?

原创代码、规则和示例采用 MIT 许可。使用者的模型服务、办公软件、字体许可和运行资源各自另计，项目不承诺固定成本或耗时。

Original code, rules, and examples are MIT-licensed. Your model service, presentation software, font licenses, and compute resources have their own terms and costs. There is no fixed usage-cost or time-saving promise.

### 会自动收集使用数据吗？ / How do you measure usage?

本次新增的是用户主动提交的公开 GitHub Issue 表单，没有新增遥测或自动回传功能。克隆与下载只能说明获取，不能证明实际做出了课件。公开反馈可报告安装、示例成功、实际制作和再次使用。

This update adds a voluntary public GitHub issue form, not telemetry or automatic reporting. Clones and downloads do not prove successful use. Please report how far you got, including installation problems, demo completion, your own slides, or repeat use.

### 哪里反馈？ / Where can I send feedback?

[提交使用反馈 / Share your experience](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose)。中文或英文均可；只需要环境与简短结果，不必公开原课件。安全问题见 [SECURITY.md](../SECURITY.md)。
