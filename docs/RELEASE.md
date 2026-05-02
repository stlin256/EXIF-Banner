# 发布说明

EXIF-Banner 的 Windows 版本以 x64 可执行文件发布。发布资产是一个单文件 `.exe`，不再压缩成 zip。

所有本地发布产物统一放在仓库根目录的 `release/` 文件夹中，并按版本号分目录保存。`release/` 只存放本地构建产物，不提交到 Git。

## 版本命名规则

版本号使用语义化版本：

```text
vMAJOR.MINOR.PATCH
```

- `MAJOR`：不兼容的工作流变化、项目结构变化或重大架构调整。
- `MINOR`：新增用户可见功能，例如新的导出模式、主要 UI 能力或新的核心流程。
- `PATCH`：缺陷修复、小幅 UI 优化、打包修复和文档更新。

Git tag 和 GitHub Release 标题必须使用同一个版本号：

```text
v0.1.0
```

## 发布目录规则

每个版本的本地发布目录命名规则：

```text
release/v0.1.0/
```

目录内必须包含：

```text
release/v0.1.0/
  EXIF-Banner-v0.1.0-windows-amd64.exe
  GITHUB_RELEASE.md
```

`GITHUB_RELEASE.md` 是该版本贴到 GitHub Release 页面的发布说明，必须同时包含中文和英文。它只保存在本地 `release/` 目录中，不提交到 Git。

## 文件命名规则

Windows x64 发布资产命名：

```text
EXIF-Banner-v0.1.0-windows-amd64.exe
```

Windows ARM64 发布资产命名：

```text
EXIF-Banner-v0.1.0-windows-arm64.exe
```

当前主发布目标是 `windows-amd64`。PyInstaller 通常不做跨架构编译；`windows-arm64` 应在 Windows ARM64 设备或对应的 ARM64 Python 环境中构建和验证。

第一个公开版本使用：

```text
v0.1.0
```

## 发布包形态

推荐使用 PyInstaller `onefile` 方式生成单个 exe：

```text
EXIF-Banner-v0.1.0-windows-amd64.exe
```

用户下载后双击 `EXIF-Banner-v0.1.0-windows-amd64.exe`，程序会启动本地 Web 服务并打开浏览器界面。

当前验证结果：

```text
EXIF-Banner-v0.1.0-windows-amd64.exe     约 23.47 MB
```

## 构建环境

在 Windows x64 环境构建。当前验证通过的工具链：

```text
Python 3.13.5
PyInstaller 6.20.0
Pillow 12.2.0
python-pptx 1.0.2
```

创建独立构建环境：

```powershell
python -m venv .venv-release
.\.venv-release\Scripts\python.exe -m pip install -U pip setuptools wheel
.\.venv-release\Scripts\python.exe -m pip install -r requirements.txt pyinstaller
```

如果遇到临时目录权限问题，可以把临时目录指向仓库内：

```powershell
New-Item -ItemType Directory -Force .build-tmp | Out-Null
$env:TEMP = (Resolve-Path .build-tmp)
$env:TMP = $env:TEMP
```

## 编译 EXE

在仓库根目录执行：

```powershell
$root = (Resolve-Path .).Path

.\.venv-release\Scripts\pyinstaller.exe `
  --noconfirm `
  --onefile `
  --name EXIF-Banner `
  --paths "$root\webapp" `
  --add-data "$root\webapp\static;static" `
  --add-data "$root\webapp\logos;logos" `
  --collect-data pptx `
  --exclude-module lxml.html `
  --exclude-module lxml.isoschematron `
  --exclude-module lxml.objectify `
  --exclude-module PIL.ImageShow `
  --exclude-module PIL.ImageQt `
  --exclude-module PIL.ImageTk `
  --exclude-module PIL.MicImagePlugin `
  --exclude-module PIL.FliImagePlugin `
  --exclude-module PIL.FpxImagePlugin `
  --exclude-module PIL.ImImagePlugin `
  --exclude-module PIL.MspImagePlugin `
  --exclude-module PIL.PcdImagePlugin `
  --exclude-module PIL.PixarImagePlugin `
  --exclude-module PIL.PsdImagePlugin `
  --exclude-module PIL.SunImagePlugin `
  --exclude-module PIL.XVThumbImagePlugin `
  --distpath "$root\package\release-dist" `
  --workpath "$root\package\release-build" `
  --specpath "$root\package\release-spec" `
  "$root\webapp\server.py"
```

生成文件位于：

```text
package/release-dist/EXIF-Banner.exe
```

## 创建本地发布目录

设置版本号并复制 exe 到该版本发布目录：

```powershell
$version = "v0.1.0"
New-Item -ItemType Directory -Force "release\$version" | Out-Null
Copy-Item `
  -LiteralPath package\release-dist\EXIF-Banner.exe `
  -Destination "release\$version\EXIF-Banner-$version-windows-amd64.exe" `
  -Force
```

生成文件位于：

```text
release/v0.1.0/EXIF-Banner-v0.1.0-windows-amd64.exe
```

同时为该版本创建 GitHub Release 发布说明：

```text
release/v0.1.0/GITHUB_RELEASE.md
```

## 发布前验证

上传 Release 前必须验证：

1. `EXIF-Banner.exe` 可以启动本地服务。
2. 浏览器可以打开 `http://127.0.0.1:8765/`。
3. 可以选择并扫描本地相册。
4. 预览渲染正常。
5. JPEG 导出正常。
6. PPTX 导出正常，并且导出的 PPTX 可以打开。

也可以用测试端口运行：

```powershell
release\v0.1.0\EXIF-Banner-v0.1.0-windows-amd64.exe --host 127.0.0.1 --port 8876 --no-browser
```

再通过页面或本地 API 验证扫描、预览、图片导出和 PPTX 导出。

## 发布流程

1. 确认工作区干净，或者只包含本次发布需要的改动。
2. 更新 README 或发布规范文档。
3. 运行语法检查：

```powershell
python -m py_compile webapp\server.py
```

4. 编译 `EXIF-Banner.exe`。
5. 执行发布前验证。
6. 创建 `release/vX.Y.Z/EXIF-Banner-vX.Y.Z-windows-amd64.exe`。
7. 创建 `release/vX.Y.Z/GITHUB_RELEASE.md`，内容必须中英文涵盖。
8. 提交文档或脚本改动。不要提交 `release/`、`package/`、`.build-tmp/` 或虚拟环境目录。
9. 创建并推送 tag：

```powershell
git tag v0.1.0
git push origin v0.1.0
```

10. 在 GitHub 中基于该 tag 创建 Release。
11. 将 `release/vX.Y.Z/GITHUB_RELEASE.md` 的内容粘贴到 GitHub Release 说明。
12. 上传 `release/vX.Y.Z/EXIF-Banner-vX.Y.Z-windows-amd64.exe`。
