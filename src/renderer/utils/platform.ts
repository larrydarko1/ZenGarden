/**
 * platform — runtime platform detection (Electron desktop vs everything else).
 * Owns: the isDesktop() check.
 * Does NOT own: adapter selection (store/adapters/factory.ts).
 */

/**
 * True only in the Electron renderer, where preload exposes `electronAPI.isElectron`.
 * Each step is checked rather than trusted to the Window declaration: on Android and
 * in a plain browser nothing put the bridge there, or something else did.
 */
export function isDesktop(): boolean {
    const api: unknown = window.electronAPI;
    if (typeof api !== 'object' || api === null || !('isElectron' in api)) return false;
    const { isElectron } = api;
    return typeof isElectron === 'function' && isElectron.call(api) === true;
}
