<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import Home from '@/renderer/components/Home.vue';
import { updateTheme, updateLanguage } from '@/renderer/store';
import type { Language } from '@/renderer/store/types';
import { log } from '@/renderer/utils/logger';
import { isDesktop } from '@/renderer/utils/platform';

const LANGUAGES: readonly Language[] = ['en', 'es', 'it', 'fr', 'de', 'pt', 'zh', 'ja'];

const { locale } = useI18n();

const currentTheme = ref<'light' | 'dark'>('dark');
const meditationActive = ref(false); // controlled by Home.vue
const isDesktopApp = ref(false);

function onMeditationActive(val: boolean): void {
    meditationActive.value = val;
}

function isThemeId(value: string): value is 'light' | 'dark' {
    return value === 'light' || value === 'dark';
}

function isLanguage(value: string): value is Language {
    return LANGUAGES.some((language) => language === value);
}

function applyVaultTheme(theme: string): void {
    if (isThemeId(theme)) {
        currentTheme.value = theme;
    }
}

function applyVaultLanguage(language: string): void {
    if (isLanguage(language)) {
        locale.value = language;
    }
}

async function setTheme(theme: string): Promise<void> {
    if (!isThemeId(theme)) return;
    currentTheme.value = theme;
    try {
        await updateTheme(theme);
    } catch (err) {
        log.error('Failed to update theme', err);
    }
}

async function setLanguage(language: string): Promise<void> {
    if (!isLanguage(language)) return;
    locale.value = language;
    try {
        await updateLanguage(language);
    } catch (err) {
        log.error('Failed to update language', err);
    }
}

onMounted(() => {
    isDesktopApp.value = isDesktop();
});
</script>

<template>
    <div
        id="app"
        :class="[currentTheme, { 'has-desktop-header': isDesktopApp }]">
        <Home
            :theme="currentTheme"
            @meditation-active="onMeditationActive"
            @theme-changed="applyVaultTheme"
            @language-changed="applyVaultLanguage"
            @theme-change="setTheme"
            @language-change="setLanguage" />
    </div>
</template>
