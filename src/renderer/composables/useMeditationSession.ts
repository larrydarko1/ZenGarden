/**
 * useMeditationSession — timer, bell, and session-result state and lifecycle.
 * Owns: meditation countdown, bell scheduling, audio playback, session result.
 * Does NOT own: animation selection (Home.vue), session notes saving (Home.vue), auth (Home.vue).
 */

import { ref, watch, type Ref, type ShallowRef } from 'vue';

import { log } from '@/renderer/utils/logger';
import {
    clearPendingSession,
    dismissEndReminder,
    hasNativeTimer,
    loadPendingSession,
    savePendingSession,
    startNativeTimer,
    stopNativeTimer,
    type PendingSession,
} from '@/renderer/utils/meditationTimer';

/** The custom-duration input, owned by the caller's template — this only focuses it. */
type CustomInputRef = Readonly<ShallowRef<HTMLInputElement | null>>;

type MeditationSession = {
    // Timer
    meditationActive: Ref<boolean>;
    meditationSeconds: Ref<number>;
    selectedDuration: Ref<number>;
    isCustomDuration: Ref<boolean>;
    customDurationValue: Ref<number>;
    // Bell
    bellEnabled: Ref<boolean>;
    bellInterval: Ref<number>;
    bellSound: Ref<string>;
    showBellConfig: Ref<boolean>;
    showIntervalDropdown: Ref<boolean>;
    showSoundDropdown: Ref<boolean>;
    // Session result
    completedMeditationDuration: Ref<number>;
    /** When the session ended, in ms since the epoch — the date its notes are filed under. */
    completedAt: Ref<number>;
    showNotes: Ref<boolean>;
    meditationAnimationIdx: Ref<number>;
    // Methods
    selectPresetDuration: (duration: number) => void;
    enableCustomDuration: () => void;
    applyCustomDuration: () => void;
    cancelCustomDuration: () => void;
    selectBellSound: (sound: string) => void;
    selectBellSoundFromDropdown: (sound: string) => void;
    startMeditation: (animationCount: number) => void;
    stopMeditation: () => void;
    finishMeditation: () => void;
    restoreSession: (animationCount: number) => Promise<void>;
    cleanup: () => void;
    formatTime: (sec: number) => string;
};

