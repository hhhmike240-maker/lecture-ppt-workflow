# 图片依赖修复与验证（2026-10-04）

本次将公开候选版本更新为 `0.1.1-alpha`，保留 PptxGenJS `4.0.1`，把 `image-size` 直接锁定为 `2.0.4`，并通过 npm override 让 PptxGenJS 使用同一版本。新安装的依赖树不再包含 `image-size 1.2.1`。

## 原问题与依据

修复前 `npm audit --json --ignore-scripts` 返回 2 个 high 级别的受影响包条目：`image-size` 以及依赖它的 `pptxgenjs`。具体是以下两个图片解析死循环公告；这并不表示检测出两次实际攻击。

- [GHSA-5p2g-fcmc-qvqq：JXL / HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)，当前公告列出受影响版本 `>=1.2.0 <=2.0.2`，修复版本 `2.0.3`。
- [GHSA-w3rx-r6r6-pgpr：ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)，当前公告列出受影响版本 `>=0.6.3 <=2.0.2`，修复版本 `2.0.3`。

2026-10-04 直接查询 npm registry 的 `versions`、`dist-tags` 和 `time`：1.x 的最后版本仍为 `1.2.1`，不存在 `1.2.2`；`2.0.4` 是已发布的 latest（2026-09-14 发布）。版本与完整性信息来自 [npm 官方包记录](https://registry.npmjs.org/image-size/2.0.4)。因此没有采用不存在的 1.x 补丁，也没有采纳 `npm audit fix` 建议的 PptxGenJS 降级路径。

`image-size 2.x` 使用具名导出 `imageSize(buffer)`；本次显式使用 Buffer API，不沿用 1.x 的同步文件路径 API。npm 包 README 和所安装的发布文件已核对。上游 Codeberg release 页面在本次网络环境未能读取，版本发布事实以 npm registry 为依据。

## 同时修复的真实生成问题

实际检查 PptxGenJS `4.0.1` 实例发现 `imageSizingContain` 为 `undefined`。原生成器在插入图片时调用该方法，旧的纯规格测试没有覆盖这条路径。

生成器现在从已经验证的本地 PNG / JPEG 字节读取宽高，在创建输出目录前检查有效尺寸，按目标矩形计算等比缩放与居中坐标。图片字节和授课备注保持原样。SVG 仍不在公开生成器的允许类型中；本次没有增加 SVG 支持。

## 执行与结果

在新建的隔离目录复制公开 Skill 源代码与锁文件后运行验证。安装前检查 `node_modules` 不存在；没有清理或覆盖现有依赖目录。使用 Node `24.14.0`、npm `11.9.0` 及本机 bundled Python，未将任何运行时复制进发布包。

```text
npm ci --ignore-scripts --no-fund
npm ls image-size pptxgenjs
npm test
npm audit --json --ignore-scripts
python -m unittest discover -s tests -p "test_*.py" -v
```

| 检查 | 实际结果 |
|---|---|
| 新目录按锁文件安装 | 安装 18 个 npm 包，退出 0 |
| 依赖树 | PptxGenJS 4.0.1；image-size 2.0.4（直接依赖与传递依赖去重） |
| npm audit | 0 项已知漏洞；退出 0 |
| Node 测试 | 17 项全部通过 |
| Python 测试 | 18 项全部通过 |
| 真实图片生成 | 自编 4×2 PNG 生成一页 PPTX；在正方形框和宽框中分别验证等比缩放、垂直/水平居中 |
| 内容与结构 | ZIP 中的图片字节与输入一致，备注存在；`office_audit.audit` 无错误、警告和外部关系；`style_check.inspect` 无错误或警告 |
| 输入拒绝 | SVG 和伪装为 PNG 的 ICNS 在分配输出目录前拒绝 |
| 死循环回归 | ICNS、JXL、HEIF 的零长度条目测试均及时拒绝；每项通过有 2 秒截止时间的独立子进程执行 |

新增回归测试在 `lecture-ppt-workflow/tests/test_images.mjs`，并纳入默认 `npm test`。测试材料为原创建模数据，不包含教师课件、学校素材或外部图片。临时课件、隔离安装和失败诊断材料均保留，未删除文件。

## 验证边界与更新方式

以上结果验证当前锁定依赖、受支持的图片路径和本机结构检查。它不等于第二设备、所有图片格式、动态放映、跨平台渲染或复杂模板均已验证；本次新增图片课件未做 PowerPoint 可视渲染。零项 audit 只反映检查当时 npm 已知公告。

旧安装目录的 `node_modules` 不会因仓库锁文件更新而自动改变。已有用户应将新版安装到新的目录，并按新版锁文件安装依赖；继续使用旧目录不属于本次修复验收范围。静态版式与教学内容仍应逐页检查。
