<script setup lang="ts">
import { ref, type Component } from 'vue';
import { useI18n } from 'vue-i18n';

type BreathingExercise = {
    name: string;
};

defineProps<{
    animationComponent: Component;
    bellEnabled: boolean;
    bellInterval: number;
    bellSound: string;
    selectedBreathingExercise: BreathingExercise | null;
    breathingActive: boolean;
    breathingPhase: string;
    breathingPhaseText: string;
    breathingPhaseDuration: number;
    breathingCycleCount: number;
    meditationSeconds: number;
    formatTime: (seconds: number) => string;
}>();

const emit = defineEmits<{
    'stop': [];
    'update:bellEnabled': [value: boolean];
    'update:bellInterval': [value: number];
    'select-bell-sound': [sound: string];
    'toggle-breathing': [];
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
                        class="dropdown-backdrop-inline"
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
                        class="dropdown-backdrop-inline"
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

            <!-- Breathing toggle -->
            <div
                v-if="selectedBreathingExercise"
                class="toolbar-divider"></div>
            <button
                v-if="selectedBreathingExercise"
                class="breathing-toggle-btn"
                :class="[{ active: breathingActive }]"
                :aria-label="breathingActive ? 'Stop breathing guide' : 'Start breathing guide'"
                @click="emit('toggle-breathing')">
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        stroke-width="2" />
                    <circle
                        cx="12"
                        cy="12"
                        r="4"
                        stroke="currentColor"
                        stroke-width="2"
                        opacity="0.5" />
                </svg>
            </button>
        </div>

        <!-- Breathing Sphere Overlay -->
        <div
            v-if="breathingActive && selectedBreathingExercise"
            class="breathing-overlay">
            <div
                class="breathing-sphere"
                :class="{
                    'breathing-in': breathingPhase === 'in',
                    'breathing-hold': breathingPhase === 'hold',
                    'breathing-out': breathingPhase === 'out',
                    'breathing-hold-out': breathingPhase === 'holdOut',
                }"
                :style="{ animationDuration: `${breathingPhaseDuration}s` }">
                <span class="breathing-sphere-text">{{ breathingPhaseText }}</span>
            </div>
            <div class="breathing-info">
                <span class="breathing-exercise-name">{{ selectedBreathingExercise.name }}</span>
                <span class="breathing-cycle">{{ t('breathing.cycle') }} {{ breathingCycleCount }}</span>
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
    position: fixed;
    inset: 0;
    background: $base1;
    z-index: $z-modal-backdrop;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

/* –––––– Timer & Stop –––––– */

.meditation-timer {
    margin-top: $space-8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-7;
}

.meditation-timer-overlay {
    position: absolute;
    bottom: $size-26;
    left: 0;
    width: 100vw;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: $z-popover;
}

.timer-display {
    font-size: $font-size-xl;
    color: $text1;
    position: absolute;
    bottom: $size-32;
}

.meditation-btn {
    background: transparent;
    position: absolute;
    bottom: $size-17;
    color: $text1;
    cursor: pointer;
    transition:
        background $duration-slower $ease-standard,
        color $duration-slower $ease-standard,
        box-shadow $duration-slower $ease-standard,
        transform $duration-base $ease-standard;
    border: none;
    outline: none;
    padding: $space-2 $space-6;
    border-radius: $border-radius-round;
    font-size: $font-size-lg;
    letter-spacing: $letter-spacing-1;
}

.meditation-btn:hover,
.meditation-btn:focus {
    background: $blur1;
    color: $text2;
    box-shadow: $shadow-edge;
    transform: translateY(-$size-0);
}

.meditation-btn:active {
    transform: translateY(0) scale($scale-97);
    transition-duration: $duration-instant;
}

/* –––––– Bell Toolbar –––––– */

.bell-settings-toolbar {
    position: absolute;
    top: $size-17;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2;
    background: $blur2;
    backdrop-filter: blur($blur-base);
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    z-index: $z-modal;
}

