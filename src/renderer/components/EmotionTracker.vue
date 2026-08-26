<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEmotions } from '@/renderer/composables/useEmotions';
import { useEightfoldPath } from '@/renderer/composables/useEightfoldPath';
import EmotionAnalytics from '@/renderer/components/emotions/EmotionAnalytics.vue';
import EightfoldPathView from '@/renderer/components/emotions/EightfoldPathView.vue';
import DailyNotes from '@/renderer/components/emotions/DailyNotes.vue';

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

// Date state — every comparison here is day-granular, so the time is zeroed.
const selectedDate = ref(new Date(new Date().setHours(0, 0, 0, 0)));
const activeTab = ref('positive');

const isToday = computed(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate.value);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() >= todayDate.getTime();
});

// Composables
const {
    selectedEmotions,
    dailyNote,
    saveStatus,
    loadingEmotions,
    loading,
    analytics,
    positiveEmotions,
    negativeEmotions,
    positiveCount,
    negativeCount,
    pnRatio,
    topPositiveEmotions,
    topNegativeEmotions,
    isEmotionSelected,
    getTranslatedEmotionName,
    toggleEmotion,
    handleNoteInput,
    loadEmotions,
    loadAnalytics,
} = useEmotions(selectedDate, activeTab);

const {
    followedPaths,
    pathNotes,
    loadingPath,
    eightfoldPaths,
    efCompletedCount,
    efProgressPercentage,
    isPathFollowed,
    togglePath,
    debouncedSavePath,
    loadPathData,
} = useEightfoldPath(selectedDate, saveStatus);

