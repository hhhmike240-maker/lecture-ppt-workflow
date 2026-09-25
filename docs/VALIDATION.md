# 本轮验证记录

## 最终上传包复核（2026-09-24）

- 使用独立安装目录 `final-install/skills/lecture-ppt-workflow`，执行安装器与 `npm ci --ignore-scripts --no-audit --no-fund`；19个npm包安装成功。未修改正式导师Skill。
- 使用专用Python虚拟环境（Python 3.12.14、lxml 6.0.2），沿用本机Node和PowerPoint；不是全新系统或第二设备测试。
- 官方 `quick_validate.py` 在启用Python UTF-8模式后通过；本项目结构检查通过，10处引用有效。Windows默认GBK下官方检查器曾发生解码错误，未修改外部检查器。
- 18项Python测试、12项Node测试全部通过；新增列宽总和、列数和负列宽失败场景检查。
- 完整重跑最小示例：标准模板1页、修改前3页、修改后3页；三份均通过PPTX索引和样式检查，无结构错误与样式警告，PowerPoint COM成功导出共7页静态PNG。
- 修改后第2页有1个400ms手动点击淡入；动画结构通过。独立验证随包 `demo/after.pptx` 的4项知识覆盖，无缺项。静态图不代表实际逐次点击放映。
- 重复安装被明确拒绝，不覆盖已安装目录。测试临时文件保留，没有删除用户文件。
- 公开树文本与三份PPTX内部XML完成本机路径/私人标识扫描，未发现命中；三份PPTX的ZIP完整性检查通过，共7页且逐页有备注。演示动画记录中的本机绝对路径已改为相对标签，未改变PPTX。

下述9月23日条目是历史记录，不替代以上公开适配的复核。独立Codex新任务触发、第二设备、LibreOffice路径和动态放映仍未验证，不是本次早期试用版的已通过能力。

日期：2026-09-23。所有路径已脱敏，使用本机Codex bundled Python 3.12.14、Node 24.14.0、lxml 6.1.1，以及本机已有 PowerPoint 16.0。此处是本机验证，不是第二台电脑验证。

## 已通过

- 独立安装到 `work/public-alpha-validation/isolated skills`，同名已存在时退出2且不覆盖。
- 复制后的 Skill 结构验证通过；18项 Python 回归测试、8项 Node 规格测试通过。
- 缺运行时 doctor 返回1且有清晰提示；缺输入、重复输出目录等失败场景不打印Traceback并保留已有文件。
- 原创 standard/before/after 三份规格生成成功；after第2页增加1个400ms手动淡入。PPTX包完整性、布局、字体策略和静态渲染检查通过。
- PowerPoint 16.0打开并导出after三页；检测到第2页一个手动效果，源文件哈希不变。未实际点击播放。
- 覆盖映射4项通过；privacy/链接审查无私密路径。before与after第1、3页在忽略引擎生成creationId后内容相同，备注相同。

## 未宣称

未在全新电脑、导师设备、WPS/macOS/Linux或独立Codex新任务完成触发测试；未执行模型调用；未进行动态放映/逐次点击验证；未确认项目最终版权主体。公开生成依赖已改为锁定的PptxGenJS 4.0.1，但跨平台渲染和下游依赖许可仍需使用者自行核验。静态检查不证明教学语义、字体替换效果或所有动画兼容。

历史内部v1.1包仅作溯源参考：原包保持不改，旧清单有过期哈希且含Python缓存；本版本不复用该旧包作为公开安装包。

## 公开生成适配复核（2026-09-24）

- 使用PptxGenJS 4.0.1（MIT）和锁定的package-lock.json完成隔离npm安装；未把node_modules写入交付包。
- 使用公开版build_from_spec.mjs生成standard、before、after三份PPTX；动画补丁写入after第2页一个400ms手动淡入。
- 使用Microsoft PowerPoint 16.0的render_windows.ps1导出三份预览；PPTX均成功生成，静态预览已目视检查。未实际点击放映。
- 旧Artifact Tool不再是公开版生成依赖。LibreOffice + Poppler跨平台渲染尚未在本机安装，因此标为待测；Windows PowerPoint静态导出已完成本机检查。
- 公开版根目录LICENSE、NOTICE、CONTRIBUTING和SECURITY已加入；第三方依赖、字体、办公软件另行遵守其许可证。
