// Home — main dashboard coordinating meditation sessions, panel navigation, and auth gating. // Owns: panel toggle
state, meditation lifecycle, user login/logout, zen phrases, bottom nav. // Does NOT own: auth UI (MonkAuth), settings
(SettingsPopup), calendar, emotions, animations.
<script setup lang="ts">
import MeditationCalendar from './MeditationCalendar.vue';
import SessionNotes from './SessionNotes.vue';
import EmotionTracker from './EmotionTracker.vue';
import ZenPhilosophy from './ZenPhilosophy.vue';
import SettingsPopup from './SettingsPopup.vue';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import ZenWindAnimation from './animations/ZenWindAnimation.vue';
import ZenWavesAnimation from './animations/ZenWavesAnimation.vue';
import ZenBreatheAnimation from './animations/ZenBreatheAnimation.vue';
import ZenParticlesAnimation from './animations/ZenParticlesAnimation.vue';
import ZenLavaAnimation from './animations/ZenLavaAnimation.vue';
import MonkAuth from './MonkAuth.vue';
import BottomNav from './home/BottomNav.vue';
import MeditationOverlay from './home/MeditationOverlay.vue';
import { getMeditations, createMeditation, getCurrentUser, logout } from '../store';
import { useI18n } from 'vue-i18n';
import { isDesktop } from '../utils/platform';
import { useMeditationSession } from '../composables/useMeditationSession';

const { t, tm } = useI18n();

const ANIMATIONS = [ZenWindAnimation, ZenWavesAnimation, ZenBreatheAnimation, ZenParticlesAnimation, ZenLavaAnimation];

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

// Wrap to pass ANIMATIONS.length without exposing it to the template
function startMeditation() {
    startMeditationSession(ANIMATIONS.length);
}

const emit = defineEmits([
    'meditation-active',
    'theme-changed',
    'language-changed',
    'user-changed',
    'theme-change',
    'language-change',
]);

const desktopApp = ref(false);

watch(meditationActive, (val) => {
    emit('meditation-active', val);
});

// ── Phrases ───────────────────────────────────────────────────────────────────
const phrases = computed(() => tm('phrases') as string[]);
const currentPhrase = ref(phrases.value[Math.floor(Math.random() * phrases.value.length)]);
let phraseIntervalId: number | undefined;

function setRandomPhrase() {
    let next;
    do {
        next = phrases.value[Math.floor(Math.random() * phrases.value.length)];
    } while (next === currentPhrase.value && phrases.value.length > 1);
    currentPhrase.value = next;
}

// ── Panel state ───────────────────────────────────────────────────────────────
const journalMode = ref(false);
const calendarMode = ref(false);
const philosophyMode = ref(false);
const settingsMode = ref(false);
const centerTextVisible = ref(true);
let centerTextTimeout: number | undefined;

const anySectionOpen = computed(
    () => journalMode.value || calendarMode.value || philosophyMode.value || settingsMode.value,
);

