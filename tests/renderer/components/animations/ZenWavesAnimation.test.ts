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

    it('draws both wave paths', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.find('path#wave1').exists()).toBe(true);
        expect(wrapper.find('path#wave2').exists()).toBe(true);
        wrapper.unmount();
    });

    it('fills the waves from the gradient it defines', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.find('linearGradient#zenWaveGradient').exists()).toBe(true);
        expect(wrapper.find('path#wave1').attributes('fill')).toBe('url(#zenWaveGradient)');
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenWavesAnimation);

        expect(wrapper.attributes('preserveAspectRatio')).toBe('none');
        expect(wrapper.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });
});
