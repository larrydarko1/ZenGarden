package com.zengarden.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.regex.Pattern;

/**
 * Bridge from the WebView to MeditationTimerService.
 * JS side: src/renderer/utils/meditationTimer.ts.
 */
@CapacitorPlugin(
    name = "MeditationTimer",
    permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class MeditationTimerPlugin extends Plugin {

    // Only the bundled bell files, so a call can't point the player elsewhere in the assets.
    private static final Pattern BELL_ASSET = Pattern.compile("bell\\d+\\.mp3");

    @PluginMethod
    public void start(PluginCall call) {
        // Android 13+ hides the session notification without this permission. The session
        // itself runs either way, so a refusal is not an error.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "startAfterPermission");
            return;
        }
        startSession(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MeditationTimerService.class));
        call.resolve();
    }

    /** Takes down the "how was your meditation?" reminder once the notes are written or skipped. */
    @PluginMethod
    public void dismissEndReminder(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(MeditationTimerService.END_REMINDER_ID);
        call.resolve();
    }

    @PermissionCallback
    private void startAfterPermission(PluginCall call) {
        startSession(call);
    }

    private void startSession(PluginCall call) {
        Long endsAt = call.getLong("endsAt");
        if (endsAt == null) {
            call.reject("endsAt must be the session's end, in ms since the epoch");
            return;
        }
        Integer durationSec = call.getInt("durationSec");
        if (durationSec == null || durationSec <= 0) {
            call.reject("durationSec must be a positive number of seconds");
            return;
        }
        int bellIntervalSec = call.getInt("bellIntervalSec", 0);
        String bellAsset = call.getString("bellAsset");
        if (bellAsset != null && !BELL_ASSET.matcher(bellAsset).matches()) {
            call.reject("bellAsset must be one of the bundled bell files");
            return;
        }

        Intent intent = new Intent(getContext(), MeditationTimerService.class)
            .putExtra(MeditationTimerService.EXTRA_ENDS_AT, (long) endsAt)
            .putExtra(MeditationTimerService.EXTRA_DURATION_MS, durationSec * 1000L)
            .putExtra(MeditationTimerService.EXTRA_BELL_INTERVAL_MS, bellIntervalSec * 1000L)
            .putExtra(MeditationTimerService.EXTRA_BELL_ASSET, bellAsset);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }
}
