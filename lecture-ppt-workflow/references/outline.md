# 课件大纲格式（lecture-outline v1）

大纲只写内容与版式选择，坐标、字号、间距由 `scripts/lib/outline.mjs` 计算。网页、命令行 `build_outline.mjs` 和 Skill 使用同一套代码。

```json
{
  "format": "lecture-outline",
  "version": 1,
  "title": "第三章 工作分析",
  "language": "zh-CN",
  "theme": {"font": "Microsoft YaHei", "primary": "#2F5D7C", "accent": "#167A85"},
  "slides": [{"layout": "cover", "title": "第三章 工作分析"}]
}
```

完整示例见本 Skill 的 [examples/outline.json](../examples/outline.json)（15 页，覆盖除 figure 外的全部版式）；给聊天机器人用的说明见仓库 `prompts/prompt.zh.md`。

## 版式与字段

| layout | 必填 | 可选 | 说明 |
|---|---|---|---|
| cover | title | subtitle, meta | 有模板封面时居中放入模板的标题色块 |
| agenda | items（2–10） | title | 超过 5 项分两栏 |
| section | title | number, subtitle | 设定之后页面的大标题（“number title”） |
| bullets | title, points（1–8） | emphasis, style（list/cards）, reveal | 2–4 条“术语：解释”自动卡片化；reveal=true 逐条点击出现 |
| definition | term, definition | title, points（≤4） | points 为“术语：解释”时显示为卡片 |
| compare | title, columns（2–3，title+points） | conclusion | |
| table | title, headers（2–6）, rows（≤10） | note, boldFirstColumn | 列宽按内容自动分配，短文字不折行 |
| process | title, steps（2–6，title+text） | | 箭头为可编辑连线 |
| case | title, material, questions（1–4） | analysis（≤5，建议 2–3 条短句）, fictional, source, label | analysis 第 1 次点击出现；无 source 时默认标“教学情境（虚构）” |
| figure | title, image 或 placeholder | caption, points, imageSide | image 为图片文件名（相对大纲文件或网页上传）；无图时留虚线占位框 |
| quiz | title, questions（1–4，q+answer） | options | 3–4 题时为 2×2 卡片；第 n 题答案第 n 次点击出现 |
| review | branches（2–5，title+items） | title, center | 结构图；分支名建议 8 字以内 |
| closing | title | subtitle | 与 section 同样式 |

通用字段：`notes`（授课备注，内容页缺失时写入“【待补充】”并给出警告）、`source`（页脚出处）、`section`（覆盖或清空继承的大标题，null 表示清空）。

## 主题（theme）

`font`、`primary`、`accent`、`text`、`muted`、`background`、`surface`、`tint`、`line`、`border`、`warm`（#RRGGBB），`pageNumbers`（布尔），`width`（640–1280，默认 960 为 16:9，720 为 4:3），`backgroundImage`/`coverImage`（图片文件名，整页铺底）。

使用 `--template 参考课件.pptx` 或网页上传参考课件时，会自动生成 theme 和 `frame`：标题横线位置（ruleY）、避开标志的标题宽度（headingRight）、页码位置（footerRight）、内容底边（bottom）和封面标题色块（coverTitle）。大纲中显式写的 theme 字段优先。

## 检查结果

`layoutOutline()` 返回 `{spec, issues, summary}`。issues 中：

- **error**：文字超出版面（不自动缩小字号，按提示删减或拆页）、标题超过一行、缺少图片文件等。命令行退出码为 1，状态为 needs-revision，但仍写出候选文件供查看。
- **warning**：缺授课备注、要点超过 6 条、原图占位待替换、来源过长等。

文字宽度按微软雅黑的字宽估算（中文按 1 个字宽，西文按比例），行高按 1.32 倍；估算略保守。最终仍需渲染逐页查看。

## 生成后的处理

`finalize.mjs` 对每页：复制模板装饰与背景（如有）→ 重新编号形状 ID（避免 PptxGenJS 表格 ID 重复）→ 为 `reveal_组_序号` 命名的形状写入原生“单击时淡入 0.4 秒”动画。动画结构与 `add_animations.py` 一致，并由 Python 测试交叉校验。
