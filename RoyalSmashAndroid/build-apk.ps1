$ErrorActionPreference = "Stop"

$GradleVersion = "8.9"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ToolsRoot = Join-Path $ProjectRoot ".build-tools"
$GradleRoot = Join-Path $ToolsRoot "gradle-$GradleVersion"
$GradleExe = Join-Path $GradleRoot "bin\gradle.bat"

if (-not $env:ANDROID_HOME) {
    $DefaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $DefaultSdk) { $env:ANDROID_HOME = $DefaultSdk }
}

if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
    throw "未找到 Android SDK。请先安装并打开一次 Android Studio。"
}

if (-not (Test-Path $GradleExe)) {
    New-Item -ItemType Directory -Force -Path $ToolsRoot | Out-Null
    $Archive = Join-Path $ToolsRoot "gradle-$GradleVersion-bin.zip"
    Invoke-WebRequest "https://services.gradle.org/distributions/gradle-$GradleVersion-bin.zip" -OutFile $Archive
    Expand-Archive $Archive -DestinationPath $ToolsRoot -Force
    Remove-Item $Archive
}

Push-Location $ProjectRoot
try {
    & $GradleExe :app:assembleDebug
    if ($LASTEXITCODE -ne 0) { throw "Gradle 构建失败。" }
    Write-Host "APK 已生成：app\build\outputs\apk\debug\app-debug.apk"
} finally {
    Pop-Location
}
