package com.mindfulquran.app;

import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  // Volume keys page the reader instead of changing volume (the app has no audio).
  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      final String dir = keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ? "down" : "up";
      runOnUiThread(() ->
          getBridge().getWebView().evaluateJavascript(
              "window.__volumePage && window.__volumePage('" + dir + "')", null));
      return true;
    }
    return super.onKeyDown(keyCode, event);
  }
}
