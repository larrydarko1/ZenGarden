import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CapacitorStorageAdapter } from '@/renderer/store/adapters/capacitor';
import { DB_FILES } from '@/renderer/store/adapters/capacitor/db';

/** Files keyed by name, standing in for the vault folder on disk. */
let vault: Record<string, unknown> = {};

vi.mock('@capacitor/preferences', () => ({
    Preferences: { get: vi.fn().mockResolvedValue({ value: null }) },
}));

vi.mock('@/renderer/store/adapters/capacitor/db', () => ({
    DB_FILES: {
        meditations: 'meditations.json',
        emotionLogs: 'emotion_logs.json',
        eightfoldPathLogs: 'eightfold_path_logs.json',
        settings: 'settings.json',
    },
    VAULT_DIR: 'ZenGarden',
    initializeStorage: vi.fn().mockResolvedValue(undefined),
    generateObjectId: vi.fn(() => Math.random().toString(16).substring(2)),
    readCollection: vi.fn((file: string) => Promise.resolve((vault[file] as unknown[]) ?? [])),
    writeCollection: vi.fn((file: string, data: unknown[]) => {
        vault[file] = data;
        return Promise.resolve();
    }),
    readObject: vi.fn((file: string) => Promise.resolve(vault[file] ?? null)),
    writeObject: vi.fn((file: string, data: unknown) => {
        vault[file] = data;
        return Promise.resolve();
    }),
}));

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

function adapter(): CapacitorStorageAdapter {
    return new CapacitorStorageAdapter();
}

beforeEach(() => {
    vault = {};
    vi.clearAllMocks();
});

describe('probeAvailability', () => {
    it('is true when the Capacitor APIs answer', async () => {
        expect(await adapter().probeAvailability()).toBe(true);
    });

    it('is false when they are not there', async () => {
        const { Preferences } = await import('@capacitor/preferences');
        vi.mocked(Preferences.get).mockRejectedValueOnce(new Error('no bridge'));
        expect(await adapter().probeAvailability()).toBe(false);
    });
});

/**
 * Android has no path-based folder picker, so the vault is a fixed location
 * rather than a choice. The UI keys on `canChooseVault` to hide the controls
 * that would otherwise lead nowhere.
 */
describe('vault', () => {
    it('reports the fixed vault location', async () => {
        expect(await adapter().findVaultPath()).toBe('Documents/ZenGarden');
    });

    it('answers chooseVault with the folder already in use', async () => {
        expect(await adapter().chooseVault()).toBe('Documents/ZenGarden');
    });

    it('cannot choose a vault', () => {
        expect(adapter().canChooseVault()).toBe(false);
    });

    it('closing is a no-op', async () => {
        await expect(adapter().closeVault()).resolves.toBeUndefined();
    });
});

describe('settings', () => {
    it('defaults when the vault has no settings file', async () => {
        expect(await adapter().getSettings()).toEqual({ theme: 'dark', language: 'en' });
    });

    it('reads what the vault holds', async () => {
        vault[DB_FILES.settings] = { theme: 'light', language: 'ja' };
        expect(await adapter().getSettings()).toEqual({ theme: 'light', language: 'ja' });
    });

    // The file is in a folder the user can edit; one bad value must not brick it.
    it('falls back per field on a hand-edited file', async () => {
        vault[DB_FILES.settings] = { theme: 'neon', language: 'ja' };
        expect(await adapter().getSettings()).toEqual({ theme: 'dark', language: 'ja' });
    });

    it('updates the theme and keeps the language', async () => {
        vault[DB_FILES.settings] = { theme: 'dark', language: 'ja' };
        expect(await adapter().updateTheme('light')).toEqual({ theme: 'light', language: 'ja' });
        expect(vault[DB_FILES.settings]).toEqual({ theme: 'light', language: 'ja' });
    });

    it('updates the language and keeps the theme', async () => {
        vault[DB_FILES.settings] = { theme: 'light', language: 'en' };
        expect(await adapter().updateLanguage('fr')).toEqual({ theme: 'light', language: 'fr' });
    });
});

describe('meditations', () => {
    it('stores a meditation with no owner field', async () => {
        const res = await adapter().createMeditation({ date: today, duration: 10, notes: 'calm' });

        expect(res.meditation).toMatchObject({ date: today, duration: 10, notes: 'calm' });
        expect(res.meditation._id).toBeTruthy();
        expect(res.meditation).not.toHaveProperty('username');
    });

    it('appends rather than replacing', async () => {
        const store = adapter();
        await store.createMeditation({ date: yesterday, duration: 5, notes: '' });
        await store.createMeditation({ date: today, duration: 10, notes: '' });

        expect((await store.getMeditations()).meditations).toHaveLength(2);
    });

    // Every record in the folder belongs to the vault — there is nothing to filter on.
    it('returns everything in the vault', async () => {
        vault[DB_FILES.meditations] = [
            { _id: '1', date: today },
            { _id: '2', date: yesterday },
        ];
        expect((await adapter().getMeditations()).meditations).toHaveLength(2);
    });
});

