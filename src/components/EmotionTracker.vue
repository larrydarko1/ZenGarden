<template>
  <div class="emotion-inline">
    <div class="inline-header">
      <div class="inline-title-row">
        <h2 class="inline-title">{{ t('emotions.title') }}</h2>
        <div class="inline-date-selector">
          <button class="inline-date-btn" @click="changeDate(-1)" aria-label="Previous day">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="inline-date-text">{{ formatDate(selectedDate) }}</span>
          <button class="inline-date-btn" @click="changeDate(1)" :disabled="isToday" aria-label="Next day">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
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
          { key: 'notes', label: t('emotions.dailyNote') }
        ]"
        :key="tab.key"
        :class="['inline-tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="inline-content">
      <div v-if="activeTab === 'positive' || activeTab === 'negative'" class="emotion-list" :key="`${selectedDate.getTime()}-${selectedEmotions.length}`">
        <div v-if="loadingEmotions" class="loading">{{ t('emotions.loading') || 'Loading' }}...</div>
        <label 
          v-else
          v-for="emotion in (activeTab === 'positive' ? positiveEmotions : negativeEmotions)"
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

      <div v-if="activeTab === 'analytics'" class="analytics-view">
        <div v-if="loading" class="loading">{{ t('emotions.loadingAnalytics') }}...</div>
        <div v-else-if="analytics && analytics.totalDays > 0" class="analytics-content">
          <div class="analytics-summary">
            <div class="analytics-card">
              <div class="analytics-label">{{ t('emotions.totalDaysTracked') }}</div>
              <div class="analytics-value">{{ analytics.totalDays }}</div>
            </div>
            <div class="analytics-card">
              <div class="analytics-label">{{ t('emotions.avgPNRatio') }}</div>
              <div class="analytics-value">{{ typeof analytics.averagePNRatio === 'number' ? analytics.averagePNRatio.toFixed(2) : analytics.averagePNRatio }}</div>
            </div>
            <div class="analytics-card">
              <div class="analytics-label">{{ t('emotions.emotionDiversity') }}</div>
              <div class="analytics-value">{{ analytics.emotionDiversity }}</div>
            </div>
          </div>
          <div class="analytics-section">
            <h3>{{ t('emotions.daysSummary') }}</h3>
            <div class="days-bar">
              <div class="days-bar-segment positive" :style="{ width: `${(analytics.positiveDays / analytics.totalDays * 100)}%` }">{{ analytics.positiveDays }}</div>
              <div class="days-bar-segment negative" :style="{ width: `${(analytics.negativeDays / analytics.totalDays * 100)}%` }">{{ analytics.negativeDays }}</div>
            </div>
            <div class="days-legend">
              <span class="legend-item"><span class="legend-dot positive"></span> {{ t('emotions.positiveDays') }}</span>
              <span class="legend-item"><span class="legend-dot negative"></span> {{ t('emotions.negativeDays') }}</span>
            </div>
          </div>
          <div class="analytics-section">
            <h3>{{ t('emotions.topEmotions') }}</h3>
            <div class="top-emotions-list">
              <div v-for="(emotion, idx) in analytics.topEmotions.slice(0, 10)" :key="emotion.name" class="top-emotion-item">
                <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                <span class="emotion-name">{{ getTranslatedEmotionName(emotion.name) }}</span>
                <span class="emotion-bar-container"><span class="emotion-bar" :class="emotion.type" :style="{ width: `${(emotion.count / analytics.topEmotions[0].count * 100)}%` }"></span></span>
                <span class="emotion-count">{{ emotion.count }}</span>
              </div>
            </div>
          </div>
          <div class="analytics-section">
            <h3>{{ t('emotions.topPositiveEmotions') }}</h3>
            <div class="top-emotions-list">
              <div v-for="(emotion, idx) in topPositiveEmotions" :key="emotion.name" class="top-emotion-item">
                <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                <span class="emotion-name">{{ getTranslatedEmotionName(emotion.name) }}</span>
                <span class="emotion-bar-container"><span class="emotion-bar positive" :style="{ width: `${topPositiveEmotions.length > 0 ? (emotion.count / topPositiveEmotions[0].count * 100) : 0}%` }"></span></span>
                <span class="emotion-count">{{ emotion.count }}</span>
              </div>
              <div v-if="topPositiveEmotions.length === 0" class="no-data-message">{{ t('emotions.noPositiveEmotionsYet') }}</div>
            </div>
          </div>
          <div class="analytics-section">
            <h3>{{ t('emotions.topNegativeEmotions') }}</h3>
            <div class="top-emotions-list">
              <div v-for="(emotion, idx) in topNegativeEmotions" :key="emotion.name" class="top-emotion-item">
                <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                <span class="emotion-name">{{ getTranslatedEmotionName(emotion.name) }}</span>
                <span class="emotion-bar-container"><span class="emotion-bar negative" :style="{ width: `${topNegativeEmotions.length > 0 ? (emotion.count / topNegativeEmotions[0].count * 100) : 0}%` }"></span></span>
                <span class="emotion-count">{{ emotion.count }}</span>
              </div>
              <div v-if="topNegativeEmotions.length === 0" class="no-data-message">{{ t('emotions.noNegativeEmotionsYet') }}</div>
            </div>
          </div>
          <div class="analytics-section">
            <h3>{{ t('emotions.trendChart') }}</h3>
            <div class="trend-chart">
              <div v-for="(day, idx) in analytics.trends.slice(0, 90)" :key="idx" class="trend-bar"
                :style="{ height: `${Math.min(day.pnRatio / (analytics.trends.reduce((max: number, d: any) => Math.max(max, d.pnRatio), 0) || 1) * 100, 100)}%` }"
                :class="{ positive: Number(day.pnRatio) >= 0.5, negative: Number(day.pnRatio) < 0.5 }"
                :title="`${formatDate(day.date)}: P/N Ratio ${Number(day.pnRatio).toFixed(2)}`"
              ></div>
            </div>
            <div class="trend-labels"><span>{{ t('emotions.past90Days') }}</span></div>
          </div>
        </div>
        <div v-else class="empty-analytics">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13h2l2-4 4 8 4-12 2 4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>{{ t('emotions.noDataYet') }}</p>
          <span>{{ t('emotions.trackEmotionsFirst') }}</span>
        </div>
      </div>

      <div v-if="activeTab === 'notes'" class="notes-view">
        <div class="notes-content">
          <div class="notes-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3>{{ t('emotions.dailyNote') }}</h3>
          </div>
          <p class="notes-date-label">{{ formatDate(selectedDate) }}</p>
          <textarea v-model="dailyNote" class="emotion-note-textarea" :placeholder="t('emotions.notePlaceholder')" @input="handleNoteInput" maxlength="2000"></textarea>
          <div class="note-footer">
            <span class="character-count">{{ dailyNote.length }} / 2000</span>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'eightfold'" class="eightfold-view">
        <div class="eightfold-inline-stats">
          <div class="eightfold-stat">
            <span class="eightfold-stat-label">{{ t('eightfold.completed') }}</span>
            <span class="eightfold-stat-value">{{ efCompletedCount }}/8</span>
          </div>
          <div class="eightfold-stat">
            <span class="eightfold-stat-label">{{ t('eightfold.progress') }}</span>
            <span class="eightfold-stat-value">{{ efProgressPercentage }}%</span>
          </div>
        </div>
        <div v-if="loadingPath" class="loading">{{ t('eightfold.loading') }}...</div>
        <div v-else class="eightfold-path-list">
          <div v-for="path in eightfoldPaths" :key="path.key" class="eightfold-path-item">
            <div class="eightfold-checkbox-row">
              <input type="checkbox" :id="`ef-${path.key}`" :checked="isPathFollowed(path.key)" @change="togglePath(path.key)" />
              <label :for="`ef-${path.key}`" class="eightfold-path-name">{{ path.displayName }}</label>
            </div>
            <div class="eightfold-path-desc">{{ path.description }}</div>
            <div class="eightfold-path-question">{{ path.questions }}</div>
            <div v-if="isPathFollowed(path.key)" class="eightfold-path-note">
              <textarea v-model="pathNotes[path.key]" :placeholder="t('eightfold.notesPlaceholder')" @input="debouncedSavePath" rows="2"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="saveStatus" class="save-status" :class="saveStatus">
      {{ saveStatus === 'saving' ? t('emotions.saving') : t('emotions.saved') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEmotionLog, getEmotionLogs, getEmotionAnalytics, saveEightfoldPathLog, getEightfoldPathLogs } from '../store';

const { t } = useI18n();
const emit = defineEmits(['close']);

// Initialize to today at start of day
const today = new Date();
today.setHours(0, 0, 0, 0);
const selectedDate = ref(today);
const activeTab = ref('positive');
const selectedEmotions = ref<Array<{ name: string; type: string; description: string }>>([]);
const saveStatus = ref<'saving' | 'saved' | null>(null);
const loading = ref(false);
const loadingEmotions = ref(false);
const analytics = ref<any>(null);
const dailyNote = ref('');

// Eightfold Path state
const followedPaths = ref<string[]>([]);
const pathNotes = ref<Record<string, string>>({});
const loadingPath = ref(false);
let pathSaveTimeout: number | null = null;

const eightfoldPathKeys = [
  'rightView', 'rightIntention', 'rightSpeech', 'rightAction',
  'rightLivelihood', 'rightEffort', 'rightMindfulness', 'rightConcentration'
];

const eightfoldPaths = computed(() => eightfoldPathKeys.map(key => ({
  key,
  displayName: t(`eightfold.paths.${key}.name`),
  description: t(`eightfold.paths.${key}.description`),
  questions: t(`eightfold.paths.${key}.questions`)
})));

const efCompletedCount = computed(() => followedPaths.value.length);
const efProgressPercentage = computed(() => Math.round((efCompletedCount.value / 8) * 100));

function isPathFollowed(pathKey: string): boolean {
  return followedPaths.value.includes(pathKey);
}

function togglePath(pathKey: string) {
  if (isPathFollowed(pathKey)) {
    followedPaths.value = followedPaths.value.filter(p => p !== pathKey);
    delete pathNotes.value[pathKey];
  } else {
    followedPaths.value.push(pathKey);
  }
  savePathData();
}

async function savePathData() {
  saveStatus.value = 'saving';
  try {
    const pathData = followedPaths.value.map(key => ({
      path: key,
      note: pathNotes.value[key] || ''
    }));
    await saveEightfoldPathLog(selectedDate.value.toISOString(), pathData);
    saveStatus.value = 'saved';
    setTimeout(() => { saveStatus.value = null; }, 2000);
  } catch (err) {
    console.error('Failed to save path:', err);
    saveStatus.value = null;
  }
}

function debouncedSavePath() {
  if (pathSaveTimeout !== null) clearTimeout(pathSaveTimeout);
  pathSaveTimeout = window.setTimeout(() => { savePathData(); }, 1000);
}

async function loadPathData() {
  loadingPath.value = true;
  try {
    const startDate = new Date(selectedDate.value);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDate.value);
    endDate.setHours(23, 59, 59, 999);
    const response = await getEightfoldPathLogs({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    if (response.pathLogs && response.pathLogs.length > 0) {
      const log = response.pathLogs[0];
      followedPaths.value = log.paths.map((p: any) => p.path);
      pathNotes.value = {};
      log.paths.forEach((p: any) => {
        if (p.note) pathNotes.value[p.path] = p.note;
      });
    } else {
      followedPaths.value = [];
      pathNotes.value = {};
    }
  } catch (err) {
    console.error('Failed to load path:', err);
    followedPaths.value = [];
    pathNotes.value = {};
  } finally {
    loadingPath.value = false;
  }
}

// Emotion definitions - using English names as keys for backend compatibility
const positiveEmotionKeys = [
  'Joy', 'Happiness', 'Contentment', 'Satisfaction', 'Pride', 'Gratitude', 'Love', 'Affection',
  'Compassion', 'Excitement', 'Enthusiasm', 'Optimism', 'Hope', 'Relief', 'Amusement', 'Delight',
  'Inspiration', 'Confidence', 'Calm', 'Serenity', 'Peaceful', 'Accomplished', 'Validated',
  'Accepted', 'Belonging', 'Curiosity', 'Wonder', 'Awe'
];

const negativeEmotionKeys = [
  'Sadness', 'Grief', 'Despair', 'Loneliness', 'Anger', 'Rage', 'Frustration', 'Irritation',
  'Fear', 'Anxiety', 'Dread', 'Panic', 'Shame', 'Guilt', 'Embarrassment', 'Humiliation',
  'Disgust', 'Contempt', 'Jealousy', 'Envy', 'Resentment', 'Bitterness', 'Regret',
  'Disappointment', 'Discouragement', 'Helplessness', 'Hopelessness', 'Inadequacy',
  'Insecurity', 'Vulnerability', 'Stress', 'Tension', 'Worry', 'Doubt', 'Confusion',
  'Overwhelm', 'Betrayal', 'Hurt', 'Rejection'
];

// Create emotion objects with translations
const positiveEmotions = computed(() => positiveEmotionKeys.map(key => ({
  name: key, // English key for backend
  type: 'positive',
  displayName: t(`emotions.list.${key}.name`),
  description: t(`emotions.list.${key}.description`)
})));

const negativeEmotions = computed(() => negativeEmotionKeys.map(key => ({
  name: key, // English key for backend
  type: 'negative',
  displayName: t(`emotions.list.${key}.name`),
  description: t(`emotions.list.${key}.description`)
})));

const positiveCount = computed(() => 
  selectedEmotions.value.filter(e => e.type === 'positive').length
);

const negativeCount = computed(() => 
  selectedEmotions.value.filter(e => e.type === 'negative').length
);

const pnRatio = computed(() => {
  const total = positiveCount.value + negativeCount.value;
  if (total === 0) return '0.00';
  return (positiveCount.value / total).toFixed(2);
});

const isToday = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(selectedDate.value);
  selected.setHours(0, 0, 0, 0);
  return selected.getTime() >= today.getTime();
});

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const isEmotionSelected = computed(() => {
  return (name: string) => {
    return selectedEmotions.value.some(e => e.name === name);
  };
});

