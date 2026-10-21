import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nextTick, shallowRef } from 'vue';

import { useMeditationSession } from '@/renderer/composables/useMeditationSession';
import type { PendingSession } from '@/renderer/utils/meditationTimer';

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
const nativeTimer = vi.hoisted(() => ({
    hasNativeTimer: vi.fn(() => false),
    startNativeTimer: vi.fn(() => Promise.resolve()),
    stopNativeTimer: vi.fn(() => Promise.resolve()),
    dismissEndReminder: vi.fn(() => Promise.resolve()),
    savePendingSession: vi.fn((_session: PendingSession) => Promise.resolve()),
    loadPendingSession: vi.fn((): Promise<PendingSession | null> => Promise.resolve(null)),
    clearPendingSession: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/renderer/utils/meditationTimer', () => nativeTimer);

vi.stubGlobal('Audio', MockAudio);

describe('useMeditationSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function setup() {
        return useMeditationSession(shallowRef<HTMLInputElement | null>(null));
    }

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
    });

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
            expect(customDurationValue.value).toBe(10);
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
            expect(customDurationValue.value).toBe(10);
        });
    });

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
            startMeditation(3);
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
    });

    describe('finishMeditation', () => {
        it('auto-finishes when timer reaches 0', () => {
            const { startMeditation, meditationActive, showNotes, selectedDuration } = setup();
            selectedDuration.value = 1;
            startMeditation(3);

            vi.advanceTimersByTime(61000);
            expect(meditationActive.value).toBe(false);
            expect(showNotes.value).toBe(true);
        });

        it('records completed duration on finish', () => {
            const { startMeditation, finishMeditation, completedMeditationDuration, selectedDuration } = setup();
            selectedDuration.value = 1;
            startMeditation(3);

            vi.advanceTimersByTime(30000);
            finishMeditation();
            expect(completedMeditationDuration.value).toBe(30);
        });

        it('dates the session when it ended', () => {
            const { startMeditation, finishMeditation, completedAt } = setup();
            startMeditation(3);
            vi.advanceTimersByTime(30000);
            finishMeditation();
            expect(completedAt.value).toBe(Date.now());
        });
    });

    describe('suspended timers (screen locked)', () => {
        it('catches up on elapsed time when the page becomes visible', () => {
            const { startMeditation, meditationSeconds } = setup();
            startMeditation(3);

            // Clock moves on while no interval callbacks run
            vi.setSystemTime(Date.now() + 120_000);
            document.dispatchEvent(new Event('visibilitychange'));
            expect(meditationSeconds.value).toBe(480);
        });

        it('finishes on resume if the session ended while suspended', () => {
            const { startMeditation, meditationActive, showNotes, completedMeditationDuration, selectedDuration } =
                setup();
            selectedDuration.value = 1;
            startMeditation(3);

            vi.setSystemTime(Date.now() + 90_000);
            document.dispatchEvent(new Event('visibilitychange'));
            expect(meditationActive.value).toBe(false);
            expect(showNotes.value).toBe(true);
            expect(completedMeditationDuration.value).toBe(60);
        });

        it('dates a session that ran out while suspended at its end, not at the resume', () => {
            const { startMeditation, completedAt, selectedDuration } = setup();
            selectedDuration.value = 1;
            startMeditation(3);
            const endsAt = Date.now() + 60_000;

            vi.setSystemTime(Date.now() + 3_600_000);
            document.dispatchEvent(new Event('visibilitychange'));
            expect(completedAt.value).toBe(endsAt);
        });

        it('skips bells missed while suspended instead of ringing late', () => {
            const { startMeditation, bellEnabled, bellInterval, meditationSeconds } = setup();
            bellEnabled.value = true;
            bellInterval.value = 1;
            const sources: string[] = [];
            vi.stubGlobal(
                'Audio',
                class extends MockAudio {
                    constructor(src?: string) {
                        super(src);
                        sources.push(this.src);
                    }
                },
            );
            startMeditation(3);

            vi.setSystemTime(Date.now() + 90_000);
            document.dispatchEvent(new Event('visibilitychange'));
            expect(meditationSeconds.value).toBe(510);
            expect(sources.filter((src) => src.includes('bell'))).toHaveLength(0);

            // The next bell, reached while running normally, still rings
            vi.advanceTimersByTime(30_000);
            expect(sources.filter((src) => src.includes('bell'))).toHaveLength(1);
            vi.stubGlobal('Audio', MockAudio);
        });
    });

    describe('native timer (Android)', () => {
        let sources: string[];

        beforeEach(() => {
            nativeTimer.hasNativeTimer.mockReturnValue(true);
            sources = [];
            vi.stubGlobal(
                'Audio',
                class extends MockAudio {
                    constructor(src?: string) {
                        super(src);
                        sources.push(this.src);
                    }
                },
            );
        });

        afterEach(() => {
            nativeTimer.hasNativeTimer.mockReturnValue(false);
            vi.stubGlobal('Audio', MockAudio);
        });

        it('hands the session to the native timer on start', () => {
            const { startMeditation, selectedDuration, bellEnabled, bellInterval, bellSound } = setup();
            selectedDuration.value = 20;
            bellEnabled.value = true;
            bellInterval.value = 5;
            bellSound.value = '3';
            startMeditation(3);
            expect(nativeTimer.startNativeTimer).toHaveBeenCalledWith({
                endsAt: Date.now() + 1_200_000,
                durationSec: 1200,
                bellIntervalSec: 300,
                bellAsset: 'bell3.mp3',
            });
        });

        it('sends no interval when the bell is off', () => {
            const { startMeditation } = setup();
            startMeditation(3);
            expect(nativeTimer.startNativeTimer).toHaveBeenCalledWith(expect.objectContaining({ bellIntervalSec: 0 }));
        });

        it('leaves the bells and end alert to the native timer', () => {
            const { startMeditation, selectedDuration, bellEnabled, bellInterval, meditationActive } = setup();
            selectedDuration.value = 2;
            bellEnabled.value = true;
            bellInterval.value = 1;
            startMeditation(3);
            sources.length = 0; // the start alert

            vi.advanceTimersByTime(121_000);
            expect(meditationActive.value).toBe(false);
            expect(sources).toHaveLength(0);
            // Stopping it here would cut off the end alert it is about to play
            expect(nativeTimer.stopNativeTimer).not.toHaveBeenCalled();
        });

        it('stops the native timer and plays the alert itself on an early stop', () => {
            const plays: string[] = [];
            vi.stubGlobal(
                'Audio',
                class extends MockAudio {
                    override play = vi.fn(() => {
                        plays.push(this.src);
                        return Promise.resolve();
                    });
                },
            );
            const { startMeditation, stopMeditation } = setup();
            startMeditation(3);
            stopMeditation();
            expect(nativeTimer.stopNativeTimer).toHaveBeenCalledOnce();
            expect(plays).toEqual(['./alert.mp3', './alert.mp3']);
        });

        it('stops the native timer on cleanup', () => {
            const { startMeditation, cleanup } = setup();
            startMeditation(3);
            cleanup();
            expect(nativeTimer.stopNativeTimer).toHaveBeenCalledOnce();
        });

        it('saves the session so a reloaded app can pick it up', () => {
            const { startMeditation, selectedDuration, bellEnabled, bellInterval, bellSound } = setup();
            selectedDuration.value = 20;
            bellEnabled.value = true;
            bellInterval.value = 5;
            bellSound.value = '2';
            startMeditation(3);
            expect(nativeTimer.savePendingSession).toHaveBeenCalledWith({
                endsAt: Date.now() + 1_200_000,
                durationMin: 20,
                bellEnabled: true,
                bellInterval: 5,
                bellSound: '2',
            });
        });

        it('reschedules the native timer when the bells change mid-session', async () => {
            const { startMeditation, bellEnabled, bellInterval } = setup();
            startMeditation(3);
            const endsAt = Date.now() + 600_000;
            vi.advanceTimersByTime(60_000);

            bellEnabled.value = true;
            bellInterval.value = 5;
            await nextTick();
            expect(nativeTimer.startNativeTimer).toHaveBeenLastCalledWith(
                expect.objectContaining({ endsAt, bellIntervalSec: 300 }),
            );
        });

        it('leaves the bell settings alone outside a session', async () => {
            const { bellEnabled } = setup();
            bellEnabled.value = true;
            await nextTick();
            expect(nativeTimer.startNativeTimer).not.toHaveBeenCalled();
        });

        it('saves a session finished early as ended, so a reload asks for its notes', () => {
            const { startMeditation, finishMeditation, selectedDuration } = setup();
            selectedDuration.value = 20;
            startMeditation(3);
            vi.advanceTimersByTime(90_000);
            finishMeditation();
            expect(nativeTimer.savePendingSession).toHaveBeenLastCalledWith(
                expect.objectContaining({ endsAt: Date.now(), durationMin: 1.5 }),
            );
        });

        it('forgets the session on an early stop', () => {
            const { startMeditation, stopMeditation } = setup();
            startMeditation(3);
            stopMeditation();
            expect(nativeTimer.clearPendingSession).toHaveBeenCalledOnce();
        });

        it('keeps the session until its notes are done, then dismisses the reminder', async () => {
            const { startMeditation, showNotes, selectedDuration } = setup();
            selectedDuration.value = 1;
            startMeditation(3);
            vi.advanceTimersByTime(61_000);
            await nextTick();
            expect(showNotes.value).toBe(true);
            expect(nativeTimer.clearPendingSession).not.toHaveBeenCalled();

            showNotes.value = false;
            await nextTick();
            expect(nativeTimer.clearPendingSession).toHaveBeenCalledOnce();
            expect(nativeTimer.dismissEndReminder).toHaveBeenCalledOnce();
        });

        it('rings the bells itself if the native timer fails to start', async () => {
            nativeTimer.startNativeTimer.mockRejectedValueOnce(new Error('no service'));
            const { startMeditation, bellEnabled, bellInterval } = setup();
            bellEnabled.value = true;
            bellInterval.value = 1;
            startMeditation(3);
            await vi.advanceTimersByTimeAsync(60_000);
            expect(sources.filter((src) => src.includes('bell'))).toHaveLength(1);
        });
    });

    describe('restoreSession', () => {
        function pending(overrides: Partial<PendingSession> = {}): PendingSession {
            return {
                endsAt: Date.now() + 300_000,
                durationMin: 20,
                bellEnabled: true,
                bellInterval: 5,
                bellSound: '4',
                ...overrides,
            };
        }

        beforeEach(() => {
            nativeTimer.hasNativeTimer.mockReturnValue(true);
        });

        afterEach(() => {
            nativeTimer.hasNativeTimer.mockReturnValue(false);
        });

        it('resumes a session that is still running', async () => {
            const saved = pending();
            nativeTimer.loadPendingSession.mockResolvedValueOnce(saved);
            const { restoreSession, meditationActive, meditationSeconds, selectedDuration, bellSound } = setup();
            await restoreSession(3);
            expect(meditationActive.value).toBe(true);
            expect(meditationSeconds.value).toBe(300);
            expect(selectedDuration.value).toBe(20);
            expect(bellSound.value).toBe('4');
            // The native timer may have gone down with the app
            expect(nativeTimer.startNativeTimer).toHaveBeenCalledWith(
                expect.objectContaining({ endsAt: saved.endsAt, durationSec: 1200, bellIntervalSec: 300 }),
            );
        });

        it('asks for the notes of a session that ended meanwhile', async () => {
            const saved = pending({ endsAt: Date.now() - 60_000 });
            nativeTimer.loadPendingSession.mockResolvedValueOnce(saved);
            const { restoreSession, meditationActive, showNotes, completedMeditationDuration, completedAt } = setup();
            await restoreSession(3);
            expect(meditationActive.value).toBe(false);
            expect(showNotes.value).toBe(true);
            expect(completedMeditationDuration.value).toBe(1200);
            expect(completedAt.value).toBe(saved.endsAt);
            expect(nativeTimer.startNativeTimer).not.toHaveBeenCalled();
        });

        it('asks for the notes of a session finished early, at the length it ran', async () => {
            nativeTimer.loadPendingSession.mockResolvedValueOnce(
                pending({ endsAt: Date.now() - 1000, durationMin: 7 / 60 }),
            );
            const { restoreSession, meditationActive, completedMeditationDuration, selectedDuration } = setup();
            await restoreSession(3);
            expect(meditationActive.value).toBe(false);
            expect(completedMeditationDuration.value).toBe(7);
            // A fraction of a minute is no duration to leave in the picker
            expect(selectedDuration.value).toBe(10);
        });

        it('does nothing when no session was saved', async () => {
            const { restoreSession, meditationActive, showNotes } = setup();
            await restoreSession(3);
            expect(meditationActive.value).toBe(false);
            expect(showNotes.value).toBe(false);
        });

        it('leaves a session this app already has in hand', async () => {
            nativeTimer.loadPendingSession.mockResolvedValueOnce(pending({ durationMin: 45 }));
            const { restoreSession, startMeditation, selectedDuration } = setup();
            startMeditation(3);
            await restoreSession(3);
            expect(selectedDuration.value).toBe(10);
        });

        it('carries on without a session when the saved one cannot be read', async () => {
            nativeTimer.loadPendingSession.mockRejectedValueOnce(new Error('storage'));
            const { restoreSession, meditationActive } = setup();
            await restoreSession(3);
            expect(meditationActive.value).toBe(false);
        });

        it('reads nothing on desktop', async () => {
            nativeTimer.hasNativeTimer.mockReturnValue(false);
            const { restoreSession } = setup();
            await restoreSession(3);
            expect(nativeTimer.loadPendingSession).not.toHaveBeenCalled();
        });
    });

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

    describe('cleanup', () => {
        it('clears the meditation interval', () => {
            const { startMeditation, cleanup, meditationSeconds } = setup();
            startMeditation(3);

            cleanup();

            const secondsAfterCleanup = meditationSeconds.value;
            vi.advanceTimersByTime(5000);
            expect(meditationSeconds.value).toBe(secondsAfterCleanup);
        });
    });
});
