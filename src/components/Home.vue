<template>
  <div class="zen-bg">
    <MonkAuth v-if="!user" @auth="handleAuth" />
    <template v-else>
      <!-- Main app content below, only visible if authenticated -->

      <!-- Bottom Navigation Bar -->
      <nav class="bottom-nav" v-if="!meditationActive">
        <button
          :class="['nav-item', { 'nav-active': journalMode }]"
          @click="toggleJournalMode"
          aria-label="Track your emotions"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 7h8M8 11h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>{{ t('header.emotions') }}</span>
        </button>
        <button
          :class="['nav-item', { 'nav-active': calendarMode }]"
          @click="toggleCalendarMode"
          aria-label="View meditation history"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>{{ t('header.calendar') }}</span>
        </button>
        <button
          :class="['nav-item', { 'nav-active': philosophyMode }]"
          @click="togglePhilosophyMode"
          aria-label="About our philosophy"
        >
          <svg width="22" height="22" viewBox="0 0 96 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M44 9.553c-1.925.812-4.86 3.056-6.523 4.988-2.862 3.327-3.196 3.453-6.299 2.371-7.117-2.481-16.58 2.241-20.581 10.27-4.402 8.833-2.61 17.282 4.996 23.559 4.854 4.006 5.66 4.812 9.666 9.666 5.493 6.656 13.034 8.936 20.741 6.269 2.85-.986 4.266-.939 7.623.253 5.57 1.978 11.336.245 16.708-5.021C72.524 59.759 74.906 58 75.624 58c2.279 0 8.621-6.331 10.511-10.491C91.4 35.919 83.178 22.041 70 20.273c-2.2-.295-4-.926-4-1.402 0-2.12-7.482-8.911-10.848-9.846-4.829-1.341-6.956-1.24-11.152.528m.838 7.973c-1.621.88-3.336 3.21-4.386 5.96-2.008 5.258-1.53 5.046-5.678 2.518-10.81-6.591-23.486 5.211-17.138 15.956 1.765 2.989 6.195 6.04 8.768 6.04A1.6 1.6 0 0 1 28 49.596c0 7.743 11.474 13.045 18.381 8.492 2.83-1.866 2.935-1.866 6 .002 5.341 3.258 11.783 1.708 14.573-3.505C67.715 53.163 68.98 52 69.765 52 74.454 52 80 45.498 80 40c0-7.684-6.192-12.605-14.615-11.615-5.226.614-5.385.56-5.385-1.829 0-8.107-8.042-12.897-15.162-9.03M26 74c-3.585 3.585-1.019 10 4 10 2.576 0 6-3.424 6-6 0-1.1-.9-2.9-2-4s-2.9-2-4-2-2.9.9-4 2m-12.96 7.452c-2.657 3.201 1.245 8.118 4.71 5.936C21.212 85.207 19.979 80 16 80c-.965 0-2.297.653-2.96 1.452" fill-rule="evenodd"/>
          </svg>
          <span>{{ t('header.philosophy') }}</span>
        </button>
        <button
          :class="['nav-item', { 'nav-active': settingsMode }]"
          @click="toggleSettingsMode"
          aria-label="Open settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ t('header.settings') }}</span>
        </button>
        <button
          class="nav-item nav-logout"
          @click="handleLogout"
          aria-label="Logout from your account"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ t('header.logout') }}</span>
        </button>
      </nav>

      <SessionNotes v-if="showNotes" :duration="completedMeditationDuration" @save="saveSessionNotes" @skip="skipSessionNotes" @close="skipSessionNotes" />
      <!-- Breathing Exercise Picker (pre-meditation) -->
      <div v-if="showBreathingPicker && !meditationActive" class="breathing-picker-backdrop" @click="showBreathingPicker = false"></div>
      <div v-if="showBreathingPicker && !meditationActive" class="breathing-picker-panel">
        <div class="breathing-picker-header">
          <h3 class="breathing-picker-title">{{ t('breathing.title') }}</h3>
          <button class="config-close-btn" @click="showBreathingPicker = false" aria-label="Close breathing picker">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="breathing-picker-options">
          <button
            :class="['breathing-option-btn', { active: !selectedBreathingExercise }]"
            @click="selectedBreathingExercise = null; showBreathingPicker = false"
          >
            {{ t('breathing.none') }}
          </button>
          <button
            v-for="ex in breathingExercises"
            :key="ex.id"
            :class="['breathing-option-btn', { active: selectedBreathingExercise?.id === ex.id }]"
            @click="selectedBreathingExercise = ex; showBreathingPicker = false"
          >
            <div class="breathing-option-name">{{ ex.name }}</div>
            <div class="breathing-option-desc">{{ ex.description }}</div>
          </button>
        </div>
      </div>


      <div v-if="!meditationActive" :class="['zen-main', { 'journal-active': journalMode || calendarMode || philosophyMode || settingsMode }]">
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
            <SettingsPopup @close="settingsMode = false" @theme-change="handleSettingsThemeChange" @language-change="handleSettingsLanguageChange" />
          </div>
        </transition>

        <transition name="center-fade">
        <div class="zen-center" v-if="centerTextVisible && !anySectionOpen">
        <span :class="['zen-phrase', { dimmed: showBellConfig }]">{{ currentPhrase }}</span>
        <span :class="['zen-loader', { dimmed: showBellConfig }]">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <rect x="10" y="15" width="12" height="2" rx="1" fill="#F0F8FF">
              <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="2.5s" repeatCount="indefinite"/>
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
            @click="selectPresetDuration(duration)"
            :aria-label="`Set meditation duration to ${duration} minutes`"
          >
            {{ duration }}
          </button>
          <button
            v-if="!isCustomDuration"
            :class="['duration-btn', 'custom-btn']"
            @click="enableCustomDuration"
            :aria-label="'Set custom meditation duration'"
          >
            ⋯
          </button>
          <div v-else class="custom-duration-input">
            <input
              ref="customInput"
              type="number"
              v-model.number="customDurationValue"
              @blur="applyCustomDuration"
              @keyup.enter="applyCustomDuration"
              @keyup.esc="cancelCustomDuration"
              min="1"
              max="180"
              placeholder="min"
              aria-label="Enter custom duration in minutes"
            />
            <button class="custom-ok-btn" @click="applyCustomDuration" aria-label="Confirm custom duration">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <button 
            :class="['duration-btn', 'bell-config-btn', { active: bellEnabled }]"
            @click="showBellConfig = !showBellConfig"
            :aria-label="'Configure bell settings'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.9 2 10 2.9 10 4C10 4.6 10.2 5.1 10.6 5.5C8 6.1 6 8.3 6 11V16L4 18V19H20V18L18 16V11C18 8.3 16 6.1 13.4 5.5C13.8 5.1 14 4.6 14 4C14 2.9 13.1 2 12 2ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button 
            :class="['duration-btn', 'breathing-config-btn', { active: !!selectedBreathingExercise }]"
            @click="showBreathingPicker = !showBreathingPicker"
            :aria-label="'Configure breathing exercise'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
            </svg>
          </button>
          <button class="start-meditation-btn" @click="startMeditation" :aria-label="`Start a ${selectedDuration}-minute meditation session`">
            {{ t('meditation.begin') }}
          </button>
        </div>
        
        <!-- Bell Configuration Panel -->
        <div v-if="showBellConfig && !meditationActive" class="breathing-picker-backdrop" @click="showBellConfig = false"></div>
        <div v-if="showBellConfig && !meditationActive" class="breathing-picker-panel bell-picker-panel">
          <div class="breathing-picker-header">
            <h3 class="breathing-picker-title">{{ t('meditation.bell.settings') }}</h3>
            <button class="config-close-btn" @click="showBellConfig = false" aria-label="Close bell settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="breathing-picker-options">
            <button
              :class="['breathing-option-btn', { active: !bellEnabled }]"
              @click="bellEnabled = false; showBellConfig = false"
            >
              {{ t('breathing.none') }}
            </button>
            <button
              v-for="interval in [5, 10, 15, 20]"
              :key="interval"
              :class="['breathing-option-btn', { active: bellEnabled && bellInterval === interval }]"
              @click="bellEnabled = true; bellInterval = interval; showBellConfig = false"
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
                :class="['breathing-option-btn', 'bell-sound-inline-btn', { active: bellSound === sound }]"
                @click="selectBellSound(sound)"
              >
                Bell {{ sound }}
              </button>
            </div>
          </div>
        </div>
    </div>
      <div v-if="meditationActive" class="zen-meditation-overlay">
        <component :is="ANIMATIONS[meditationAnimationIdx]" />
        
        <!-- Bell Settings Toolbar -->
        <div class="bell-settings-toolbar">
          <button 
            :class="['bell-toggle-btn', { active: bellEnabled }]"
            @click="bellEnabled = !bellEnabled"
            :aria-label="bellEnabled ? 'Disable interval bells' : 'Enable interval bells'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.9 2 10 2.9 10 4C10 4.6 10.2 5.1 10.6 5.5C8 6.1 6 8.3 6 11V16L4 18V19H20V18L18 16V11C18 8.3 16 6.1 13.4 5.5C13.8 5.1 14 4.6 14 4C14 2.9 13.1 2 12 2ZM10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <div v-if="bellEnabled" class="bell-settings">
            <div class="bell-dropdown">
              <button class="bell-dropdown-btn" @click="showIntervalDropdown = !showIntervalDropdown">
                {{ bellInterval }} min <span class="dropdown-arrow">▾</span>
              </button>
              <div v-if="showIntervalDropdown" class="dropdown-backdrop-inline" @click="showIntervalDropdown = false"></div>
              <div v-if="showIntervalDropdown" class="bell-dropdown-menu">
                <button @click="bellInterval = 5; showIntervalDropdown = false">5 min</button>
                <button @click="bellInterval = 10; showIntervalDropdown = false">10 min</button>
                <button @click="bellInterval = 15; showIntervalDropdown = false">15 min</button>
                <button @click="bellInterval = 20; showIntervalDropdown = false">20 min</button>
              </div>
            </div>
            
            <div class="bell-dropdown">
              <button class="bell-dropdown-btn" @click="showSoundDropdown = !showSoundDropdown">
                Bell {{ bellSound }} <span class="dropdown-arrow">▾</span>
              </button>
              <div v-if="showSoundDropdown" class="dropdown-backdrop-inline" @click="showSoundDropdown = false"></div>
              <div v-if="showSoundDropdown" class="bell-dropdown-menu">
                <button @click="selectBellSoundFromDropdown('1')">Bell 1</button>
                <button @click="selectBellSoundFromDropdown('2')">Bell 2</button>
                <button @click="selectBellSoundFromDropdown('3')">Bell 3</button>
                <button @click="selectBellSoundFromDropdown('4')">Bell 4</button>
              </div>
            </div>
          </div>

          <!-- Breathing toggle -->
          <div v-if="selectedBreathingExercise" class="toolbar-divider"></div>
          <button 
            v-if="selectedBreathingExercise"
            :class="['breathing-toggle-btn', { active: breathingActive }]"
            @click="toggleBreathingDuringMeditation"
            :aria-label="breathingActive ? 'Stop breathing guide' : 'Start breathing guide'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2" opacity="0.5"/>
            </svg>
          </button>
        </div>

        <!-- Breathing Sphere Overlay -->
        <div v-if="breathingActive && selectedBreathingExercise" class="breathing-overlay">
          <div 
            class="breathing-sphere" 
            :class="{ 'breathing-in': breathingPhase === 'in', 'breathing-hold': breathingPhase === 'hold', 'breathing-out': breathingPhase === 'out', 'breathing-hold-out': breathingPhase === 'holdOut' }"
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
          <div class="timer-display" aria-live="polite" aria-label="Meditation timer">{{ formatTime(meditationSeconds) }}</div>
          <button class="meditation-btn" @click="stopMeditation" aria-label="Stop the current meditation session">{{ t('meditation.stop') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MeditationCalendar from './MeditationCalendar.vue'
import SessionNotes from './SessionNotes.vue'
import EmotionTracker from './EmotionTracker.vue'
import ZenPhilosophy from './ZenPhilosophy.vue'
import SettingsPopup from './SettingsPopup.vue'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import ZenWindAnimation from './animations/ZenWindAnimation.vue'
import ZenWavesAnimation from './animations/ZenWavesAnimation.vue'
import ZenBreatheAnimation from './animations/ZenBreatheAnimation.vue'
import ZenParticlesAnimation from './animations/ZenParticlesAnimation.vue'
import ZenLavaAnimation from './animations/ZenLavaAnimation.vue'
import MonkAuth from './MonkAuth.vue'
import { getMeditations, createMeditation, getCurrentUser, logout } from '../store'
import { useI18n } from 'vue-i18n'
import { isDesktop } from '../utils/platform'

const { t, tm } = useI18n()
// Zen phrases
const phrases = computed(() => tm('phrases') as string[])
const currentPhrase = ref(phrases.value[Math.floor(Math.random() * phrases.value.length)])
let phraseIntervalId: number | undefined

const emit = defineEmits(['meditation-active', 'theme-changed', 'language-changed', 'user-changed', 'theme-change', 'language-change'])
const desktopApp = ref(false)
onMounted(() => { desktopApp.value = isDesktop() })
const meditationActive = ref(false)

// Watch meditationActive and emit event on change
watch(meditationActive, (val) => {
  emit('meditation-active', val)
})
const meditationSeconds = ref(600) // 10 minutes
const selectedDuration = ref(10) // minutes
const isCustomDuration = ref(false)
const customDurationValue = ref(10)
const customInput = ref<HTMLInputElement | null>(null)
let meditationIntervalId: number | undefined

// Bell settings
const bellEnabled = ref(false)
const bellInterval = ref(10) // minutes
const bellSound = ref('1')
const showBellConfig = ref(false)
const showIntervalDropdown = ref(false)
const showSoundDropdown = ref(false)
let lastBellTime = 0
let bellAudioInstance: HTMLAudioElement | null = null

// Breathing exercise settings
interface BreathingExercise {
  id: string
  name: string
  description: string
  pattern: { phase: string; duration: number; text: string }[]
}

const showBreathingPicker = ref(false)
const selectedBreathingExercise = ref<BreathingExercise | null>(null)
const breathingActive = ref(false)
const breathingPhase = ref('in')
const breathingPhaseText = ref('')
const breathingPhaseDuration = ref(4)
const breathingCycleCount = ref(1)
let breathingIntervalId: number | undefined

const breathingExercises: BreathingExercise[] = [
  {
    id: 'box',
    name: t('breathing.box'),
    description: t('breathing.descriptions.box'),
    pattern: [
      { phase: 'in', duration: 4, text: t('breathing.breatheIn') },
      { phase: 'hold', duration: 4, text: t('breathing.hold') },
      { phase: 'out', duration: 4, text: t('breathing.breatheOut') },
      { phase: 'hold', duration: 4, text: t('breathing.hold') }
    ]
  },
  {
    id: '478',
    name: t('breathing.fourSevenEight'),
    description: t('breathing.descriptions.fourSevenEight'),
    pattern: [
      { phase: 'in', duration: 4, text: t('breathing.breatheIn') },
      { phase: 'hold', duration: 7, text: t('breathing.hold') },
      { phase: 'out', duration: 8, text: t('breathing.breatheOut') }
    ]
  },
  {
    id: 'deep',
    name: t('breathing.deep'),
    description: t('breathing.descriptions.deep'),
    pattern: [
      { phase: 'in', duration: 6, text: t('breathing.breatheIn') },
      { phase: 'out', duration: 6, text: t('breathing.breatheOut') }
    ]
  },
  {
    id: 'energizing',
    name: t('breathing.energizing'),
    description: t('breathing.descriptions.energizing'),
    pattern: [
      { phase: 'in', duration: 2, text: t('breathing.breatheIn') },
      { phase: 'out', duration: 4, text: t('breathing.breatheOut') }
    ]
  }
]

function startBreathingCycle() {
  if (!selectedBreathingExercise.value) return
  breathingActive.value = true
  breathingCycleCount.value = 1
  let patternIndex = 0
  const pattern = selectedBreathingExercise.value.pattern

  function nextPhase() {
    if (!breathingActive.value || !selectedBreathingExercise.value) return
    const current = pattern[patternIndex]
    breathingPhase.value = current.phase
    breathingPhaseText.value = current.text
    breathingPhaseDuration.value = current.duration
    patternIndex++
    if (patternIndex >= pattern.length) {
      patternIndex = 0
      breathingCycleCount.value++
    }
  }

  nextPhase()
  breathingIntervalId = window.setInterval(() => {
    nextPhase()
  }, breathingPhaseDuration.value * 1000)
}

function stopBreathingCycle() {
  breathingActive.value = false
  if (breathingIntervalId) {
    clearInterval(breathingIntervalId)
    breathingIntervalId = undefined
  }
}

function toggleBreathingDuringMeditation() {
  if (breathingActive.value) {
    stopBreathingCycle()
  } else if (selectedBreathingExercise.value) {
    startBreathingCycle()
  }
}

const showNotes = ref(false)
const journalMode = ref(false)
const calendarMode = ref(false)
const philosophyMode = ref(false)
const settingsMode = ref(false)

// Delayed center text visibility: hide immediately on section open, 1s delay on close
const centerTextVisible = ref(true)
let centerTextTimeout: number | undefined

const anySectionOpen = computed(() => journalMode.value || calendarMode.value || philosophyMode.value || settingsMode.value)

watch(anySectionOpen, (open) => {
  if (centerTextTimeout) {
    clearTimeout(centerTextTimeout)
    centerTextTimeout = undefined
  }
  if (open) {
    centerTextVisible.value = false
  } else {
    // Delay 3 seconds before showing center text again
    centerTextTimeout = window.setTimeout(() => {
      centerTextVisible.value = true
    }, 1000)
  }
})

function toggleJournalMode() {
  journalMode.value = !journalMode.value
  // Close other panels when entering journal mode
  if (journalMode.value) {
    calendarMode.value = false
    philosophyMode.value = false
    settingsMode.value = false
    showBellConfig.value = false
    showBreathingPicker.value = false
  }
}

function toggleCalendarMode() {
  calendarMode.value = !calendarMode.value
  if (calendarMode.value) {
    journalMode.value = false
    philosophyMode.value = false
    settingsMode.value = false
    showBellConfig.value = false
    showBreathingPicker.value = false
    if (user.value) fetchMeditations()
  }
}

function togglePhilosophyMode() {
  philosophyMode.value = !philosophyMode.value
  if (philosophyMode.value) {
    journalMode.value = false
    calendarMode.value = false
    settingsMode.value = false
    showBellConfig.value = false
    showBreathingPicker.value = false
  }
}

function toggleSettingsMode() {
  settingsMode.value = !settingsMode.value
  if (settingsMode.value) {
    journalMode.value = false
    calendarMode.value = false
    philosophyMode.value = false
    showBellConfig.value = false
    showBreathingPicker.value = false
  }
}

function handleSettingsThemeChange(theme: string) {
  emit('theme-change', theme)
}

function handleSettingsLanguageChange(language: string) {
  emit('language-change', language)
}

const meditations = ref<Array<{ Date: string | { $date: string }, Username?: string, duration?: number, notes?: string }>>([])  
const completedMeditationDuration = ref(0)

const alertAudio = ref<HTMLAudioElement | null>(null)

function setRandomPhrase() {
  let next
  do {
    next = phrases.value[Math.floor(Math.random() * phrases.value.length)]
  } while (next === currentPhrase.value && phrases.value.length > 1)
  currentPhrase.value = next
}



function selectPresetDuration(duration: number) {
  isCustomDuration.value = false
  selectedDuration.value = duration
}

function enableCustomDuration() {
  isCustomDuration.value = true
  customDurationValue.value = selectedDuration.value
  setTimeout(() => {
    customInput.value?.focus()
    customInput.value?.select()
  }, 50)
}

function applyCustomDuration() {
  if (customDurationValue.value >= 1 && customDurationValue.value <= 180) {
    selectedDuration.value = customDurationValue.value
    isCustomDuration.value = false
  } else {
    customDurationValue.value = Math.max(1, Math.min(180, customDurationValue.value))
  }
}

function cancelCustomDuration() {
  isCustomDuration.value = false
  customDurationValue.value = selectedDuration.value
}

function selectBellSound(sound: string) {
  bellSound.value = sound
  playBellSound() // Preview the sound
}

function selectBellSoundFromDropdown(sound: string) {
  bellSound.value = sound
  showSoundDropdown.value = false
  playBellSound() // Preview the sound
}

async function fetchMeditations() {
  try {
    const res = await getMeditations()
    meditations.value = (res.meditations || []).map(m => ({
      Date: typeof m.Date === 'string' ? m.Date : m.Date instanceof Date ? m.Date.toISOString() : m.Date,
      Username: m.Username,
      duration: m.duration,
      notes: m.notes
    }))
  } catch (e) {
    meditations.value = []
  }
}

async function fetchUserData() {
  try {
    const res = await getCurrentUser()
    user.value = res.user
    emit('theme-changed', res.user.theme)
    if (res.user.language) {
      emit('language-changed', res.user.language)
    }
  } catch (e) {
    // Silently handle error - user will be logged out if token invalid
  }
}

function playAlert() {
  if (!alertAudio.value) {
    alertAudio.value = new Audio('./alert.mp3')
  }
  alertAudio.value.currentTime = 0
  alertAudio.value.play()
}

function playBellSound() {
  if (bellAudioInstance) {
    bellAudioInstance.pause()
    bellAudioInstance.currentTime = 0
  }
  
  bellAudioInstance = new Audio(`./bell${bellSound.value}.mp3`)
  bellAudioInstance.volume = 0.5
  bellAudioInstance.play().catch(() => {
    // Bell sound playback failed silently
  })
}

async function stopMeditation() {
  meditationActive.value = false
  stopBreathingCycle()
  if (meditationIntervalId) clearInterval(meditationIntervalId)
  playAlert()
}

async function finishMeditation() {
  meditationActive.value = false
  stopBreathingCycle()
  if (meditationIntervalId) clearInterval(meditationIntervalId)
  playAlert()
  
  completedMeditationDuration.value = (selectedDuration.value * 60) - meditationSeconds.value
  showNotes.value = true
}

async function saveSessionNotes(notes: string) {
  try {
    await createMeditation(
      new Date().toISOString(),
      Math.round(completedMeditationDuration.value / 60),
      notes
    )
    await fetchMeditations()
    await fetchUserData()
    showNotes.value = false
  } catch (e) {
    // Error saving meditation - UI can handle gracefully
  }
}

async function skipSessionNotes() {
  try {
    await createMeditation(
      new Date().toISOString(),
      Math.round(completedMeditationDuration.value / 60),
      ''
    )
    await fetchMeditations()
    await fetchUserData()
    showNotes.value = false
  } catch (e) {
    // Error saving meditation - UI can handle gracefully
  }
}

const ANIMATIONS = [ZenWindAnimation, ZenWavesAnimation, ZenBreatheAnimation, ZenParticlesAnimation, ZenLavaAnimation]
const meditationAnimationIdx = ref(0)

async function startMeditation() {
  if (meditationActive.value) return
  meditationActive.value = true
  meditationSeconds.value = selectedDuration.value * 60
  lastBellTime = 0
  meditationAnimationIdx.value = Math.floor(Math.random() * ANIMATIONS.length)
  meditationIntervalId = window.setInterval(() => {
    if (meditationSeconds.value > 0) {
      meditationSeconds.value--
      
      // Check for interval bells
      if (bellEnabled.value && bellInterval.value > 0) {
        const totalSeconds = selectedDuration.value * 60
        const elapsedSeconds = totalSeconds - meditationSeconds.value
        const elapsedMinutes = elapsedSeconds / 60
        const currentBellMinute = Math.floor(elapsedMinutes / bellInterval.value) * bellInterval.value
        
        if (currentBellMinute > lastBellTime && elapsedMinutes >= bellInterval.value) {
          playBellSound()
          lastBellTime = currentBellMinute
        }
      }
    } else {
      finishMeditation()
    }
  }, 1000)
  playAlert()
  if (selectedBreathingExercise.value) {
    startBreathingCycle()
  }
}

onMounted(async () => {
  phraseIntervalId = window.setInterval(setRandomPhrase, 10000)
  if (token.value) {
    try {
      await fetchUserData()
      await fetchMeditations()
    } catch (e) {
      // Session expired or error - logout user
      token.value = null
    }
  }
})
onUnmounted(() => {
  if (phraseIntervalId) clearInterval(phraseIntervalId)
  if (meditationIntervalId) clearInterval(meditationIntervalId)
  if (centerTextTimeout) clearTimeout(centerTextTimeout)
  stopBreathingCycle()
})

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const user = ref<{ username: string, theme?: string, stats?: any, goals?: any } | null>(null)
const token = ref<string | null>(null)

async function handleAuth(evt: { user: any, token: string }) {
  user.value = evt.user
  token.value = evt.token
  emit('user-changed', evt.user)
  await fetchUserData()
  await fetchMeditations()
  if (evt.user && evt.user.theme) {
    emit('theme-changed', evt.user.theme)
  }
  if (evt.user && evt.user.language) {
    emit('language-changed', evt.user.language)
  }
}

async function handleLogout() {
  try {
    await logout()
    user.value = null
    token.value = null
    emit('user-changed', null)
  } catch (error) {
    console.error('Logout error:', error)
  }
}


</script>

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
.meditation-timer {
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
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
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
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
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
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

.meditation-btn {
  background: transparent;
  position: absolute;
  bottom: 2rem;
  color: var(--text1);
  cursor: pointer;
  transition: background 0.35s cubic-bezier(0.4, 0, 0.2, 1),
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

.meditation-btn:hover, .meditation-btn:focus {
  background: var(--blur1);
  color: var(--text2);
  box-shadow: 0 2px 16px 0 var(--input-border);
  transform: translateY(-1px);
}

.meditation-btn:active {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.08s;
}

.timer-display {
  font-size: 1.3rem;
  color: var(--text1);
  position: absolute;
  bottom: 6rem;
}

/* Bottom Navigation Bar */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--base1) 85%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--input-border);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 0.65rem;
  font-weight: 400;
  cursor: pointer;
  border-radius: 8px;
  transition: color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.02em;
  position: relative;
  min-width: 52px;
}

.nav-item svg {
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item span {
  line-height: 1;
  white-space: nowrap;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover {
  color: var(--text1);
  background: var(--input-bg-focus);
}

.nav-item:hover svg {
  opacity: 1;
  transform: translateY(-1px);
}

.nav-item:active {
  transform: scale(0.93);
  transition-duration: 0.1s;
}

.nav-logout {
  color: color-mix(in srgb, var(--text2) 60%, transparent);
}

.nav-logout:hover {
  color: var(--text1);
}

/* Journal nav active state */
.nav-active {
  color: var(--text1) !important;
  background: var(--button-bg) !important;
  position: relative;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.05);
}

.nav-active svg {
  opacity: 1 !important;
  transform: translateY(-1px);
}

.nav-active::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 16px;
  height: 2px;
  background: var(--text1);
  border-radius: 1px;
  opacity: 0.6;
  animation: navIndicatorIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes navIndicatorIn {
  from {
    transform: translateX(-50%) scaleX(0);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) scaleX(1);
    opacity: 0.6;
  }
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
  from { opacity: 0; }
  to { opacity: 1; }
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
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
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

/* Breathing Toggle Button (during meditation toolbar) */
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

/* Breathing Sphere Overlay (during meditation) */
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
  background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.15), rgba(255,255,255,0.03));
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 0 40px rgba(255,255,255,0.05), inset 0 0 30px rgba(255,255,255,0.03);
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
  from { transform: scale(1); opacity: 0.6; }
  to { transform: scale(1.6); opacity: 1; }
}

