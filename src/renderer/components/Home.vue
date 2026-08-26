<script setup lang="ts">
import MeditationCalendar from '@/renderer/components/MeditationCalendar.vue';
import SessionNotes from '@/renderer/components/SessionNotes.vue';
import EmotionTracker from '@/renderer/components/EmotionTracker.vue';
import ZenPhilosophy from '@/renderer/components/ZenPhilosophy.vue';
import SettingsPopup from '@/renderer/components/SettingsPopup.vue';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import ZenWindAnimation from '@/renderer/components/animations/ZenWindAnimation.vue';
import ZenWavesAnimation from '@/renderer/components/animations/ZenWavesAnimation.vue';
import ZenBreatheAnimation from '@/renderer/components/animations/ZenBreatheAnimation.vue';
import ZenParticlesAnimation from '@/renderer/components/animations/ZenParticlesAnimation.vue';
import ZenLavaAnimation from '@/renderer/components/animations/ZenLavaAnimation.vue';
import MonkAuth from '@/renderer/components/MonkAuth.vue';
import BottomNav from '@/renderer/components/home/BottomNav.vue';
import MeditationOverlay from '@/renderer/components/home/MeditationOverlay.vue';
import { getMeditations, createMeditation, getCurrentUser, logout } from '@/renderer/store';
import { useI18n } from 'vue-i18n';
import { isDesktop } from '@/renderer/utils/platform';
import { useMeditationSession } from '@/renderer/composables/useMeditationSession';
import { log } from '@/renderer/utils/logger';
import type { User } from '@/renderer/store/types';

const emit = defineEmits<{
    'meditation-active': [active: boolean];
    'theme-changed': [theme: string];
    'language-changed': [language: string];
    'user-changed': [user: User | null];
    'theme-change': [theme: string];
    'language-change': [language: string];
}>();

const ANIMATIONS = [ZenWindAnimation, ZenWavesAnimation, ZenBreatheAnimation, ZenParticlesAnimation, ZenLavaAnimation];

const i18n = useI18n();
const { t } = i18n;

// ── Meditation session ────────────────────────────────────────────────────────
const {
    meditationActive,
    meditationSeconds,
    selectedDuration,
    isCustomDuration,
    customDurationValue,
    customInput,
    bellEnabled,
    bellInterval,
    bellSound,
    showBellConfig,
    showBreathingPicker,
    selectedBreathingExercise,
    breathingActive,
    breathingPhase,
    breathingPhaseText,
    breathingPhaseDuration,
    breathingCycleCount,
    breathingExercises,
    completedMeditationDuration,
    showNotes,
    meditationAnimationIdx,
    selectPresetDuration,
    enableCustomDuration,
    applyCustomDuration,
    cancelCustomDuration,
    selectBellSound,
    selectBellSoundFromDropdown,
    toggleBreathingDuringMeditation,
    startMeditation: startMeditationSession,
    stopMeditation,
    cleanup: cleanupMeditation,
    formatTime,
} = useMeditationSession();

const desktopApp = ref(false);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const phrases = computed<string[]>(() => i18n.tm('phrases') as string[]);

// Seeded by pickPhrase(), declared below — a hoisted function declaration, so
// it is already defined when this line runs.
const currentPhrase = ref(pickPhrase());
let phraseIntervalId: number | undefined;

const journalMode = ref(false);
const calendarMode = ref(false);
const philosophyMode = ref(false);
const settingsMode = ref(false);
const centerTextVisible = ref(true);
let centerTextTimeout: number | undefined;

const anySectionOpen = computed(
    () => journalMode.value || calendarMode.value || philosophyMode.value || settingsMode.value,
);

const meditations = ref<{ date: string | { $date: string }; username?: string; duration?: number; notes?: string }[]>(
    [],
);
const user = ref<User | null>(null);
const token = ref<string | null>(null);

/** Meditation dates arrive as ISO strings from IPC but as Date objects from the in-process adapter. */
function toDateString(value: Date | string): string {
    return typeof value === 'string' ? value : value.toISOString();
}

// Wrap to pass ANIMATIONS.length without exposing it to the template
function startMeditation(): void {
    startMeditationSession(ANIMATIONS.length);
}

function pickPhrase(): string {
    return phrases.value[Math.floor(Math.random() * phrases.value.length)];
}

