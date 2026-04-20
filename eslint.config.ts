import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    // ── Global ignores ───────────────────────────────────────────────────────
    { ignores: ['out/', 'dist/', 'dist-electron/', 'node_modules/', 'android/'] },

    // ── Base JS rules ────────────────────────────────────────────────────────
    js.configs.recommended,

    // ── TypeScript rules ─────────────────────────────────────────────────────
    ...ts.configs.recommended,

    // ── Vue rules ────────────────────────────────────────────────────────────
    ...vue.configs['flat/recommended'],

    // Vue files need the TypeScript parser inside <script> blocks
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: { parser: ts.parser },
        },
    },

    // Renderer code runs in the browser — expose DOM globals
    {
        files: ['src/renderer/**/*.{ts,vue}'],
        languageOptions: {
            globals: globals.browser,
        },
    },

    // Main process and preload run in Node — expose Node globals
    {
        files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
        languageOptions: {
            globals: globals.node,
        },
    },

    // ── Project-wide overrides ───────────────────────────────────────────────
    {
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

            // naming convention
            '@typescript-eslint/naming-convention': [
                'error',
                // Catch-all: camelCase for anything not matched below
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow', // allow _id (MongoDB), _unused etc.
                    trailingUnderscore: 'forbid',
                },
                // Variables: camelCase or UPPER_CASE constants; PascalCase for Vue component refs
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                // Import bindings: PascalCase for Vue SFCs and class constructors (Redis, Hls, etc.)
                {
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                },
                // Functions: camelCase; PascalCase allowed for Vue SFCs defined as functions
                {
                    selector: 'function',
                    format: ['camelCase', 'PascalCase'],
                },
                // Parameters: leading _ for intentionally unused params only
                {
                    selector: 'parameter',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                // Class / type properties: camelCase; UPPER_CASE for static readonly constants
                {
                    selector: 'property',
                    format: ['camelCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                // Escape hatch for class/type quoted properties ('Content-Type', '__v', etc.)
                {
                    selector: 'property',
                    modifiers: ['requiresQuotes'],
                    format: null,
                },
                // Object literal properties: PascalCase for AWS SDK / vi.mock keys; snake_case for
                // DB field names and wire-format identifiers (notification types, action names, etc.)
                {
                    selector: 'objectLiteralProperty',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                // Escape hatch for object literals with keys that require quotes
                {
                    selector: 'objectLiteralProperty',
                    modifiers: ['requiresQuotes'],
                    format: null,
                },
                // Classes, interfaces, type aliases, enums: PascalCase
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
                // Enum members: UPPER_CASE — Status.ACTIVE not Status.Active
                {
                    selector: 'enumMember',
                    format: ['UPPER_CASE'],
                },
                // Generic type parameters: T-prefixed PascalCase — TKey, TValue, TResult
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                    prefix: ['T'],
                },
            ],

            '@typescript-eslint/no-explicit-any': 'warn',

            'vue/multi-word-component-names': 'off',

            'vue/no-v-html': 'off',
        },
    },

    // ── Prettier last — disables conflicting formatting rules ────────────────
    prettier,
];
