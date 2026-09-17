/**
 * Capacitor Storage Adapter - Android vault storage.
 * Owns: class facade implementing IStorageAdapter. Delegates to capacitor/ sub-modules.
 *
 * The vault is a fixed folder — see capacitor/db.ts for why Android gets no
 * picker — so `chooseVault` has nothing to open and `canChooseVault` is false.
 */

import { Preferences } from '@capacitor/preferences';
import {
    DB_FILES,
    VAULT_DIR,
    readCollection,
    readObject,
    writeCollection,
    writeObject,
    generateObjectId,
    initializeStorage,
} from '@/renderer/store/adapters/capacitor/db';
import { SettingsSchema } from '@/schemas/storage';
import type {
    IStorageAdapter,
    Settings,
    Theme,
    Language,
    Meditation,
    MeditationInput,
    EmotionLog,
    EmotionLogInput,
    EightfoldPathLog,
    EightfoldPathInput,
    EmotionAnalytics,
    EmotionStat,
    DateRangeQuery,
} from '@/renderer/store/types';

export class CapacitorStorageAdapter implements IStorageAdapter {
    private initialized = false;

    async probeAvailability(): Promise<boolean> {
        try {
            // Check if Capacitor APIs are available
            await Preferences.get({ key: 'test' });
            return true;
        } catch {
            return false;
        }
    }

    // ─── Vault ───────────────────────────────────────────────────────────────
    // Widened to match the contract: on the desktop side absence is a real
    // answer, so the shared signature admits null even though this one never
    // returns it — the vault here is fixed and always present.
    async findVaultPath(): Promise<string | null> {
        await this.ensureInitialized();
        return `Documents/${VAULT_DIR}`;
    }

    /** No picker on Android — the answer is always the folder already in use. */
    async chooseVault(): Promise<string | null> {
        return this.findVaultPath();
    }

    /** Closing is meaningless when the vault cannot be changed. */
    closeVault(): Promise<void> {
        return Promise.resolve();
    }

    canChooseVault(): boolean {
        return false;
    }

    // ─── Settings ────────────────────────────────────────────────────────────
    async getSettings(): Promise<Settings> {
        await this.ensureInitialized();
        const raw = await readObject<unknown>(DB_FILES.settings);
        const parsed = SettingsSchema.safeParse(raw ?? {});
        return parsed.success ? parsed.data : { theme: 'dark', language: 'en' };
    }

    async updateTheme(theme: Theme): Promise<Settings> {
        return this.saveSetting({ theme });
    }

    async updateLanguage(language: Language): Promise<Settings> {
        return this.saveSetting({ language });
    }

    // ─── Meditations ─────────────────────────────────────────────────────────
    async createMeditation(input: MeditationInput): Promise<{ message: string; meditation: Meditation }> {
        await this.ensureInitialized();

        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const newMeditation: Meditation = {
            _id: generateObjectId(),
            date: input.date,
            duration: input.duration,
            notes: input.notes,
        };

        meditations.push(newMeditation);
        await writeCollection(DB_FILES.meditations, meditations);

        return { message: 'Meditation saved successfully', meditation: newMeditation };
    }

    async getMeditations(): Promise<{ meditations: Meditation[] }> {
        await this.ensureInitialized();
        return { meditations: await readCollection<Meditation>(DB_FILES.meditations) };
    }

    // ─── Emotions ────────────────────────────────────────────────────────────
    async saveEmotionLog(input: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }> {
        await this.ensureInitialized();

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);

        // Check if entry exists for this date
        const existingIndex = emotionLogs.findIndex((log) => log.date === input.date);

        const positiveCount = input.emotions.filter((e) => e.type === 'positive').length;
        const negativeCount = input.emotions.filter((e) => e.type === 'negative').length;
        const pnRatio = negativeCount > 0 ? positiveCount / negativeCount : positiveCount;

        const emotionLog: EmotionLog = {
            _id: emotionLogs[existingIndex]?._id ?? generateObjectId(),
            date: input.date,
            emotions: input.emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            ...(input.note !== undefined ? { note: input.note } : {}),
            updatedAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
            emotionLogs[existingIndex] = emotionLog;
        } else {
            emotionLogs.push(emotionLog);
        }