watch(anySectionOpen, (open) => {
    if (centerTextTimeout) {
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

function toggleJournalMode() {
    journalMode.value = !journalMode.value;
    if (journalMode.value) {
        calendarMode.value = false;
        philosophyMode.value = false;
        settingsMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
    }
}

function toggleCalendarMode() {
    calendarMode.value = !calendarMode.value;
    if (calendarMode.value) {
        journalMode.value = false;
        philosophyMode.value = false;
        settingsMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
        if (user.value) fetchMeditations();
    }
}

function togglePhilosophyMode() {
    philosophyMode.value = !philosophyMode.value;
    if (philosophyMode.value) {
        journalMode.value = false;
        calendarMode.value = false;
        settingsMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
    }
}

function toggleSettingsMode() {
    settingsMode.value = !settingsMode.value;
    if (settingsMode.value) {
        journalMode.value = false;
        calendarMode.value = false;
        philosophyMode.value = false;
        showBellConfig.value = false;
        showBreathingPicker.value = false;
    }
}

function handleSettingsThemeChange(theme: string) {
    emit('theme-change', theme);
}

function handleSettingsLanguageChange(language: string) {
    emit('language-change', language);
}

// ── Data ──────────────────────────────────────────────────────────────────────
const meditations = ref<
    Array<{ Date: string | { $date: string }; Username?: string; duration?: number; notes?: string }>
>([]);
const user = ref<{ username: string; theme?: string; stats?: unknown; goals?: unknown } | null>(null);
const token = ref<string | null>(null);

async function fetchMeditations() {
    try {
        const res = await getMeditations();
        meditations.value = (res.meditations || []).map((m) => ({
            Date: typeof m.Date === 'string' ? m.Date : m.Date instanceof Date ? m.Date.toISOString() : m.Date,
            Username: m.Username,
            duration: m.duration,
            notes: m.notes,
        }));
    } catch {
        meditations.value = [];
    }
}

async function fetchUserData() {
    try {
        const res = await getCurrentUser();
        user.value = res.user;
        emit('theme-changed', res.user.theme);
        if (res.user.language) {
            emit('language-changed', res.user.language);
        }
    } catch {
        // Silently handle — user will be logged out if token is invalid
    }
}

async function saveSessionNotes(notes: string) {
    try {
        await createMeditation(new Date().toISOString(), Math.round(completedMeditationDuration.value / 60), notes);
        await fetchMeditations();
        await fetchUserData();
        showNotes.value = false;
    } catch {
        // Saving meditation failed — UI handles gracefully
    }
}

async function skipSessionNotes() {
    try {
        await createMeditation(new Date().toISOString(), Math.round(completedMeditationDuration.value / 60), '');
        await fetchMeditations();
        await fetchUserData();
        showNotes.value = false;
    } catch {
        // Saving meditation failed — UI handles gracefully
    }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function handleAuth(evt: {
    user: { username: string; theme?: string; language?: string; stats?: unknown; goals?: unknown };
    token: string;
}) {
    user.value = evt.user;
    token.value = evt.token;
    emit('user-changed', evt.user);
    await fetchUserData();
    await fetchMeditations();
    if (evt.user?.theme) emit('theme-changed', evt.user.theme);
    if (evt.user?.language) emit('language-changed', evt.user.language);
}

async function handleLogout() {
    try {
        await logout();
        user.value = null;
        token.value = null;
        emit('user-changed', null);
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
    desktopApp.value = isDesktop();
    phraseIntervalId = window.setInterval(setRandomPhrase, 10000);
    if (token.value) {
        try {
            await fetchUserData();
            await fetchMeditations();
        } catch {
            token.value = null;
        }
    }
});

onUnmounted(() => {
    if (phraseIntervalId) clearInterval(phraseIntervalId);
    if (centerTextTimeout) clearTimeout(centerTextTimeout);
    cleanupMeditation();
});
</script>

<template>
    <div class="zen-bg">
        <MonkAuth v-if="!user" @auth="handleAuth" />
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
                @logout="handleLogout"
            />

            <SessionNotes
                v-if="showNotes"
                :duration="completedMeditationDuration"
                @save="saveSessionNotes"
                @skip="skipSessionNotes"
                @close="skipSessionNotes"
            />
            <!-- Breathing Exercise Picker (pre-meditation) -->
            <div
                v-if="showBreathingPicker && !meditationActive"
                class="breathing-picker-backdrop"
                @click="showBreathingPicker = false"
            ></div>
            <div v-if="showBreathingPicker && !meditationActive" class="breathing-picker-panel">
                <div class="breathing-picker-header">
                    <h3 class="breathing-picker-title">{{ t('breathing.title') }}</h3>
                    <button
                        class="config-close-btn"
                        aria-label="Close breathing picker"
                        @click="showBreathingPicker = false"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M18 6L6 18M6 6l12 12"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                            />
                        </svg>
                    </button>
                </div>
                <div class="breathing-picker-options">
                    <button
                        :class="['breathing-option-btn', { active: !selectedBreathingExercise }]"
                        @click="
                            selectedBreathingExercise = null;
                            showBreathingPicker = false;
                        "
                    >
                        {{ t('breathing.none') }}
                    </button>
                    <button
                        v-for="ex in breathingExercises"
                        :key="ex.id"
                        :class="['breathing-option-btn', { active: selectedBreathingExercise?.id === ex.id }]"
                        @click="
                            selectedBreathingExercise = ex;
                            showBreathingPicker = false;
                        "
                    >
                        <div class="breathing-option-name">{{ ex.name }}</div>
                        <div class="breathing-option-desc">{{ ex.description }}</div>
                    </button>
                </div>
            </div>

            <div
                v-if="!meditationActive"
                :class="[
                    'zen-main',
                    { 'journal-active': journalMode || calendarMode || philosophyMode || settingsMode },
                ]"
            >
                <!-- Journal inline view -->
                <transition name="journal-fade">
                    <div v-if="journalMode" :class="['journal-inline-container', { 'has-header': desktopApp }]">
                        <EmotionTracker @close="journalMode = false" />
                    </div>
                </transition>

                <!-- Calendar inline view -->
                <transition name="journal-fade">
                    <div v-if="calendarMode" :class="['journal-inline-container', { 'has-header': desktopApp }]">
                        <MeditationCalendar :meditations="meditations" @close="calendarMode = false" />
                    </div>
                </transition>

                <!-- Philosophy inline view -->
                <transition name="journal-fade">
                    <div v-if="philosophyMode" :class="['journal-inline-container', { 'has-header': desktopApp }]">
                        <ZenPhilosophy @close="philosophyMode = false" />
                    </div>
                </transition>

                <!-- Settings inline view -->
                <transition name="journal-fade">
                    <div v-if="settingsMode" :class="['journal-inline-container', { 'has-header': desktopApp }]">
                        <SettingsPopup
                            @close="settingsMode = false"
                            @theme-change="handleSettingsThemeChange"
                            @language-change="handleSettingsLanguageChange"
                        />
                    </div>
                </transition>

                <transition name="center-fade">
                    <div v-if="centerTextVisible && !anySectionOpen" class="zen-center">
                        <span :class="['zen-phrase', { dimmed: showBellConfig }]">{{ currentPhrase }}</span>
                        <span :class="['zen-loader', { dimmed: showBellConfig }]">
                            <svg width="32" height="32" viewBox="0 0 32 32">
                                <rect x="10" y="15" width="12" height="2" rx="1" fill="#F0F8FF">
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 16 16"
                                        to="360 16 16"
                                        dur="2.5s"
                                        repeatCount="indefinite"
                                    />
                                </rect>
                            </svg>
                        </span>
                    </div>
                </transition>

                <div v-if="!meditationActive && !anySectionOpen" class="meditation-control-bar">
                    <button
                        v-for="duration in [5, 10, 15, 30]"
                        :key="duration"
                        :class="['duration-btn', { active: selectedDuration === duration && !isCustomDuration }]"
                        :aria-label="`Set meditation duration to ${duration} minutes`"
                        @click="selectPresetDuration(duration)"
                    >
                        {{ duration }}
                    </button>
                    <button
                        v-if="!isCustomDuration"
                        :class="['duration-btn', 'custom-btn']"
                        :aria-label="'Set custom meditation duration'"
                        @click="enableCustomDuration"
                    >
                        ⋯
                    </button>
                    <div v-else class="custom-duration-input">
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
                            @keyup.esc="cancelCustomDuration"
                        />
                        <button class="custom-ok-btn" aria-label="Confirm custom duration" @click="applyCustomDuration">
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M2 6h8M6 2l4 4-4 4"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                    <button
                        :class="['duration-btn', 'bell-config-btn', { active: bellEnabled }]"
                        :aria-label="'Configure bell settings'"
                        @click="showBellConfig = !showBellConfig"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M12 2C10.9 2 10 2.9 10 4C10 4.6 10.2 5.1 10.6 5.5C8 6.1 6 8.3 6 11V16L4 18V19H20V18L18 16V11C18 8.3 16 6.1 13.4 5.5C13.8 5.1 14 4.6 14 4C14 2.9 13.1 2 12 2ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                    <button
                        :class="['duration-btn', 'breathing-config-btn', { active: !!selectedBreathingExercise }]"
                        :aria-label="'Configure breathing exercise'"
                        @click="showBreathingPicker = !showBreathingPicker"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
                        </svg>
                    </button>
                    <button
                        class="start-meditation-btn"
                        :aria-label="`Start a ${selectedDuration}-minute meditation session`"
                        @click="startMeditation"
                    >
                        {{ t('meditation.begin') }}
                    </button>
                </div>

                <!-- Bell Configuration Panel -->
                <div
                    v-if="showBellConfig && !meditationActive"
                    class="breathing-picker-backdrop"
                    @click="showBellConfig = false"
                ></div>
                <div v-if="showBellConfig && !meditationActive" class="breathing-picker-panel bell-picker-panel">
                    <div class="breathing-picker-header">
                        <h3 class="breathing-picker-title">{{ t('meditation.bell.settings') }}</h3>
                        <button
                            class="config-close-btn"
                            aria-label="Close bell settings"
                            @click="showBellConfig = false"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M18 6L6 18M6 6l12 12"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                    <div class="breathing-picker-options">
                        <button
                            :class="['breathing-option-btn', { active: !bellEnabled }]"
                            @click="
                                bellEnabled = false;
                                showBellConfig = false;
                            "
                        >
                            {{ t('breathing.none') }}
                        </button>
                        <button
                            v-for="interval in [5, 10, 15, 20]"
                            :key="interval"
                            :class="['breathing-option-btn', { active: bellEnabled && bellInterval === interval }]"
                            @click="
                                bellEnabled = true;
                                bellInterval = interval;
                                showBellConfig = false;
                            "
                        >
                            <div class="breathing-option-name">Every {{ interval }} min</div>
                        </button>
                    </div>
                    <div v-if="bellEnabled" class="bell-sound-section">
                        <div class="bell-sound-section-title">Sound</div>
                        <div class="bell-sound-options-inline">
                            <button
                                v-for="sound in ['1', '2', '3', '4']"
                                :key="sound"
                                :class="[
                                    'breathing-option-btn',
                                    'bell-sound-inline-btn',
                                    { active: bellSound === sound },
                                ]"
                                @click="selectBellSound(sound)"
                            >
                                Bell {{ sound }}
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
                @toggle-breathing="toggleBreathingDuringMeditation"
            />
        </template>
    </div>
</template>

<style scoped>
.logo {
    width: 50px;
    margin-bottom: 2rem;
    color: var(--text1);
}
.zen-bg {
    min-height: 100vh;
    width: 100vw;
    background: color-mix(in srgb, var(--base1) 70%, var(--base2) 30%);
    display: flex;
    align-items: center;
    justify-content: center;
}
.zen-main {
    display: flex;
    width: 100%;
    height: 100vh;
    align-items: center;
    justify-content: center;
    padding: 0 2rem;
    position: relative;
    overflow: hidden;
}
.goals-horizontal {
    padding: 1rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
}
.zen-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
.zen-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.zen-loader.dimmed {
    opacity: 0.05;
    pointer-events: none;
}

.zen-date {
    font-size: 1.1rem;
    color: var(--text1);
}
.zen-greeting {
    font-size: 1.1rem;
    color: var(--text2);
}

.zen-phrase {
    color: var(--text1);
    text-align: center;
    cursor: default;
    max-width: 90vw;
    word-wrap: break-word;
    overflow-wrap: break-word;
    transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.zen-phrase.dimmed {
    opacity: 0.15;
    pointer-events: none;
}

/* Center text fade-in transition (leave is instant to prevent layout shift) */
.center-fade-enter-active {
    animation: centerFadeIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.center-fade-leave-active {
    display: none;
}

@keyframes centerFadeIn {
    0% {
        opacity: 0;
        transform: translateY(10px) scale(0.97);
        filter: blur(4px);
    }
    60% {
        filter: blur(0px);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0px);
    }
}
/* Compact Meditation Control Bar */
.meditation-control-bar {
    position: absolute;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.1rem;
    padding: 0.25rem;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 6px;
}

.duration-btn {
    padding: 0.4rem;
    background: transparent;
    border: none;
    color: var(--text2);
    font-size: 0.8rem;
    font-weight: 400;
    cursor: pointer;
    transition:
        color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
    min-width: 40px;
}

.duration-btn:hover {
    background: var(--input-bg-focus);
    color: var(--text1);
    transform: translateY(-1px);
}

.duration-btn:active {
    transform: translateY(0) scale(0.96);
    transition-duration: 0.08s;
}

.duration-btn.active {
    background: var(--button-bg);
    color: var(--text1);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.04);
}

.duration-btn.custom-btn {
    font-weight: 700;
    font-size: 1rem;
    line-height: 1;
}

.custom-duration-input {
    display: flex;
    align-items: center;
    gap: 0.1rem;
}

.custom-duration-input input {
    padding: 0.4rem 0.4rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text1);
    font-size: 0.8rem;
    text-align: center;
    -moz-appearance: textfield;
    appearance: textfield;
}

.custom-duration-input input::-webkit-outer-spin-button,
.custom-duration-input input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.custom-duration-input input:focus {
    outline: none;
    background: var(--input-bg-focus);
}

.custom-ok-btn {
    padding: 0.4rem;
    background: transparent;
    border: none;
    color: var(--text2);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
}

.custom-ok-btn:hover {
    background: var(--input-bg-focus);
    color: var(--text1);
}

.start-meditation-btn {
    padding: 0.4rem 1rem;
    background: var(--button-bg);
    border: none;
    border-left: 1px solid var(--input-border);
    color: var(--text1);
    font-size: 0.8rem;
    font-weight: 400;
    cursor: pointer;
    border-radius: 0 4px 4px 0;
    margin-left: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition:
        background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.start-meditation-btn:hover {
    background: var(--button-bg-hover);
    box-shadow: 0 2px 12px rgba(255, 255, 255, 0.06);
}

.start-meditation-btn:active {
    transform: scale(0.97);
    transition-duration: 0.08s;
}

/* Journal Mode */
.zen-main.journal-active {
    background: color-mix(in srgb, var(--base2) 50%, var(--base1) 50%);
    border-radius: 0;
    transition: background 0.4s ease;
}

.journal-inline-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem;
    padding-bottom: 5rem;
    box-sizing: border-box;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    position: relative;
    z-index: 1;
}

.journal-inline-container.has-header {
    padding-top: calc(40px + 1.5rem);
}

/* Journal transition */
.journal-fade-enter-active {
    animation: journalEnter 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    animation-delay: 0.05s;
    animation-fill-mode: both;
}

.journal-fade-leave-active {
    position: absolute !important;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    animation: journalLeave 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes journalEnter {
    from {
        opacity: 0;
        transform: translateY(10px);
        filter: blur(2px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0px);
    }
}

@keyframes journalLeave {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

/* Breathing Picker Panel (pre-meditation) */
.breathing-picker-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1001;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes backdropFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.breathing-picker-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 12px;
    width: 300px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 1002;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: popupFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes popupFadeIn {
    from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.96);
        filter: blur(2px);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        filter: blur(0px);
    }
}

.breathing-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--input-border);
}

