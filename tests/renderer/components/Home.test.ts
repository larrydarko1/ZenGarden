import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, computed } from 'vue';
import { mountWithI18n } from '@test-utils';

const mockGetMeditations = vi.fn();
const mockCreateMeditation = vi.fn();
const mockGetVaultPath = vi.fn();
const mockGetSettings = vi.fn();
const mockCloseVault = vi.fn();
const mockCanChooseVault = vi.fn();
const mockIsDesktop = vi.fn().mockReturnValue(false);
const mockLogError = vi.fn();

vi.mock('@/renderer/store', () => ({
    getMeditations: () => mockGetMeditations(),
    createMeditation: (...args: unknown[]) => mockCreateMeditation(...args),
    findVaultPath: () => mockGetVaultPath(),
    getSettings: () => mockGetSettings(),
    closeVault: () => mockCloseVault(),
    vaultIsPickable: () => mockCanChooseVault(),
}));

vi.mock('@/renderer/utils/platform', () => ({ isDesktop: () => mockIsDesktop() }));

vi.mock('@/renderer/utils/logger', () => ({
    log: { error: (...args: unknown[]) => mockLogError(...args), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const meditationActive = ref(false);
const showNotes = ref(false);
const showBellConfig = ref(false);
const showBreathingPicker = ref(false);
const bellEnabled = ref(false);
const isCustomDuration = ref(false);
const completedMeditationDuration = ref(900);

const mockStartMeditation = vi.fn();
const mockStopMeditation = vi.fn();
const mockCleanup = vi.fn();
const mockSelectPresetDuration = vi.fn();
const mockEnableCustomDuration = vi.fn();
const mockApplyCustomDuration = vi.fn();
const mockCancelCustomDuration = vi.fn();
const mockSelectBellSound = vi.fn();
const mockSelectBellSoundFromDropdown = vi.fn();
const mockToggleBreathing = vi.fn();

vi.mock('@/renderer/composables/useMeditationSession', () => ({
    useMeditationSession: () => ({
        meditationActive,
        meditationSeconds: ref(0),
        selectedDuration: ref(10),
        isCustomDuration,
        customDurationValue: ref(10),
        customInput: ref('10'),
        bellEnabled,
        bellInterval: ref(10),
        bellSound: ref('1'),
        showBellConfig,
        showBreathingPicker,
        selectedBreathingExercise: ref(null),
        breathingActive: ref(false),
        breathingPhase: ref('in'),
        breathingPhaseText: ref('In'),
        breathingPhaseDuration: ref(4),
        breathingCycleCount: ref(0),
        breathingExercises: computed(() => [{ key: 'box', name: 'Box', description: '4-4-4-4' }]),
        completedMeditationDuration,
        showNotes,
        meditationAnimationIdx: ref(0),
        selectPresetDuration: mockSelectPresetDuration,
        enableCustomDuration: mockEnableCustomDuration,
        applyCustomDuration: mockApplyCustomDuration,
        cancelCustomDuration: mockCancelCustomDuration,
        selectBellSound: mockSelectBellSound,
        selectBellSoundFromDropdown: mockSelectBellSoundFromDropdown,
        toggleBreathingDuringMeditation: mockToggleBreathing,
        startMeditation: mockStartMeditation,
        stopMeditation: mockStopMeditation,
        cleanup: mockCleanup,
        formatTime: (seconds: number) => `t:${seconds}`,
    }),
}));

const Home = (await import('@/renderer/components/Home.vue')).default;

const settings = { theme: 'light', language: 'fr' };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const stubs = {
    VaultPicker: { name: 'VaultPicker', template: '<div class="vault-picker-stub" />' },
    BottomNav: { name: 'BottomNav', template: '<div class="bottom-nav-stub" />' },
    SessionNotes: { name: 'SessionNotes', template: '<div class="session-notes-stub" />' },
    MeditationOverlay: { name: 'MeditationOverlay', template: '<div class="overlay-stub" />' },
    EmotionTracker: { name: 'EmotionTracker', template: '<div class="emotion-tracker-stub" />' },
    MeditationCalendar: { name: 'MeditationCalendar', template: '<div class="calendar-stub" />' },
    ZenPhilosophy: { name: 'ZenPhilosophy', template: '<div class="philosophy-stub" />' },
    SettingsPopup: { name: 'SettingsPopup', template: '<div class="settings-stub" />' },
};

const mountHome = () => mountWithI18n(Home, { global: { stubs } });

/** Mount with a vault open, which is what puts the main screen on. */
async function mountWithVault() {
    const wrapper = mountHome();
    wrapper.findComponent(stubs.VaultPicker).vm.$emit('opened', '/vault');
    await settle();
    await wrapper.vm.$nextTick();
    return wrapper;
}

beforeEach(() => {
    vi.clearAllMocks();
    meditationActive.value = false;
    showNotes.value = false;
    showBellConfig.value = false;
    showBreathingPicker.value = false;
    bellEnabled.value = false;
    isCustomDuration.value = false;
    mockGetMeditations.mockResolvedValue({ meditations: [] });
    mockGetSettings.mockResolvedValue(settings);
    mockCreateMeditation.mockResolvedValue({ message: 'ok' });
    // No vault remembered, so the picker is what a bare mount lands on.
    mockGetVaultPath.mockResolvedValue(null);
    mockCloseVault.mockResolvedValue(undefined);
    mockCanChooseVault.mockResolvedValue(true);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('Home', () => {
    describe('opening a vault', () => {
        it('shows only the picker until a vault is open', () => {
            const wrapper = mountHome();

            expect(wrapper.find('.vault-picker-stub').exists()).toBe(true);
            expect(wrapper.find('.bottom-nav-stub').exists()).toBe(false);
            wrapper.unmount();
        });

        it('swaps to the main screen once one is chosen', async () => {
            const wrapper = await mountWithVault();

            expect(wrapper.find('.vault-picker-stub').exists()).toBe(false);
            expect(wrapper.find('.bottom-nav-stub').exists()).toBe(true);
            wrapper.unmount();
        });

        // Theme and language live in the vault, so they arrive with it.
        it('reports the vault theme and language so the shell can apply them', async () => {
            const wrapper = await mountWithVault();

            expect(wrapper.emitted('theme-changed')?.at(-1)).toEqual(['light']);
            expect(wrapper.emitted('language-changed')?.at(-1)).toEqual(['fr']);
            wrapper.unmount();
        });

        it('loads the meditation history for the calendar', async () => {
            const wrapper = await mountWithVault();

            expect(mockGetMeditations).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('stays on the main screen with an empty history when the read fails', async () => {
            mockGetMeditations.mockRejectedValue(new Error('unreadable'));
            const wrapper = await mountWithVault();

            expect(wrapper.find('.bottom-nav-stub').exists()).toBe(true);
            wrapper.unmount();
        });

        // A vault remembered from the last run skips the picker entirely.
        it('opens a remembered vault without asking', async () => {
            mockGetVaultPath.mockResolvedValue('/remembered');
            const wrapper = mountHome();
            await settle();
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.vault-picker-stub').exists()).toBe(false);
            expect(mockGetSettings).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('falls back to the picker and logs why when the vault cannot be resolved', async () => {
            mockGetVaultPath.mockRejectedValue(new Error('unreadable state'));
            const wrapper = mountHome();
            await settle();
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.vault-picker-stub').exists()).toBe(true);
            expect(mockLogError).toHaveBeenCalledWith('Failed to resolve the vault', expect.any(Error));
            wrapper.unmount();
        });
    });

    describe('closing the vault', () => {
        it('returns to the picker', async () => {
            const wrapper = await mountWithVault();

            wrapper.findComponent(stubs.BottomNav).vm.$emit('close-vault');
            await settle();
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.vault-picker-stub').exists()).toBe(true);
            wrapper.unmount();
        });

        it('keeps the vault open and logs why when closing fails', async () => {
            mockCloseVault.mockRejectedValue(new Error('offline'));
            const wrapper = await mountWithVault();

            wrapper.findComponent(stubs.BottomNav).vm.$emit('close-vault');
            await settle();
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.bottom-nav-stub').exists()).toBe(true);
            expect(mockLogError).toHaveBeenCalledWith('Failed to close vault', expect.any(Error));
            wrapper.unmount();
        });
    });

    describe('sections', () => {
        async function open(wrapper: Awaited<ReturnType<typeof mountWithVault>>, event: string) {
            wrapper.findComponent(stubs.BottomNav).vm.$emit(event);
            await wrapper.vm.$nextTick();
        }

        it.each([
            ['toggle-journal', '.emotion-tracker-stub'],
            ['toggle-calendar', '.calendar-stub'],
            ['toggle-philosophy', '.philosophy-stub'],
            ['toggle-settings', '.settings-stub'],
        ])('%s opens %s', async (event, selector) => {
            const wrapper = await mountWithVault();

            await open(wrapper, event);

            expect(wrapper.find(selector).exists()).toBe(true);
            wrapper.unmount();
        });

        it('closes the section it was showing when a different one is opened', async () => {
            const wrapper = await mountWithVault();

            await open(wrapper, 'toggle-journal');
            await open(wrapper, 'toggle-calendar');

            expect(wrapper.find('.emotion-tracker-stub').exists()).toBe(false);
            expect(wrapper.find('.calendar-stub').exists()).toBe(true);
            wrapper.unmount();
        });

        it('toggles the open section shut when its own button is pressed again', async () => {
            const wrapper = await mountWithVault();

            await open(wrapper, 'toggle-journal');
            await open(wrapper, 'toggle-journal');

            expect(wrapper.find('.emotion-tracker-stub').exists()).toBe(false);
            wrapper.unmount();
        });

        it('refreshes the history when the calendar is opened, so a new session shows', async () => {
            const wrapper = await mountWithVault();
            vi.clearAllMocks();

            await open(wrapper, 'toggle-calendar');
            await settle();

            expect(mockGetMeditations).toHaveBeenCalled();
            wrapper.unmount();
        });

        it('closes the bell and breathing panels when a section takes over the screen', async () => {
            const wrapper = await mountWithVault();
            showBellConfig.value = true;
            showBreathingPicker.value = true;
            await wrapper.vm.$nextTick();

            await open(wrapper, 'toggle-settings');

            expect(showBellConfig.value).toBe(false);
            expect(showBreathingPicker.value).toBe(false);
            wrapper.unmount();
        });

        it('hides the centre phrase while a section is open', async () => {
            const wrapper = await mountWithVault();
            expect(wrapper.find('.zen-center').exists()).toBe(true);

            await open(wrapper, 'toggle-journal');

            expect(wrapper.find('.zen-center').exists()).toBe(false);
            wrapper.unmount();
        });

        it('passes theme and language choices from settings up to the shell', async () => {
            const wrapper = await mountWithVault();

            await open(wrapper, 'toggle-settings');
            wrapper.findComponent(stubs.SettingsPopup).vm.$emit('theme-change', 'dark');
            wrapper.findComponent(stubs.SettingsPopup).vm.$emit('language-change', 'ja');

            expect(wrapper.emitted('theme-change')).toEqual([['dark']]);
            expect(wrapper.emitted('language-change')).toEqual([['ja']]);
            wrapper.unmount();
        });
    });

    describe('the meditation control bar', () => {
        it('offers the four preset durations and hands the chosen one to the session', async () => {
            const wrapper = await mountWithVault();

            const presets = wrapper.findAll(
                '.duration-btn:not(.custom-btn):not(.bell-config-btn):not(.breathing-config-btn)',
            );
            expect(presets.map((preset) => preset.text())).toEqual(['5', '10', '15', '30']);

            await presets[2].trigger('click');

            expect(mockSelectPresetDuration).toHaveBeenCalledWith(15);
            wrapper.unmount();
        });

        it('starts the session with the number of animations to choose from', async () => {
            const wrapper = await mountWithVault();

            await wrapper.find('.start-meditation-btn').trigger('click');

            expect(mockStartMeditation).toHaveBeenCalledWith(5);
            wrapper.unmount();
        });

        it('swaps the control bar for the overlay once a session is running', async () => {
            const wrapper = await mountWithVault();

            meditationActive.value = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.overlay-stub').exists()).toBe(true);
            expect(wrapper.find('.meditation-control-bar').exists()).toBe(false);
            expect(wrapper.find('.bottom-nav-stub').exists()).toBe(false);
            wrapper.unmount();
        });

        it('tells the shell when a session starts and stops, so the chrome can react', async () => {
            const wrapper = await mountWithVault();

            meditationActive.value = true;
            await wrapper.vm.$nextTick();
            meditationActive.value = false;
            await wrapper.vm.$nextTick();

            expect(wrapper.emitted('meditation-active')).toEqual([[true], [false]]);
            wrapper.unmount();
        });

        it('opens the custom duration field on request', async () => {
            const wrapper = await mountWithVault();

            await wrapper.find('.custom-btn').trigger('click');

            expect(mockEnableCustomDuration).toHaveBeenCalled();
            wrapper.unmount();
        });
    });

    describe('the bell panel', () => {
        it('stays shut until the bell button is pressed', async () => {
            const wrapper = await mountWithVault();

            expect(wrapper.find('.breathing-picker-panel').exists()).toBe(false);
            wrapper.unmount();
        });

        it('turns bells on at the chosen interval and closes behind the choice', async () => {
            const wrapper = await mountWithVault();
            showBellConfig.value = true;
            await wrapper.vm.$nextTick();

            // The first option is "none"; the four after it are the intervals.
            const options = wrapper.findAll('.breathing-picker-options .breathing-option-btn');
            expect(options).toHaveLength(5);

            await options[3].trigger('click');

            expect(bellEnabled.value).toBe(true);
            expect(showBellConfig.value).toBe(false);
            wrapper.unmount();
        });

        it('turns bells off from the "none" option', async () => {
            const wrapper = await mountWithVault();
            bellEnabled.value = true;
            showBellConfig.value = true;
            await wrapper.vm.$nextTick();

            await wrapper.findAll('.breathing-picker-options .breathing-option-btn')[0].trigger('click');

            expect(bellEnabled.value).toBe(false);
            expect(showBellConfig.value).toBe(false);
            wrapper.unmount();
        });

        it('offers the four bell sounds only once bells are on', async () => {
            const wrapper = await mountWithVault();
            showBellConfig.value = true;
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.bell-sound-section').exists()).toBe(false);

            bellEnabled.value = true;
            await wrapper.vm.$nextTick();

            const sounds = wrapper.findAll('.bell-sound-options-inline button');
            expect(sounds).toHaveLength(4);
            await sounds[1].trigger('click');
            expect(mockSelectBellSound).toHaveBeenCalledWith('2');
            wrapper.unmount();
        });
    });

    describe('the breathing picker', () => {
        it('lists the exercises the session offers, and closes from the backdrop', async () => {
            const wrapper = await mountWithVault();
            showBreathingPicker.value = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.findAll('.breathing-option-name').map((option) => option.text())).toContain('Box');

            await wrapper.find('.breathing-picker-backdrop').trigger('click');

            expect(showBreathingPicker.value).toBe(false);
            wrapper.unmount();
        });
    });

    describe('session notes', () => {
        it('appears only after a session finishes', async () => {
            const wrapper = await mountWithVault();
            expect(wrapper.find('.session-notes-stub').exists()).toBe(false);

            showNotes.value = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.session-notes-stub').exists()).toBe(true);
            wrapper.unmount();
        });

        it('records the session with its note, in whole minutes', async () => {
            const wrapper = await mountWithVault();
            showNotes.value = true;
            await wrapper.vm.$nextTick();

            wrapper.findComponent(stubs.SessionNotes).vm.$emit('save', 'settled');
            await settle();

            expect(mockCreateMeditation).toHaveBeenCalledWith(expect.any(String), 15, 'settled');
            expect(showNotes.value).toBe(false);
            wrapper.unmount();
        });

        it('still records the session when the note is skipped', async () => {
            const wrapper = await mountWithVault();
            showNotes.value = true;
            await wrapper.vm.$nextTick();

            wrapper.findComponent(stubs.SessionNotes).vm.$emit('skip');
            await settle();

            expect(mockCreateMeditation).toHaveBeenCalledWith(expect.any(String), 15, '');
            wrapper.unmount();
        });

        it('keeps the panel open when the write fails, so the note is not lost', async () => {
            mockCreateMeditation.mockRejectedValue(new Error('disk full'));
            const wrapper = await mountWithVault();
            showNotes.value = true;
            await wrapper.vm.$nextTick();

            wrapper.findComponent(stubs.SessionNotes).vm.$emit('save', 'settled');
            await settle();
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.session-notes-stub').exists()).toBe(true);
            wrapper.unmount();
        });
    });

    it('releases the session timers when the screen goes away', async () => {
        const wrapper = await mountWithVault();

        wrapper.unmount();

        expect(mockCleanup).toHaveBeenCalled();
    });
});
