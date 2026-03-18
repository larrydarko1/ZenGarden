// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

// Stub HTMLAudioElement
class MockAudio {
    src = '';
    volume = 1;
    currentTime = 0;
    play = vi.fn().mockResolvedValue(undefined);
    pause = vi.fn();
    constructor(src?: string) {
        this.src = src ?? '';
    }
}
vi.stubGlobal('Audio', MockAudio);

import { useMeditationSession } from '../../../src/renderer/composables/useMeditationSession';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useMeditationSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function setup() {
        return useMeditationSession();
    }

    // ── Initial state ─────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts inactive', () => {
            const { meditationActive } = setup();
            expect(meditationActive.value).toBe(false);
        });

        it('defaults to 10 minutes (600 seconds)', () => {
            const { meditationSeconds, selectedDuration } = setup();
            expect(selectedDuration.value).toBe(10);
            expect(meditationSeconds.value).toBe(600);
        });

        it('has bell disabled by default', () => {
            const { bellEnabled } = setup();
            expect(bellEnabled.value).toBe(false);
        });

        it('has no breathing exercise selected', () => {
            const { selectedBreathingExercise } = setup();
            expect(selectedBreathingExercise.value).toBeNull();
        });

        it('provides 4 breathing exercises', () => {
            const { breathingExercises } = setup();
            expect(breathingExercises).toHaveLength(4);
            expect(breathingExercises.map((e) => e.id)).toEqual(['box', '478', 'deep', 'energizing']);
        });
    });

    // ── Duration selection ────────────────────────────────────────────────

    describe('duration selection', () => {
        it('selectPresetDuration sets duration and disables custom mode', () => {
            const { selectPresetDuration, selectedDuration, isCustomDuration } = setup();
            selectPresetDuration(20);
            expect(selectedDuration.value).toBe(20);
            expect(isCustomDuration.value).toBe(false);
        });

        it('enableCustomDuration enters custom mode', () => {
            const { enableCustomDuration, isCustomDuration, customDurationValue } = setup();
            enableCustomDuration();
            expect(isCustomDuration.value).toBe(true);
            expect(customDurationValue.value).toBe(10); // copies current selectedDuration
        });

        it('applyCustomDuration sets the duration when valid', () => {
            const {
                enableCustomDuration,
                applyCustomDuration,
                customDurationValue,
                selectedDuration,
                isCustomDuration,
            } = setup();
            enableCustomDuration();
            customDurationValue.value = 25;
            applyCustomDuration();
            expect(selectedDuration.value).toBe(25);
            expect(isCustomDuration.value).toBe(false);
        });

        it('applyCustomDuration clamps out-of-range values', () => {
            const { enableCustomDuration, applyCustomDuration, customDurationValue } = setup();
            enableCustomDuration();
            customDurationValue.value = 200;
            applyCustomDuration();
            expect(customDurationValue.value).toBe(180);
        });

        it('cancelCustomDuration restores previous value', () => {
            const { enableCustomDuration, cancelCustomDuration, customDurationValue, isCustomDuration } = setup();
            enableCustomDuration();
            customDurationValue.value = 99;
            cancelCustomDuration();
            expect(isCustomDuration.value).toBe(false);
            expect(customDurationValue.value).toBe(10); // reset to selectedDuration
        });
    });

    // ── formatTime ────────────────────────────────────────────────────────

    describe('formatTime', () => {
        it('formats 0 seconds as 00:00', () => {
            const { formatTime } = setup();
            expect(formatTime(0)).toBe('00:00');
        });

        it('formats 90 seconds as 01:30', () => {
            const { formatTime } = setup();
            expect(formatTime(90)).toBe('01:30');
        });

        it('formats 600 seconds as 10:00', () => {
            const { formatTime } = setup();
            expect(formatTime(600)).toBe('10:00');
        });

        it('formats 3599 seconds as 59:59', () => {
            const { formatTime } = setup();
            expect(formatTime(3599)).toBe('59:59');
        });
    });

    // ── Meditation lifecycle ──────────────────────────────────────────────

    describe('startMeditation', () => {
        it('activates meditation and sets seconds', () => {
            const { startMeditation, meditationActive, meditationSeconds, selectedDuration } = setup();
            selectedDuration.value = 5;
            startMeditation(3);
            expect(meditationActive.value).toBe(true);
            expect(meditationSeconds.value).toBe(300);
        });

        it('picks a random animation index within bounds', () => {
            const { startMeditation, meditationAnimationIdx } = setup();
            startMeditation(5);
            expect(meditationAnimationIdx.value).toBeGreaterThanOrEqual(0);
            expect(meditationAnimationIdx.value).toBeLessThan(5);
        });

        it('does not restart if already active', () => {
            const { startMeditation, meditationActive, meditationSeconds } = setup();
            startMeditation(3);
            vi.advanceTimersByTime(5000);
            const secondsBefore = meditationSeconds.value;
            startMeditation(3); // should be ignored
            expect(meditationActive.value).toBe(true);
            expect(meditationSeconds.value).toBe(secondsBefore);
        });

        it('counts down each second', () => {
            const { startMeditation, meditationSeconds } = setup();
            startMeditation(3);
            expect(meditationSeconds.value).toBe(600);

            vi.advanceTimersByTime(3000);
            expect(meditationSeconds.value).toBe(597);
        });

        it('starts breathing cycle if exercise is selected', () => {
            const { startMeditation, breathingExercises, selectedBreathingExercise, breathingActive } = setup();
            selectedBreathingExercise.value = breathingExercises[0];
            startMeditation(3);
            expect(breathingActive.value).toBe(true);
        });
    });

    describe('stopMeditation', () => {
        it('stops the meditation and clears interval', () => {
            const { startMeditation, stopMeditation, meditationActive, meditationSeconds } = setup();
            startMeditation(3);
            vi.advanceTimersByTime(5000);
            stopMeditation();
            expect(meditationActive.value).toBe(false);

            const secondsAfterStop = meditationSeconds.value;
            vi.advanceTimersByTime(3000);
            expect(meditationSeconds.value).toBe(secondsAfterStop);
        });

        it('stops breathing if active', () => {
            const { startMeditation, stopMeditation, breathingExercises, selectedBreathingExercise, breathingActive } =
                setup();
            selectedBreathingExercise.value = breathingExercises[0];
            startMeditation(3);
            expect(breathingActive.value).toBe(true);
            stopMeditation();
            expect(breathingActive.value).toBe(false);
        });
    });

    describe('finishMeditation', () => {
        it('auto-finishes when timer reaches 0', () => {
            const { startMeditation, meditationActive, showNotes, selectedDuration } = setup();
            selectedDuration.value = 1; // 1 minute = 60 seconds
            startMeditation(3);

            vi.advanceTimersByTime(61000); // 61 seconds to ensure completion
            expect(meditationActive.value).toBe(false);
            expect(showNotes.value).toBe(true);
        });

        it('records completed duration on finish', () => {
            const { startMeditation, finishMeditation, completedMeditationDuration, selectedDuration } = setup();
            selectedDuration.value = 1; // 60 seconds
            startMeditation(3);

            vi.advanceTimersByTime(30000); // 30s elapsed
            finishMeditation();
            expect(completedMeditationDuration.value).toBe(30);
        });
    });

    // ── Breathing ─────────────────────────────────────────────────────────

    describe('breathing exercises', () => {
        it('startBreathingCycle does nothing without an exercise selected', () => {
            const { startBreathingCycle, breathingActive } = setup();
            startBreathingCycle();
            expect(breathingActive.value).toBe(false);
        });

        it('starts cycling through phases', () => {
            const {
                startBreathingCycle,
                breathingExercises,
                selectedBreathingExercise,
                breathingActive,
                breathingPhase,
            } = setup();
            selectedBreathingExercise.value = breathingExercises[0]; // box breathing
            startBreathingCycle();

            expect(breathingActive.value).toBe(true);
            expect(breathingPhase.value).toBe('in');
        });

        it('advances to next phase on interval', () => {
            const { startBreathingCycle, breathingExercises, selectedBreathingExercise, breathingPhase } = setup();
            selectedBreathingExercise.value = breathingExercises[0]; // box: in(4s), hold(4s), out(4s), hold(4s)
            startBreathingCycle();

            // First phase is 'in' with 4s duration. Interval runs at phaseDuration * 1000
            vi.advanceTimersByTime(4000);
            expect(breathingPhase.value).toBe('hold');
        });

        it('stopBreathingCycle stops the cycle', () => {
            const {
                startBreathingCycle,
                stopBreathingCycle,
                breathingExercises,
                selectedBreathingExercise,
                breathingActive,
            } = setup();
            selectedBreathingExercise.value = breathingExercises[0];
            startBreathingCycle();
            stopBreathingCycle();
            expect(breathingActive.value).toBe(false);
        });

        it('toggleBreathingDuringMeditation toggles cycle on/off', () => {
            const { toggleBreathingDuringMeditation, breathingExercises, selectedBreathingExercise, breathingActive } =
                setup();
            selectedBreathingExercise.value = breathingExercises[0];

            toggleBreathingDuringMeditation();
            expect(breathingActive.value).toBe(true);

            toggleBreathingDuringMeditation();
            expect(breathingActive.value).toBe(false);
        });

        it('increments cycle count after completing all phases', () => {
            const { startBreathingCycle, breathingExercises, selectedBreathingExercise, breathingCycleCount } = setup();
            // Deep breathing: in(6s), out(6s)
            selectedBreathingExercise.value = breathingExercises[2];
            startBreathingCycle();

            expect(breathingCycleCount.value).toBe(1);
            // After 2 phases (in + out at 6s interval each), cycle completes
            vi.advanceTimersByTime(6000); // phase 2 (out)
            vi.advanceTimersByTime(6000); // back to phase 1 → cycle 2
            expect(breathingCycleCount.value).toBe(2);
        });
    });

    // ── Bell ──────────────────────────────────────────────────────────────

    describe('bell sound', () => {
        it('selectBellSound updates the sound id', () => {
            const { selectBellSound, bellSound } = setup();
            selectBellSound('3');
            expect(bellSound.value).toBe('3');
        });

        it('selectBellSoundFromDropdown updates and closes dropdown', () => {
            const { selectBellSoundFromDropdown, bellSound, showSoundDropdown } = setup();
            showSoundDropdown.value = true;
            selectBellSoundFromDropdown('2');
            expect(bellSound.value).toBe('2');
            expect(showSoundDropdown.value).toBe(false);
        });
    });

    // ── Cleanup ───────────────────────────────────────────────────────────

    describe('cleanup', () => {
        it('clears meditation and breathing intervals', () => {
            const { startMeditation, breathingExercises, selectedBreathingExercise, cleanup, meditationSeconds } =
                setup();
            selectedBreathingExercise.value = breathingExercises[0];
            startMeditation(3);

            cleanup();

            const secondsAfterCleanup = meditationSeconds.value;
            vi.advanceTimersByTime(5000);
            expect(meditationSeconds.value).toBe(secondsAfterCleanup);
        });
    });
});
