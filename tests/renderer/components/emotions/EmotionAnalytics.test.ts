import { describe, it, expect, vi } from 'vitest';
import { mountWithI18n } from '@test-utils';
import EmotionAnalytics from '@/renderer/components/emotions/EmotionAnalytics.vue';

const getTranslatedEmotionName = vi.fn((name: string) => `T(${name})`);
const formatDate = vi.fn((date: Date | string) => `d:${String(date)}`);

const analytics = {
    totalDays: 10,
    averagePNRatio: 0.6666,
    emotionDiversity: 7,
    positiveDays: 6,
    negativeDays: 4,
    topEmotions: [
        { name: 'calm', count: 8, type: 'positive' },
        { name: 'tense', count: 4, type: 'negative' },
    ],
    trends: [
        { date: '2025-01-14', pnRatio: 0.8 },
        { date: '2025-01-15', pnRatio: 0.2 },
    ],
};

function mountAnalytics(overrides: Record<string, unknown> = {}) {
    return mountWithI18n(EmotionAnalytics, {
        props: {
            loading: false,
            analytics,
            topPositiveEmotions: [{ name: 'calm', count: 8 }],
            topNegativeEmotions: [{ name: 'tense', count: 4 }],
            getTranslatedEmotionName,
            formatDate,
            ...overrides,
        },
    });
}

describe('EmotionAnalytics', () => {
    it('shows the loading line instead of the charts while the window is being read', () => {
        const wrapper = mountAnalytics({ loading: true });

        expect(wrapper.find('.loading').exists()).toBe(true);
        expect(wrapper.find('.analytics-content').exists()).toBe(false);
        wrapper.unmount();
    });

    it('shows the empty state when there is no analytics object at all', () => {
        const wrapper = mountAnalytics({ analytics: null });

        expect(wrapper.find('.empty-analytics').exists()).toBe(true);
        wrapper.unmount();
    });

    it('shows the empty state when the window contains zero tracked days', () => {
        const wrapper = mountAnalytics({ analytics: { ...analytics, totalDays: 0 } });

        expect(wrapper.find('.empty-analytics').exists()).toBe(true);
        expect(wrapper.find('.analytics-content').exists()).toBe(false);
        wrapper.unmount();
    });

    it('summarises days, ratio and diversity, rounding the ratio to two places', () => {
        const wrapper = mountAnalytics();

        const values = wrapper.findAll('.analytics-value').map((value) => value.text());
        expect(values).toEqual(['10', '0.67', '7']);
        wrapper.unmount();
    });

    it('passes an already-formatted ratio through untouched', () => {
        const wrapper = mountAnalytics({ analytics: { ...analytics, averagePNRatio: 'n/a' } });

        expect(wrapper.findAll('.analytics-value')[1].text()).toBe('n/a');
        wrapper.unmount();
    });

    it('splits the day bar in proportion to positive and negative days', () => {
        const wrapper = mountAnalytics();

        const segments = wrapper.findAll('.days-bar-segment');
        expect(segments[0].attributes('style')).toContain('width: 60%');
        expect(segments[1].attributes('style')).toContain('width: 40%');
        wrapper.unmount();
    });

    it('ranks top emotions and scales each bar against the leader', () => {
        const wrapper = mountAnalytics();

        const items = wrapper.findAll('.analytics-section')[1].findAll('.top-emotion-item');
        expect(items[0].find('.emotion-rank').text()).toBe('1');
        expect(items[0].find('.emotion-name').text()).toBe('T(calm)');
        expect(items[0].find('.emotion-bar').attributes('style')).toContain('width: 100%');
        expect(items[1].find('.emotion-bar').attributes('style')).toContain('width: 50%');
        wrapper.unmount();
    });

    it('says so rather than drawing an empty chart when one side has no data', () => {
        const wrapper = mountAnalytics({ topPositiveEmotions: [], topNegativeEmotions: [] });

        expect(wrapper.findAll('.no-data-message')).toHaveLength(2);
        wrapper.unmount();
    });

    it('colours each trend bar by which side of the midpoint the day fell', () => {
        const wrapper = mountAnalytics();

        const bars = wrapper.findAll('.trend-bar');
        expect(bars[0].classes()).toContain('positive');
        expect(bars[1].classes()).toContain('negative');
        wrapper.unmount();
    });

    it('captions each trend bar with its formatted date and ratio', () => {
        const wrapper = mountAnalytics();

        expect(wrapper.findAll('.trend-bar')[0].attributes('title')).toBe('d:2025-01-14: P/N Ratio 0.80');
        wrapper.unmount();
    });

    it('scales trend heights against the tallest day rather than a fixed ceiling', () => {
        const wrapper = mountAnalytics();

        const bars = wrapper.findAll('.trend-bar');
        expect(bars[0].attributes('style')).toContain('height: 100%');
        expect(bars[1].attributes('style')).toContain('height: 25%');
        wrapper.unmount();
    });
});