export function useMeditationSession(customInput: CustomInputRef): MeditationSession {
    // ── Timer ─────────────────────────────────────────────────────────────────
    const meditationActive = ref(false);
    const meditationSeconds = ref(600);
    const selectedDuration = ref(10); // minutes
    const isCustomDuration = ref(false);
    const customDurationValue = ref(10);
    let meditationIntervalId: number | undefined;
    // Wall-clock end of the session. Remaining time is derived from it rather than
    // counted down, because mobile WebViews suspend timers while the screen is locked.
    let meditationEndTime = 0;
    // While true the native timer (Android) plays the bells and the end alert, because it
    // keeps running when the screen is locked. This side then only drives the display.
    let nativeSession = false;

    // ── Bell ──────────────────────────────────────────────────────────────────
    const bellEnabled = ref(false);
    const bellInterval = ref(10); // minutes
    const bellSound = ref('1');
    const showBellConfig = ref(false);
    const showIntervalDropdown = ref(false);
    const showSoundDropdown = ref(false);
    let lastBellTime = 0;
    let bellAudioInstance: HTMLAudioElement | null = null;

    // ── Session result ────────────────────────────────────────────────────────
    const completedMeditationDuration = ref(0);
    const completedAt = ref(0);
    const showNotes = ref(false);
    const meditationAnimationIdx = ref(0);

    const alertAudio = ref<HTMLAudioElement | null>(null);

    // ── Duration selection ────────────────────────────────────────────────────

    function selectPresetDuration(duration: number): void {
        isCustomDuration.value = false;
        selectedDuration.value = duration;
    }

    function enableCustomDuration(): void {
        isCustomDuration.value = true;
        customDurationValue.value = selectedDuration.value;
        setTimeout(() => {
            customInput.value?.focus();
            customInput.value?.select();
        }, 50);
    }

    function applyCustomDuration(): void {
        if (customDurationValue.value >= 1 && customDurationValue.value <= 180) {
            selectedDuration.value = customDurationValue.value;
            isCustomDuration.value = false;
        } else {
            customDurationValue.value = Math.max(1, Math.min(180, customDurationValue.value));
        }
    }

    function cancelCustomDuration(): void {
        isCustomDuration.value = false;
        customDurationValue.value = selectedDuration.value;
    }

    // ── Audio ─────────────────────────────────────────────────────────────────

    function playAlert(): void {
        alertAudio.value ??= new Audio('./alert.mp3');
        alertAudio.value.currentTime = 0;
        alertAudio.value.play().catch(() => {
            // Alert audio playback failed silently
        });
    }

    function playBellSound(): void {
        if (bellAudioInstance !== null) {
            bellAudioInstance.pause();
            bellAudioInstance.currentTime = 0;
        }
        bellAudioInstance = new Audio(`./bell${bellSound.value}.mp3`);
        bellAudioInstance.volume = 0.5;
        bellAudioInstance.play().catch(() => {
            // Bell audio playback failed silently
        });
    }

    function selectBellSound(sound: string): void {
        bellSound.value = sound;
        playBellSound();
    }

    function selectBellSoundFromDropdown(sound: string): void {
        bellSound.value = sound;
        showSoundDropdown.value = false;
        playBellSound();
    }

    // ── Timer lifecycle ───────────────────────────────────────────────────────

    function remainingSeconds(): number {
        return Math.max(0, Math.ceil((meditationEndTime - Date.now()) / 1000));
    }

    function stopTicking(): void {
        if (meditationIntervalId !== undefined) clearInterval(meditationIntervalId);
        meditationIntervalId = undefined;
        document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    function checkBell(): void {
        if (!bellEnabled.value || bellInterval.value <= 0) return;
        const elapsedSeconds = selectedDuration.value * 60 - meditationSeconds.value;
        const elapsedMinutes = elapsedSeconds / 60;
        const currentBellMinute = Math.floor(elapsedMinutes / bellInterval.value) * bellInterval.value;
        if (currentBellMinute > lastBellTime && elapsedMinutes >= bellInterval.value) {
            // A bell missed while the timer was suspended is skipped, not rung late on resume.
            if (!nativeSession && elapsedSeconds - currentBellMinute * 60 <= 2) playBellSound();
            lastBellTime = currentBellMinute;
        }
    }

    function tick(): void {
        meditationSeconds.value = remainingSeconds();
        if (meditationSeconds.value > 0) {
            checkBell();
        } else {
            finishMeditation();
        }
    }

    function onVisibilityChange(): void {
        if (document.visibilityState === 'visible' && meditationActive.value) tick();
    }

    /** Sends the running session to the native timer, which replaces what it had scheduled. */
    function syncNativeSession(): void {
        startNativeTimer({
            endsAt: meditationEndTime,
            durationSec: selectedDuration.value * 60,
            bellIntervalSec: bellEnabled.value ? bellInterval.value * 60 : 0,
            bellAsset: `bell${bellSound.value}.mp3`,
        }).catch((error: unknown) => {
            // Fall back to ringing from here: right while the screen is on, silent once locked.
            nativeSession = false;
            log.warn('Native meditation timer failed to start', error);
        });
        savePending(meditationEndTime, selectedDuration.value);
    }

    function savePending(endsAt: number, durationMin: number): void {
        const pending: PendingSession = {
            endsAt,
            durationMin,
            bellEnabled: bellEnabled.value,
            bellInterval: bellInterval.value,
            bellSound: bellSound.value,
        };
        savePendingSession(pending).catch((error: unknown) => {
            log.warn('Failed to save the meditation session', error);
        });
    }

    function startNativeSession(): void {
        if (!hasNativeTimer()) return;
        nativeSession = true;
        syncNativeSession();
    }

    function stopNativeSession(): void {
        if (!nativeSession) return;
        nativeSession = false;
        stopNativeTimer().catch((error: unknown) => {
            log.warn('Native meditation timer failed to stop', error);
        });
    }

    /** The session needs nothing more: it was stopped, or its notes were written or skipped. */
    function forgetSession(): void {
        if (!hasNativeTimer()) return;
        clearPendingSession().catch((error: unknown) => {
            log.warn('Failed to clear the meditation session', error);
        });
        dismissEndReminder().catch((error: unknown) => {
            log.warn('Failed to dismiss the session reminder', error);
        });
    }

    /** `ranOut`: the time is up. A native session then plays the end alert and ends itself. */
    function endSession(ranOut: boolean): void {
        meditationActive.value = false;
        stopTicking();
        if (nativeSession && ranOut) {
            nativeSession = false;
        } else {
            stopNativeSession();
            playAlert();
        }
    }

    function showSessionNotes(durationSec: number, endedAt: number): void {
        completedMeditationDuration.value = durationSec;
        completedAt.value = endedAt;
        showNotes.value = true;
    }

    function finishMeditation(): void {
        const ranOut = meditationSeconds.value === 0;
        const durationSec = selectedDuration.value * 60 - meditationSeconds.value;
        // Run out: dated at its end, though the app may only see that on unlocking, hours later.
        const endedAt = ranOut ? meditationEndTime : Date.now();
        endSession(ranOut);
        // The saved session still ends in the future: as it was, a reload with the notes open
        // would resume it. Saved as ended now, a reload asks for these notes instead.
        if (!ranOut && hasNativeTimer()) savePending(endedAt, durationSec / 60);
        showSessionNotes(durationSec, endedAt);
    }

    function stopMeditation(): void {
        endSession(false);
        forgetSession();
    }

    /** Runs the countdown to `endsAt`, for selectedDuration minutes in all. */
    function beginSession(endsAt: number, animationCount: number): void {
        meditationActive.value = true;
        meditationEndTime = endsAt;
        meditationSeconds.value = remainingSeconds();
        lastBellTime = 0;
        meditationAnimationIdx.value = Math.floor(Math.random() * animationCount);
        meditationIntervalId = window.setInterval(tick, 1000);
        document.addEventListener('visibilitychange', onVisibilityChange);
        startNativeSession();
    }

    function startMeditation(animationCount: number): void {
        if (meditationActive.value) return;
        beginSession(Date.now() + selectedDuration.value * 60_000, animationCount);
        playAlert();
    }

    /**
     * Picks up a session the WebView lost, reloaded or restarted while the screen was locked:
     * the countdown if it is still running, otherwise its notes, so no session goes unrecorded.
     */
    async function restoreSession(animationCount: number): Promise<void> {
        if (!hasNativeTimer()) return;
        let pending: PendingSession | null = null;
        try {
            pending = await loadPendingSession();
        } catch (error) {
            log.warn('Failed to read the saved meditation session', error);
        }
        // Nothing saved, or this WebView already has the session in hand.
        if (pending === null || meditationActive.value || showNotes.value) return;

        if (pending.endsAt > Date.now()) {
            selectedDuration.value = pending.durationMin;
            bellEnabled.value = pending.bellEnabled;
            bellInterval.value = pending.bellInterval;
            bellSound.value = pending.bellSound;
            // Restarts the native timer too, in case it went down with the app.
            beginSession(pending.endsAt, animationCount);
        } else {
            // Rounded: a session finished early saves its length as a fraction of a minute.
            showSessionNotes(Math.round(pending.durationMin * 60), pending.endsAt);
        }
    }

    function cleanup(): void {
        stopTicking();
        stopNativeSession();
    }

    // Changed mid-session from the overlay: the native timer rings the bells, so it has to know.
    watch([bellEnabled, bellInterval, bellSound], () => {
        if (nativeSession) syncNativeSession();
    });

    watch(showNotes, (open) => {
        if (!open) forgetSession();
    });

    function formatTime(sec: number): string {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return {
        // Timer
        meditationActive,
        meditationSeconds,
        selectedDuration,
        isCustomDuration,
        customDurationValue,
        // Bell
        bellEnabled,
        bellInterval,
        bellSound,
        showBellConfig,
        showIntervalDropdown,
        showSoundDropdown,
        // Session result
        completedMeditationDuration,
        completedAt,
        showNotes,
        meditationAnimationIdx,
        // Methods
        selectPresetDuration,
        enableCustomDuration,
        applyCustomDuration,
        cancelCustomDuration,
        selectBellSound,
        selectBellSoundFromDropdown,
        startMeditation,
        stopMeditation,
        finishMeditation,
        restoreSession,
        cleanup,
        formatTime,
    };
}
