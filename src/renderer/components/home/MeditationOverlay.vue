<script setup lang="ts">
import { ref, type Component } from 'vue';
import { useI18n } from 'vue-i18n';

interface BreathingExercise {
    name: string;
}

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
    stop: [];
    'update:bellEnabled': [value: boolean];
    'update:bellInterval': [value: number];
    'select-bell-sound': [sound: string];
    'toggle-breathing': [];
}>();

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
                :class="['bell-toggle-btn', { active: bellEnabled }]"
                :aria-label="bellEnabled ? 'Disable interval bells' : 'Enable interval bells'"
                @click="emit('update:bellEnabled', !bellEnabled)"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M12 2C10.9 2 10 2.9 10 4C10 4.6 10.2 5.1 10.6 5.5C8 6.1 6 8.3 6 11V16L4 18V19H20V18L18 16V11C18 8.3 16 6.1 13.4 5.5C13.8 5.1 14 4.6 14 4C14 2.9 13.1 2 12 2ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>

            <div v-if="bellEnabled" class="bell-settings">
                <div class="bell-dropdown">
                    <button class="bell-dropdown-btn" @click="showIntervalDropdown = !showIntervalDropdown">
                        {{ bellInterval }} min <span class="dropdown-arrow">▾</span>
                    </button>
                    <div
                        v-if="showIntervalDropdown"
                        class="dropdown-backdrop-inline"
                        @click="showIntervalDropdown = false"
                    ></div>
                    <div v-if="showIntervalDropdown" class="bell-dropdown-menu">
                        <button
                            @click="
                                emit('update:bellInterval', 5);
                                showIntervalDropdown = false;
                            "
                        >
                            5 min
                        </button>
                        <button
                            @click="
                                emit('update:bellInterval', 10);
                                showIntervalDropdown = false;
                            "
                        >
                            10 min
                        </button>
                        <button
                            @click="
                                emit('update:bellInterval', 15);
                                showIntervalDropdown = false;
                            "
                        >
                            15 min
                        </button>
                        <button
                            @click="
                                emit('update:bellInterval', 20);
                                showIntervalDropdown = false;
                            "
                        >
                            20 min
                        </button>
                    </div>
                </div>

                <div class="bell-dropdown">
                    <button class="bell-dropdown-btn" @click="showSoundDropdown = !showSoundDropdown">
                        Bell {{ bellSound }} <span class="dropdown-arrow">▾</span>
                    </button>
                    <div
                        v-if="showSoundDropdown"
                        class="dropdown-backdrop-inline"
                        @click="showSoundDropdown = false"
                    ></div>
                    <div v-if="showSoundDropdown" class="bell-dropdown-menu">
                        <button
                            @click="
                                emit('select-bell-sound', '1');
                                showSoundDropdown = false;
                            "
                        >
                            Bell 1
                        </button>
                        <button
                            @click="
                                emit('select-bell-sound', '2');
                                showSoundDropdown = false;
                            "
                        >
                            Bell 2
                        </button>
                        <button
                            @click="
                                emit('select-bell-sound', '3');
                                showSoundDropdown = false;
                            "
                        >
                            Bell 3
                        </button>
                        <button
                            @click="
                                emit('select-bell-sound', '4');
                                showSoundDropdown = false;
                            "
                        >
                            Bell 4
                        </button>
                    </div>
                </div>
            </div>

            <!-- Breathing toggle -->
            <div v-if="selectedBreathingExercise" class="toolbar-divider"></div>
            <button
                v-if="selectedBreathingExercise"
                :class="['breathing-toggle-btn', { active: breathingActive }]"
                :aria-label="breathingActive ? 'Stop breathing guide' : 'Start breathing guide'"
                @click="emit('toggle-breathing')"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
                    <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2" opacity="0.5" />
                </svg>
            </button>
        </div>

        <!-- Breathing Sphere Overlay -->
        <div v-if="breathingActive && selectedBreathingExercise" class="breathing-overlay">
            <div
                class="breathing-sphere"
                :class="{
                    'breathing-in': breathingPhase === 'in',
                    'breathing-hold': breathingPhase === 'hold',
                    'breathing-out': breathingPhase === 'out',
                    'breathing-hold-out': breathingPhase === 'holdOut',
                }"
                :style="{ animationDuration: `${breathingPhaseDuration}s` }"
            >
                <span class="breathing-sphere-text">{{ breathingPhaseText }}</span>
            </div>
            <div class="breathing-info">
                <span class="breathing-exercise-name">{{ selectedBreathingExercise.name }}</span>
                <span class="breathing-cycle">{{ t('breathing.cycle') }} {{ breathingCycleCount }}</span>
            </div>
        </div>

        <div class="meditation-timer meditation-timer-overlay">
            <div class="timer-display" aria-live="polite" aria-label="Meditation timer">
                {{ formatTime(meditationSeconds) }}
            </div>
            <button class="meditation-btn" aria-label="Stop the current meditation session" @click="emit('stop')">
                {{ t('meditation.stop') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.zen-meditation-overlay {
    position: fixed;
    inset: 0;
    background: var(--base1);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

/* ─── Timer & stop ─────────────────────────────────────────────────────────── */

.meditation-timer {
    margin-top: 2.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
}

.meditation-timer-overlay {
    position: absolute;
    bottom: 3.5rem;
    left: 0;
    width: 100vw;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1010;
}

.timer-display {
    font-size: 1.3rem;
    color: var(--text1);
    position: absolute;
    bottom: 6rem;
}

.meditation-btn {
    background: transparent;
    position: absolute;
    bottom: 2rem;
    color: var(--text1);
    cursor: pointer;
    transition:
        background 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    outline: none;
    padding: 0.6em 1.6em;
    border-radius: 999px;
    font-size: 1.1rem;
    letter-spacing: 0.02em;
}

.meditation-btn:hover,
.meditation-btn:focus {
    background: var(--blur1);
    color: var(--text2);
    box-shadow: 0 2px 16px 0 var(--input-border);
    transform: translateY(-1px);
}

.meditation-btn:active {
    transform: translateY(0) scale(0.97);
    transition-duration: 0.08s;
}

/* ─── Bell toolbar ─────────────────────────────────────────────────────────── */

.bell-settings-toolbar {
    position: absolute;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--blur2);
    backdrop-filter: blur(8px);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    z-index: 1001;
}

.bell-toggle-btn {
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: var(--text2);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bell-toggle-btn:hover {
    background: var(--input-bg-focus);
    color: var(--text1);
}

.bell-toggle-btn.active {
    background: var(--button-bg);
    color: var(--text1);
}

.bell-settings {
    display: flex;
    gap: 0.5rem;
    animation: slideIn 0.2s ease;
}

.bell-dropdown {
    position: relative;
}

.bell-dropdown-btn {
    padding: 0.4rem 0.8rem;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 6px;
    color: var(--text1);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
}

.bell-dropdown-btn:hover {
    background: var(--input-bg-focus);
    border-color: var(--input-border-focus);
}

.dropdown-arrow {
    font-size: 0.7rem;
    opacity: 0.7;
}

.bell-dropdown-menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    min-width: 100%;
    background: var(--blur2);
    backdrop-filter: blur(12px);
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 0.25rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1002;
    animation: dropdownSlide 0.15s ease;
}

.bell-dropdown-menu button {
    width: 100%;
    padding: 0.4rem 0.8rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text1);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    white-space: nowrap;
}

.bell-dropdown-menu button:hover {
    background: var(--input-bg-focus);
}

.dropdown-backdrop-inline {
    display: none;
}

.toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--input-border);
}

