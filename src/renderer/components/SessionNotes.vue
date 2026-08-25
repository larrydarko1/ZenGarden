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
            class="notes-modal-backdrop"
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
                    class="notes-close"
                    aria-label="Close notes modal"
                    @click="handleClose"
                    >×</button
                >
            </div>
            <div class="notes-content">
                <p class="notes-prompt">{{ t('notes.subtitle') }}</p>
                <textarea
                    v-model="notes"
                    class="notes-textarea"
                    :placeholder="t('notes.placeholder')"
                    rows="6"
                    aria-label="Meditation session notes"
                    @keydown.esc="handleClose"></textarea>
                <div class="notes-actions">
                    <button
                        class="notes-btn notes-btn-secondary"
                        @click="handleSkip"
                        >{{ t('notes.skip') }}</button
                    >
                    <button
                        class="notes-btn notes-btn-primary"
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
    background: color-mix(in srgb, $scrim 70%, transparent);
    backdrop-filter: blur($blur-base);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: $z-toast;
    animation: fade-in $duration-base ease-out;
}

.notes-modal-backdrop {
    position: absolute;
    inset: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: default;
}

@keyframes fade-in {
    from {
        opacity: $opacity-faint;
    }

    to {
        opacity: $opacity-full;
    }
}

.notes-modal {
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    width: 90%;
    max-width: $size-48;
    padding: 0;
    box-shadow: $shadow-md-strong;
    animation: slide-up $duration-slow ease-out;
}

@keyframes slide-up {
    from {
        transform: translateY($size-12);
        opacity: $opacity-faint;
    }

    to {
        transform: translateY(0);
        opacity: $opacity-full;
    }
}

.notes-header {
    padding: $space-2 $space-3;
    border-bottom: $border-width-thin $input-border;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notes-header h2 {
    margin: 0;
    font-size: $font-size-sm;
    color: $text1;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
}

.notes-close {
    background: transparent;
    border: none;
    color: $text2;
    font-size: $font-size-xl;
    cursor: pointer;
    padding: $space-1 $space-2;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $border-radius-xs;
    transition:
        background $duration-base,
        color $duration-base;
}

.notes-close:hover {
    background: $input-bg-focus;
    color: $text1;
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
    width: 100%;
    box-sizing: border-box;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-sm;
    padding: $space-2;
    color: $text1;
    font-family: inherit;
    font-size: $font-size-xs;
    resize: vertical;
    min-height: $size-33;
    transition: border-color $transition-base;
}

.notes-textarea:focus {
    outline: none;
    border-color: $input-border-focus;
}

.notes-textarea::placeholder {
    color: $text2;
    opacity: $opacity-mid-low;
}

.notes-actions {
    display: flex;
    gap: $space-2;
    margin-top: $space-3;
    justify-content: flex-end;
}

.notes-btn {
    padding: $space-1 $space-3;
    border-radius: $border-radius-sm;
    font-size: $font-size-xs;
    cursor: pointer;
    border: none;
    transition: all $transition-fast;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
}

.notes-btn-secondary {
    background: transparent;
    color: $text2;
    border: $border-width-thin $border-subtle;
}

.notes-btn-secondary:hover {
    background: $input-bg-focus;
    border-color: $button-border-hover;
    color: $text1;
}

.notes-btn-primary {
    background: $button-bg;
    color: $text1;
    border: $border-width-thin $border-subtle;
}

.notes-btn-primary:hover {
    background: $button-bg-hover;
    border-color: $button-border-hover;
}
</style>
