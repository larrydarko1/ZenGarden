<script setup lang="ts">
import { ref, type Component } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{
    animationComponent: Component;
    bellEnabled: boolean;
    bellInterval: number;
    bellSound: string;
    meditationSeconds: number;
    formatTime: (seconds: number) => string;
}>();

const emit = defineEmits<{
    'stop': [];
    'update:bellEnabled': [value: boolean];
    'update:bellInterval': [value: number];
    'select-bell-sound': [sound: string];
}>();

const BELL_INTERVALS = [5, 10, 15, 20];
const BELL_SOUNDS = ['1', '2', '3', '4'];

const { t } = useI18n();

// UI-local dropdown state
const showIntervalDropdown = ref(false);
const showSoundDropdown = ref(false);
</script>

<template>
    <div class="zen-meditation-overlay">
        <component :is="animationComponent" />

        <!-- Bell Settings Toolbar -->
        <div class="bell-settings-toolbar">
            <button
                class="bell-toggle-btn"
                :class="[{ active: bellEnabled }]"
                :aria-label="bellEnabled ? 'Disable interval bells' : 'Enable interval bells'"
                @click="emit('update:bellEnabled', !bellEnabled)">
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M12 2C10.9 2 10 2.9 10 4C10 4.6 10.2 5.1 10.6 5.5C8 6.1 6 8.3 6 11V16L4 18V19H20V18L18 16V11C18 8.3 16 6.1 13.4 5.5C13.8 5.1 14 4.6 14 4C14 2.9 13.1 2 12 2ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </button>

            <div
                v-if="bellEnabled"
                class="bell-settings">
                <div class="bell-dropdown">
                    <button
                        class="bell-dropdown-btn"
                        @click="showIntervalDropdown = !showIntervalDropdown">
                        {{ t('meditation.bell.minutes', { minutes: bellInterval }) }}
                        <span class="dropdown-arrow">▾</span>
                    </button>
                    <button
                        v-if="showIntervalDropdown"
                        type="button"
                        class="zen-backdrop dropdown-backdrop-inline"
                        :aria-label="t('meditation.bell.closeIntervals')"
                        @click="showIntervalDropdown = false"></button>
                    <div
                        v-if="showIntervalDropdown"
                        class="bell-dropdown-menu">
                        <button
                            v-for="interval in BELL_INTERVALS"
                            :key="interval"
                            type="button"
                            @click="
                                emit('update:bellInterval', interval);
                                showIntervalDropdown = false;
                            ">
                            {{ t('meditation.bell.minutes', { minutes: interval }) }}
                        </button>
                    </div>
                </div>

                <div class="bell-dropdown">
                    <button
                        class="bell-dropdown-btn"
                        @click="showSoundDropdown = !showSoundDropdown">
                        {{ t('meditation.bell.option', { number: bellSound }) }}
                        <span class="dropdown-arrow">▾</span>
                    </button>
                    <button
                        v-if="showSoundDropdown"
                        type="button"
                        class="zen-backdrop dropdown-backdrop-inline"
                        :aria-label="t('meditation.bell.closeSounds')"
                        @click="showSoundDropdown = false"></button>
                    <div
                        v-if="showSoundDropdown"
                        class="bell-dropdown-menu">
                        <button
                            v-for="sound in BELL_SOUNDS"
                            :key="sound"
                            type="button"
                            @click="
                                emit('select-bell-sound', sound);
                                showSoundDropdown = false;
                            ">
                            {{ t('meditation.bell.option', { number: sound }) }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="meditation-timer meditation-timer-overlay">
            <div
                class="timer-display"
                aria-live="polite"
                aria-label="Meditation timer">
                {{ formatTime(meditationSeconds) }}
            </div>
            <button
                class="meditation-btn"
                aria-label="Stop the current meditation session"
                @click="emit('stop')">
                {{ t('meditation.stop') }}
            </button>
        </div>
    </div>
</template>

<style scoped lang="scss">
.zen-meditation-overlay {
    @include composited-layer;

    position: fixed;
    inset: 0;
    z-index: $z-modal-backdrop;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: $base1;
}

/* ––––– Timer & stop ––––– */

.meditation-timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-7;
    margin-top: $space-8;
}

.meditation-timer-overlay {
    position: absolute;
    bottom: $size-30;
    left: 0;
    z-index: $z-popover;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.timer-display {
    position: absolute;
    bottom: $size-35;
    color: $text1;
    font-size: $font-size-4xl;
}

.meditation-btn {
    position: absolute;
    bottom: $size-29;
    min-height: $size-24;
    padding: $space-3 $space-7;
    background: transparent;
    border: none;
    border-radius: $border-radius-round;
    color: $text1;
    font-size: $font-size-base;
    letter-spacing: $letter-spacing-1;
    cursor: pointer;
    outline: none;
    touch-action: manipulation;
    transition:
        color $duration-slower $ease-standard,
        background $duration-slower $ease-standard,
        box-shadow $duration-slower $ease-standard,
        transform $duration-base $ease-standard;

    &:hover,
    &:focus {
        background: $blur1;
        box-shadow: $shadow-edge;
        color: $text2;
        transform: translateY(-$size-0);
    }

    &:active {
        transform: translateY(0) scale($scale-97);
        transition-duration: $duration-instant;
    }
}

/* ––––– Bell toolbar ––––– */

.bell-settings-toolbar {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + $size-23);
    right: $size-4;
    left: $size-4;
    z-index: $z-modal;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-1;
    padding: $space-1 $space-2;
    background: $blur2;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
}

