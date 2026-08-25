/**
 * Renderer logger — the renderer's single console site.
 *
 * The main process logs through electron-log (src/main/lib/logger.ts), but the renderer
 * cannot: this same bundle is also the Capacitor mobile build, where there is no Electron
 * and no IPC bridge to forward to. Importing electron-log here would break the Android
 * build at module load.
 *
 * So the rule the standard is really enforcing — no console calls scattered across
 * feature code — is kept by funnelling every renderer log through this one module. It is
 * the only file in src/renderer allowed to touch console, and the disable below is scoped
 * to it.
 *
 * Messages stay low-cardinality (no interpolation): pass variables as the second argument
 * so identical events group together when reading a log.
 */

/* eslint-disable no-console -- see the header: this module is the renderer's single, deliberate console site. */

export const log = {
    info(message: string, data?: unknown): void {
        if (data === undefined) console.info(message);
        else console.info(message, data);
    },

    warn(message: string, data?: unknown): void {
        if (data === undefined) console.warn(message);
        else console.warn(message, data);
    },

    error(message: string, data?: unknown): void {
        if (data === undefined) console.error(message);
        else console.error(message, data);
    },
};
