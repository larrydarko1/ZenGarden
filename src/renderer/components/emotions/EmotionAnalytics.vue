<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface EmotionStat {
    name: string;
    count: number;
    type?: string;
}

interface TrendDay {
    date: string;
    pnRatio: number;
}

interface Analytics {
    totalDays: number;
    averagePNRatio: number | string;
    emotionDiversity: number;
    positiveDays: number;
    negativeDays: number;
    topEmotions: EmotionStat[];
    trends: TrendDay[];
}

const props = defineProps<{
    loading: boolean;
    analytics: Analytics | null;
    topPositiveEmotions: EmotionStat[];
    topNegativeEmotions: EmotionStat[];
    getTranslatedEmotionName: (name: string) => string;
    formatDate: (date: Date | string) => string;
}>();

const { t } = useI18n();
</script>

<template>
    <div class="analytics-view">
        <div v-if="props.loading" class="loading">{{ t('emotions.loadingAnalytics') }}...</div>
        <div v-else-if="props.analytics && props.analytics.totalDays > 0" class="analytics-content">
            <div class="analytics-summary">
                <div class="analytics-card">
                    <div class="analytics-label">{{ t('emotions.totalDaysTracked') }}</div>
                    <div class="analytics-value">{{ props.analytics.totalDays }}</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-label">{{ t('emotions.avgPNRatio') }}</div>
                    <div class="analytics-value">
                        {{
                            typeof props.analytics.averagePNRatio === 'number'
                                ? props.analytics.averagePNRatio.toFixed(2)
                                : props.analytics.averagePNRatio
                        }}
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-label">{{ t('emotions.emotionDiversity') }}</div>
                    <div class="analytics-value">{{ props.analytics.emotionDiversity }}</div>
                </div>
            </div>
            <div class="analytics-section">
                <h3>{{ t('emotions.daysSummary') }}</h3>
                <div class="days-bar">
                    <div
                        class="days-bar-segment positive"
                        :style="{ width: `${(props.analytics.positiveDays / props.analytics.totalDays) * 100}%` }"
                    >
                        {{ props.analytics.positiveDays }}
                    </div>
                    <div
                        class="days-bar-segment negative"
                        :style="{ width: `${(props.analytics.negativeDays / props.analytics.totalDays) * 100}%` }"
                    >
                        {{ props.analytics.negativeDays }}
                    </div>
                </div>
                <div class="days-legend">
                    <span class="legend-item"
                        ><span class="legend-dot positive"></span> {{ t('emotions.positiveDays') }}</span
                    >
                    <span class="legend-item"
                        ><span class="legend-dot negative"></span> {{ t('emotions.negativeDays') }}</span
                    >
                </div>
            </div>
            <div class="analytics-section">
                <h3>{{ t('emotions.topEmotions') }}</h3>
                <div class="top-emotions-list">
                    <div
                        v-for="(emotion, idx) in props.analytics.topEmotions.slice(0, 10)"
                        :key="emotion.name"
                        class="top-emotion-item"
                    >
                        <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                        <span class="emotion-name">{{ props.getTranslatedEmotionName(emotion.name) }}</span>
                        <span class="emotion-bar-container"
                            ><span
                                class="emotion-bar"
                                :class="emotion.type"
                                :style="{
                                    width: `${(emotion.count / props.analytics.topEmotions[0].count) * 100}%`,
                                }"
                            ></span
                        ></span>
                        <span class="emotion-count">{{ emotion.count }}</span>
                    </div>
                </div>
            </div>
            <div class="analytics-section">
                <h3>{{ t('emotions.topPositiveEmotions') }}</h3>
                <div class="top-emotions-list">
                    <div
                        v-for="(emotion, idx) in props.topPositiveEmotions"
                        :key="emotion.name"
                        class="top-emotion-item"
                    >
                        <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                        <span class="emotion-name">{{ props.getTranslatedEmotionName(emotion.name) }}</span>
                        <span class="emotion-bar-container"
                            ><span
                                class="emotion-bar positive"
                                :style="{
                                    width: `${props.topPositiveEmotions.length > 0 ? (emotion.count / props.topPositiveEmotions[0].count) * 100 : 0}%`,
                                }"
                            ></span
                        ></span>
                        <span class="emotion-count">{{ emotion.count }}</span>
                    </div>
                    <div v-if="props.topPositiveEmotions.length === 0" class="no-data-message">
                        {{ t('emotions.noPositiveEmotionsYet') }}
                    </div>
                </div>
            </div>
            <div class="analytics-section">
                <h3>{{ t('emotions.topNegativeEmotions') }}</h3>
                <div class="top-emotions-list">
                    <div
                        v-for="(emotion, idx) in props.topNegativeEmotions"
                        :key="emotion.name"
                        class="top-emotion-item"
                    >
                        <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                        <span class="emotion-name">{{ props.getTranslatedEmotionName(emotion.name) }}</span>
                        <span class="emotion-bar-container"
                            ><span
                                class="emotion-bar negative"
                                :style="{
                                    width: `${props.topNegativeEmotions.length > 0 ? (emotion.count / props.topNegativeEmotions[0].count) * 100 : 0}%`,
                                }"
                            ></span
                        ></span>
                        <span class="emotion-count">{{ emotion.count }}</span>
                    </div>
                    <div v-if="props.topNegativeEmotions.length === 0" class="no-data-message">
                        {{ t('emotions.noNegativeEmotionsYet') }}
                    </div>
                </div>
            </div>
            <div class="analytics-section">
                <h3>{{ t('emotions.trendChart') }}</h3>
                <div class="trend-chart">
                    <div
                        v-for="(day, idx) in props.analytics.trends.slice(0, 90)"
                        :key="idx"
                        class="trend-bar"
                        :style="{
                            height: `${Math.min((day.pnRatio / (props.analytics.trends.reduce((max: number, d: TrendDay) => Math.max(max, d.pnRatio), 0) || 1)) * 100, 100)}%`,
                        }"
                        :class="{
                            positive: Number(day.pnRatio) >= 0.5,
                            negative: Number(day.pnRatio) < 0.5,
                        }"
                        :title="`${props.formatDate(day.date)}: P/N Ratio ${Number(day.pnRatio).toFixed(2)}`"
                    ></div>
                </div>
                <div class="trend-labels">
                    <span>{{ t('emotions.past90Days') }}</span>
                </div>
            </div>
        </div>
        <div v-else class="empty-analytics">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M3 13h2l2-4 4 8 4-12 2 4h4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
            <p>{{ t('emotions.noDataYet') }}</p>
            <span>{{ t('emotions.trackEmotionsFirst') }}</span>
        </div>
    </div>
