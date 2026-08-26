<script setup lang="ts">
import { useI18n } from 'vue-i18n';

type EmotionStat = {
    name: string;
    count: number;
    type?: string;
};

type TrendDay = {
    date: string;
    pnRatio: number;
};

type Analytics = {
    totalDays: number;
    averagePNRatio: number | string;
    emotionDiversity: number;
    positiveDays: number;
    negativeDays: number;
    topEmotions: EmotionStat[];
    trends: TrendDay[];
};

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
        <div
            v-if="props.loading"
            class="loading"
            >{{ t('emotions.loadingAnalytics') }}...</div
        >
        <div
            v-else-if="props.analytics && props.analytics.totalDays > 0"
            class="analytics-content">
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
                        :style="{ width: `${(props.analytics.positiveDays / props.analytics.totalDays) * 100}%` }">
                        {{ props.analytics.positiveDays }}
                    </div>
                    <div
                        class="days-bar-segment negative"
                        :style="{ width: `${(props.analytics.negativeDays / props.analytics.totalDays) * 100}%` }">
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
                        class="top-emotion-item">
                        <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                        <span class="emotion-name">{{ props.getTranslatedEmotionName(emotion.name) }}</span>
                        <span class="emotion-bar-container"
                            ><span
                                class="emotion-bar"
                                :class="emotion.type"
                                :style="{
                                    width: `${(emotion.count / props.analytics.topEmotions[0].count) * 100}%`,
                                }"></span
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
                        class="top-emotion-item">
                        <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                        <span class="emotion-name">{{ props.getTranslatedEmotionName(emotion.name) }}</span>
                        <span class="emotion-bar-container"
                            ><span
                                class="emotion-bar positive"
                                :style="{
                                    width: `${props.topPositiveEmotions.length > 0 ? (emotion.count / props.topPositiveEmotions[0].count) * 100 : 0}%`,
                                }"></span
                        ></span>
                        <span class="emotion-count">{{ emotion.count }}</span>
                    </div>
                    <div
                        v-if="props.topPositiveEmotions.length === 0"
                        class="no-data-message">
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
                        class="top-emotion-item">
                        <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                        <span class="emotion-name">{{ props.getTranslatedEmotionName(emotion.name) }}</span>
                        <span class="emotion-bar-container"
                            ><span
                                class="emotion-bar negative"
                                :style="{
                                    width: `${props.topNegativeEmotions.length > 0 ? (emotion.count / props.topNegativeEmotions[0].count) * 100 : 0}%`,
                                }"></span
                        ></span>
                        <span class="emotion-count">{{ emotion.count }}</span>
                    </div>
                    <div
                        v-if="props.topNegativeEmotions.length === 0"
                        class="no-data-message">
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
                        :title="`${props.formatDate(day.date)}: P/N Ratio ${Number(day.pnRatio).toFixed(2)}`"></div>
                </div>
                <div class="trend-labels">
                    <span>{{ t('emotions.past90Days') }}</span>
                </div>
            </div>
        </div>
        <div
            v-else
            class="empty-analytics">
            <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M3 13h2l2-4 4 8 4-12 2 4h4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
            </svg>
            <p>{{ t('emotions.noDataYet') }}</p>
            <span>{{ t('emotions.trackEmotionsFirst') }}</span>
        </div>
    </div>
</template>

<style scoped lang="scss">
.analytics-view {
    min-height: auto;
}

.loading {
    padding: $space-7;
    color: $text2;
    font-size: $font-size-base;
    text-align: center;
}

.empty-analytics {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $space-10 $space-7;
    color: $text2;
    text-align: center;

    svg {
        margin-bottom: $space-4;
        opacity: $opacity-mid-low;
    }

    p {
        margin: 0 0 $space-2;
        color: $text1;
        font-size: $font-size-lg;
        font-weight: $font-weight-medium;
    }

    span {
        font-size: $font-size-sm;
        opacity: $opacity-higher;
    }
}

.analytics-content {
    display: flex;
    flex-direction: column;
    gap: $space-6;
}

/* ––––– Summary cards ––––– */

.analytics-summary {
    display: grid;
    grid-template-columns: 1fr;
    gap: $space-3;
}

.analytics-card {
    min-height: $size-30;
    padding: $space-4;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    text-align: center;
}

.analytics-label {
    margin-bottom: $space-2;
    color: $text2;
    font-size: $font-size-xs;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-2;
}

.analytics-value {
    color: $text1;
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
}