function formatDate(date: Date | string): string {
    const parsed = typeof date === 'string' ? new Date(date) : date;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function changeDate(delta: number): void {
    const newDate = new Date(selectedDate.value);
    newDate.setDate(newDate.getDate() + delta);
    newDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (newDate.getTime() <= todayDate.getTime()) {
        selectedDate.value = newDate;
    }
}

// Orchestration
watch(selectedDate, () => {
    void loadEmotions();
    void loadPathData();
});

watch(activeTab, async (newTab) => {
    if (newTab === 'analytics') await loadAnalytics();
    if (newTab === 'eightfold') await loadPathData();
});

onMounted(() => {
    void loadEmotions();
    void loadPathData();
});
</script>

<template>
    <div class="emotion-inline">
        <div class="inline-header">
            <div class="inline-title-row">
                <div class="inline-date-selector">
                    <button
                        class="zen-icon-btn inline-date-btn"
                        aria-label="Previous day"
                        @click="changeDate(-1)">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none">
                            <path
                                d="M15 18l-6-6 6-6"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                    </button>
                    <span class="inline-date-text">{{ formatDate(selectedDate) }}</span>
                    <button
                        class="zen-icon-btn inline-date-btn"
                        :disabled="isToday"
                        aria-label="Next day"
                        @click="changeDate(1)">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none">
                            <path
                                d="M9 18l6-6-6-6"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                    </button>
                </div>
                <button
                    class="zen-icon-btn inline-close-btn"
                    aria-label="Close"
                    @click="emit('close')">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none">
                        <path
                            d="M18 6L6 18M6 6l12 12"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round" />
                    </svg>
                </button>
            </div>

            <div class="inline-stats">
                <div class="inline-stat positive">
                    <span class="inline-stat-value">{{ positiveCount }}</span>
                    <span class="inline-stat-label">{{ t('emotions.positive') }}</span>
                </div>
                <div class="inline-stat-divider"></div>
                <div class="inline-stat ratio">
                    <span class="inline-stat-value">{{ pnRatio }}</span>
                    <span class="inline-stat-label">{{ t('emotions.pnRatio') }}</span>
                </div>
                <div class="inline-stat-divider"></div>
                <div class="inline-stat negative">
                    <span class="inline-stat-value">{{ negativeCount }}</span>
                    <span class="inline-stat-label">{{ t('emotions.negative') }}</span>
                </div>
            </div>
        </div>

        <div class="inline-tabs">
            <button
                v-for="tab in [
                    { key: 'positive', label: `${t('emotions.positiveTab')} (${positiveEmotions.length})` },
                    { key: 'negative', label: `${t('emotions.negativeTab')} (${negativeEmotions.length})` },
                    { key: 'analytics', label: t('emotions.analytics') },
                    { key: 'eightfold', label: t('eightfold.title') },
                    { key: 'notes', label: t('emotions.dailyNote') },
                ]"
                :key="tab.key"
                class="inline-tab"
                :class="[{ active: activeTab === tab.key }]"
                @click="activeTab = tab.key">
                {{ tab.label }}
            </button>
        </div>

        <div class="inline-content">
            <div
                v-if="activeTab === 'positive' || activeTab === 'negative'"
                :key="`${selectedDate.getTime()}-${selectedEmotions.length}`"
                class="emotion-list">
                <div
                    v-if="loadingEmotions"
                    class="loading"
                    >{{ t('emotions.loading') || 'Loading' }}...</div
                >
                <label
                    v-for="emotion in activeTab === 'positive' ? positiveEmotions : negativeEmotions"
                    v-else
                    :key="emotion.name"
                    class="inline-emotion-item">
                    <input
                        type="checkbox"
                        :checked="isEmotionSelected(emotion.name)"
                        @change="toggleEmotion(emotion)" />
                    <span class="inline-emotion-name">{{ emotion.displayName }}</span>
                    <span class="inline-emotion-desc">{{ emotion.description }}</span>
                </label>
            </div>

            <EmotionAnalytics
                v-if="activeTab === 'analytics'"
                :loading="loading"
                :analytics="analytics"
                :top-positive-emotions="topPositiveEmotions"
                :top-negative-emotions="topNegativeEmotions"
                :get-translated-emotion-name="getTranslatedEmotionName"
                :format-date="formatDate" />

            <DailyNotes
                v-if="activeTab === 'notes'"
                :daily-note="dailyNote"
                :selected-date="selectedDate"
                :format-date="formatDate"
                @update:daily-note="dailyNote = $event"
                @note-input="handleNoteInput" />

            <EightfoldPathView
                v-if="activeTab === 'eightfold'"
                :loading="loadingPath"
                :paths="eightfoldPaths"
                :followed-paths="followedPaths"
                :path-notes="pathNotes"
                :completed-count="efCompletedCount"
                :progress-percentage="efProgressPercentage"
                :is-path-followed="isPathFollowed"
                @toggle-path="togglePath"
                @save-path="debouncedSavePath" />
        </div>

        <transition name="save-indicator">
            <div
                v-if="saveStatus"
                class="save-indicator"
                :class="saveStatus">
                <span
                    v-if="saveStatus === 'saving'"
                    class="save-spinner"></span>
                <svg
                    v-else
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none">
                    <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
                <span class="save-label">{{
                    saveStatus === 'saving' ? t('emotions.saving') : t('emotions.saved')
                }}</span>
            </div>
        </transition>
    </div>
</template>

<style scoped lang="scss">
.emotion-list {
    display: grid;
    gap: $space-3;
}

.emotion-name {
    flex: 1;
    min-width: auto;
    color: $text1;
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
}

/* ––––– Save indicator ––––– */

.save-indicator {
    position: fixed;
    bottom: $size-28;
    left: 50%;
    z-index: $z-overlay-raised;
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-1 $space-3;
    border-radius: $border-radius-3xl;
    font-size: $font-size-xs;
    letter-spacing: $letter-spacing-2;
    transform: translateX(-50%);
    pointer-events: none;
    backdrop-filter: blur($blur-base);

    &.saving {
        background: color-mix(in srgb, $warning 10%, transparent);
        border: $border-width-thin color-mix(in srgb, $warning 15%, transparent);
        color: color-mix(in srgb, $warning 80%, transparent);
    }

    &.saved {
        background: color-mix(in srgb, $positive 10%, transparent);
        border: $border-width-thin color-mix(in srgb, $positive 15%, transparent);
        color: color-mix(in srgb, $positive 80%, transparent);
    }
}