.breathing-picker-title {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--text1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.breathing-picker-options {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.breathing-option-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text2);
    cursor: pointer;
    transition:
        background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    width: 100%;
}

.breathing-option-btn:hover {
    background: var(--input-bg-focus);
    color: var(--text1);
    transform: translateX(2px);
}

.breathing-option-btn:active {
    transform: translateX(2px) scale(0.98);
    transition-duration: 0.08s;
}

.breathing-option-btn.active {
    background: var(--input-bg-focus);
    border-color: var(--input-border-focus);
    color: var(--text1);
}

.breathing-option-name {
    font-size: 0.8rem;
    font-weight: 400;
    color: inherit;
}

.breathing-option-desc {
    font-size: 0.65rem;
    color: var(--text2);
    margin-top: 0.15rem;
    line-height: 1.3;
}

.bell-config-btn {
    display: flex;
    align-items: center;
    justify-content: center;
}

.bell-sound-section {
    padding: 0.25rem 0.5rem 0.5rem;
    border-top: 1px solid var(--input-border);
}

.bell-sound-section-title {
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.25rem 0.15rem;
}

.bell-sound-options-inline {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
}

.bell-sound-inline-btn {
    text-align: center;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 0.5rem;
}

.config-close-btn {
    padding: 0.35rem;
    background: transparent;
    border: none;
    color: var(--text2);
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.config-close-btn:hover {
    background: var(--input-bg-focus);
    color: var(--text1);
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
    /* Hide zen phrase and loader on mobile for cleaner layout */
    .zen-phrase,
    .zen-loader {
        display: none;
    }

    .zen-center {
        width: 100%;
        padding: 0 1rem;
    }

    .journal-inline-container {
        padding: 1rem;
        padding-top: env(safe-area-inset-top, 1rem);
        padding-bottom: 6rem;
    }

    .journal-inline-container.has-header {
        padding-top: calc(40px + 1rem);
    }

    .meditation-control-bar {
        bottom: 5rem;
        width: calc(100% - 2rem);
        left: 50%;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.75rem;
        gap: 0.5rem;
    }

    .breathing-picker-panel {
        width: calc(100% - 2rem);
        max-width: 320px;
    }

    .duration-btn {
        min-width: 60px;
        min-height: 44px;
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
        touch-action: manipulation;
    }

    .start-meditation-btn {
        flex: 1 1 100%;
        margin-left: 0;
        margin-top: 0.5rem;
        border-left: none;
        border-top: 1px solid var(--input-border);
        border-radius: 4px;
        padding: 0.85rem 1.25rem;
        font-size: 0.95rem;
        min-height: 48px;
    }
}

@media (max-width: 480px) {
    .zen-phrase {
        font-size: 1.1rem;
        margin-top: 10rem;
        padding: 0 1rem;
        line-height: 1.5;
    }

    .meditation-control-bar {
        width: calc(100% - 3rem);
        bottom: 4.5rem;
        padding: 0.5rem;
    }

    .duration-btn {
        min-width: 50px;
        min-height: 44px;
        padding: 0.6rem 0.75rem;
        font-size: 0.85rem;
    }

    .start-meditation-btn {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
        min-height: 48px;
    }
}

/* Landscape orientation on mobile */
@media (max-height: 500px) and (max-width: 900px) {
    .zen-phrase {
        margin-top: 4.5rem;
        font-size: 1rem;
        line-height: 1.4;
    }

    .meditation-control-bar {
        bottom: 4rem;
        gap: 0.4rem;
        padding: 0.5rem;
    }

    .duration-btn {
        padding: 0.5rem 0.75rem;
        font-size: 0.8rem;
        min-width: 50px;
        min-height: 40px;
    }

    .start-meditation-btn {
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        margin-top: 0;
        flex: 0 0 auto;
        min-height: 40px;
    }
}

/* Very small screens */
@media (max-width: 360px) {
    .zen-phrase {
        font-size: 1rem;
        padding: 0 0.75rem;
    }

    .duration-btn {
        min-width: 48px;
        min-height: 44px;
        padding: 0.55rem 0.6rem;
        font-size: 0.8rem;
    }

    .start-meditation-btn {
        font-size: 0.85rem;
        padding: 0.7rem 1rem;
        min-height: 48px;
    }
}

/* Mobile optimizations for bell config panels */
@media (max-width: 768px) {
    .config-close-btn {
        min-width: 40px;
        min-height: 40px;
        padding: 0.5rem;
        border-radius: 8px;
    }

    .config-close-btn:hover,
    .config-close-btn:active {
        background: var(--input-bg);
        color: var(--text1);
    }
}
</style>
