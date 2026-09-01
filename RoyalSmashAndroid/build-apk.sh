#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")" && pwd)"
gradle_version="8.9"
tools_root="$project_root/.build-tools"
gradle_root="$tools_root/gradle-$gradle_version"

if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/Android/Sdk" ]]; then
  export ANDROID_HOME="$HOME/Android/Sdk"
fi
if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
  echo "未找到 Android SDK。请先安装并打开一次 Android Studio。" >&2
  exit 1
fi

if [[ ! -x "$gradle_root/bin/gradle" ]]; then
  mkdir -p "$tools_root"
  archive="$tools_root/gradle-$gradle_version-bin.zip"
  curl -L "https://services.gradle.org/distributions/gradle-$gradle_version-bin.zip" -o "$archive"
  unzip -q -o "$archive" -d "$tools_root"
  rm "$archive"
fi

cd "$project_root"
"$gradle_root/bin/gradle" :app:assembleDebug
echo "APK 已生成：app/build/outputs/apk/debug/app-debug.apk"
