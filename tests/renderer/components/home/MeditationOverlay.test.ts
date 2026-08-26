import { describe, it, expect, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mountWithI18n } from '@test-utils';
import MeditationOverlay from '@/renderer/components/home/MeditationOverlay.vue';

const AnimationStub = defineComponent({ name: 'AnimationStub', template: '<div class="animation-stub" />' });

const formatTime = vi.fn((seconds: number) => `t:${seconds}`);

function mountOverlay(overrides: Record<string, unknown> = {}) {
    return mountWithI18n(MeditationOverlay, {
        props: {
            animationComponent: AnimationStub,
            bellEnabled: false,
            bellInterval: 10,
            bellSound: '1',
            selectedBreathingExercise: null,
            breathingActive: false,
            breathingPhase: 'in',
            breathingPhaseText: 'Breathe in',
            breathingPhaseDuration: 4,
            breathingCycleCount: 0,
            meditationSeconds: 125,
            formatTime,
            ...overrides,
        },
    });
}

describe('MeditationOverlay', () => {
    it('renders whichever animation the parent chose', () => {
        const wrapper = mountOverlay();

        expect(wrapper.find('.animation-stub').exists()).toBe(true);
        wrapper.unmount();
    });

    it('shows the elapsed time through the parent formatter, announced politely', () => {
        const wrapper = mountOverlay();

        const timer = wrapper.find('.timer-display');
        expect(timer.text()).toBe('t:125');
        expect(timer.attributes('aria-live')).toBe('polite');
        wrapper.unmount();
    });

    it('emits stop when the session is ended', async () => {
        const wrapper = mountOverlay();

        await wrapper.find('.meditation-btn').trigger('click');

        expect(wrapper.emitted('stop')).toHaveLength(1);
        wrapper.unmount();
    });

    describe('bells', () => {
        it('hides the interval and sound pickers while bells are off', () => {
            const wrapper = mountOverlay();

            expect(wrapper.find('.bell-settings').exists()).toBe(false);
            wrapper.unmount();
        });

        it('emits the flipped value when the bell button is pressed', async () => {
            const wrapper = mountOverlay();

            await wrapper.find('.bell-toggle-btn').trigger('click');

            expect(wrapper.emitted('update:bellEnabled')).toEqual([[true]]);
            wrapper.unmount();
        });

        it('describes what the button will do, not what state it is in', () => {
            const off = mountOverlay();
            expect(off.find('.bell-toggle-btn').attributes('aria-label')).toBe('Enable interval bells');
            off.unmount();

            const on = mountOverlay({ bellEnabled: true });
            expect(on.find('.bell-toggle-btn').attributes('aria-label')).toBe('Disable interval bells');
            on.unmount();
        });

        it('offers the four intervals once the dropdown is opened', async () => {
            const wrapper = mountOverlay({ bellEnabled: true });

            await wrapper.findAll('.bell-dropdown-btn')[0].trigger('click');

            const options = wrapper.findAll('.bell-dropdown-menu button');
            expect(options.map((option) => option.text())).toEqual(['5 min', '10 min', '15 min', '20 min']);
            wrapper.unmount();
        });

        it('emits the chosen interval and closes the menu behind it', async () => {
            const wrapper = mountOverlay({ bellEnabled: true });

            await wrapper.findAll('.bell-dropdown-btn')[0].trigger('click');
            await wrapper.findAll('.bell-dropdown-menu button')[2].trigger('click');

            expect(wrapper.emitted('update:bellInterval')).toEqual([[15]]);
            expect(wrapper.find('.bell-dropdown-menu').exists()).toBe(false);
            wrapper.unmount();
        });

        it('emits the chosen bell sound and closes the menu behind it', async () => {
            const wrapper = mountOverlay({ bellEnabled: true });

            await wrapper.findAll('.bell-dropdown-btn')[1].trigger('click');
            await wrapper.findAll('.bell-dropdown-menu button')[3].trigger('click');

            expect(wrapper.emitted('select-bell-sound')).toEqual([['4']]);
            expect(wrapper.find('.bell-dropdown-menu').exists()).toBe(false);
            wrapper.unmount();
        });

        it('closes an open menu from its backdrop without emitting a choice', async () => {
            const wrapper = mountOverlay({ bellEnabled: true });

            await wrapper.findAll('.bell-dropdown-btn')[0].trigger('click');
            await wrapper.find('.dropdown-backdrop-inline').trigger('click');

            expect(wrapper.find('.bell-dropdown-menu').exists()).toBe(false);
            expect(wrapper.emitted('update:bellInterval')).toBeUndefined();
            wrapper.unmount();
        });
    });

    describe('breathing guide', () => {
        it('hides the toggle entirely when no exercise is selected', () => {
            const wrapper = mountOverlay();

            expect(wrapper.find('.breathing-toggle-btn').exists()).toBe(false);
            wrapper.unmount();
        });

        it('emits toggle-breathing when the guide is started', async () => {
            const wrapper = mountOverlay({ selectedBreathingExercise: { name: 'Box' } });

            await wrapper.find('.breathing-toggle-btn').trigger('click');

            expect(wrapper.emitted('toggle-breathing')).toHaveLength(1);
            wrapper.unmount();
        });

        it('shows the sphere only while the guide is running', () => {
            const idle = mountOverlay({ selectedBreathingExercise: { name: 'Box' } });
            expect(idle.find('.breathing-overlay').exists()).toBe(false);
            idle.unmount();

            const running = mountOverlay({ selectedBreathingExercise: { name: 'Box' }, breathingActive: true });
            expect(running.find('.breathing-overlay').exists()).toBe(true);
            running.unmount();
        });

        it('drives the sphere from the phase, and its animation from the phase duration', () => {
            const wrapper = mountOverlay({
                selectedBreathingExercise: { name: 'Box' },
                breathingActive: true,
                breathingPhase: 'holdOut',
                breathingPhaseDuration: 7,
            });

            const sphere = wrapper.find('.breathing-sphere');
            expect(sphere.classes()).toContain('breathing-hold-out');
            expect(sphere.classes()).not.toContain('breathing-in');
            expect(sphere.attributes('style')).toContain('animation-duration: 7s');
            wrapper.unmount();
        });

        it('names the exercise and counts the cycles completed', () => {
            const wrapper = mountOverlay({
                selectedBreathingExercise: { name: 'Box breathing' },
                breathingActive: true,
                breathingCycleCount: 3,
            });

            expect(wrapper.find('.breathing-exercise-name').text()).toBe('Box breathing');
            expect(wrapper.find('.breathing-cycle').text()).toContain('3');
            wrapper.unmount();
        });
    });
});
