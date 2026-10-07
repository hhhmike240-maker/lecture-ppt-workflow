# 常见问题 / FAQ

[中文首页](../../README.md) · [English FAQ](FAQ.en.md) · [使用指南](USAGE.md)

### 需要安装什么吗？

用[在线页面](https://hhhmike240-maker.github.io/lecture-ppt-workflow/app/)不需要安装任何东西，有浏览器和一个 AI 聊天工具就行。电脑上需要 PowerPoint 或 WPS 打开下载的课件。

*No installation is needed for the web page; you only need a browser, an AI chatbot, and PowerPoint or WPS to open the result.*

### 用哪个 AI 都可以吗？

可以。DeepSeek、Kimi、豆包、通义千问、文心、ChatGPT、Claude、Gemini 等都能按提示词输出大纲。能上传 Word/PDF 讲义的 AI 用起来最方便；不能上传时把讲义正文粘贴进去即可。如果 AI 输出的格式有误，网页会提示具体位置，把提示发回给 AI 让它“只输出修正后的完整 JSON”即可。

*Any chatbot works. If the JSON has an error, the page shows where; ask the AI to output the corrected full JSON.*

### 我的讲义会被上传吗？

网页本身不上传任何文件：大纲解析、模板读取和 PPT 生成都在你的浏览器里完成。你发给 AI 的讲义受该 AI 服务的隐私政策约束，请按学校要求选择工具，不要发送学生个人信息。

*The page processes everything locally in your browser. What you send to the AI is governed by that AI service's terms.*

### 能套用我们学校的模板吗？

可以。在网页第 3 步上传一份你们的课件（.pptx），会复用其中的标志图片、标题横线、色块、背景、字体和主色。占位符样式、母版里的文字不会复制。生成后请预览，检查标题和正文是否与模板装饰重叠。公开分享课件前，请确认你有权使用其中的学校标识。

*Upload one of your decks to reuse its logos, rules, color blocks, background, fonts and main colors.*

### 为什么有的页面提示“超出版面”？

为了投影时看得清，每种版式的字号是固定的。内容放不下时，工具会提示拆页，而不是偷偷把字缩小。你可以让 AI“把第 N 页拆成两页”或“精简第 N 页的要点”。

### 点击动画在哪里？

“教学情境”页的参考分析、“课堂提问”页的答案，放映时默认隐藏，单击后淡入。授课备注里写有点击顺序。Microsoft 365 PowerPoint（Windows）和 WPS Office（Windows）都能识别为“单击时淡入”；Mac 版尚未验证，欢迎反馈。

### 讲义里的图片怎么办？

AI 不会重画讲义里的模型图，而是生成“原图”页，留一个虚线占位框写明是哪张图。你可以在 PowerPoint 里把原图放进去，也可以在网页第 3 步上传图片：文件名与大纲里的 image 字段一致时会自动放入。

### 支持英文课程吗？

支持。用英文提示词，课件文字使用讲义的语言；“答案：”“参考分析”、备注里的点击顺序等工具自动添加的文字，会跟随大纲的 `language` 变成英文，英文课件默认字体为 Calibri。网页右上角可以切换中英文界面。英文示例已在 PowerPoint 中逐页检查；用英文讲义实测 AI 还没有记录，欢迎反馈。

*Yes: see the [English FAQ](FAQ.en.md). Slide labels, notes, messages and the web page all come in English.*

### 收费吗？

免费开源（MIT）。你使用的 AI 服务和办公软件按其自身规则收费。

### 我想在 Codex 或 Claude Code 里用

见 [使用指南](USAGE.md) 的“作为 Skill 使用”。安装后，助手可以直接读取 Word 讲义、写大纲、生成课件并逐页检查。
