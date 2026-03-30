param(
  [string]$Version = "2.6.0"
)

$ErrorActionPreference = "Stop"

$cacheDir = Join-Path $env:LOCALAPPDATA ("electron-builder\\Cache\\winCodeSign\\winCodeSign-" + $Version)
if (Test-Path $cacheDir) {
  $existingCount = (Get-ChildItem -Force $cacheDir | Measure-Object).Count
  if ($existingCount -gt 0) {
    Write-Host ("winCodeSign cache already present: " + $cacheDir)
    exit 0
  }
}

New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

$zipUrl = "https://github.com/electron-userland/electron-builder-binaries/archive/refs/tags/winCodeSign-" + $Version + ".zip"
$tmpRoot = Join-Path $env:TEMP ("wincodesign-" + $Version + "-" + [Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tmpRoot "winCodeSign.zip"
$extractDir = Join-Path $tmpRoot "extract"

New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

Write-Host ("Downloading " + $zipUrl)
& curl.exe -L --fail --silent --show-error -o $zipPath $zipUrl

if (-not (Test-Path $zipPath)) { throw ("Download failed, missing file: " + $zipPath) }
$zipSize = (Get-Item $zipPath).Length
if ($zipSize -lt 1024) { throw ("Downloaded file too small (" + $zipSize + " bytes): " + $zipPath) }
Write-Host ("Downloaded " + $zipSize + " bytes")

Write-Host ("Extracting to " + $extractDir)
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$rootDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
if (-not $rootDir) { throw "Archive extraction produced no root directory." }

$expectedWinCodeSignDir = Join-Path $rootDir.FullName "winCodeSign"
if (-not (Test-Path $expectedWinCodeSignDir)) {
  throw ("Could not locate expected directory: " + $expectedWinCodeSignDir)
}

Write-Host ("Copying from " + $expectedWinCodeSignDir + " to " + $cacheDir)
Copy-Item -Path (Join-Path $expectedWinCodeSignDir "*") -Destination $cacheDir -Recurse -Force

if (-not (Test-Path (Join-Path $cacheDir "rcedit-x64.exe"))) {
  throw ("Cache prepared but rcedit-x64.exe missing in " + $cacheDir)
}

Write-Host "Done."

