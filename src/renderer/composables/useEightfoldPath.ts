/**
 * useEightfoldPath — Noble Eightfold Path tracking state and persistence for a given day.
 * Owns: path key list, translated path objects, follow/unfollow, note debounce, persistence.
 * Does NOT own: date navigation (EmotionTracker.vue), save indicator display (EmotionTracker.vue).
 */
import { ref, computed, type ComputedRef, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEightfoldPathLog, getEightfoldPathLogs } from '@/renderer/store';
import { log } from '@/renderer/utils/logger';

type TranslatedPath = { key: string; displayName: string; description: string; questions: string };

type EightfoldPathState = {
    followedPaths: Ref<string[]>;
    pathNotes: Ref<Record<string, string>>;
    loadingPath: Ref<boolean>;
    eightfoldPaths: ComputedRef<TranslatedPath[]>;
    efCompletedCount: ComputedRef<number>;
    efProgressPercentage: ComputedRef<number>;
    isPathFollowed: (pathKey: string) => boolean;
    togglePath: (pathKey: string) => void;
    savePathData: () => Promise<void>;
    debouncedSavePath: () => void;
    loadPathData: () => Promise<void>;
};

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

export function useEightfoldPath(
    selectedDate: Ref<Date>,
    saveStatus: Ref<'saving' | 'saved' | null>,
): EightfoldPathState {
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

    function togglePath(pathKey: string): void {
        if (isPathFollowed(pathKey)) {
            followedPaths.value = followedPaths.value.filter((key) => key !== pathKey);
            pathNotes.value = Object.fromEntries(Object.entries(pathNotes.value).filter(([key]) => key !== pathKey));
        } else {
            followedPaths.value.push(pathKey);
        }
        void savePathData();
    }

    async function savePathData(): Promise<void> {
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
            log.error('Eightfold path save failed', err);
            saveStatus.value = null;
        }
    }

    function debouncedSavePath(): void {
        if (pathSaveTimeout !== null) clearTimeout(pathSaveTimeout);
        pathSaveTimeout = window.setTimeout(() => {
            void savePathData();
        }, 1000);
    }

    async function loadPathData(): Promise<void> {
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
                const pathLog = response.pathLogs[0];
                followedPaths.value = pathLog.paths.map((entry: { path: string }) => entry.path);
                pathNotes.value = {};
                pathLog.paths.forEach((entry: { path: string; note?: string }) => {
                    if (entry.note !== undefined && entry.note.length > 0) pathNotes.value[entry.path] = entry.note;
                });
            } else {
                followedPaths.value = [];
                pathNotes.value = {};
            }
        } catch (err) {
            log.error('Eightfold path load failed', err);
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
