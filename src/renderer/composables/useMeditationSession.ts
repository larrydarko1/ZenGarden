/**
 * useMeditationSession — timer, bell, and session-result state and lifecycle.
 * Owns: meditation countdown, bell scheduling, audio playback, session result.
 * Does NOT own: animation selection (Home.vue), session notes saving (Home.vue), auth (Home.vue).
 */

import { ref, type Ref, type ShallowRef } from 'vue';

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
        if (alertAudio.value === null) {
            alertAudio.value = new Audio('./alert.mp3');
        }
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

    function finishMeditation(): void {
        meditationActive.value = false;
        if (meditationIntervalId !== undefined) clearInterval(meditationIntervalId);
        playAlert();
        completedMeditationDuration.value = selectedDuration.value * 60 - meditationSeconds.value;
        showNotes.value = true;
    }

    function stopMeditation(): void {
        meditationActive.value = false;
        if (meditationIntervalId !== undefined) clearInterval(meditationIntervalId);
        playAlert();
    }

    function startMeditation(animationCount: number): void {
        if (meditationActive.value) return;
        meditationActive.value = true;
        meditationSeconds.value = selectedDuration.value * 60;
        lastBellTime = 0;
        meditationAnimationIdx.value = Math.floor(Math.random() * animationCount);
        meditationIntervalId = window.setInterval(() => {
            if (meditationSeconds.value > 0) {
                meditationSeconds.value--;

                if (bellEnabled.value && bellInterval.value > 0) {
                    const totalSeconds = selectedDuration.value * 60;
                    const elapsedSeconds = totalSeconds - meditationSeconds.value;
                    const elapsedMinutes = elapsedSeconds / 60;
                    const currentBellMinute = Math.floor(elapsedMinutes / bellInterval.value) * bellInterval.value;
                    if (currentBellMinute > lastBellTime && elapsedMinutes >= bellInterval.value) {
                        playBellSound();
                        lastBellTime = currentBellMinute;
                    }
                }
            } else {
                finishMeditation();
            }
        }, 1000);
        playAlert();
    }

    function cleanup(): void {
        if (meditationIntervalId !== undefined) clearInterval(meditationIntervalId);
    }

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
        cleanup,
        formatTime,
    };
}
