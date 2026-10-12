import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';

import ZenWavesAnimation from '@/renderer/components/animations/ZenWavesAnimation.vue';
import { mountWithI18n } from '@test-utils';

describe('ZenWavesAnimation', () => {
    it('renders as the root svg itself, with no wrapper element', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.element).toBeInstanceOf(SVGSVGElement);
        expect(wrapper.classes()).toContain('zen-waves-anim');
        wrapper.unmount();
    });

    it('draws both wave bands', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.find('path.wave-front').exists()).toBe(true);
        expect(wrapper.find('path.wave-back').exists()).toBe(true);
        wrapper.unmount();
    });

    it('fills the waves from the gradient it defines', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        const gradientId = wrapper.find('linearGradient').attributes('id') ?? '';
        expect(gradientId).not.toBe('');
        for (const wave of wrapper.findAll('path.wave')) {
            expect(wave.attributes('fill')).toBe(`url(#${gradientId})`);
        }
        wrapper.unmount();
    });

    it('gives each instance its own gradient id, so two on a page never share one', () => {
        const TwoWaves = defineComponent({ render: () => h('div', [h(ZenWavesAnimation), h(ZenWavesAnimation)]) });
        const wrapper = mountWithI18n(TwoWaves);

        const ids = wrapper.findAll('linearGradient').map((gradient) => gradient.attributes('id'));
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.attributes('preserveAspectRatio')).toBe('none');
        expect(wrapper.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });

    it('draws each wave two viewBox periods wide, so the scroll loop has no seam', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        for (const wave of wrapper.findAll('path.wave')) {
            const d = wave.attributes('d') ?? '';
            expect(d).toContain('T3840,');
            expect(d.endsWith('H0 Z')).toBe(true);
        }
        wrapper.unmount();
    });

    it('drives its motion from CSS, never SMIL', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.findAll('animate')).toHaveLength(0);
        wrapper.unmount();
    });
});
