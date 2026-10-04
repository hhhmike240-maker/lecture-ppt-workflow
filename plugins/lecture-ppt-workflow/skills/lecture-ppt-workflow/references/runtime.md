# 运行与许可边界

Python 3.10+标准库支持索引、样式/覆盖和包检查。动画补丁另需lxml。生成依赖Node与公开npm的PptxGenJS。静态渲染可用LibreOffice + Poppler，或Windows PowerPoint的`render_windows.ps1`。

2026-09-23本地核验：旧Artifact Tool 2.8.59标为private；公共npm查询返回404，已不再作为公开版生成依赖。公开版使用PptxGenJS 4.0.1（MIT），依赖由使用者通过`npm ci`获取；工具和依赖的权利各自独立。

运行`npm ci --ignore-scripts`安装公开依赖；不把node_modules提交到仓库。先运行doctor.py；缺依赖则停止生成，但仍可整理内容、索引、检查已有PPT。PptxGenJS生成的是新建页面规格，不负责无损重写既有复杂模板。

本公开版不捆绑Node依赖、字体、Office、其他Skill或其源码。跨平台静态渲染依赖LibreOffice/Poppler；Windows可用PowerPoint脚本。普通新电脑仍需自行准备字体和办公软件。
