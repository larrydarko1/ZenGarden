import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountWithI18n } from '@test-utils';
import SettingsPopup from '@/renderer/components/SettingsPopup.vue';

const AccountSettingsStub = {
    name: 'AccountSettings',
    template: '<div class="account-settings-stub" />',
};

const mountSettings = (theme: 'light' | 'dark' = 'dark') =>
    mountWithI18n(SettingsPopup, {
        props: { theme },
        global: { stubs: { AccountSettings: AccountSettingsStub } },
    });

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('SettingsPopup', () => {
    it('offers both themes', () => {
        const wrapper = mountSettings();

        expect(wrapper.findAll('.theme-option')).toHaveLength(2);
        wrapper.unmount();
    });

    it('offers every language the app ships', () => {
        const wrapper = mountSettings();

        const names = wrapper.findAll('.language-option').map((option) => option.text());
        expect(names).toEqual(['English', 'Español', 'Italiano', 'Français', 'Deutsch', 'Português', '中文', '日本語']);
        wrapper.unmount();
    });

    /**
     * The popup is mounted behind a v-if and so remounts on every open. It must
     * take the highlight from the theme it is handed, never from a local default,
     * or a light-theme user reopening settings sees dark marked as current.
     */
    it('highlights the theme it is given, not a hardcoded default', () => {
        const wrapper = mountSettings('light');

        expect(wrapper.findAll('.theme-option')[1].classes()).toContain('active');
        expect(wrapper.findAll('.theme-option')[0].classes()).not.toContain('active');
        wrapper.unmount();
    });

    it('highlights dark when that is the active theme', () => {
        const wrapper = mountSettings('dark');

        expect(wrapper.findAll('.theme-option')[0].classes()).toContain('active');
        expect(wrapper.findAll('.theme-option')[1].classes()).not.toContain('active');
        wrapper.unmount();
    });

    it('emits theme-change, and the highlight follows once the parent applies it', async () => {
        const wrapper = mountSettings('dark');

        await wrapper.findAll('.theme-option')[1].trigger('click');

        expect(wrapper.emitted('theme-change')).toEqual([['light']]);

        await wrapper.setProps({ theme: 'light' });

        expect(wrapper.findAll('.theme-option')[1].classes()).toContain('active');
        expect(wrapper.findAll('.theme-option')[0].classes()).not.toContain('active');
        wrapper.unmount();
    });

    it('emits language-change with the code, not the display name', async () => {
        const wrapper = mountSettings();

        await wrapper.findAll('.language-option')[3].trigger('click');

        expect(wrapper.emitted('language-change')).toEqual([['fr']]);
        wrapper.unmount();
    });

    it('marks the active language so the current one is visible at a glance', async () => {
        const wrapper = mountSettings();

        await wrapper.findAll('.language-option')[2].trigger('click');

        const active = wrapper.findAll('.language-option').filter((option) => option.classes().includes('active'));
        expect(active.map((option) => option.text())).toEqual(['Italiano']);
        wrapper.unmount();
    });

    it('renders the account panel below the pickers', () => {
        const wrapper = mountSettings();

        expect(wrapper.find('.account-settings-stub').exists()).toBe(true);
        wrapper.unmount();
    });

    it('reloads after a username change, so every view picks up the new name', () => {
        const reload = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
        const wrapper = mountSettings();

        wrapper.findComponent(AccountSettingsStub).vm.$emit('username-changed', 'newname');

        expect(reload).toHaveBeenCalled();
        wrapper.unmount();
    });

    it('closes and reloads after the account is deleted, dropping back to the login screen', () => {
        const reload = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
        const wrapper = mountSettings();

        wrapper.findComponent(AccountSettingsStub).vm.$emit('account-deleted');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(reload).toHaveBeenCalled();
        wrapper.unmount();
    });
});
