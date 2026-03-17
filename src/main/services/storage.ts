// storage — IPC handler registration entry point.
// Owns: merging handler maps and registering them with ipcMain.
// Does NOT own: persistence (db.ts), crypto (crypto.ts), handler logic (auth.ts, data.ts).

import type { IpcMain } from 'electron';
import { authHandlers } from './auth';
import { dataHandlers } from './data';

// ─── Registration ─────────────────────────────────────────────────────────────

export function setupStorageHandlers(ipcMain: IpcMain): void {
    const allHandlers = { ...authHandlers, ...dataHandlers };

    for (const [channel, handler] of Object.entries(allHandlers)) {
        ipcMain.handle(channel, handler);
    }
}
