// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useEightfoldPath } from '@/renderer/composables/useEightfoldPath';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

const mockSaveEightfoldPathLog = vi.fn().mockResolvedValue({ message: 'ok' });
const mockGetEightfoldPathLogs = vi.fn().mockResolvedValue({ pathLogs: [] });

vi.mock('@/renderer/store', () => ({
    saveEightfoldPathLog: (...args: unknown[]) => mockSaveEightfoldPathLog(...args),
    getEightfoldPathLogs: (...args: unknown[]) => mockGetEightfoldPathLogs(...args),
}));
describe('useEightfoldPath', () => {
    const selectedDate = ref(new Date('2025-01-15'));
    const saveStatus = ref<'saving' | 'saved' | null>(null);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        selectedDate.value = new Date('2025-01-15');
        saveStatus.value = null;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function setup() {
        return useEightfoldPath(selectedDate, saveStatus);
    }

    describe('initial state', () => {
        it('starts with no followed paths', () => {
            const { followedPaths } = setup();
            expect(followedPaths.value).toEqual([]);
        });

        it('starts with empty path notes', () => {
            const { pathNotes } = setup();
            expect(pathNotes.value).toEqual({});
        });

        it('has 8 eightfold path entries', () => {
            const { eightfoldPaths } = setup();
            expect(eightfoldPaths.value).toHaveLength(8);
        });

        it('computes 0% progress initially', () => {
            const { efProgressPercentage } = setup();
            expect(efProgressPercentage.value).toBe(0);
        });
    });

    describe('togglePath', () => {
        it('adds a path when toggled on', () => {
            const { togglePath, followedPaths, isPathFollowed } = setup();
            togglePath('rightView');
            expect(followedPaths.value).toContain('rightView');
            expect(isPathFollowed('rightView')).toBe(true);
        });

        it('removes a path when toggled off', () => {
            const { togglePath, followedPaths } = setup();
            togglePath('rightView');
            togglePath('rightView');
            expect(followedPaths.value).not.toContain('rightView');
        });

        it('clears notes when a path is toggled off', () => {
            const { togglePath, pathNotes } = setup();
            togglePath('rightView');
            pathNotes.value['rightView'] = 'Some note';
            togglePath('rightView');
            expect(pathNotes.value['rightView']).toBeUndefined();
        });

        it('calls savePathData which invokes store', async () => {
            const { togglePath } = setup();
            togglePath('rightView');
            await vi.waitFor(() => {
                expect(mockSaveEightfoldPathLog).toHaveBeenCalled();
            });
        });
    });

    describe('computed progress', () => {
        it('calculates percentage based on followed paths', () => {
            const { togglePath, efProgressPercentage, efCompletedCount } = setup();
            togglePath('rightView');
            togglePath('rightSpeech');
            expect(efCompletedCount.value).toBe(2);
            expect(efProgressPercentage.value).toBe(25);
        });
    });

    describe('loadPathData', () => {
        it('loads followed paths from store response', async () => {
            mockGetEightfoldPathLogs.mockResolvedValue({
                pathLogs: [
                    {
                        paths: [
                            { path: 'rightView', note: 'reflected' },
                            { path: 'rightSpeech', note: '' },
                        ],
                    },
                ],
            });

            const { loadPathData, followedPaths, pathNotes } = setup();
            await loadPathData();

            expect(followedPaths.value).toEqual(['rightView', 'rightSpeech']);
            expect(pathNotes.value['rightView']).toBe('reflected');
        });

        it('resets state when no logs found', async () => {
            mockGetEightfoldPathLogs.mockResolvedValue({ pathLogs: [] });

            const { loadPathData, followedPaths, pathNotes } = setup();
            followedPaths.value = ['rightView'];
            pathNotes.value['rightView'] = 'old note';

            await loadPathData();

            expect(followedPaths.value).toEqual([]);
            expect(pathNotes.value).toEqual({});
        });

        it('handles load errors gracefully', async () => {
            mockGetEightfoldPathLogs.mockRejectedValue(new Error('fail'));

            const { loadPathData, followedPaths } = setup();
            await loadPathData();
            expect(followedPaths.value).toEqual([]);
        });
    });

    describe('debouncedSavePath', () => {
        it('waits 1 second before saving', async () => {
            const { debouncedSavePath } = setup();
            debouncedSavePath();
            expect(mockSaveEightfoldPathLog).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1000);
            await nextTick();
            await vi.waitFor(() => {
                expect(mockSaveEightfoldPathLog).toHaveBeenCalled();
            });
        });

        it('resets the timer on subsequent calls', async () => {
            const { debouncedSavePath } = setup();
            debouncedSavePath();
            vi.advanceTimersByTime(500);
            debouncedSavePath();
            vi.advanceTimersByTime(500);
            expect(mockSaveEightfoldPathLog).not.toHaveBeenCalled();

            vi.advanceTimersByTime(500);
            await nextTick();
            await vi.waitFor(() => {
                expect(mockSaveEightfoldPathLog).toHaveBeenCalledTimes(1);
            });
        });
    });
});
