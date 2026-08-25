<script setup lang="ts">
import { useI18n } from 'vue-i18n';

type EightfoldPath = {
    key: string;
    displayName: string;
    description: string;
    questions: string;
};

defineProps<{
    loading: boolean;
    paths: EightfoldPath[];
    followedPaths: string[];
    pathNotes: Record<string, string>;
    completedCount: number;
    progressPercentage: number;
    isPathFollowed: (key: string) => boolean;
}>();

const emit = defineEmits<{
    'toggle-path': [key: string];
    'update:pathNotes': [notes: Record<string, string>];
    'save-path': [];
}>();

const { t } = useI18n();
</script>

<template>
    <div class="eightfold-view">
        <div class="eightfold-inline-stats">
            <div class="eightfold-stat">
                <span class="eightfold-stat-label">{{ t('eightfold.completed') }}</span>
                <span class="eightfold-stat-value">{{ completedCount }}/8</span>
            </div>
            <div class="eightfold-stat">
                <span class="eightfold-stat-label">{{ t('eightfold.progress') }}</span>
                <span class="eightfold-stat-value">{{ progressPercentage }}%</span>
            </div>
        </div>
        <div
            v-if="loading"
            class="loading"
            >{{ t('eightfold.loading') }}...</div
        >
        <div
            v-else
            class="eightfold-path-list">
            <div
                v-for="path in paths"
                :key="path.key"
                class="eightfold-path-item">
                <div class="eightfold-checkbox-row">
                    <input
                        :id="`ef-${path.key}`"
                        type="checkbox"
                        :checked="isPathFollowed(path.key)"
                        @change="emit('toggle-path', path.key)" />
                    <label
                        :for="`ef-${path.key}`"
                        class="eightfold-path-name"
                        >{{ path.displayName }}</label
                    >
                </div>
                <div class="eightfold-path-desc">{{ path.description }}</div>
                <div class="eightfold-path-question">{{ path.questions }}</div>
                <div
                    v-if="isPathFollowed(path.key)"
                    class="eightfold-path-note">
                    <textarea
                        :value="pathNotes[path.key]"
                        :placeholder="t('eightfold.notesPlaceholder')"
                        :aria-label="t('eightfold.notesPlaceholder')"
                        rows="2"
                        @input="
                            (e) => {
                                emit('update:pathNotes', {
                                    ...pathNotes,
                                    [path.key]: (e.target as HTMLTextAreaElement).value,
                                });
                                emit('save-path');
                            }
                        "></textarea>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.eightfold-view {
    min-height: $size-44;
}

.loading {
    text-align: center;
    padding: $space-7;
    color: $text2;
    font-size: $font-size-base;
}

.eightfold-inline-stats {
    display: flex;
    gap: $space-4;
    margin-bottom: $space-4;
}

.eightfold-stat {
    flex: 1;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    padding: $space-2 $space-3;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.eightfold-stat-label {
    font-size: $font-size-xs;
    color: $text2;
}

.eightfold-stat-value {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text1;
}

.eightfold-path-list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
}

.eightfold-path-item {
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    padding: $space-3;
    transition: all $transition-base;
}

.eightfold-path-item:hover {
    background: $input-bg-focus;
    border-color: $input-border-focus;
}

.eightfold-checkbox-row {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-1;
}

.eightfold-checkbox-row input[type='checkbox'] {
    width: $size-11;
    height: $size-11;
    cursor: pointer;
    accent-color: $text1;
    flex-shrink: 0;
}

.eightfold-path-name {
    color: $text1;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    cursor: pointer;
}

.eightfold-path-desc {
    color: $text2;
    font-size: $font-size-xs;
    margin-left: $space-6;
    margin-bottom: $space-1;
    line-height: $line-height-snug;
}

.eightfold-path-question {
    color: $text2;
    font-size: $font-size-xs;
    font-style: italic;
    margin-left: $space-6;
    opacity: $opacity-mid-high;
    line-height: $line-height-snug;
}

.eightfold-path-note {
    margin-left: $space-6;
    margin-top: $space-2;
}

.eightfold-path-note textarea {
    width: 100%;
    box-sizing: border-box;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    padding: $space-2 $space-3;
    color: $text1;
    font-family: inherit;
    font-size: $font-size-sm;
    resize: vertical;
    transition: all $transition-base;
    line-height: $line-height-base;
}

.eightfold-path-note textarea:focus {
    outline: none;
    border-color: $input-border-focus;
    background: $input-bg-focus;
}

.eightfold-path-note textarea::placeholder {
    color: $text2;
    opacity: $opacity-mid-low;
}
</style>
