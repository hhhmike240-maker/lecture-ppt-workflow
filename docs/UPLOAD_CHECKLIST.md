# 上传 GitHub 前的最后一步

本目录是完整仓库内容；本轮仅在本地准备，没有创建仓库、推送或联系第三方。

1. 创建空仓库，推荐名称 `lecture-ppt-workflow`。简介、Topics 和 Release 文案见 [GITHUB_DRAFT.md](GITHUB_DRAFT.md)。
2. 上传本目录中的文件与子目录，保留 `.github` 与 `.gitignore`。不要上传外层整个 `outputs`、历史导师包或本机 `work` 测试目录。
3. 检查根目录能直接看到 `README.md`、`LICENSE`、`install.py`、`lecture-ppt-workflow/` 和 `demo/`，而不是只有一个 ZIP。
4. 按需要创建 `v0.1.0-alpha` 的 pre-release，将本轮提供的 ZIP 作为附件；明确是早期试用版。
5. 保留验证记录中的限制，不将隔离目录测试改写为全新电脑、模型自动触发或动态放映测试。

包内不附教师讲义、学校标识、聊天截图、字体、Office、Node/Python运行时及 `node_modules`。依赖由使用者按 README 安装。原创文件采用根目录 MIT 许可；上传后不要把未经授权的新素材加入该许可范围。

`MANIFEST.json` 给出每个公开文件的 SHA-256。修改任何文件后需重新运行 `python make_manifest.py` 再打包；ZIP 自身校验值随交付结果单独提供，避免自引用。