.analytics-section {
    padding: $space-4;
    background: $blur1;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;

    h3 {
        margin: 0 0 $space-4;
        color: $text1;
        font-size: $font-size-lg;
    }
}

/* ––––– Positive / negative day split ––––– */

.days-bar {
    display: flex;
    height: $size-20;
    margin-bottom: $space-4;
    border-radius: $border-radius;
    overflow: hidden;
}

.days-bar-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    transition: flex-basis $transition-slow;

    &.positive {
        background: color-mix(in srgb, $positive 30%, transparent);
        color: $positive;
    }

    &.negative {
        background: color-mix(in srgb, $negative 30%, transparent);
        color: $negative;
    }
}

.days-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: $space-5;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: $space-2;
    color: $text2;
    font-size: $font-size-sm;
}

.legend-dot {
    width: $size-7;
    height: $size-7;
    border-radius: $border-radius-round;

    &.positive {
        background: $positive;
    }

    &.negative {
        background: $negative;
    }
}

/* ––––– Top emotions ––––– */

.top-emotions-list {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.top-emotion-item {
    display: grid;
    grid-template-columns: $track-xs 1fr $track-sm;
    align-items: center;
    gap: $space-3;
    padding: $space-3 0;
    border-bottom: $border-width-thin $input-border;
    font-size: $font-size-sm;

    &:last-child {
        border-bottom: none;
    }
}

.emotion-rank {
    color: $text2;
    font-weight: $font-weight-semibold;
    text-align: center;
}

.emotion-name {
    color: $text1;
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
}

.emotion-bar-container {
    grid-column: 1 / -1;
    height: $size-14;
    margin-top: $space-2;
    background: $input-bg;
    border-radius: $border-radius-sm;
    overflow: hidden;
}

.emotion-bar {
    display: block;
    height: 100%;
    border-radius: $border-radius-sm;
    transition: width $transition-slow;

    &.positive {
        background: linear-gradient(
            90deg,
            color-mix(in srgb, $positive 30%, transparent),
            color-mix(in srgb, $positive 60%, transparent)
        );
    }

    &.negative {
        background: linear-gradient(
            90deg,
            color-mix(in srgb, $negative 30%, transparent),
            color-mix(in srgb, $negative 60%, transparent)
        );
    }
}

.emotion-count {
    grid-row: 1;
    grid-column: 3;
    color: $text1;
    font-weight: $font-weight-semibold;
    text-align: right;
}

/* ––––– Trend chart ––––– */

.trend-chart {
    display: flex;
    align-items: flex-end;
    gap: $space-0;
    height: $size-34;
    padding: $space-3;
    background: $input-bg;
    border-radius: $border-radius;
}

.trend-bar {
    flex: 1;
    min-height: $size-3;
    border-radius: $border-radius-xs;
    cursor: pointer;
    transition:
        opacity $transition-base,
        transform $transition-base;

    &.positive {
        background: color-mix(in srgb, $positive 60%, transparent);
    }

    &.negative {
        background: color-mix(in srgb, $negative 60%, transparent);
    }

    &:hover {
        opacity: $opacity-higher;
        transform: scaleY($scale-105);
    }
}

.no-data-message {
    padding: $space-6;
    color: $text2;
    font-size: $font-size-sm;
    text-align: center;
    opacity: $opacity-mid-high;
}

.trend-labels {
    margin-top: $space-2;
    color: $text2;
    font-size: $font-size-xs;
    text-align: center;
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-md}) {
    .analytics-card,
    .analytics-section {
        padding: $space-5;
    }
}

@media (width > #{$breakpoint-xl}) {
    .analytics-view {
        min-height: $size-47;
    }

    .analytics-summary {
        grid-template-columns: repeat(3, 1fr);
    }

    .analytics-card {
        min-height: auto;
    }

    .analytics-section h3 {
        margin-bottom: $space-3;
        font-size: $font-size-base;
    }

    .days-bar {
        height: $size-19;
        margin-bottom: $space-3;
    }

    .days-legend {
        flex-wrap: nowrap;
        gap: $space-6;
    }

    .top-emotion-item {
        grid-template-columns: $track-xs $track-md 1fr $track-sm;
        padding: 0;
        border-bottom: none;
    }

    .emotion-bar-container {
        grid-column: auto;
        height: $size-13;
        margin-top: 0;
    }

    .emotion-count {
        grid-row: auto;
        grid-column: auto;
    }
}
</style>