@keyframes sphereBreathOut {
  from { transform: scale(1.6); opacity: 1; }
  to { transform: scale(1); opacity: 0.6; }
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

.dropdown-backdrop-inline {
  display: none;
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
  from { opacity: 0; }
  to { opacity: 1; }
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

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .bottom-nav {
    padding: 0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom));
  }

  .nav-item {
    font-size: 0.7rem;
    gap: 0.3rem;
    padding: 0.5rem 0.4rem;
    min-width: 56px;
  }

  .nav-item svg {
    width: 26px;
    height: 26px;
  }

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

  .breathing-sphere {
    width: 120px;
    height: 120px;
  }

  .breathing-sphere-text {
    font-size: 0.7rem;
  }

  .duration-btn {
    min-width: 60px;
    min-height: 44px;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    /* Better touch feedback */
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
}

@media (max-width: 480px) {
  .bottom-nav {
    gap: 0;
  }

  .nav-item {
    font-size: 0.65rem;
    gap: 0.25rem;
    padding: 0.45rem 0.3rem;
    min-width: 50px;
  }

  .nav-item svg {
    width: 24px;
    height: 24px;
  }

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
}

/* Landscape orientation on mobile */
@media (max-height: 500px) and (max-width: 900px) {
  .bottom-nav {
    flex-direction: row;
    padding: 0.25rem 0.5rem;
  }

  .nav-item {
    font-size: 0.6rem;
  }

  .nav-item svg {
    width: 22px;
    height: 22px;
  }

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

/* Very small screens */
@media (max-width: 360px) {
  .nav-item {
    font-size: 0.6rem;
    gap: 0.4rem;
    padding: 0.2rem 0.2rem;
    min-width: 46px;
  }

  .nav-item svg {
    width: 22px;
    height: 22px;
  }

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
  
  .meditation-btn {
    font-size: 0.95rem;
    padding: 0.7em 2em;
    min-height: 48px;
  }
}

/* Mobile optimizations for bell config panels */
@media (max-width: 768px) {
  .dropdown-backdrop-inline {
    display: block;
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 1001;
  }

  @keyframes slideUpMobile {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

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

  /* Make bell settings toolbar more mobile-friendly */
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
    min-width: 32px;
    min-height: 32px;
    padding: 0.3rem;
  }

  .bell-toggle-btn svg {
    width: 12px;
    height: 12px;
  }

  .bell-dropdown-btn {
    min-height: 32px;
    padding: 0.3rem 0.5rem;
    font-size: 0.7rem;
    min-width: 44px;
  }

  .bell-settings {
    gap: 0.3rem;
  }

  .toolbar-divider {
    height: 18px;
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
}

</style>