.bell-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: $size-19;
    min-height: $size-19;
    padding: $space-2;
    background: transparent;
    border: none;
    border-radius: $border-radius;
    color: $text2;
    cursor: pointer;
    transition:
        color $transition-base,
        background $transition-base;

    svg {
        width: $size-9;
        height: $size-9;
    }

    &:hover {
        background: $input-bg-focus;
        color: $text1;
    }

    &.active {
        background: $button-bg;
        color: $text1;
    }
}

.bell-settings {
    display: flex;
    gap: $space-1;
    animation: slide-in $duration-base ease;
}

.bell-dropdown {
    position: relative;
}

.bell-dropdown-btn {
    display: flex;
    align-items: center;
    gap: $space-2;
    min-width: $size-23;
    min-height: $size-19;
    padding: $space-2;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    color: $text1;
    font-size: $font-size-xs;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background $transition-base,
        border-color $transition-base;

    &:hover {
        background: $input-bg-focus;
        border-color: $input-border-focus;
    }
}

.dropdown-arrow {
    font-size: $font-size-xs;
    opacity: $opacity-mid-high;
}

.bell-dropdown-menu {
    @include scrollbar;

    position: fixed;
    top: $size-29;
    left: 50%;
    z-index: $z-modal-top;
    width: 90vw;
    min-width: $size-40;
    max-width: $size-43;
    max-height: 60vh;
    padding: $space-4 $space-3;
    background: $blur2;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-xl;
    box-shadow: $shadow-lg-strong;
    transform: translateX(-50%);
    overflow-y: auto;
    animation: dropdown-slide $duration-fast ease;

    button {
        width: 100%;
        min-height: $size-23;
        margin-bottom: $space-2;
        padding: $space-3;
        background: transparent;
        border: none;
        border-radius: $border-radius-lg;
        color: $text1;
        font-size: $font-size-sm;
        text-align: left;
        white-space: nowrap;
        cursor: pointer;
        transition: background $transition-fast;

        &:last-child {
            margin-bottom: 0;
        }

        &:hover {
            background: $input-bg-focus;
        }
    }
}

.dropdown-backdrop-inline {
    position: fixed;
    inset: 0;
    z-index: $z-modal;
    display: block;
    background: transparent;
}

@keyframes dropdown-slide {
    from {
        opacity: $opacity-faint;
        transform: translateY(-$size-3);
    }

    to {
        opacity: $opacity-full;
        transform: translateY(0);
    }
}

@keyframes slide-in {
    from {
        opacity: $opacity-faint;
        transform: translateX(-$size-6);
    }

    to {
        opacity: $opacity-full;
        transform: translateX(0);
    }
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-md}) {
    .meditation-timer-overlay {
        bottom: $size-31;
    }

    .timer-display {
        bottom: $size-38;
        font-size: $font-size-5xl;
    }

    .meditation-btn {
        bottom: $size-30;
        min-height: $size-25;
        padding: $space-3 $space-8;
        font-size: $font-size-lg;
    }

    .bell-settings-toolbar {
        right: $size-5;
        left: $size-5;
        border-radius: $border-radius-lg;
    }

    .bell-dropdown-btn {
        padding: $space-1 $space-2;
    }
}

@media (width > #{$breakpoint-xl}) {
    .meditation-timer-overlay {
        bottom: $size-26;
    }

    .timer-display {
        bottom: $size-32;
        font-size: $font-size-xl;
    }

    .meditation-btn {
        bottom: $size-17;
        min-height: auto;
        padding: $space-2 $space-6;
    }

    .bell-settings-toolbar {
        position: absolute;
        top: $size-17;
        right: auto;
        left: 50%;
        gap: $space-2;
        padding: $space-2;
        transform: translateX(-50%);
    }

    .bell-toggle-btn,
    .bell-dropdown-btn {
        min-width: auto;
        min-height: auto;
    }

    .bell-toggle-btn svg {
        width: $size-10;
        height: $size-10;
    }

    .bell-settings {
        gap: $space-2;
    }

    .bell-dropdown-btn {
        padding: $space-2 $space-3;
        font-size: $font-size-sm;
    }

    .bell-dropdown-menu {
        position: absolute;
        top: calc(100% + $size-3);
        left: 0;
        z-index: $z-modal-raised;
        width: auto;
        min-width: 100%;
        max-width: none;
        max-height: none;
        padding: $space-1;
        border-radius: $border-radius;
        box-shadow: $shadow-md;
        transform: none;
        overflow-y: visible;

        button {
            min-height: auto;
            margin-bottom: 0;
            padding: $space-2 $space-3;
            border-radius: $border-radius-sm;
        }
    }

    .dropdown-backdrop-inline {
        display: none;
    }
}

@media (height <= #{$breakpoint-short}) and (width <= #{$breakpoint-2xl}) {
    .timer-display {
        bottom: $size-28;
        font-size: $font-size-3xl;
    }

    .meditation-btn {
        bottom: $size-28;
        min-height: $size-21;
        padding: $space-2 $space-7;
        font-size: $font-size-base;
    }
}
</style>
