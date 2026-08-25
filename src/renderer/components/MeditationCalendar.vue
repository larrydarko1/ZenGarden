<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

type Meditation = {
    date: string | { $date: string };
    username?: string;
    duration?: number;
    notes?: string;
};

type CalendarDay = { date: Date | null; isToday?: boolean; complete?: boolean };

const props = defineProps<{ meditations: Meditation[] }>();

const i18n = useI18n();
const { t } = i18n;
const today = new Date();
const year = today.getFullYear();

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const weekdays = computed<string[]>(() => i18n.tm('calendar.weekdays') as string[]);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const monthNames = computed<string[]>(() => i18n.tm('calendar.months') as string[]);
const visibleMonth = ref(today.getMonth());
const selectedDay = ref<Date | null>(null);

const selectedDayMeditations = computed<Meditation[]>(() => {
    if (selectedDay.value === null) return [];
    const key = getLocalDateKey(selectedDay.value);
    return props.meditations.filter((meditation) => {
        const date = findMeditationDate(meditation);
        return date !== null && getLocalDateKey(date) === key;
    });
});

function prevMonth(): void {
    if (visibleMonth.value > 0) visibleMonth.value--;
}
function nextMonth(): void {
    if (visibleMonth.value < 11) visibleMonth.value++;
}

function findMeditationDate(meditation: Meditation): Date | null {
    const raw = typeof meditation.date === 'string' ? meditation.date : meditation.date.$date;
    if (raw.length === 0) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLocalDateKey(date: Date): string {
    const fullYear = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${fullYear}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number): CalendarDay[] {
    const days: CalendarDay[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const offset = firstDay.getDay();
    const completedMap: Record<string, boolean> = {};
    for (const meditation of props.meditations) {
        const date = findMeditationDate(meditation);
        if (date !== null && date.getFullYear() === year && date.getMonth() === month) {
            completedMap[getLocalDateKey(date)] = true;
        }
    }
    for (let i = 0; i < offset; i++) {
        days.push({ date: null });
    }
    for (let dayNumber = 1; dayNumber <= lastDay.getDate(); dayNumber++) {
        const date = new Date(year, month, dayNumber);
        days.push({
            date,
            isToday: date.toDateString() === today.toDateString(),
            complete: completedMap[getLocalDateKey(date)] === true,
        });
    }
    return days;
}

/** Only days with a recorded meditation open the notes panel. */
function isSelectableDay(day: CalendarDay): boolean {
    return day.date !== null && day.complete === true;
}

function selectDay(day: CalendarDay): void {
    if (isSelectableDay(day)) selectedDay.value = day.date;
}
</script>

<template>
    <div class="calendar-inline">
        <div class="calendar-header">
            <button
                class="calendar-arrow"
                :disabled="visibleMonth === 0"
                aria-label="Previous month"
                @click="prevMonth">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none">
                    <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </button>
            <span class="calendar-title">{{ monthNames[visibleMonth] }} {{ year }}</span>
            <button
                class="calendar-arrow"
                :disabled="visibleMonth === 11"
                aria-label="Next month"
                @click="nextMonth">
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none">
                    <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </button>
        </div>

        <div class="calendar-body">
            <div class="calendar-grid-section">
                <div class="calendar-weekdays">
                    <span
                        v-for="d in weekdays"
                        :key="d"
                        >{{ d }}</span
                    >
                </div>
                <div class="calendar-days">
                    <button
                        v-for="(day, idx) in getDaysInMonth(year, visibleMonth)"
                        :key="idx"
                        type="button"
                        class="calendar-day"
                        :class="[
                            day.date && day.isToday ? 'today' : '',
                            day.date && day.complete === true ? 'complete' : '',
                            day.date && day.complete === false ? 'incomplete' : '',
                            selectedDay && day.date && getLocalDateKey(day.date) === getLocalDateKey(selectedDay)
                                ? 'selected'
                                : '',
                        ]"
                        :disabled="!isSelectableDay(day)"
                        @click="selectDay(day)">
                        {{ day.date ? day.date.getDate() : '' }}
                    </button>
                </div>
            </div>

            <div
                v-if="selectedDay && selectedDayMeditations.length > 0"
                class="meditation-details">
                <h3>{{ monthNames[selectedDay.getMonth()] }} {{ selectedDay.getDate() }}</h3>
                <div
                    v-for="(med, idx) in selectedDayMeditations"
                    :key="idx"
                    class="meditation-entry">
                    <div class="meditation-info">
                        <span class="meditation-duration">⏱ {{ med.duration || 0 }} {{ t('calendar.minutes') }}</span>
                    </div>
                    <div
                        v-if="med.notes"
                        class="meditation-notes">
                        <strong>{{ t('calendar.notes') }}:</strong> {{ med.notes }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.calendar-inline {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: $space-5;
}

.calendar-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-6;
    padding: $space-2 0;
}

.calendar-title {
    color: $text1;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-7;
    min-width: $size-37;
    text-align: center;
}

.calendar-arrow {
    background: transparent;
    border: $border-width-thin $input-border;
    color: $text2;
    width: $size-17;
    height: $size-17;
    border-radius: $border-radius;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;
}

.calendar-arrow:hover {
    color: $text1;
    border-color: $text2;
    background: $input-bg;
}

.calendar-arrow:disabled {
    opacity: $opacity-lowest;
    cursor: not-allowed;
}

.calendar-arrow:disabled:hover {
    color: $text2;
    border-color: $input-border;
    background: transparent;
}

.calendar-body {
    display: flex;
    gap: $space-6;
    align-items: flex-start;
    width: 100%;
}

.calendar-grid-section {
    flex: 1;
    min-width: 0;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    padding: $space-5;
}

.calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: $space-1;
    color: $text2;
    font-size: $font-size-xxs;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-6;
    margin-bottom: $space-2;
    text-align: center;
}