function setRandomPhrase(): void {
    let next = pickPhrase();
    while (next === currentPhrase.value && phrases.value.length > 1) {
        next = pickPhrase();
    }
    currentPhrase.value = next;
}

function toggleJournalMode(): void {
    journalMode.value = !journalMode.value;
    if (journalMode.value) {
        calendarMode.value = false;
        philosophyMode.value = false;
        settingsMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
    }
}

function toggleCalendarMode(): void {
    calendarMode.value = !calendarMode.value;
    if (calendarMode.value) {
        journalMode.value = false;
        philosophyMode.value = false;
        settingsMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
        if (user.value !== null) void fetchMeditations();
    }
}

function togglePhilosophyMode(): void {
    philosophyMode.value = !philosophyMode.value;
    if (philosophyMode.value) {
        journalMode.value = false;
        calendarMode.value = false;
        settingsMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
    }
}

function toggleSettingsMode(): void {
    settingsMode.value = !settingsMode.value;
    if (settingsMode.value) {
        journalMode.value = false;
        calendarMode.value = false;
        philosophyMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
    }
}

function handleSettingsThemeChange(theme: string): void {
    emit('theme-change', theme);
}

function handleSettingsLanguageChange(language: string): void {
    emit('language-change', language);
}

async function fetchMeditations(): Promise<void> {
    try {
        const res = await getMeditations();
        meditations.value = res.meditations.map((meditation) => ({
            date: toDateString(meditation.date),
            username: meditation.username,
            duration: meditation.duration,
            notes: meditation.notes,
        }));
    } catch {
        meditations.value = [];
    }
}

async function fetchUserData(): Promise<void> {
    try {
        const res = await getCurrentUser();
        user.value = res.user;
        emit('theme-changed', res.user.theme);
        emit('language-changed', res.user.language);
    } catch {
        // Silently handle — user will be logged out if token is invalid
    }
}

async function saveSessionNotes(notes: string): Promise<void> {
    try {
        await createMeditation(new Date().toISOString(), Math.round(completedMeditationDuration.value / 60), notes);
        await fetchMeditations();
        await fetchUserData();
        showNotes.value = false;
    } catch {
        // Saving meditation failed — UI handles gracefully
    }
}

async function skipSessionNotes(): Promise<void> {
    try {
        await createMeditation(new Date().toISOString(), Math.round(completedMeditationDuration.value / 60), '');
        await fetchMeditations();
        await fetchUserData();
        showNotes.value = false;
    } catch {
        // Saving meditation failed — UI handles gracefully
    }
}

async function handleAuth(evt: { user: User; token: string }): Promise<void> {
    user.value = evt.user;
    token.value = evt.token;
    emit('user-changed', evt.user);
    await fetchUserData();
    await fetchMeditations();
    emit('theme-changed', evt.user.theme);
    emit('language-changed', evt.user.language);
}

async function handleLogout(): Promise<void> {
    try {
        await logout();
        user.value = null;
        token.value = null;
        emit('user-changed', null);
    } catch (error) {
        log.error('Logout failed', error);
    }
}

watch(meditationActive, (val) => {
    emit('meditation-active', val);
});

watch(anySectionOpen, (open) => {
    if (centerTextTimeout !== undefined) {
        clearTimeout(centerTextTimeout);
        centerTextTimeout = undefined;
    }
    if (open) {
        centerTextVisible.value = false;
    } else {
        centerTextTimeout = window.setTimeout(() => {
            centerTextVisible.value = true;
        }, 1000);
    }
});

onMounted(async () => {
    desktopApp.value = isDesktop();
    phraseIntervalId = window.setInterval(setRandomPhrase, 10000);
    if (token.value !== null) {
        try {
            await fetchUserData();
            await fetchMeditations();
        } catch {
            token.value = null;
        }
    }
});

onUnmounted(() => {
    if (phraseIntervalId !== undefined) clearInterval(phraseIntervalId);
    if (centerTextTimeout !== undefined) clearTimeout(centerTextTimeout);
    cleanupMeditation();
});
</script>

