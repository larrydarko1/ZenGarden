import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import ZenWindAnimation from '@/renderer/components/animations/ZenWindAnimation.vue';

describe('ZenWindAnimation', () => {
    it('renders as the root svg itself, with no wrapper element', () => {
        const wrapper = mountWithI18n(ZenWindAnimation);

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.classes()).toContain('zen-wind-anim');
        wrapper.unmount();
    });

    it('draws one gust per step of the v-for count', () => {
        const wrapper = mountWithI18n(ZenWindAnimation);

        expect(wrapper.findAll('rect')).toHaveLength(7);
        wrapper.unmount();
    });

    it('fills every gust from the gradient it also defines, so no fill dangles', () => {
        const wrapper = mountWithI18n(ZenWindAnimation);

        expect(wrapper.find('linearGradient#zenWindGradient').exists()).toBe(true);
        for (const gust of wrapper.findAll('rect')) {
            expect(gust.attributes('fill')).toBe('url(#zenWindGradient)');
        }
        wrapper.unmount();
    });

    it('scales to the viewport rather than a fixed pixel box', () => {
        const wrapper = mountWithI18n(ZenWindAnimation);

        expect(wrapper.attributes('preserveAspectRatio')).toBe('none');
        expect(wrapper.attributes('viewBox')).toBe('0 0 1920 1080');
        wrapper.unmount();
    });
});
