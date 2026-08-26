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
});
