# ATinyGameRoyalSmash

这是“炮弹出击 3D / Royal Smash”完整源码包。

## 里面有什么

- `app/`、`components/`、`lib/` 等：网页游戏源码
- `dist/`：当前已构建出的网页产物
- `RoyalSmashAndroid/`：Android WebView 版本，包含原生震动反馈桥接
- `.github/workflows/android.yml`：GitHub Actions 自动构建 Android debug APK
- `README.sites.md`：原始 Sites/Vinext 项目说明

没有包含这些可重新生成的大目录：

- `node_modules/`
- `.sites-runtime/`
- `.git/`
- `.openai/`

## 怎么上传到 GitHub

1. 解压这个 ZIP。
2. 打开解压后的文件夹。
3. 把里面所有内容上传到仓库根目录：`SakiTomato822/ATinyGameRoyalSmash`。
4. 上传完成后，GitHub Actions 会自动运行 `Build Android APK`。
5. 构建成功后，在 Actions 的 artifact 里下载 `royal-smash-debug-apk`。

## 本地运行网页游戏

需要 Node.js 22+。

```bash
npm install
npm run dev
```

## 本地构建 Android APK

需要 Android Studio / Android SDK。

```bash
cd RoyalSmashAndroid
bash build-apk.sh
```

生成位置：

```text
RoyalSmashAndroid/app/build/outputs/apk/debug/app-debug.apk
```

Android 版本现在将网页游戏静态资源打包在 APK 内，安装后不依赖线上游戏网站即可运行。
