// SettingsPopup — inline settings panel for theme, language, and account management. // Owns: theme/language selection
UI, delegating account management to AccountSettings. // Does NOT own: persisting theme/language (emits to parent),
account CRUD (AccountSettings).
<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSettings from './AccountSettings.vue';

const { t, locale } = useI18n();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'theme-change', theme: string): void;
    (e: 'language-change', language: string): void;
}>();

const themes = ['dark', 'light'];
const languages = {
    en: 'English',
    es: 'Español',
    it: 'Italiano',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    zh: '中文',
    ja: '日本語',
};

const currentTheme = ref('dark'); // Will be set from user data
const currentLanguage = ref(locale.value);

function selectTheme(theme: string) {
    currentTheme.value = theme;
    emit('theme-change', theme);
}

function selectLanguage(lang: string) {
    currentLanguage.value = lang;
    emit('language-change', lang);
}

function handleUsernameChange(_newUsername: string) {
    window.location.reload();
}

function handleAccountDeletion() {
    // Account deleted, redirect to login
    emit('close');
    window.location.reload();
}
</script>

<template>
    <div class="settings-inline">
        <div class="settings-section">
            <h3 class="section-label">{{ t('settings.theme') }}</h3>
            <div class="theme-options">
                <button
                    v-for="theme in themes"
                    :key="theme"
                    :class="['theme-option', theme, { active: currentTheme === theme }]"
                    @click="selectTheme(theme)"
                >
                    <div class="theme-preview" :class="theme"></div>
                    <span class="theme-name">{{ t(`settings.themes.${theme}`) }}</span>
                </button>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="section-label">{{ t('settings.language') }}</h3>
            <div class="language-options">
                <button
                    v-for="(langName, langCode) in languages"
                    :key="langCode"
                    :class="['language-option', { active: currentLanguage === langCode }]"
                    @click="selectLanguage(langCode)"
                >
                    {{ langName }}
                </button>
            </div>
        </div>

        <div class="settings-divider"></div>

        <AccountSettings @username-changed="handleUsernameChange" @account-deleted="handleAccountDeletion" />
    </div>
</template>

<style scoped>
.settings-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.settings-section {
    margin-bottom: 1.25rem;
}

.settings-section:last-of-type {
    margin-bottom: 0;
}

.section-label {
    color: var(--text2);
    font-size: 0.7rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 0.6rem 0;
}

.settings-divider {
    height: 1px;
    background: var(--input-border);
    margin: 0.5rem 0 1.25rem;
    opacity: 0.5;
}

.theme-options {
    display: flex;
    gap: 0.75rem;
}

.theme-option {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
}

.theme-option:hover {
    background: var(--input-bg-focus);
    border-color: var(--border-subtle);
}

.theme-option.active {
    background: var(--border-subtle);
    border-color: var(--border-subtle);
}

.theme-preview {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    border: 1px solid var(--input-border);
    transition: transform 0.15s;
}

.theme-option:hover .theme-preview {
    transform: scale(1.05);
}

.theme-preview.light {
    background: linear-gradient(135deg, #f2f3f4 0%, #e3e6ed 100%);
}

.theme-preview.dark {
    background: linear-gradient(135deg, #181a20 0%, #23262f 100%);
}

.theme-name {
    color: var(--text1);
    font-size: 0.7rem;
    font-weight: 400;
}

.language-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
}

.language-option {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 0.5rem 0.35rem;
    color: var(--text2);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
    font-weight: 400;
}

.language-option:hover {
    background: var(--input-bg-focus);
    border-color: var(--border-subtle);
    color: var(--text1);
}

.language-option.active {
    background: var(--border-subtle);
    border-color: var(--border-subtle);
    color: var(--text1);
    font-weight: 400;
}

/* Responsive */
@media (max-width: 768px) {
    .settings-section {
        margin-bottom: 1.5rem;
    }

    .section-label {
        font-size: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .theme-option {
        padding: 0.875rem;
        min-height: 64px;
        touch-action: manipulation;
    }

    .language-options {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
    }

    .language-option {
        padding: 0.75rem;
        font-size: 0.8rem;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
    }
}

@media (max-width: 480px) {
    .language-options {
        grid-template-columns: 1fr 1fr;
    }
}
</style>
