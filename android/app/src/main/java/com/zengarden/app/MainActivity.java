package com.zengarden.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts in super.onCreate.
        registerPlugin(MeditationTimerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
