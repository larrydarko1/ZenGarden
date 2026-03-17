// useEmotions — emotion selection state, save/load for a given date, and analytics.
// Owns: emotion key lists, computed translated lists, toggle, persistence calls, analytics load.
// Does NOT own: date navigation (EmotionTracker.vue), rendering (EmotionTracker.vue).

import { ref, computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEmotionLog, getEmotionLogs, getEmotionAnalytics } from '../store';
import type { EmotionAnalytics, EmotionStat } from '../store/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Emotion {
    name: string;
    type: 'positive' | 'negative';
    displayName: string;
    description: string;
}

// ─── Static keys ──────────────────────────────────────────────────────────────

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

// ─── Composable ───────────────────────────────────────────────────────────────

export function useEmotions(selectedDate: Ref<Date>, activeTab: Ref<string>) {
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
    const positiveCount = computed(() => selectedEmotions.value.filter((e) => e.type === 'positive').length);
    const negativeCount = computed(() => selectedEmotions.value.filter((e) => e.type === 'negative').length);
    const pnRatio = computed(() => {
        const total = positiveCount.value + negativeCount.value;
        return total === 0 ? '0.00' : (positiveCount.value / total).toFixed(2);
    });

    const topPositiveEmotions = computed(() =>
        (analytics.value?.topEmotions ?? []).filter((e: EmotionStat) => e.type === 'positive').slice(0, 10),
    );
    const topNegativeEmotions = computed(() =>
        (analytics.value?.topEmotions ?? []).filter((e: EmotionStat) => e.type === 'negative').slice(0, 10),
    );

    function isEmotionSelected(name: string): boolean {
        return selectedEmotions.value.some((e) => e.name === name);
    }

    function getTranslatedEmotionName(englishName: string): string {
        const all = [...positiveEmotions.value, ...negativeEmotions.value];
        return all.find((e) => e.name === englishName)?.displayName ?? englishName;
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    async function saveEmotions() {
        saveStatus.value = 'saving';
        try {
            await saveEmotionLog(
                selectedDate.value.toISOString(),
                selectedEmotions.value.map((e) => ({ name: e.name, type: e.type })),
                dailyNote.value || undefined,
            );
            saveStatus.value = 'saved';
            if (activeTab.value === 'analytics') await loadAnalytics();
            setTimeout(() => {
                saveStatus.value = null;
            }, 2000);
        } catch (err) {
            console.error('[useEmotions] save failed', err);
            saveStatus.value = null;
        }
    }

    async function loadEmotions() {
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
                    (e: { name: string; type: string }) => all.find((full) => full.name === e.name) ?? (e as Emotion),
                );
                dailyNote.value = response.emotionLogs[0].note ?? '';
            } else {
                selectedEmotions.value = [];
                dailyNote.value = '';
            }
        } catch (err) {
            console.error('[useEmotions] load failed', err);
            selectedEmotions.value = [];
        } finally {
            loadingEmotions.value = false;
        }
    }

    async function loadAnalytics() {
        loading.value = true;
        try {
            analytics.value = await getEmotionAnalytics(90);
        } catch (err) {
            console.error('[useEmotions] analytics load failed', err);
            analytics.value = null;
        } finally {
            loading.value = false;
        }
    }

    function toggleEmotion(emotion: Emotion) {
        const idx = selectedEmotions.value.findIndex((e) => e.name === emotion.name);
        if (idx > -1) selectedEmotions.value.splice(idx, 1);
        else selectedEmotions.value.push(emotion);
        saveEmotions();
    }

    // Named `handleNoteInput` to match the template binding in EmotionTracker.vue
    function handleNoteInput() {
        if (noteTimeout !== null) clearTimeout(noteTimeout);
        noteTimeout = window.setTimeout(() => saveEmotions(), 1500);
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
