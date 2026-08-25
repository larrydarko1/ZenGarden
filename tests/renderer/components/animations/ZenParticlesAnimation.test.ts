import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenParticlesAnimation from '@/renderer/components/animations/ZenParticlesAnimation.vue';

describe('ZenParticlesAnimation', () => {
    it('renders the root the meditation background hooks its transitions to', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.find('.zen-particles-anim').exists()).toBe(true);
        wrapper.unmount();
    });

    it('draws all three particle layers — 12 large, 20 medium, 30 small', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.findAll('circle')).toHaveLength(12 + 20 + 30);
        wrapper.unmount();
    });

    it('defines the glow gradient the large particles reference', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        expect(wrapper.find('radialGradient#particleGlow').exists()).toBe(true);
        wrapper.unmount();
    });

    it('animates every particle indefinitely, so nothing stops mid-session', () => {
        const wrapper = mountWithI18n(ZenParticlesAnimation);

        const animations = wrapper.findAll('animate');
        expect(animations.length).toBeGreaterThan(0);
        for (const animation of animations) {
            expect(animation.attributes('repeatCount')).toBe('indefinite');
        }
        wrapper.unmount();
    });
});
