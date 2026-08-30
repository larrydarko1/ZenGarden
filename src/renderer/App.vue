<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Home from '@/renderer/components/Home.vue';
import { updateTheme, updateLanguage } from '@/renderer/store';
import { isDesktop } from '@/renderer/utils/platform';
import { log } from '@/renderer/utils/logger';

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

function applyVaultTheme(theme: string): void {
    if (isThemeId(theme)) {
        currentTheme.value = theme;
    }
}

function applyVaultLanguage(language: string): void {
    const languages = ['en', 'es', 'it', 'fr', 'de', 'pt', 'zh', 'ja'];
    if (languages.includes(language)) {
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
    const validLanguage = language as 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';
    locale.value = validLanguage;
    try {
        await updateLanguage(validLanguage);
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
