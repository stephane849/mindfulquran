package com.mindfulquran.app;

import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  // Volume keys page the reader instead of changing volume (the app has no audio).
  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      if (event.getRepeatCount() > 0) return true;
      final String dir = keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ? "down" : "up";
      runOnUiThread(() ->
          getBridge().getWebView().evaluateJavascript(
              "window.__volumePage && window.__volumePage('" + dir + "')", null));
      return true;
    }
    return super.onKeyDown(keyCode, event);
  }

  // Hardware back navigates within the app — closing an open sheet or
  // returning to the previous screen — and only minimizes at the root.
  // pushState entries (Next.js routes, sheet history) count toward
  // canGoBack, so goBack() fires popstate and the web app handles it.
  @Override
  public void onBackPressed() {
    if (getBridge().getWebView().canGoBack()) {
      getBridge().getWebView().goBack();
    } else {
      super.onBackPressed();
    }
  }
}
