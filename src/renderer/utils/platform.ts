/**
 * platform — runtime platform detection (Electron vs Capacitor vs web).
 * Owns: isElectron(), isCapacitor(), isMobile(), isWeb() checks.
 * Does NOT own: adapter selection (store/adapters/factory.ts).
 */

interface ElectronWindow {
    electronAPI?: {
        isElectron?: () => boolean;
    };
}

export function isElectron(): boolean {
    return !!(window as unknown as ElectronWindow).electronAPI?.isElectron?.();
}

export function isDesktop(): boolean {
    return isElectron();
}

export function isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isWeb(): boolean {
    return !isElectron();
}

export function getPlatform(): string {
    if (isElectron()) {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('mac')) return 'darwin';
        if (ua.includes('win')) return 'win32';
        if (ua.includes('linux')) return 'linux';
        return 'unknown';
    }
    if (isMobile()) return 'mobile';
    return 'web';
}
