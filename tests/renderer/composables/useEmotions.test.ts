// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

const mockSaveEmotionLog = vi.fn().mockResolvedValue({ message: 'ok', emotionLog: {} });
const mockGetEmotionLogs = vi.fn().mockResolvedValue({ emotionLogs: [] });
const mockGetEmotionAnalytics = vi.fn().mockResolvedValue({ totalDays: 0, topEmotions: [] });

vi.mock('../../../src/renderer/store', () => ({
    saveEmotionLog: (...args: unknown[]) => mockSaveEmotionLog(...args),
    getEmotionLogs: (...args: unknown[]) => mockGetEmotionLogs(...args),
    getEmotionAnalytics: (...args: unknown[]) => mockGetEmotionAnalytics(...args),
}));

import { useEmotions } from '../../../src/renderer/composables/useEmotions';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useEmotions', () => {
    const selectedDate = ref(new Date('2025-01-15'));
    const activeTab = ref('track');

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        selectedDate.value = new Date('2025-01-15');
        activeTab.value = 'track';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function setup() {
        return useEmotions(selectedDate, activeTab);
    }

    // ── Static lists ──────────────────────────────────────────────────────

    describe('emotion lists', () => {
        it('provides positive emotions', () => {
            const { positiveEmotions } = setup();
            expect(positiveEmotions.value.length).toBeGreaterThan(0);
            expect(positiveEmotions.value[0]).toMatchObject({ type: 'positive' });
        });

        it('provides negative emotions', () => {
            const { negativeEmotions } = setup();
            expect(negativeEmotions.value.length).toBeGreaterThan(0);
            expect(negativeEmotions.value[0]).toMatchObject({ type: 'negative' });
        });

        it('translates emotion names via i18n key', () => {
            const { positiveEmotions } = setup();
            expect(positiveEmotions.value[0].displayName).toContain('emotions.list.');
        });
    });

    // ── Selection state ───────────────────────────────────────────────────

    describe('toggleEmotion', () => {
        it('adds an emotion when toggled on', () => {
            const { toggleEmotion, selectedEmotions, positiveEmotions } = setup();
            const joy = positiveEmotions.value[0];
            toggleEmotion(joy);
            expect(selectedEmotions.value).toContainEqual(joy);
        });

        it('removes an emotion when toggled off', () => {
            const { toggleEmotion, selectedEmotions, positiveEmotions } = setup();
            const joy = positiveEmotions.value[0];
            toggleEmotion(joy);
            toggleEmotion(joy);
            expect(selectedEmotions.value).not.toContainEqual(joy);
        });

        it('calls saveEmotionLog after toggling', async () => {
            const { toggleEmotion, positiveEmotions } = setup();
            toggleEmotion(positiveEmotions.value[0]);
            await vi.waitFor(() => {
                expect(mockSaveEmotionLog).toHaveBeenCalled();
            });
        });
    });

    describe('isEmotionSelected', () => {
        it('returns true for selected emotions', () => {
            const { toggleEmotion, isEmotionSelected, positiveEmotions } = setup();
            const joy = positiveEmotions.value[0];
            toggleEmotion(joy);
            expect(isEmotionSelected(joy.name)).toBe(true);
        });

        it('returns false for unselected emotions', () => {
            const { isEmotionSelected } = setup();
            expect(isEmotionSelected('Joy')).toBe(false);
        });
    });

    // ── Computed counters ─────────────────────────────────────────────────

    describe('computed counts', () => {
        it('counts positive and negative separately', () => {
            const { toggleEmotion, positiveCount, negativeCount, positiveEmotions, negativeEmotions } = setup();
            toggleEmotion(positiveEmotions.value[0]);
            toggleEmotion(negativeEmotions.value[0]);
            expect(positiveCount.value).toBe(1);
            expect(negativeCount.value).toBe(1);
        });

        it('calculates pnRatio correctly', () => {
            const { toggleEmotion, pnRatio, positiveEmotions, negativeEmotions } = setup();
            toggleEmotion(positiveEmotions.value[0]);
            toggleEmotion(positiveEmotions.value[1]);
            toggleEmotion(negativeEmotions.value[0]);
            // 2 positive out of 3 total = 0.67
            expect(pnRatio.value).toBe('0.67');
        });

        it('returns 0.00 when no emotions selected', () => {
            const { pnRatio } = setup();
            expect(pnRatio.value).toBe('0.00');
        });
    });

    // ── Analytics computed ────────────────────────────────────────────────

    describe('analytics computed', () => {
        it('filters top positive from analytics', () => {
            const { analytics, topPositiveEmotions } = setup();
            analytics.value = {
                totalDays: 10,
                averagePositiveCount: 5,
                averageNegativeCount: 3,
                averagePNRatio: 0.63,
                emotionDiversity: 2,
                positiveDays: 7,
                negativeDays: 3,
                topEmotions: [
                    { name: 'Joy', type: 'positive', count: 5 },
                    { name: 'Sadness', type: 'negative', count: 3 },
                ],
                trends: [],
            };
            expect(topPositiveEmotions.value).toHaveLength(1);
            expect(topPositiveEmotions.value[0].name).toBe('Joy');
        });

        it('filters top negative from analytics', () => {
            const { analytics, topNegativeEmotions } = setup();
            analytics.value = {
                totalDays: 10,
                averagePositiveCount: 5,
                averageNegativeCount: 3,
                averagePNRatio: 0.63,
                emotionDiversity: 2,
                positiveDays: 7,
                negativeDays: 3,
                topEmotions: [
                    { name: 'Joy', type: 'positive', count: 5 },
                    { name: 'Sadness', type: 'negative', count: 3 },
                ],
                trends: [],
            };
            expect(topNegativeEmotions.value).toHaveLength(1);
            expect(topNegativeEmotions.value[0].name).toBe('Sadness');
        });
    });

    // ── getTranslatedEmotionName ──────────────────────────────────────────

    describe('getTranslatedEmotionName', () => {
        it('returns translated displayName for known emotion', () => {
            const { getTranslatedEmotionName } = setup();
            const result = getTranslatedEmotionName('Joy');
            expect(result).toContain('emotions.list.Joy.name');
        });

        it('returns the original name for unknown emotion', () => {
            const { getTranslatedEmotionName } = setup();
            expect(getTranslatedEmotionName('UnknownEmotion')).toBe('UnknownEmotion');
        });
    });

    // ── Persistence ───────────────────────────────────────────────────────

    describe('loadEmotions', () => {
        it('loads emotions from store for selected date', async () => {
            mockGetEmotionLogs.mockResolvedValue({
                emotionLogs: [
                    {
                        emotions: [
                            { name: 'Joy', type: 'positive' },
                            { name: 'Sadness', type: 'negative' },
                        ],
                        note: 'A good day',
                    },
                ],
            });

            const { loadEmotions, selectedEmotions, dailyNote } = setup();
            await loadEmotions();

            expect(selectedEmotions.value).toHaveLength(2);
            expect(dailyNote.value).toBe('A good day');
        });

        it('clears emotions when no logs found', async () => {
            mockGetEmotionLogs.mockResolvedValue({ emotionLogs: [] });

            const { loadEmotions, selectedEmotions, dailyNote, positiveEmotions, toggleEmotion } = setup();
            toggleEmotion(positiveEmotions.value[0]);
            await loadEmotions();

            expect(selectedEmotions.value).toHaveLength(0);
            expect(dailyNote.value).toBe('');
        });

        it('handles load errors gracefully', async () => {
            mockGetEmotionLogs.mockRejectedValue(new Error('fail'));

            const { loadEmotions, selectedEmotions } = setup();
            await loadEmotions();

            expect(selectedEmotions.value).toHaveLength(0);
        });

        it('sets loadingEmotions flag during load', async () => {
            let resolveLoad: (v: unknown) => void;
            mockGetEmotionLogs.mockReturnValue(new Promise((r) => (resolveLoad = r)));

            const { loadEmotions, loadingEmotions } = setup();
            const loadPromise = loadEmotions();
            expect(loadingEmotions.value).toBe(true);

            resolveLoad!({ emotionLogs: [] });
            await loadPromise;
            expect(loadingEmotions.value).toBe(false);
        });
    });

    describe('loadAnalytics', () => {
        it('loads analytics from store', async () => {
            const mockData = { totalDays: 30, topEmotions: [], averagePerDay: 5, positiveNegativeRatio: '0.60' };
            mockGetEmotionAnalytics.mockResolvedValue(mockData);

            const { loadAnalytics, analytics } = setup();
            await loadAnalytics();

            expect(analytics.value).toEqual(mockData);
            expect(mockGetEmotionAnalytics).toHaveBeenCalledWith(90);
        });

        it('sets analytics to null on error', async () => {
            mockGetEmotionAnalytics.mockRejectedValue(new Error('fail'));

            const { loadAnalytics, analytics } = setup();
            await loadAnalytics();

            expect(analytics.value).toBeNull();
        });

        it('sets loading flag during analytics load', async () => {
            let resolveLoad: (v: unknown) => void;
            mockGetEmotionAnalytics.mockReturnValue(new Promise((r) => (resolveLoad = r)));

            const { loadAnalytics, loading } = setup();
            const loadPromise = loadAnalytics();
            expect(loading.value).toBe(true);

            resolveLoad!({ totalDays: 0, topEmotions: [] });
            await loadPromise;
            expect(loading.value).toBe(false);
        });
    });

    describe('handleNoteInput', () => {
        it('debounces save by 1500ms', async () => {
            const { handleNoteInput } = setup();
            handleNoteInput();
            expect(mockSaveEmotionLog).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1500);
            await vi.waitFor(() => {
                expect(mockSaveEmotionLog).toHaveBeenCalled();
            });
        });

        it('resets timer on repeated calls', () => {
            const { handleNoteInput } = setup();
            handleNoteInput();
            vi.advanceTimersByTime(1000);
            handleNoteInput();
            vi.advanceTimersByTime(1000);
            expect(mockSaveEmotionLog).not.toHaveBeenCalled();
        });
    });

    describe('saveEmotions reloads analytics when on analytics tab', () => {
        it('reloads analytics after save when activeTab is analytics', async () => {
            activeTab.value = 'analytics';
            const { toggleEmotion, positiveEmotions } = setup();
            toggleEmotion(positiveEmotions.value[0]);

            await vi.waitFor(() => {
                expect(mockSaveEmotionLog).toHaveBeenCalled();
            });
            await vi.waitFor(() => {
                expect(mockGetEmotionAnalytics).toHaveBeenCalled();
            });
        });
    });
});
