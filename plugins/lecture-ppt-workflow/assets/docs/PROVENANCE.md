# 来源与许可说明

最近更新：2026-10-07（v0.2.0）。本文件是来源梳理，不是法律意见。

| 内容 | 来源与处理 |
|---|---|
| Skill 规则（`lecture-ppt-workflow/SKILL.md`、`references/`） | 根据项目实际需求和一位高校教师的多轮反馈抽象重写；不含教师身份、聊天记录、原课件或学校参数 |
| 脚本与测试 | 本项目原创，AI 辅助编写；版式引擎、模板复用、动画写入为 v0.2.0 新增 |
| 示例讲义、大纲、课件、预览图（`demo/`） | 本项目原创教学示例，依据人力资源管理课程的通用知识编写，未摘录教材原文；情境案例为虚构并在页面上标注 |
| 示例模板（`demo/template/`） | 由 `make_sample_template.mjs` 生成；“标志”是简单几何图形，不代表任何机构 |
| 提示词（`prompts/`） | 本项目原创 |
| PptxGenJS 浏览器包（`app/vendor/`） | 第三方，MIT；未修改，许可证见同目录。内含 JSZip（MIT/GPLv3 双许可，按 MIT 使用） |
| npm 依赖 | pptxgenjs 4.0.1、image-size 2.0.4、jszip 3.10.2，由 package-lock 锁定，使用者自行安装，不提交 node_modules |
| Python、Node.js、lxml、字体、PowerPoint、WPS、LibreOffice、Poppler | 不分发；使用者需自行取得并遵守各自许可 |

模板复用功能会把用户上传的参考课件中的标志、线条、色块复制到新课件里。这些素材的权利属于原权利人；在公开分享生成的课件前，使用者应确认自己有权使用其中的学校标识等素材。

本仓库根目录 `LICENSE` 只覆盖本项目原创文件。
