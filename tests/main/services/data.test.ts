import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import type { IpcMain } from '@/main/lib/ipc';
import { log } from '@/main/lib/logger';
import { register as registerDataHandlers } from '@/main/services/data';
import {
    type EightfoldPathLog,
    type EmotionLog,
    type Meditation,
    DatedEntrySchema,
    EightfoldPathLogSchema,
    EmotionLogSchema,
    MeditationSchema,
} from '@/schemas/storage';

type Listener = (event: unknown, ...args: unknown[]) => unknown;

vi.mock('@/main/lib/logger', () => ({ log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

/** A handler's reply as the renderer's adapter reads it. */
const ReplySchema = z.discriminatedUnion('success', [
    z.object({ success: z.literal(true), data: z.unknown() }),
    z.object({ success: z.literal(false), error: z.string() }),
]);

const DatedListSchema = z.array(DatedEntrySchema);

const handlers = new Map<string, Listener>();
const ipc: IpcMain = {
    handle(channel, listener) {
        handlers.set(channel, listener);
    },
};

let collections: Record<string, unknown[]> = {};
let vaultOpen = true;

vi.mock('@/main/services/db', async () => {
    const { IpcError } = await import('@/main/lib/errors');
    const requireVault = (): void => {
        if (!vaultOpen) throw new IpcError('NO_VAULT', 'No vault is open');
    };
    return {
        generateId: () => Math.random().toString(36).substring(2),
        readCollection: (name: string) => {
            requireVault();
            return collections[name] ?? [];
        },
        writeCollection: (name: string, data: unknown[]) => {
            requireVault();
            collections[name] = data;
        },
    };
});

/** Calls a handler the way the renderer's `invoke` would, and unwraps its reply the way the adapter does. */
async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = handlers.get(channel);
    if (handler === undefined) throw new Error(`No handler registered for channel '${channel}'`);
    const reply = ReplySchema.parse(await handler(null, ...args));
    if (!reply.success) throw new Error(reply.error);
    return reply.data;
}

function meditation(_id: string, date: string): Meditation {
    return { _id, date, duration: 10, notes: '' };
}

function emotionLog(_id: string, date: string): EmotionLog {
    return { _id, date, emotions: [], positiveCount: 0, negativeCount: 0, pnRatio: 0, updatedAt: date };
}

function pathLog(_id: string, date: string): EightfoldPathLog {
    return { _id, date, paths: [], completedCount: 0, progressPercentage: 0, updatedAt: date };
}

function resetState(): void {
    collections = { meditations: [], emotionLogs: [], eightfoldPathLogs: [] };
    vaultOpen = true;
}
registerDataHandlers(ipc);

describe('storage:createMeditation', () => {
    beforeEach(resetState);

    it('creates a meditation record with correct fields', async () => {
        const res = MeditationSchema.parse(
            await invoke('storage:createMeditation', '2025-01-15', 10, 'Peaceful session'),
        );
        expect(res.date).toBe('2025-01-15');
        expect(res.duration).toBe(10);
        expect(res.notes).toBe('Peaceful session');
        expect(res._id).toBeTruthy();
    });

    it('persists to the meditations collection', async () => {
        await invoke('storage:createMeditation', '2025-01-15', 10, '');
        expect(collections['meditations']).toHaveLength(1);
    });

    it('answers with a code, not the message, when no vault is open', async () => {
        vaultOpen = false;
        await expect(invoke('storage:createMeditation', '2025-01-15', 10, '')).rejects.toThrow('NO_VAULT');
    });
});

describe('storage:getMeditations', () => {
    beforeEach(() => {
        resetState();
        collections['meditations'] = [
            meditation('1', '2025-01-01'),
            meditation('2', '2025-01-15'),
            meditation('3', '2025-01-10'),
        ];
    });

    it('returns every meditation in the vault', async () => {
        expect(DatedListSchema.parse(await invoke('storage:getMeditations'))).toHaveLength(3);
    });

    it('returns meditations sorted by date descending', async () => {
        const res = DatedListSchema.parse(await invoke('storage:getMeditations'));
        expect(res.map((entry) => entry.date)).toEqual(['2025-01-15', '2025-01-10', '2025-01-01']);
    });

    it('passes over an entry it cannot read, and says so in the log', async () => {
        collections['meditations'] = [meditation('1', '2025-01-01'), { _id: '2', date: '2025-01-02' }, 'junk'];

        const res = DatedListSchema.parse(await invoke('storage:getMeditations'));

        expect(res.map((entry) => entry._id)).toEqual(['1']);
        expect(log.warn).toHaveBeenCalledWith('Skipped unreadable entries', { collection: 'meditations', skipped: 2 });
    });

    it('answers with a code when no vault is open', async () => {
        vaultOpen = false;
        await expect(invoke('storage:getMeditations')).rejects.toThrow('NO_VAULT');
    });
});

describe('storage:saveEmotionLog', () => {
    beforeEach(resetState);

    it('creates an emotion log', async () => {
        const emotions = [
            { type: 'positive', name: 'joy' },
            { type: 'negative', name: 'anxiety' },
        ];
        const res = EmotionLogSchema.parse(
            await invoke('storage:saveEmotionLog', '2025-01-15', emotions, 'A mixed day'),
        );
        expect(res.positiveCount).toBe(1);
        expect(res.negativeCount).toBe(1);
        expect(res.pnRatio).toBe(0.5);
    });

    it('upserts on the same date, keeping the id', async () => {
        const emotions1 = [{ type: 'positive', name: 'joy' }];
        const emotions2 = [{ type: 'negative', name: 'fear' }];
        const first = EmotionLogSchema.parse(await invoke('storage:saveEmotionLog', '2025-01-15', emotions1));
        const second = EmotionLogSchema.parse(await invoke('storage:saveEmotionLog', '2025-01-15', emotions2));

        const stored = z.array(EmotionLogSchema).parse(collections['emotionLogs']);
        expect(stored).toHaveLength(1);
        expect(stored[0]?.negativeCount).toBe(1);
        expect(second._id).toBe(first._id);
    });

    it('writes back an entry it cannot read rather than dropping it', async () => {
        collections['emotionLogs'] = ['junk', { date: '2025-01-15', _id: 'old' }];

        await invoke('storage:saveEmotionLog', '2025-01-15', [{ type: 'positive', name: 'joy' }]);

        expect(collections['emotionLogs']?.[0]).toBe('junk');
        expect(EmotionLogSchema.parse(collections['emotionLogs']?.[1])._id).toBe('old');
    });
});

describe('storage:getEmotionLogs', () => {
    beforeEach(() => {
        resetState();
        collections['emotionLogs'] = [
            emotionLog('1', '2025-01-01'),
            emotionLog('2', '2025-01-15'),
            emotionLog('3', '2025-01-10'),
            emotionLog('4', '2025-01-02'),
        ];
    });

    it('returns every log in the vault', async () => {
        expect(DatedListSchema.parse(await invoke('storage:getEmotionLogs'))).toHaveLength(4);
    });

    it('filters by date range', async () => {
        const res = DatedListSchema.parse(
            await invoke('storage:getEmotionLogs', { startDate: '2025-01-05', endDate: '2025-01-12' }),
        );
        expect(res).toHaveLength(1);
    });

    it('respects the limit parameter', async () => {
        expect(DatedListSchema.parse(await invoke('storage:getEmotionLogs', { limit: 2 }))).toHaveLength(2);
    });

    it('reads a log stored without an emotions array as one with none picked', async () => {
        const { emotions: _omitted, ...withoutEmotions } = emotionLog('5', '2025-01-20');
        collections['emotionLogs'] = [withoutEmotions];

        const [read] = z.array(EmotionLogSchema).parse(await invoke('storage:getEmotionLogs'));

        expect(read?.emotions).toEqual([]);
    });
});

describe('storage:getEmotionAnalytics', () => {
    const AnalyticsSchema = z.object({ totalDays: z.number(), averagePNRatio: z.number(), positiveDays: z.number() });

    beforeEach(() => {
        resetState();
        const today = new Date().toISOString().slice(0, 10);
        collections['emotionLogs'] = [
            {
                ...emotionLog('1', today),
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
        const res = AnalyticsSchema.parse(await invoke('storage:getEmotionAnalytics', 30));
        expect(res.totalDays).toBe(1);
        expect(res.averagePNRatio).toBe(0.75);
        expect(res.positiveDays).toBe(1);
    });

    it('returns empty analytics when no data', async () => {
        collections['emotionLogs'] = [];
        expect(AnalyticsSchema.parse(await invoke('storage:getEmotionAnalytics', 30)).totalDays).toBe(0);
    });
});

describe('storage:saveEightfoldPathLog', () => {
    beforeEach(resetState);

    it('creates a path log with computed progress', async () => {
        const paths = [
            { path: 'Right View', note: 'Reflected today' },
            { path: 'Right Intention', note: '' },
        ];
        const res = EightfoldPathLogSchema.parse(await invoke('storage:saveEightfoldPathLog', '2025-01-15', paths));
        expect(res.completedCount).toBe(1);
        expect(res.progressPercentage).toBe(12.5);
    });

    it('upserts on the same date', async () => {
        const paths1 = [{ path: 'Right View', note: 'v1' }];
        const paths2 = [{ path: 'Right View', note: 'v2' }];
        await invoke('storage:saveEightfoldPathLog', '2025-01-15', paths1);
        await invoke('storage:saveEightfoldPathLog', '2025-01-15', paths2);
        expect(collections['eightfoldPathLogs']).toHaveLength(1);
    });
});

describe('storage:getEightfoldPathLogs', () => {
    beforeEach(() => {
        resetState();
        collections['eightfoldPathLogs'] = [
            pathLog('1', '2025-01-01'),
            pathLog('2', '2025-01-15'),
            pathLog('3', '2025-01-10'),
        ];
    });

    it('returns every log in the vault', async () => {
        expect(DatedListSchema.parse(await invoke('storage:getEightfoldPathLogs'))).toHaveLength(3);
    });

    it('filters by date range', async () => {
        const res = DatedListSchema.parse(await invoke('storage:getEightfoldPathLogs', { startDate: '2025-01-10' }));
        expect(res).toHaveLength(2);
    });
});

describe('argument validation at the IPC boundary', () => {
    beforeEach(() => {
        resetState();
    });

    it('rejects a meditation with a non-numeric duration without writing it', async () => {
        await expect(invoke('storage:createMeditation', '2025-01-15', '10', '')).rejects.toThrow('INVALID_ARGUMENTS');
        expect(collections['meditations']).toHaveLength(0);
    });

    it('rejects a meditation missing its notes', async () => {
        await expect(invoke('storage:createMeditation', '2025-01-15', 10, undefined)).rejects.toThrow(
            'INVALID_ARGUMENTS',
        );
    });

    it('rejects an emotion log whose emotions are not an array', async () => {
        await expect(invoke('storage:saveEmotionLog', '2025-01-15', 'happy')).rejects.toThrow('INVALID_ARGUMENTS');
        expect(collections['emotionLogs']).toHaveLength(0);
    });

    it('rejects an emotion carrying an unknown type', async () => {
        await expect(
            invoke('storage:saveEmotionLog', '2025-01-15', [{ name: 'calm', type: 'neutral' }]),
        ).rejects.toThrow('INVALID_ARGUMENTS');
    });

    it('rejects an eightfold entry missing its note field', async () => {
        await expect(invoke('storage:saveEightfoldPathLog', '2025-01-15', [{ path: 'view' }])).rejects.toThrow(
            'INVALID_ARGUMENTS',
        );
    });

    it('rejects a query whose limit is not a positive integer', async () => {
        await expect(invoke('storage:getEmotionLogs', { limit: -1 })).rejects.toThrow('INVALID_ARGUMENTS');
        await expect(invoke('storage:getEightfoldPathLogs', { limit: 2.5 })).rejects.toThrow('INVALID_ARGUMENTS');
    });

    it('accepts an omitted query as "everything"', async () => {
        collections['emotionLogs'] = [emotionLog('1', '2025-01-15')];
        await expect(invoke('storage:getEmotionLogs')).resolves.toHaveLength(1);
    });

    it('rejects an analytics window that is not a positive integer', async () => {
        await expect(invoke('storage:getEmotionAnalytics', 0)).rejects.toThrow('INVALID_ARGUMENTS');
        await expect(invoke('storage:getEmotionAnalytics', '30')).rejects.toThrow('INVALID_ARGUMENTS');
        await expect(invoke('storage:getEmotionAnalytics', -5)).rejects.toThrow('INVALID_ARGUMENTS');
    });

    it('defaults an omitted analytics window to 30 days', async () => {
        await expect(invoke('storage:getEmotionAnalytics')).resolves.toMatchObject({ totalDays: 0 });
    });
});
