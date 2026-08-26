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
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                    <polyline
                        points="14 2 14 8 20 8"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                    <line
                        x1="16"
                        y1="13"
                        x2="8"
                        y2="13"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round" />
                    <line
                        x1="16"
                        y1="17"
                        x2="8"
                        y2="17"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round" />
                    <polyline
                        points="10 9 9 9 8 9"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
                <h3>{{ t('emotions.dailyNote') }}</h3>
            </div>
            <p class="notes-date-label">{{ formatDate(selectedDate) }}</p>
            <textarea
                :value="dailyNote"
                class="zen-textarea emotion-note-textarea"
                :placeholder="t('emotions.notePlaceholder')"
                :aria-label="t('emotions.notePlaceholder')"
                maxlength="2000"
                @input="
                    emit('update:dailyNote', ($event.target as HTMLTextAreaElement).value);
                    emit('note-input');
                "></textarea>
            <div class="note-footer">
                <span class="character-count">{{ dailyNote.length }} / 2000</span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.notes-view {
    min-height: auto;
}

.notes-content {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.notes-header {
    display: flex;
    align-items: center;
    gap: $space-2;
    color: $text1;

    svg {
        flex-shrink: 0;
        opacity: $opacity-mid-high;
    }

    h3 {
        margin: 0;
        font-size: $font-size-lg;
        font-weight: $font-weight-semibold;
    }
}

.notes-date-label {
    margin: 0;
    color: $text2;
    font-size: $font-size-sm;
}

.emotion-note-textarea {
    min-height: $size-39;
    padding: $space-4;
    border-radius: $border-radius-lg;
    font-size: $font-size-base;
}

.note-footer {
    display: flex;
    justify-content: flex-end;

    .character-count {
        color: $text2;
        font-size: $font-size-xs;
        opacity: $opacity-mid-high;
    }
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-xl}) {
    .notes-view {
        min-height: $size-44;
    }

    .emotion-note-textarea {
        min-height: $size-40;
    }
}
</style>
