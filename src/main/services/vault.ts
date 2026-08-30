/**
 * vault — the open vault folder, and the settings stored inside it.
 * Owns: vault root resolution and persistence, the folder picker, vault:* and
 * settings:* IPC handlers.
 * Does NOT own: collection I/O (db.ts), journal handlers (data.ts).
 * A vault is any folder the user points at. The app writes its JSON files
 * there and nothing else: no account, no session, no hidden application
 * database. Moving the journal between machines is copying the folder, and
 * putting it in a synced directory is all "sync" means here.
 */

import { BrowserWindow, app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { type IpcResult, type Settings, LanguageArgSchema, SettingsSchema, ThemeArgSchema } from '@/schemas/storage';
import type { IpcMain, OpenDialogOptions } from 'electron';
import { readJsonFile, writeJsonFile } from '@/main/lib/jsonFile';
import { log } from '@/main/lib/logger';

/**
 * The one thing the app keeps outside the vault: which folder to reopen. It
 * lives in userData rather than in the vault for the obvious reason — there is
 * nowhere else to look before a vault is known.
 */
const STATE_FILE = path.join(app.getPath('userData'), 'state.json');

const SETTINGS_FILE = 'settings.json';

const DEFAULT_SETTINGS: Settings = { theme: 'dark', language: 'en' };

let vaultRoot: string | null = restoreVaultRoot();

export function register(ipc: IpcMain): void {
    ipc.handle('vault:findPath', (): IpcResult<string | null> => {
        return { success: true, data: vaultRoot };
    });

    // The only thing that changes the vault root. There is deliberately no
    // channel that takes a path from the renderer: a folder becomes the vault
    // because the user picked it in the OS dialog, which is also what grants
    // access to it on macOS.
    ipc.handle('vault:choose', async (): Promise<IpcResult<string | null>> => {
        try {
            const options: OpenDialogOptions = {
                title: 'Choose your vault folder',
                properties: ['openDirectory', 'createDirectory'],
                // Electron 43+ falls back to Downloads when this is unset.
                defaultPath: vaultRoot ?? app.getPath('documents'),
            };

            // Parented to the window when there is one, so the dialog is modal
            // to the app. Opening a throwaway BrowserWindow just to have a parent
            // would leave a stray window behind on cancel.
            const window = BrowserWindow.getFocusedWindow();
            const result =
                window === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(window, options);

            if (result.canceled || result.filePaths.length === 0) return { success: true, data: null };

            vaultRoot = result.filePaths[0];
            persistVaultRoot();
            log.info('Vault opened', { vault: vaultRoot });
            return { success: true, data: vaultRoot };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('vault:close', (): IpcResult<null> => {
        vaultRoot = null;
        persistVaultRoot();
        return { success: true, data: null };
    });

    ipc.handle('settings:get', (): IpcResult<Settings> => {
        return { success: true, data: readSettings() };
    });

    ipc.handle('settings:updateTheme', (_event, theme: unknown): IpcResult<Settings> => {
        const parsed = ThemeArgSchema.safeParse({ theme });
        if (!parsed.success) return { success: false, error: 'Invalid theme' };
        return saveSetting({ theme: parsed.data.theme });
    });

    ipc.handle('settings:updateLanguage', (_event, language: unknown): IpcResult<Settings> => {
        const parsed = LanguageArgSchema.safeParse({ language });
        if (!parsed.success) return { success: false, error: 'Invalid language' };
        return saveSetting({ language: parsed.data.language });
    });
}

/** The open vault, or a refusal. Every collection read and write goes through it. */
export function getVaultRoot(): string {
    if (vaultRoot === null) throw new Error('No vault is open');
    return vaultRoot;
}

/**
 * Settings travel with the vault rather than with the machine, so a folder
 * carried to another computer arrives in the theme and language it was left
 * in. Anything unrecognised in the file falls back to the default instead of
 * failing the read — a hand-edited settings.json should not brick the app.
 */
function readSettings(): Settings {
    if (vaultRoot === null) return DEFAULT_SETTINGS;
    const raw = readJsonFile<unknown>(path.join(vaultRoot, SETTINGS_FILE), {});
    const parsed = SettingsSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

function saveSetting(change: Partial<Settings>): IpcResult<Settings> {
    try {
        const next = { ...readSettings(), ...change };
        writeJsonFile(path.join(getVaultRoot(), SETTINGS_FILE), next);
        return { success: true, data: next };
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

/**
 * A remembered vault that no longer exists reads as no vault at all. The folder
 * is the user's — they are free to move, rename or delete it between launches,
 * and the app has to come up asking for a new one rather than failing every
 * read against a dead path.
 */
function restoreVaultRoot(): string | null {
    const saved = readJsonFile<{ vaultRoot?: unknown }>(STATE_FILE, {}).vaultRoot;
    if (typeof saved !== 'string' || saved === '') return null;

    const resolved = path.resolve(saved);
    if (!fs.existsSync(resolved)) {
        log.info('Remembered vault no longer exists, ignoring', { vault: resolved });
        return null;
    }
    return resolved;
}

function persistVaultRoot(): void {
    try {
        writeJsonFile(STATE_FILE, { vaultRoot });
    } catch (err) {
        // Not fatal: the vault is open for this run, it just will not reopen.
        log.error('Failed to persist vault root', err);
    }
}
