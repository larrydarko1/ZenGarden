import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenPhilosophy from '@/renderer/components/ZenPhilosophy.vue';

describe('ZenPhilosophy', () => {
    it('renders one section per principle', () => {
        const wrapper = mountWithI18n(ZenPhilosophy);

        expect(wrapper.findAll('.philosophy-section')).toHaveLength(5);
        wrapper.unmount();
    });

    it('gives every section a translated heading and body, with no key left showing', () => {
        const wrapper = mountWithI18n(ZenPhilosophy);

        for (const section of wrapper.findAll('.philosophy-section')) {
            expect(section.find('h3').text()).not.toBe('');
            expect(section.find('h3').text()).not.toContain('philosophy.');
            expect(section.find('p').text()).not.toBe('');
            expect(section.find('p').text()).not.toContain('philosophy.');
        }
        wrapper.unmount();
    });

    it('pairs each section with its own icon', () => {
        const wrapper = mountWithI18n(ZenPhilosophy);

        const icons = wrapper.findAll('.section-icon svg');
        expect(icons).toHaveLength(5);
        expect(new Set(icons.map((icon) => icon.html())).size).toBe(5);
        wrapper.unmount();
    });

    it('closes the page with the quote and its attribution', () => {
        const wrapper = mountWithI18n(ZenPhilosophy);

        expect(wrapper.find('.quote-text').text()).not.toBe('');
        expect(wrapper.find('.quote-author').text()).not.toBe('');
        wrapper.unmount();
    });
});
