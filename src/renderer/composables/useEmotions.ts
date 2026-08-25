/**
 * useEmotions — emotion selection state, save/load for a given date, and analytics.
 * Owns: emotion key lists, computed translated lists, toggle, persistence calls, analytics load.
 * Does NOT own: date navigation (EmotionTracker.vue), rendering (EmotionTracker.vue).
 */
import { ref, computed, type ComputedRef, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEmotionLog, getEmotionLogs, getEmotionAnalytics } from '@/renderer/store';
import type { EmotionAnalytics, EmotionStat } from '@/renderer/store/types';
import { log } from '@/renderer/utils/logger';

type Emotion = {
    name: string;
    type: 'positive' | 'negative';
    displayName: string;
    description: string;
};

type EmotionsState = {
    // State
    selectedEmotions: Ref<Emotion[]>;
    dailyNote: Ref<string>;
    saveStatus: Ref<'saving' | 'saved' | null>;
    loadingEmotions: Ref<boolean>;
    loading: Ref<boolean>;
    analytics: Ref<EmotionAnalytics | null>;
    // Computed
    positiveEmotions: ComputedRef<Emotion[]>;
    negativeEmotions: ComputedRef<Emotion[]>;
    positiveCount: ComputedRef<number>;
    negativeCount: ComputedRef<number>;
    pnRatio: ComputedRef<string>;
    topPositiveEmotions: ComputedRef<EmotionStat[]>;
    topNegativeEmotions: ComputedRef<EmotionStat[]>;
    // Methods
    isEmotionSelected: (name: string) => boolean;
    getTranslatedEmotionName: (englishName: string) => string;
    toggleEmotion: (emotion: Emotion) => void;
    handleNoteInput: () => void;
    loadEmotions: () => Promise<void>;
    loadAnalytics: () => Promise<void>;
};

const positiveEmotionKeys = [
    'Joy',
    'Happiness',
    'Contentment',
    'Satisfaction',
    'Pride',
    'Gratitude',
    'Love',
    'Affection',
    'Compassion',
    'Excitement',
    'Enthusiasm',
    'Optimism',
    'Hope',
    'Relief',
    'Amusement',
    'Delight',
    'Inspiration',
    'Confidence',
    'Calm',
    'Serenity',
    'Peaceful',
    'Accomplished',
    'Validated',
    'Accepted',
    'Belonging',
    'Curiosity',
    'Wonder',
    'Awe',
];

const negativeEmotionKeys = [
    'Sadness',
    'Grief',
    'Despair',
    'Loneliness',
    'Anger',
    'Rage',
    'Frustration',
    'Irritation',
    'Fear',
    'Anxiety',
    'Dread',
    'Panic',
    'Shame',
    'Guilt',
    'Embarrassment',
    'Humiliation',
    'Disgust',
    'Contempt',
    'Jealousy',
    'Envy',
    'Resentment',
    'Bitterness',
    'Regret',
    'Disappointment',
    'Discouragement',
    'Helplessness',
    'Hopelessness',
    'Inadequacy',
    'Insecurity',
    'Vulnerability',
    'Stress',
    'Tension',
    'Worry',
    'Doubt',
    'Confusion',
    'Overwhelm',
    'Betrayal',
    'Hurt',
    'Rejection',
];

