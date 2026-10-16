/**
 * Capacitor Storage Adapter - Android vault storage.
 * Owns: class facade implementing IStorageAdapter. Delegates to capacitor/ sub-modules.
 *
 * The vault is a fixed folder — see capacitor/db.ts for why Android gets no
 * picker — so `chooseVault` has nothing to open and `canChooseVault` is false.
 */

import { Preferences } from '@capacitor/preferences';
import type { z } from 'zod';

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
import {
    DatedEntrySchema,
    EightfoldPathLogSchema,
    EmotionLogSchema,
    MeditationSchema,
    SettingsSchema,
} from '@/schemas/storage';

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
        const raw = await readObject(DB_FILES.settings);
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

        const meditations = await readCollection(DB_FILES.meditations);
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
        return { meditations: await readDocs(DB_FILES.meditations, MeditationSchema) };
    }

    // ─── Emotions ────────────────────────────────────────────────────────────
    async saveEmotionLog(input: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }> {
        await this.ensureInitialized();

        const positiveCount = input.emotions.filter((e) => e.type === 'positive').length;
        const negativeCount = input.emotions.filter((e) => e.type === 'negative').length;
        const total = positiveCount + negativeCount;
        const pnRatio = total > 0 ? positiveCount / total : 0;

        const emotionLog = await saveByDate(DB_FILES.emotionLogs, {
            date: input.date,
            emotions: input.emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            ...(input.note !== undefined ? { note: input.note } : {}),
            updatedAt: new Date().toISOString(),
        });

        return { message: 'Emotion log saved successfully', emotionLog };
    }

    async getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }> {
        await this.ensureInitialized();

        const emotionLogs = await readDocs(DB_FILES.emotionLogs, EmotionLogSchema);
        return { emotionLogs: applyDateRange(emotionLogs, query) };
    }

    async getEmotionAnalytics(days = 30): Promise<EmotionAnalytics> {
        await this.ensureInitialized();

        const emotionLogs = await readDocs(DB_FILES.emotionLogs, EmotionLogSchema);
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

        const completedCount = input.paths.filter((p) => p.note.trim() !== '').length;
        const progressPercentage = (completedCount / 8) * 100;

        const pathLog = await saveByDate(DB_FILES.eightfoldPathLogs, {
            date: input.date,
            paths: input.paths,
            completedCount,
            progressPercentage,
            updatedAt: new Date().toISOString(),
        });

        return { message: 'Eightfold path log saved successfully', pathLog };
    }

    async getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }> {
        await this.ensureInitialized();

        const logs = await readDocs(DB_FILES.eightfoldPathLogs, EightfoldPathLogSchema);
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

/**
 * The entries of a collection that `schema` accepts. One that does not parse is
 * passed over rather than failing the read, and stays in the file: saveByDate
 * writes it back untouched.
 */
async function readDocs<T>(filename: string, schema: z.ZodType<T>): Promise<T[]> {
    const entries = await readCollection(filename);
    return entries.flatMap((entry) => {
        const parsed = schema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
    });
}

/**
 * Files `doc` under its date: it replaces the entry already dated that day, keeping
 * that entry's id, or is appended with a new one. Every other entry is written back
 * exactly as it was read, including any readDocs passes over.
 */
async function saveByDate<T extends { date: string }>(filename: string, doc: T): Promise<T & { _id: string }> {
    const entries = await readCollection(filename);
    const index = entries.findIndex((entry) => DatedEntrySchema.safeParse(entry).data?.date === doc.date);
    const saved = { _id: DatedEntrySchema.safeParse(entries[index]).data?._id ?? generateObjectId(), ...doc };

    if (index >= 0) {
        entries[index] = saved;
    } else {
        entries.push(saved);
    }
    await writeCollection(filename, entries);
    return saved;
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
