/**
 * data — IPC handlers for meditations, emotion logs, and eightfold path.
 * Owns: CRUD + analytics for meditation/emotion/eightfold data.
 * Does NOT own: which folder is the vault (vault.ts), persistence primitives (db.ts).
 * Every handler below reads and writes the open vault. There is no owner field
 * on a record and no filter by one: the vault folder is the scope, so pointing
 * the app at a different folder is what a different journal means.
 */
import type { z } from 'zod';

import { ipcFailure } from '@/main/lib/errors';
import type { IpcMain } from '@/main/lib/ipc';
import { log } from '@/main/lib/logger';
import { buildEmotionAnalytics, isPathFollowed } from '@/main/services/analytics';
import { type CollectionName, generateId, readCollection, writeCollection } from '@/main/services/db';
import {
    type DateRangeQuery,
    type EightfoldPathLog,
    type EmotionAnalytics,
    type EmotionLog,
    type IpcResult,
    type Meditation,
    AnalyticsDaysSchema,
    DateRangeQuerySchema,
    DatedEntrySchema,
    EightfoldPathInputSchema,
    EightfoldPathLogSchema,
    EmotionLogInputSchema,
    EmotionLogSchema,
    MeditationInputSchema,
    MeditationSchema,
} from '@/schemas/storage';

export function register(ipc: IpcMain): void {
    ipc.handle(
        'storage:createMeditation',
        (_event, date: unknown, duration: unknown, notes: unknown): IpcResult<Meditation> => {
            const parsed = MeditationInputSchema.safeParse({ date, duration, notes });
            if (!parsed.success) return { success: false, error: 'INVALID_ARGUMENTS' };

            try {
                const meditations = readCollection('meditations');
                const newMeditation: Meditation = { _id: generateId(), ...parsed.data };

                meditations.push(newMeditation);
                writeCollection('meditations', meditations);
                return { success: true, data: newMeditation };
            } catch (err) {
                return ipcFailure('data storage:createMeditation', err);
            }
        },
    );

    ipc.handle('storage:getMeditations', (): IpcResult<Meditation[]> => {
        try {
            const meditations = readDocs('meditations', MeditationSchema);
            return {
                success: true,
                data: meditations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            };
        } catch (err) {
            return ipcFailure('data storage:getMeditations', err);
        }
    });

    ipc.handle(
        'storage:saveEmotionLog',
        (_event, date: unknown, emotions: unknown, note: unknown): IpcResult<EmotionLog> => {
            const parsed = EmotionLogInputSchema.safeParse({ date, emotions, note });
            if (!parsed.success) return { success: false, error: 'INVALID_ARGUMENTS' };
            const { date: logDate, emotions: emotionList, note: logNote } = parsed.data;

            try {
                const positiveCount = emotionList.filter((emotion) => emotion.type === 'positive').length;
                const negativeCount = emotionList.filter((emotion) => emotion.type === 'negative').length;
                const total = positiveCount + negativeCount;
                const pnRatio = total > 0 ? positiveCount / total : 0;

                const emotionLog = saveByDate('emotionLogs', {
                    date: logDate,
                    emotions: emotionList,
                    positiveCount,
                    negativeCount,
                    pnRatio,
                    ...(logNote !== undefined && logNote.length > 0 ? { note: logNote } : {}),
                    updatedAt: new Date().toISOString(),
                });
                return { success: true, data: emotionLog };
            } catch (err) {
                return ipcFailure('data storage:saveEmotionLog', err);
            }
        },
    );

    ipc.handle('storage:getEmotionLogs', (_event, query: unknown): IpcResult<EmotionLog[]> => {
        const parsed = DateRangeQuerySchema.safeParse(query ?? {});
        if (!parsed.success) return { success: false, error: 'INVALID_ARGUMENTS' };

        try {
            return { success: true, data: filterByDateRange(readDocs('emotionLogs', EmotionLogSchema), parsed.data) };
        } catch (err) {
            return ipcFailure('data storage:getEmotionLogs', err);
        }
    });

    ipc.handle('storage:getEmotionAnalytics', (_event, days: unknown): IpcResult<EmotionAnalytics> => {
        const parsed = AnalyticsDaysSchema.safeParse(days ?? undefined);
        if (!parsed.success) return { success: false, error: 'INVALID_ARGUMENTS' };

        try {
            const cutoffStr = getCutoffDate(parsed.data);
            const logs = readDocs('emotionLogs', EmotionLogSchema).filter((emotionLog) => emotionLog.date >= cutoffStr);
            return { success: true, data: buildEmotionAnalytics(logs) };
        } catch (err) {
            return ipcFailure('data storage:getEmotionAnalytics', err);
        }
    });

    ipc.handle('storage:saveEightfoldPathLog', (_event, date: unknown, paths: unknown): IpcResult<EightfoldPathLog> => {
        const parsed = EightfoldPathInputSchema.safeParse({ date, paths });
        if (!parsed.success) return { success: false, error: 'INVALID_ARGUMENTS' };
        const { date: logDate, paths: pathList } = parsed.data;

        try {
            const completedCount = pathList.filter((pathEntry) => isPathFollowed(pathEntry.note)).length;

            const pathLog = saveByDate('eightfoldPathLogs', {
                date: logDate,
                paths: pathList,
                completedCount,
                progressPercentage: (completedCount / 8) * 100,
                updatedAt: new Date().toISOString(),
            });
            return { success: true, data: pathLog };
        } catch (err) {
            return ipcFailure('data storage:saveEightfoldPathLog', err);
        }
    });

    ipc.handle('storage:getEightfoldPathLogs', (_event, query: unknown): IpcResult<EightfoldPathLog[]> => {
        const parsed = DateRangeQuerySchema.safeParse(query ?? {});
        if (!parsed.success) return { success: false, error: 'INVALID_ARGUMENTS' };

        try {
            return {
                success: true,
                data: filterByDateRange(readDocs('eightfoldPathLogs', EightfoldPathLogSchema), parsed.data),
            };
        } catch (err) {
            return ipcFailure('data storage:getEightfoldPathLogs', err);
        }
    });
}

