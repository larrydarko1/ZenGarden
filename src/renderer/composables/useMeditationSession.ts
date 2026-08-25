/**
 * useMeditationSession — timer, bell, and breathing exercise state and lifecycle.
 * Owns: meditation countdown, bell scheduling, breathing cycle, audio playback, session result.
 * Does NOT own: animation selection (Home.vue), session notes saving (Home.vue), auth (Home.vue).
 */

import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

type BreathingExercise = {
    id: string;
    name: string;
    description: string;
    pattern: { phase: string; duration: number; text: string }[];
};

type MeditationSession = {
    // Timer
    meditationActive: Ref<boolean>;
    meditationSeconds: Ref<number>;
    selectedDuration: Ref<number>;
    isCustomDuration: Ref<boolean>;
    customDurationValue: Ref<number>;
    customInput: Ref<HTMLInputElement | null>;
    // Bell
    bellEnabled: Ref<boolean>;
    bellInterval: Ref<number>;
    bellSound: Ref<string>;
    showBellConfig: Ref<boolean>;
    showIntervalDropdown: Ref<boolean>;
    showSoundDropdown: Ref<boolean>;
    // Breathing
    showBreathingPicker: Ref<boolean>;
    selectedBreathingExercise: Ref<BreathingExercise | null>;
    breathingActive: Ref<boolean>;
    breathingPhase: Ref<string>;
    breathingPhaseText: Ref<string>;
    breathingPhaseDuration: Ref<number>;
    breathingCycleCount: Ref<number>;
    breathingExercises: BreathingExercise[];
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
    startBreathingCycle: () => void;
    stopBreathingCycle: () => void;
    toggleBreathingDuringMeditation: () => void;
    startMeditation: (animationCount: number) => void;
    stopMeditation: () => void;
    finishMeditation: () => void;
    cleanup: () => void;
    formatTime: (sec: number) => string;
};

// ─── Composable ───────────────────────────────────────────────────────────────

export function useMeditationSession(): MeditationSession {
    const { t } = useI18n();

    // ── Timer ─────────────────────────────────────────────────────────────────
    const meditationActive = ref(false);
    const meditationSeconds = ref(600);
    const selectedDuration = ref(10); // minutes
    const isCustomDuration = ref(false);
    const customDurationValue = ref(10);
    const customInput = ref<HTMLInputElement | null>(null);
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

    // ── Breathing ─────────────────────────────────────────────────────────────
    const showBreathingPicker = ref(false);
    const selectedBreathingExercise = ref<BreathingExercise | null>(null);
    const breathingActive = ref(false);
    const breathingPhase = ref('in');
    const breathingPhaseText = ref('');
    const breathingPhaseDuration = ref(4);
    const breathingCycleCount = ref(1);
    let breathingIntervalId: number | undefined;

    const breathingExercises: BreathingExercise[] = [
        {
            id: 'box',
            name: t('breathing.box'),
            description: t('breathing.descriptions.box'),
            pattern: [
                { phase: 'in', duration: 4, text: t('breathing.breatheIn') },
                { phase: 'hold', duration: 4, text: t('breathing.hold') },
                { phase: 'out', duration: 4, text: t('breathing.breatheOut') },
                { phase: 'hold', duration: 4, text: t('breathing.hold') },
            ],
        },
        {
            id: '478',
            name: t('breathing.fourSevenEight'),
            description: t('breathing.descriptions.fourSevenEight'),
            pattern: [
                { phase: 'in', duration: 4, text: t('breathing.breatheIn') },
                { phase: 'hold', duration: 7, text: t('breathing.hold') },
                { phase: 'out', duration: 8, text: t('breathing.breatheOut') },
            ],
        },
        {
            id: 'deep',
            name: t('breathing.deep'),
            description: t('breathing.descriptions.deep'),
            pattern: [
                { phase: 'in', duration: 6, text: t('breathing.breatheIn') },
                { phase: 'out', duration: 6, text: t('breathing.breatheOut') },
            ],
        },
        {
            id: 'energizing',
            name: t('breathing.energizing'),
            description: t('breathing.descriptions.energizing'),
            pattern: [
                { phase: 'in', duration: 2, text: t('breathing.breatheIn') },
                { phase: 'out', duration: 4, text: t('breathing.breatheOut') },
            ],
        },
    ];

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

    // ── Breathing ─────────────────────────────────────────────────────────────

    function startBreathingCycle(): void {
        if (selectedBreathingExercise.value === null) return;
        breathingActive.value = true;
        breathingCycleCount.value = 1;
        let patternIndex = 0;
        const pattern = selectedBreathingExercise.value.pattern;

        function nextPhase(): void {
            if (!breathingActive.value || selectedBreathingExercise.value === null) return;
            const current = pattern[patternIndex];
            breathingPhase.value = current.phase;
            breathingPhaseText.value = current.text;
            breathingPhaseDuration.value = current.duration;
            patternIndex++;
            if (patternIndex >= pattern.length) {
                patternIndex = 0;
                breathingCycleCount.value++;
            }
        }

        nextPhase();
        // Interval uses the duration of the first phase — intentional, preserved from original.
        breathingIntervalId = window.setInterval(() => {
            nextPhase();
        }, breathingPhaseDuration.value * 1000);
    }

    function stopBreathingCycle(): void {
        breathingActive.value = false;
        if (breathingIntervalId !== undefined) {
            clearInterval(breathingIntervalId);
            breathingIntervalId = undefined;
        }
    }

    function toggleBreathingDuringMeditation(): void {
        if (breathingActive.value) {
            stopBreathingCycle();
        } else if (selectedBreathingExercise.value !== null) {
            startBreathingCycle();
        }
    }

    // ── Timer lifecycle ───────────────────────────────────────────────────────

    function finishMeditation(): void {
        meditationActive.value = false;
        stopBreathingCycle();
        if (meditationIntervalId !== undefined) clearInterval(meditationIntervalId);
        playAlert();
        completedMeditationDuration.value = selectedDuration.value * 60 - meditationSeconds.value;
        showNotes.value = true;
    }

    function stopMeditation(): void {
        meditationActive.value = false;
        stopBreathingCycle();
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
        if (selectedBreathingExercise.value !== null) {
            startBreathingCycle();
        }
    }

    function cleanup(): void {
        if (meditationIntervalId !== undefined) clearInterval(meditationIntervalId);
        stopBreathingCycle();
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
        customInput,
        // Bell
        bellEnabled,
        bellInterval,
        bellSound,
        showBellConfig,
        showIntervalDropdown,
        showSoundDropdown,
        // Breathing
        showBreathingPicker,
        selectedBreathingExercise,
        breathingActive,
        breathingPhase,
        breathingPhaseText,
        breathingPhaseDuration,
        breathingCycleCount,
        breathingExercises,
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
        startBreathingCycle,
        stopBreathingCycle,
        toggleBreathingDuringMeditation,
        startMeditation,
        stopMeditation,
        finishMeditation,
        cleanup,
        formatTime,
    };
}