        await writeCollection(DB_FILES.emotionLogs, emotionLogs);

        return { message: 'Emotion log saved successfully', emotionLog };
    }

    async getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }> {
        await this.ensureInitialized();

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);
        return { emotionLogs: applyDateRange(emotionLogs, query) };
    }

    async getEmotionAnalytics(days = 30): Promise<EmotionAnalytics> {
        await this.ensureInitialized();

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);
        const recentLogs = emotionLogs.filter((log) => log.date >= cutoffDate(days));

        // Calculate emotion frequencies
        const emotionCounts = new Map<string, EmotionStat>();
        let positiveDays = 0;
        let negativeDays = 0;

        recentLogs.forEach((log) => {
            if (log.pnRatio >= 0.5) positiveDays++;
            else negativeDays++;

            log.emotions.forEach((emotion) => {
                const counter = emotionCounts.get(emotion.name) ?? { name: emotion.name, type: emotion.type, count: 0 };
                counter.count++;
                emotionCounts.set(emotion.name, counter);
            });
        });

        // Build emotion frequency array
        const topEmotions = [...emotionCounts.values()].sort((a, b) => b.count - a.count);

        // Calculate averages
        const totalPositive = recentLogs.reduce((sum, log) => sum + log.positiveCount, 0);
        const totalNegative = recentLogs.reduce((sum, log) => sum + log.negativeCount, 0);
        const totalRatio = recentLogs.reduce((sum, log) => sum + log.pnRatio, 0);

        // Build trends
        const trends = recentLogs.map((log) => ({ date: log.date, pnRatio: log.pnRatio }));

        return {
            totalDays: recentLogs.length,
            averagePositiveCount: recentLogs.length > 0 ? totalPositive / recentLogs.length : 0,
            averageNegativeCount: recentLogs.length > 0 ? totalNegative / recentLogs.length : 0,
            averagePNRatio: recentLogs.length > 0 ? totalRatio / recentLogs.length : 0,
            emotionDiversity: emotionCounts.size,
            positiveDays,
            negativeDays,
            topEmotions,
            trends,
        };
    }

    // ─── Eightfold path ──────────────────────────────────────────────────────
    async saveEightfoldPathLog(input: EightfoldPathInput): Promise<{ message: string; pathLog: EightfoldPathLog }> {
        await this.ensureInitialized();

        const logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);
        const existingIndex = logs.findIndex((l) => l.date === input.date);

        const completedCount = input.paths.filter((p) => p.note !== undefined && p.note.trim() !== '').length;
        const progressPercentage = (completedCount / 8) * 100;

        const log: EightfoldPathLog = {
            _id: logs[existingIndex]?._id ?? generateObjectId(),
            date: input.date,
            paths: input.paths,
            completedCount,
            progressPercentage,
            updatedAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
            logs[existingIndex] = log;
        } else {
            logs.push(log);
        }

        await writeCollection(DB_FILES.eightfoldPathLogs, logs);

        return { message: 'Eightfold path log saved successfully', pathLog: log };
    }

    async getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }> {
        await this.ensureInitialized();

        const logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);
        return { pathLogs: applyDateRange(logs, query) };
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await initializeStorage();
            this.initialized = true;
        }
    }

    private async saveSetting(change: Partial<Settings>): Promise<Settings> {
        const next = { ...(await this.getSettings()), ...change };
        await writeObject(DB_FILES.settings, next);
        return next;
    }
}

/** Shared startDate/endDate/limit filter — the two log collections query alike. */
function applyDateRange<T extends { date: string }>(logs: T[], query?: DateRangeQuery): T[] {
    let filtered = logs;

    if (query?.startDate !== undefined && query.startDate !== '') {
        const startDate = query.startDate;
        filtered = filtered.filter((log) => log.date >= startDate);
    }
    if (query?.endDate !== undefined && query.endDate !== '') {
        const endDate = query.endDate;
        filtered = filtered.filter((log) => log.date <= endDate);
    }
    if (query?.limit !== undefined && query.limit > 0) {
        filtered = filtered.slice(-query.limit);
    }

    return filtered;
}

/** Start of an analytics window, as a YYYY-MM-DD string to compare log dates against. */
function cutoffDate(days: number): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff.toISOString().slice(0, 10);
}
