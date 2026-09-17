/**
 * platform — runtime platform detection (Electron desktop vs everything else).
 * Owns: the isDesktop() check.
 * Does NOT own: adapter selection (store/adapters/factory.ts).
 */

type ElectronWindow = {
    electronAPI?: {
        isElectron?: () => boolean;
    };
};

/** True only in the Electron renderer, where preload exposes `electronAPI.isElectron`. */
export function isDesktop(): boolean {
    return (window as unknown as ElectronWindow).electronAPI?.isElectron?.() === true;
}