<template>
    <div class="zen-bg">
        <MonkAuth
            v-if="!user"
            @auth="handleAuth" />
        <template v-else>
            <!-- Main app content below, only visible if authenticated -->

            <!-- Bottom Navigation Bar -->
            <BottomNav
                v-if="!meditationActive"
                :journal-mode="journalMode"
                :calendar-mode="calendarMode"
                :philosophy-mode="philosophyMode"
                :settings-mode="settingsMode"
                @toggle-journal="toggleJournalMode"
                @toggle-calendar="toggleCalendarMode"
                @toggle-philosophy="togglePhilosophyMode"
                @toggle-settings="toggleSettingsMode"
                @logout="handleLogout" />

            <SessionNotes
                v-if="showNotes"
                :duration="completedMeditationDuration"
                @save="saveSessionNotes"
                @skip="skipSessionNotes"
                @close="skipSessionNotes" />
            <!-- Breathing Exercise Picker (pre-meditation) -->
            <button
                v-if="showBreathingPicker && !meditationActive"
                type="button"
                class="zen-backdrop breathing-picker-backdrop"
                aria-label="Close breathing picker"
                @click="showBreathingPicker = false"></button>
            <div
                v-if="showBreathingPicker && !meditationActive"
                class="breathing-picker-panel">
                <div class="breathing-picker-header">
                    <h3 class="breathing-picker-title">{{ t('breathing.title') }}</h3>
                    <button
                        class="zen-icon-btn is-bare config-close-btn"
                        aria-label="Close breathing picker"
                        @click="showBreathingPicker = false">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round" />
                        </svg>
                    </button>
                </div>
                <div class="breathing-picker-options">
                    <button
                        class="breathing-option-btn"
                        :class="[{ active: !selectedBreathingExercise }]"
                        @click="
                            selectedBreathingExercise = null;
                            showBreathingPicker = false;
                        ">
                        {{ t('breathing.none') }}
                    </button>
                    <button
                        v-for="ex in breathingExercises"
                        :key="ex.id"
                        class="breathing-option-btn"
                        :class="[{ active: selectedBreathingExercise?.id === ex.id }]"
                        @click="
                            selectedBreathingExercise = ex;
                            showBreathingPicker = false;
                        ">
                        <div class="breathing-option-name">{{ ex.name }}</div>
                        <div class="breathing-option-desc">{{ ex.description }}</div>
                    </button>
                </div>
            </div>

            <div
                v-if="!meditationActive"
                class="zen-main"
                :class="[{ 'journal-active': journalMode || calendarMode || philosophyMode || settingsMode }]">
                <!-- Journal inline view -->
                <transition name="journal-fade">
                    <div
                        v-if="journalMode"
                        class="journal-inline-container"
                        :class="[{ 'has-header': desktopApp }]">
                        <EmotionTracker @close="journalMode = false" />
                    </div>
                </transition>

                <!-- Calendar inline view -->
                <transition name="journal-fade">
                    <div
                        v-if="calendarMode"
                        class="journal-inline-container"
                        :class="[{ 'has-header': desktopApp }]">
                        <MeditationCalendar
                            :meditations="meditations"
                            @close="calendarMode = false" />
                    </div>
                </transition>

                <!-- Philosophy inline view -->
                <transition name="journal-fade">
                    <div
                        v-if="philosophyMode"
                        class="journal-inline-container"
                        :class="[{ 'has-header': desktopApp }]">
                        <ZenPhilosophy @close="philosophyMode = false" />
                    </div>
                </transition>

                <!-- Settings inline view -->
                <transition name="journal-fade">
                    <div
                        v-if="settingsMode"
                        class="journal-inline-container"
                        :class="[{ 'has-header': desktopApp }]">
                        <SettingsPopup
                            @close="settingsMode = false"
                            @theme-change="handleSettingsThemeChange"
                            @language-change="handleSettingsLanguageChange" />
                    </div>
                </transition>

                <transition name="center-fade">
                    <div
                        v-if="centerTextVisible && !anySectionOpen"
                        class="zen-center">
                        <span
                            class="zen-phrase"
                            :class="[{ dimmed: showBellConfig }]"
                            >{{ currentPhrase }}</span
                        >
                        <span
                            class="zen-loader"
                            :class="[{ dimmed: showBellConfig }]">
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 32 32">
                                <rect
                                    x="10"
                                    y="15"
                                    width="12"
                                    height="2"
                                    rx="1"
                                    fill="#F0F8FF">
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 16 16"
                                        to="360 16 16"
                                        dur="2.5s"
                                        repeatCount="indefinite" />
                                </rect>
                            </svg>
                        </span>
                    </div>
                </transition>

                <div
                    v-if="!meditationActive && !anySectionOpen"
                    class="meditation-control-bar">
                    <button
                        v-for="duration in [5, 10, 15, 30]"
                        :key="duration"
                        class="duration-btn"
                        :class="[{ active: selectedDuration === duration && !isCustomDuration }]"
                        :aria-label="`Set meditation duration to ${duration} minutes`"
                        @click="selectPresetDuration(duration)">
                        {{ duration }}
                    </button>
                    <button
                        v-if="!isCustomDuration"
                        class="duration-btn custom-btn"
                        :aria-label="'Set custom meditation duration'"
                        @click="enableCustomDuration">
                        ⋯
                    </button>
                    <div
                        v-else
                        class="custom-duration-input">
                        <input
                            ref="customInput"
                            v-model.number="customDurationValue"
                            type="number"
                            min="1"
                            max="180"
                            placeholder="min"
                            aria-label="Enter custom duration in minutes"
                            @blur="applyCustomDuration"
                            @keyup.enter="applyCustomDuration"
                            @keyup.esc="cancelCustomDuration" />
                        <button
                            class="custom-ok-btn"
                            aria-label="Confirm custom duration"
                            @click="applyCustomDuration">
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M2 6h8M6 2l4 4-4 4"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round" />
                            </svg>
                        </button>
                    </div>
                    <button
                        class="duration-btn bell-config-btn"
                        :class="[{ active: bellEnabled }]"
                        :aria-label="'Configure bell settings'"
                        @click="showBellConfig = !showBellConfig">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M12 2C10.9 2 10 2.9 10 4C10 4.6 10.2 5.1 10.6 5.5C8 6.1 6 8.3 6 11V16L4 18V19H20V18L18 16V11C18 8.3 16 6.1 13.4 5.5C13.8 5.1 14 4.6 14 4C14 2.9 13.1 2 12 2ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                    </button>
                    <button
                        class="duration-btn breathing-config-btn"
                        :class="[{ active: !!selectedBreathingExercise }]"
                        :aria-label="'Configure breathing exercise'"
                        @click="showBreathingPicker = !showBreathingPicker">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <circle
                                cx="12"
                                cy="12"
                                r="9"
                                stroke="currentColor"
                                stroke-width="1.5" />
                            <circle
                                cx="12"
                                cy="12"
                                r="4"
                                stroke="currentColor"
                                stroke-width="1.5"
                                opacity="0.5" />
                        </svg>
                    </button>
                    <button
                        class="start-meditation-btn"
                        :aria-label="`Start a ${selectedDuration}-minute meditation session`"
                        @click="startMeditation">
                        {{ t('meditation.begin') }}
                    </button>
                </div>

                <!-- Bell Configuration Panel -->
                <button
                    v-if="showBellConfig && !meditationActive"
                    type="button"
                    class="zen-backdrop breathing-picker-backdrop"
                    aria-label="Close bell settings"
                    @click="showBellConfig = false"></button>
                <div
                    v-if="showBellConfig && !meditationActive"
                    class="breathing-picker-panel bell-picker-panel">
                    <div class="breathing-picker-header">
                        <h3 class="breathing-picker-title">{{ t('meditation.bell.settings') }}</h3>
                        <button
                            class="zen-icon-btn is-bare config-close-btn"
                            aria-label="Close bell settings"
                            @click="showBellConfig = false">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M18 6L6 18M6 6l12 12"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                    <div class="breathing-picker-options">
                        <button
                            class="breathing-option-btn"
                            :class="[{ active: !bellEnabled }]"
                            @click="
                                bellEnabled = false;
                                showBellConfig = false;
                            ">
                            {{ t('breathing.none') }}
                        </button>
                        <button
                            v-for="interval in [5, 10, 15, 20]"
                            :key="interval"
                            class="breathing-option-btn"
                            :class="[{ active: bellEnabled && bellInterval === interval }]"
                            @click="
                                bellEnabled = true;
                                bellInterval = interval;
                                showBellConfig = false;
                            ">
                            <div class="breathing-option-name">{{
                                t('meditation.bell.every', { minutes: interval })
                            }}</div>
                        </button>
                    </div>
                    <div
                        v-if="bellEnabled"
                        class="bell-sound-section">
                        <div class="bell-sound-section-title">{{ t('meditation.bell.sound') }}</div>
                        <div class="bell-sound-options-inline">
                            <button
                                v-for="sound in ['1', '2', '3', '4']"
                                :key="sound"
                                class="breathing-option-btn bell-sound-inline-btn"
                                :class="[{ active: bellSound === sound }]"
                                @click="selectBellSound(sound)">
                                {{ t('meditation.bell.option', { number: sound }) }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <MeditationOverlay
                v-if="meditationActive"
                :animation-component="ANIMATIONS[meditationAnimationIdx]"
                :bell-enabled="bellEnabled"
                :bell-interval="bellInterval"
                :bell-sound="bellSound"
                :selected-breathing-exercise="selectedBreathingExercise"
                :breathing-active="breathingActive"
                :breathing-phase="breathingPhase"
                :breathing-phase-text="breathingPhaseText"
                :breathing-phase-duration="breathingPhaseDuration"
                :breathing-cycle-count="breathingCycleCount"
                :meditation-seconds="meditationSeconds"
                :format-time="formatTime"
                @stop="stopMeditation"
                @update:bell-enabled="bellEnabled = $event"
                @update:bell-interval="bellInterval = $event"
                @select-bell-sound="selectBellSoundFromDropdown($event)"
                @toggle-breathing="toggleBreathingDuringMeditation" />
        </template>
    </div>
</template>

<style scoped lang="scss">
.logo {
    width: $size-24;
    margin-bottom: $space-7;
    color: $text1;
}

.zen-bg {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    background: color-mix(in srgb, $base1 70%, $base2 30%);
}

.zen-main {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    padding: 0 $space-7;
    overflow: hidden;

    &.journal-active {
        background: color-mix(in srgb, $base2 50%, $base1 50%);
        border-radius: 0;
        transition: background $transition-gentle;
    }
}

.goals-horizontal {
    max-width: $size-49;
    margin: 0 auto;
    padding: $space-4 $space-7;
}

/* ––––– Centre text ––––– */

.zen-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0 $space-4;
}

