import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountWithI18n } from '@test-utils';

const mockRegister = vi.fn();
const mockLogin = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('@/renderer/store', () => ({
    register: (...args: unknown[]) => mockRegister(...args),
    login: (...args: unknown[]) => mockLogin(...args),
    getCurrentUser: () => mockGetCurrentUser(),
    resetPasswordWithRecoveryCode: (...args: unknown[]) => mockResetPassword(...args),
}));

const MonkAuth = (await import('@/renderer/components/MonkAuth.vue')).default;

const user = { username: 'monk', theme: 'dark', language: 'en' };

/** Mount, then let the getCurrentUser probe settle before asserting. */
async function mountAuth() {
    const wrapper = mountWithI18n(MonkAuth);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
}

const links = (wrapper: Awaited<ReturnType<typeof mountAuth>>) => wrapper.findAll('.zen-link-row a');

beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    mockRegister.mockResolvedValue({ token: 't', user });
    mockLogin.mockResolvedValue({ token: 't', user });
    mockResetPassword.mockResolvedValue({ message: 'ok' });
});

describe('MonkAuth', () => {
    describe('restoring a session', () => {
        it('emits auth straight away when a session is still open', async () => {
            mockGetCurrentUser.mockResolvedValue({ user });

            const wrapper = await mountAuth();

            expect(wrapper.emitted('auth')).toEqual([[{ user, token: '' }]]);
            wrapper.unmount();
        });

        it('shows the login form instead of an error when there is no session', async () => {
            const wrapper = await mountAuth();

            expect(wrapper.emitted('auth')).toBeUndefined();
            expect(wrapper.find('form[aria-labelledby="login-title"]').exists()).toBe(true);
            expect(wrapper.find('.error').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe('login', () => {
        it('sends what was typed and emits the session it gets back', async () => {
            const wrapper = await mountAuth();

            await wrapper.findAll('input')[0].setValue('monk');
            await wrapper.findAll('input')[1].setValue('secret12');
            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockLogin).toHaveBeenCalledWith('monk', 'secret12');
            expect(wrapper.emitted('auth')).toEqual([[{ user, token: 't' }]]);
            wrapper.unmount();
        });

        it('shows the failure message and emits nothing', async () => {
            mockLogin.mockRejectedValue(new Error('Invalid username or password'));
            const wrapper = await mountAuth();

            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.error').text()).toBe('Invalid username or password');
            expect(wrapper.emitted('auth')).toBeUndefined();
            wrapper.unmount();
        });

        it('releases the form again after a failure, so a retry is possible', async () => {
            mockLogin.mockRejectedValue(new Error('nope'));
            const wrapper = await mountAuth();

            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();

            expect(wrapper.findAll('input')[0].attributes('disabled')).toBeUndefined();
            wrapper.unmount();
        });
    });

    describe('register', () => {
        it('sends what was typed and emits the session it gets back', async () => {
            const wrapper = await mountAuth();

            await links(wrapper)[0].trigger('click');
            await wrapper.findAll('input')[0].setValue('newmonk');
            await wrapper.findAll('input')[1].setValue('secret12');
            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockRegister).toHaveBeenCalledWith('newmonk', 'secret12');
            expect(wrapper.emitted('auth')).toEqual([[{ user, token: 't' }]]);
            wrapper.unmount();
        });

        it('shows the failure message', async () => {
            mockRegister.mockRejectedValue(new Error('Username already exists'));
            const wrapper = await mountAuth();

            await links(wrapper)[0].trigger('click');
            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.error').text()).toBe('Username already exists');
            wrapper.unmount();
        });
    });

    describe('switching modes', () => {
        it('moves between login, register and recovery', async () => {
            const wrapper = await mountAuth();

            await links(wrapper)[0].trigger('click');
            expect(wrapper.find('form[aria-labelledby="register-title"]').exists()).toBe(true);

            await links(wrapper)[0].trigger('click');
            expect(wrapper.find('form[aria-labelledby="login-title"]').exists()).toBe(true);

            await links(wrapper)[1].trigger('click');
            expect(wrapper.find('form[aria-labelledby="recovery-title"]').exists()).toBe(true);
            wrapper.unmount();
        });

        it('clears a stale error when the form changes, so it cannot be read as the new one', async () => {
            mockLogin.mockRejectedValue(new Error('Invalid username or password'));
            const wrapper = await mountAuth();

            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.error').exists()).toBe(true);

            await links(wrapper)[0].trigger('click');

            expect(wrapper.find('.error').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe('password recovery', () => {
        async function openRecovery() {
            const wrapper = await mountAuth();
            await links(wrapper)[1].trigger('click');
            return wrapper;
        }

        it('refuses locally when the two new passwords differ, without calling the store', async () => {
            const wrapper = await openRecovery();

            const inputs = wrapper.findAll('input');
            await inputs[0].setValue('monk');
            await inputs[1].setValue('CODE1234');
            await inputs[2].setValue('newpass12345');
            await inputs[3].setValue('different1234');
            await wrapper.find('form').trigger('submit');
            await wrapper.vm.$nextTick();

            expect(mockResetPassword).not.toHaveBeenCalled();
            expect(wrapper.find('.error').text()).not.toBe('');
            wrapper.unmount();
        });

        it('sends username, code and new password, then confirms', async () => {
            const wrapper = await openRecovery();

            const inputs = wrapper.findAll('input');
            await inputs[0].setValue('monk');
            await inputs[1].setValue('CODE1234');
            await inputs[2].setValue('newpass12345');
            await inputs[3].setValue('newpass12345');
            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();

            expect(mockResetPassword).toHaveBeenCalledWith('monk', 'CODE1234', 'newpass12345');
            expect(wrapper.find('form[aria-labelledby="recovery-title"]').exists()).toBe(false);
            wrapper.unmount();
        });

        it('shows the failure message and stays on the form', async () => {
            mockResetPassword.mockRejectedValue(new Error('Invalid username or recovery code'));
            const wrapper = await openRecovery();

            const inputs = wrapper.findAll('input');
            await inputs[2].setValue('newpass12345');
            await inputs[3].setValue('newpass12345');
            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.error').text()).toBe('Invalid username or recovery code');
            expect(wrapper.find('form[aria-labelledby="recovery-title"]').exists()).toBe(true);
            wrapper.unmount();
        });

        it('returns to a blank login form from the confirmation', async () => {
            const wrapper = await openRecovery();

            const inputs = wrapper.findAll('input');
            await inputs[0].setValue('monk');
            await inputs[2].setValue('newpass12345');
            await inputs[3].setValue('newpass12345');
            await wrapper.find('form').trigger('submit');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await wrapper.vm.$nextTick();

            await wrapper.find('.zen-btn, .auth-btn').trigger('click');
            await wrapper.vm.$nextTick();

            expect(wrapper.find('form[aria-labelledby="login-title"]').exists()).toBe(true);

            await wrapper.findAll('.zen-link-row a')[1].trigger('click');
            expect(wrapper.findAll('input')[0].element.value).toBe('');
            wrapper.unmount();
        });
    });
});
