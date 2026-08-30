<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { vaultIsPickable, chooseVault, findVaultPath } from '@/renderer/store';
import { log } from '@/renderer/utils/logger';

const props = defineProps<{ theme: 'light' | 'dark' }>();

const emit = defineEmits<{
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

const currentLanguage = ref(locale.value);

const vaultPath = ref<string | null>(null);
const vaultPickable = ref(false);

function selectTheme(theme: string): void {
    emit('theme-change', theme);
}

function selectLanguage(lang: string): void {
    currentLanguage.value = lang;
    emit('language-change', lang);
}

async function switchVault(): Promise<void> {
    try {
        const path = await chooseVault();
        if (path !== null) window.location.reload();
    } catch (error) {
        log.error('Failed to switch vault', error);
    }
}

onMounted(async () => {
    try {
        vaultPickable.value = await vaultIsPickable();
        vaultPath.value = await findVaultPath();
    } catch (error) {
        log.error('Failed to read the vault location', error);
    }
});
</script>

<template>
    <div class="settings-inline">
        <div class="settings-section">
            <h3 class="zen-label">{{ t('settings.theme') }}</h3>
            <div class="theme-options">
                <button
                    v-for="themeId in themes"
                    :key="themeId"
                    class="theme-option"
                    :class="[themeId, { active: props.theme === themeId }]"
                    @click="selectTheme(themeId)">
                    <div
                        class="theme-preview"
                        :class="themeId"></div>
                    <span class="theme-name">{{ t(`settings.themes.${themeId}`) }}</span>
                </button>
            </div>
        </div>

        <div class="settings-section">
            <h3 class="zen-label">{{ t('settings.language') }}</h3>
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

        <div class="zen-divider settings-divider"></div>

        <div class="settings-section">
            <h3 class="zen-label">{{ t('vault.location') }}</h3>
            <p class="vault-path">{{ vaultPath ?? '—' }}</p>
            <button
                v-if="vaultPickable"
                type="button"
                class="zen-btn is-ghost vault-switch"
                @click="switchVault">
                {{ t('vault.change') }}
            </button>
            <p
                v-else
                class="vault-note"
                >{{ t('vault.fixedLocation') }}</p
            >
        </div>
    </div>
</template>

<style scoped lang="scss">
.settings-inline {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
}

.settings-section {
    margin-bottom: $space-6;

    &:last-of-type {
        margin-bottom: 0;
    }
}

.zen-label {
    margin-bottom: $space-3;
}

.settings-divider {
    margin: $space-2 0 $space-5;
}

/* ––––– Vault ––––– */

.vault-path {
    margin-bottom: $space-3;
    color: $text2;
    font-size: $font-size-xs;
    word-break: break-all;
}

.vault-note {
    color: $text2;
    font-size: $font-size-xs;
}

.vault-switch {
    width: 100%;
}

/* ––––– Theme ––––– */

.theme-options {
    display: flex;
    gap: $space-3;
}

.theme-option {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: $space-2;
    padding: $space-3;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    cursor: pointer;
    min-height: $size-28;
    touch-action: manipulation;
    transition:
        background $transition-fast,
        border-color $transition-fast;

    &:hover {
        background: $input-bg-focus;
        border-color: $border-subtle;

        .theme-preview {
            transform: scale($scale-105);
        }
    }

    &:active {
        transform: scale($scale-98);
    }

    &.active {
        background: $border-subtle;
        border-color: $border-subtle;
    }
}

.theme-preview {
    width: $size-20;
    height: $size-20;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    transition: transform $transition-fast;

    &.light {
        background: $swatch-light;
    }

    &.dark {
        background: $swatch-dark;
    }
}

.theme-name {
    color: $text1;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
}

/* ––––– Language ––––– */

.language-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $space-2;
}

.language-option {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: $size-21;
    padding: $space-3;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    color: $text2;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
    text-align: center;
    cursor: pointer;
    touch-action: manipulation;
    transition:
        color $transition-fast,
        background $transition-fast,
        border-color $transition-fast;

    &:hover {
        background: $input-bg-focus;
        border-color: $border-subtle;
        color: $text1;
    }

    &:active {
        transform: scale($scale-98);
    }

    &.active {
        background: $border-subtle;
        border-color: $border-subtle;
        color: $text1;
    }
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-xl}) {
    .settings-section {
        margin-bottom: $space-5;
    }

    .zen-label {
        margin-bottom: $space-2;
    }

    .language-options {
        grid-template-columns: repeat(4, 1fr);
    }

    .language-option {
        display: block;
        min-height: auto;
        padding: $space-2 $space-1;
    }
}
</style>
