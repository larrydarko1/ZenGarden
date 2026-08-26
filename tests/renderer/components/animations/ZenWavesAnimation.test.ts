import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenWavesAnimation from '@/renderer/components/animations/ZenWavesAnimation.vue';

describe('ZenWavesAnimation', () => {
    it('renders as the root svg itself, with no wrapper element', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
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

        expect(wrapper.find('linearGradient#zenWaveGradient').exists()).toBe(true);
        for (const wave of wrapper.findAll('path.wave')) {
            expect(wave.attributes('fill')).toBe('url(#zenWaveGradient)');
        }
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
