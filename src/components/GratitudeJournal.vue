<template>
  <div class="gratitude-overlay" @click.self="$emit('close')">
    <div class="gratitude-modal" @click.stop>
      <button class="gratitude-close" @click="$emit('close')" aria-label="Close gratitude journal">×</button>
      
      <div class="gratitude-header">
        <h2>{{ t('gratitude.title') }}</h2>
        <div class="gratitude-date-selector">
          <button @click="changeDate(-1)" aria-label="Previous day">‹</button>
          <span>{{ formatDate(selectedDate) }}</span>
          <button @click="changeDate(1)" :disabled="isToday" aria-label="Next day">›</button>
        </div>
      </div>

      <div class="gratitude-content">
        <div class="gratitude-prompt">
          <p>{{ t('gratitude.prompt') }}</p>
        </div>

        <textarea 
          v-model="gratitudeText"
          class="gratitude-textarea"
          :placeholder="t('gratitude.placeholder')"
          @input="handleInput"
          maxlength="1000"
        ></textarea>

        <div class="gratitude-footer">
          <span class="character-count">{{ gratitudeText.length }} / 1000</span>
          <button 
            class="save-btn" 
            @click="saveGratitude"
            :disabled="!gratitudeText.trim() || saving"
          >
            {{ saving ? t('gratitude.saving') : t('gratitude.save') }}
          </button>
        </div>

        <div v-if="pastEntries.length > 0" class="past-entries">
          <h3>{{ t('gratitude.recentEntries') }}</h3>
          <div class="entries-list">
            <div 
              v-for="entry in pastEntries" 
              :key="entry._id"
              class="entry-item"
              @click="viewEntry(entry)"
            >
              <div class="entry-date">{{ formatDate(entry.date) }}</div>
              <div class="entry-preview">{{ getPreview(entry.text) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="saveStatus" class="save-status" :class="saveStatus">
        {{ saveStatus === 'saving' ? t('gratitude.saving') : t('gratitude.saved') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { saveGratitudeEntry, getGratitudeEntries } from '../store';

const { t } = useI18n();
const emit = defineEmits(['close']);

const today = new Date();
today.setHours(0, 0, 0, 0);
const selectedDate = ref(today);
const gratitudeText = ref('');
const saving = ref(false);
const saveStatus = ref<'saving' | 'saved' | null>(null);
const pastEntries = ref<Array<{ _id: string; date: string; text: string }>>([]);

const isToday = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(selectedDate.value);
  selected.setHours(0, 0, 0, 0);
  return selected.getTime() >= today.getTime();
});

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getPreview(text: string) {
  return text.length > 80 ? text.substring(0, 80) + '...' : text;
}

function changeDate(delta: number) {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + delta);
  newDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (newDate.getTime() <= today.getTime()) {
    selectedDate.value = newDate;
  }
}

function handleInput() {
  // Auto-save after 2 seconds of no typing
  clearTimeout((window as any).gratitudeTimeout);
  (window as any).gratitudeTimeout = setTimeout(() => {
    if (gratitudeText.value.trim()) {
      saveGratitude();
    }
  }, 2000);
}

async function saveGratitude() {
  if (!gratitudeText.value.trim() || saving.value) return;
  
  saving.value = true;
  saveStatus.value = 'saving';
  
  try {
    await saveGratitudeEntry(
      selectedDate.value.toISOString(),
      gratitudeText.value.trim()
    );
    
    saveStatus.value = 'saved';
    setTimeout(() => {
      saveStatus.value = null;
    }, 2000);
    
    // Refresh past entries
    await loadPastEntries();
  } catch (err) {
    console.error('Failed to save gratitude:', err);
    saveStatus.value = null;
  } finally {
    saving.value = false;
  }
}

async function loadGratitudeForDate() {
  try {
    const startDate = new Date(selectedDate.value);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDate.value);
    endDate.setHours(23, 59, 59, 999);

    const response = await getGratitudeEntries({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (response.entries && response.entries.length > 0) {
      gratitudeText.value = response.entries[0].text || '';
    } else {
      gratitudeText.value = '';
    }
  } catch (err) {
    console.error('Failed to load gratitude:', err);
    gratitudeText.value = '';
  }
}

async function loadPastEntries() {
  try {
    const response = await getGratitudeEntries({ limit: 10 });
    pastEntries.value = (response.entries || []).map(entry => ({
      _id: entry._id || '',
      date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
      text: entry.text
    }));
  } catch (err) {
    console.error('Failed to load past entries:', err);
    pastEntries.value = [];
  }
}

function viewEntry(entry: { _id: string; date: string; text: string }) {
  selectedDate.value = new Date(entry.date);
  gratitudeText.value = entry.text;
}

watch(selectedDate, () => {
  loadGratitudeForDate();
});

onMounted(() => {
  loadGratitudeForDate();
  loadPastEntries();
});
</script>

<style scoped>
.gratitude-overlay {
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

.gratitude-modal {
  position: relative;
  background: var(--base1);
  border-radius: 12px;
  width: 90vw;
  max-width: 750px;
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

.gratitude-close {
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

.gratitude-close:hover {
  background: var(--button-bg-hover);
  color: var(--text1);
}

.gratitude-header {
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.gratitude-header h2 {
  margin: 0 0 0.75rem;
  color: var(--text1);
  font-size: 1.5rem;
}

.gratitude-date-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.gratitude-date-selector button {
  background: var(--button-bg);
  border: 1px solid var(--input-border);
  color: var(--text1);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.gratitude-date-selector button:hover:not(:disabled) {
  background: var(--button-bg-hover);
  border-color: var(--button-border-hover);
}

.gratitude-date-selector button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.gratitude-date-selector span {
  color: var(--text1);
  font-weight: 500;
  min-width: 200px;
  text-align: center;
  font-size: 0.95rem;
}

.gratitude-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gratitude-prompt {
  background: var(--blur1);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 1rem;
}

.gratitude-prompt p {
  margin: 0;
  color: var(--text1);
  font-size: 1rem;
  font-style: italic;
}

.gratitude-textarea {
  width: border-box;
  min-height: 150px;
  padding: 1rem;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  color: var(--text1);
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;
  
}

.gratitude-textarea:focus {
  outline: none;
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
}

.gratitude-textarea::placeholder {
  color: var(--text2);
  opacity: 0.7;
}

.gratitude-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.character-count {
  color: var(--text2);
  font-size: 0.85rem;
}

.save-btn {
  background: var(--button-bg);
  border: 1px solid var(--input-border);
  color: var(--text1);
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: var(--button-bg-hover);
  border-color: var(--button-border-hover);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.past-entries {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.past-entries h3 {
  margin: 0 0 1rem;
  color: var(--text1);
  font-size: 1.1rem;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entry-item {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.entry-item:hover {
  background: var(--input-bg-focus);
  border-color: var(--input-border-focus);
}

.entry-date {
  font-size: 0.85rem;
  color: var(--text2);
  margin-bottom: 0.4rem;
}

.entry-preview {
  color: var(--text1);
  font-size: 0.95rem;
  line-height: 1.4;
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

@media (max-width: 768px) {
  .gratitude-modal {
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

  .gratitude-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-subtle);
    min-height: 64px;
  }

  .gratitude-header h2 {
    font-size: 1.3rem;
    margin-bottom: 0.75rem;
  }

  .gratitude-close {
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
  }

  .gratitude-close:hover {
    background: var(--input-bg-focus);
  }

  .gratitude-date-selector {
    gap: 1rem;
  }

  .gratitude-date-selector button {
    width: 44px;
    height: 44px;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .gratitude-date-selector span {
    min-width: 180px;
    font-size: 0.95rem;
  }

  .gratitude-content {
    padding: 1.25rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .gratitude-prompt p {
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .gratitude-textarea {
    min-height: 200px;
    font-size: 1rem;
    padding: 1rem;
    line-height: 1.6;
    touch-action: manipulation;
  }

  .gratitude-footer {
    margin-top: 1.25rem;
    padding-top: 1rem;
  }

  .save-btn {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
    min-height: 52px;
    touch-action: manipulation;
  }

  .character-count {
    font-size: 0.85rem;
  }

  .past-entries h3 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .entry-item {
    padding: 1rem;
    margin-bottom: 0.75rem;
    min-height: 64px;
    touch-action: manipulation;
  }

  .entry-date {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .entry-preview {
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .save-status {
    padding: 0.875rem;
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .gratitude-header {
    padding: 0.875rem 1rem;
  }

  .gratitude-header h2 {
    font-size: 1.2rem;
  }

  .gratitude-content {
    padding: 1rem;
  }

  .gratitude-date-selector span {
    min-width: 150px;
    font-size: 0.9rem;
  }
}
</style>
