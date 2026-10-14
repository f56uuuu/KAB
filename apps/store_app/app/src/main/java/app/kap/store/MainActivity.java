package app.kap.store;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * KAP store device app: the /merchant screen in a WebView, plus a bridge
 * (window.KapPrinter) that prints straight to the terminal's built-in printer
 * without dialogs or extra apps.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://kab-amber.vercel.app/merchant";
    static final String HOST = "kab-amber.vercel.app";

    private WebView web;
    private Printer printer;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#0D0D0F"));

        printer = new Printer(this);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0D0D0F"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " KapStore/1");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Bridge(), "KapPrinter");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return route(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return route(Uri.parse(url));
            }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl(HOME);

        if (Build.VERSION.SDK_INT >= 31
                && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] {Manifest.permission.BLUETOOTH_CONNECT}, 1);
        }
    }

    /** KAP pages stay inside the app; anything else opens in its own app. */
    private boolean route(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        if ((scheme.equals("https") || scheme.equals("http")) && HOST.equals(u.getHost())) return false;
        try {
            Intent i = scheme.equals("intent")
                    ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, u);
            startActivity(i);
        } catch (ActivityNotFoundException | java.net.URISyntaxException e) {
            // nothing can open it
        }
        return true;
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else moveTaskToBack(true); // keep receiving orders in the background
    }

    @Override
    protected void onDestroy() {
        printer.close();
        super.onDestroy();
    }

    /** Called from the page: window.KapPrinter.print(base64EscPos) */
    class Bridge {
        @JavascriptInterface
        public String print(String base64) {
            try {
                return printer.print(Base64.decode(base64, Base64.DEFAULT));
            } catch (IllegalArgumentException e) {
                return "error:bad_data";
            }
        }

        @JavascriptInterface
        public String info() {
            return printer.info();
        }

        @JavascriptInterface
        public String version() {
            return "1";
        }
    }
}
