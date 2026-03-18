// @vitest-environment node

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

let collections: Record<string, unknown[]> = {};
let mockSession: { username: string; token: string } | null = null;

vi.mock('electron', () => ({
    app: { getPath: () => '/tmp/zengarden-test' },
}));

vi.mock('fs', () => ({
    default: {
        existsSync: () => true,
        readFileSync: () => '[]',
        writeFileSync: vi.fn(),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
    existsSync: () => true,
    readFileSync: () => '[]',
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
}));

vi.mock('../../../src/main/services/db', () => ({
    readCollection: (name: string) => collections[name] ?? [],
    writeCollection: (name: string, data: unknown[]) => {
        collections[name] = data;
    },
    readSession: () => mockSession,
    saveSession: vi.fn(),
}));

vi.mock('../../../src/main/services/auth', () => ({
    getCurrentSession: () => mockSession,
}));

const event = {} as Electron.IpcMainInvokeEvent;

import { dataHandlers } from '../../../src/main/services/data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetState(): void {
    collections = { users: [], meditations: [], emotionLogs: [], eightfoldPathLogs: [] };
    mockSession = { username: 'testuser', token: 'tok' };
}

// ─── Meditations ──────────────────────────────────────────────────────────────

describe('storage:createMeditation', () => {
    beforeEach(resetState);

    it('creates a meditation record with correct fields', async () => {
        const res = (await dataHandlers['storage:createMeditation'](
            event,
            '2025-01-15',
            10,
            'Peaceful session',
        )) as Record<string, unknown>;
        expect(res.username).toBe('testuser');
        expect(res.date).toBe('2025-01-15');
        expect(res.duration).toBe(10);
        expect(res.notes).toBe('Peaceful session');
        expect(res._id).toBeTruthy();
    });

    it('persists to the meditations collection', async () => {
        await dataHandlers['storage:createMeditation'](event, '2025-01-15', 10, '');
        expect(collections['meditations']).toHaveLength(1);
    });

    it('rejects when not authenticated', async () => {
        mockSession = null;
        await expect(dataHandlers['storage:createMeditation'](event, '2025-01-15', 10, '')).rejects.toThrow(
            'Not authenticated',
        );
    });
});

describe('storage:getMeditations', () => {
    beforeEach(() => {
        resetState();
        collections['meditations'] = [
            { _id: '1', username: 'testuser', date: '2025-01-01' },
            { _id: '2', username: 'testuser', date: '2025-01-15' },
            { _id: '3', username: 'otheruser', date: '2025-01-10' },
        ];
    });

    it('returns only the current user meditations', async () => {
        const res = (await dataHandlers['storage:getMeditations'](event)) as unknown[];
        expect(res).toHaveLength(2);
    });

    it('returns meditations sorted by date descending', async () => {
        const res = (await dataHandlers['storage:getMeditations'](event)) as Array<{ date: string }>;
        expect(res[0].date).toBe('2025-01-15');
        expect(res[1].date).toBe('2025-01-01');
    });

    it('rejects when not authenticated', async () => {
        mockSession = null;
        await expect(dataHandlers['storage:getMeditations'](event)).rejects.toThrow('Not authenticated');
    });
});

// ─── Emotion logs ─────────────────────────────────────────────────────────────

describe('storage:saveEmotionLog', () => {
    beforeEach(resetState);

    it('creates an emotion log', async () => {
        const emotions = [
            { type: 'positive', name: 'joy' },
            { type: 'negative', name: 'anxiety' },
        ];
        const res = (await dataHandlers['storage:saveEmotionLog'](
            event,
            '2025-01-15',
            emotions,
            'A mixed day',
        )) as Record<string, unknown>;
        expect(res.username).toBe('testuser');
        expect(res.positiveCount).toBe(1);
        expect(res.negativeCount).toBe(1);
        expect(res.pnRatio).toBe(0.5);
    });

    it('upserts on the same date', async () => {
        const emotions1 = [{ type: 'positive', name: 'joy' }];
        const emotions2 = [{ type: 'negative', name: 'fear' }];
        await dataHandlers['storage:saveEmotionLog'](event, '2025-01-15', emotions1);
        await dataHandlers['storage:saveEmotionLog'](event, '2025-01-15', emotions2);
        expect(collections['emotionLogs']).toHaveLength(1);
        const log = collections['emotionLogs'][0] as { negativeCount: number };
        expect(log.negativeCount).toBe(1);
    });
});

describe('storage:getEmotionLogs', () => {
    beforeEach(() => {
        resetState();
        collections['emotionLogs'] = [
            { _id: '1', username: 'testuser', date: '2025-01-01' },
            { _id: '2', username: 'testuser', date: '2025-01-15' },
            { _id: '3', username: 'testuser', date: '2025-01-10' },
            { _id: '4', username: 'otheruser', date: '2025-01-01' },
        ];
    });

    it('returns only current user logs', async () => {
        const res = (await dataHandlers['storage:getEmotionLogs'](event)) as unknown[];
        expect(res).toHaveLength(3);
    });

    it('filters by date range', async () => {
        const res = (await dataHandlers['storage:getEmotionLogs'](event, {
            startDate: '2025-01-05',
            endDate: '2025-01-12',
        })) as unknown[];
        expect(res).toHaveLength(1);
    });

    it('respects the limit parameter', async () => {
        const res = (await dataHandlers['storage:getEmotionLogs'](event, { limit: 2 })) as unknown[];
        expect(res).toHaveLength(2);
    });
});