describe('emotion logs', () => {
    const joy = { name: 'joy', type: 'positive' as const };
    const worry = { name: 'worry', type: 'negative' as const };

    it('counts positives and negatives', async () => {
        const res = await adapter().saveEmotionLog({ date: today, emotions: [joy, joy, worry] });

        expect(res.emotionLog.positiveCount).toBe(2);
        expect(res.emotionLog.negativeCount).toBe(1);
    });

    it('overwrites the entry for a date rather than adding a second one', async () => {
        const store = adapter();
        await store.saveEmotionLog({ date: today, emotions: [joy] });
        await store.saveEmotionLog({ date: today, emotions: [worry] });

        const { emotionLogs } = await store.getEmotionLogs();
        expect(emotionLogs).toHaveLength(1);
        expect(emotionLogs[0].emotions).toEqual([worry]);
    });

    it('keeps the id when it overwrites', async () => {
        const store = adapter();
        const first = await store.saveEmotionLog({ date: today, emotions: [joy] });
        const second = await store.saveEmotionLog({ date: today, emotions: [worry] });

        expect(second.emotionLog._id).toBe(first.emotionLog._id);
    });

    it('filters by date range', async () => {
        vault[DB_FILES.emotionLogs] = [
            { _id: '1', date: '2025-01-01' },
            { _id: '2', date: '2025-01-10' },
            { _id: '3', date: '2025-01-20' },
        ];

        const { emotionLogs } = await adapter().getEmotionLogs({ startDate: '2025-01-05', endDate: '2025-01-15' });
        expect(emotionLogs).toHaveLength(1);
    });

    it('respects a limit', async () => {
        vault[DB_FILES.emotionLogs] = [
            { _id: '1', date: '2025-01-01' },
            { _id: '2', date: '2025-01-10' },
            { _id: '3', date: '2025-01-20' },
        ];

        expect((await adapter().getEmotionLogs({ limit: 2 })).emotionLogs).toHaveLength(2);
    });
});

describe('emotion analytics', () => {
    beforeEach(() => {
        vault[DB_FILES.emotionLogs] = [
            {
                _id: '1',
                date: today,
                positiveCount: 3,
                negativeCount: 1,
                pnRatio: 0.75,
                emotions: [
                    { name: 'joy', type: 'positive' },
                    { name: 'peace', type: 'positive' },
                ],
            },
            {
                _id: '2',
                date: yesterday,
                positiveCount: 1,
                negativeCount: 3,
                pnRatio: 0.25,
                emotions: [{ name: 'joy', type: 'positive' }],
            },
        ];
    });

    it('summarises the window', async () => {
        const analytics = await adapter().getEmotionAnalytics(30);

        expect(analytics.totalDays).toBe(2);
        expect(analytics.positiveDays).toBe(1);
        expect(analytics.negativeDays).toBe(1);
        expect(analytics.emotionDiversity).toBe(2);
    });

    it('ranks the most frequent emotions first', async () => {
        const analytics = await adapter().getEmotionAnalytics(30);
        expect(analytics.topEmotions[0]).toEqual({ name: 'joy', count: 2, type: 'positive' });
    });

    it('excludes logs older than the window', async () => {
        vault[DB_FILES.emotionLogs] = [{ _id: '1', date: '2020-01-01', pnRatio: 1, emotions: [] }];
        expect((await adapter().getEmotionAnalytics(30)).totalDays).toBe(0);
    });

    it('reports zeroes rather than dividing by zero on an empty vault', async () => {
        vault[DB_FILES.emotionLogs] = [];
        const analytics = await adapter().getEmotionAnalytics(30);

        expect(analytics.averagePositiveCount).toBe(0);
        expect(analytics.averagePNRatio).toBe(0);
    });
});

describe('eightfold path', () => {
    const donePaths = Array.from({ length: 8 }, (_, i) => ({ path: `p${i}`, note: 'done' }));

    it('counts only the paths carrying a note', async () => {
        const res = await adapter().saveEightfoldPathLog({
            date: today,
            paths: [
                { path: 'a', note: 'yes' },
                { path: 'b', note: '   ' },
                { path: 'c', note: '' },
            ],
        });

        expect(res.pathLog.completedCount).toBe(1);
        expect(res.pathLog.progressPercentage).toBeCloseTo(12.5);
    });

    it('overwrites the entry for a date', async () => {
        const store = adapter();
        await store.saveEightfoldPathLog({ date: today, paths: [{ path: 'a', note: 'yes' }] });
        await store.saveEightfoldPathLog({ date: today, paths: donePaths });

        const { pathLogs } = await store.getEightfoldPathLogs();
        expect(pathLogs).toHaveLength(1);
        expect(pathLogs[0].completedCount).toBe(8);
    });

    it('filters by date range', async () => {
        vault[DB_FILES.eightfoldPathLogs] = [
            { _id: '1', date: '2025-01-01' },
            { _id: '2', date: '2025-01-20' },
        ];

        expect((await adapter().getEightfoldPathLogs({ startDate: '2025-01-10' })).pathLogs).toHaveLength(1);
    });

    it('summarises completion across the window', async () => {
        vault[DB_FILES.eightfoldPathLogs] = [
            { _id: '1', date: today, completedCount: 8, paths: donePaths },
            { _id: '2', date: yesterday, completedCount: 4, paths: donePaths.slice(0, 4) },
        ];

        const analytics = await adapter().getEightfoldPathAnalytics(30);
        expect(analytics.totalDays).toBe(2);
        expect(analytics.averageCompletion).toBe(6);
        expect(analytics.perfectDays).toBe(1);
    });

    it('ranks the most followed paths first', async () => {
        vault[DB_FILES.eightfoldPathLogs] = [
            { _id: '1', date: today, completedCount: 1, paths: [{ path: 'Right View', note: 'yes' }] },
            { _id: '2', date: yesterday, completedCount: 1, paths: [{ path: 'Right View', note: 'yes' }] },
        ];

        const analytics = await adapter().getEightfoldPathAnalytics(30);
        expect(analytics.mostFollowedPaths[0]).toEqual({ path: 'Right View', count: 2 });
    });

    it('excludes logs older than the window', async () => {
        vault[DB_FILES.eightfoldPathLogs] = [{ _id: '1', date: '2020-01-01', completedCount: 8, paths: [] }];
        expect((await adapter().getEightfoldPathAnalytics(30)).totalDays).toBe(0);
    });
});
