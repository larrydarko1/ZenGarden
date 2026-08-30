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

export type IpcResult<T> = { success: true; data: T } | { success: false; error: string };

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

export type Meditation = {
    _id?: string;
    date: string;
    duration: number;
    notes: string;
};

export type EmotionLog = {
    _id?: string;
    date: string;
    emotions: Emotion[];
    positiveCount: number;
    negativeCount: number;
    pnRatio: number;
    note?: string;
    updatedAt: string;
};

export type EightfoldPathLog = {
    _id?: string;
    date: string;
    paths: PathItem[];
    completedCount: number;
    progressPercentage: number;
    updatedAt: string;
};

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

export type EightfoldPathAnalytics = {
    totalDays: number;
    averageCompletion: number;
    perfectDays: number;
    mostFollowedPaths: { path: string; count: number }[];
    trends: { date: string; completedCount: number }[];
};

export const ThemeArgSchema = z.object({
    theme: ThemeSchema,
});

export const LanguageArgSchema = z.object({
    language: LanguageSchema,
});

/** Analytics windows default to 30 days when the renderer omits the argument. */
export const AnalyticsDaysSchema = z.number().int().positive().default(30);
