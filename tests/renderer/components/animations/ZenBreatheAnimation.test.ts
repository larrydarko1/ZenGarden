import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenBreatheAnimation from '@/renderer/components/animations/ZenBreatheAnimation.vue';

describe('ZenBreatheAnimation', () => {
    it('renders as the root svg itself, with no wrapper element', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.classes()).toContain('zen-breathe-anim');
        wrapper.unmount();
    });

    it('draws one petal per step of the count', () => {
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

        expect(wrapper.attributes('preserveAspectRatio')).toBe('none');
        expect(wrapper.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });

    it('drives its motion from CSS, never SMIL', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        expect(wrapper.findAll('animate')).toHaveLength(0);
        expect(wrapper.findAll('animateTransform')).toHaveLength(0);
        wrapper.unmount();
    });

    it('gives every petal its own duration and a negative delay, so the field starts full', () => {
        const wrapper = mountWithI18n(ZenBreatheAnimation);

        for (const petal of wrapper.findAll('ellipse')) {
            const style = petal.attributes('style') ?? '';
            expect(style).toMatch(/animation-duration:\s*[\d.]+s/);
            expect(style).toMatch(/animation-delay:\s*-[\d.]+s/);
            expect(petal.classes().some((c) => c.startsWith('petal-drift-'))).toBe(true);
        }
        wrapper.unmount();
    });
});
