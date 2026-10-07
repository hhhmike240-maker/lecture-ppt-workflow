# 参与贡献 / Contributing

欢迎任何形式的贡献：反馈使用体验、改进提示词、增加版式、修复问题、补充其他软件（WPS、Keynote、macOS）的测试结果。中文或英文均可。

## 快速开始

```bash
cd lecture-ppt-workflow
npm ci --ignore-scripts
npm test                                  # Node：版式、动画、模板、打包
python -m unittest discover -s tests      # Python：索引、检查、动画交叉校验（需要 lxml）
```

本地预览网页：在仓库根目录运行 `python -m http.server 8000`，打开 http://localhost:8000/app/ 。网页直接引用 `lecture-ppt-workflow/scripts/lib/` 下的模块，与命令行共用同一套代码。

## 代码结构

| 位置 | 作用 |
|---|---|
| `lecture-ppt-workflow/scripts/lib/outline.mjs` | 大纲 → 页面规格：版式计算、文字测量、溢出检查 |
| `lecture-ppt-workflow/scripts/lib/pptx_core.mjs` | 页面规格 → PptxGenJS |
| `lecture-ppt-workflow/scripts/lib/finalize.mjs` | 形状 ID 去重、点击动画 |
| `lecture-ppt-workflow/scripts/lib/template.mjs` | 参考课件的字体、配色、装饰提取与复用 |
| `app/` | 免安装网页 |
| `prompts/` | 给聊天机器人用的提示词 |
| `demo/` | 示例讲义、大纲、课件与预览 |

## 增加一种版式

1. 在 `outline.mjs` 的 `LAYOUTS`、`LAYOUT_NAMES`、`validateOutline` 和 `L.<名称>` 中实现，所有尺寸从 `ctx`（`W`、`bottom`、`frame`）计算，放不下时调用 `check()` 报告而不是缩小字号。
2. 在 `references/outline.md` 和 `prompts/prompt.*.md` 中说明字段。
3. 在 `tests/test_outline.mjs` 中加测试，并用 PowerPoint 或 LibreOffice 渲染检查。

## 提交前请注意

- 不提交教师讲义、学生信息、聊天截图、学校标识、个人绝对路径或运行时文件。
- 新增示例内容需原创或注明许可；虚构案例要标注。
- 说明实际测试过的系统与软件版本，以及没测试的部分。