</template>

<style scoped>
.analytics-view {
    min-height: 400px;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: var(--text2);
    font-size: 1rem;
}

.empty-analytics {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    color: var(--text2);

    svg {
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    p {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--text1);
    }

    span {
        font-size: 0.9rem;
        opacity: 0.8;
    }
}

.analytics-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.analytics-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
}

.analytics-card {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1.25rem;
    text-align: center;
}

.analytics-label {
    font-size: 0.8rem;
    color: var(--text2);
    margin-bottom: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.analytics-value {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text1);
}

.analytics-section {
    background: var(--blur1);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1.25rem;
}

.analytics-section h3 {
    margin: 0 0 0.85rem;
    color: var(--text1);
    font-size: 1.05rem;
}

.days-bar {
    display: flex;
    height: 36px;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 0.85rem;
}

.days-bar-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.3s;
}

.days-bar-segment.positive {
    background: rgba(76, 175, 80, 0.3);
    color: #4caf50;
}

.days-bar-segment.negative {
    background: rgba(244, 67, 54, 0.3);
    color: #f44336;
}

.days-legend {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--text2);
    font-size: 0.85rem;
}

.legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.legend-dot.positive {
    background: #4caf50;
}

.legend-dot.negative {
    background: #f44336;
}

.top-emotions-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.top-emotion-item {
    display: grid;
    grid-template-columns: 28px 140px 1fr 48px;
    gap: 0.85rem;
    align-items: center;
    font-size: 0.9rem;
}

