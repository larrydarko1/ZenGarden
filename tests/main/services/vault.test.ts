import type { IpcMain } from 'electron';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { readJsonFile, writeJsonFile } from '@/main/lib/jsonFile';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const state = vi.hoisted(() => ({
    savedState: {} as Record<string, unknown>,
    settings: undefined as unknown,
    vaultExists: true,
    dialogResult: { canceled: false, filePaths: ['/chosen/vault'] } as {
        canceled: boolean;
        filePaths: string[];
    },
}));

vi.mock('electron', () => ({
    app: { getPath: (name: string): string => `/app/${name}` },
    dialog: { showOpenDialog: vi.fn(() => Promise.resolve(state.dialogResult)) },
    BrowserWindow: { getFocusedWindow: (): null => null },
}));

vi.mock('fs', () => {
    const api = { existsSync: (): boolean => state.vaultExists };
    return { default: api, ...api };
});

vi.mock('@/main/lib/jsonFile', () => ({
    readJsonFile: vi.fn((filePath: string, fallback: unknown) => {
        if (String(filePath).endsWith('settings.json')) return state.settings ?? fallback;
        return state.savedState;
    }),
    writeJsonFile: vi.fn(),
}));

vi.mock('@/main/lib/logger', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

async function loadVault(): Promise<Map<string, Handler>> {
    vi.resetModules();
    const handlers = new Map<string, Handler>();
    const vault = await import('@/main/services/vault');
    vault.register({ handle: (channel: string, fn: Handler) => handlers.set(channel, fn) } as unknown as IpcMain);
    return handlers;
}

beforeEach(() => {
    state.savedState = {};
    state.settings = undefined;
    state.vaultExists = true;
    state.dialogResult = { canceled: false, filePaths: ['/chosen/vault'] };
    vi.clearAllMocks();
});

describe('vault:findPath', () => {
    it('reports no vault on a first run', async () => {
        const handlers = await loadVault();
        expect(await handlers.get('vault:findPath')!(null)).toEqual({ success: true, data: null });
    });

    it('reopens the vault remembered from the last run', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        const handlers = await loadVault();
        expect(await handlers.get('vault:findPath')!(null)).toEqual({ success: true, data: '/remembered/vault' });
    });

    it('forgets a remembered vault that no longer exists', async () => {
        state.savedState = { vaultRoot: '/deleted/vault' };
        state.vaultExists = false;
        const handlers = await loadVault();
        expect(await handlers.get('vault:findPath')!(null)).toEqual({ success: true, data: null });
    });

    it.each([
        ['an empty path', ''],
        ['a non-string', 42],
    ])('ignores %s in state.json', async (_label, saved) => {
        state.savedState = { vaultRoot: saved };
        const handlers = await loadVault();
        expect(await handlers.get('vault:findPath')!(null)).toEqual({ success: true, data: null });
    });
});

describe('vault:choose', () => {
    it('opens the chosen folder and remembers it', async () => {
        const handlers = await loadVault();

        expect(await handlers.get('vault:choose')!(null)).toEqual({ success: true, data: '/chosen/vault' });
        expect(writeJsonFile).toHaveBeenCalledWith('/app/userData/state.json', { vaultRoot: '/chosen/vault' });
    });

    it('leaves the current vault alone when the dialog is cancelled', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        state.dialogResult = { canceled: true, filePaths: [] };
        const handlers = await loadVault();

        expect(await handlers.get('vault:choose')!(null)).toEqual({ success: true, data: null });
        expect(await handlers.get('vault:findPath')!(null)).toEqual({ success: true, data: '/remembered/vault' });
    });

    it('reports a dialog failure rather than throwing across the bridge', async () => {
        const { dialog } = await import('electron');
        vi.mocked(dialog.showOpenDialog).mockRejectedValueOnce(new Error('no display'));
        const handlers = await loadVault();

        expect(await handlers.get('vault:choose')!(null)).toEqual({ success: false, error: 'no display' });
    });
});

describe('vault:close', () => {
    it('forgets the open vault', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        const handlers = await loadVault();

        expect(await handlers.get('vault:close')!(null)).toEqual({ success: true, data: null });
        expect(await handlers.get('vault:findPath')!(null)).toEqual({ success: true, data: null });
        expect(writeJsonFile).toHaveBeenCalledWith('/app/userData/state.json', { vaultRoot: null });
    });
});

describe('settings', () => {
    it('reads settings from the open vault', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        state.settings = { theme: 'light', language: 'fr' };
        const handlers = await loadVault();

        expect(await handlers.get('settings:get')!(null)).toEqual({
            success: true,
            data: { theme: 'light', language: 'fr' },
        });
        expect(readJsonFile).toHaveBeenCalledWith('/remembered/vault/settings.json', {});
    });

    it('falls back to the defaults when no vault is open', async () => {
        const handlers = await loadVault();
        expect(await handlers.get('settings:get')!(null)).toEqual({
            success: true,
            data: { theme: 'dark', language: 'en' },
        });
    });

    it('falls back per field on a hand-edited file', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        state.settings = { theme: 'neon', language: 'fr' };
        const handlers = await loadVault();

        expect(await handlers.get('settings:get')!(null)).toEqual({
            success: true,
            data: { theme: 'dark', language: 'fr' },
        });
    });

    it('writes an updated theme back into the vault', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        const handlers = await loadVault();

        expect(await handlers.get('settings:updateTheme')!(null, 'light')).toEqual({
            success: true,
            data: { theme: 'light', language: 'en' },
        });
        expect(writeJsonFile).toHaveBeenCalledWith('/remembered/vault/settings.json', {
            theme: 'light',
            language: 'en',
        });
    });

    it('keeps the other setting when only one changes', async () => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        state.settings = { theme: 'light', language: 'en' };
        const handlers = await loadVault();

        expect(await handlers.get('settings:updateLanguage')!(null, 'ja')).toEqual({
            success: true,
            data: { theme: 'light', language: 'ja' },
        });
    });

    it.each([
        ['settings:updateTheme', 'neon', 'Invalid theme'],
        ['settings:updateLanguage', 'klingon', 'Invalid language'],
    ])('refuses %s with an unknown value', async (channel, value, error) => {
        state.savedState = { vaultRoot: '/remembered/vault' };
        const handlers = await loadVault();

        expect(await handlers.get(channel)!(null, value)).toEqual({ success: false, error });
        expect(writeJsonFile).not.toHaveBeenCalled();
    });

    it('refuses to write settings with no vault open', async () => {
        const handlers = await loadVault();
        expect(await handlers.get('settings:updateTheme')!(null, 'light')).toEqual({
            success: false,
            error: 'No vault is open',
        });
    });
});
