package com.chowkabara.game;

import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Small bridge between the game and the device.
 *
 * A WebView only learns about display cutouts, never about the status and
 * navigation bars, so the shell reports the real insets and the page uses
 * them for its own safe spacing. The shell also holds the screen awake while
 * a game is in progress.
 */
@CapacitorPlugin(name = "NativeShell")
public class NativeShellPlugin extends Plugin {

    private Insets insets = Insets.NONE;

    @Override
    public void load() {
        // Listen on the decor view: it still carries the window insets, while
        // the content view may have had them consumed on the way down.
        View root = getActivity().getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets cutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
            // The status and navigation bars are the space the content must
            // clear. A display cutout sits inside the status bar, so it only
            // matters along the sides, where it reaches into the content.
            insets = Insets.of(
                Math.max(bars.left, cutout.left),
                bars.top,
                Math.max(bars.right, cutout.right),
                bars.bottom
            );
            android.util.Log.i(
                "NativeShell",
                "Insets bars=" + bars + " cutout=" + cutout + " using=" + insets
            );
            notifyListeners("insetsChanged", insetsPayload());
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(root);
    }

    private JSObject insetsPayload() {
        float density = getContext().getResources().getDisplayMetrics().density;
        JSObject data = new JSObject();
        data.put("top", insets.top / density);
        data.put("right", insets.right / density);
        data.put("bottom", insets.bottom / density);
        data.put("left", insets.left / density);
        return data;
    }

    @PluginMethod
    public void getInsets(PluginCall call) {
        call.resolve(insetsPayload());
    }

    @PluginMethod
    public void setKeepAwake(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity()
            .runOnUiThread(() -> {
                if (enabled) {
                    getActivity()
                        .getWindow()
                        .addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getActivity()
                        .getWindow()
                        .clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        call.resolve();
    }

    /**
     * Give the board the whole screen. A WebView cannot enter the platform
     * fullscreen by itself, so the system bars are hidden instead.
     */
    @PluginMethod
    public void setImmersive(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity()
            .runOnUiThread(() -> {
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                    getActivity().getWindow(),
                    getActivity().getWindow().getDecorView()
                );
                if (enabled) {
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                    controller.setSystemBarsBehavior(
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                } else {
                    controller.show(WindowInsetsCompat.Type.systemBars());
                }
            });
        call.resolve();
    }
}
