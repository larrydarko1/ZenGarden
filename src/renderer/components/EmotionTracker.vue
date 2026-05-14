<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEmotions } from '../composables/useEmotions';
import { useEightfoldPath } from '../composables/useEightfoldPath';
import EmotionAnalytics from './emotions/EmotionAnalytics.vue';
import EightfoldPathView from './emotions/EightfoldPathView.vue';
import DailyNotes from './emotions/DailyNotes.vue';

const { t } = useI18n();
const emit = defineEmits(['close']);

// Date state
const today = new Date();
today.setHours(0, 0, 0, 0);
const selectedDate = ref(today);
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

function formatDate(date: Date | string) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function changeDate(delta: number) {
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
    loadEmotions();
    loadPathData();
});

watch(activeTab, async (newTab) => {
    if (newTab === 'analytics') await loadAnalytics();
    if (newTab === 'eightfold') await loadPathData();
});

onMounted(() => {
    loadEmotions();
    loadPathData();
});
</script>

<template>
    <div class="emotion-inline">
        <div class="inline-header">
            <div class="inline-title-row">
                <div class="inline-date-selector">
                    <button class="inline-date-btn" aria-label="Previous day" @click="changeDate(-1)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M15 18l-6-6 6-6"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                    <span class="inline-date-text">{{ formatDate(selectedDate) }}</span>
                    <button class="inline-date-btn" :disabled="isToday" aria-label="Next day" @click="changeDate(1)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M9 18l6-6-6-6"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                </div>
                <button class="inline-close-btn" aria-label="Close" @click="emit('close')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
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
                :class="['inline-tab', { active: activeTab === tab.key }]"
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
            </button>
        </div>

        <div class="inline-content">
            <div
                v-if="activeTab === 'positive' || activeTab === 'negative'"
                :key="`${selectedDate.getTime()}-${selectedEmotions.length}`"
                class="emotion-list"
            >
                <div v-if="loadingEmotions" class="loading">{{ t('emotions.loading') || 'Loading' }}...</div>
                <label
                    v-for="emotion in activeTab === 'positive' ? positiveEmotions : negativeEmotions"
                    v-else
                    :key="emotion.name"
                    class="inline-emotion-item"
                >
                    <input
                        type="checkbox"
                        :checked="isEmotionSelected(emotion.name)"
                        @change="toggleEmotion(emotion)"
                    />
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
                :format-date="formatDate"
            />

            <DailyNotes
                v-if="activeTab === 'notes'"
                :daily-note="dailyNote"
                :selected-date="selectedDate"
                :format-date="formatDate"
                @update:daily-note="dailyNote = $event"
                @note-input="handleNoteInput"
            />

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
                @save-path="debouncedSavePath"
            />
        </div>

        <transition name="save-indicator">
            <div v-if="saveStatus" class="save-indicator" :class="saveStatus">
                <span v-if="saveStatus === 'saving'" class="save-spinner"></span>
                <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
                <span class="save-label">{{
                    saveStatus === 'saving' ? t('emotions.saving') : t('emotions.saved')
                }}</span>
            </div>
        </transition>
    </div>
</template>

<style scoped>
.emotion-list {
    display: grid;
    gap: 0.6rem;
}

.emotion-name {
    font-weight: 600;
    color: var(--text1);
    min-width: 130px;
    font-size: 0.95rem;
}

.save-indicator {
    position: fixed;
    bottom: 4rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.7rem;
    letter-spacing: 0.03em;
    z-index: 200;
    pointer-events: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.save-indicator.saving {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.15);
    color: rgba(255, 193, 7, 0.8);
}

.save-indicator.saved {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.15);
    color: rgba(76, 175, 80, 0.8);
}

.save-spinner {
    width: 10px;
    height: 10px;
    border: 1.5px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.save-label {
    text-transform: uppercase;
    font-weight: 400;
}

.save-indicator-enter-active {
    transition:
        opacity 0.3s ease,
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.save-indicator-leave-active {
    transition:
        opacity 0.4s ease,
        transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.save-indicator-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
}

.save-indicator-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
}

@media (max-width: 768px) {
    .emotion-list {
        gap: 0.75rem;
    }

    .emotion-name {
        min-width: auto;
        font-size: 1rem;
        flex: 1;
    }
}

/* Inline styles */

.emotion-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    -webkit-app-region: no-drag;
}

.inline-header {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--input-border);
}

.inline-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.inline-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--text1);
    letter-spacing: 0.02em;
}

.inline-date-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.inline-date-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.15s;
}

.inline-date-btn:hover:not(:disabled) {
    background: var(--input-bg-focus);
    color: var(--text1);
    border-color: var(--input-border-focus);
}

.inline-date-btn:disabled {
    opacity: 0.3;
    cursor: default;
}

.inline-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.15s;
}

.inline-close-btn:hover {
    background: var(--input-bg-focus);
    color: var(--text1);
    border-color: var(--input-border-focus);
}

.inline-date-text {
    font-size: 0.8rem;
    color: var(--text2);
    min-width: 100px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.inline-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
}

.inline-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
}

.inline-stat-value {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text1);
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

.inline-stat-label {
    font-size: 0.65rem;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 400;
}

.inline-stat-divider {
    width: 1px;
    height: 28px;
    background: var(--input-border);
    opacity: 0.5;
}

.inline-tabs {
    display: flex;
    gap: 0;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--input-border);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.inline-tabs::-webkit-scrollbar {
    display: none;
}

.inline-tab {
    flex: 0 0 auto;
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text2);
    font-size: 0.72rem;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.inline-tab:hover {
    color: var(--text1);
}

.inline-tab.active {
    color: var(--text1);
    border-bottom-color: var(--text1);
    font-weight: 500;
}

.inline-content {
    padding: 1rem 0 0;
    min-height: 200px;
}

.inline-emotion-item {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 0 0.6rem;
    padding: 0.5rem 0.25rem;
    border-bottom: 1px solid var(--input-border);
    cursor: pointer;
    transition: background 0.15s;
    align-items: start;
}

.inline-emotion-item:hover {
    background: var(--input-bg-focus);
}

.inline-emotion-item:last-child {
    border-bottom: none;
}

.inline-emotion-item input[type='checkbox'] {
    grid-row: 1 / 3;
    margin: 0;
    margin-top: 0.15rem;
    width: 14px;
    height: 14px;
    accent-color: var(--text1);
    cursor: pointer;
}

.inline-emotion-name {
    font-size: 0.8rem;
    color: var(--text1);
    font-weight: 400;
    line-height: 1.3;
}

.inline-emotion-desc {
    grid-column: 2;
    font-size: 0.68rem;
    color: var(--text2);
    line-height: 1.4;
    opacity: 0.7;
}

/* Inline mode responsive */
@media (max-width: 768px) {
    .emotion-inline {
        width: 100%;
    }

    .inline-header {
        gap: 1rem;
    }

    .inline-title {
        font-size: 1rem;
    }

    .inline-stats {
        gap: 1rem;
    }

    .inline-stat-value {
        font-size: 1.2rem;
    }

    .inline-tabs {
        gap: 0;
        padding: 0.5rem 0;
    }

    .inline-tab {
        padding: 0.4rem 0.5rem;
        font-size: 0.68rem;
    }

    .inline-content {
        padding: 0.75rem 0 0;
    }
}
</style>
