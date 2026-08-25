import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountWithI18n } from '@test-utils';
import { i18n } from '@/renderer/i18n';

const mockUpdateTheme = vi.fn().mockResolvedValue({ message: 'ok', theme: 'light' });
const mockUpdateLanguage = vi.fn().mockResolvedValue({ message: 'ok', language: 'fr' });
const mockIsDesktop = vi.fn().mockReturnValue(false);
const mockLogError = vi.fn();

vi.mock('@/renderer/store', () => ({
    updateTheme: (...args: unknown[]) => mockUpdateTheme(...args),
    updateLanguage: (...args: unknown[]) => mockUpdateLanguage(...args),
}));

vi.mock('@/renderer/utils/platform', () => ({
    isDesktop: () => mockIsDesktop(),
}));

vi.mock('@/renderer/utils/logger', () => ({
    log: { error: (...args: unknown[]) => mockLogError(...args), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const HomeStub = { name: 'Home', template: '<div class="home-stub" />' };

const App = (await import('@/renderer/App.vue')).default;

const mountApp = () => mountWithI18n(App, { global: { stubs: { Home: HomeStub } } });
const home = (wrapper: ReturnType<typeof mountApp>) => wrapper.findComponent(HomeStub);

beforeEach(() => {
    vi.clearAllMocks();
    mockIsDesktop.mockReturnValue(false);
    i18n.global.locale.value = 'en';
});

describe('App', () => {
    it('starts on the dark theme', () => {
        const wrapper = mountApp();

        expect(wrapper.find('#app').classes()).toContain('dark');
        wrapper.unmount();
    });

    it('adds the desktop header class only when running in Electron', async () => {
        const web = mountApp();
        await web.vm.$nextTick();
        expect(web.find('#app').classes()).not.toContain('has-desktop-header');
        web.unmount();

        mockIsDesktop.mockReturnValue(true);
        const desktop = mountApp();
        await desktop.vm.$nextTick();
        expect(desktop.find('#app').classes()).toContain('has-desktop-header');
        desktop.unmount();
    });

    describe('theme applied at login', () => {
        it('adopts a theme the account already had, without writing it back', async () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('theme-changed', 'light');
            await wrapper.vm.$nextTick();

            expect(wrapper.find('#app').classes()).toContain('light');
            expect(mockUpdateTheme).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        it('ignores a theme the stylesheet does not define', async () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('theme-changed', 'solarized');
            await wrapper.vm.$nextTick();

            expect(wrapper.find('#app').classes()).toContain('dark');
            wrapper.unmount();
        });
    });

    describe('theme changed from settings', () => {
        it('applies it and persists it', async () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('theme-change', 'light');
            await wrapper.vm.$nextTick();

            expect(wrapper.find('#app').classes()).toContain('light');
            expect(mockUpdateTheme).toHaveBeenCalledWith('light');
            wrapper.unmount();
        });

        it('refuses an unknown theme rather than persisting it', async () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('theme-change', 'solarized');
            await wrapper.vm.$nextTick();

            expect(mockUpdateTheme).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        it('keeps the applied theme when the write fails, and logs why', async () => {
            mockUpdateTheme.mockRejectedValueOnce(new Error('disk full'));
            const wrapper = mountApp();

            home(wrapper).vm.$emit('theme-change', 'light');
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(wrapper.find('#app').classes()).toContain('light');
            expect(mockLogError).toHaveBeenCalledWith('Failed to update theme', expect.any(Error));
            wrapper.unmount();
        });
    });

    describe('language', () => {
        it('adopts the account language at login, without writing it back', () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('language-changed', 'fr');

            expect(i18n.global.locale.value).toBe('fr');
            expect(mockUpdateLanguage).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        it('ignores a locale that does not ship', () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('language-changed', 'kl');

            expect(i18n.global.locale.value).toBe('en');
            wrapper.unmount();
        });

        it('switches and persists a language chosen in settings', () => {
            const wrapper = mountApp();

            home(wrapper).vm.$emit('language-change', 'fr');

            expect(i18n.global.locale.value).toBe('fr');
            expect(mockUpdateLanguage).toHaveBeenCalledWith('fr');
            wrapper.unmount();
        });

        it('keeps the switched language when the write fails, and logs why', async () => {
            mockUpdateLanguage.mockRejectedValueOnce(new Error('disk full'));
            const wrapper = mountApp();

            home(wrapper).vm.$emit('language-change', 'fr');
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(i18n.global.locale.value).toBe('fr');
            expect(mockLogError).toHaveBeenCalledWith('Failed to update language', expect.any(Error));
            wrapper.unmount();
        });
    });

    it('tracks meditation and sign-in state Home reports without crashing the shell', async () => {
        const wrapper = mountApp();

        home(wrapper).vm.$emit('meditation-active', true);
        home(wrapper).vm.$emit('user-changed', { username: 'u', theme: 'dark', language: 'en' });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('#app').exists()).toBe(true);
        wrapper.unmount();
    });
});
