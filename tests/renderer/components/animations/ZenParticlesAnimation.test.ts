import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenParticlesAnimation from '@/renderer/components/animations/ZenParticlesAnimation.vue';

describe('ZenParticlesAnimation', () => {
    it('renders as the root svg itself, with no wrapper element', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.classes()).toContain('zen-particles-anim');
        wrapper.unmount();
    });

    it('draws all three particle layers — 12 large, 20 medium, 30 small', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.findAll('circle')).toHaveLength(12 + 20 + 30);
        wrapper.unmount();
    });

    it('defines the glow gradient the larger particles reference', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.find('radialGradient#particleGlow').exists()).toBe(true);
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.attributes('preserveAspectRatio')).toBe('none');
        expect(wrapper.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });

    it('drives its motion from CSS, never SMIL', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.findAll('animate')).toHaveLength(0);
        wrapper.unmount();
    });

    it('animates every particle indefinitely, so nothing stops mid-session', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        const particles = wrapper.findAll('circle');
        expect(particles.length).toBeGreaterThan(0);
        for (const particle of particles) {
            // `animation-iteration-count: infinite` lives on the shared class.
            expect(particle.classes()).toContain('particle');
            expect(particle.classes().some((c) => c.startsWith('particle-bob-'))).toBe(true);
            expect(particle.attributes('style') ?? '').toMatch(/animation-duration:\s*[\d.]+s/);
        }
        wrapper.unmount();
    });

    it('carries a per-band peak opacity, so one keyframe track serves every band', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        for (const particle of wrapper.findAll('circle')) {
            expect(particle.attributes('style') ?? '').toMatch(/--peak-opacity:\s*[\d.]+/);
        }
        wrapper.unmount();
    });

    /** The 3px band is a flat fill — the glow gradient is invisible at that size. */
    it('reserves the glow gradient for the two larger bands', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        const fills = wrapper.findAll('circle').map((c) => c.attributes('fill'));
        expect(fills.filter((f) => f === 'url(#particleGlow)')).toHaveLength(12 + 20);
        expect(fills.filter((f) => f === 'var(--text2)')).toHaveLength(30);
        wrapper.unmount();
    });
});
