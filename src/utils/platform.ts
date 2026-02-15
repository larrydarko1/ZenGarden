// Platform detection utilities for ZenGarden

/**
 * Check if the app is running in Electron
 */
export function isElectron(): boolean {
    return !!(window as any).electronAPI?.isElectron?.();
}

/**
 * Check if the app is running on desktop (Electron)
 */
export function isDesktop(): boolean {
    return isElectron();
}

/**
 * Check if the app is running on mobile web
 */
export function isMobile(): boolean {
    return /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if the app is running on web (not Electron)
 */
export function isWeb(): boolean {
    return !isElectron();
}

/**
 * Get the current platform (darwin, win32, linux, web, mobile)
 */
export function getPlatform(): string {
    if (isElectron()) {
        return (window as any).electron?.platform || 'unknown';
    }
    if (isMobile()) {
        return 'mobile';
    }
    return 'web';
}