@keyframes dropdownSlide {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* ─── Breathing overlay ────────────────────────────────────────────────────── */

.breathing-toggle-btn {
    background: transparent;
    border: none;
    color: var(--text2);
    cursor: pointer;
    padding: 0.35rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    opacity: 0.6;
}

.breathing-toggle-btn:hover {
    color: var(--text1);
    opacity: 1;
}

.breathing-toggle-btn.active {
    color: var(--text1);
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
}

.breathing-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    z-index: 1010;
    pointer-events: none;
}

.breathing-sphere {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.03));
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow:
        0 0 40px rgba(255, 255, 255, 0.05),
        inset 0 0 30px rgba(255, 255, 255, 0.03);
    transition: transform 0.3s ease;
}

.breathing-sphere.breathing-in {
    animation: sphereBreathIn ease-in-out forwards;
}

.breathing-sphere.breathing-hold {
    transform: scale(1.6);
}

.breathing-sphere.breathing-out {
    animation: sphereBreathOut ease-in-out forwards;
}

.breathing-sphere.breathing-hold-out {
    transform: scale(1);
}

@keyframes sphereBreathIn {
    from {
        transform: scale(1);
        opacity: 0.6;
    }
    to {
        transform: scale(1.6);
        opacity: 1;
    }
}

