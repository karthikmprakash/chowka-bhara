package com.chowkabara.game;

import android.view.View;
import android.webkit.WebChromeClient;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Lets the game's focused play view take over the screen.
 *
 * The page asks for fullscreen through the standard web API. On the web that
 * hides the browser chrome; here the same request hides the system bars, so
 * the board gets the whole display.
 */
public class ImmersiveWebChromeClient extends BridgeWebChromeClient {

    private final Bridge bridge;

    public ImmersiveWebChromeClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public void onShowCustomView(View view, CustomViewCallback callback) {
        super.onShowCustomView(view, callback);
        setSystemBarsVisible(false);
    }

    @Override
    public void onHideCustomView() {
        super.onHideCustomView();
        setSystemBarsVisible(true);
    }

    private void setSystemBarsVisible(boolean visible) {
        if (bridge == null || bridge.getActivity() == null) return;
        bridge
            .getActivity()
            .runOnUiThread(() -> {
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                    bridge.getActivity().getWindow(),
                    bridge.getActivity().getWindow().getDecorView()
                );
                if (visible) {
                    controller.show(WindowInsetsCompat.Type.systemBars());
                } else {
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                    controller.setSystemBarsBehavior(
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                }
            });
    }
}