.calendar-weekdays span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: $size-18;
}

.calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: $space-1;
}

.calendar-day {
    aspect-ratio: 1;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $border-radius;
    color: $text1;
    opacity: $opacity-low-mid;
    font-size: $font-size-xs;
    cursor: default;
    transition: all $transition-fast;
}

.calendar-day.today {
    border: $border-width-thin $border-subtle;
    opacity: $opacity-full;
    font-weight: $font-weight-medium;
}

.calendar-day.complete {
    background: $border-subtle;
    color: $text1;
    opacity: $opacity-full;
    cursor: pointer;
}

.calendar-day.complete:hover {
    background: color-mix(in srgb, $border-subtle 80%, $text1 20%);
}

.calendar-day.selected {
    outline: $border-width-thick $input-border-focus;
    outline-offset: -$size-1;
}

.calendar-day.incomplete {
    opacity: $opacity-low-mid;
}

.calendar-day:hover {
    opacity: $opacity-higher;
}

/* –––––– Meditation Details Panel –––––– */
.meditation-details {
    flex: 0 0 $size-43;
    background: $input-bg;
    border: $border-width-thin $input-border;
    border-radius: $border-radius-lg;
    padding: $space-5;
    max-height: $size-46;
    overflow-y: auto;
}

.meditation-details h3 {
    margin: 0 0 $space-4;
    font-size: $font-size-xs;
    color: $text2;
    font-weight: $font-weight-normal;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-6;
}

.meditation-entry {
    padding: $space-3 0;
    border-bottom: $border-width-thin $input-border;
}

.meditation-entry:last-child {
    border-bottom: none;
}

.meditation-info {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-2;
}

.meditation-duration {
    font-size: $font-size-xs;
    color: $text1;
    font-weight: $font-weight-normal;
    letter-spacing: $letter-spacing-2;
}

.meditation-notes {
    font-size: $font-size-xs;
    color: $text2;
    line-height: $line-height-base;
    padding: $space-3;
    background: color-mix(in srgb, $input-bg 50%, $base1 50%);
    border: $border-width-thin $input-border;
    border-radius: $border-radius;
}

.meditation-notes strong {
    color: $text1;
    display: block;
    margin-bottom: $space-1;
    font-size: $font-size-xxs;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-4;
}

/* –––––– Responsive –––––– */
@media (width <= #{$breakpoint-xl}) {
    .calendar-body {
        flex-direction: column;
        gap: $space-4;
    }

    .calendar-grid-section {
        padding: $space-4;
    }

    .calendar-weekdays {
        font-size: $font-size-xs;
    }

    .calendar-day {
        font-size: $font-size-sm;
    }

    .meditation-details {
        flex: none;
        width: 100%;
        max-height: $size-42;
    }

    .calendar-arrow {
        width: $size-20;
        height: $size-20;
        touch-action: manipulation;
    }

    .calendar-title {
        font-size: $font-size-sm;
    }
}

@media (width <= #{$breakpoint-md}) {
    .calendar-grid-section {
        padding: $space-3;
    }

    .calendar-day {
        font-size: $font-size-xs;
    }

    .meditation-details {
        padding: $space-4;
        max-height: $size-41;
    }
}
</style>
