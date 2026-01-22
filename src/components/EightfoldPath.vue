<template>
  <div class="eightfold-overlay" @click.self="$emit('close')">
    <div class="eightfold-modal" @click.stop>
      <button class="eightfold-close" @click="$emit('close')" aria-label="Close Eightfold Path tracker">×</button>
      
      <div class="eightfold-header">
        <h2>{{ t('eightfold.title') }}</h2>
        <div class="eightfold-date-selector">
          <button @click="changeDate(-1)" aria-label="Previous day">‹</button>
          <span>{{ formatDate(selectedDate) }}</span>
          <button @click="changeDate(1)" :disabled="isToday" aria-label="Next day">›</button>
        </div>
      </div>

      <div class="eightfold-stats">
        <div class="stat-box">
          <div class="stat-label">{{ t('eightfold.completed') }}</div>
          <div class="stat-value">{{ completedCount }}/8</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('eightfold.progress') }}</div>
          <div class="stat-value">{{ progressPercentage }}%</div>
        </div>
      </div>

      <div class="eightfold-content">
        <div v-if="loadingPath" class="loading">{{ t('eightfold.loading') }}...</div>
        <div v-else class="path-list">
          <div 
            v-for="path in eightfoldPaths"
            :key="path.key"
            class="path-item"
          >
            <div class="path-checkbox-row">
              <input 
                type="checkbox" 
                :id="`path-${path.key}`"
                :checked="isPathFollowed(path.key)"
                @change="togglePath(path.key)"
              />
              <label :for="`path-${path.key}`" class="path-name">
                {{ path.displayName }}
              </label>
            </div>
            <div class="path-description">{{ path.description }}</div>
            <div class="path-questions">{{ path.questions }}</div>
            <div v-if="isPathFollowed(path.key)" class="path-notes">
              <textarea 
                v-model="pathNotes[path.key]"
                :placeholder="t('eightfold.notesPlaceholder')"
                @input="debouncedSave"
                rows="2"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div v-if="saveStatus" class="save-status" :class="saveStatus">
        {{ saveStatus === 'saving' ? t('eightfold.saving') : t('eightfold.saved') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveEightfoldPathLog, getEightfoldPathLogs } from '../store';

const { t } = useI18n();
const emit = defineEmits(['close']);

// Initialize to today at start of day
const today = new Date();
today.setHours(0, 0, 0, 0);
const selectedDate = ref(today);
const followedPaths = ref<string[]>([]);
const pathNotes = ref<Record<string, string>>({});
const saveStatus = ref<'saving' | 'saved' | null>(null);
const loadingPath = ref(false);

let saveTimeout: number | null = null;

// The Noble Eightfold Path
const eightfoldPathKeys = [
  'rightView',
  'rightIntention',
  'rightSpeech',
  'rightAction',
  'rightLivelihood',
  'rightEffort',
  'rightMindfulness',
  'rightConcentration'
];

// Create path objects with translations
const eightfoldPaths = computed(() => eightfoldPathKeys.map(key => ({
  key,
  displayName: t(`eightfold.paths.${key}.name`),
  description: t(`eightfold.paths.${key}.description`),
  questions: t(`eightfold.paths.${key}.questions`)
})));

const isToday = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return selectedDate.value.getTime() === now.getTime();
});

const completedCount = computed(() => followedPaths.value.length);

const progressPercentage = computed(() => 
  Math.round((completedCount.value / 8) * 100)
);

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function changeDate(delta: number) {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + delta);
  selectedDate.value = newDate;
}

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
  savePath();
}

async function savePath() {
  saveStatus.value = 'saving';
  
  try {
    const pathData = followedPaths.value.map(key => ({
      path: key,
      note: pathNotes.value[key] || ''
    }));

    await saveEightfoldPathLog(selectedDate.value.toISOString(), pathData);

    saveStatus.value = 'saved';
    setTimeout(() => {
      saveStatus.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to save path:', err);
    saveStatus.value = null;
  }
}

function debouncedSave() {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = window.setTimeout(() => {
    savePath();
  }, 1000);
}

async function loadPath() {
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
        if (p.note) {
          pathNotes.value[p.path] = p.note;
        }
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

// Watch for date changes
watch(selectedDate, () => {
  loadPath();
});

// Load initial data
onMounted(() => {
  loadPath();
});
</script>

<style scoped>
.eightfold-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.eightfold-modal {
  background: var(--base1);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 2rem;
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s ease;
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

.eightfold-close {
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

.eightfold-close:hover {
  background: var(--button-bg-hover);
  color: var(--text1);
}

.eightfold-header {
  margin-bottom: 1.5rem;
}

.eightfold-header h2 {
  color: var(--text1);
  font-size: 1.8rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.eightfold-date-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.eightfold-date-selector button {
  background: var(--button-bg);
  border: 1px solid var(--input-border);
  color: var(--text1);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.eightfold-date-selector button:hover:not(:disabled) {
  background: var(--button-bg-hover);
  border-color: var(--button-border-hover);
}

.eightfold-date-selector button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.eightfold-date-selector span {
  color: var(--text1);
  font-size: 1.1rem;
  min-width: 200px;
  text-align: center;
}

.eightfold-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-box {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.stat-label {
  color: var(--text2);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  color: var(--text1);
  font-size: 1.8rem;
  font-weight: 600;
}

.eightfold-content {
  margin-top: 1.5rem;
}

.loading {
  color: var(--text2);
  text-align: center;
  padding: 2rem;
}

.path-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.path-item {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.path-item:hover {
  background: var(--input-bg-focus);
  border-color: var(--input-border-focus);
}

.path-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.path-checkbox-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--text1);
}

.path-name {
  color: var(--text1);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
}

.path-description {
  color: var(--text2);
  font-size: 0.9rem;
  margin-left: 2rem;
  margin-bottom: 0.5rem;
}

.path-questions {
  color: var(--text2);
  font-size: 0.85rem;
  font-style: italic;
  margin-left: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.8;
  line-height: 1.4;
}

.path-notes {
  margin-left: 2rem;
  margin-top: 0.75rem;
}

.path-notes textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0.75rem;
  color: var(--text1);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  transition: all 0.2s;
}

.path-notes textarea:focus {
  outline: none;
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
}

.path-notes textarea::placeholder {
  color: var(--text2);
  opacity: 0.5;
}

.save-status {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  animation: slideUp 0.3s ease;
  z-index: 3000;
}

.save-status.saving {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text1);
}

.save-status.saved {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4CAF50;
}

/* Scrollbar styling */
.eightfold-modal::-webkit-scrollbar {
  width: 8px;
}

.eightfold-modal::-webkit-scrollbar-track {
  background: var(--blur1);
  border-radius: 4px;
}

.eightfold-modal::-webkit-scrollbar-thumb {
  background: var(--input-border);
  border-radius: 4px;
}

.eightfold-modal::-webkit-scrollbar-thumb:hover {
  background: var(--border-subtle);
}
</style>
