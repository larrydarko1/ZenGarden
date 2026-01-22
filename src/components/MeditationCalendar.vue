<template>
  <div class="calendar-modal-bg" @click.self="$emit('close')" aria-label="Calendar modal background, click to close">
    <div class="calendar-modal calendar-modal-focused" role="dialog" aria-labelledby="calendar-title" aria-modal="true">
      <div class="calendar-header">
        <button class="calendar-arrow" @click="prevMonth" :disabled="visibleMonth === 0" aria-label="Previous month">&#8592;</button>
        <span class="calendar-title" id="calendar-title">{{ monthNames[visibleMonth] }} {{ year }}</span>
        <button class="calendar-arrow" @click="nextMonth" :disabled="visibleMonth === 11" aria-label="Next month">&#8594;</button>
        <button class="calendar-close" @click="$emit('close')" aria-label="Close calendar">×</button>
      </div>
      <div class="calendar-content">
        <div class="calendar-month calendar-month-focused">
          <div class="calendar-month-title">{{ monthNames[visibleMonth] }}</div>
          <div class="calendar-weekdays" role="row">
            <span v-for="d in weekdays" :key="d" role="columnheader">{{ d }}</span>
          </div>
          <div class="calendar-days" role="grid">
            <span
              v-for="(day, idx) in getDaysInMonth(year, visibleMonth)"
              :key="idx"
              :class="['calendar-day',
                day.date && day.isToday ? 'today' : '',
                day.date && day.complete === true ? 'complete' : '',
                day.date && day.complete === false ? 'incomplete' : '',
                selectedDay && day.date && getLocalDateKey(day.date) === getLocalDateKey(selectedDay) ? 'selected' : '']"
              role="gridcell"
              :aria-label="day.date ? `${day.date.getDate()} ${monthNames[visibleMonth]} ${year}${day.isToday ? ', today' : ''}${day.complete === true ? ', meditation completed' : day.complete === false ? ', meditation incomplete' : ', no meditation recorded'}` : ''"
              @click="day.date && day.complete ? selectedDay = day.date : null"
              :style="{ cursor: day.date && day.complete ? 'pointer' : 'default' }"
            >
              <span style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                <span>{{ day.date ? day.date.getDate() : '' }}</span>
              </span>
            </span>
          </div>
        </div>
        <div v-if="selectedDay && selectedDayMeditations.length > 0" class="meditation-details">
          <h3>{{ monthNames[selectedDay.getMonth()] }} {{ selectedDay.getDate() }}</h3>
          <div v-for="(med, idx) in selectedDayMeditations" :key="idx" class="meditation-entry">
            <div class="meditation-info">
              <span class="meditation-duration">⏱ {{ med.duration || 0 }} {{ t('calendar.minutes') }}</span>
            </div>
            <div v-if="med.notes" class="meditation-notes">
              <strong>{{ t('calendar.notes') }}:</strong> {{ med.notes }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, tm } = useI18n()

type Meditation = {
  Date: string | { $date: string }
  Username?: string
  duration?: number
  notes?: string
}

const props = defineProps<{ meditations: Array<Meditation> }>()
const today = new Date()
const year = today.getFullYear()
const weekdays = computed(() => tm('calendar.weekdays') as string[])
const monthNames = computed(() => tm('calendar.months') as string[])
const visibleMonth = ref(today.getMonth())
const selectedDay = ref<Date | null>(null)

const selectedDayMeditations = computed(() => {
  if (!selectedDay.value) return []
  const key = getLocalDateKey(selectedDay.value)
  return props.meditations.filter(m => {
    let dateValue: string | Date | undefined = undefined
    if (m.Date && typeof m.Date === 'object' && '$date' in m.Date) {
      dateValue = m.Date.$date
    } else if (m.Date) {
      dateValue = m.Date
    }
    if (dateValue) {
      const d = new Date(dateValue)
      return getLocalDateKey(d) === key
    }
    return false
  })
})