.zen-date {
    color: $text1;
    font-size: $font-size-lg;
}

.zen-greeting {
    color: $text2;
    font-size: $font-size-lg;
}

.zen-phrase {
    display: none;
    max-width: 90vw;
    color: $text1;
    text-align: center;
    overflow-wrap: break-word;
    cursor: default;
    transition: opacity $duration-mellow $ease-standard;

    &.dimmed {
        opacity: $opacity-subtle;
        pointer-events: none;
    }
}

.zen-loader {
    display: none;
    align-items: center;
    justify-content: center;
    transition: opacity $duration-mellow $ease-standard;

    &.dimmed {
        opacity: $opacity-faint;
        pointer-events: none;
    }
}

.center-fade-enter-active {
    animation: center-fade-in $duration-entrance $ease-standard both;
}

.center-fade-leave-active {
    display: none;
}

@keyframes center-fade-in {
    0% {
        opacity: $opacity-faint;
        transform: translateY($size-6) scale($scale-97);
        filter: blur($blur-sm);
    }

    60% {
        filter: blur(0);
    }

    100% {
        opacity: $opacity-full;
        transform: translateY(0) scale($scale-100);
        filter: blur(0);
    }
}

/* ––––– Meditation control bar ––––– */

.meditation-control-bar {
    position: absolute;
    bottom: $size-29;
    left: 50%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: $space-2;
    width: calc(100% - $size-23);
    padding: $space-2;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
    transform: translateX(-50%);
}

