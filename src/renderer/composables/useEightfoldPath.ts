// useEightfoldPath — Noble Eightfold Path tracking state and persistence for a given day.
// Owns: path key list, translated path objects, follow/unfollow, note debounce, persistence.
// Does NOT own: date navigation (EmotionTracker.vue), save indicator display (EmotionTracker.vue).

import { ref, computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEightfoldPathLog, getEightfoldPathLogs } from '../store';

// ─── Static keys ──────────────────────────────────────────────────────────────

const eightfoldPathKeys = [
    'rightView',
    'rightIntention',
    'rightSpeech',
    'rightAction',
    'rightLivelihood',
    'rightEffort',
    'rightMindfulness',
    'rightConcentration',
];

// ─── Composable ───────────────────────────────────────────────────────────────

export function useEightfoldPath(selectedDate: Ref<Date>, saveStatus: Ref<'saving' | 'saved' | null>) {
    const { t } = useI18n();

    const followedPaths = ref<string[]>([]);
    const pathNotes = ref<Record<string, string>>({});
    const loadingPath = ref(false);
    let pathSaveTimeout: number | null = null;

    const eightfoldPaths = computed(() =>
        eightfoldPathKeys.map((key) => ({
            key,
            displayName: t(`eightfold.paths.${key}.name`),
            description: t(`eightfold.paths.${key}.description`),
            questions: t(`eightfold.paths.${key}.questions`),
        })),
    );

    const efCompletedCount = computed(() => followedPaths.value.length);
    const efProgressPercentage = computed(() => Math.round((efCompletedCount.value / 8) * 100));

    function isPathFollowed(pathKey: string): boolean {
        return followedPaths.value.includes(pathKey);
    }

    function togglePath(pathKey: string) {
        if (isPathFollowed(pathKey)) {
            followedPaths.value = followedPaths.value.filter((p) => p !== pathKey);
            delete pathNotes.value[pathKey];
        } else {
            followedPaths.value.push(pathKey);
        }
        savePathData();
    }

    async function savePathData() {
        saveStatus.value = 'saving';
        try {
            const pathData = followedPaths.value.map((key) => ({
                path: key,
                note: pathNotes.value[key] ?? '',
            }));
            await saveEightfoldPathLog(selectedDate.value.toISOString(), pathData);
            saveStatus.value = 'saved';
            setTimeout(() => {
                saveStatus.value = null;
            }, 2000);
        } catch (err) {
            console.error('[useEightfoldPath] save failed', err);
            saveStatus.value = null;
        }
    }

    function debouncedSavePath() {
        if (pathSaveTimeout !== null) clearTimeout(pathSaveTimeout);
        pathSaveTimeout = window.setTimeout(() => savePathData(), 1000);
    }

    async function loadPathData() {
        loadingPath.value = true;
        try {
            const start = new Date(selectedDate.value);
            start.setHours(0, 0, 0, 0);
            const end = new Date(selectedDate.value);
            end.setHours(23, 59, 59, 999);

            const response = await getEightfoldPathLogs({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });

            if (response.pathLogs?.length > 0) {
                const log = response.pathLogs[0];
                followedPaths.value = log.paths.map((p: { path: string }) => p.path);
                pathNotes.value = {};
                log.paths.forEach((p: { path: string; note?: string }) => {
                    if (p.note) pathNotes.value[p.path] = p.note;
                });
            } else {
                followedPaths.value = [];
                pathNotes.value = {};
            }
        } catch (err) {
            console.error('[useEightfoldPath] load failed', err);
            followedPaths.value = [];
            pathNotes.value = {};
        } finally {
            loadingPath.value = false;
        }
    }

    return {
        followedPaths,
        pathNotes,
        loadingPath,
        eightfoldPaths,
        efCompletedCount,
        efProgressPercentage,
        isPathFollowed,
        togglePath,
        savePathData,
        debouncedSavePath,
        loadPathData,
    };
}
