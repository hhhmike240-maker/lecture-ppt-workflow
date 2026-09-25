# 本地页面规格生成器

适用于从已经审定的内容创建新页；不是全自动读Word排版器，也不用于无损改写原PPT。模型仍负责通读资料、选择版式、知识覆盖和视觉审校。有限修订应优先用保守补丁，不能把本工具当作教师课件的通用转换器。

## 运行

先遵守[运行与许可边界](runtime.md)。在生成前于本Skill目录安装锁定的公开npm依赖：

```text
npm ci --ignore-scripts
```

不要把当前电脑路径写进Skill。然后使用随包的公开适配器：

```text
node scripts/build_from_spec.mjs examples/minimal.json work/build-new
python scripts/add_animations.py work/build-new/candidate.pptx work/animated.pptx --slides 1 --audit work/animation.json
node scripts/render.mjs work/animated.pptx work/render-new
```

生成器只写一个全新目录：candidate.pptx、build-receipt.json，以及适配器可能生成的inspect文件。已存在目录即拒绝，失败时保留诊断产物，不自动删除。文件都保留为候选，之后必须完成内容、动画、最终包结构和逐页视觉检查。PowerPoint Windows静态导出使用`render_windows.ps1`；LibreOffice + Poppler用于跨平台静态导出。实际放映仍需单独测试。

## 规格

JSON顶层version为1，font为明确字体名称，slideSize为width/height像素，slides为页面列表。96像素=1英寸；16磅对应约21.333像素。字体来自当前标准，而非直接照抄例子。

每页需要独立id、非空中文授课notes和elements。背景颜色background可选。元素必须有唯一name；除connector外都有position：left、top、width、height。坐标不能越过画布。

- shape：geometry可为textbox、rect、roundRect、ellipse、line；text存在时fontSize必填。可设bold、color、fill、lineColor、lineWidth。原生文字与图形可编辑。正高度细矩形可用作横线。
- image：path为本地PNG/JPEG路径，相对规格文件解析；禁止远程URL。按完整比例contain嵌入，不拉伸、不默认裁图。需配alt。嵌入图像本身不可编辑文字，不能说成原生图。图片name仅用于规格识别，当前不保证导出的对象名与其一致。
- table：values为非空、等列数的字符串/数字矩阵，fontSize必填；columnWidths可选，为像素列宽。导出原生表格。当前固定简洁蓝色表头，复杂模板表格需用实际API另行制作，不能强行套此格式。
- connector：from/to引用同页shape的name，必须明确fromSide/toSide为left/right/top/bottom；arrow可选。线表示的关系须有教学依据，不用形似因果的箭头冒充理论关系。

需要点击出现的**shape**使用reveal_1_1、reveal_1_2、reveal_2_1等对象名称，再单独调用动画工具。生成器本身不设置动画，不保证image/table/connector名称用于动画；这些对象要分组动画时，需依据导出对象实际ID处理并重新核验。不得把逐步揭示关键内容设为永久hidden。

## 使用边界

已有背景图片可作为每页最前面的image，后放可编辑内容；这能保留视觉，但背景校徽、装饰、横线仍是栅格，不等于保留可编辑母版。若用户要求母版编辑性，使用真实模板导入和对象复用，不降格交付。本工具不自动识别安全内容区域或估计文字溢出；必须对照标准设坐标、渲染检查。

不支持任意JS执行、网络取图、自动知识补写、公式、图表、音视频、导出后保留所有外部扩展。复杂页面可用当前演示文稿引擎直接制作并复用同一套校验脚本；不要声称所有PPT功能都由这个小生成器覆盖。
