param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^v\d+\.\d+\.\d+$')]
  [string]$Version,

  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Python = Join-Path $Root ".venv-release\Scripts\python.exe"
$BuildTemp = Join-Path $Root ".build-tmp"
$DistDir = Join-Path $Root "package\release-dist"
$BuildDir = Join-Path $Root "package\release-build"
$SpecDir = Join-Path $Root "package\release-spec"
$ReleaseDir = Join-Path $Root "release\$Version"
$ExeSource = Join-Path $DistDir "EXIF-Banner.exe"
$ExeName = "EXIF-Banner-$Version-windows-amd64.exe"
$ExeTarget = Join-Path $ReleaseDir $ExeName
$ReleaseNotes = Join-Path $ReleaseDir "GITHUB_RELEASE.md"

if (-not (Test-Path -LiteralPath $Python)) {
  throw "Missing release Python environment: $Python. Create it with the commands in docs\RELEASE.md."
}

foreach ($Directory in @($BuildTemp, $DistDir, $BuildDir, $SpecDir, $ReleaseDir)) {
  New-Item -ItemType Directory -Force $Directory | Out-Null
}
$env:TEMP = (Resolve-Path $BuildTemp).Path
$env:TMP = $env:TEMP
$env:PYTHONNOUSERSITE = "1"

if (-not $SkipPreflight) {
  $VerifyDir = Join-Path $Root ".verify_output\release-$Version-preflight"
  & $Python (Join-Path $Root "tools\verify_release.py") --output-dir $VerifyDir
  if ($LASTEXITCODE -ne 0) {
    throw "Release preflight failed."
  }
}

$PyInstallerArgs = @(
  "-m", "PyInstaller",
  "--noconfirm",
  "--onefile",
  "--windowed",
  "--name", "EXIF-Banner",
  "--icon", (Join-Path $Root "webapp\static\exif-banner.ico"),
  "--paths", (Join-Path $Root "webapp"),
  "--add-data", "$Root\webapp\static;static",
  "--add-data", "$Root\webapp\logos;logos",
  "--collect-data", "pptx",
  "--exclude-module", "lxml.html",
  "--exclude-module", "lxml.isoschematron",
  "--exclude-module", "lxml.objectify",
  "--exclude-module", "PIL.ImageShow",
  "--exclude-module", "PIL.ImageQt",
  "--exclude-module", "PIL.ImageTk",
  "--exclude-module", "PIL.MicImagePlugin",
  "--exclude-module", "PIL.FliImagePlugin",
  "--exclude-module", "PIL.FpxImagePlugin",
  "--exclude-module", "PIL.ImImagePlugin",
  "--exclude-module", "PIL.MspImagePlugin",
  "--exclude-module", "PIL.PcdImagePlugin",
  "--exclude-module", "PIL.PixarImagePlugin",
  "--exclude-module", "PIL.PsdImagePlugin",
  "--exclude-module", "PIL.SunImagePlugin",
  "--exclude-module", "PIL.XVThumbImagePlugin",
  "--distpath", $DistDir,
  "--workpath", $BuildDir,
  "--specpath", $SpecDir,
  (Join-Path $Root "webapp\desktop.py")
)

& $Python @PyInstallerArgs
if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller build failed."
}
if (-not (Test-Path -LiteralPath $ExeSource)) {
  throw "Expected build output not found: $ExeSource"
}

Copy-Item -LiteralPath $ExeSource -Destination $ExeTarget -Force
$Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ExeTarget).Hash
$Size = (Get-Item -LiteralPath $ExeTarget).Length

if (-not (Test-Path -LiteralPath $ReleaseNotes)) {
  @"
# EXIF-Banner $Version

## 中文

这是 EXIF-Banner 的 Windows 桌面版发布。

### 验证

- 发布前验证：$(-not $SkipPreflight)
- PyInstaller 单文件 exe 构建完成。

### 下载

下载 ``$ExeName`` 后双击运行即可。

文件大小：$Size bytes

SHA256:

````text
$Hash
````

## English

This is a Windows desktop release of EXIF-Banner.

### Verification

- Release preflight: $(-not $SkipPreflight)
- PyInstaller single-file exe build completed.

### Download

Download ``$ExeName`` and double-click it to run.

File size: $Size bytes

SHA256:

````text
$Hash
````
"@ | Set-Content -LiteralPath $ReleaseNotes -Encoding UTF8
}

[pscustomobject]@{
  Version = $Version
  Exe = $ExeTarget
  Size = $Size
  SHA256 = $Hash
  ReleaseNotes = $ReleaseNotes
} | Format-List
