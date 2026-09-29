/**
 * zengarden's ESLint config. The shared base — JS/TS/Vue presets, globals, strict type
 * rules, naming, test relaxations — comes from @larrydarko/lint-config. What stays
 * here is the wiring that is genuinely about zengarden's folders: which selectors apply
 * to main, preload, renderer and schemas.
 */
import { larry } from '@larrydarko/lint-config/eslint';
import { PRESETS } from '@larrydarko/lint-config/eslint/presets';
import {
    electronStandards,
    bannedCryptoModules,
    loggerCallSelectors,
    errorHandlingSelectors,
    tsSourceSelectors,
    schemasBannedImports,
    rendererBannedImports,
    mainBannedImports,
    configModuleSelectors,
    noImportMetaEnv,
    noSingleLetterDeclaration,
    utilsBannedImportPatterns,
    libBannedImportPatterns,
    noStoreLibraryPatterns,
    aliasOnlyImportPatterns,
    functionContractsPlugin,
} from '@larrydarko/lint-config/eslint/electron';

const SOURCE = ['src/**/*.{ts,vue}', 'scripts/**/*.ts'];

export default larry({
    preset: 'electron',
    rootDir: import.meta.dirname,
    paths: {
        // `dist/` and `android/` are both generated: `vite build` writes the renderer bundle
        // to dist/, and `cap sync` copies it on into android/app/src/main/assets/public/. Both
        // are gitignored build output, so linting them reports ~900 errors in code no one wrote.
        ignores: [...PRESETS.electron.ignores, 'dist/', 'android/'],
    },
    testProject: './tsconfig.test.json',
    // The scripts are run by Node directly, with no bundler in front, so an import there has to
    // name the real `.ts` file or it fails with ERR_MODULE_NOT_FOUND.
    importExtensions: { nodeRun: ['scripts/**/*.ts'] },
    // Test helpers are typed by their callers, not by an exported signature.
    testRules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },

    standards: electronStandards({
        i18n: {
            // The locales ship inside the renderer bundle: src/renderer/i18n.ts imports them.
            localeFiles: 'src/renderer/locales/*.json',
            // A brand name reads the same in every locale.
            ignoreText: ['ZenGarden'],
            // Keys the usage scan cannot see. It resolves only literal `t('a.b')` calls, so a key
            // built from a template literal reads as unused however plainly it is used:
            //   settings.themes.*  — t(`settings.themes.${theme}`)   in SettingsPopup.vue
            //   eightfold.paths.*  — t(`eightfold.paths.${...}`)     in EightfoldPathView.vue
            //   emotions.list.*    — t(`emotions.list.${...}`)       in EmotionTracker.vue
            // Message arrays read whole via `tm()`, which the rule does not follow at all:
            //   calendar.months / calendar.weekdays — tm() in MeditationCalendar.vue
            //   phrases                             — tm() in Home.vue
            // Keys held in a data structure and resolved as `t(section.titleKey)`:
            //   philosophy.<section>.title/body     — ZenPhilosophy.vue
            unscannedKeys: [
                '/^settings\\.themes\\./',
                '/^eightfold\\.paths\\./',
                '/^emotions\\.list\\./',
                '/^calendar\\.months/',
                '/^calendar\\.weekdays/',
                '/^phrases/',
                '/^philosophy\\.(practice|noGoals|noStreaks|silence|observation)\\./',
            ],
        },
    }),

    overrides: [
        {
            // The preload bridge is one object literal typed as `ElectronAPI`, so TypeScript
            // already checks every member against the contract the renderer consumes.
            // Re-annotating each arrow would duplicate src/schemas/electron.d.ts by hand.
            files: ['src/preload/**/*.ts'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': [
                    'error',
                    { allowTypedFunctionExpressions: true, allowIIFEs: true },
                ],
            },
        },

        // ── Restricted syntax, composed per process ──────────────────────────
        // One block per area: `no-restricted-syntax` is last-match-wins, not additive.
        {
            files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    ...loggerCallSelectors,
                    ...errorHandlingSelectors,
                    ...tsSourceSelectors,
                    noSingleLetterDeclaration,
                ],
            },
        },
        {
            files: ['src/renderer/**/*.{ts,vue}'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    ...loggerCallSelectors,
                    ...errorHandlingSelectors,
                    noImportMetaEnv,
                    ...tsSourceSelectors,
                    noSingleLetterDeclaration,
                ],
            },
        },
        {
            files: ['src/schemas/**/*.ts'],
            rules: {
                'no-restricted-syntax': ['error', ...tsSourceSelectors, noSingleLetterDeclaration],
            },
        },
        {
            files: ['**/lib/config.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    ...configModuleSelectors,
                    ...tsSourceSelectors,
                    noSingleLetterDeclaration,
                ],
            },
        },

        // ── Restricted imports, composed per process ─────────────────────────
        {
            files: ['src/main/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: bannedCryptoModules,
                        patterns: [...mainBannedImports.patterns, ...aliasOnlyImportPatterns],
                    },
                ],
            },
        },
        {
            files: ['src/main/lib/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: bannedCryptoModules,
                        patterns: [
                            ...mainBannedImports.patterns,
                            ...aliasOnlyImportPatterns,
                            ...libBannedImportPatterns,
                        ],
                    },
                ],
            },
        },
        {
            files: ['src/preload/**/*.ts'],
            rules: {
                'no-restricted-imports': ['error', { paths: bannedCryptoModules, patterns: aliasOnlyImportPatterns }],
            },
        },
        {
            files: ['src/schemas/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: bannedCryptoModules,
                        patterns: [...schemasBannedImports.patterns, ...aliasOnlyImportPatterns],
                    },
                ],
            },
        },
        {
            files: ['src/renderer/**/*.{ts,vue}'],
            // i18n.ts imports the locale JSON by relative path — no alias reaches it.
            ignores: ['src/renderer/i18n.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: bannedCryptoModules,
                        patterns: [
                            ...rendererBannedImports.patterns,
                            ...noStoreLibraryPatterns,
                            ...aliasOnlyImportPatterns,
                        ],
                    },
                ],
            },
        },
        {
            files: ['src/renderer/utils/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: bannedCryptoModules,
                        patterns: [
                            ...rendererBannedImports.patterns,
                            ...noStoreLibraryPatterns,
                            ...aliasOnlyImportPatterns,
                            ...utilsBannedImportPatterns,
                        ],
                    },
                ],
            },
        },

        // ── Function contracts — the name must match what the signature promises ─
        {
            files: SOURCE,
            plugins: { contracts: functionContractsPlugin },
            rules: {
                'contracts/name-contract': 'error',
                'contracts/one-failure-channel': 'error',
                'contracts/no-undefined-hole': 'error',
                'contracts/no-boolean-flag': 'error',
                'no-nested-ternary': 'error',
            },
        },
    ],
});
