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

type Theme = z.infer<typeof ThemeSchema>;

/** The locales that ship under assets/locales/. */
const LanguageSchema = z.enum(['en', 'es', 'it', 'fr', 'de', 'pt', 'zh', 'ja']);

type Language = z.infer<typeof LanguageSchema>;

/**
 * Usernames are trimmed before they are measured, so " ab " fails on length
 * rather than on the regex. The message is deliberately the same for every
 * way of being wrong — it is what the account form shows the user.
 */
const UsernameSchema = z
    .string({ error: 'Username must be 3-32 alphanumeric characters' })
    .trim()
    .regex(/^[a-zA-Z0-9]+$/, { error: 'Username must be 3-32 alphanumeric characters' })
    .min(3, { error: 'Username must be 3-32 alphanumeric characters' })
    .max(32, { error: 'Username must be 3-32 alphanumeric characters' });

const PasswordSchema = z
    .string({ error: 'Password must be a string' })
    .min(8, { error: 'Password must be at least 8 characters' });

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

export type User = {
    username: string;
    theme: Theme;
    language: Language;
};

export type UserCredentials = {
    username: string;
    password: string;
};

export type AuthResponse = {
    message: string;
    user: User;
    token: string;
};

export type Meditation = {
    _id?: string;
    username: string;
    date: Date | string;
    duration: number;
    notes: string;
};

export type EmotionLog = {
    _id?: string;
    username: string;
    date: Date | string;
    emotions: Emotion[];
    positiveCount: number;
    negativeCount: number;
    pnRatio: number;
    note?: string;
    updatedAt: Date | string;
};

export type EightfoldPathLog = {
    _id?: string;
    username: string;
    date: Date | string;
    paths: PathItem[];
    completedCount: number;
    progressPercentage: number;
    updatedAt: Date | string;
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

export type RecoveryStatus = {
    hasRecoveryCodes: boolean;
    totalCodes: number;
    usedCodes: number;
    remainingCodes: number;
};

/**
 * Registration preferences are advisory, not authoritative: the account is
 * created either way. `.catch()` on each field is what turns an unknown theme
 * into the default instead of a failed signup.
 */
export const RegisterArgsSchema = z.object({
    username: UsernameSchema,
    password: PasswordSchema,
    options: z
        .object({
            theme: ThemeSchema.catch('dark'),
            language: LanguageSchema.catch('en'),
        })
        .catch({ theme: 'dark', language: 'en' }),
});

/**
 * Login deliberately does NOT reuse UsernameSchema. A too-short username must
 * fail exactly the way a wrong password does, or the error text tells an
 * attacker which half they got right.
 */
export const LoginArgsSchema = z.object({
    username: z.string({ error: 'Invalid username or password' }).trim(),
    password: z.string({ error: 'Invalid username or password' }),
});

export const PasswordArgSchema = z.object({
    password: z.string({ error: 'Invalid password' }),
});

export const UpdateUsernameArgsSchema = z.object({
    newUsername: UsernameSchema,
    password: z.string({ error: 'Invalid password' }),
});

export const UpdatePasswordArgsSchema = z.object({
    currentPassword: z.string({ error: 'Password must be a string' }),
    newPassword: PasswordSchema,
});

export const ThemeArgSchema = z.object({
    theme: ThemeSchema,
});

export const LanguageArgSchema = z.object({
    language: LanguageSchema,
});

/** Same silence as LoginArgsSchema: a bad code and a bad username read alike. */
export const ResetPasswordArgsSchema = z.object({
    username: z.string({ error: 'Invalid username or recovery code' }).trim(),
    code: z.string({ error: 'Invalid username or recovery code' }),
    newPassword: PasswordSchema,
});

/** Analytics windows default to 30 days when the renderer omits the argument. */
export const AnalyticsDaysSchema = z.number().int().positive().default(30);
