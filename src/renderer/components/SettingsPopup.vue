<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSettings from '@/renderer/components/AccountSettings.vue';

const emit = defineEmits<{
    'close': [];
    'theme-change': [theme: string];
    'language-change': [language: string];
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

const { t, locale } = useI18n();

const currentTheme = ref('dark');
const currentLanguage = ref(locale.value);

function selectTheme(theme: string): void {
    currentTheme.value = theme;
    emit('theme-change', theme);
}

function selectLanguage(lang: string): void {
    currentLanguage.value = lang;
    emit('language-change', lang);
}

function handleUsernameChange(_newUsername: string): void {
    window.location.reload();
}

function handleAccountDeletion(): void {
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
                    class="theme-option"
                    :class="[theme, { active: currentTheme === theme }]"
                    @click="selectTheme(theme)">
                    <div
                        class="theme-preview"
                        :class="theme"></div>
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
                    class="language-option"
                    :class="[{ active: currentLanguage === langCode }]"
                    @click="selectLanguage(langCode)">
                    {{ langName }}
                </button>
            </div>
        </div>

        <div class="settings-divider"></div>

        <AccountSettings
            @username-changed="handleUsernameChange"
            @account-deleted="handleAccountDeletion" />
    </div>
</template>

<style scoped lang="scss">
.settings-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.settings-section {
    margin-bottom: $space-5;
}

.settings-section:last-of-type {
    margin-bottom: 0;
}

.section-label {
    color: $text2;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-5;
    margin: 0 0 $space-2;
}

.settings-divider {
    height: $size-0;
    background: $input-border;
    margin: $space-2 0 $space-5;
    opacity: $opacity-mid-low;
}

.theme-options {
    display: flex;
    gap: $space-3;
}

.theme-option {
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    padding: $space-3;
    cursor: pointer;
    transition: all $transition-fast;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-2;
    flex: 1;
}

.theme-option:hover {
    background: $input-bg-focus;
    border-color: $border-subtle;
}

.theme-option.active {
    background: $border-subtle;
    border-color: $border-subtle;
}

.theme-preview {
    width: $size-20;
    height: $size-20;
    border-radius: $border-radius;
    border: $border-width-thin $input-border;
    transition: transform $transition-fast;
}

.theme-option:hover .theme-preview {
    transform: scale($scale-105);
}

.theme-preview.light {
    background: $swatch-light;
}

.theme-preview.dark {
    background: $swatch-dark;
}

.theme-name {
    color: $text1;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
}

.language-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $space-2;
}

.language-option {
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    padding: $space-2 $space-1;
    color: $text2;
    font-size: $font-size-xs;
    cursor: pointer;
    transition: all $transition-fast;
    text-align: center;
    font-weight: $font-weight-normal;
}

.language-option:hover {
    background: $input-bg-focus;
    border-color: $border-subtle;
    color: $text1;
}

.language-option.active {
    background: $border-subtle;
    border-color: $border-subtle;
    color: $text1;
    font-weight: $font-weight-normal;
}

@media (width <= #{$breakpoint-xl}) {
    .settings-section {
        margin-bottom: $space-6;
    }

    .section-label {
        font-size: $font-size-xs;
        margin-bottom: $space-3;
    }

    .theme-option {
        padding: $space-3;
        min-height: $size-28;
        touch-action: manipulation;
    }

    .language-options {
        grid-template-columns: repeat(2, 1fr);
        gap: $space-2;
    }

    .language-option {
        padding: $space-3;
        font-size: $font-size-xs;
        min-height: $size-21;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
    }
}

@media (width <= #{$breakpoint-md}) {
    .language-options {
        grid-template-columns: 1fr 1fr;
    }
}
</style>
