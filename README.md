# 讲义变教学 PPT · Lecture PPT Workflow

**简体中文** | [English](README.en.md)

把讲义交给你常用的 AI，几分钟得到一份**可编辑**的教学课件：版式自动排好，每页带**授课备注**，案例分析和提问答案**点击才出现**，还能套用**你自己学校/课程的模板**。

**[▶ 在线使用（免安装、免注册）](https://hhhmike240-maker.github.io/lecture-ppt-workflow/app/)** · [下载示例课件](demo/lecture.pptx) · [看示例讲义](demo/lecture.md) · [反馈建议](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose)

![由示例讲义生成的课件页面](docs/images/showcase.png)

<sub>上图是用 [示例讲义《第三章 工作分析》](demo/lecture.md) 生成的 15 页课件中的 6 页，未经手工调整。所有文字、表格、图形都可以在 PowerPoint / WPS 里直接修改。</sub>

## 三步做出一章课件

1. 打开 **[在线页面](https://hhhmike240-maker.github.io/lecture-ppt-workflow/app/)**，点“复制提示词”。
2. 把提示词和你的讲义一起发给 AI：DeepSeek、Kimi、豆包、通义千问、ChatGPT、Claude 都可以。
3. 把 AI 的回答粘贴回页面，预览，然后点“下载 PPTX”。

可选：上传一份你自己的课件，新课件会自动沿用其中的**标志、标题横线、配色和字体**。

![默认风格与套用模板后的对比](docs/images/template.png)

讲义和课件只在你的浏览器里处理，**不会上传到任何服务器**。唯一经过网络的是你自己发给 AI 的那段对话。

## 它和“一键生成 PPT”有什么不同

这个工具是按一位高校教师多轮反馈的要求做出来的，重点是**能直接拿去上课**，而不只是好看。

| 老师在意的事 | 这里的做法 |
|---|---|
| 内容别乱编 | 提示词要求以讲义为准；补充内容只写进备注并标注“请核实”；案例默认不自编，自编的会标“虚构” |
| 讲课要有抓手 | 每页都有授课备注：讲解要点、易错点、可以提的问题、和下一页的衔接 |
| 课堂要有互动 | 案例的“参考分析”、提问的“答案”默认隐藏，点击才出现（PowerPoint 原生动画） |
| 版面别挤 | 每页字数有上限；放不下会提示“请拆成两页”，**不会偷偷缩小字号** |
| 用学校的模板 | 上传自己的课件，复用其中的标志、横线、色块和字体 |
| 原图不能丢 | 讲义里的图不会被 AI 重画，而是留出“请插入原图”的占位框 |
| 要能改 | 全部是原生文本框、表格和图形，没有整页截图 |

这些规则的来源和细节见 [从老师反馈总结的规则](lecture-ppt-workflow/references/feedback.md)。

## 13 种教学版式

封面 · 目录 · 节标题 · 要点（自动卡片化） · 概念定义 · 对比 · 表格 · 流程 · 教学情境（点击显示分析） · 原图 · 课堂提问（点击显示答案） · 知识回顾（结构图） · 结束页

AI 只负责写内容和选版式，坐标、间距、对齐都由程序计算，所以每次生成的版面都整齐一致。格式说明见 [课件大纲格式](lecture-ppt-workflow/references/outline.md)。

## 进阶用法

### 在 AI 编程助手里使用（Codex / Claude Code）

安装为 Skill 后，可以直接说“用 lecture-ppt-workflow 把这份讲义做成课件”。助手会读取 Word/PPT 讲义、写大纲、生成课件、逐页渲染检查，并核对知识点是否都上了屏。

```bash
git clone https://github.com/hhhmike240-maker/lecture-ppt-workflow.git
cd lecture-ppt-workflow
python install.py --target claude      # Claude Code：安装到 ~/.claude/skills
python install.py --target codex       # Codex：安装到 ~/.codex/skills
```

安装器会提示下一步需要运行的 `npm ci` 命令。需要 Python 3.10+ 和 Node.js 20+。详见 [使用指南](docs/USAGE.md)。

### 命令行

```bash
cd lecture-ppt-workflow && npm ci --ignore-scripts && cd ..
node lecture-ppt-workflow/scripts/build_outline.mjs demo/outline.json out/demo --template 我的课件.pptx
```

输出目录里有 `lecture.pptx`、版面检查报告 `report.json`、页面规格 `spec.json` 和大纲副本 `outline.json`（以后修改或换模板时重新生成用）。已存在的目录不会被覆盖。完整演示（含知识覆盖检查和逐页预览图）：`python demo/run_demo.py --out out/full-demo`。

## 已验证与未验证

- **已验证**（2026-10-07，Windows + Microsoft 365 PowerPoint）：示例课件 15 页的打开与逐页导出；点击动画被 PowerPoint 识别为“单击时淡入 0.4 秒”；网页与命令行生成结果一致；模板复用在原创示例模板和一份真实高校模板上测试通过；**WPS Office（Windows）** 打开、逐页导出一致，点击动画同样被识别。**DeepSeek 实测**：首次回答即为合格大纲（17 页，每页有备注），2 页被正确提示超出版面，按提示回复一句后修好；**豆包实测**（改进后的提示词）：一次通过，17 页零版面问题。自动化测试 Node 35 项、Python 19 项。详见 [验证记录](docs/VALIDATION_20261007.md)。
- **尚未验证**：WPS 中实际放映的点击效果（结构已识别）、macOS 版 PowerPoint、Keynote；非 Windows 系统的渲染脚本；Kimi、通义、ChatGPT 等其他 AI 的输出质量；英文课程的实际效果。欢迎反馈。

## 局限

- AI 写的内容需要老师审核：事实、术语、案例是否适合你的课堂，最终由你判断。
- 网页预览是近似效果，以 PowerPoint / WPS 中打开为准。
- 模板复用只复制**没有文字**的装饰（标志图片、线条、色块）。占位符样式、母版里的文字和继承字号不会复制，复杂模板请先预览。
- 暂不支持公式、图表、音视频。讲义原图需要老师自己放入占位框，网页也可以上传图片自动放入。

## 参与和反馈

- 用过了？无论成功还是卡住，都欢迎 [留下反馈](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose)，不需要公开讲义或学生信息。
- 想增加版式或改进提示词，见 [参与贡献](CONTRIBUTING.md)。
- 原创代码、规则、文档和示例按 [MIT 许可](LICENSE) 开源。生成引擎为 [PptxGenJS](https://github.com/gitbrent/PptxGenJS)（MIT），其他第三方组件见 [NOTICE](NOTICE) 和 [来源说明](docs/PROVENANCE.md)。本项目在 AI 辅助下实现，由维护者整理需求、教师反馈并验收。