function toggleEmotion(emotion: { name: string; type: string; description: string }) {
  const index = selectedEmotions.value.findIndex(e => e.name === emotion.name);
  if (index > -1) {
    selectedEmotions.value.splice(index, 1);
  } else {
    selectedEmotions.value.push(emotion);
  }
  saveEmotions();
}

function handleNoteInput() {
  clearTimeout((window as any).emotionNoteTimeout);
  (window as any).emotionNoteTimeout = setTimeout(() => {
    saveEmotions();
  }, 1500);
}

async function saveEmotions() {
  saveStatus.value = 'saving';
  try {
    await saveEmotionLog(
      selectedDate.value.toISOString(),
      selectedEmotions.value.map(e => ({ name: e.name, type: e.type as 'positive' | 'negative' })),
      dailyNote.value || undefined
    );
    saveStatus.value = 'saved';
    // Refresh analytics if tab is active
    if (activeTab.value === 'analytics') {
      await loadAnalytics();
    }
    setTimeout(() => {
      saveStatus.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to save emotions:', err);
    saveStatus.value = null;
  }
}

async function loadEmotions() {
  loadingEmotions.value = true;
  try {
    const startDate = new Date(selectedDate.value);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDate.value);
    endDate.setHours(23, 59, 59, 999);

    const response = await getEmotionLogs({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (response.emotionLogs && response.emotionLogs.length > 0) {
      // Ensure we have the full emotion objects with all properties
      const loadedEmotions = response.emotionLogs[0].emotions || [];
      // Map to ensure we have complete emotion objects
      selectedEmotions.value = loadedEmotions.map((e: any) => {
        // Find the full emotion definition
        const fullEmotion = [...positiveEmotions.value, ...negativeEmotions.value].find(
          emotion => emotion.name === e.name
        );
        return fullEmotion || e;
      });
      dailyNote.value = response.emotionLogs[0].note || '';
    } else {
      selectedEmotions.value = [];
      dailyNote.value = '';
    }
  } catch (err) {
    console.error('Failed to load emotions:', err);
    selectedEmotions.value = [];
  } finally {
    loadingEmotions.value = false;
  }
}

async function loadAnalytics() {
  loading.value = true;
  try {
    const response = await getEmotionAnalytics(90);
    console.log('Analytics response:', response);
    analytics.value = response;
  } catch (err) {
    console.error('Failed to load analytics:', err);
    analytics.value = null;
  } finally {
    loading.value = false;
  }
}

function changeDate(delta: number) {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + delta);
  newDate.setHours(0, 0, 0, 0);
  
  // Don't go beyond today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Allow dates up to and including today
  if (newDate.getTime() <= today.getTime()) {
    selectedDate.value = newDate;
  }
}

const topPositiveEmotions = computed(() => {
  if (!analytics.value?.topEmotions) return [];
  return analytics.value.topEmotions
    .filter((e: any) => e.type === 'positive')
    .slice(0, 10);
});

const topNegativeEmotions = computed(() => {
  if (!analytics.value?.topEmotions) return [];
  return analytics.value.topEmotions
    .filter((e: any) => e.type === 'negative')
    .slice(0, 10);
});

function getTranslatedEmotionName(englishName: string): string {
  // Find the emotion in our lists to get the translated name
  const allEmotions = [...positiveEmotions.value, ...negativeEmotions.value];
  const emotion = allEmotions.find(e => e.name === englishName);
  return emotion ? emotion.displayName : englishName;
}

watch(selectedDate, () => {
  loadEmotions();
  loadPathData();
});

watch(activeTab, async (newTab) => {
  if (newTab === 'analytics') {
    try {
      await loadAnalytics();
    } catch (err) {
      console.error('Error in analytics tab:', err);
    }
  }
  if (newTab === 'eightfold') {
    await loadPathData();
  }
});

onMounted(() => {
  loadEmotions();
  loadPathData();
});
</script>

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

.save-status {
  padding: 0.65rem;
  text-align: center;
  font-size: 0.85rem;
  border-top: 1px solid var(--border-subtle);
}

.save-status.saving {
  background: rgba(255, 193, 7, 0.1);
  color: #FFC107;
}

.save-status.saved {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

/* Notes tab styles */
.notes-view {
  min-height: 300px;
}

/* Eightfold Path tab styles */
.eightfold-view {
  min-height: 300px;
}

.eightfold-inline-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.eightfold-stat {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eightfold-stat-label {
  font-size: 0.8rem;
  color: var(--text2);
}

.eightfold-stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text1);
}

.eightfold-path-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.eightfold-path-item {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s;
}

.eightfold-path-item:hover {
  background: var(--input-bg-focus);
  border-color: var(--input-border-focus);
}

.eightfold-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
}

.eightfold-checkbox-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--text1);
  flex-shrink: 0;
}