function prevMonth() {
  if (visibleMonth.value > 0) visibleMonth.value--
}
function nextMonth() {
  if (visibleMonth.value < 11) visibleMonth.value++
}

function getLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number) {
  const days = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const offset = firstDay.getDay()
  const completedMap: Record<string, boolean> = {}
  for (const m of props.meditations) {
    let dateValue: string | Date | undefined = undefined;
    if (m.Date && typeof m.Date === 'object' && '$date' in m.Date) {
      dateValue = m.Date.$date;
    } else if (m.Date) {
      dateValue = m.Date;
    }
    if (dateValue) {
      const d = new Date(dateValue)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = getLocalDateKey(d)
        completedMap[key] = true
      }
    }
  }
  for (let i = 0; i < offset; i++) {
    days.push({ date: null })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const key = getLocalDateKey(date)
    days.push({
      date,
      isToday: date.toDateString() === today.toDateString(),
      complete: completedMap[key] === true,
    })
  }
  return days
}
</script>

<style scoped>
.calendar-modal-bg {
  position: fixed;
  inset: 0;
  background: var(--blur2);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  z-index: 100;
  padding: 0;
}
.calendar-modal {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 1rem;
  max-width: 800px;
  max-height: 90vh;
  width: 100%;
  height: auto;
  margin: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.calendar-modal-focused {
  border-radius: 6px;
  max-width: 800px;
  max-height: 90vh;
  width: 100%;
  height: auto;
  margin: auto;
}
.calendar-content {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  overflow-y: auto;
}
.calendar-month-focused {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 0.75rem;
  width: 100%;
  min-width: 0;
  height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}
.calendar-arrow {
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: color 0.15s;
}
.calendar-arrow:hover {
  color: var(--text1);
}
.calendar-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.calendar-arrow:disabled:hover {
  color: var(--text2);
}
.calendar-month-title {
  color: var(--text2);
  font-size: 0.75rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.35rem 0.5rem;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  cursor: default;
}
.calendar-title {
  color: var(--text1);
  font-size: 0.875rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: default;
}
.calendar-close {
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: color 0.15s;
}
.calendar-close:hover {
  color: var(--text1);
}
.calendar-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  color: var(--text2);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  cursor: default;
}
.calendar-weekdays span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
}
.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}
.calendar-day {
  width: 2em;
  height: 2em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--text1);
  opacity: 0.6;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.calendar-day.today {
  border: 1px solid var(--border-subtle);
  opacity: 1;
}
.calendar-day.complete, .calendar-day.complete:hover {
  background: var(--border-subtle);
  color: var(--text1);
  opacity: 1;
}
.calendar-day.selected {
  outline: 2px solid var(--input-border-focus);
  outline-offset: -2px;
}
.meditation-details {
  flex: 1;
  min-width: 220px;
  height: 380px;
  padding: 0.75rem;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  align-self: stretch;
  overflow-y: auto;
  box-sizing: border-box;
}
.meditation-details h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.75rem;
  color: var(--text2);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.meditation-entry {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--input-border);
}
.meditation-entry:last-child {
  border-bottom: none;
}
.meditation-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.meditation-duration {
  font-size: 0.75rem;
  color: var(--text1);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.meditation-notes {
  font-size: 0.7rem;
  color: var(--text2);
  line-height: 1.4;
  padding: 0.5rem;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 4px;
}
.meditation-notes strong {
  color: var(--text1);
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.calendar-day.incomplete {
  color: var(--text1);
  opacity: 0.6;
}
.calendar-day:hover {
  opacity: 1;
  background: var(--input-bg-focus);
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .calendar-modal-bg {
    padding: 0;
    align-items: stretch;
  }

  .calendar-modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
    margin: 0;
    width: 100%;
    height: 100%;
    padding: 1.25rem;
    animation: slideInFromBottom 0.3s ease-out;
  }

  @keyframes slideInFromBottom {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .calendar-modal-focused {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .calendar-header {
    padding: 0.75rem 0.5rem;
    margin-bottom: 1.25rem;
    min-height: 56px;
  }

  .calendar-title {
    font-size: 1rem;
    flex: 1;
    text-align: center;
  }

  .calendar-arrow,
  .calendar-close {
    font-size: 1.4rem;
    padding: 0.5rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .calendar-content {
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .calendar-month-focused {
    height: auto;
    min-height: 360px;
    width: 100%;
    padding: 1.25rem;
  }

  .calendar-month-title {
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .calendar-weekdays {
    font-size: 0.8rem;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .calendar-weekdays span {
    width: 2.75em;
    height: 2.75em;
  }

  .calendar-days {
    gap: 0.5rem;
  }

  .calendar-day {
    width: 2.75em;
    height: 2.75em;
    font-size: 0.9rem;
    touch-action: manipulation;
  }

  .meditation-details {
    height: auto;
    min-height: 200px;
    max-height: 350px;
    min-width: 100%;
    padding: 1.25rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .meditation-details h3 {
    font-size: 1rem;
    margin-bottom: 1.25rem;
  }

  .meditation-entry {
    padding: 1rem 0;
    border-bottom: 1px solid var(--input-border);
  }

  .meditation-entry:last-child {
    border-bottom: none;
  }

  .meditation-info {
    margin-bottom: 0.75rem;
  }

  .meditation-duration {
    font-size: 0.9rem;
  }

  .meditation-notes {
    font-size: 0.85rem;
    padding: 0.875rem;
    line-height: 1.5;
  }

  .meditation-notes strong {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    display: block;
  }
}

@media (max-width: 480px) {
  .calendar-modal {
    padding: 1rem;
  }

  .calendar-header {
    padding: 0.5rem;
    margin-bottom: 1rem;
  }

  .calendar-title {
    font-size: 0.9rem;
  }

  .calendar-arrow,
  .calendar-close {
    font-size: 1.3rem;
    width: 40px;
    height: 40px;
  }

  .calendar-month-focused {
    padding: 1rem;
    min-height: 320px;
  }

  .calendar-month-title {
    font-size: 0.8rem;
  }

  .calendar-weekdays {
    font-size: 0.75rem;
    gap: 0.35rem;
  }

  .calendar-weekdays span {
    width: 2.4em;
    height: 2.4em;
  }

  .calendar-days {
    gap: 0.35rem;
  }

  .calendar-day {
    width: 2.4em;
    height: 2.4em;
    font-size: 0.85rem;
  }

  .meditation-details {
    padding: 1rem;
    max-height: 280px;
  }

  .meditation-details h3 {
    font-size: 0.95rem;
  }

  .meditation-duration {
    font-size: 0.85rem;
  }

  .meditation-notes {
    font-size: 0.8rem;
    padding: 0.75rem;
  }

  .meditation-notes strong {
    font-size: 0.8rem;
  }
}

/* Very small screens */
@media (max-width: 360px) {
  .calendar-modal {
    padding: 0.75rem;
  }

  .calendar-weekdays span {
    width: 2.2em;
    height: 2.2em;
  }

  .calendar-day {
    width: 2.2em;
    height: 2.2em;
    font-size: 0.8rem;
  }
}

/* Landscape orientation on mobile */
@media (max-height: 500px) and (max-width: 900px) {
  .calendar-modal {
    padding: 0.75rem;
  }

  .calendar-content {
    flex-direction: row;
    gap: 1rem;
  }

  .calendar-month-focused {
    min-height: auto;
    height: auto;
    flex: 1;
    padding: 1rem;
  }

  .calendar-weekdays span {
    width: 2.2em;
    height: 2.2em;
  }

  .calendar-day {
    width: 2.2em;
    height: 2.2em;
  }

  .meditation-details {
    flex: 1;
    max-height: none;
    height: auto;
  }
}
</style>
