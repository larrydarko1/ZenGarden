<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface EightfoldPath {
    key: string;
    displayName: string;
    description: string;
    questions: string;
}

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
        <div v-if="loading" class="loading">{{ t('eightfold.loading') }}...</div>
        <div v-else class="eightfold-path-list">
            <div v-for="path in paths" :key="path.key" class="eightfold-path-item">
                <div class="eightfold-checkbox-row">
                    <input
                        :id="`ef-${path.key}`"
                        type="checkbox"
                        :checked="isPathFollowed(path.key)"
                        @change="emit('toggle-path', path.key)"
                    />
                    <label :for="`ef-${path.key}`" class="eightfold-path-name">{{ path.displayName }}</label>
                </div>
                <div class="eightfold-path-desc">{{ path.description }}</div>
                <div class="eightfold-path-question">{{ path.questions }}</div>
                <div v-if="isPathFollowed(path.key)" class="eightfold-path-note">
                    <textarea
                        :value="pathNotes[path.key]"
                        :placeholder="t('eightfold.notesPlaceholder')"
                        rows="2"
                        @input="
                            (e) => {
                                emit('update:pathNotes', {
                                    ...pathNotes,
                                    [path.key]: (e.target as HTMLTextAreaElement).value,
                                });
                                emit('save-path');
                            }
                        "
                    ></textarea>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.eightfold-view {
    min-height: 300px;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: var(--text2);
    font-size: 1rem;
}

.eightfold-inline-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.eightfold-stat {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.eightfold-stat-label {
    font-size: 0.8rem;
    color: var(--text2);
}

.eightfold-stat-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text1);
}

.eightfold-path-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.eightfold-path-item {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s;
}

.eightfold-path-item:hover {
    background: var(--input-bg-focus);
    border-color: var(--input-border-focus);
}

.eightfold-checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.35rem;
}

.eightfold-checkbox-row input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--text1);
    flex-shrink: 0;
}

.eightfold-path-name {
    color: var(--text1);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
}

.eightfold-path-desc {
    color: var(--text2);
    font-size: 0.8rem;
    margin-left: 1.65rem;
    margin-bottom: 0.25rem;
    line-height: 1.4;
}

.eightfold-path-question {
    color: var(--text2);
    font-size: 0.75rem;
    font-style: italic;
    margin-left: 1.65rem;
    opacity: 0.7;
    line-height: 1.4;
}

.eightfold-path-note {
    margin-left: 1.65rem;
    margin-top: 0.5rem;
}

.eightfold-path-note textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    color: var(--text1);
    font-family: inherit;
    font-size: 0.85rem;
    resize: vertical;
    transition: all 0.2s;
    line-height: 1.5;
}

.eightfold-path-note textarea:focus {
    outline: none;
    border-color: var(--input-border-focus);
    background: var(--input-bg-focus);
}

.eightfold-path-note textarea::placeholder {
    color: var(--text2);
    opacity: 0.5;
}
</style>
