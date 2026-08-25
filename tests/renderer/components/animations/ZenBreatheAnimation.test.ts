import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenBreatheAnimation from '@/renderer/components/animations/ZenBreatheAnimation.vue';

describe('ZenBreatheAnimation', () => {
    it('renders the root the meditation background hooks its transitions to', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        expect(wrapper.find('.zen-breathe-anim').exists()).toBe(true);
        wrapper.unmount();
    });

    it('draws one petal per step of the v-for count', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        expect(wrapper.findAll('ellipse')).toHaveLength(25);
        wrapper.unmount();
    });

    it('fills every petal from the gradient it also defines, so no fill dangles', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        expect(wrapper.find('radialGradient#petalGradient').exists()).toBe(true);
        for (const petal of wrapper.findAll('ellipse')) {
            expect(petal.attributes('fill')).toBe('url(#petalGradient)');
        }
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        const svg = wrapper.find('svg.zen-breathe-svg');
        expect(svg.attributes('preserveAspectRatio')).toBe('none');
        expect(svg.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });
});
