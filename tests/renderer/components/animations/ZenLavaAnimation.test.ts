import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenLavaAnimation from '@/renderer/components/animations/ZenLavaAnimation.vue';

describe('ZenLavaAnimation', () => {
    it('renders the root the meditation background hooks its transitions to', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.find('.zen-lava-anim').exists()).toBe(true);
        wrapper.unmount();
    });

    it('draws all three blob layers — 8 large, 12 medium, 15 small', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.findAll('ellipse, circle')).toHaveLength(8 + 12 + 15);
        wrapper.unmount();
    });

    it('defines the glow filter and both gradients the blobs reference', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.find('filter#lavaGlow').exists()).toBe(true);
        expect(wrapper.find('radialGradient#lavaGradient1').exists()).toBe(true);
        expect(wrapper.find('radialGradient#lavaGradient2').exists()).toBe(true);
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        const svg = wrapper.find('svg.zen-lava-svg');
        expect(svg.attributes('preserveAspectRatio')).toBe('none');
        expect(svg.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });
});
