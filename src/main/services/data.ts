// data — IPC handlers for meditations, emotion logs, and eightfold path.
// Owns: CRUD + analytics for meditation/emotion/eightfold data.
// Does NOT own: auth/session (auth.ts), persistence primitives (db.ts).

import type { HandlerFn, RawDoc } from './db';
import { readCollection, writeCollection } from './db';
import { generateId } from './crypto';
import { getCurrentSession } from './auth';

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const dataHandlers: Record<string, HandlerFn> = {
    // ── Meditations ──────────────────────────────────────────────────────

    'storage:createMeditation': async (_event, date, duration, notes) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const meditations = readCollection<RawDoc>('meditations');
        const newMeditation = {
            _id: generateId(),
            Username: session.username,
            Date: date,
            duration,
            notes,
            createdAt: new Date().toISOString(),
        };

        meditations.push(newMeditation);
        writeCollection('meditations', meditations);
        return newMeditation;
    },

    'storage:getMeditations': async () => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const meditations = readCollection<RawDoc>('meditations');
        return meditations
            .filter((m) => m['Username'] === session.username || m['username'] === session.username)
            .sort((a, b) => new Date(b['Date'] as string).getTime() - new Date(a['Date'] as string).getTime());
    },

    // ── Emotion logs ─────────────────────────────────────────────────────

    'storage:saveEmotionLog': async (_event, date, emotions, note) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const emotionList = emotions as Array<{ type: string; name: string }>;
        const positiveCount = emotionList.filter((e) => e.type === 'positive').length;
        const negativeCount = emotionList.filter((e) => e.type === 'negative').length;
        const total = positiveCount + negativeCount;
        const pnRatio = total > 0 ? positiveCount / total : 0;

        const logs = readCollection<RawDoc>('emotionLogs');
        const existingIdx = logs.findIndex((l) => l['username'] === session.username && l['date'] === date);

        const emotionLog = {
            _id: existingIdx >= 0 ? logs[existingIdx]['_id'] : generateId(),
            username: session.username,
            date,
            emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            ...(note ? { note } : {}),
            updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
            logs[existingIdx] = emotionLog;
        } else {
            logs.push(emotionLog);
        }

        writeCollection('emotionLogs', logs);
        return emotionLog;
    },

    'storage:getEmotionLogs': async (_event, query = {}) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const q = query as { startDate?: string; endDate?: string; limit?: number };
        let logs = readCollection<RawDoc>('emotionLogs').filter((l) => l['username'] === session.username);

        if (q.startDate) logs = logs.filter((l) => (l['date'] as string) >= q.startDate!);
        if (q.endDate) logs = logs.filter((l) => (l['date'] as string) <= q.endDate!);
        logs.sort((a, b) => (b['date'] as string).localeCompare(a['date'] as string));
        if (q.limit) logs = logs.slice(0, q.limit);

        return logs;
    },

    'storage:getEmotionAnalytics': async (_event, days = 30) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days as number));
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const logs = readCollection<RawDoc>('emotionLogs')
            .filter((l) => l['username'] === session.username && (l['date'] as string) >= cutoffStr)
            .sort((a, b) => (a['date'] as string).localeCompare(b['date'] as string));

        if (logs.length === 0) {
            return {
                totalDays: 0,
                averagePositiveCount: 0,
                averageNegativeCount: 0,
                averagePNRatio: 0,
                emotionDiversity: 0,
                positiveDays: 0,
                negativeDays: 0,
                topEmotions: [],
                trends: [],
            };
        }

        const totals = logs.reduce(
            (acc, l) => ({
                positive: acc.positive + (l['positiveCount'] as number),
                negative: acc.negative + (l['negativeCount'] as number),
                ratio: acc.ratio + (l['pnRatio'] as number),
            }),
            { positive: 0, negative: 0, ratio: 0 } as { positive: number; negative: number; ratio: number },
        );

        let positiveDays = 0;
        let negativeDays = 0;
        const uniqueEmotions = new Set<string>();
        const emotionCounts: Record<string, { name: string; type: string; count: number }> = {};

        logs.forEach((l) => {
            if ((l['pnRatio'] as number) >= 0.5) positiveDays++;
            else negativeDays++;

            const emotions = l['emotions'] as Array<{ name: string; type: string }> | undefined;
            emotions?.forEach((e) => {
                uniqueEmotions.add(e.name);
                if (!emotionCounts[e.name]) emotionCounts[e.name] = { name: e.name, type: e.type, count: 0 };
                emotionCounts[e.name].count++;
            });
        });

        return {
            totalDays: logs.length,
            averagePositiveCount: totals.positive / logs.length,
            averageNegativeCount: totals.negative / logs.length,
            averagePNRatio: totals.ratio / logs.length,
            emotionDiversity: uniqueEmotions.size,
            positiveDays,
            negativeDays,
            topEmotions: Object.values(emotionCounts).sort((a, b) => b.count - a.count),
            trends: logs.map((l) => ({ date: l['date'], pnRatio: l['pnRatio'] })),
        };
    },

    // ── Eightfold path ───────────────────────────────────────────────────

    'storage:saveEightfoldPathLog': async (_event, date, paths) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const pathList = paths as Array<{ note?: string }>;
        const completedCount = pathList.filter((p) => p.note?.trim()).length;
        const progressPercentage = (completedCount / 8) * 100;

        const logs = readCollection<RawDoc>('eightfoldPathLogs');
        const existingIdx = logs.findIndex((l) => l['username'] === session.username && l['date'] === date);

        const pathLog = {
            _id: existingIdx >= 0 ? logs[existingIdx]['_id'] : generateId(),
            username: session.username,
            date,
            paths,
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
        return pathLog;
    },

    'storage:getEightfoldPathLogs': async (_event, query = {}) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const q = query as { startDate?: string; endDate?: string; limit?: number };
        let logs = readCollection<RawDoc>('eightfoldPathLogs').filter((l) => l['username'] === session.username);

        if (q.startDate) logs = logs.filter((l) => (l['date'] as string) >= q.startDate!);
        if (q.endDate) logs = logs.filter((l) => (l['date'] as string) <= q.endDate!);
        logs.sort((a, b) => (b['date'] as string).localeCompare(a['date'] as string));
        if (q.limit) logs = logs.slice(0, q.limit);

        return logs;
    },

    'storage:getEightfoldPathAnalytics': async (_event, days = 30) => {
        const session = getCurrentSession();
        if (!session) throw new Error('Not authenticated');

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days as number));
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const logs = readCollection<RawDoc>('eightfoldPathLogs').filter(
            (l) => l['username'] === session.username && (l['date'] as string) >= cutoffStr,
        );

        if (logs.length === 0) {
            return { totalDays: 0, averageCompletedCount: 0, averageProgressPercentage: 0 };
        }

        const totals = logs.reduce(
            (acc, l) => ({
                completed: acc.completed + (l['completedCount'] as number),
                progress: acc.progress + (l['progressPercentage'] as number),
            }),
            { completed: 0, progress: 0 } as { completed: number; progress: number },
        );

        return {
            totalDays: logs.length,
            averageCompletedCount: totals.completed / logs.length,
            averageProgressPercentage: totals.progress / logs.length,
        };
    },
};
