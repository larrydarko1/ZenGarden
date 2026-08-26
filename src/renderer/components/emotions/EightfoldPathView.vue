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
                        class="zen-textarea"
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
    padding: $space-7;
    color: $text2;
    font-size: $font-size-base;
    text-align: center;
}

.eightfold-inline-stats {
    display: flex;
    gap: $space-4;
    margin-bottom: $space-4;
}

.eightfold-stat {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    padding: $space-2 $space-3;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
}

.eightfold-stat-label {
    color: $text2;
    font-size: $font-size-xs;
}

.eightfold-stat-value {
    color: $text1;
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
}

.eightfold-path-list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
}

.eightfold-path-item {
    padding: $space-3;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    transition:
        background $transition-base,
        border-color $transition-base;

    &:hover {
        background: $input-bg-focus;
        border-color: $input-border-focus;
    }
}

.eightfold-checkbox-row {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-1;

    input[type='checkbox'] {
        flex-shrink: 0;
        width: $size-11;
        height: $size-11;
        accent-color: $text1;
        cursor: pointer;
    }
}

.eightfold-path-name {
    color: $text1;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    cursor: pointer;
}

/** The left inset aligns these under the label, clear of the checkbox. */
.eightfold-path-desc {
    margin-bottom: $space-1;
    margin-left: $space-6;
    color: $text2;
    font-size: $font-size-xs;
    line-height: $line-height-snug;
}

.eightfold-path-question {
    margin-left: $space-6;
    color: $text2;
    font-size: $font-size-xs;
    font-style: italic;
    line-height: $line-height-snug;
    opacity: $opacity-mid-high;
}

.eightfold-path-note {
    margin-top: $space-2;
    margin-left: $space-6;

    /** Size only — `.zen-textarea` carries the field treatment. */
    .zen-textarea {
        min-height: auto;
        border-radius: $border-radius;
        line-height: $line-height-base;
    }
}
</style>