describe('storage:getEmotionAnalytics', () => {
    beforeEach(() => {
        resetState();
        const today = new Date().toISOString().split('T')[0];
        collections['emotionLogs'] = [
            {
                _id: '1',
                username: 'testuser',
                date: today,
                positiveCount: 3,
                negativeCount: 1,
                pnRatio: 0.75,
                emotions: [
                    { name: 'joy', type: 'positive' },
                    { name: 'peace', type: 'positive' },
                    { name: 'gratitude', type: 'positive' },
                    { name: 'anxiety', type: 'negative' },
                ],
            },
        ];
    });

    it('returns analytics for the period', async () => {
        const res = (await dataHandlers['storage:getEmotionAnalytics'](event, 30)) as {
            totalDays: number;
            averagePNRatio: number;
            positiveDays: number;
        };
        expect(res.totalDays).toBe(1);
        expect(res.averagePNRatio).toBe(0.75);
        expect(res.positiveDays).toBe(1);
    });

    it('returns empty analytics when no data', async () => {
        collections['emotionLogs'] = [];
        const res = (await dataHandlers['storage:getEmotionAnalytics'](event, 30)) as { totalDays: number };
        expect(res.totalDays).toBe(0);
    });
});

// ─── Eightfold path ──────────────────────────────────────────────────────────

describe('storage:saveEightfoldPathLog', () => {
    beforeEach(resetState);

    it('creates a path log with computed progress', async () => {
        const paths = [
            { path: 'Right View', note: 'Reflected today' },
            { path: 'Right Intention', note: '' },
        ];
        const res = (await dataHandlers['storage:saveEightfoldPathLog'](event, '2025-01-15', paths)) as Record<
            string,
            unknown
        >;
        expect(res.completedCount).toBe(1);
        expect(res.progressPercentage).toBe(12.5);
    });

    it('upserts on the same date', async () => {
        const paths1 = [{ path: 'Right View', note: 'v1' }];
        const paths2 = [{ path: 'Right View', note: 'v2' }];
        await dataHandlers['storage:saveEightfoldPathLog'](event, '2025-01-15', paths1);
        await dataHandlers['storage:saveEightfoldPathLog'](event, '2025-01-15', paths2);
        expect(collections['eightfoldPathLogs']).toHaveLength(1);
    });
});

describe('storage:getEightfoldPathLogs', () => {
    beforeEach(() => {
        resetState();
        collections['eightfoldPathLogs'] = [
            { _id: '1', username: 'testuser', date: '2025-01-01' },
            { _id: '2', username: 'testuser', date: '2025-01-15' },
            { _id: '3', username: 'otheruser', date: '2025-01-10' },
        ];
    });

    it('returns only current user logs', async () => {
        const res = (await dataHandlers['storage:getEightfoldPathLogs'](event)) as unknown[];
        expect(res).toHaveLength(2);
    });

    it('filters by date range', async () => {
        const res = (await dataHandlers['storage:getEightfoldPathLogs'](event, {
            startDate: '2025-01-10',
        })) as unknown[];
        expect(res).toHaveLength(1);
    });
});

describe('storage:getEightfoldPathAnalytics', () => {
    beforeEach(() => {
        resetState();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        collections['eightfoldPathLogs'] = [
            {
                _id: '1',
                username: 'testuser',
                date: today,
                completedCount: 8,
                paths: [
                    { path: 'Right View', note: 'Done' },
                    { path: 'Right Intention', note: 'Done' },
                    { path: 'Right Speech', note: 'Done' },
                    { path: 'Right Action', note: 'Done' },
                    { path: 'Right Livelihood', note: 'Done' },
                    { path: 'Right Effort', note: 'Done' },
                    { path: 'Right Mindfulness', note: 'Done' },
                    { path: 'Right Concentration', note: 'Done' },
                ],
            },
            {
                _id: '2',
                username: 'testuser',
                date: yesterday,
                completedCount: 3,
                paths: [
                    { path: 'Right View', note: 'Done' },
                    { path: 'Right Speech', note: 'Done' },
                    { path: 'Right Mindfulness', note: 'Done' },
                ],
            },
        ];
    });

    it('returns analytics with correct shape', async () => {
        const res = (await dataHandlers['storage:getEightfoldPathAnalytics'](event, 30)) as {
            totalDays: number;
            averageCompletion: number;
            perfectDays: number;
            mostFollowedPaths: Array<{ path: string; count: number }>;
            trends: Array<{ date: string; completedCount: number }>;
        };
        expect(res.totalDays).toBe(2);
        expect(res.averageCompletion).toBe(5.5);
        expect(res.perfectDays).toBe(1);
        expect(res.mostFollowedPaths.length).toBeGreaterThan(0);
        expect(res.trends).toHaveLength(2);
    });

    it('identifies the most followed paths', async () => {
        const res = (await dataHandlers['storage:getEightfoldPathAnalytics'](event, 30)) as {
            mostFollowedPaths: Array<{ path: string; count: number }>;
        };
        // Right View, Right Speech, Right Mindfulness appear in both days
        const topPath = res.mostFollowedPaths[0];
        expect(topPath.count).toBe(2);
    });

    it('returns trends sorted by date ascending', async () => {
        const res = (await dataHandlers['storage:getEightfoldPathAnalytics'](event, 30)) as {
            trends: Array<{ date: string; completedCount: number }>;
        };
        expect(res.trends[0].date < res.trends[1].date).toBe(true);
    });

    it('returns empty analytics when no data', async () => {
        collections['eightfoldPathLogs'] = [];
        const res = (await dataHandlers['storage:getEightfoldPathAnalytics'](event, 30)) as {
            totalDays: number;
            perfectDays: number;
        };
        expect(res.totalDays).toBe(0);
        expect(res.perfectDays).toBe(0);
    });
});
