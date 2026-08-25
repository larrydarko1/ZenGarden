/**
 * analytics — the arithmetic behind the emotion and eightfold-path summaries.
 * Owns: aggregating a user's stored logs into the shapes the charts read, and
 * the rule for what counts as a followed path.
 * Does NOT own: IPC registration or the date-window filtering that selects
 * which logs to aggregate (data.ts), persistence (db.ts).
 * Documents arrive as RawDoc because that is what the JSON files hold — the
 * casts below are reads of fields these collections have always written.
 */
import type { EightfoldPathAnalytics, EmotionAnalytics } from '@/schemas/storage';
import type { RawDoc } from '@/main/services/db';

/** True when a path entry carries a non-blank note, which is what counts as "followed". */
export function isPathFollowed(note: string | undefined): boolean {
    return note !== undefined && note.trim().length > 0;
}

/** Aggregates emotion logs already narrowed to one user and one date window. */
export function buildEmotionAnalytics(logs: RawDoc[]): EmotionAnalytics {
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

    const sorted = [...logs].sort((a, b) => (a['date'] as string).localeCompare(b['date'] as string));

    const totals = sorted.reduce<{ positive: number; negative: number; ratio: number }>(
        (acc, log) => ({
            positive: acc.positive + (log['positiveCount'] as number),
            negative: acc.negative + (log['negativeCount'] as number),
            ratio: acc.ratio + (log['pnRatio'] as number),
        }),
        { positive: 0, negative: 0, ratio: 0 },
    );

    let positiveDays = 0;
    let negativeDays = 0;
    const uniqueEmotions = new Set<string>();
    const emotionCounts: Record<string, { name: string; type: string; count: number }> = {};

    sorted.forEach((log) => {
        if ((log['pnRatio'] as number) >= 0.5) positiveDays++;
        else negativeDays++;

        const emotions = log['emotions'] as { name: string; type: string }[] | undefined;
        emotions?.forEach((emotion) => {
            uniqueEmotions.add(emotion.name);
            const counter = emotionCounts[emotion.name] ?? { name: emotion.name, type: emotion.type, count: 0 };
            counter.count++;
            emotionCounts[emotion.name] = counter;
        });
    });

    return {
        totalDays: sorted.length,
        averagePositiveCount: totals.positive / sorted.length,
        averageNegativeCount: totals.negative / sorted.length,
        averagePNRatio: totals.ratio / sorted.length,
        emotionDiversity: uniqueEmotions.size,
        positiveDays,
        negativeDays,
        topEmotions: Object.values(emotionCounts).sort((a, b) => b.count - a.count),
        trends: sorted.map((log) => ({ date: log['date'] as string, pnRatio: log['pnRatio'] as number })),
    };
}

/** Aggregates eightfold-path logs already narrowed to one user and one date window. */
export function buildEightfoldPathAnalytics(logs: RawDoc[]): EightfoldPathAnalytics {
    if (logs.length === 0) {
        return {
            totalDays: 0,
            averageCompletion: 0,
            perfectDays: 0,
            mostFollowedPaths: [],
            trends: [],
        };
    }

    const sorted = [...logs].sort((a, b) => (a['date'] as string).localeCompare(b['date'] as string));

    const totalCompleted = sorted.reduce((acc, log) => acc + (log['completedCount'] as number), 0);
    // All eight followed on the same day — the only day that counts as perfect.
    const perfectDays = sorted.filter((log) => (log['completedCount'] as number) === 8).length;

    const pathCounts: Record<string, number> = {};
    sorted.forEach((log) => {
        const paths = log['paths'] as { path: string; note?: string }[] | undefined;
        paths?.forEach((pathEntry) => {
            if (isPathFollowed(pathEntry.note)) {
                pathCounts[pathEntry.path] = (pathCounts[pathEntry.path] ?? 0) + 1;
            }
        });
    });

    return {
        totalDays: sorted.length,
        averageCompletion: totalCompleted / sorted.length,
        perfectDays,
        mostFollowedPaths: Object.entries(pathCounts)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8),
        trends: sorted.map((log) => ({
            date: log['date'] as string,
            completedCount: log['completedCount'] as number,
        })),
    };
}