.duration-btn {
    min-width: $size-23;
    min-height: $size-21;
    padding: $space-2;
    background: transparent;
    border: none;
    border-radius: $border-radius-sm;
    color: $text2;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
    cursor: pointer;
    touch-action: manipulation;
    transition:
        color $duration-slow $ease-standard,
        background $duration-slow $ease-standard,
        transform $duration-base $ease-standard,
        box-shadow $duration-slow $ease-standard;

    &:hover {
        background: $input-bg-focus;
        color: $text1;
    }

    &:active {
        transform: translateY(0) scale($scale-96);
        transition-duration: $duration-instant;
    }

    &.active {
        background: $button-bg;
        box-shadow: $shadow-glow-sm;
        color: $text1;
    }

    &.custom-btn {
        font-size: $font-size-base;
        font-weight: $font-weight-bold;
        line-height: $line-height-none;
    }
}

.custom-duration-input {
    display: flex;
    align-items: center;
    gap: $space-0;

    input {
        padding: $space-2;
        background: transparent;
        border: none;
        border-radius: $border-radius-sm;
        color: $text1;
        font-size: $font-size-xs;
        text-align: center;

        /** A number field whose spinners would overflow this narrow bar. */
        appearance: textfield;

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
            margin: 0;
            appearance: none;
        }

        &:focus {
            background: $input-bg-focus;
            outline: none;
        }
    }
}

