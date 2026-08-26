import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithI18n } from '@test-utils';
import MeditationCalendar from '@/renderer/components/MeditationCalendar.vue';

const NOW = new Date(2025, 2, 12, 9, 0, 0);

const iso = (year: number, month: number, day: number) => new Date(year, month, day, 12).toISOString();

const mountCalendar = (meditations: unknown[] = []) => mountWithI18n(MeditationCalendar, { props: { meditations } });

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('MeditationCalendar', () => {
    it('opens on the current month and year', () => {
        const wrapper = mountCalendar();

        expect(wrapper.find('.calendar-title').text()).toBe('March 2025');
        wrapper.unmount();
    });

    it('names all seven weekday columns', () => {
        const wrapper = mountCalendar();

        expect(wrapper.findAll('.calendar-weekdays span')).toHaveLength(7);
        wrapper.unmount();
    });

    it('pads the grid so the first of the month lands on its real weekday', () => {
        const wrapper = mountCalendar();

        // 1 March 2025 is a Saturday: six blanks, then 31 days.
        const cells = wrapper.findAll('.calendar-day');
        expect(cells).toHaveLength(6 + 31);
        expect(cells.slice(0, 6).every((cell) => cell.text() === '')).toBe(true);
        expect(cells[6].text()).toBe('1');
        wrapper.unmount();
    });

    it('marks today', () => {
        const wrapper = mountCalendar();

        const today = wrapper.findAll('.calendar-day').filter((cell) => cell.classes().includes('today'));
        expect(today.map((cell) => cell.text())).toEqual(['12']);
        wrapper.unmount();
    });

    it('marks the days a session was recorded on, and only those', () => {
        const wrapper = mountCalendar([{ date: iso(2025, 2, 5) }, { date: iso(2025, 2, 20) }]);

        const complete = wrapper.findAll('.calendar-day').filter((cell) => cell.classes().includes('complete'));
        expect(complete.map((cell) => cell.text())).toEqual(['5', '20']);
        wrapper.unmount();
    });

    it('reads the Mongo-wrapped date shape as well as a plain string', () => {
        const wrapper = mountCalendar([{ date: { $date: iso(2025, 2, 7) } }]);

        const complete = wrapper.findAll('.calendar-day').filter((cell) => cell.classes().includes('complete'));
        expect(complete.map((cell) => cell.text())).toEqual(['7']);
        wrapper.unmount();
    });

    it('skips a record whose date is empty or unparseable rather than throwing', () => {
        const wrapper = mountCalendar([{ date: '' }, { date: 'not-a-date' }, { date: iso(2025, 2, 9) }]);

        const complete = wrapper.findAll('.calendar-day').filter((cell) => cell.classes().includes('complete'));
        expect(complete.map((cell) => cell.text())).toEqual(['9']);
        wrapper.unmount();
    });

    it('only lets a day with a session be clicked', () => {
        const wrapper = mountCalendar([{ date: iso(2025, 2, 5) }]);

        const cells = wrapper.findAll('.calendar-day');
        const fifth = cells.find((cell) => cell.classes().includes('complete'));
        const sixth = cells.find((cell) => cell.text() === '6');
        expect(fifth?.attributes('disabled')).toBeUndefined();
        expect(sixth?.attributes('disabled')).toBeDefined();
        wrapper.unmount();
    });

    it('opens the day panel with the sessions recorded on it', async () => {
        const wrapper = mountCalendar([
            { date: iso(2025, 2, 5), duration: 12, notes: 'quiet' },
            { date: iso(2025, 2, 20), duration: 30 },
        ]);

        await wrapper
            .findAll('.calendar-day')
            .filter((cell) => cell.classes().includes('complete'))[0]
            .trigger('click');

        const entries = wrapper.findAll('.meditation-entry');
        expect(entries).toHaveLength(1);
        expect(entries[0].find('.meditation-duration').text()).toContain('12');
        expect(entries[0].find('.meditation-notes').text()).toContain('quiet');
        wrapper.unmount();
    });

    it('omits the notes block for a session that was skipped', async () => {
        const wrapper = mountCalendar([{ date: iso(2025, 2, 5), duration: 12 }]);

        await wrapper
            .findAll('.calendar-day')
            .filter((cell) => cell.classes().includes('complete'))[0]
            .trigger('click');

        expect(wrapper.find('.meditation-notes').exists()).toBe(false);
        wrapper.unmount();
    });

    it('groups every session recorded on the same day into one panel', async () => {
        const wrapper = mountCalendar([
            { date: new Date(2025, 2, 5, 8).toISOString(), duration: 10 },
            { date: new Date(2025, 2, 5, 20).toISOString(), duration: 20 },
        ]);

        await wrapper
            .findAll('.calendar-day')
            .filter((cell) => cell.classes().includes('complete'))[0]
            .trigger('click');

        expect(wrapper.findAll('.meditation-entry')).toHaveLength(2);
        wrapper.unmount();
    });

    it('steps between months and stops at the ends of the year', async () => {
        const wrapper = mountCalendar();

        const [prev, next] = wrapper.findAll('.calendar-arrow');
        await next.trigger('click');
        expect(wrapper.find('.calendar-title').text()).toBe('April 2025');

        for (let i = 0; i < 4; i++) await prev.trigger('click');
        expect(wrapper.find('.calendar-title').text()).toBe('January 2025');
        expect(prev.attributes('disabled')).toBeDefined();

        for (let i = 0; i < 12; i++) await next.trigger('click');
        expect(wrapper.find('.calendar-title').text()).toBe('December 2025');
        expect(next.attributes('disabled')).toBeDefined();
        wrapper.unmount();
    });
});
