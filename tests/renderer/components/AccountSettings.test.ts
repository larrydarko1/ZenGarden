import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithI18n } from '@test-utils';

const mockUpdateUsername = vi.fn();
const mockUpdatePassword = vi.fn();
const mockDeleteAccount = vi.fn();
const mockGetRecoveryStatus = vi.fn();
const mockGenerateRecoveryCodes = vi.fn();
const mockLogError = vi.fn();

vi.mock('@/renderer/store', () => ({
    updateUsername: (...args: unknown[]) => mockUpdateUsername(...args),
    updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
    deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
    getRecoveryStatus: () => mockGetRecoveryStatus(),
    generateRecoveryCodes: (...args: unknown[]) => mockGenerateRecoveryCodes(...args),
}));

vi.mock('@/renderer/utils/logger', () => ({
    log: { error: (...args: unknown[]) => mockLogError(...args), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const AccountSettings = (await import('@/renderer/components/AccountSettings.vue')).default;

const NO_CODES = { hasRecoveryCodes: false, totalCodes: 0, usedCodes: 0, remainingCodes: 0 };
const SOME_CODES = { hasRecoveryCodes: true, totalCodes: 10, usedCodes: 3, remainingCodes: 7 };

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Mount, then let the onMounted recovery-status read settle. */
async function mountSettings() {
    const wrapper = mountWithI18n(AccountSettings);
    await settle();
    await wrapper.vm.$nextTick();
    return wrapper;
}

const sections = (wrapper: Awaited<ReturnType<typeof mountSettings>>) => wrapper.findAll('.settings-section');

beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecoveryStatus.mockResolvedValue(NO_CODES);
    mockUpdateUsername.mockResolvedValue({ message: 'ok', username: 'newname', token: '' });
    mockUpdatePassword.mockResolvedValue({ message: 'ok' });
    mockDeleteAccount.mockResolvedValue({ message: 'ok' });
    mockGenerateRecoveryCodes.mockResolvedValue({ codes: ['AAAA1111', 'BBBB2222'] });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('AccountSettings', () => {
    describe('changing the username', () => {
        it('sends the new name with an empty password, because local mode does not ask for one', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[0].find('input').setValue('newname');
            await sections(wrapper)[0].find('form').trigger('submit');
            await settle();

            expect(mockUpdateUsername).toHaveBeenCalledWith('newname', '');
            wrapper.unmount();
        });

        it('tells the parent the name that was actually stored, and clears the field', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[0].find('input').setValue('newname');
            await sections(wrapper)[0].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();

            expect(wrapper.emitted('usernameChanged')).toEqual([['newname']]);
            expect(sections(wrapper)[0].find('input').element.value).toBe('');
            expect(sections(wrapper)[0].find('.success-message').exists()).toBe(true);
            wrapper.unmount();
        });

        it('shows the failure and tells the parent nothing', async () => {
            mockUpdateUsername.mockRejectedValue(new Error('Username already exists'));
            const wrapper = await mountSettings();

            await sections(wrapper)[0].find('input').setValue('taken');
            await sections(wrapper)[0].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();

            expect(sections(wrapper)[0].find('.error-message').text()).toBe('Username already exists');
            expect(wrapper.emitted('usernameChanged')).toBeUndefined();
            wrapper.unmount();
        });

        it('disables the submit button until a name is typed', async () => {
            const wrapper = await mountSettings();

            expect(sections(wrapper)[0].find('button').attributes('disabled')).toBeDefined();

            await sections(wrapper)[0].find('input').setValue('newname');

            expect(sections(wrapper)[0].find('button').attributes('disabled')).toBeUndefined();
            wrapper.unmount();
        });
    });

    describe('changing the password', () => {
        async function fill(wrapper: Awaited<ReturnType<typeof mountSettings>>, next: string, confirm: string) {
            const inputs = sections(wrapper)[1].findAll('input');
            await inputs[0].setValue('current12');
            await inputs[1].setValue(next);
            await inputs[2].setValue(confirm);
            await sections(wrapper)[1].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();
        }

        it('refuses locally when the confirmation does not match', async () => {
            const wrapper = await mountSettings();

            await fill(wrapper, 'newpass12', 'different');

            expect(mockUpdatePassword).not.toHaveBeenCalled();
            expect(sections(wrapper)[1].find('.error-message').text()).not.toBe('');
            wrapper.unmount();
        });

        it('refuses locally when the new password is too short', async () => {
            const wrapper = await mountSettings();

            await fill(wrapper, 'short', 'short');

            expect(mockUpdatePassword).not.toHaveBeenCalled();
            expect(sections(wrapper)[1].find('.error-message').text()).not.toBe('');
            wrapper.unmount();
        });

        it('sends both passwords and clears the whole form on success', async () => {
            const wrapper = await mountSettings();

            await fill(wrapper, 'newpass12', 'newpass12');

            expect(mockUpdatePassword).toHaveBeenCalledWith('current12', 'newpass12');
            expect(
                sections(wrapper)[1]
                    .findAll('input')
                    .map((input) => input.element.value),
            ).toEqual(['', '', '']);
            expect(sections(wrapper)[1].find('.success-message').exists()).toBe(true);
            wrapper.unmount();
        });

        it('keeps what was typed when the store rejects it, so it can be corrected', async () => {
            mockUpdatePassword.mockRejectedValue(new Error('Current password is incorrect'));
            const wrapper = await mountSettings();

            await fill(wrapper, 'newpass12', 'newpass12');

            expect(sections(wrapper)[1].find('.error-message').text()).toBe('Current password is incorrect');
            expect(sections(wrapper)[1].findAll('input')[0].element.value).toBe('current12');
            wrapper.unmount();
        });
    });

    describe('recovery codes', () => {
        it('reads the current status on mount', async () => {
            const wrapper = await mountSettings();

            expect(mockGetRecoveryStatus).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('falls back to an empty status rather than breaking the panel when the read fails', async () => {
            mockGetRecoveryStatus.mockRejectedValue(new Error('unreadable'));
            const wrapper = await mountSettings();

            expect(sections(wrapper)[2].find('.recovery-status').exists()).toBe(false);
            expect(sections(wrapper)[2].find('.zen-btn').exists()).toBe(true);
            wrapper.unmount();
        });

        it('shows the totals once codes exist', async () => {
            mockGetRecoveryStatus.mockResolvedValue(SOME_CODES);
            const wrapper = await mountSettings();

            const values = sections(wrapper)[2]
                .findAll('.status-value')
                .map((value) => value.text());
            expect(values).toEqual(['10', '3', '7']);
            wrapper.unmount();
        });

        it('asks for the password before generating, and cancels back out cleanly', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[2].find('.zen-btn').trigger('click');
            expect(sections(wrapper)[2].find('form').exists()).toBe(true);

            await sections(wrapper)[2].findAll('button')[0].trigger('click');
            expect(sections(wrapper)[2].find('form').exists()).toBe(false);
            expect(mockGenerateRecoveryCodes).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        it('shows the generated codes once, and re-reads the status behind them', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[2].find('.zen-btn').trigger('click');
            await sections(wrapper)[2].find('input').setValue('secret12');
            await sections(wrapper)[2].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();

            expect(mockGenerateRecoveryCodes).toHaveBeenCalledWith('secret12');
            expect(
                sections(wrapper)[2]
                    .findAll('.code-value')
                    .map((code) => code.text()),
            ).toEqual(['AAAA1111', 'BBBB2222']);
            expect(mockGetRecoveryStatus).toHaveBeenCalledTimes(2);
            wrapper.unmount();
        });

        it('shows the failure and keeps the password form open', async () => {
            mockGenerateRecoveryCodes.mockRejectedValue(new Error('Invalid password'));
            const wrapper = await mountSettings();

            await sections(wrapper)[2].find('.zen-btn').trigger('click');
            await sections(wrapper)[2].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();

            expect(sections(wrapper)[2].find('.error-message').text()).toBe('Invalid password');
            expect(sections(wrapper)[2].find('form').exists()).toBe(true);
            wrapper.unmount();
        });

        it('copies the codes numbered, one per line', async () => {
            const writeText = vi.fn().mockResolvedValue(undefined);
            Object.assign(navigator, { clipboard: { writeText } });
            const wrapper = await mountSettings();

            await sections(wrapper)[2].find('.zen-btn').trigger('click');
            await sections(wrapper)[2].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();
            await sections(wrapper)[2].findAll('.button-row button')[0].trigger('click');
            await settle();

            expect(writeText).toHaveBeenCalledWith('1. AAAA1111\n2. BBBB2222');
            wrapper.unmount();
        });

        it('logs rather than breaking when the clipboard refuses', async () => {
            Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
            const wrapper = await mountSettings();

            await sections(wrapper)[2].find('.zen-btn').trigger('click');
            await sections(wrapper)[2].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();
            await sections(wrapper)[2].findAll('.button-row button')[0].trigger('click');
            await settle();

            expect(mockLogError).toHaveBeenCalledWith('Failed to copy recovery codes', expect.any(Error));
            wrapper.unmount();
        });

        it('drops the codes from the view when the panel is dismissed', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[2].find('.zen-btn').trigger('click');
            await sections(wrapper)[2].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();
            await sections(wrapper)[2].findAll('.button-row button')[1].trigger('click');

            expect(sections(wrapper)[2].find('.code-value').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe('deleting the account', () => {
        it('asks for confirmation before showing the password field', async () => {
            const wrapper = await mountSettings();

            expect(sections(wrapper)[3].find('form').exists()).toBe(false);

            await sections(wrapper)[3].find('.danger-btn').trigger('click');

            expect(sections(wrapper)[3].find('form').exists()).toBe(true);
            wrapper.unmount();
        });

        it('cancels back out and forgets the password that was typed', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[3].find('.danger-btn').trigger('click');
            await sections(wrapper)[3].find('input').setValue('secret12');
            await sections(wrapper)[3].findAll('.button-row button')[0].trigger('click');
            await sections(wrapper)[3].find('.danger-btn').trigger('click');

            expect(sections(wrapper)[3].find('input').element.value).toBe('');
            expect(mockDeleteAccount).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        it('sends the password and tells the parent the account is gone', async () => {
            const wrapper = await mountSettings();

            await sections(wrapper)[3].find('.danger-btn').trigger('click');
            await sections(wrapper)[3].find('input').setValue('secret12');
            await sections(wrapper)[3].find('form').trigger('submit');
            await settle();

            expect(mockDeleteAccount).toHaveBeenCalledWith('secret12');
            expect(wrapper.emitted('accountDeleted')).toHaveLength(1);
            wrapper.unmount();
        });

        it('shows the failure and tells the parent nothing', async () => {
            mockDeleteAccount.mockRejectedValue(new Error('Invalid password'));
            const wrapper = await mountSettings();

            await sections(wrapper)[3].find('.danger-btn').trigger('click');
            await sections(wrapper)[3].find('form').trigger('submit');
            await settle();
            await wrapper.vm.$nextTick();

            expect(sections(wrapper)[3].find('.error-message').text()).toBe('Invalid password');
            expect(wrapper.emitted('accountDeleted')).toBeUndefined();
            wrapper.unmount();
        });
    });
});
