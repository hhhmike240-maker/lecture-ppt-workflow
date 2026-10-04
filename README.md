# 教学课件工作流 · Lecture PPT Workflow

**简体中文** | [English](README.en.md)

[查看修改前后示例](#最小演示与反馈) · [英文快速上手](docs/QUICKSTART.en.md) · [提交使用反馈](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose)

当前文档对应 **v0.1.1-alpha**，增加双语介绍与反馈入口；可下载版本见 [Releases](https://github.com/hhhmike240-maker/lecture-ppt-workflow/releases)。[60 秒英文字幕导览](docs/media/lecture-ppt-workflow-overview.mp4)使用原创中文静态课件页面制作，不是操作录屏。

教师讲义与标准课件输入 → 知识课件 → 教师反馈修订 → 后续章节复用。

适合已经有讲义和参考 PPT，希望制作后续章节、保留可编辑内容与授课备注的教师和助教。先用仓库中的原创短示例了解流程，再尝试自己的一个小章节。

## 第一次尝试

1. **先看结果**：打开 [修改前](demo/before.pptx) 与 [修改后](demo/after.pptx)，或下方的页面预览，无需先安装 Skill。
2. **只检查现成 PPT**：准备 Python 3.10+，在仓库根目录运行 `python lecture-ppt-workflow/scripts/style_check.py demo/after.pptx --out scratch/first-style.json`。输出文件须不存在；无需 Node 或模型调用。
3. **在当前项目安装 Skill**：运行 `python install.py --skills-dir .agents/skills`，然后在支持本地 Skill 的 Codex 环境中打开此项目，用 `$lecture-ppt-workflow` 显式调用。复制完成和实际发现/触发分别确认。生成课件的其他依赖见下文。
4. **留下反馈**：[安装成功、示例成功、使用遇阻都欢迎反馈](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues/new/choose)。不必公开原讲义或学生资料。

英文介绍、命令说明和调用示例见 [English README](README.en.md)。当前演示课件和详细工作流参考仍以中文为主；英文课程输出尚未独立验证。

适合希望保留课程知识、版式与授课备注，并能审核结果的教师、助教。项目是Codex Skill、规则和辅助脚本，不是独立大模型、通用演示软件或无人审核的教学系统。

**当前版本已发布在 GitHub，定位为源代码与示例的早期试用版。** 它需要Node、公开npm依赖、中文字体和演示软件；安装器不会自动下载依赖。详细事实见[运行与许可](lecture-ppt-workflow/references/runtime.md)和[验证记录](docs/VALIDATION.md)。

v0.1.0-alpha 为先前公开版本。本轮改动与验证见 [v0.1.1-alpha 说明](docs/RELEASE_0.1.1-alpha.md)和 [2026-10-04 验证记录](docs/VALIDATION_20261004.md)。

## 功能与证据

| 能力 | 实现与边界 |
|---|---|
| 新章、情境增强、限定修订、样式提取 | Skill路由与规则，依赖模型判断，不是四个全自动命令 |
| Word/PPT索引、图片与备注定位 | Python脚本；图片语义仍需读图 |
| 可编辑文字、形状、表格、关系连线 | JSON规格生成器；使用公开PptxGenJS依赖，不自动理解Word |
| 点击淡入与授课备注 | 原生结构，新增指定页；不重建既有复杂动画 |
| 内容覆盖与样式检查 | ID/关键词/坐标策略，不证明语义正确或页面美观 |
| 背景限定修订 | 仅直接纯色背景；主题/图片背景需单独判断 |
| 静态预览 | 需要PowerPoint，或LibreOffice与Poppler；不等同实际放映 |

不适用：大量公式或复杂音视频保真转换、自动判断学校素材授权、完全离线智能排版、保证所有PowerPoint/WPS版本兼容。

已有一位教师独立制作后续章节，经过数轮反馈修订后表示效果较好。依据项目发起人提供的实际反馈，未公开私人对话和课件；不能推导为零修改成功、量化节省时间或跨设备验证。

## 安装与环境

1. Python 3.10+。解析和检查使用标准库；动画另需lxml（本机测试版本见验证记录）。不要向托管运行时全局装依赖。
2. 生成需要 Node 20+ 和锁定的公开 npm 依赖，包括 PptxGenJS 4.0.1；本项目不提交 `node_modules`。完整 demo 在 Windows 固定使用 PowerPoint COM 导出，其他系统使用 LibreOffice + Poppler，后者尚未独立验证。具体命令见下文。
3. 中文字体需自行合法安装。样例选择Microsoft YaHei，字体不随包附送；其他字体须重新渲染。
4. 实际放映需用户的演示软件。本机PowerPoint结果不外推到WPS/macOS/Linux。

在本目录运行：

```text
python install.py
```

默认安装到`CODEX_HOME/skills`，未设置时为用户目录下`.codex/skills`。独立名称为`lecture-ppt-workflow`，不会覆盖导师的`bupt-public-hrm-ppt-skill`。已有同名目录会拒绝覆盖。新任务中输入`$lecture-ppt-workflow`，确认实际被发现；目录复制成功不代表App发现已验证。

隔离安装（不改正式Skill目录）：

```text
python install.py --skills-dir scratch/skills
python scratch/skills/lecture-ppt-workflow/scripts/validate_skill.py
```

## 最短检查示例（无需生成引擎）

```text
python lecture-ppt-workflow/scripts/office_audit.py index demo/after.pptx --out scratch/index.json
python lecture-ppt-workflow/scripts/style_check.py demo/after.pptx --out scratch/style.json
```

全部输出用新路径，重复执行换目录。检查现成PPT不会触发AI写作。

## 最短生成示例

以下以已完成上方 `.agents/skills` 项目安装为前提，在仓库根目录运行。准备 Node、Python、字体和 PowerPoint；在专用虚拟环境安装 Python 依赖，不改系统 Python。Windows PowerShell：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .agents/skills/lecture-ppt-workflow/requirements.txt
npm ci --ignore-scripts --prefix .agents/skills/lecture-ppt-workflow
.\.venv\Scripts\python.exe .agents/skills/lecture-ppt-workflow/scripts/doctor.py --out scratch/environment.json
.\.venv\Scripts\python.exe demo/run_demo.py --out scratch/demo-run --skill-dir .agents/skills/lecture-ppt-workflow
```

macOS/Linux 的虚拟环境命令见 [英文快速上手](docs/QUICKSTART.en.md)。使用新输出目录重试；不要删除旧结果。环境诊断的 `rendering` 字段只检测 LibreOffice+Poppler，不检测 PowerPoint COM，需结合实际导出检查。

`run_demo.py`复现已审定的规格，不是独立AI任务，也不是“Word自动转PPT”。默认使用当前Python和PATH里的Node；`--node`可指定已解析Node。输出包含标准模板、修改前后课件、动画、PNG和检查结果。运行约需几十秒至数分钟，缺依赖明确失败，不删除失败产物。

## 教师使用流程

提供章节讲义、自己的标准PPT和本次范围。先检查环境；再读全文及原图、列知识映射、按标准建页、写备注和点击动画；最后逐页看图并交付新文件。反馈改动应说明页码/对象/目标，不覆盖上一版。

课程配置见[示例](lecture-ppt-workflow/course-profile.example.json)与[说明](lecture-ppt-workflow/references/course-profile.md)。配置是模型读取的偏好，不会自动驱动生成器；学校背景、Logo、字号与标题层数不写入通用默认。

完整可复制提示词见[demo/PROMPTS.md](demo/PROMPTS.md)。日常步骤见[使用说明](docs/USAGE.md)。

英文提示词见 [PROMPTS.en.md](demo/PROMPTS.en.md)，中英文常见问题见 [FAQ](docs/FAQ.md)。

## 最小演示与反馈

自编短讲义：[任务交接](demo/lecture.md)。[标准模板](demo/standard.pptx)、[修改前](demo/before.pptx)、[修改后](demo/after.pptx)。没有学校标识、教师原图或外部照片。

![修改后情境页](demo/preview-after/002.png)

反馈样例：把密集的情境段落分成任务材料、明确问题和点击揭示的参考分析，同时保留知识和必要虚构标识。修改前后均是本项目自编演示，不冒称导师当时使用的原稿。

![修改前情境页](demo/preview-before/002.png)

末页用真实知识分支图回顾。演示只说明最小工作流，不代表复杂课程质量。生成文件已随公开版适配器在本机完成静态审阅；公开发布时仍需使用者自行确认素材、字体和软件许可。

## 限制、问题报告与计划

- 当前限制：跨平台静态渲染需自行安装LibreOffice + Poppler；Windows PowerPoint渲染脚本未验证动态放映。复杂既有模板仍需使用者提供标准并人工审核。未来计划见[发布审阅](docs/RELEASE_REVIEW.md)。
- 公共候选Skill未在另一台电脑或独立Codex任务中验证触发。不能把本机隔离目录测试称为干净系统测试。
- 复杂模板、主题、继承字号、公式和动态放映需另测。自动检查不能替代教师知识审核。
- 用量没有固定承诺，文件大小不等于模型消耗。
- 更新请使用新目录；不要无确认删除缓存或旧成果。

报告问题请按[问题模板](docs/ISSUE_TEMPLATE.md)提供脱敏复现材料；不要上传学生信息、聊天记录、账号路径或未获许可课件。仓库已公开，欢迎通过 [Issues](https://github.com/hhhmike240-maker/lecture-ppt-workflow/issues) 提交反馈。

后续优先级：第二设备安装与独立任务触发 → 跨平台静态渲染 → 动态点击放映与复杂模板兼容性。暂不开发网站、账号或大型模板库。

## 版本、来源与许可

内部v1.1保留不动；公开v0.1.0-alpha为通用化分支，并非v1.1功能全部获得公开验证。见[CHANGELOG](CHANGELOG.md)。

本项目由需求方沟通、整理教师反馈并验收，代码及文档在AI辅助下实现。PptxGenJS等外部工具承担PPTX生成/渲染，本项目增加教学规则、边界、规格适配、检查与反馈复用。详见[来源和许可审查](docs/PROVENANCE.md)。

本仓库原创代码、规则、文档和原创演示材料按根目录 `LICENSE` 发布。第三方运行时、字体、PowerPoint、Python/Node及其依赖不受本许可证覆盖，使用者必须遵守各自许可。上传前仍应确认自己对新增素材拥有权利。