.save-spinner {
    flex-shrink: 0;
    width: $size-6;
    height: $size-6;
    border: $border-width-medium transparent;
    border-top-color: currentcolor;
    border-radius: $border-radius-round;
    animation: spin $duration-spin linear infinite;
}

.save-label {
    font-weight: $font-weight-normal;
    text-transform: uppercase;
}

.save-indicator-enter-active {
    transition:
        opacity $transition-slow,
        transform $duration-slow $ease-standard;
}

.save-indicator-leave-active {
    transition:
        opacity $transition-gentle,
        transform $duration-gentle $ease-standard;
}

.save-indicator-enter-from {
    opacity: $opacity-faint;
    transform: translateX(-50%) translateY($size-4);
}

.save-indicator-leave-to {
    opacity: $opacity-faint;
    transform: translateX(-50%) translateY(-$size-3);
}

/* ––––– Inline mode ––––– */

.emotion-inline {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    -webkit-app-region: no-drag;
}

.inline-header {
    display: flex;
    flex-direction: column;
    gap: $space-4;
    padding-bottom: $space-5;
    border-bottom: $border-width-thin $input-border;
}

.inline-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.inline-title {
    margin: 0;
    color: $text1;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    letter-spacing: $letter-spacing-1;
}

.inline-date-selector {
    display: flex;
    align-items: center;
    gap: $space-2;
}

.inline-date-text {
    min-width: $size-33;
    color: $text2;
    font-size: $font-size-xs;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.inline-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-4;
}

.inline-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-1;
}

.inline-stat-value {
    color: $text1;
    font-size: $font-size-xl;
    font-weight: $font-weight-semibold;
    line-height: $line-height-none;
    font-variant-numeric: tabular-nums;
}

.inline-stat-label {
    color: $text2;
    font-size: $font-size-xxs;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-5;
}

.inline-stat-divider {
    width: $size-0;
    height: $size-16;
    background: $input-border;
    opacity: $opacity-mid-low;
}

.inline-tabs {
    display: flex;
    gap: 0;
    padding: $space-2 0;
    border-bottom: $border-width-thin $input-border;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
}

.inline-tab {
    flex: 0 0 auto;
    padding: $space-2;
    background: transparent;
    border: none;
    border-bottom: $border-width-thick transparent;
    color: $text2;
    font-size: $font-size-xxs;
    font-weight: $font-weight-normal;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-3;
    cursor: pointer;
    transition:
        color $transition-base,
        border-color $transition-base;

    &:hover {
        color: $text1;
    }

    &.active {
        border-bottom-color: $text1;
        color: $text1;
        font-weight: $font-weight-medium;
    }
}

.inline-content {
    min-height: $size-40;
    padding: $space-3 0 0;
}

.inline-emotion-item {
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: 0 $space-2;
    padding: $space-2 $space-1;
    border-bottom: $border-width-thin $input-border;
    cursor: pointer;
    transition: background $transition-fast;

    &:hover {
        background: $input-bg-focus;
    }

    &:last-child {
        border-bottom: none;
    }

    input[type='checkbox'] {
        grid-row: 1 / 3;
        width: $size-9;
        height: $size-9;
        margin: $space-0 0 0;
        accent-color: $text1;
        cursor: pointer;
    }
}

.inline-emotion-name {
    color: $text1;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
    line-height: $line-height-tight;
}

.inline-emotion-desc {
    grid-column: 2;
    color: $text2;
    font-size: $font-size-xxs;
    line-height: $line-height-snug;
    opacity: $opacity-mid-high;
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-xl}) {
    .emotion-list {
        gap: $space-2;
    }

    .emotion-name {
        flex: 0 1 auto;
        min-width: $size-36;
    }

    .inline-header {
        gap: $space-5;
    }

    .inline-stats {
        gap: $space-6;
    }

    .inline-title {
        font-size: $font-size-lg;
    }

    .inline-stat-value {
        font-size: $font-size-2xl;
    }

    .inline-tabs {
        padding: $space-3 0;
    }

    .inline-tab {
        padding: $space-2 $space-3;
        font-size: $font-size-xs;
    }

    .inline-content {
        padding: $space-4 0 0;
    }
}
</style>
