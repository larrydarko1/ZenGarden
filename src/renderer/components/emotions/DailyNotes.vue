// DailyNotes — textarea for daily freeform notes with 2000-char limit indicator. // Owns: note textarea rendering,
character count display. // Does NOT own: note persistence or date selection (receives props, emits events).
<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    dailyNote: string;
    selectedDate: Date;
    formatDate: (date: Date | string) => string;
}>();

const emit = defineEmits<{
    'update:dailyNote': [value: string];
    'note-input': [];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="notes-view">
        <div class="notes-content">
            <div class="notes-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <polyline
                        points="14 2 14 8 20 8"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <line
                        x1="16"
                        y1="13"
                        x2="8"
                        y2="13"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                    <line
                        x1="16"
                        y1="17"
                        x2="8"
                        y2="17"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                    <polyline
                        points="10 9 9 9 8 9"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
                <h3>{{ t('emotions.dailyNote') }}</h3>
            </div>
            <p class="notes-date-label">{{ formatDate(selectedDate) }}</p>
            <textarea
                :value="dailyNote"
                class="emotion-note-textarea"
                :placeholder="t('emotions.notePlaceholder')"
                maxlength="2000"
                @input="
                    emit('update:dailyNote', ($event.target as HTMLTextAreaElement).value);
                    emit('note-input');
                "
            ></textarea>
            <div class="note-footer">
                <span class="character-count">{{ dailyNote.length }} / 2000</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.notes-view {
    min-height: 300px;
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
    transition:
        border-color 0.2s,
        background 0.2s;
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

@media (max-width: 768px) {
    .notes-view {
        min-height: auto;
    }

    .emotion-note-textarea {
        min-height: 180px;
        font-size: 1rem;
    }
}
</style>