.custom-ok-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: $size-16;
    height: $size-16;
    padding: $space-2;
    background: transparent;
    border: none;
    border-radius: $border-radius-sm;
    color: $text2;
    line-height: $line-height-none;
    cursor: pointer;
    transition:
        color $transition-fast,
        background $transition-fast;

    &:hover {
        background: $input-bg-focus;
        color: $text1;
    }
}

.start-meditation-btn {
    flex: 1 1 100%;
    min-height: $size-23;
    margin-top: $space-2;
    margin-left: 0;
    padding: $space-3 $space-4;
    background: $button-bg;
    border: none;
    border-top: $border-width-thin $input-border;
    border-radius: $border-radius-sm;
    color: $text1;
    font-size: $font-size-sm;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
    cursor: pointer;
    transition:
        background $duration-slow $ease-standard,
        transform $duration-base $ease-standard,
        box-shadow $duration-slow $ease-standard;

    &:hover {
        background: $button-bg-hover;
        box-shadow: $shadow-sm;
    }

    &:active {
        transform: scale($scale-97);
        transition-duration: $duration-instant;
    }
}

/* ––––– Journal / panel mode ––––– */

.journal-inline-container {
    @include scrollbar;

    position: relative;
    z-index: $z-normal;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: env(safe-area-inset-top, $space-4) $space-4 $space-13;
    overflow-y: auto;

    &.has-header {
        padding-top: calc($space-8 + $space-4);
    }
}

.journal-fade-enter-active {
    animation: journal-enter $duration-soft $ease-standard both;
    animation-delay: $duration-immediate;
}

.journal-fade-leave-active {
    position: absolute;
    inset: 0;
    z-index: 0;
    animation: journal-leave $duration-relaxed $ease-standard forwards;
    pointer-events: none;
}

@keyframes journal-enter {
    from {
        opacity: $opacity-faint;
        transform: translateY($size-6);
        filter: blur($blur-xs);
    }

    to {
        opacity: $opacity-full;
        transform: translateY(0);
        filter: blur(0);
    }
}

@keyframes journal-leave {
    from {
        opacity: $opacity-full;
    }

    to {
        opacity: $opacity-faint;
    }
}

/* ––––– Breathing picker ––––– */

.breathing-picker-backdrop {
    position: fixed;
    z-index: $z-modal;
    background: color-mix(in srgb, $scrim 30%, transparent);
    animation: fade-in $duration-slow $ease-standard;
}

.breathing-picker-panel {
    @include scrollbar;

    position: fixed;
    top: 50%;
    left: 50%;
    z-index: $z-modal-raised;
    width: calc(100% - $size-17);
    max-width: $size-45;
    max-height: 80vh;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-xl;
    box-shadow: $shadow-lg;
    transform: translate(-50%, -50%);
    overflow-y: auto;
    animation: popup-fade-in $duration-slower $ease-standard;
}

@keyframes popup-fade-in {
    from {
        opacity: $opacity-faint;
        transform: translate(-50%, -48%) scale($scale-96);
        filter: blur($blur-xs);
    }

    to {
        opacity: $opacity-full;
        transform: translate(-50%, -50%) scale($scale-100);
        filter: blur(0);
    }
}

.breathing-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-2 $space-3;
    border-bottom: $border-width-thin $input-border;
}

.breathing-picker-title {
    margin: 0;
    color: $text1;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
}

.breathing-picker-options {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    padding: $space-2;
}