.bell-toggle-btn {
    padding: $space-2;
    background: transparent;
    border: none;
    color: $text2;
    cursor: pointer;
    border-radius: $border-radius;
    transition: all $transition-base;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bell-toggle-btn:hover {
    background: $input-bg-focus;
    color: $text1;
}

.bell-toggle-btn.active {
    background: $button-bg;
    color: $text1;
}

.bell-settings {
    display: flex;
    gap: $space-2;
    animation: slide-in $duration-base ease;
}

.bell-dropdown {
    position: relative;
}

.bell-dropdown-btn {
    padding: $space-2 $space-3;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    color: $text1;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all $transition-base;
    display: flex;
    align-items: center;
    gap: $space-2;
    white-space: nowrap;
}

.bell-dropdown-btn:hover {
    background: $input-bg-focus;
    border-color: $input-border-focus;
}

.dropdown-arrow {
    font-size: $font-size-xs;
    opacity: $opacity-mid-high;
}

.bell-dropdown-menu {
    position: absolute;
    top: calc(100% + $size-3);
    left: 0;
    min-width: 100%;
    background: $blur2;
    backdrop-filter: blur($blur-md);
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    padding: $space-1;
    box-shadow: $shadow-md;
    z-index: $z-modal-raised;
    animation: dropdown-slide $duration-fast ease;
}

.bell-dropdown-menu button {
    width: 100%;
    padding: $space-2 $space-3;
    background: transparent;
    border: none;
    border-radius: $border-radius-sm;
    color: $text1;
    font-size: $font-size-sm;
    cursor: pointer;
    text-align: left;
    transition: all $transition-fast;
    white-space: nowrap;
}

.bell-dropdown-menu button:hover {
    background: $input-bg-focus;
}

.dropdown-backdrop-inline {
    display: none;
    padding: 0;
    border: none;
}

.toolbar-divider {
    width: $size-0;
    height: $size-12;
    background: $input-border;
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

/* –––––– Breathing Overlay –––––– */

.breathing-toggle-btn {
    background: transparent;
    border: none;
    color: $text2;
    cursor: pointer;
    padding: $space-1;
    border-radius: $border-radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-base;
    opacity: $opacity-mid;
}

.breathing-toggle-btn:hover {
    color: $text1;
    opacity: $opacity-full;
}

.breathing-toggle-btn.active {
    color: $text1;
    opacity: $opacity-full;
    background: color-mix(in srgb, $glass 10%, transparent);
}

.breathing-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-6;
    z-index: $z-popover;
    pointer-events: none;
}

.breathing-sphere {
    width: $size-37;
    height: $size-37;
    border-radius: $border-radius-round;
    background: radial-gradient(
        circle at 40% 35%,
        color-mix(in srgb, $glass 15%, transparent),
        color-mix(in srgb, $glass 3%, transparent)
    );
    border: $border-width-thin color-mix(in srgb, $glass 15%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur($blur-base);
    box-shadow: $shadow-sphere;
    transition: transform $transition-slow;
}

.breathing-sphere.breathing-in {
    animation: sphere-breath-in ease-in-out forwards;
}

.breathing-sphere.breathing-hold {
    transform: scale($scale-160);
}

.breathing-sphere.breathing-out {
    animation: sphere-breath-out ease-in-out forwards;
}

.breathing-sphere.breathing-hold-out {
    transform: scale($scale-100);
}

@keyframes sphere-breath-in {
    from {
        transform: scale($scale-100);
        opacity: $opacity-mid;
    }

    to {
        transform: scale($scale-160);
        opacity: $opacity-full;
    }
}

@keyframes sphere-breath-out {
    from {
        transform: scale($scale-160);
        opacity: $opacity-full;
    }

    to {
        transform: scale($scale-100);
        opacity: $opacity-mid;
    }
}

.breathing-sphere-text {
    font-size: $font-size-xs;
    color: $text1;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-6;
    text-align: center;
    opacity: $opacity-almost-opaque;
}

.breathing-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-1;
}

.breathing-exercise-name {
    font-size: $font-size-xs;
    color: $text2;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
    opacity: $opacity-mid-high;
}

.breathing-cycle {
    font-size: $font-size-xxs;
    color: $text2;
    opacity: $opacity-mid-low;
}

@media (width <= #{$breakpoint-xl}) {
    .breathing-sphere {
        width: $size-34;
        height: $size-34;
    }

    .breathing-sphere-text {
        font-size: $font-size-xs;
    }

    .timer-display {
        font-size: $font-size-5xl;
        bottom: $size-38;
    }

    .meditation-btn {
        bottom: $size-30;
        font-size: $font-size-lg;
        padding: $space-3 $space-8;
        min-height: $size-25;
        touch-action: manipulation;
    }

    .meditation-timer-overlay {
        bottom: $size-31;
    }

    .dropdown-backdrop-inline {
        display: block;
        position: fixed;
        inset: 0;
        background: transparent;
        z-index: $z-modal;
    }

    .bell-dropdown-menu {
        position: fixed;
        top: $size-29;
        left: 50%;
        transform: translateX(-50%);
        width: 90vw;
        max-width: $size-43;
        min-width: $size-40;
        border-radius: $border-radius-xl;
        padding: $space-4 $space-3;
        max-height: 60vh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        z-index: $z-modal-top;
        box-shadow: $shadow-lg-strong;
    }

    .bell-dropdown-menu button {
        padding: $space-3;
        font-size: $font-size-sm;
        min-height: $size-23;
        border-radius: $border-radius-lg;
        margin-bottom: $space-2;
    }

    .bell-dropdown-menu button:last-child {
        margin-bottom: 0;
    }

    .bell-settings-toolbar {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + $size-23);
        left: $size-5;
        right: $size-5;
        width: calc(100% - $size-10);
        max-width: calc(100% - $size-10);
        padding: $space-1 $space-2;
        transform: none;
        flex-wrap: nowrap;
        gap: $space-1;
        border-radius: $border-radius-lg;
        box-sizing: border-box;
        backdrop-filter: blur($blur-md);
        justify-content: center;
    }

    .bell-toggle-btn {
        min-width: $size-19;
        min-height: $size-19;
        padding: $space-2;
        box-sizing: border-box;
    }

    .bell-toggle-btn svg {
        width: $size-9;
        height: $size-9;
    }

    .bell-dropdown-btn {
        min-height: $size-19;
        padding: $space-1 $space-2;
        font-size: $font-size-xs;
        box-sizing: border-box;
        min-width: $size-23;
    }

    .bell-settings {
        gap: $space-1;
        flex-wrap: nowrap;
        box-sizing: border-box;
        display: flex;
    }

    .bell-dropdown {
        flex-shrink: 1;
    }

    .toolbar-divider {
        height: $size-12;
    }
}

