import { describe, it, expect, vi } from 'vitest';
import { mountWithI18n } from '@test-utils';
import DailyNotes from '@/renderer/components/emotions/DailyNotes.vue';

const formatDate = vi.fn((date: Date | string) => `formatted:${String(date)}`);
const selectedDate = new Date('2025-01-15T00:00:00');

function mountNotes(dailyNote = '') {
    return mountWithI18n(DailyNotes, { props: { dailyNote, selectedDate, formatDate } });
}

describe('DailyNotes', () => {
    it('shows the note it was given rather than holding its own copy', () => {
        const wrapper = mountNotes('a quiet morning');

        expect(wrapper.find('textarea').element.value).toBe('a quiet morning');
        wrapper.unmount();
    });

    it('labels the entry with the date, formatted by the parent', () => {
        const wrapper = mountNotes();

        expect(wrapper.find('.notes-date-label').text()).toBe(`formatted:${String(selectedDate)}`);
        wrapper.unmount();
    });

    it('emits the new text and a note-input tick on every keystroke', async () => {
        const wrapper = mountNotes();

        const textarea = wrapper.find('textarea');
        textarea.element.value = 'typed';
        await textarea.trigger('input');

        expect(wrapper.emitted('update:dailyNote')).toEqual([['typed']]);
        expect(wrapper.emitted('note-input')).toHaveLength(1);
        wrapper.unmount();
    });

    it('counts characters against the same 2000 cap the field enforces', () => {
        const wrapper = mountNotes('four');

        expect(wrapper.find('textarea').attributes('maxlength')).toBe('2000');
        expect(wrapper.find('.character-count').text()).toBe('4 / 2000');
        wrapper.unmount();
    });

    it('gives the field an accessible name, not just a placeholder', () => {
        const wrapper = mountNotes();

        const textarea = wrapper.find('textarea');
        expect(textarea.attributes('aria-label')).toBeTruthy();
        expect(textarea.attributes('aria-label')).toBe(textarea.attributes('placeholder'));
        wrapper.unmount();
    });
});
