import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, computed } from 'vue';
import { mountWithI18n } from '@test-utils';

const selectedEmotions = ref<{ name: string }[]>([]);
const dailyNote = ref('');
const saveStatus = ref<'saving' | 'saved' | null>(null);
const loadingEmotions = ref(false);
const loading = ref(false);
const analytics = ref<unknown>(null);

const positiveEmotions = ref([
    { name: 'calm', type: 'positive', displayName: 'Calm', description: 'settled' },
    { name: 'glad', type: 'positive', displayName: 'Glad', description: 'light' },
]);
const negativeEmotions = ref([{ name: 'tense', type: 'negative', displayName: 'Tense', description: 'tight' }]);

const mockToggleEmotion = vi.fn();
const mockHandleNoteInput = vi.fn();
const mockLoadEmotions = vi.fn().mockResolvedValue(undefined);
const mockLoadAnalytics = vi.fn().mockResolvedValue(undefined);
const mockTogglePath = vi.fn();
const mockDebouncedSavePath = vi.fn();
const mockLoadPathData = vi.fn().mockResolvedValue(undefined);

vi.mock('@/renderer/composables/useEmotions', () => ({
    useEmotions: () => ({
        selectedEmotions,
        dailyNote,
        saveStatus,
        loadingEmotions,
        loading,
        analytics,
        positiveEmotions,
        negativeEmotions,
        positiveCount: computed(() => selectedEmotions.value.length),
        negativeCount: computed(() => 0),
        pnRatio: computed(() => '1.00'),
        topPositiveEmotions: computed(() => []),
        topNegativeEmotions: computed(() => []),
        isEmotionSelected: (name: string) => selectedEmotions.value.some((e) => e.name === name),
        getTranslatedEmotionName: (name: string) => name,
        toggleEmotion: mockToggleEmotion,
        handleNoteInput: mockHandleNoteInput,
        loadEmotions: mockLoadEmotions,
        loadAnalytics: mockLoadAnalytics,
    }),
}));

vi.mock('@/renderer/composables/useEightfoldPath', () => ({
    useEightfoldPath: () => ({
        followedPaths: ref<string[]>([]),
        pathNotes: ref<Record<string, string>>({}),
        loadingPath: ref(false),
        eightfoldPaths: ref([{ key: 'view', displayName: 'Right view', description: 'd', questions: 'q' }]),
        efCompletedCount: computed(() => 0),
        efProgressPercentage: computed(() => 0),
        isPathFollowed: () => false,
        togglePath: mockTogglePath,
        debouncedSavePath: mockDebouncedSavePath,
        loadPathData: mockLoadPathData,
    }),
}));

const EmotionTracker = (await import('@/renderer/components/EmotionTracker.vue')).default;

const NOW = new Date(2025, 2, 12, 9, 0, 0);
const mountTracker = () => mountWithI18n(EmotionTracker);
const tabs = (wrapper: ReturnType<typeof mountTracker>) => wrapper.findAll('.inline-tab');

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    selectedEmotions.value = [];
    saveStatus.value = null;
    loadingEmotions.value = false;
});

afterEach(() => {
    vi.useRealTimers();
});

