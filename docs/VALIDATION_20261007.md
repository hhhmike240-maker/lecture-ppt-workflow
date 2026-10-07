# 验证记录 · v0.2.0（2026-10-07）

环境：Windows 11、Microsoft 365 PowerPoint（桌面版，COM 自动化）、Node.js 24.14、Python 3.13（Anaconda，lxml 5.3）、npm 依赖按 package-lock 全新安装（pptxgenjs 4.0.1、image-size 2.0.4、jszip 3.10.2）。

## 已验证

| 项目 | 方法 | 结果 |
|---|---|---|
| 自动化测试 | `npm test`；`python -m unittest discover -s tests` | Node 32 项、Python 19 项全部通过 |
| 示例课件生成 | `demo/run_demo.py`：默认风格与示例模板各 15 页 | 无版面错误；9 项知识点上屏检查全部通过 |
| PowerPoint 打开与导出 | `render_windows.ps1` 逐页导出 PNG | 两份课件 15 页全部导出，见 `demo/preview*/` |
| 点击动画 | PowerPoint COM 读取 `TimeLine.MainSequence` | 情境页 1 个、提问页 2 个效果，均为单击触发的淡入（EffectType 10），0.4 秒 |
| 动画结构交叉校验 | JS 写入的动画用 `add_animations.py` 的校验函数检查 | 通过（`tests/test_js_reveal.py`） |
| 包结构 | 测试检查形状 ID 唯一、关系目标存在、图片类型已注册 | 通过（`tests/test_package.mjs`） |
| 网页 | 本地静态服务器打开 `app/`，加载示例、上传参考课件、在页面内生成 PPTX | 无控制台错误；生成 15 页、15 份备注、2 页含动画 |
| 模板复用 | 原创示例模板；一份真实高校课件模板（仅本机测试，未提交仓库） | 标志、横线、色块、背景复用正确；标题移到模板横线上方；页码避开角落装饰 |
| WPS Office | WPS（Windows，KWPP 12.0）COM 打开两份示例课件，导出代表页、读取动画序列 | 15 页均可打开；导出页面与 PowerPoint 一致（含模板装饰）；3 个点击动画均识别为单击淡入 0.4 秒 |
| 安装器 | `install.py --skills-dir <临时目录> --with-deps` 后从安装副本生成示例 | 成功；重复安装被拒绝 |

## 未验证

- WPS 中实际放映时的点击效果（动画结构已被 WPS 识别）；macOS 版 PowerPoint、Keynote、在线版 PowerPoint。
- 非 Windows 系统上的 `render.mjs`（LibreOffice + Poppler）渲染新版课件。
- GitHub Pages 线上部署（需仓库开启 Pages 后检查）。
- 在 Codex / Claude Code 新会话中实际触发 Skill 并完成一章课件。
- 各家 AI 聊天工具按提示词输出的大纲质量；英文课程效果。
- 母版占位符较多、背景为大图或含 SmartArt 的复杂模板。

## 发现并修复的问题

- PptxGenJS 生成的表格可能与其他形状使用相同的形状 ID，部分软件打开时可能提示修复。现在每页重新编号。
- 中文输出在英文系统控制台（cp1252）上会导致命令行脚本报编码错误（CI 的 Windows 任务发现）。现在统一以 UTF-8 输出。
- 本机旧的 `node_modules` 中 image-size 为 1.2.1（锁文件为 2.0.4），导致 3 项图片解析测试超时；按锁文件重新安装后通过。
- 模板主色可能取到浅色，导致标题和表头对比度不足。现在主色限制为深色，必要时自动加深。