.emotion-rank {
    color: var(--text2);
    font-weight: 600;
    text-align: center;
}

.emotion-name {
    font-weight: 600;
    color: var(--text1);
    font-size: 0.95rem;
}

.emotion-bar-container {
    background: var(--input-bg);
    height: 22px;
    border-radius: 4px;
    overflow: hidden;
}

.emotion-bar {
    display: block;
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
}

.emotion-bar.positive {
    background: linear-gradient(90deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.6));
}

.emotion-bar.negative {
    background: linear-gradient(90deg, rgba(244, 67, 54, 0.3), rgba(244, 67, 54, 0.6));
}

.emotion-count {
    color: var(--text1);
    font-weight: 600;
    text-align: right;
}

.trend-chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 120px;
    padding: 0.85rem;
    background: var(--input-bg);
    border-radius: 6px;
}

.trend-bar {
    flex: 1;
    min-height: 4px;
    border-radius: 2px;
    transition: all 0.2s;
    cursor: pointer;
}

.trend-bar.positive {
    background: rgba(76, 175, 80, 0.6);
}

.trend-bar.negative {
    background: rgba(244, 67, 54, 0.6);
}

.trend-bar:hover {
    opacity: 0.8;
    transform: scaleY(1.05);
}

.no-data-message {
    text-align: center;
    padding: 1.5rem;
    color: var(--text2);
    font-size: 0.9rem;
    opacity: 0.7;
}

.trend-labels {
    text-align: center;
    color: var(--text2);
    font-size: 0.8rem;
    margin-top: 0.45rem;
}

@media (max-width: 768px) {
    .analytics-view {
        min-height: auto;
    }

    .loading {
        padding: 2rem;
        font-size: 1rem;
    }

    .analytics-content {
        gap: 1.5rem;
    }

    .analytics-summary {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    .analytics-card {
        padding: 1.25rem;
        min-height: 80px;
    }

    .analytics-label {
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
    }

    .analytics-value {
        font-size: 2rem;
    }

    .analytics-section {
        padding: 1.25rem;
    }

    .analytics-section h3 {
        font-size: 1.1rem;
        margin-bottom: 1rem;
    }

    .days-bar {
        height: 40px;
        margin-bottom: 1rem;
    }

    .days-bar-segment {
        font-size: 0.85rem;
    }

    .days-legend {
        gap: 1.25rem;
        flex-wrap: wrap;
    }

    .legend-item {
        gap: 0.5rem;
        font-size: 0.85rem;
    }

    .legend-dot {
        width: 12px;
        height: 12px;
    }

    .top-emotions-list {
        gap: 0.75rem;
    }

    .top-emotion-item {
        grid-template-columns: 28px 1fr 48px;
        gap: 0.75rem;
        font-size: 0.9rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--input-border);
    }

    .top-emotion-item:last-child {
        border-bottom: none;
    }

    .emotion-rank {
        font-size: 0.9rem;
    }

    .emotion-bar-container {
        grid-column: 1 / -1;
        height: 24px;
        margin-top: 0.5rem;
    }

    .emotion-count {
        grid-column: 3;
        grid-row: 1;
        font-size: 0.9rem;
    }

    .trend-chart {
        height: 120px;
        padding: 0.75rem;
        gap: 2px;
    }

    .trend-labels {
        font-size: 0.8rem;
        margin-top: 0.5rem;
    }
}

@media (max-width: 480px) {
    .analytics-card {
        padding: 1rem;
    }

    .analytics-section {
        padding: 1rem;
    }
}
</style>
