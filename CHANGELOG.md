# 版本记录

## 未发布 · 2026-10-07 · DeepSeek 实测后的改进

- 提问页 3–4 题时改为 2×2 卡片，4 道题也能放下。
- 超出版面的提示直接给出可以发给 AI 的修改句，例如“第 11 页情境太长：材料控制在 80 字内……”。
- 整段的参考分析自动按句拆成要点；来源已含“虚构”时不再重复标注。
- 提示词收紧情境页（材料 80 字内、问题 1–2 个、分析 2–3 条）和提问页（≤4 题、答案 25 字内）。

## 0.2.0 · 2026-10-07 · 人人可用版 / For everyone

- **免安装网页**（`app/`，可用 GitHub Pages 发布）：复制提示词 → 粘贴任意 AI 的回答 → 预览 → 下载 PPTX。全部在浏览器内处理，不上传文件。
- **通用提示词**（`prompts/`，中英文）：适用于 DeepSeek、Kimi、豆包、通义、ChatGPT、Claude 等，内置来自教师反馈的规则。
- **版式引擎**（`build_outline.mjs`、`scripts/lib/`）：AI 只写内容，13 种教学版式由程序计算坐标；文字溢出报告“请拆页”，不自动缩小字号。
- **授课备注与点击动画**：每页备注；情境分析、提问答案单击淡入（与 `add_animations.py` 同结构，交叉测试）。
- **模板复用**：上传参考课件，复用标志、横线、色块、背景、字体和主色；标题自动放到模板横线上方，页码避开角落装饰。
- **安装器**支持 `--target claude|codex|claude-project|codex-project` 与 `--with-deps`。
- 新示例：原创讲义《第三章 工作分析》、15 页课件、默认风格与示例模板两套预览、知识覆盖映射。
- 修复：PptxGenJS 表格与其他形状可能重复的形状 ID；声明 jszip 依赖。
- 精简仓库：维护者推广计划、简历稿等内部文件移出仓库；旧版三页示例与旧视频删除；旧验证记录移至 `docs/history/`。
- 验证见 [2026-10-07 验证记录](docs/VALIDATION_20261007.md)。

## 0.1.1-alpha · 2026-10-04 · 双语推广版 / Bilingual onboarding

- 增加英文 README、快速上手、调用示例和中英文导航，保留中文课程示例。
- 增加自愿提交的中英文使用反馈表单，区分浏览、安装、示例成功、实际制作和再次使用。
- 增加双语 Skill 发现信息及语言处理规则；未扩大英文输出或跨平台验证声明。
- 补齐可重复构建的插件分发候选与发布包；仅结构验证不代表应用内安装成功或官方目录上架。
- 保留 PptxGenJS 4.0.1，将 image-size 锁定为 2.0.4，修复其相关依赖告警；新隔离安装 audit 为 0。
- 修复 PNG/JPEG 插图调用不存在的 imageSizingContain 方法导致生成报错，改为等比居中；新增实际图片生成、格式拒绝与解析终止回归测试。
- 新增 60 秒英文字幕静态课件导览，不宣称操作录屏或动态动画验证。

## 0.1.0-alpha · 2026-09-24 · GitHub上传候选

- 从内部bupt-public-hrm-ppt-skill v1.1分出独立lecture-ppt-workflow，不覆盖导师版本。
- 移出学校Logo、固定坐标、字号和章节理论清单，以课程配置表达用户偏好。
- 保留知识上屏、原图核对、标题间距、来源安全区、章末关系图、动画备注与范围控制。
- 更新教师试用状态：已有一位教师独立制作后续章节，经多轮修订反馈较好；不等于全环境验收。
- 复用检查与生成适配代码，新增最小演示、独立安装器、公开文档和来源审查。
- 将页面规格生成适配到公开npm的PptxGenJS 4.0.1，锁定package-lock并完成隔离目录最小示例与Windows静态导出检查。

## GitHub upload candidate · 2026-09-23

- Added a repository-ready MIT license for original project files, plus contribution and security guidance.
- Reframed the release as uploadable source/demo material with an explicitly declared public generation dependency and external rendering requirements.
- Kept private course material, internal runtime, personal paths and historical mentor package out of the release tree.

## 内部1.1 · 历史分支

教师课程专用。历史记录含18项Python、8项Node测试，代表页与第二章16页本机检查。历史证明针对当时文件，不为公共分支自动背书。公共分支不带原课件、私有材料和机器路径。
