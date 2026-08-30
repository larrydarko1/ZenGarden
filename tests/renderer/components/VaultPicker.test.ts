import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountWithI18n } from '@test-utils';
import VaultPicker from '@/renderer/components/VaultPicker.vue';

const mockCanChooseVault = vi.fn();
const mockChooseVault = vi.fn();
const mockLogError = vi.fn();

vi.mock('@/renderer/store', () => ({
    vaultIsPickable: () => mockCanChooseVault(),
    chooseVault: () => mockChooseVault(),
}));

vi.mock('@/renderer/utils/logger', () => ({
    log: { error: (...args: unknown[]) => mockLogError(...args), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Mounted and settled, so the `vaultIsPickable` probe in onMounted has landed. */
async function mountPicker() {
    const wrapper = mountWithI18n(VaultPicker);
    await settle();
    await wrapper.vm.$nextTick();
    return wrapper;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCanChooseVault.mockResolvedValue(true);
    mockChooseVault.mockResolvedValue('/home/monk/journal');
});

describe('VaultPicker', () => {
    it('explains what a vault is before asking for one', async () => {
        const wrapper = await mountPicker();

        expect(wrapper.find('.vault-title').text()).toBe('Choose your vault');
        expect(wrapper.find('.vault-choose').exists()).toBe(true);
        wrapper.unmount();
    });

    it('reports the chosen folder', async () => {
        const wrapper = await mountPicker();

        await wrapper.find('.vault-choose').trigger('click');
        await settle();

        expect(wrapper.emitted('opened')).toEqual([['/home/monk/journal']]);
        wrapper.unmount();
    });

    // Cancelling is not a failure. The picker stays put and says nothing.
    it('stays put when the dialog is cancelled', async () => {
        mockChooseVault.mockResolvedValue(null);
        const wrapper = await mountPicker();

        await wrapper.find('.vault-choose').trigger('click');
        await settle();

        expect(wrapper.emitted('opened')).toBeUndefined();
        expect(wrapper.find('.vault-error').exists()).toBe(false);
        wrapper.unmount();
    });

    it('shows and logs why the folder could not be opened', async () => {
        mockChooseVault.mockRejectedValue(new Error('no display'));
        const wrapper = await mountPicker();

        await wrapper.find('.vault-choose').trigger('click');
        await settle();
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.vault-error').text()).toBe('Could not open that folder');
        expect(mockLogError).toHaveBeenCalledWith('Failed to open vault', expect.any(Error));
        expect(wrapper.emitted('opened')).toBeUndefined();
        wrapper.unmount();
    });

    it('lets the button be pressed again after a failure', async () => {
        mockChooseVault.mockRejectedValueOnce(new Error('no display'));
        const wrapper = await mountPicker();

        await wrapper.find('.vault-choose').trigger('click');
        await settle();
        await wrapper.vm.$nextTick();

        expect(wrapper.find<HTMLButtonElement>('.vault-choose').element.disabled).toBe(false);
        wrapper.unmount();
    });

    /**
     * Android has one fixed vault and no picker to show, so opening it is not a
     * decision the user has to make — the screen takes it for them.
     */
    describe('where the vault cannot be chosen', () => {
        beforeEach(() => {
            mockCanChooseVault.mockResolvedValue(false);
            mockChooseVault.mockResolvedValue('Documents/ZenGarden');
        });

        it('opens the fixed vault without asking', async () => {
            const wrapper = await mountPicker();
            await settle();

            expect(wrapper.emitted('opened')).toEqual([['Documents/ZenGarden']]);
            wrapper.unmount();
        });

        it('offers no folder button', async () => {
            const wrapper = await mountPicker();

            expect(wrapper.find('.vault-choose').exists()).toBe(false);
            wrapper.unmount();
        });
    });
});
