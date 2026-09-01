# 炮弹出击 3D · Android

这是游戏的 Android WebView 版本，直接连接已发布的 `royal-smash.doeacho.chatgpt.site`。游戏逻辑保持与网页同步，同时通过原生桥接提供分级震动反馈。

## 已实现

- 发射：短而有力的震动
- 罐子碰撞：按碰撞力度变化
- 连锁掉落：轻触感，连续掉落逐步增强
- 过关：三段上扬震动
- 失败：两段低沉震动
- 自动适配系统深色模式
- 仅允许游戏域名留在 App 内，其他链接交给系统浏览器

## 构建

1. 用 Android Studio 打开本目录。
2. 等待 Gradle 同步完成。
3. 选择 `Build > Build APK(s)`。
4. 调试 APK 位于 `app/build/outputs/apk/debug/app-debug.apk`。

Windows 也可以先安装并打开一次 Android Studio，然后右键使用 PowerShell 运行 `build-apk.ps1`；脚本会自动准备 Gradle 并输出调试 APK。macOS/Linux 可运行 `bash build-apk.sh`。

最低系统为 Android 8.0（API 26），目标 API 35。首次同步需要 Android Studio 下载 Gradle 与 Android 构建工具；App 运行时需要联网。
