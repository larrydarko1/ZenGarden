<template>
  <div class="breathing-modal-bg" @click.self="$emit('close')" aria-label="Breathing exercise modal background">
    <div class="breathing-modal" role="dialog" aria-labelledby="breathing-title" aria-modal="true">
      <div class="breathing-header">
        <h2 id="breathing-title">{{ t('breathing.title') }}</h2>
        <button class="breathing-close" @click="$emit('close')" aria-label="Close breathing exercises">×</button>
      </div>
      <div class="breathing-content">
        <div v-if="!activeExercise" class="exercise-list">
          <button
            v-for="ex in exercises"
            :key="ex.id"
            class="exercise-card"
            @click="startExercise(ex)"
          >
            <div class="exercise-info">
              <div class="exercise-name">{{ ex.name }}</div>
              <div class="exercise-description">{{ ex.description }}</div>
            </div>
          </button>
        </div>
        <div v-else class="exercise-active">
          <button class="back-btn" @click="stopExercise" aria-label="Back to exercise list">← {{ t('breathing.close') }}</button>
          <h3 class="exercise-title">{{ activeExercise.name }}</h3>
          <div class="breathing-visual">
            <div 
              class="breathing-circle" 
              :class="{ 'breathing-in': phase === 'in', 'breathing-hold': phase === 'hold', 'breathing-out': phase === 'out', 'breathing-hold-out': phase === 'holdOut' }"
              :style="{ animationDuration: `${phaseDuration}s` }"
            >
              <span class="breathing-text">{{ phaseText }}</span>
            </div>
          </div>
          <div class="breathing-instructions">
            <div class="cycle-count">{{ t('breathing.cycle') }} {{ cycleCount }}</div>
            <button class="exercise-btn" @click="stopExercise">{{ t('breathing.stop') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineEmits<{
  close: []
}>()

interface Exercise {
  id: string
  name: string
  description: string
  pattern: { phase: string; duration: number; text: string }[]
}

const exercises: Exercise[] = [
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

const activeExercise = ref<Exercise | null>(null)
const phase = ref<string>('in')
const phaseText = ref<string>('Breathe In')
const phaseDuration = ref<number>(4)
const cycleCount = ref<number>(1)
let phaseInterval: number | undefined

function startExercise(exercise: Exercise) {
  activeExercise.value = exercise
  cycleCount.value = 1
  runPattern()
}

function runPattern() {
  if (!activeExercise.value) return
  
  let patternIndex = 0
  const pattern = activeExercise.value.pattern
  
  function nextPhase() {
    if (!activeExercise.value) return
    
    const current = pattern[patternIndex]
    phase.value = current.phase
    phaseText.value = current.text
    phaseDuration.value = current.duration
    
    patternIndex++
    if (patternIndex >= pattern.length) {
      patternIndex = 0
      cycleCount.value++
    }
  }
  
  nextPhase()
  phaseInterval = window.setInterval(() => {
    nextPhase()
  }, phaseDuration.value * 1000)
}

function stopExercise() {
  activeExercise.value = null
  if (phaseInterval) {
    clearInterval(phaseInterval)
    phaseInterval = undefined
  }
}

onUnmounted(() => {
  stopExercise()
})
</script>

<style scoped>
.breathing-modal-bg {
  position: fixed;
  inset: 0;
  background: var(--blur2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.breathing-modal {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.breathing-header {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--input-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  background: var(--input-bg);
}

.breathing-header h2 {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text1);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.breathing-close {
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.2s, color 0.2s;
}

.breathing-close:hover {
  background: var(--input-bg-focus);
  color: var(--text1);
}

.breathing-content {
  padding: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.exercise-card {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.exercise-card:hover {
  background: var(--input-bg-focus);
  border-color: var(--border-subtle);
}

.exercise-info {
  flex: 1;
}

.exercise-name {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text1);
  margin-bottom: 0.2rem;
}

.exercise-description {
  font-size: 0.7rem;
  color: var(--text2);
  line-height: 1.3;
}

.exercise-active {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0;
}

.back-btn {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0;
  margin-bottom: 0.5rem;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--text1);
}

.exercise-title {
  font-size: 0.875rem;
  color: var(--text1);
  margin: 0 0 1rem 0;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.breathing-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  width: 100%;
}

.breathing-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--border-subtle);
  border: 1px solid var(--input-border-focus);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.3s ease;
}

.breathing-circle.breathing-in {
  animation: breatheIn ease-in-out forwards;
}

.breathing-circle.breathing-hold {
  transform: scale(1.5);
}

.breathing-circle.breathing-out {
  animation: breatheOut ease-in-out forwards;
}

.breathing-circle.breathing-hold-out {
  transform: scale(1);
}

@keyframes breatheIn {
  from { transform: scale(1); opacity: 0.6; }
  to { transform: scale(1.5); opacity: 1; }
}

@keyframes breatheOut {
  from { transform: scale(1.5); opacity: 1; }
  to { transform: scale(1); opacity: 0.6; }
}

.breathing-text {
  font-size: 0.8rem;
  color: var(--text1);
  font-weight: 400;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.breathing-instructions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.cycle-count {
  font-size: 0.75rem;
  color: var(--text2);
}

.exercise-btn {
  background: transparent;
  color: var(--text1);
  border: 1px solid var(--border-subtle);
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.15s;
}

.exercise-btn:hover {
  background: var(--input-bg-focus);
  border-color: var(--button-border-hover);
}
</style>
