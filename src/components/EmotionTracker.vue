<template>
  <div class="emotion-overlay" @click.self="$emit('close')">
    <div class="emotion-modal" @click.stop>
      <button class="emotion-close" @click="$emit('close')" aria-label="Close emotion tracker">×</button>
      
      <div class="emotion-header">
        <h2>{{ t('emotions.title') }}</h2>
        <div class="emotion-date-selector">
          <button @click="changeDate(-1)" aria-label="Previous day">‹</button>
          <span>{{ formatDate(selectedDate) }}</span>
          <button @click="changeDate(1)" :disabled="isToday" aria-label="Next day">›</button>
        </div>
      </div>

      <div class="emotion-stats">
        <div class="stat-box positive">
          <div class="stat-label">{{ t('emotions.positive') }}</div>
          <div class="stat-value">{{ positiveCount }}</div>
        </div>
        <div class="stat-box ratio">
          <div class="stat-label">{{ t('emotions.pnRatio') }}</div>
          <div class="stat-value">{{ pnRatio }}</div>
        </div>
        <div class="stat-box negative">
          <div class="stat-label">{{ t('emotions.negative') }}</div>
          <div class="stat-value">{{ negativeCount }}</div>
        </div>
      </div>

      <div class="emotion-tabs">
        <button 
          :class="['tab', { active: activeTab === 'positive' }]"
          @click="activeTab = 'positive'"
        >
          {{ t('emotions.positiveTab') }} ({{ positiveEmotions.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'negative' }]"
          @click="activeTab = 'negative'"
        >
          {{ t('emotions.negativeTab') }} ({{ negativeEmotions.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'analytics' }]"
          @click="activeTab = 'analytics'"
        >
          {{ t('emotions.analytics') }}
        </button>
      </div>

      <div class="emotion-content">
        <div v-if="activeTab === 'positive' || activeTab === 'negative'" class="emotion-list" :key="`${selectedDate.getTime()}-${selectedEmotions.length}`">
          <div v-if="loadingEmotions" class="loading">{{ t('emotions.loading') || 'Loading' }}...</div>
          <label 
            v-else
            v-for="emotion in (activeTab === 'positive' ? positiveEmotions : negativeEmotions)"
            :key="emotion.name"
            class="emotion-item"
          >
            <input 
              type="checkbox" 
              :checked="isEmotionSelected(emotion.name)"
              @change="toggleEmotion(emotion)"
            />
            <span class="emotion-name">{{ emotion.displayName }}</span>
            <span class="emotion-description">{{ emotion.description }}</span>
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
                <div class="analytics-value">{{ analytics.averagePNRatio }}</div>
              </div>
              <div class="analytics-card">
                <div class="analytics-label">{{ t('emotions.emotionDiversity') }}</div>
                <div class="analytics-value">{{ analytics.emotionDiversity }}</div>
              </div>
            </div>

            <div class="analytics-section">
              <h3>{{ t('emotions.daysSummary') }}</h3>
              <div class="days-bar">
                <div 
                  class="days-bar-segment positive" 
                  :style="{ width: `${(analytics.positiveDays / analytics.totalDays * 100)}%` }"
                >
                  {{ analytics.positiveDays }}
                </div>
                <div 
                  class="days-bar-segment negative" 
                  :style="{ width: `${(analytics.negativeDays / analytics.totalDays * 100)}%` }"
                >
                  {{ analytics.negativeDays }}
                </div>
              </div>
              <div class="days-legend">
                <span class="legend-item">
                  <span class="legend-dot positive"></span> {{ t('emotions.positiveDays') }}
                </span>
                <span class="legend-item">
                  <span class="legend-dot negative"></span> {{ t('emotions.negativeDays') }}
                </span>
              </div>
            </div>

            <div class="analytics-section">
              <h3>{{ t('emotions.topEmotions') }}</h3>
              <div class="top-emotions-list">
                <div 
                  v-for="(emotion, idx) in analytics.topEmotions.slice(0, 10)"
                  :key="emotion.name"
                  class="top-emotion-item"
                >
                  <span class="emotion-rank">{{ Number(idx) + 1 }}</span>
                  <span class="emotion-name">{{ getTranslatedEmotionName(emotion.name) }}</span>
                  <span class="emotion-bar-container">
                    <span 
                      class="emotion-bar" 
                      :class="emotion.type"
                      :style="{ width: `${(emotion.count / analytics.topEmotions[0].count * 100)}%` }"
                    ></span>
                  </span>
                  <span class="emotion-count">{{ emotion.count }}</span>
                </div>
              </div>
            </div>

            <div class="analytics-section">
              <h3>{{ t('emotions.trendChart') }}</h3>
              <div class="trend-chart">
                <div 
                  v-for="(day, idx) in analytics.trends.slice(0, 90).reverse()"
                  :key="idx"
                  class="trend-bar"
                  :style="{ height: `${Math.min(day.pnRatio / (analytics.trends.reduce((max: number, d: any) => Math.max(max, d.pnRatio), 0) || 1) * 100, 100)}%` }"
                  :class="{ positive: day.pnRatio >= 1, negative: day.pnRatio < 1 }"
                  :title="`${formatDate(day.date)}: P/N Ratio ${day.pnRatio.toFixed(2)}`"
                ></div>
              </div>
              <div class="trend-labels">
                <span>{{ t('emotions.past90Days') }}</span>
              </div>
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
      </div>

      <div v-if="saveStatus" class="save-status" :class="saveStatus">
        {{ saveStatus === 'saving' ? t('emotions.saving') : t('emotions.saved') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEmotionLog, getEmotionLogs, getEmotionAnalytics } from '../store';

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

async function saveEmotions() {
  saveStatus.value = 'saving';
  try {
    await saveEmotionLog(
      selectedDate.value.toISOString(),
      selectedEmotions.value.map(e => ({ name: e.name, type: e.type as 'positive' | 'negative' }))
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
    } else {
      selectedEmotions.value = [];
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

function getTranslatedEmotionName(englishName: string): string {
  // Find the emotion in our lists to get the translated name
  const allEmotions = [...positiveEmotions.value, ...negativeEmotions.value];
  const emotion = allEmotions.find(e => e.name === englishName);
  return emotion ? emotion.displayName : englishName;
}

watch(selectedDate, () => {
  loadEmotions();
});

watch(activeTab, async (newTab) => {
  if (newTab === 'analytics') {
    try {
      await loadAnalytics();
    } catch (err) {
      console.error('Error in analytics tab:', err);
    }
  }
});

onMounted(() => {
  loadEmotions();
});
</script>

<style scoped>
.emotion-overlay {
  position: fixed;
  inset: 0;
  background: var(--blur2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.emotion-modal {
  position: relative;
  background: var(--base1);
  border-radius: 12px;
  width: 90vw;
  max-width: 850px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-subtle);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.emotion-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.75rem;
  color: var(--text2);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  z-index: 1;
}

.emotion-close:hover {
  background: var(--button-bg-hover);
  color: var(--text1);
}

.emotion-header {
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.emotion-header h2 {
  margin: 0 0 0.75rem;
  color: var(--text1);
  font-size: 1.5rem;
}

.emotion-date-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.emotion-date-selector button {
  background: var(--button-bg);
  border: 1px solid var(--input-border);
  color: var(--text1);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.emotion-date-selector button:hover:not(:disabled) {
  background: var(--button-bg-hover);
  border-color: var(--button-border-hover);
}

.emotion-date-selector button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.emotion-date-selector span {
  color: var(--text1);
  font-weight: 500;
  min-width: 140px;
  text-align: center;
  font-size: 0.95rem;
}

.emotion-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--blur1);
}

.stat-box {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.stat-box.positive {
  border-color: rgba(76, 175, 80, 0.3);
}

.stat-box.ratio {
  border-color: rgba(33, 150, 243, 0.3);
}

.stat-box.negative {
  border-color: rgba(244, 67, 54, 0.3);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text2);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text1);
}

.emotion-tabs {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem 1.5rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.tab {
  background: none;
  border: none;
  color: var(--text2);
  padding: 0.6rem 1.25rem;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 500;
}

.tab:hover {
  color: var(--text1);
  background: var(--blur3);
}

.tab.active {
  color: var(--text1);
  background: var(--input-bg-focus);
  border-bottom: 2px solid var(--text1);
}

.emotion-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem 1.5rem;
}

.emotion-list {
  display: grid;
  gap: 0.6rem;
}

.emotion-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.emotion-item:hover {
  background: var(--input-bg-focus);
  border-color: var(--input-border-focus);
}

.emotion-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--text1);
}

.emotion-name {
  font-weight: 600;
  color: var(--text1);
  min-width: 130px;
  font-size: 0.95rem;
}

.emotion-description {
  color: var(--text2);
  font-size: 0.85rem;
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

.trend-labels {
  text-align: center;
  color: var(--text2);
  font-size: 0.8rem;
  margin-top: 0.45rem;
}

@media (max-width: 768px) {
  .emotion-modal {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    border: none;
    animation: slideInFromBottom 0.3s ease-out;
  }

  @keyframes slideInFromBottom {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .emotion-header {
    padding: 1rem 1.25rem;
    position: sticky;
    top: 0;
    background: var(--base1);
    z-index: 10;
    border-bottom: 1px solid var(--border-subtle);
    min-height: 72px;
  }

  .emotion-header h2 {
    font-size: 1.3rem;
    margin: 0 0 0.75rem;
  }

  .emotion-close {
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    font-size: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
    border-radius: 50%;
    transition: background 0.2s;
    z-index: 11;
  }

  .emotion-close:hover {
    background: var(--input-bg-focus);
  }

  .emotion-date-selector {
    gap: 1rem;
  }

  .emotion-date-selector button {
    padding: 0.5rem 0.75rem;
    font-size: 1.2rem;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .emotion-date-selector span {
    min-width: 180px;
    font-size: 0.95rem;
  }

  .emotion-stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    position: sticky;
    top: 72px;
    background: var(--base1);
    z-index: 9;
    border-bottom: 1px solid var(--border-subtle);
  }

  .stat-box {
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 72px;
  }

  .stat-label {
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .emotion-tabs {
    padding: 0.75rem 1.25rem 0;
    gap: 0.5rem;
    position: sticky;
    top: 160px;
    background: var(--base1);
    z-index: 9;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    border-bottom: 1px solid var(--border-subtle);
  }

  .emotion-tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 48px;
    touch-action: manipulation;
  }

  .emotion-content {
    padding: 1rem 1.25rem 5rem;
    -webkit-overflow-scrolling: touch;
  }

  .emotion-list {
    gap: 0.75rem;
  }

  .emotion-item {
    padding: 1rem;
    gap: 1rem;
    flex-wrap: wrap;
    min-height: 64px;
    touch-action: manipulation;
  }

  .emotion-item input[type="checkbox"] {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .emotion-name {
    min-width: auto;
    font-size: 1rem;
    flex: 1;
  }

  .emotion-description {
    font-size: 0.85rem;
    width: 100%;
    padding-left: 40px;
    line-height: 1.5;
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
    position: sticky;
    bottom: 0;
    background: var(--base1);
    border-top: 1px solid var(--border-subtle);
  }
}

@media (max-width: 480px) {
  .emotion-header {
    padding: 0.875rem 1rem;
    min-height: 64px;
  }

  .emotion-header h2 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .emotion-close {
    width: 40px;
    height: 40px;
  }

  .emotion-date-selector span {
    min-width: 150px;
    font-size: 0.9rem;
  }

  .emotion-stats {
    padding: 0.875rem 1rem;
    gap: 0.5rem;
  }

  .stat-box {
    padding: 0.75rem;
    min-height: 64px;
  }

  .emotion-content {
    padding: 0.875rem 1rem 4rem;
  }

  .analytics-card {
    padding: 1rem;
  }

  .analytics-section {
    padding: 1rem;
  }
}

</style>
