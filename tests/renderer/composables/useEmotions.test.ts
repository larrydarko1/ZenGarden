import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

import { useEmotions } from '@/renderer/composables/useEmotions';
import type * as Store from '@/renderer/store';
import type { EmotionAnalytics, EmotionLog } from '@/renderer/store/types';
import { nth } from '@test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

const mockSaveEmotionLog = vi
    .fn<typeof Store.saveEmotionLog>()
    .mockResolvedValue({ message: 'ok', emotionLog: emotionLog() });
const mockGetEmotionLogs = vi.fn<typeof Store.getEmotionLogs>().mockResolvedValue({ emotionLogs: [] });
const mockGetEmotionAnalytics = vi.fn<typeof Store.getEmotionAnalytics>().mockResolvedValue(analyticsOf());

vi.mock('@/renderer/store', () => ({
    saveEmotionLog: (...args: Parameters<typeof Store.saveEmotionLog>) => mockSaveEmotionLog(...args),
    getEmotionLogs: (...args: Parameters<typeof Store.getEmotionLogs>) => mockGetEmotionLogs(...args),
    getEmotionAnalytics: (...args: Parameters<typeof Store.getEmotionAnalytics>) => mockGetEmotionAnalytics(...args),
}));

function emotionLog(fields: Partial<EmotionLog> = {}): EmotionLog {
    return {
        date: '2026-01-01',
        emotions: [],
        positiveCount: 0,
        negativeCount: 0,
        pnRatio: 0,
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...fields,
    };
}

function analyticsOf(fields: Partial<EmotionAnalytics> = {}): EmotionAnalytics {
    return {
        totalDays: 0,
        averagePositiveCount: 0,
        averageNegativeCount: 0,
        averagePNRatio: 0,
        emotionDiversity: 0,
        positiveDays: 0,
        negativeDays: 0,
        topEmotions: [],
        trends: [],
        ...fields,
    };
}

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

    describe('emotion lists', () => {
        it('provides positive emotions', () => {
            const { positiveEmotions } = setup();
            expect(positiveEmotions.value.length).toBeGreaterThan(0);
            expect(nth(positiveEmotions.value, 0)).toMatchObject({ type: 'positive' });
        });

        it('provides negative emotions', () => {
            const { negativeEmotions } = setup();
            expect(negativeEmotions.value.length).toBeGreaterThan(0);
            expect(nth(negativeEmotions.value, 0)).toMatchObject({ type: 'negative' });
        });

        it('translates emotion names via i18n key', () => {
            const { positiveEmotions } = setup();
            expect(nth(positiveEmotions.value, 0).displayName).toContain('emotions.list.');
        });
    });

    describe('toggleEmotion', () => {
        it('adds an emotion when toggled on', () => {
            const { toggleEmotion, selectedEmotions, positiveEmotions } = setup();
            const joy = nth(positiveEmotions.value, 0);
            toggleEmotion(joy);
            expect(selectedEmotions.value).toContainEqual(joy);
        });

        it('removes an emotion when toggled off', () => {
            const { toggleEmotion, selectedEmotions, positiveEmotions } = setup();
            const joy = nth(positiveEmotions.value, 0);
            toggleEmotion(joy);
            toggleEmotion(joy);
            expect(selectedEmotions.value).not.toContainEqual(joy);
        });

        it('calls saveEmotionLog after toggling', async () => {
            const { toggleEmotion, positiveEmotions } = setup();
            toggleEmotion(nth(positiveEmotions.value, 0));
            await vi.waitFor(() => {
                expect(mockSaveEmotionLog).toHaveBeenCalled();
            });
        });
    });

    describe('isEmotionSelected', () => {
        it('returns true for selected emotions', () => {
            const { toggleEmotion, isEmotionSelected, positiveEmotions } = setup();
            const joy = nth(positiveEmotions.value, 0);
            toggleEmotion(joy);
            expect(isEmotionSelected(joy.name)).toBe(true);
        });

        it('returns false for unselected emotions', () => {
            const { isEmotionSelected } = setup();
            expect(isEmotionSelected('Joy')).toBe(false);
        });
    });

    describe('computed counts', () => {
        it('counts positive and negative separately', () => {
            const { toggleEmotion, positiveCount, negativeCount, positiveEmotions, negativeEmotions } = setup();
            toggleEmotion(nth(positiveEmotions.value, 0));
            toggleEmotion(nth(negativeEmotions.value, 0));
            expect(positiveCount.value).toBe(1);
            expect(negativeCount.value).toBe(1);
        });

        it('calculates pnRatio correctly', () => {
            const { toggleEmotion, pnRatio, positiveEmotions, negativeEmotions } = setup();
            toggleEmotion(nth(positiveEmotions.value, 0));
            toggleEmotion(nth(positiveEmotions.value, 1));
            toggleEmotion(nth(negativeEmotions.value, 0));
            expect(pnRatio.value).toBe('0.67');
        });

        it('returns 0.00 when no emotions selected', () => {
            const { pnRatio } = setup();
            expect(pnRatio.value).toBe('0.00');
        });
    });

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
            expect(nth(topPositiveEmotions.value, 0).name).toBe('Joy');
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
            expect(nth(topNegativeEmotions.value, 0).name).toBe('Sadness');
        });
    });

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

    describe('loadEmotions', () => {
        it('loads emotions from store for selected date', async () => {
            mockGetEmotionLogs.mockResolvedValue({
                emotionLogs: [
                    emotionLog({
                        emotions: [
                            { name: 'Joy', type: 'positive' },
                            { name: 'Sadness', type: 'negative' },
                        ],
                        note: 'A good day',
                    }),
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
            toggleEmotion(nth(positiveEmotions.value, 0));
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
            let resolveLoad: (value: { emotionLogs: EmotionLog[] }) => void = () => {};
            mockGetEmotionLogs.mockReturnValue(new Promise((r) => (resolveLoad = r)));

            const { loadEmotions, loadingEmotions } = setup();
            const loadPromise = loadEmotions();
            expect(loadingEmotions.value).toBe(true);

            resolveLoad({ emotionLogs: [] });
            await loadPromise;
            expect(loadingEmotions.value).toBe(false);
        });
    });

    describe('loadAnalytics', () => {
        it('loads analytics from store', async () => {
            const mockData = analyticsOf({ totalDays: 30, averagePNRatio: 0.6 });
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
            let resolveLoad: (value: EmotionAnalytics) => void = () => {};
            mockGetEmotionAnalytics.mockReturnValue(new Promise((r) => (resolveLoad = r)));

            const { loadAnalytics, loading } = setup();
            const loadPromise = loadAnalytics();
            expect(loading.value).toBe(true);

            resolveLoad(analyticsOf());
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
            toggleEmotion(nth(positiveEmotions.value, 0));

            await vi.waitFor(() => {
                expect(mockSaveEmotionLog).toHaveBeenCalled();
            });
            await vi.waitFor(() => {
                expect(mockGetEmotionAnalytics).toHaveBeenCalled();
            });
        });
    });
});
