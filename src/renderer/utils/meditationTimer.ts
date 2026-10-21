/**
 * meditationTimer — the native session timer, which rings the bells while the screen is locked.
 * Owns: the bridge to the MeditationTimer Capacitor plugin (Android only), and the saved record
 * of the session in progress, which outlives the WebView.
 * Does NOT own: the on-screen countdown (useMeditationSession.ts), the service itself
 * (android/.../MeditationTimerService.java).
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

type NativeSessionOptions = {
    /** Wall-clock end of the session, in ms since the epoch — the on-screen countdown's too. */
    endsAt: number;
    durationSec: number;
    /** 0 rings no interval bells. */
    bellIntervalSec: number;
    /** A bundled bell file, e.g. `bell1.mp3`. */
    bellAsset: string;
};

/**
 * A session started and not yet written up. Android may reload the WebView, or end the app,
 * while the screen is locked; this is what brings the countdown or the notes back afterwards.
 */
export type PendingSession = {
    /** Wall-clock end, in ms since the epoch. */
    endsAt: number;
    durationMin: number;
    bellEnabled: boolean;
    bellInterval: number;
    bellSound: string;
};

type MeditationTimerPlugin = {
    start: (options: NativeSessionOptions) => Promise<void>;
    stop: () => Promise<void>;
    dismissEndReminder: () => Promise<void>;
};

const PLUGIN_NAME = 'MeditationTimer';
const PENDING_SESSION_KEY = 'meditation.pendingSession';

const MeditationTimer = registerPlugin<MeditationTimerPlugin>(PLUGIN_NAME);

/** True on Android. On desktop and in a browser the WebView's own timer plays the sounds. */
export function hasNativeTimer(): boolean {
    return Capacitor.isPluginAvailable(PLUGIN_NAME);
}

/**
 * Starts the native session; it plays the interval bells and the end alert, then stops itself.
 * Calling it again for the running session reschedules it, e.g. with new bell settings.
 */
export function startNativeTimer(options: NativeSessionOptions): Promise<void> {
    return MeditationTimer.start(options);
}

/** Ends the native session early, before its end alert. */
export function stopNativeTimer(): Promise<void> {
    return MeditationTimer.stop();
}

/** Takes down the notification asking for the session notes. */
export function dismissEndReminder(): Promise<void> {
    return MeditationTimer.dismissEndReminder();
}

export async function savePendingSession(session: PendingSession): Promise<void> {
    await Preferences.set({ key: PENDING_SESSION_KEY, value: JSON.stringify(session) });
}

/** The saved session, or null when there is none or it can't be read. */
export async function loadPendingSession(): Promise<PendingSession | null> {
    const { value } = await Preferences.get({ key: PENDING_SESSION_KEY });
    if (value === null) return null;
    try {
        const parsed: unknown = JSON.parse(value);
        return isPendingSession(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export async function clearPendingSession(): Promise<void> {
    await Preferences.remove({ key: PENDING_SESSION_KEY });
}

/** Checks a stored record field by field: it was written by an older build, or by hand. */
function isPendingSession(value: unknown): value is PendingSession {
    if (typeof value !== 'object' || value === null) return false;
    const record: Partial<Record<keyof PendingSession, unknown>> = value;
    return (
        typeof record.endsAt === 'number' &&
        typeof record.durationMin === 'number' &&
        typeof record.bellEnabled === 'boolean' &&
        typeof record.bellInterval === 'number' &&
        typeof record.bellSound === 'string'
    );
}
