<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Home from './components/Home.vue';
import DesktopHeader from './components/DesktopHeader.vue';
import { updateTheme, updateLanguage } from './store';
import { isDesktop } from './utils/platform';

const { locale } = useI18n();

// Theme starts as dark, will be set from user data after login
const currentTheme = ref('dark');
const meditationActive = ref(false); // controlled by Home.vue
const isAuthenticated = ref(false);
const isDesktopApp = ref(false);

// Check if running on desktop
onMounted(() => {
    isDesktopApp.value = isDesktop();
});

function onMeditationActive(val: boolean) {
    meditationActive.value = val;
}

function onUserChanged(user: any) {
    isAuthenticated.value = !!user;
}

function setThemeFromLogin(theme: string) {
    const themes = ['light', 'dark'];
    if (themes.includes(theme)) {
        currentTheme.value = theme;
    }
}

function setLanguageFromLogin(language: string) {
    const languages = ['en', 'es', 'it', 'fr', 'de', 'pt', 'zh', 'ja'];
    if (languages.includes(language)) {
        locale.value = language;
    }
}

async function setTheme(theme: string) {
    const validTheme = theme as 'light' | 'dark';
    currentTheme.value = validTheme;
    try {
        await updateTheme(validTheme);
    } catch (err) {
        console.error('Failed to update theme:', err);
    }
}

async function setLanguage(language: string) {
    const validLanguage = language as 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';
    locale.value = validLanguage;
    try {
        await updateLanguage(validLanguage);
    } catch (err) {
        console.error('Failed to update language:', err);
    }
}
</script>

<template>
    <div id="app" :class="[currentTheme, { 'has-desktop-header': isDesktopApp }]">
        <DesktopHeader v-if="isDesktopApp" />
        <Home
            @meditation-active="onMeditationActive"
            @theme-changed="setThemeFromLogin"
            @language-changed="setLanguageFromLogin"
            @user-changed="onUserChanged"
            @theme-change="setTheme"
            @language-change="setLanguage"
        />
    </div>
</template>

<style></style>
