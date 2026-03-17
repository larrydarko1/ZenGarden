<template>
    <div class="calendar-inline">
        <div class="calendar-header">
            <button
                class="calendar-arrow"
                :disabled="visibleMonth === 0"
                aria-label="Previous month"
                @click="prevMonth"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
            <span class="calendar-title">{{ monthNames[visibleMonth] }} {{ year }}</span>
            <button class="calendar-arrow" :disabled="visibleMonth === 11" aria-label="Next month" @click="nextMonth">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        </div>

        <div class="calendar-body">
            <div class="calendar-grid-section">
                <div class="calendar-weekdays">
                    <span v-for="d in weekdays" :key="d">{{ d }}</span>
                </div>
                <div class="calendar-days">
                    <span
                        v-for="(day, idx) in getDaysInMonth(year, visibleMonth)"
                        :key="idx"
                        :class="[
                            'calendar-day',
                            day.date && day.isToday ? 'today' : '',
                            day.date && day.complete === true ? 'complete' : '',
                            day.date && day.complete === false ? 'incomplete' : '',
                            selectedDay && day.date && getLocalDateKey(day.date) === getLocalDateKey(selectedDay)
                                ? 'selected'
                                : '',
                        ]"
                        :style="{ cursor: day.date && day.complete ? 'pointer' : 'default' }"
                        @click="day.date && day.complete ? (selectedDay = day.date) : null"
                    >
                        {{ day.date ? day.date.getDate() : '' }}
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();

type Meditation = {
    Date: string | { $date: string };
    Username?: string;
    duration?: number;
    notes?: string;
};

const props = defineProps<{ meditations: Array<Meditation> }>();
const today = new Date();
const year = today.getFullYear();
const weekdays = computed(() => tm('calendar.weekdays') as string[]);
const monthNames = computed(() => tm('calendar.months') as string[]);
const visibleMonth = ref(today.getMonth());
const selectedDay = ref<Date | null>(null);

const selectedDayMeditations = computed(() => {
    if (!selectedDay.value) return [];
    const key = getLocalDateKey(selectedDay.value);
    return props.meditations.filter((m) => {
        let dateValue: string | Date | undefined = undefined;
        if (m.Date && typeof m.Date === 'object' && '$date' in m.Date) {
            dateValue = m.Date.$date;
        } else if (m.Date) {
            dateValue = m.Date;
        }
        if (dateValue) {
            const d = new Date(dateValue);
            return getLocalDateKey(d) === key;
        }
        return false;
    });
});

function prevMonth() {
    if (visibleMonth.value > 0) visibleMonth.value--;
}
function nextMonth() {
    if (visibleMonth.value < 11) visibleMonth.value++;
}

function getLocalDateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number) {
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const offset = firstDay.getDay();
    const completedMap: Record<string, boolean> = {};
    for (const m of props.meditations) {
        let dateValue: string | Date | undefined = undefined;
        if (m.Date && typeof m.Date === 'object' && '$date' in m.Date) {
            dateValue = m.Date.$date;
        } else if (m.Date) {
            dateValue = m.Date;
        }
        if (dateValue) {
            const d = new Date(dateValue);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const key = getLocalDateKey(d);
                completedMap[key] = true;
            }
        }
    }
    for (let i = 0; i < offset; i++) {
        days.push({ date: null });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const key = getLocalDateKey(date);
        days.push({
            date,
            isToday: date.toDateString() === today.toDateString(),
            complete: completedMap[key] === true,
        });
    }
    return days;
}
</script>

<style scoped>
.calendar-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.calendar-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 0.5rem 0;
}

.calendar-title {
    color: var(--text1);
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    min-width: 140px;
    text-align: center;
}

.calendar-arrow {
    background: transparent;
    border: 1px solid var(--input-border);
    color: var(--text2);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.calendar-arrow:hover {
    color: var(--text1);
    border-color: var(--text2);
    background: var(--input-bg);
}

.calendar-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.calendar-arrow:disabled:hover {
    color: var(--text2);
    border-color: var(--input-border);
    background: transparent;
}

.calendar-body {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    width: 100%;
}

.calendar-grid-section {
    flex: 1;
    min-width: 0;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1.25rem;
}

.calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    color: var(--text2);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.5rem;
    text-align: center;
}

.calendar-weekdays span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.2em;
}

.calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
}

.calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: var(--text1);
    opacity: 0.45;
    font-size: 0.78rem;
    cursor: default;
    transition: all 0.15s ease;
}

.calendar-day.today {
    border: 1px solid var(--border-subtle);
    opacity: 1;
    font-weight: 500;
}

.calendar-day.complete {
    background: var(--border-subtle);
    color: var(--text1);
    opacity: 1;
    cursor: pointer;
}

.calendar-day.complete:hover {
    background: color-mix(in srgb, var(--border-subtle) 80%, var(--text1) 20%);
}

.calendar-day.selected {
    outline: 2px solid var(--input-border-focus);
    outline-offset: -2px;
}

.calendar-day.incomplete {
    opacity: 0.45;
}

.calendar-day:hover {
    opacity: 0.8;
}

/* Meditation Details Panel */
.meditation-details {
    flex: 0 0 280px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1.25rem;
    max-height: 380px;
    overflow-y: auto;
}

.meditation-details h3 {
    margin: 0 0 1rem 0;
    font-size: 0.7rem;
    color: var(--text2);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.meditation-entry {
    padding: 0.75rem 0;
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
    letter-spacing: 0.03em;
}

.meditation-notes {
    font-size: 0.7rem;
    color: var(--text2);
    line-height: 1.5;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--input-bg) 50%, var(--base1) 50%);
    border: 1px solid var(--input-border);
    border-radius: 6px;
}

.meditation-notes strong {
    color: var(--text1);
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Responsive */
@media (max-width: 768px) {
    .calendar-body {
        flex-direction: column;
        gap: 1rem;
    }

    .calendar-grid-section {
        padding: 1rem;
    }

    .calendar-weekdays {
        font-size: 0.7rem;
    }

    .calendar-day {
        font-size: 0.82rem;
    }

    .meditation-details {
        flex: none;
        width: 100%;
        max-height: 260px;
    }

    .calendar-arrow {
        width: 40px;
        height: 40px;
        touch-action: manipulation;
    }

    .calendar-title {
        font-size: 0.85rem;
    }
}

@media (max-width: 480px) {
    .calendar-grid-section {
        padding: 0.75rem;
    }

    .calendar-day {
        font-size: 0.78rem;
    }

    .meditation-details {
        padding: 1rem;
        max-height: 220px;
    }
}
</style>