/**
 * The entries of `collection` that `schema` accepts. One that does not parse is
 * passed over rather than failing the read, and stays in the file: saveByDate
 * writes it back untouched.
 */
function readDocs<T>(collection: CollectionName, schema: z.ZodType<T>): T[] {
    const entries = readCollection(collection);
    const docs = entries.flatMap((entry) => {
        const parsed = schema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
    });
    if (docs.length < entries.length) {
        log.warn('Skipped unreadable entries', { collection, skipped: entries.length - docs.length });
    }
    return docs;
}

/**
 * Files `doc` under its date: it replaces the entry already dated that day, keeping
 * that entry's id, or is appended with a new one. Every other entry is written back
 * exactly as it was read, including any readDocs passes over.
 */
function saveByDate<T extends { date: string }>(collection: CollectionName, doc: T): T & { _id: string } {
    const entries = readCollection(collection);
    const index = entries.findIndex((entry) => DatedEntrySchema.safeParse(entry).data?.date === doc.date);
    const saved = { _id: DatedEntrySchema.safeParse(entries[index]).data?._id ?? generateId(), ...doc };

    if (index >= 0) {
        entries[index] = saved;
    } else {
        entries.push(saved);
    }
    writeCollection(collection, entries);
    return saved;
}

/**
 * Applies the shared startDate/endDate/limit filter used by both log collections.
 * The query arrives already parsed by DateRangeQuerySchema, so there is nothing
 * left to check here — the types are the guarantee.
 */
function filterByDateRange<T extends { date: string }>(docs: T[], query: DateRangeQuery): T[] {
    const { startDate, endDate, limit } = query;

    let filtered = docs;
    if (startDate !== undefined) filtered = filtered.filter((doc) => doc.date >= startDate);
    if (endDate !== undefined) filtered = filtered.filter((doc) => doc.date <= endDate);
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    if (limit !== undefined) filtered = filtered.slice(0, limit);

    return filtered;
}

/** Cutoff date (YYYY-MM-DD) for an analytics window measured in days back from today. */
function getCutoffDate(days: number): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString().slice(0, 10);
}
