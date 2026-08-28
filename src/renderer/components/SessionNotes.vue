<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{
    duration: number;
}>();

const emit = defineEmits<{
    save: [notes: string];
    skip: [];
    close: [];
}>();

const { t } = useI18n();

const notes = ref('');

function handleSave(): void {
    emit('save', notes.value);
}

function handleSkip(): void {
    emit('skip');
}

function handleClose(): void {
    emit('close');
}
</script>

<template>
    <div class="notes-modal-bg">
        <button
            type="button"
            class="zen-backdrop notes-modal-backdrop"
            aria-label="Close notes modal"
            @click="handleClose"></button>
        <div
            class="notes-modal"
            role="dialog"
            aria-labelledby="notes-title"
            aria-modal="true">
            <div class="notes-header">
                <h2 id="notes-title">{{ t('notes.title') }}</h2>
                <button
                    class="zen-icon-btn is-bare notes-close"
                    aria-label="Close notes modal"
                    @click="handleClose"
                    >×</button
                >
            </div>
            <div class="notes-content">
                <p class="notes-prompt">{{ t('notes.subtitle') }}</p>
                <textarea
                    v-model="notes"
                    class="zen-textarea notes-textarea"
                    :placeholder="t('notes.placeholder')"
                    rows="6"
                    aria-label="Meditation session notes"
                    @keydown.esc="handleClose"></textarea>
                <div class="notes-actions">
                    <button
                        class="zen-btn is-ghost notes-btn notes-btn-secondary"
                        @click="handleSkip"
                        >{{ t('notes.skip') }}</button
                    >
                    <button
                        class="zen-btn notes-btn notes-btn-primary"
                        @click="handleSave"
                        >{{ t('notes.save') }}</button
                    >
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.notes-modal-bg {
    position: fixed;
    inset: 0;
    z-index: $z-toast;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, $scrim 70%, transparent);
    backdrop-filter: blur($blur-base);
    animation: fade-in $duration-base ease-out;
}

.notes-modal {
    width: 90%;
    max-width: $size-48;
    padding: 0;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    box-shadow: $shadow-md-strong;
    animation: slide-up $duration-slow ease-out;
}

.notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-2 $space-3;
    border-bottom: $border-width-thin $input-border;

    h2 {
        margin: 0;
        color: $text1;
        font-size: $font-size-sm;
        font-weight: $font-weight-normal;
        text-transform: uppercase;
        letter-spacing: $letter-spacing-4;
    }
}

// Glyph metrics only — `.zen-icon-btn` carries the interaction states.
.notes-close {
    width: auto;
    height: auto;
    padding: $space-1 $space-2;
    font-size: $font-size-xl;
}

.notes-content {
    padding: $space-3;
}

.notes-prompt {
    margin: 0 0 $space-2;
    color: $text2;
    font-size: $font-size-xs;
}

.notes-textarea {
    padding: $space-2;
    font-size: $font-size-xs;
}

.notes-actions {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    margin-top: $space-3;
}

.notes-btn {
    min-height: auto;
    padding: $space-1 $space-3;
    font-size: $font-size-xs;
}
</style>
