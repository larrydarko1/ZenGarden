/**
 * data — IPC handlers for meditations, emotion logs, and eightfold path.
 * Owns: CRUD + analytics for meditation/emotion/eightfold data.
 * Does NOT own: which folder is the vault (vault.ts), persistence primitives (db.ts).
 * Every handler below reads and writes the open vault. There is no owner field
 * on a record and no filter by one: the vault folder is the scope, so pointing
 * the app at a different folder is what a different journal means.
 */
import type { IpcMain } from 'electron';
import {
    type DateRangeQuery,
    type EightfoldPathAnalytics,
    type EightfoldPathLog,
    type EmotionAnalytics,
    type EmotionLog,
    type IpcResult,
    type Meditation,
    AnalyticsDaysSchema,
    DateRangeQuerySchema,
    EightfoldPathInputSchema,
    EmotionLogInputSchema,
    MeditationInputSchema,
} from '@/schemas/storage';
import { type RawDoc, generateId, readCollection, writeCollection } from '@/main/services/db';
import { buildEightfoldPathAnalytics, buildEmotionAnalytics, isPathFollowed } from '@/main/services/analytics';

export function register(ipc: IpcMain): void {
    ipc.handle(
        'storage:createMeditation',
        (_event, date: unknown, duration: unknown, notes: unknown): IpcResult<Meditation> => {
            const parsed = MeditationInputSchema.safeParse({ date, duration, notes });
            if (!parsed.success) return { success: false, error: 'Invalid meditation' };

            try {
                const meditations = readCollection<Meditation>('meditations');
                const newMeditation: Meditation = { _id: generateId(), ...parsed.data };

                meditations.push(newMeditation);
                writeCollection('meditations', meditations);
                return { success: true, data: newMeditation };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle('storage:getMeditations', (): IpcResult<RawDoc[]> => {
        try {
            const meditations = readCollection<RawDoc>('meditations');
            return {
                success: true,
                data: meditations.sort(
                    (a, b) => new Date(b['date'] as string).getTime() - new Date(a['date'] as string).getTime(),
                ),
            };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle(
        'storage:saveEmotionLog',
        (_event, date: unknown, emotions: unknown, note: unknown): IpcResult<EmotionLog> => {
            const parsed = EmotionLogInputSchema.safeParse({ date, emotions, note });
            if (!parsed.success) return { success: false, error: 'Invalid emotion log' };
            const { date: logDate, emotions: emotionList, note: logNote } = parsed.data;

            try {
                const positiveCount = emotionList.filter((emotion) => emotion.type === 'positive').length;
                const negativeCount = emotionList.filter((emotion) => emotion.type === 'negative').length;
                const total = positiveCount + negativeCount;
                const pnRatio = total > 0 ? positiveCount / total : 0;

                const logs = readCollection<EmotionLog>('emotionLogs');
                const existingIdx = logs.findIndex((log) => log.date === logDate);

                const emotionLog: EmotionLog = {
                    _id: existingIdx >= 0 ? logs[existingIdx]._id : generateId(),
                    date: logDate,
                    emotions: emotionList,
                    positiveCount,
                    negativeCount,
                    pnRatio,
                    ...(logNote !== undefined && logNote.length > 0 ? { note: logNote } : {}),
                    updatedAt: new Date().toISOString(),
                };

                if (existingIdx >= 0) {
                    logs[existingIdx] = emotionLog;
                } else {
                    logs.push(emotionLog);
                }

                writeCollection('emotionLogs', logs);
                return { success: true, data: emotionLog };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle('storage:getEmotionLogs', (_event, query: unknown): IpcResult<RawDoc[]> => {
        const parsed = DateRangeQuerySchema.safeParse(query ?? {});
        if (!parsed.success) return { success: false, error: 'Invalid query' };

        try {
            return { success: true, data: filterByDateRange(readCollection<RawDoc>('emotionLogs'), parsed.data) };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:getEmotionAnalytics', (_event, days: unknown): IpcResult<EmotionAnalytics> => {
        const parsed = AnalyticsDaysSchema.safeParse(days ?? undefined);
        if (!parsed.success) return { success: false, error: 'Invalid day count' };

        try {
            const cutoffStr = getCutoffDate(parsed.data);
            const logs = readCollection<RawDoc>('emotionLogs').filter((log) => (log['date'] as string) >= cutoffStr);
            return { success: true, data: buildEmotionAnalytics(logs) };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:saveEightfoldPathLog', (_event, date: unknown, paths: unknown): IpcResult<EightfoldPathLog> => {
        const parsed = EightfoldPathInputSchema.safeParse({ date, paths });
        if (!parsed.success) return { success: false, error: 'Invalid eightfold path log' };
        const { date: logDate, paths: pathList } = parsed.data;

        try {
            const completedCount = pathList.filter((pathEntry) => isPathFollowed(pathEntry.note)).length;
            const progressPercentage = (completedCount / 8) * 100;

            const logs = readCollection<EightfoldPathLog>('eightfoldPathLogs');
            const existingIdx = logs.findIndex((log) => log.date === logDate);

            const pathLog: EightfoldPathLog = {
                _id: existingIdx >= 0 ? logs[existingIdx]._id : generateId(),
                date: logDate,
                paths: pathList,
                completedCount,
                progressPercentage,
                updatedAt: new Date().toISOString(),
            };

            if (existingIdx >= 0) {
                logs[existingIdx] = pathLog;
            } else {
                logs.push(pathLog);
            }

            writeCollection('eightfoldPathLogs', logs);
            return { success: true, data: pathLog };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:getEightfoldPathLogs', (_event, query: unknown): IpcResult<RawDoc[]> => {
        const parsed = DateRangeQuerySchema.safeParse(query ?? {});
        if (!parsed.success) return { success: false, error: 'Invalid query' };

        try {
            return { success: true, data: filterByDateRange(readCollection<RawDoc>('eightfoldPathLogs'), parsed.data) };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:getEightfoldPathAnalytics', (_event, days: unknown): IpcResult<EightfoldPathAnalytics> => {
        const parsed = AnalyticsDaysSchema.safeParse(days ?? undefined);
        if (!parsed.success) return { success: false, error: 'Invalid day count' };

        try {
            const cutoffStr = getCutoffDate(parsed.data);
            const logs = readCollection<RawDoc>('eightfoldPathLogs').filter(
                (log) => (log['date'] as string) >= cutoffStr,
            );
            return { success: true, data: buildEightfoldPathAnalytics(logs) };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });
}

/**
 * Applies the shared startDate/endDate/limit filter used by both log collections.
 * The query arrives already parsed by DateRangeQuerySchema, so there is nothing
 * left to check here — the types are the guarantee.
 */
function filterByDateRange(docs: RawDoc[], query: DateRangeQuery): RawDoc[] {
    const { startDate, endDate, limit } = query;

    let filtered = docs;
    if (startDate !== undefined) filtered = filtered.filter((doc) => (doc['date'] as string) >= startDate);
    if (endDate !== undefined) filtered = filtered.filter((doc) => (doc['date'] as string) <= endDate);
    filtered.sort((a, b) => (b['date'] as string).localeCompare(a['date'] as string));
    if (limit !== undefined) filtered = filtered.slice(0, limit);

    return filtered;
}

/** Cutoff date (YYYY-MM-DD) for an analytics window measured in days back from today. */
function getCutoffDate(days: number): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString().split('T')[0];
}
