# 工具使用

公开候选的依赖获取与许可限制见[运行边界](runtime.md)。没有生成环境时仍可解析和检查，不能承诺完成生成。

先探测Python与演示文稿运行时。在Codex有工作区依赖查询工具时使用其返回路径。以下python/node是已解析可用运行时的占位，不假定系统PATH存在。脚本路径相对本Skill目录，参数内路径按当前任务定位。

来源索引和检查只需Python 3.10+标准库；动画工具另需lxml。生成/渲染需要当前可用演示文稿引擎；随包没有模型推理、离线生成器或图像识别引擎。安装依赖前说明所需内容，优先使用已有运行时。不要对托管运行时做全局安装。

```text
python scripts/office_audit.py index lecture.docx --out work/lecture.json --images-dir work/word-images
python scripts/office_audit.py index standard.pptx --out work/standard.json
python scripts/doctor.py --out work/environment.json
python scripts/style_check.py standard.pptx --out work/style.json
python scripts/background_patch.py draft.pptx gray.pptx --reference standard.pptx --reference-slide 2 --slides 2-15 --report work/background.json
python scripts/add_animations.py draft.pptx animated.pptx --slides 2,4-6 --audit work/animations.json
python scripts/office_audit.py compare original.pptx revised.pptx --background-only --out work/diff.json
python scripts/check_coverage.py mapping.json candidate.pptx --out work/coverage.json
node scripts/render.mjs candidate.pptx work/render-new
node scripts/render.mjs candidate.pptx work/render-one-new --slide 1
node scripts/build_from_spec.mjs specification.json work/build-new
node --test tests/test_builder.mjs
python -m unittest discover -s tests -v
```

所有输出采用新路径，存在则拒绝覆盖。页码均为实际放映顺序，从1开始；示例页码不是默认选页，混合选页中的反向范围也会拒绝。比较工具未加--background-only时仅报告差异，不判断差异是否合规。生成器规格见[页面生成](authoring.md)，随包提供不含教师素材的最小例子。新建候选不是已验收课件。

背景工具只支持直接、非主题引用的纯色背景，可保留RGB变换参数；继承背景、图片背景和主题色需人工判断适合的处理方式。工具在XML外层保持原字节，去除背景后做结构差异检查。不能用它替换校徽或修模型图底色。

动画仅针对明确选择的新制页面，命名reveal_1_1、reveal_1_2、reveal_2_1等；同组同时淡入，组间点击推进，400毫秒。已有timing、非法组名、永久隐藏等报错，不能静默覆盖导师动画。不得用Python -O关闭验证断言。未选页面保持原字节。

生成器使用Skill目录中的PptxGenJS；render.mjs通过LibreOffice + Poppler输出静态PNG，Windows可用render_windows.ps1。实际PowerPoint/WPS播放是另项检查。

内容映射JSON格式：

```json
{"knowledge":[{"id":"K01","source":"讲义第1节第3段","required":true,"slides":[3],"on_screen":["必要的定义原词"]}],"figures":[{"source":"word/media/image1.png","slides":[4],"treatment":"保留原图并注明历史口径"}]}
```

样式检查单独追踪slide/layout/master背景、主题输入、占位符几何和组内缩放/旋转/翻转。可传--policy JSON，格式为{"size_emu":[9144000,5143500],"roles":{"subtitle":{"top_min":619125,"font_sizes_pt":[16]}}}。角色名匹配实际对象name，必须先确认对象命名，不把示例名猜成老师的对象名。几何越界是风险提示；角色规则失败才记errors。完全继承的字号不强行判为通过。母版装饰、字形轮廓、阴影和主题色最终合成都需渲染复查。

索引含正文/表格段落、原图所在段落、高亮、评论和幻灯片备注。必须看图后才能理解模型。脚本未完全解析继承字号、VML对象、批注锚点和修订接受状态，遇这些内容单独检查。通过工具不等于语义、视觉或播放验收通过。

退出码：0表示本命令范围内通过，1表示检查发现问题或依赖能力不齐，2表示输入/执行错误（argparse参数错误也是2）。检查结果保留局限；失败后不自动删除草稿。只读索引无法解析严重损坏的关系时会报错而不是伪造空白索引。
