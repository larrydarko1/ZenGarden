import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenLavaAnimation from '@/renderer/components/animations/ZenLavaAnimation.vue';

describe('ZenLavaAnimation', () => {
    it('renders as the root svg itself, with no wrapper element', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.classes()).toContain('zen-lava-anim');
        wrapper.unmount();
    });

    it('draws all three blob layers — 8 large, 12 medium, 15 small', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.findAll('ellipse')).toHaveLength(8 + 12 + 15);
        wrapper.unmount();
    });

    it('defines both gradients the blobs reference', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.find('radialGradient#lavaGradient1').exists()).toBe(true);
        expect(wrapper.find('radialGradient#lavaGradient2').exists()).toBe(true);

        const fills = new Set(wrapper.findAll('ellipse').map((b) => b.attributes('fill')));
        expect(fills).toEqual(new Set(['url(#lavaGradient1)', 'url(#lavaGradient2)']));
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.attributes('preserveAspectRatio')).toBe('none');
        expect(wrapper.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });

    it('paints its glow with gradient falloff, not a per-frame SVG filter', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.find('filter').exists()).toBe(false);
        expect(wrapper.html()).not.toContain('<feGaussianBlur');
        expect(wrapper.findAll('[filter]')).toHaveLength(0);

        // The falloff that replaced it: each gradient reaches zero opacity.
        for (const gradient of wrapper.findAll('radialGradient')) {
            const stops = gradient.findAll('stop');
            expect(stops.length).toBeGreaterThanOrEqual(4);
            expect(stops[stops.length - 1].attributes('stop-opacity')).toBe('0');
        }
        wrapper.unmount();
    });

    it('drives its motion from CSS, never SMIL', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        expect(wrapper.findAll('animate')).toHaveLength(0);
        wrapper.unmount();
    });

    it('gives every blob its own duration and a negative delay, so the column starts full', () => {
        const wrapper = mountWithI18n(ZenLavaAnimation);

        for (const blob of wrapper.findAll('ellipse')) {
            const style = blob.attributes('style') ?? '';
            expect(style).toMatch(/animation-duration:\s*[\d.]+s/);
            expect(style).toMatch(/animation-delay:\s*-[\d.]+s/);
            expect(blob.classes().some((c) => c.startsWith('blob-rise-'))).toBe(true);
        }
        wrapper.unmount();
    });
});