@media (width <= #{$breakpoint-md}) {
    .timer-display {
        font-size: $font-size-4xl;
        bottom: $size-35;
    }

    .meditation-btn {
        bottom: $size-29;
        font-size: $font-size-base;
        padding: $space-3 $space-7;
        min-height: $size-24;
    }

    .meditation-timer-overlay {
        bottom: $size-30;
    }

    .bell-settings-toolbar {
        position: fixed;
        padding: $space-1 $space-2;
        gap: $space-1;
        left: $size-4;
        right: $size-4;
        top: calc(env(safe-area-inset-top, 0px) + $size-23);
        width: calc(100% - $size-8);
        max-width: calc(100% - $size-8);
        border-radius: $border-radius;
    }

    .bell-toggle-btn {
        min-width: $size-19;
        min-height: $size-19;
        padding: $space-2;
    }

    .bell-dropdown-btn {
        min-height: $size-19;
        padding: $space-2 $space-2;
        font-size: $font-size-xs;
    }

    .bell-settings {
        gap: $space-1;
    }

    .toolbar-divider {
        height: $size-11;
    }
}

@media (height <= #{$breakpoint-short}) and (width <= #{$breakpoint-2xl}) {
    .timer-display {
        font-size: $font-size-3xl;
        bottom: $size-28;
    }

    .meditation-btn {
        bottom: $size-28;
        font-size: $font-size-base;
        padding: $space-2 $space-7;
        min-height: $size-21;
    }
}

@media (width <= #{$breakpoint-xs}) {
    .meditation-btn {
        font-size: $font-size-base;
        padding: $space-3 $space-7;
        min-height: $size-23;
    }
}
</style>
