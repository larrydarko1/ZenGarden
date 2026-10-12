/**
 * storage — the shapes that cross the IPC boundary.
 * Owns: the wire vocabulary shared by main, preload and renderer, and the Zod
 * schemas the main process validates handler arguments against.
 * Does NOT own: the renderer's adapter contract (renderer/store/types.ts),
 * the bridge signature (electron.d.ts).
 * This lives under schemas/ rather than in the renderer because the preload
 * types its bridge against it, and the preload cannot import from renderer/.
 * Everything the renderer sends arrives as `unknown` — contextBridge carries
 * whatever the caller passed, and a compromised renderer is the threat model.
 * The schemas below are where that becomes typed data; nothing above them
 * repeats the check.
 */

import { z } from 'zod';

/**
 * Why an IPC call failed. The renderer gets the code; the error itself stays in the
 * main-process log, because its message is English the window cannot translate and
 * can name paths on the user's disk.
 */
export type IpcErrorCode = 'INVALID_ARGUMENTS' | 'NO_VAULT' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'DISK_FULL' | 'UNKNOWN';

export type IpcResult<T> = { success: true; data: T } | { success: false; error: IpcErrorCode };

/** The themes the stylesheet defines — anything else is a bad write. */
const ThemeSchema = z.enum(['light', 'dark']);

export type Theme = z.infer<typeof ThemeSchema>;

/** The locales that ship under assets/locales/. */
const LanguageSchema = z.enum(['en', 'es', 'it', 'fr', 'de', 'pt', 'zh', 'ja']);

export type Language = z.infer<typeof LanguageSchema>;

/**
 * The vault's settings.json. Every field falls back rather than failing, so a
 * hand-edited file with one bad value still opens the vault — this is a folder
 * the user owns and is invited to poke at.
 */
export const SettingsSchema = z.object({
    theme: ThemeSchema.catch('dark'),
    language: LanguageSchema.catch('en'),
});

export type Settings = z.infer<typeof SettingsSchema>;

const EmotionSchema = z.object({
    name: z.string(),
    type: z.enum(['positive', 'negative']),
});

export type Emotion = z.infer<typeof EmotionSchema>;

const PathItemSchema = z.object({
    path: z.string(),
    note: z.string(),
});

export type PathItem = z.infer<typeof PathItemSchema>;

export const DateRangeQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().int().positive().optional(),
});

export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;

export const MeditationInputSchema = z.object({
    date: z.string(),
    duration: z.number(),
    notes: z.string(),
});

export type MeditationInput = z.infer<typeof MeditationInputSchema>;

export const EmotionLogInputSchema = z.object({
    date: z.string(),
    emotions: z.array(EmotionSchema),
    note: z.string().optional(),
});

export type EmotionLogInput = z.infer<typeof EmotionLogInputSchema>;

export const EightfoldPathInputSchema = z.object({
    date: z.string(),
    paths: z.array(PathItemSchema),
});

export type EightfoldPathInput = z.infer<typeof EightfoldPathInputSchema>;

/*
 * The stored records. A collection file is the user's to copy, sync and hand-edit, so
 * nothing read from one is trusted to have its shape: a read keeps the entries these
 * accept and passes over the rest, and a rewrite puts every entry back as it was read.
 */

export const MeditationSchema = MeditationInputSchema.extend({
    _id: z.string().optional(),
});

export type Meditation = z.infer<typeof MeditationSchema>;

export const EmotionLogSchema = z.object({
    _id: z.string().optional(),
    date: z.string(),
    // Logs have been stored without one; they read as a day with no emotions picked.
    emotions: z.array(EmotionSchema).default([]),
    positiveCount: z.number(),
    negativeCount: z.number(),
    pnRatio: z.number(),
    note: z.string().optional(),
    updatedAt: z.string(),
});

export type EmotionLog = z.infer<typeof EmotionLogSchema>;

export const EightfoldPathLogSchema = z.object({
    _id: z.string().optional(),
    date: z.string(),
    paths: z.array(PathItemSchema),
    completedCount: z.number(),
    progressPercentage: z.number(),
    updatedAt: z.string(),
});

export type EightfoldPathLog = z.infer<typeof EightfoldPathLogSchema>;

/** What a rewrite needs from any entry, readable or not: the day it is filed under, and its id. */
export const DatedEntrySchema = z.object({
    _id: z.string().optional(),
    date: z.string(),
});

export type EmotionStat = {
    name: string;
    count: number;
    type: string;
};

export type EmotionAnalytics = {
    totalDays: number;
    averagePositiveCount: number;
    averageNegativeCount: number;
    averagePNRatio: number;
    emotionDiversity: number;
    positiveDays: number;
    negativeDays: number;
    topEmotions: EmotionStat[];
    trends: { date: string; pnRatio: number }[];
};

export const ThemeArgSchema = z.object({
    theme: ThemeSchema,
});

export const LanguageArgSchema = z.object({
    language: LanguageSchema,
});

/** Analytics windows default to 30 days when the renderer omits the argument. */
export const AnalyticsDaysSchema = z.number().int().positive().default(30);
