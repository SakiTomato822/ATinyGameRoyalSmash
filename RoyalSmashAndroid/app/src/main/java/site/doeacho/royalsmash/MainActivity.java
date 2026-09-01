package site.doeacho.royalsmash;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
    private static final String GAME_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String GAME_HOST = "appassets.androidplatform.net";
    private WebView webView;
    private WebViewAssetLoader assetLoader;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor((getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES ? Color.rgb(11, 22, 34) : Color.rgb(239, 248, 255));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            root.setPadding(
                    insets.getSystemWindowInsetLeft(),
                    insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),
                    insets.getSystemWindowInsetBottom()
            );
            return insets;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        webView.addJavascriptInterface(new HapticBridge(this), "AndroidHaptics");
        webView.setWebChromeClient(new WebChromeClient());
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && GAME_HOST.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && failingUrl.startsWith("https://" + GAME_HOST + "/")) {
                    Toast.makeText(MainActivity.this, R.string.offline_error, Toast.LENGTH_LONG).show();
                }
            }
        });

        setContentView(root);
        root.requestApplyInsets();
        if (savedInstanceState == null) {
            webView.loadUrl(GAME_URL);
        } else {
            webView.restoreState(savedInstanceState);
            String restoredUrl = webView.getUrl();
            if (restoredUrl == null || !restoredUrl.startsWith("https://" + GAME_HOST + "/")) {
                webView.loadUrl(GAME_URL);
            }
        }
    }

    private void configureSystemBars() {
        boolean darkMode = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        getWindow().setStatusBarColor(darkMode ? Color.rgb(11, 22, 34) : Color.rgb(239, 248, 255));
        getWindow().setNavigationBarColor(darkMode ? Color.rgb(11, 22, 34) : Color.rgb(239, 248, 255));
        int flags = 0;
        if (!darkMode && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (!darkMode && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidHaptics");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    public static final class HapticBridge {
        private final Activity activity;

        HapticBridge(Activity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void pulse(String eventName, int strength) {
            int safeStrength = Math.max(1, Math.min(100, strength));
            activity.runOnUiThread(() -> vibrate(eventName == null ? "impact" : eventName, safeStrength));
        }

        private void vibrate(String eventName, int strength) {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager manager = (VibratorManager) activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (manager == null) return;
                vibrator = manager.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator == null || !vibrator.hasVibrator()) return;

            int amplitude = Math.max(35, Math.min(255, 35 + strength * 2));
            VibrationEffect effect;
            switch (eventName) {
                case "launch":
                    effect = VibrationEffect.createOneShot(26, Math.max(150, amplitude));
                    break;
                case "fall":
                    effect = VibrationEffect.createOneShot(13, Math.max(90, amplitude));
                    break;
                case "clear":
                    effect = VibrationEffect.createWaveform(
                            new long[]{0, 28, 40, 45, 32, 72},
                            new int[]{0, 150, 0, 190, 0, 255},
                            -1
                    );
                    break;
                case "fail":
                    effect = VibrationEffect.createWaveform(
                            new long[]{0, 65, 45, 90},
                            new int[]{0, 135, 0, 175},
                            -1
                    );
                    break;
                case "impact":
                default:
                    effect = VibrationEffect.createOneShot(10 + strength / 4L, amplitude);
                    break;
            }
            vibrator.vibrate(effect);
        }
    }
}
