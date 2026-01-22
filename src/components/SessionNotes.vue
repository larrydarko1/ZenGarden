<template>
  <div class="notes-modal-bg" @click.self="handleClose" aria-label="Session notes modal background">
    <div class="notes-modal" role="dialog" aria-labelledby="notes-title" aria-modal="true">
      <div class="notes-header">
        <h2 id="notes-title">{{ t('notes.title') }}</h2>
        <button class="notes-close" @click="handleClose" aria-label="Close notes modal">×</button>
      </div>
      <div class="notes-content">
        <p class="notes-prompt">{{ t('notes.subtitle') }}</p>
        <textarea
          v-model="notes"
          class="notes-textarea"
          :placeholder="t('notes.placeholder')"
          rows="6"
          aria-label="Meditation session notes"
          @keydown.esc="handleClose"
        ></textarea>
        <div class="notes-actions">
          <button class="notes-btn notes-btn-secondary" @click="handleSkip">{{ t('notes.skip') }}</button>
          <button class="notes-btn notes-btn-primary" @click="handleSave">{{ t('notes.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  duration: number
}>()

const emit = defineEmits<{
  save: [notes: string]
  skip: []
  close: []
}>()

const notes = ref('')

function handleSave() {
  emit('save', notes.value)
}

function handleSkip() {
  emit('skip')
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.notes-modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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

.notes-modal {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  width: 90%;
  max-width: 450px;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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

.notes-header {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--input-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notes-header h2 {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text1);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.notes-close {
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.2s, color 0.2s;
}

.notes-close:hover {
  background: var(--input-bg-focus);
  color: var(--text1);
}

.notes-content {
  padding: 0.75rem;
}

.notes-prompt {
  margin: 0 0 0.5rem 0;
  color: var(--text2);
  font-size: 0.75rem;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  padding: 0.5rem;
  color: var(--text1);
  font-family: inherit;
  font-size: 0.8rem;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--input-border-focus);
}

.notes-textarea::placeholder {
  color: var(--text2);
  opacity: 0.5;
}

.notes-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.notes-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.notes-btn-secondary {
  background: transparent;
  color: var(--text2);
  border: 1px solid var(--border-subtle);
}

.notes-btn-secondary:hover {
  background: var(--input-bg-focus);
  border-color: var(--button-border-hover);
  color: var(--text1);
}

.notes-btn-primary {
  background: var(--button-bg);
  color: var(--text1);
  border: 1px solid var(--border-subtle);
}

.notes-btn-primary:hover {
  background: var(--button-bg-hover);
  border-color: var(--button-border-hover);
}
</style>