.breathing-option-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: $space-2 $space-3;
    background: transparent;
    border: $border-width-thin transparent;
    border-radius: $border-radius-sm;
    color: $text2;
    text-align: left;
    cursor: pointer;
    transition:
        color $duration-slow $ease-standard,
        background $duration-slow $ease-standard,
        border-color $duration-slow $ease-standard,
        transform $duration-base $ease-standard;

    &:hover {
        background: $input-bg-focus;
        color: $text1;
        transform: translateX($size-1);
    }

    &:active {
        transform: translateX($size-1) scale($scale-98);
        transition-duration: $duration-instant;
    }

    &.active {
        background: $input-bg-focus;
        border-color: $input-border-focus;
        color: $text1;
    }
}

.breathing-option-name {
    color: inherit;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
}

.breathing-option-desc {
    margin-top: $space-0;
    color: $text2;
    font-size: $font-size-xxs;
    line-height: $line-height-tight;
}

/* ––––– Bell config ––––– */

.bell-config-btn {
    display: flex;
    align-items: center;
    justify-content: center;
}

.bell-sound-section {
    padding: $space-1 $space-2 $space-2;
    border-top: $border-width-thin $input-border;
}

.bell-sound-section-title {
    padding: $space-1 $space-1 $space-0;
    color: $text2;
    font-size: $font-size-xs;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
}

.bell-sound-options-inline {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $space-1;
}

.bell-sound-inline-btn {
    align-items: center;
    justify-content: center;
    padding: $space-2;
    text-align: center;
}

/** Sizing only — `.zen-icon-btn.is-bare` carries the interaction states. */
.config-close-btn {
    width: auto;
    height: auto;
    min-width: $size-20;
    min-height: $size-20;
    padding: $space-2;
    border-radius: $border-radius-lg;
}

/* –––––– Responsive –––––– */

@media (width > #{$breakpoint-xs}) {
    .duration-btn {
        min-width: $size-24;
        padding: $space-2 $space-3;
        font-size: $font-size-sm;
    }
}

@media (width > #{$breakpoint-md}) {
    .meditation-control-bar {
        bottom: $size-30;
        width: calc(100% - $size-17);
        padding: $space-3;
    }

    .duration-btn {
        min-width: $size-27;
        padding: $space-3 $space-4;
    }

    .start-meditation-btn {
        padding: $space-3 $space-5;
        font-size: $font-size-base;
    }
}

@media (width > #{$breakpoint-xl}) {
    .zen-center {
        width: auto;
        padding: 0;
    }

    .zen-phrase {
        display: block;
    }

    .zen-loader {
        display: flex;
    }

    .meditation-control-bar {
        flex-wrap: nowrap;
        gap: $space-0;
        width: auto;
        padding: $space-1;
    }

    .duration-btn {
        min-width: $size-20;
        min-height: auto;
        padding: $space-2;
        font-size: $font-size-xs;
    }

    .start-meditation-btn {
        flex: 0 1 auto;
        min-height: auto;
        margin-top: 0;
        margin-left: $space-1;
        padding: $space-2 $space-4;
        border-top: none;
        border-left: $border-width-thin $input-border;
        border-radius: 0 $border-radius-sm $border-radius-sm 0;
        font-size: $font-size-xs;
    }

    .journal-inline-container {
        padding: $space-7 $space-7 $space-12;

        &.has-header {
            padding-top: calc($space-8 + $space-6);
        }
    }

    .breathing-picker-panel {
        width: $size-44;
        max-width: 90vw;
    }

    .config-close-btn {
        min-width: auto;
        min-height: auto;
        padding: $space-1;
        border-radius: $border-radius;
    }
}

@media (height <= #{$breakpoint-short}) and (width <= #{$breakpoint-2xl}) {
    .zen-phrase {
        margin-top: $space-11;
        font-size: $font-size-base;
        line-height: $line-height-snug;
    }

    .meditation-control-bar {
        bottom: $size-28;
        gap: $space-2;
        padding: $space-2;
    }

    .duration-btn {
        min-width: $size-24;
        min-height: $size-20;
        padding: $space-2 $space-3;
        font-size: $font-size-xs;
    }

    .start-meditation-btn {
        flex: 0 0 auto;
        min-height: $size-20;
        margin-top: 0;
        padding: $space-2 $space-4;
        font-size: $font-size-sm;
    }
}
</style>
