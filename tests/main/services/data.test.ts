import { vi, describe, it, expect, beforeEach } from 'vitest';
import { register as registerDataHandlers } from '@/main/services/data';

import type { IpcResult } from '@/schemas/storage';

type IpcHandler = (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;

const event = {} as Electron.IpcMainInvokeEvent;
const ipc = makeMockIpc();

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

vi.mock('@/main/services/db', () => ({
    readCollection: (name: string) => collections[name] ?? [],
    writeCollection: (name: string, data: unknown[]) => {
        collections[name] = data;
    },
    readSession: () => mockSession,
    saveSession: vi.fn(),
}));

vi.mock('@/main/services/auth', () => ({
    findCurrentSession: () => mockSession,
}));

function makeMockIpc() {
    const handlers = new Map<string, IpcHandler>();
    return {
        handle(channel: string, fn: IpcHandler) {
            handlers.set(channel, fn);
        },
        async invoke(channel: string, ...args: unknown[]) {
            const fn = handlers.get(channel);
            if (fn === undefined) throw new Error(`No handler registered for channel '${channel}'`);
            const result = (await fn(event, ...args)) as IpcResult<unknown>;
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
    };
}

function resetState(): void {
    collections = { users: [], meditations: [], emotionLogs: [], eightfoldPathLogs: [] };
    mockSession = { username: 'testuser', token: 'tok' };
}
registerDataHandlers(ipc as unknown as Electron.IpcMain);

describe('storage:createMeditation', () => {
    beforeEach(resetState);

    it('creates a meditation record with correct fields', async () => {
        const res = (await ipc.invoke('storage:createMeditation', '2025-01-15', 10, 'Peaceful session')) as Record<
            string,
            unknown
        >;
        expect(res.username).toBe('testuser');
        expect(res.date).toBe('2025-01-15');
        expect(res.duration).toBe(10);
        expect(res.notes).toBe('Peaceful session');
        expect(res._id).toBeTruthy();
    });

    it('persists to the meditations collection', async () => {
        await ipc.invoke('storage:createMeditation', '2025-01-15', 10, '');
        expect(collections['meditations']).toHaveLength(1);
    });

    it('rejects when not authenticated', async () => {
        mockSession = null;
        await expect(ipc.invoke('storage:createMeditation', '2025-01-15', 10, '')).rejects.toThrow('Not authenticated');
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
        const res = (await ipc.invoke('storage:getMeditations')) as unknown[];
        expect(res).toHaveLength(2);
    });

    it('returns meditations sorted by date descending', async () => {
        const res = (await ipc.invoke('storage:getMeditations')) as { date: string }[];
        expect(res[0].date).toBe('2025-01-15');
        expect(res[1].date).toBe('2025-01-01');
    });

    it('rejects when not authenticated', async () => {
        mockSession = null;
        await expect(ipc.invoke('storage:getMeditations')).rejects.toThrow('Not authenticated');
    });
});

describe('storage:saveEmotionLog', () => {
    beforeEach(resetState);

    it('creates an emotion log', async () => {
        const emotions = [
            { type: 'positive', name: 'joy' },
            { type: 'negative', name: 'anxiety' },
        ];
        const res = (await ipc.invoke('storage:saveEmotionLog', '2025-01-15', emotions, 'A mixed day')) as Record<
            string,
            unknown
        >;
        expect(res.username).toBe('testuser');
        expect(res.positiveCount).toBe(1);
        expect(res.negativeCount).toBe(1);
        expect(res.pnRatio).toBe(0.5);
    });

    it('upserts on the same date', async () => {
        const emotions1 = [{ type: 'positive', name: 'joy' }];
        const emotions2 = [{ type: 'negative', name: 'fear' }];
        await ipc.invoke('storage:saveEmotionLog', '2025-01-15', emotions1);
        await ipc.invoke('storage:saveEmotionLog', '2025-01-15', emotions2);
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
        const res = (await ipc.invoke('storage:getEmotionLogs')) as unknown[];
        expect(res).toHaveLength(3);
    });

    it('filters by date range', async () => {
        const res = (await ipc.invoke('storage:getEmotionLogs', {
            startDate: '2025-01-05',
            endDate: '2025-01-12',
        })) as unknown[];
        expect(res).toHaveLength(1);
    });

    it('respects the limit parameter', async () => {
        const res = (await ipc.invoke('storage:getEmotionLogs', { limit: 2 })) as unknown[];
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
        const res = (await ipc.invoke('storage:getEmotionAnalytics', 30)) as {
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
        const res = (await ipc.invoke('storage:getEmotionAnalytics', 30)) as { totalDays: number };
        expect(res.totalDays).toBe(0);
    });
});

describe('storage:saveEightfoldPathLog', () => {
    beforeEach(resetState);

    it('creates a path log with computed progress', async () => {
        const paths = [
            { path: 'Right View', note: 'Reflected today' },
            { path: 'Right Intention', note: '' },
        ];
        const res = (await ipc.invoke('storage:saveEightfoldPathLog', '2025-01-15', paths)) as Record<string, unknown>;
        expect(res.completedCount).toBe(1);
        expect(res.progressPercentage).toBe(12.5);
    });

    it('upserts on the same date', async () => {
        const paths1 = [{ path: 'Right View', note: 'v1' }];
        const paths2 = [{ path: 'Right View', note: 'v2' }];
        await ipc.invoke('storage:saveEightfoldPathLog', '2025-01-15', paths1);
        await ipc.invoke('storage:saveEightfoldPathLog', '2025-01-15', paths2);
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
        const res = (await ipc.invoke('storage:getEightfoldPathLogs')) as unknown[];
        expect(res).toHaveLength(2);
    });

    it('filters by date range', async () => {
        const res = (await ipc.invoke('storage:getEightfoldPathLogs', {
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
        const res = (await ipc.invoke('storage:getEightfoldPathAnalytics', 30)) as {
            totalDays: number;
            averageCompletion: number;
            perfectDays: number;
            mostFollowedPaths: { path: string; count: number }[];
            trends: { date: string; completedCount: number }[];
        };
        expect(res.totalDays).toBe(2);
        expect(res.averageCompletion).toBe(5.5);
        expect(res.perfectDays).toBe(1);
        expect(res.mostFollowedPaths.length).toBeGreaterThan(0);
        expect(res.trends).toHaveLength(2);
    });

    it('identifies the most followed paths', async () => {
        const res = (await ipc.invoke('storage:getEightfoldPathAnalytics', 30)) as {
            mostFollowedPaths: { path: string; count: number }[];
        };
        const topPath = res.mostFollowedPaths[0];
        expect(topPath.count).toBe(2);
    });

    it('returns trends sorted by date ascending', async () => {
        const res = (await ipc.invoke('storage:getEightfoldPathAnalytics', 30)) as {
            trends: { date: string; completedCount: number }[];
        };
        expect(res.trends[0].date < res.trends[1].date).toBe(true);
    });

    it('returns empty analytics when no data', async () => {
        collections['eightfoldPathLogs'] = [];
        const res = (await ipc.invoke('storage:getEightfoldPathAnalytics', 30)) as {
            totalDays: number;
            perfectDays: number;
        };
        expect(res.totalDays).toBe(0);
        expect(res.perfectDays).toBe(0);
    });
});

describe('argument validation at the IPC boundary', () => {
    beforeEach(() => {
        collections = { meditations: [], emotionLogs: [], eightfoldPathLogs: [] };
        mockSession = { username: 'testuser', token: 'tok' };
    });

    it('rejects a meditation with a non-numeric duration without writing it', async () => {
        await expect(ipc.invoke('storage:createMeditation', '2025-01-15', '10', '')).rejects.toThrow(
            'Invalid meditation',
        );
        expect(collections.meditations).toHaveLength(0);
    });

    it('rejects a meditation missing its notes', async () => {
        await expect(ipc.invoke('storage:createMeditation', '2025-01-15', 10, undefined)).rejects.toThrow(
            'Invalid meditation',
        );
    });

    it('rejects an emotion log whose emotions are not an array', async () => {
        await expect(ipc.invoke('storage:saveEmotionLog', '2025-01-15', 'happy')).rejects.toThrow(
            'Invalid emotion log',
        );
        expect(collections.emotionLogs).toHaveLength(0);
    });

    it('rejects an emotion carrying an unknown type', async () => {
        await expect(
            ipc.invoke('storage:saveEmotionLog', '2025-01-15', [{ name: 'calm', type: 'neutral' }]),
        ).rejects.toThrow('Invalid emotion log');
    });

    it('rejects an eightfold entry missing its note field', async () => {
        await expect(ipc.invoke('storage:saveEightfoldPathLog', '2025-01-15', [{ path: 'view' }])).rejects.toThrow(
            'Invalid eightfold path log',
        );
    });

    it('rejects a query whose limit is not a positive integer', async () => {
        await expect(ipc.invoke('storage:getEmotionLogs', { limit: -1 })).rejects.toThrow('Invalid query');
        await expect(ipc.invoke('storage:getEightfoldPathLogs', { limit: 2.5 })).rejects.toThrow('Invalid query');
    });

    it('accepts an omitted query as "everything"', async () => {
        collections.emotionLogs = [{ _id: '1', username: 'testuser', date: '2025-01-15' }];
        await expect(ipc.invoke('storage:getEmotionLogs')).resolves.toHaveLength(1);
    });

    it('rejects an analytics window that is not a positive integer', async () => {
        await expect(ipc.invoke('storage:getEmotionAnalytics', 0)).rejects.toThrow('Invalid day count');
        await expect(ipc.invoke('storage:getEmotionAnalytics', '30')).rejects.toThrow('Invalid day count');
        await expect(ipc.invoke('storage:getEightfoldPathAnalytics', -5)).rejects.toThrow('Invalid day count');
    });

    it('defaults an omitted analytics window to 30 days', async () => {
        await expect(ipc.invoke('storage:getEmotionAnalytics')).resolves.toMatchObject({ totalDays: 0 });
        await expect(ipc.invoke('storage:getEightfoldPathAnalytics')).resolves.toMatchObject({ totalDays: 0 });
    });
});