describe('EmotionTracker', () => {
    it('loads today on mount', () => {
        const wrapper = mountTracker();

        expect(mockLoadEmotions).toHaveBeenCalled();
        expect(wrapper.find('.inline-date-text').text()).toBe('Mar 12, 2025');
        wrapper.unmount();
    });

    it('emits close from the header button', async () => {
        const wrapper = mountTracker();

        await wrapper.find('.inline-close-btn').trigger('click');

        expect(wrapper.emitted('close')).toHaveLength(1);
        wrapper.unmount();
    });

    describe('date strip', () => {
        it('steps back a day and reloads both views for it', async () => {
            const wrapper = mountTracker();
            vi.clearAllMocks();

            await wrapper.findAll('.inline-date-btn')[0].trigger('click');

            expect(wrapper.find('.inline-date-text').text()).toBe('Mar 11, 2025');
            expect(mockLoadEmotions).toHaveBeenCalled();
            expect(mockLoadPathData).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('disables the forward step on today, because the future is not trackable', () => {
            const wrapper = mountTracker();

            expect(wrapper.findAll('.inline-date-btn')[1].attributes('disabled')).toBeDefined();
            wrapper.unmount();
        });

        it('re-enables the forward step once the day is in the past, and walks back to today', async () => {
            const wrapper = mountTracker();

            await wrapper.findAll('.inline-date-btn')[0].trigger('click');
            expect(wrapper.findAll('.inline-date-btn')[1].attributes('disabled')).toBeUndefined();

            await wrapper.findAll('.inline-date-btn')[1].trigger('click');
            expect(wrapper.find('.inline-date-text').text()).toBe('Mar 12, 2025');
            wrapper.unmount();
        });

        it('refuses to step past today even when the button is invoked directly', async () => {
            const wrapper = mountTracker();

            await wrapper.findAll('.inline-date-btn')[1].trigger('click');

            expect(wrapper.find('.inline-date-text').text()).toBe('Mar 12, 2025');
            wrapper.unmount();
        });
    });

    describe('tabs', () => {
        it('counts the emotions on each list in its own tab label', () => {
            const wrapper = mountTracker();

            expect(tabs(wrapper)[0].text()).toContain('(2)');
            expect(tabs(wrapper)[1].text()).toContain('(1)');
            wrapper.unmount();
        });

        it('opens on the positive list', () => {
            const wrapper = mountTracker();

            expect(tabs(wrapper)[0].classes()).toContain('active');
            expect(
                wrapper.findAll('.inline-emotion-item').map((item) => item.find('.inline-emotion-name').text()),
            ).toEqual(['Calm', 'Glad']);
            wrapper.unmount();
        });

        it('swaps to the negative list without touching the storage layer', async () => {
            const wrapper = mountTracker();
            vi.clearAllMocks();

            await tabs(wrapper)[1].trigger('click');

            expect(
                wrapper.findAll('.inline-emotion-item').map((item) => item.find('.inline-emotion-name').text()),
            ).toEqual(['Tense']);
            expect(mockLoadAnalytics).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        it('loads analytics the first time the analytics tab is opened', async () => {
            const wrapper = mountTracker();

            await tabs(wrapper)[2].trigger('click');
            await wrapper.vm.$nextTick();

            expect(mockLoadAnalytics).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('loads the day again when the eightfold tab is opened', async () => {
            const wrapper = mountTracker();
            vi.clearAllMocks();

            await tabs(wrapper)[3].trigger('click');
            await wrapper.vm.$nextTick();

            expect(mockLoadPathData).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('shows the note field on the notes tab', async () => {
            const wrapper = mountTracker();

            await tabs(wrapper)[4].trigger('click');

            expect(wrapper.find('textarea').exists()).toBe(true);
            wrapper.unmount();
        });
    });

    describe('emotion list', () => {
        it('checks the emotions already recorded for the day', () => {
            selectedEmotions.value = [{ name: 'glad' }];
            const wrapper = mountTracker();

            const checked = wrapper
                .findAll<HTMLInputElement>('.inline-emotion-item input')
                .map((box) => box.element.checked);
            expect(checked).toEqual([false, true]);
            wrapper.unmount();
        });

        it('hands the whole emotion to the composable, not just its name', async () => {
            const wrapper = mountTracker();

            await wrapper.findAll('.inline-emotion-item input')[0].trigger('change');

            expect(mockToggleEmotion).toHaveBeenCalledWith(positiveEmotions.value[0]);
            wrapper.unmount();
        });

        it('shows the loading line instead of the list while the day is being read', () => {
            loadingEmotions.value = true;
            const wrapper = mountTracker();

            expect(wrapper.find('.loading').exists()).toBe(true);
            expect(wrapper.find('.inline-emotion-item').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe('save indicator', () => {
        it('stays hidden while nothing is being written', () => {
            const wrapper = mountTracker();

            expect(wrapper.find('.save-indicator').exists()).toBe(false);
            wrapper.unmount();
        });

        it('shows a spinner while saving and a tick once saved', async () => {
            const wrapper = mountTracker();

            saveStatus.value = 'saving';
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.save-spinner').exists()).toBe(true);

            saveStatus.value = 'saved';
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.save-spinner').exists()).toBe(false);
            expect(wrapper.find('.save-indicator svg').exists()).toBe(true);
            wrapper.unmount();
        });
    });
});
