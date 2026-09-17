import { describe, it, expect } from 'vitest';
import { buildEmotionAnalytics, isPathFollowed } from '@/main/services/analytics';
import type { RawDoc } from '@/main/services/db';

function emotionLog(
    date: string,
    positiveCount: number,
    negativeCount: number,
    emotions: { name: string; type: string }[],
): RawDoc {
    const total = positiveCount + negativeCount;
    return { date, positiveCount, negativeCount, pnRatio: total > 0 ? positiveCount / total : 0, emotions };
}

describe('isPathFollowed', () => {
    it('counts a path with a note', () => {
        expect(isPathFollowed('reflected today')).toBe(true);
    });

    it('does not count a blank or missing note', () => {
        expect(isPathFollowed('')).toBe(false);
        expect(isPathFollowed('   ')).toBe(false);
        expect(isPathFollowed(undefined)).toBe(false);
    });
});

describe('buildEmotionAnalytics', () => {
    it('returns a zeroed summary for no logs', () => {
        expect(buildEmotionAnalytics([])).toEqual({
            totalDays: 0,
            averagePositiveCount: 0,
            averageNegativeCount: 0,
            averagePNRatio: 0,
            emotionDiversity: 0,
            positiveDays: 0,
            negativeDays: 0,
            topEmotions: [],
            trends: [],
        });
    });

    it('averages counts and ratios across days', () => {
        const result = buildEmotionAnalytics([
            emotionLog('2025-01-01', 3, 1, [{ name: 'calm', type: 'positive' }]),
            emotionLog('2025-01-02', 1, 3, [{ name: 'tense', type: 'negative' }]),
        ]);

        expect(result.totalDays).toBe(2);
        expect(result.averagePositiveCount).toBe(2);
        expect(result.averageNegativeCount).toBe(2);
        expect(result.averagePNRatio).toBe(0.5);
    });

    it('splits days at a pnRatio of 0.5, counting the boundary as positive', () => {
        const result = buildEmotionAnalytics([emotionLog('2025-01-01', 2, 2, []), emotionLog('2025-01-02', 1, 3, [])]);

        expect(result.positiveDays).toBe(1);
        expect(result.negativeDays).toBe(1);
    });

    it('ranks emotions by how often they appear and counts distinct ones', () => {
        const result = buildEmotionAnalytics([
            emotionLog('2025-01-01', 2, 0, [
                { name: 'calm', type: 'positive' },
                { name: 'grateful', type: 'positive' },
            ]),
            emotionLog('2025-01-02', 1, 0, [{ name: 'calm', type: 'positive' }]),
        ]);

        expect(result.emotionDiversity).toBe(2);
        expect(result.topEmotions[0]).toEqual({ name: 'calm', type: 'positive', count: 2 });
        expect(result.topEmotions[1]?.count).toBe(1);
    });

    it('returns trends oldest-first regardless of input order', () => {
        const result = buildEmotionAnalytics([
            emotionLog('2025-01-03', 1, 0, []),
            emotionLog('2025-01-01', 1, 0, []),
            emotionLog('2025-01-02', 1, 0, []),
        ]);

        expect(result.trends.map((t) => t.date)).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    });

    it('counts an emotion named after an Object member without polluting the prototype', () => {
        const result = buildEmotionAnalytics([
            emotionLog('2026-01-01', 2, 0, [
                { name: '__proto__', type: 'positive' },
                { name: 'constructor', type: 'positive' },
            ]),
        ]);

        expect(result.topEmotions).toEqual([
            { name: '__proto__', type: 'positive', count: 1 },
            { name: 'constructor', type: 'positive', count: 1 },
        ]);
        expect(Object.hasOwn(Object.prototype, 'count')).toBe(false);
        expect(({} as Record<string, unknown>)['count']).toBeUndefined();
        expect(structuredClone(result.topEmotions)).toHaveLength(2);
    });

    it('tolerates a log stored without an emotions array', () => {
        const result = buildEmotionAnalytics([{ date: '2025-01-01', positiveCount: 1, negativeCount: 0, pnRatio: 1 }]);

        expect(result.emotionDiversity).toBe(0);
        expect(result.topEmotions).toEqual([]);
    });
});
