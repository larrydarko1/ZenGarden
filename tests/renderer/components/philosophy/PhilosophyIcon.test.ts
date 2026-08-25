import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import PhilosophyIcon, { type PhilosophyIconName } from '@/renderer/components/philosophy/PhilosophyIcon.vue';

const NAMES: PhilosophyIconName[] = ['practice', 'noGoals', 'noStreaks', 'silence', 'observation'];

describe('PhilosophyIcon', () => {
    it.each(NAMES)('renders a drawn glyph for %s', (name) => {
        const wrapper = mountWithI18n(PhilosophyIcon, { props: { name } });

        expect(wrapper.findAll('path, circle').length).toBeGreaterThan(0);
        wrapper.unmount();
    });

    it('gives each name its own glyph, so no two sections look alike', () => {
        const drawn = NAMES.map((name) => {
            const wrapper = mountWithI18n(PhilosophyIcon, { props: { name } });
            const html = wrapper.html();
            wrapper.unmount();
            return html;
        });

        expect(new Set(drawn).size).toBe(NAMES.length);
    });

    it('takes its colour from the surrounding text rather than hardcoding one', () => {
        const wrapper = mountWithI18n(PhilosophyIcon, { props: { name: 'practice' } });

        for (const shape of wrapper.findAll('path')) {
            expect(shape.attributes('fill')).toBe('currentColor');
        }
        wrapper.unmount();
    });

    it('is decorative — the section heading beside it carries the meaning', () => {
        const wrapper = mountWithI18n(PhilosophyIcon, { props: { name: 'silence' } });

        expect(wrapper.attributes('aria-hidden')).toBe('true');
        expect(wrapper.attributes('focusable')).toBe('false');
        wrapper.unmount();
    });
});