.eightfold-path-name {
  color: var(--text1);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
}

.eightfold-path-desc {
  color: var(--text2);
  font-size: 0.8rem;
  margin-left: 1.65rem;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.eightfold-path-question {
  color: var(--text2);
  font-size: 0.75rem;
  font-style: italic;
  margin-left: 1.65rem;
  opacity: 0.7;
  line-height: 1.4;
}

.eightfold-path-note {
  margin-left: 1.65rem;
  margin-top: 0.5rem;
}

.eightfold-path-note textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  color: var(--text1);
  font-family: inherit;
  font-size: 0.85rem;
  resize: vertical;
  transition: all 0.2s;
  line-height: 1.5;
}

.eightfold-path-note textarea:focus {
  outline: none;
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
}

.eightfold-path-note textarea::placeholder {
  color: var(--text2);
  opacity: 0.5;
}

.notes-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text1);
}

.notes-header svg {
  opacity: 0.7;
  flex-shrink: 0;
}

.notes-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.notes-date-label {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text2);
}

.emotion-note-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  color: var(--text1);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}

.emotion-note-textarea:focus {
  outline: none;
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
}

.emotion-note-textarea::placeholder {
  color: var(--text2);
  opacity: 0.6;
}

.note-footer {
  display: flex;
  justify-content: flex-end;
}

.note-footer .character-count {
  font-size: 0.8rem;
  color: var(--text2);
  opacity: 0.7;
}

/* Analytics styles */
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
  color: #4CAF50;
}

.days-bar-segment.negative {
  background: rgba(244, 67, 54, 0.3);
  color: #F44336;
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
  background: #4CAF50;
}

.legend-dot.negative {
  background: #F44336;
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
  .emotion-list {
    gap: 0.75rem;
  }

  .emotion-name {
    min-width: auto;
    font-size: 1rem;
    flex: 1;
  }

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

  .save-status {
    padding: 0.875rem;
    font-size: 0.9rem;
  }

  .notes-view {
    min-height: auto;
  }

  .emotion-note-textarea {
    min-height: 180px;
    font-size: 1rem;
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

/* Inline styles */

.emotion-inline {
  width: 100%;
  max-width: 680px;
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

.inline-emotion-item input[type="checkbox"] {
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
    max-width: 100%;
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