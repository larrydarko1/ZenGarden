package com.zengarden.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.ServiceCompat;

import java.io.IOException;

/**
 * Runs a meditation session outside the WebView, so the interval bells and the end alert
 * sound while the screen is locked. Android suspends the WebView's JS timers then; a
 * foreground service holding a partial wake lock keeps running, Doze included.
 *
 * The WebView keeps its own countdown for the screen, against the same end time. This
 * service makes the sounds and, once the time is up, swaps its notification for a reminder
 * to write the session notes, plays the end alert and stops itself.
 *
 * Starting it again while a session runs reschedules that session: the times are derived
 * from its wall-clock end, so only the bells still ahead are scheduled.
 */
public class MeditationTimerService extends Service {

    /** Wall-clock end of the session, in ms since the epoch. */
    static final String EXTRA_ENDS_AT = "endsAt";
    static final String EXTRA_DURATION_MS = "durationMs";
    static final String EXTRA_BELL_INTERVAL_MS = "bellIntervalMs";
    static final String EXTRA_BELL_ASSET = "bellAsset";
    static final int END_REMINDER_ID = 2;

    private static final String TAG = "MeditationTimer";
    private static final String SESSION_CHANNEL_ID = "meditation_session";
    private static final String END_CHANNEL_ID = "meditation_end";
    private static final int SESSION_NOTIFICATION_ID = 1;
    private static final String ALERT_ASSET = "alert.mp3";
    // Matches the volumes the WebView plays these sounds at.
    private static final float BELL_VOLUME = 0.5f;
    private static final float ALERT_VOLUME = 1f;
    // Lets the end alert finish before the wake lock times out on its own.
    private static final long WAKE_LOCK_MARGIN_MS = 60_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    @Nullable private PowerManager.WakeLock wakeLock;
    @Nullable private MediaPlayer player;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        long endsAt = intent == null ? 0 : intent.getLongExtra(EXTRA_ENDS_AT, 0);
        long durationMs = intent == null ? 0 : intent.getLongExtra(EXTRA_DURATION_MS, 0);
        long now = System.currentTimeMillis();
        // startForegroundService() requires this call even when the session is rejected below.
        ServiceCompat.startForeground(
            this,
            SESSION_NOTIFICATION_ID,
            buildSessionNotification(endsAt),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        );
        if (durationMs <= 0 || endsAt <= now) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        // Replaces whatever was scheduled. A bell already ringing is left to finish.
        handler.removeCallbacksAndMessages(null);
        acquireWakeLock(endsAt - now + WAKE_LOCK_MARGIN_MS);

        long bellIntervalMs = intent.getLongExtra(EXTRA_BELL_INTERVAL_MS, 0);
        String bellAsset = intent.getStringExtra(EXTRA_BELL_ASSET);
        int bells = 0;
        if (bellIntervalMs > 0 && bellAsset != null) {
            // Same rule as the WebView: a bell on every interval, except one landing on the end.
            long startedAt = endsAt - durationMs;
            for (long at = startedAt + bellIntervalMs; at < endsAt; at += bellIntervalMs) {
                if (at <= now) continue;
                handler.postDelayed(() -> play(bellAsset, BELL_VOLUME, null), at - now);
                bells++;
            }
        }
        handler.postDelayed(this::finishSession, endsAt - now);
        Log.i(TAG, "Session scheduled: ends in " + (endsAt - now) / 1000 + "s, " + bells + " bell(s) ahead");

        // Not restarted by the system if killed: the WebView restarts it from its saved session.
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        releasePlayer();
        releaseWakeLock();
        super.onDestroy();
    }

    /** Time is up. The reminder replaces the countdown at once, so it never runs past zero. */
    private void finishSession() {
        showEndReminder();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        play(ALERT_ASSET, ALERT_VOLUME, this::stopSelf);
    }

    // ── Audio ───────────────────────────────────────────────────────────────

    /**
     * How the bells are routed: decides their volume slider and whether Do Not Disturb silences them.
     * Alarm usage, because people silence their phone to meditate and the bells are the only sign
     * of time passing: alarms play through Do Not Disturb and silent mode by default. They follow
     * the alarm volume, and BELL_VOLUME / ALERT_VOLUME still scale within it.
     */
    private static AudioAttributes bellAudioAttributes() {
        return new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
    }

    /** Plays one of the web app's sounds, which ship in the APK under assets/public. */
    private void play(String asset, float volume, @Nullable Runnable onDone) {
        releasePlayer();
        MediaPlayer next = new MediaPlayer();
        player = next;
        try (AssetFileDescriptor fd = getAssets().openFd("public/" + asset)) {
            next.setAudioAttributes(bellAudioAttributes());
            next.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            next.setVolume(volume, volume);
            next.setOnCompletionListener(done -> {
                releasePlayer();
                if (onDone != null) onDone.run();
            });
            next.prepare();
            next.start();
            Log.i(TAG, "Playing " + asset);
        } catch (IOException | RuntimeException e) {
            Log.w(TAG, "Could not play " + asset, e);
            releasePlayer();
            if (onDone != null) onDone.run();
        }
    }

    private void releasePlayer() {
        if (player == null) return;
        player.release();
        player = null;
    }

    // ── Wake lock ───────────────────────────────────────────────────────────

    private void acquireWakeLock(long timeoutMs) {
        if (wakeLock == null) {
            PowerManager power = getSystemService(PowerManager.class);
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ZenGarden:meditation");
            wakeLock.setReferenceCounted(false);
        }
        // The timeout is a backstop: the lock can never outlive a session that failed to end.
        wakeLock.acquire(timeoutMs);
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }

    // ── Notifications ───────────────────────────────────────────────────────

    private PendingIntent openAppIntent() {
        Intent openApp = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification buildSessionNotification(long endsAt) {
        NotificationManagerCompat.from(this).createNotificationChannel(
            new NotificationChannelCompat.Builder(SESSION_CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_LOW)
                .setName(getString(R.string.meditation_channel_name))
                .setShowBadge(false)
                .build()
        );
        // The system counts the chronometer down itself, so the notification never needs updating.
        return new NotificationCompat.Builder(this, SESSION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_meditation)
            .setContentTitle(getString(R.string.meditation_notification_title))
            .setContentIntent(openAppIntent())
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setSilent(true)
            .setWhen(endsAt)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    /**
     * Asks for the session notes; tapping it opens the app on them. Its own channel, so it can be
     * turned off without losing the session notification. Silent: the end alert is its sound.
     */
    private void showEndReminder() {
        NotificationManagerCompat.from(this).createNotificationChannel(
            new NotificationChannelCompat.Builder(END_CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                .setName(getString(R.string.meditation_end_channel_name))
                .build()
        );
        Notification reminder = new NotificationCompat.Builder(this, END_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_meditation)
            .setContentTitle(getString(R.string.meditation_end_title))
            .setContentText(getString(R.string.meditation_end_text))
            .setContentIntent(openAppIntent())
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSilent(true)
            .build();
        // The platform manager rather than the compat one: without the notification permission
        // it drops the post quietly, which is the behaviour wanted here.
        getSystemService(NotificationManager.class).notify(END_REMINDER_ID, reminder);
    }
}
