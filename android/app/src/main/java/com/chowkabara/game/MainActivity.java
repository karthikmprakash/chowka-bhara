package com.chowkabara.game;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The launch screen carries the game's palette and mark, and steps
        // aside as soon as the first frame is ready.
        SplashScreen.installSplashScreen(this);
        // Go edge to edge before the bridge is created, so the shell measures
        // the real system bar insets the first time the page asks for them.
        EdgeToEdge.enable(this);
        registerPlugin(NativeShellPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge()
            .getWebView()
            .setWebChromeClient(new ImmersiveWebChromeClient(getBridge()));
    }
}
