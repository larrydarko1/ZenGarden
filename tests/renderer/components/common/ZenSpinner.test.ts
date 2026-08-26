import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenSpinner from '@/renderer/components/common/ZenSpinner.vue';

describe('ZenSpinner', () => {
    it('defaults to the arc variant the auth screen uses', () => {
        const wrapper = mountWithI18n(ZenSpinner);

        expect(wrapper.find('circle').exists()).toBe(true);
        expect(wrapper.find('rect').exists()).toBe(false);
        wrapper.unmount();
    });

    it('draws the turning bar when asked for the bar variant', () => {
        const wrapper = mountWithI18n(ZenSpinner, { props: { variant: 'bar' } });

        expect(wrapper.find('rect').exists()).toBe(true);
        expect(wrapper.find('circle').exists()).toBe(false);
        wrapper.unmount();
    });

    it('keeps the .zen-loader root in both variants, which is what the buttons lay out', () => {
        for (const variant of ['arc', 'bar'] as const) {
            const wrapper = mountWithI18n(ZenSpinner, { props: { variant } });

            expect(wrapper.classes()).toContain('zen-loader');
            wrapper.unmount();
        }
    });

    it('hides itself from assistive technology — the button text carries the meaning', () => {
        const wrapper = mountWithI18n(ZenSpinner);

        expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true');
        wrapper.unmount();
    });

    it('spins forever, so a slow request never leaves a frozen indicator', () => {
        const wrapper = mountWithI18n(ZenSpinner);

        expect(wrapper.find('animateTransform').attributes('repeatCount')).toBe('indefinite');
        wrapper.unmount();
    });
});
