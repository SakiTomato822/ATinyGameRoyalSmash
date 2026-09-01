# 炮弹出击 3D · Royal Smash

[![Build Android APK](https://github.com/SakiTomato822/ATinyGameRoyalSmash/actions/workflows/android.yml/badge.svg)](https://github.com/SakiTomato822/ATinyGameRoyalSmash/actions/workflows/android.yml)
[![Latest release](https://img.shields.io/github/v/release/SakiTomato822/ATinyGameRoyalSmash?label=APK)](https://github.com/SakiTomato822/ATinyGameRoyalSmash/releases/latest)

拖动瞄准、松开发射，用真实的 3D 碰撞和重力把罐子轰下平台。网页源码与 Android 离线版都在这个仓库中。

## 下载与玩法

从 [Releases](https://github.com/SakiTomato822/ATinyGameRoyalSmash/releases/latest) 下载最新版 APK。Android 8.0 及以上可安装，游戏运行时不需要网络。

1. 在游戏区拖动炮口瞄准。
2. 松开发射，击落全部目标即可过关。
3. 优先攻击底层两侧，连锁掉落会获得更高分数。

## 功能

- Three.js + Cannon ES 刚体物理、碰撞、翻滚与连锁计分
- 每关随机生成并保存种子，重开本关时布局保持一致
- 自动保存关卡、分数、炮弹、瞄准位置和所有目标状态
- 飞行中关闭游戏会安全回到本次发射前，不会损坏存档
- 每关 3 次“撤回上一发”，完整恢复发射前的物理场景
- 炮弹停滞时出现“立即继续”，并设有 4.2 秒自动保护
- 紧凑的纯游戏界面，适配异形屏、安全区和不同手机比例
- 网页画面、界面和 3D 场景自动适配系统深色模式
- Android 原生分级震动反馈；静态网页资源完整打包在 APK 内

## 项目结构

```text
app/                         网页游戏页面与样式
RoyalSmashAndroid/           Android 离线 WebView 工程
scripts/export-android-assets.mjs
                             将网页生产构建同步到 Android assets
.github/workflows/android.yml
                             GitHub Actions 自动构建 APK
```

## 本地运行网页

需要 Node.js 22.13 或更高版本。Windows 推荐使用 WSL；项目的构建辅助脚本面向 Bash 环境。

```bash
npm ci
npm run dev
```

生产构建并更新 Android 离线资源：

```bash
npm run build
npm run export:android
```

## 构建 Android APK

需要 JDK 17 和 Android SDK 35。脚本会自动准备 Gradle 8.9。

Windows PowerShell：

```powershell
cd RoyalSmashAndroid
.\build-apk.ps1
```

macOS / Linux：

```bash
cd RoyalSmashAndroid
bash build-apk.sh
```

APK 输出位置：

```text
RoyalSmashAndroid/app/build/outputs/apk/debug/app-debug.apk
```

每次推送到 `main` 或创建版本标签时，GitHub Actions 也会自动构建 `royal-smash-offline-debug-apk`。

## 技术栈

React 19、Vinext、Three.js、Cannon ES、Android WebView、AndroidX WebKit。
