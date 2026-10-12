<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import IconCalendar from '@/renderer/components/icons/IconCalendar.vue';
import IconJournal from '@/renderer/components/icons/IconJournal.vue';
import IconLogOut from '@/renderer/components/icons/IconLogOut.vue';
import IconSettings from '@/renderer/components/icons/IconSettings.vue';
import IconThought from '@/renderer/components/icons/IconThought.vue';

defineProps<{
    journalMode: boolean;
    calendarMode: boolean;
    philosophyMode: boolean;
    settingsMode: boolean;
    canCloseVault: boolean;
}>();

defineEmits<{
    'toggle-journal': [];
    'toggle-calendar': [];
    'toggle-philosophy': [];
    'toggle-settings': [];
    'close-vault': [];
}>();

const { t } = useI18n();
</script>

<template>
    <nav class="bottom-nav">
        <button
            class="nav-item"
            :class="[{ 'nav-active': journalMode }]"
            aria-label="Track your emotions"
            @click="$emit('toggle-journal')">
            <IconJournal
                width="22"
                height="22" />
            <span>{{ t('header.emotions') }}</span>
        </button>
        <button
            class="nav-item"
            :class="[{ 'nav-active': calendarMode }]"
            aria-label="View meditation history"
            @click="$emit('toggle-calendar')">
            <IconCalendar
                width="22"
                height="22" />
            <span>{{ t('header.calendar') }}</span>
        </button>
        <button
            class="nav-item"
            :class="[{ 'nav-active': philosophyMode }]"
            aria-label="About our philosophy"
            @click="$emit('toggle-philosophy')">
            <IconThought
                width="22"
                height="22" />
            <span>{{ t('header.philosophy') }}</span>
        </button>
        <button
            class="nav-item"
            :class="[{ 'nav-active': settingsMode }]"
            aria-label="Open settings"
            @click="$emit('toggle-settings')">
            <IconSettings
                width="22"
                height="22" />
            <span>{{ t('header.settings') }}</span>
        </button>
        <button
            v-if="canCloseVault"
            class="nav-item nav-close-vault"
            aria-label="Close the current vault"
            @click="$emit('close-vault')">
            <IconLogOut
                width="22"
                height="22" />
            <span>{{ t('vault.close') }}</span>
        </button>
    </nav>
</template>

<style scoped lang="scss">
.bottom-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: $z-overlay;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: $space-1 $space-1 calc($space-1 + env(safe-area-inset-bottom));
    background: color-mix(in srgb, $base1 85%, transparent);
    backdrop-filter: blur($blur-lg);
    border-top: $border-width-thin $input-border;
}

.nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-2;
    min-width: $size-22;
    padding: $space-1;
    background: transparent;
    border: none;
    border-radius: $border-radius-lg;
    color: $text2;
    font-size: $font-size-xxs;
    font-weight: $font-weight-normal;
    letter-spacing: $letter-spacing-1;
    cursor: pointer;
    transition:
        color $duration-slower $ease-standard,
        background $duration-slower $ease-standard,
        transform $duration-relaxed $ease-standard,
        box-shadow $duration-slower $ease-standard;

    svg {
        flex-shrink: 0;
        width: $size-13;
        height: $size-13;
        opacity: $opacity-mid-high;
        transition:
            opacity $duration-slower $ease-standard,
            transform $duration-slower $ease-standard;
    }

    span {
        line-height: $line-height-none;
        white-space: nowrap;
        transition: transform $duration-slow $ease-standard;
    }

    &:hover {
        background: $input-bg-focus;
        color: $text1;

        svg {
            opacity: $opacity-full;
        }
    }

    &:active {
        transform: scale($scale-93);
        transition-duration: $duration-quick;
    }

    &.nav-active {
        background: $button-bg;
        color: $text1;
        box-shadow: $shadow-glow;

        svg {
            opacity: $opacity-full;
            transform: translateY(-$size-0);
        }

        // The underline draws itself in on activation, then stays put.
        &::after {
            content: '';
            position: absolute;
            bottom: $size-1;
            left: 50%;
            width: $size-10;
            height: $size-1;
            background: $text1;
            border-radius: $border-radius-round;
            opacity: $opacity-mid;
            transform: translateX(-50%) scaleX(0);
            animation: nav-indicator-in $duration-gentle $ease-standard forwards;
        }
    }

    &.nav-close-vault {
        color: color-mix(in srgb, $text2 60%, transparent);

        &:hover {
            color: $text1;
        }
    }
}

@keyframes nav-indicator-in {
    from {
        transform: translateX(-50%) scaleX(0);
        opacity: $opacity-faint;
    }

    to {
        transform: translateX(-50%) scaleX($scale-100);
        opacity: $opacity-mid;
    }
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-xs}) {
    .nav-item {
        gap: $space-1;
        min-width: $size-24;
        padding: $space-2 $space-1;

        svg {
            width: $size-14;
            height: $size-14;
        }
    }
}

@media (width > #{$breakpoint-md}) {
    .bottom-nav {
        gap: $space-1;
    }

    .nav-item {
        min-width: $size-26;
        padding: $space-2;
        font-size: $font-size-xs;

        svg {
            width: $size-15;
            height: $size-15;
        }
    }
}

@media (width > #{$breakpoint-xl}) {
    .bottom-nav {
        padding: $space-2 $space-4 calc($space-2 + env(safe-area-inset-bottom));
    }

    .nav-item {
        min-width: $size-25;
        padding: $space-2 $space-3;
        font-size: $font-size-xxs;

        svg {
            width: $size-13;
            height: $size-13;
        }
    }
}

@media (height <= #{$breakpoint-short}) and (width <= #{$breakpoint-2xl}) {
    .bottom-nav {
        flex-direction: row;
        padding: $space-1 $space-2;
    }

    .nav-item {
        font-size: $font-size-xxs;

        svg {
            width: $size-13;
            height: $size-13;
        }
    }
}
</style>
