import { describe, it, expect } from 'vitest';
import { mountWithI18n } from '@test-utils';
import BottomNav from '@/renderer/components/home/BottomNav.vue';

const INACTIVE = { journalMode: false, calendarMode: false, philosophyMode: false, settingsMode: false };

describe('BottomNav', () => {
    it('renders one button per destination, plus logout', () => {
        const wrapper = mountWithI18n(BottomNav, { props: INACTIVE });

        expect(wrapper.findAll('.nav-item')).toHaveLength(5);
        wrapper.unmount();
    });

    it('labels each destination with its translated name', () => {
        const wrapper = mountWithI18n(BottomNav, { props: INACTIVE });

        const labels = wrapper.findAll('.nav-item span').map((span) => span.text());
        expect(labels).toEqual(['Journal', 'Calendar', 'Philosophy', 'Settings', 'Logout']);
        wrapper.unmount();
    });

    it.each([
        ['journalMode', 'toggle-journal', 0],
        ['calendarMode', 'toggle-calendar', 1],
        ['philosophyMode', 'toggle-philosophy', 2],
        ['settingsMode', 'toggle-settings', 3],
    ] as const)('%s marks its own button active and nothing else', (mode, _event, index) => {
        const wrapper = mountWithI18n(BottomNav, { props: { ...INACTIVE, [mode]: true } });

        const active = wrapper.findAll('.nav-item').map((item) => item.classes().includes('nav-active'));
        expect(active).toEqual([0, 1, 2, 3, 4].map((i) => i === index));
        wrapper.unmount();
    });

    it.each([
        ['toggle-journal', 0],
        ['toggle-calendar', 1],
        ['toggle-philosophy', 2],
        ['toggle-settings', 3],
        ['logout', 4],
    ] as const)('clicking button %s emits %s', async (event, index) => {
        const wrapper = mountWithI18n(BottomNav, { props: INACTIVE });

        await wrapper.findAll('.nav-item')[index].trigger('click');

        expect(wrapper.emitted(event)).toHaveLength(1);
        wrapper.unmount();
    });

    it('never marks logout active — it is an action, not a destination', () => {
        const wrapper = mountWithI18n(BottomNav, {
            props: { journalMode: true, calendarMode: true, philosophyMode: true, settingsMode: true },
        });

        expect(wrapper.find('.nav-logout').classes()).not.toContain('nav-active');
        wrapper.unmount();
    });
});