@keyframes sphereBreathOut {
    from {
        transform: scale(1.6);
        opacity: 1;
    }
    to {
        transform: scale(1);
        opacity: 0.6;
    }
}

.breathing-sphere-text {
    font-size: 0.75rem;
    color: var(--text1);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: center;
    opacity: 0.9;
}

.breathing-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
}

.breathing-exercise-name {
    font-size: 0.7rem;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.7;
}

.breathing-cycle {
    font-size: 0.65rem;
    color: var(--text2);
    opacity: 0.5;
}

/* ─── Responsive ───────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
    .breathing-sphere {
        width: 120px;
        height: 120px;
    }

    .breathing-sphere-text {
        font-size: 0.7rem;
    }

    .timer-display {
        font-size: 3rem;
        bottom: 9rem;
    }

    .meditation-btn {
        bottom: 5rem;
        font-size: 1.1rem;
        padding: 0.85em 2.5em;
        min-height: 52px;
        touch-action: manipulation;
    }

    .meditation-timer-overlay {
        bottom: 5.5rem;
    }

    .dropdown-backdrop-inline {
        display: block;
        position: fixed;
        inset: 0;
        background: transparent;
        z-index: 1001;
    }

    .bell-dropdown-menu {
        position: fixed;
        top: 4.5rem;
        left: 50%;
        transform: translateX(-50%);
        width: 90vw;
        max-width: 280px;
        min-width: 200px;
        border-radius: 12px;
        padding: 1rem 0.75rem;
        max-height: 60vh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        z-index: 1003;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .bell-dropdown-menu button {
        padding: 0.75rem;
        font-size: 0.9rem;
        min-height: 48px;
        border-radius: 8px;
        margin-bottom: 0.5rem;
    }

    .bell-dropdown-menu button:last-child {
        margin-bottom: 0;
    }

    .bell-settings-toolbar {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + 3rem);
        left: 0.5rem;
        right: 0.5rem;
        width: calc(100% - 1rem);
        max-width: calc(100% - 1rem);
        padding: 0.35rem 0.5rem;
        transform: none;
        flex-wrap: nowrap;
        gap: 0.35rem;
        border-radius: 8px;
        box-sizing: border-box;
        backdrop-filter: blur(12px);
        justify-content: center;
    }

    .bell-toggle-btn {
        min-width: 36px;
        min-height: 36px;
        padding: 0.4rem;
        box-sizing: border-box;
    }

    .bell-toggle-btn svg {
        width: 14px;
        height: 14px;
    }

    .bell-dropdown-btn {
        min-height: 36px;
        padding: 0.35rem 0.6rem;
        font-size: 0.75rem;
        box-sizing: border-box;
        min-width: 48px;
    }

    .bell-settings {
        gap: 0.35rem;
        flex-wrap: nowrap;
        box-sizing: border-box;
        display: flex;
    }

    .bell-dropdown {
        flex-shrink: 1;
    }

    .toolbar-divider {
        height: 20px;
    }
}

@media (max-width: 480px) {
    .timer-display {
        font-size: 2.5rem;
        bottom: 8rem;
    }

    .meditation-btn {
        bottom: 4.5rem;
        font-size: 1rem;
        padding: 0.75em 2em;
        min-height: 50px;
    }

    .meditation-timer-overlay {
        bottom: 5rem;
    }

    .bell-settings-toolbar {
        position: fixed;
        padding: 0.3rem 0.4rem;
        gap: 0.3rem;
        left: 0.4rem;
        right: 0.4rem;
        top: calc(env(safe-area-inset-top, 0px) + 3rem);
        width: calc(100% - 0.8rem);
        max-width: calc(100% - 0.8rem);
        border-radius: 6px;
    }

    .bell-toggle-btn {
        min-width: 36px;
        min-height: 36px;
        padding: 0.4rem;
    }

    .bell-dropdown-btn {
        min-height: 36px;
        padding: 0.4rem 0.6rem;
        font-size: 0.8rem;
    }

    .bell-settings {
        gap: 0.3rem;
    }

    .toolbar-divider {
        height: 18px;
    }
}

@media (max-height: 500px) and (max-width: 900px) {
    .timer-display {
        font-size: 2rem;
        bottom: 4rem;
    }

    .meditation-btn {
        bottom: 4rem;
        font-size: 0.95rem;
        padding: 0.6em 2em;
        min-height: 44px;
    }
}

@media (max-width: 360px) {
    .meditation-btn {
        font-size: 0.95rem;
        padding: 0.7em 2em;
        min-height: 48px;
    }
}
</style>
