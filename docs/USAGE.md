# 使用指南

[中文首页](../README.md) · [常见问题](FAQ.md) · [English quick start](QUICKSTART.en.md)

本工具有三种用法，从易到难：

| 用法 | 适合 | 需要 |
|---|---|---|
| A. 在线页面 | 所有老师 | 浏览器 + 任意 AI 聊天工具 |
| B. 作为 Skill | 用 Codex 或 Claude Code 的老师、助教 | Python 3.10+、Node.js 20+ |
| C. 命令行 | 想批量生成或二次开发的人 | Node.js 20+ |

## A. 在线页面（推荐）

1. 打开 https://hhhmike240-maker.github.io/lecture-ppt-workflow/app/ ，点“复制提示词”。
2. 打开你常用的 AI，粘贴提示词，在末尾“我的材料”处填写课程、章节、课时，说明是否需要案例，然后附上讲义（上传文件或粘贴正文）。
3. 复制 AI 的完整回答，粘贴到页面第 2 步的输入框。页面会自动预览。
4. 可选：第 3 步上传你自己的课件，套用模板；上传讲义原图，自动放入“原图”页。
5. 逐页查看预览和提示：
   - 红色提示（如“内容超出版面”）：回到 AI，说“第 5 页内容太多，拆成两页，其他页不变，输出完整 JSON”。
   - 黄色提示（如“缺少授课备注”）：可以忽略，也可以让 AI 补充。
6. 点“下载 PPTX”，用 PowerPoint 或 WPS 打开，核对内容，按需修改。

**小技巧**

- 章节较长时，让 AI 分两次输出（提示词里已说明），分别生成后在 PowerPoint 中合并。
- 想改风格（颜色、字体），可以在 JSON 开头加 `"theme": {"primary": "#8B1E3F", "font": "微软雅黑"}`，或直接上传一份带目标风格的课件。
- 想要逐条出现的要点，在该页加 `"reveal": true`。

## B. 作为 Skill 使用（Codex / Claude Code）

```bash
git clone https://github.com/hhhmike240-maker/lecture-ppt-workflow.git
cd lecture-ppt-workflow
python install.py --target claude --with-deps   # Claude Code
python install.py --target codex --with-deps    # Codex
```

`--with-deps` 会在安装好的 Skill 目录里运行 `npm ci --ignore-scripts`。只想装到当前项目，用 `--target claude-project` 或 `--target codex-project`。已存在同名 Skill 时安装器会拒绝覆盖。

新开一个会话，把讲义和参考课件放进工作目录，然后说：

> 用 lecture-ppt-workflow 把 第三章讲义.docx 做成课件，套用 学院模板.pptx 的风格，2 课时，可以自编一个教学情境。做完逐页检查并告诉我哪些内容需要我核实。

更多可复制的说法见 [demo/PROMPTS.md](../demo/PROMPTS.md)。

## C. 命令行

```bash
cd lecture-ppt-workflow && npm ci --ignore-scripts && cd ..
node lecture-ppt-workflow/scripts/build_outline.mjs 大纲.json 输出目录 --template 参考课件.pptx
```

- 输出：`lecture.pptx`、`report.json`（版面问题、模板提取结果）、`spec.json`（页面规格）、`outline.json`（输入大纲副本）。
- 退出码：0 正常；1 已生成候选但有版面错误；2 输入错误。
- 完整演示：`python demo/run_demo.py --out 新目录`（默认风格和示例模板各生成一份，并做知识覆盖检查、渲染预览）。

大纲格式见 [课件大纲格式](../lecture-ppt-workflow/references/outline.md)。
