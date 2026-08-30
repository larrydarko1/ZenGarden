import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountWithI18n } from '@test-utils';
import SettingsPopup from '@/renderer/components/SettingsPopup.vue';

const mockCanChooseVault = vi.fn();
const mockChooseVault = vi.fn();
const mockGetVaultPath = vi.fn();

vi.mock('@/renderer/store', () => ({
    vaultIsPickable: () => mockCanChooseVault(),
    chooseVault: () => mockChooseVault(),
    findVaultPath: () => mockGetVaultPath(),
}));

vi.mock('@/renderer/utils/logger', () => ({
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const mountSettings = (theme: 'light' | 'dark' = 'dark') => mountWithI18n(SettingsPopup, { props: { theme } });

/** Mounted and settled, so the vault lookup in onMounted has landed. */
async function mountReady(theme: 'light' | 'dark' = 'dark') {
    const wrapper = mountSettings(theme);
    await settle();
    await wrapper.vm.$nextTick();
    return wrapper;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCanChooseVault.mockResolvedValue(true);
    mockGetVaultPath.mockResolvedValue('/home/monk/journal');
    mockChooseVault.mockResolvedValue('/home/monk/other');
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

    it('shows where the vault is', async () => {
        const wrapper = await mountReady();

        expect(wrapper.find('.vault-path').text()).toBe('/home/monk/journal');
        wrapper.unmount();
    });

    /**
     * Switching vaults swaps the whole dataset, so every list and calendar on
     * screen belongs to the old folder. Reloading is the honest way to get a
     * clean read of the new one.
     */
    it('reloads after switching to another vault', async () => {
        const reload = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
        const wrapper = await mountReady();

        await wrapper.find('.vault-switch').trigger('click');
        await settle();

        expect(reload).toHaveBeenCalled();
        wrapper.unmount();
    });

    it('stays put when the picker is cancelled', async () => {
        const reload = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
        mockChooseVault.mockResolvedValue(null);
        const wrapper = await mountReady();

        await wrapper.find('.vault-switch').trigger('click');
        await settle();

        expect(reload).not.toHaveBeenCalled();
        wrapper.unmount();
    });

    // Android has no folder picker, so the button would lead nowhere.
    it('explains the fixed location instead of offering a picker', async () => {
        mockCanChooseVault.mockResolvedValue(false);
        const wrapper = await mountReady();

        expect(wrapper.find('.vault-switch').exists()).toBe(false);
        expect(wrapper.find('.vault-note').exists()).toBe(true);
        wrapper.unmount();
    });
});