export function useEmotions(selectedDate: Ref<Date>, activeTab: Ref<string>): EmotionsState {
    const { t } = useI18n();

    // View state
    const selectedEmotions = ref<Emotion[]>([]);
    const dailyNote = ref('');
    const saveStatus = ref<'saving' | 'saved' | null>(null);
    const loadingEmotions = ref(false);
    // Named `loading` to match the template binding in EmotionTracker.vue
    const loading = ref(false);
    const analytics = ref<EmotionAnalytics | null>(null);

    let noteTimeout: number | null = null;

    // Translated emotion lists
    const positiveEmotions = computed<Emotion[]>(() =>
        positiveEmotionKeys.map((key) => ({
            name: key,
            type: 'positive' as const,
            displayName: t(`emotions.list.${key}.name`),
            description: t(`emotions.list.${key}.description`),
        })),
    );

    const negativeEmotions = computed<Emotion[]>(() =>
        negativeEmotionKeys.map((key) => ({
            name: key,
            type: 'negative' as const,
            displayName: t(`emotions.list.${key}.name`),
            description: t(`emotions.list.${key}.description`),
        })),
    );

    // Derived counts
    const positiveCount = computed(
        () => selectedEmotions.value.filter((emotion) => emotion.type === 'positive').length,
    );
    const negativeCount = computed(
        () => selectedEmotions.value.filter((emotion) => emotion.type === 'negative').length,
    );
    const pnRatio = computed(() => {
        const total = positiveCount.value + negativeCount.value;
        return total === 0 ? '0.00' : (positiveCount.value / total).toFixed(2);
    });

    const topPositiveEmotions = computed(() =>
        (analytics.value?.topEmotions ?? []).filter((stat: EmotionStat) => stat.type === 'positive').slice(0, 10),
    );
    const topNegativeEmotions = computed(() =>
        (analytics.value?.topEmotions ?? []).filter((stat: EmotionStat) => stat.type === 'negative').slice(0, 10),
    );

    function isEmotionSelected(name: string): boolean {
        return selectedEmotions.value.some((emotion) => emotion.name === name);
    }

    function getTranslatedEmotionName(englishName: string): string {
        const all = [...positiveEmotions.value, ...negativeEmotions.value];
        return all.find((emotion) => emotion.name === englishName)?.displayName ?? englishName;
    }

    async function saveEmotions(): Promise<void> {
        saveStatus.value = 'saving';
        try {
            await saveEmotionLog(
                selectedDate.value.toISOString(),
                selectedEmotions.value.map((emotion) => ({ name: emotion.name, type: emotion.type })),
                dailyNote.value.length > 0 ? dailyNote.value : undefined,
            );
            saveStatus.value = 'saved';
            if (activeTab.value === 'analytics') await loadAnalytics();
            setTimeout(() => {
                saveStatus.value = null;
            }, 2000);
        } catch (err) {
            log.error('Emotions save failed', err);
            saveStatus.value = null;
        }
    }

    async function loadEmotions(): Promise<void> {
        loadingEmotions.value = true;
        try {
            const start = new Date(selectedDate.value);
            start.setHours(0, 0, 0, 0);
            const end = new Date(selectedDate.value);
            end.setHours(23, 59, 59, 999);

            const response = await getEmotionLogs({ startDate: start.toISOString(), endDate: end.toISOString() });

            if (response.emotionLogs?.length > 0) {
                const loaded = response.emotionLogs[0].emotions ?? [];
                const all = [...positiveEmotions.value, ...negativeEmotions.value];
                selectedEmotions.value = loaded.map(
                    (entry: { name: string; type: string }) =>
                        all.find((full) => full.name === entry.name) ?? (entry as Emotion),
                );
                dailyNote.value = response.emotionLogs[0].note ?? '';
            } else {
                selectedEmotions.value = [];
                dailyNote.value = '';
            }
        } catch (err) {
            log.error('Emotions load failed', err);
            selectedEmotions.value = [];
        } finally {
            loadingEmotions.value = false;
        }
    }

    async function loadAnalytics(): Promise<void> {
        loading.value = true;
        try {
            analytics.value = await getEmotionAnalytics(90);
        } catch (err) {
            log.error('Emotion analytics load failed', err);
            analytics.value = null;
        } finally {
            loading.value = false;
        }
    }

    function toggleEmotion(emotion: Emotion): void {
        const idx = selectedEmotions.value.findIndex((selected) => selected.name === emotion.name);
        if (idx > -1) selectedEmotions.value.splice(idx, 1);
        else selectedEmotions.value.push(emotion);
        void saveEmotions();
    }

    // Named `handleNoteInput` to match the template binding in EmotionTracker.vue
    function handleNoteInput(): void {
        if (noteTimeout !== null) clearTimeout(noteTimeout);
        noteTimeout = window.setTimeout(() => {
            void saveEmotions();
        }, 1500);
    }

    return {
        // State
        selectedEmotions,
        dailyNote,
        saveStatus,
        loadingEmotions,
        loading,
        analytics,
        // Computed
        positiveEmotions,
        negativeEmotions,
        positiveCount,
        negativeCount,
        pnRatio,
        topPositiveEmotions,
        topNegativeEmotions,
        // Methods
        isEmotionSelected,
        getTranslatedEmotionName,
        toggleEmotion,
        handleNoteInput,
        loadEmotions,
        loadAnalytics,
    };
}
