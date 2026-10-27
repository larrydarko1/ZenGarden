// The gates `larry check` runs, and each one's options. The editor lists every option a gate takes.
import { defineConfig } from '@larrydarko/lint-config/config';

/**
 * Files over the 400-line softcap when the ratchet was set, at the size they were.
 * A file may shrink freely; growing past its entry, or a new file crossing the cap,
 * fails. Lower a number when you refactor, never raise it — and when one drops back
 * under the cap the gate says so, because an entry left behind is a licence to
 * regrow to the old number.
 */
const LENGTH_BASELINE: Record<string, number> = {
    'src/renderer/components/Home.vue': 519,
};

export default defineConfig({
    family: 'electron',
    gates: {
        // The allowlist is the one part that is this project's decision, and the goal is for it to stay
        // empty: an entry is only ever right when the fix is out of reach from here.
        'audit': {
            allowlist: [
                // Each entry: { id, package, reason, expires }. The reason must say BOTH
                // why it cannot be fixed here and why it is unreachable in zengarden's code.
            ],
        },
        // An SFC filename is PascalCase because it is the component name; everything else under src/ is
        // camelCase. Headers: first match wins. A main-process module under lib/ or services/ owes a JSDoc
        // block, since which external concern it owns (the filesystem, a config file) is not derivable from
        // its exports; a composable owes a `//` line saying what state it owns; an SFC owes nothing, since
        // defineProps and defineEmits are the contract. The baseline counts non-blank lines without
        // `<style>`.
        'code-style': {
            scan: ['src'],
            baseline: LENGTH_BASELINE,
            casing: [
                { files: /\.vue$/, style: 'pascal' },
                { files: /\.ts$/, style: 'camel' },
            ],
            headers: [
                { files: /^src\/main\/(lib|services)\/.*\.ts$/, require: 'jsdoc' },
                { files: /^src\/renderer\/composables\/.*\.ts$/, require: 'comment' },
                { files: /\.vue$/, require: 'none' },
            ],
        },
        'contrast': { skip: 'No script ran it before larry upgrade.' },
        // A dependency Electron loads indirectly (a native backend, a builder hook) looks unused to an import
        // graph: it goes under `ignoreDependencies` in knip.config.js with a reason, never in a raised
        // budget. Budgets are all zero and stay there.
        'dead-code': {
            notMachineChecked:
                'code reachable from an entry point but never reached at RUNTIME — an IPC handler nothing calls, a branch no setting enables.',
        },
        // src/ and tests/ are the whole scope. zengarden is one package, so imports get three groups:
        // builtin, external, local. `@test-utils` is a tsconfig path into this repo, so it sorts as local.
        'declaration-order': {
            sourceRoots: ['src', 'tests'],
            importOrder: { localAliases: ['@test-utils'] },
        },
        // Each number is a judgement that only goes down, split by format because the three have different
        // stakes. A false positive (two blocks alike that mean different things) raises a ceiling with a
        // comment; the code stays as is.
        'duplication': {
            scan: ['src'],
            ceilings: {
                typescript: { limit: 4, note: 'logic — two copies of a branch is how a fixed bug comes back.' },
                scss: {
                    limit: 8,
                    note: 'presentation — real debt, and what the shared mixins in components.scss exist to absorb, but a stale copy makes something look wrong rather than behave wrong.',
                },
                html: {
                    limit: 6,
                    note: 'SFC markup — structural repetition is often cheaper than another component.',
                },
            },
            // The largest clone today is 129 tokens, the panel layout LanguagePicker and
            // ThemePicker share. The cap was set at 160 when that clone was 147.
            maxCloneTokens: 160,
        },
        // `require` is three tags: `lang`, which screen readers read before the app picks a locale,
        // `charset`, and `appMount`, since renaming `#app` renders nothing with no error. No `title`:
        // src/main/index.ts sets `title: ''` on purpose. The viewport and theme-color are there for the
        // Capacitor build, which serves the same file on Android, but not required. `csp: true`: a packaged
        // build loads over `file://`, with no server to send a header, so the meta tag is the policy.
        'html-standards': {
            indexHtml: 'src/renderer/index.html',
            baseScss: 'src/renderer/styles/_base.scss',
            require: ['lang', 'charset', 'appMount'],
            csp: true,
        },
        // The locales are bundled with the renderer and imported by src/renderer/i18n.ts, so `en` is both the
        // reference and the fallback.
        'i18n': {
            localeDir: 'src/renderer/locales',
            configFile: 'src/renderer/i18n.ts',
        },
        'licenses': { skip: 'No script ran it before larry upgrade.' },
        // One manifest, no workspaces. `private: true` guards against a stray `npm publish`, and `build`,
        // `main` and `os` are required because the packaging rules read them.
        'package-json': {
            rootRequired: [
                'name',
                'version',
                'description',
                'keywords',
                'homepage',
                'bugs',
                'license',
                'author',
                'repository',
                'type',
                'main',
                'engines',
                'os',
                'private',
                'packageManager',
                'build',
            ],
            tildeAllowed: {
                typescript:
                    'Its minor releases introduce new type errors, so a minor bump is a code change, not a dependency bump.',
            },
        },
        'pipeline': {},
        // Markers match uppercase only, which matters here: the gate reads the locale files, and the
        // Spanish and Portuguese word for "all" is the first marker in lowercase.
        'refactoring': {},
        // `index.scss` is the entry, imported once by main.ts. `_variables.scss` is injected into every SFC
        // style block, each its own Sass compilation, so anything reachable from it that emits ships once per
        // component; the mixins live there because a mixin emits nothing until included. Two Vite configs,
        // because the same SFCs build for the desktop app (electron-vite) and for Android (Capacitor). The
        // palettes are literal `#app.<theme>` blocks in _themes.scss, with `:root` sharing the dark block so
        // the first frame paints before App.vue sets the theme class. `componentLocalVars` names the
        // properties a component sets on itself through `:style`, each with its reason.
        'scss-standards': {
            styles: 'src/renderer/styles',
            src: 'src/renderer',
            mainScript: 'src/renderer/main.ts',
            viteConfigs: ['electron.vite.config.ts', 'vite.config.ts'],
            injectedSpecifier: '@/renderer/styles/variables',
            emitters: [
                {
                    module: 'themes',
                    why: 'The palettes are CSS custom properties. Un-@used, every `var(--token)` in the app resolves to nothing.',
                },
                {
                    module: 'base',
                    why: '_base.scss carries the reset, element defaults and the reduced-motion override. Un-@used, none of it reaches the bundle.',
                },
                {
                    module: 'components',
                    why: 'components/ holds the classes shared across unrelated SFCs. Un-@used, every template naming one of them renders unstyled.',
                },
            ],
            themes: {
                source: 'css-blocks',
                file: 'src/renderer/styles/_themes.scss',
                reference: 'dark',
                selector: 'app-class',
            },
            componentLocalVars: {
                'i': 'MonkAuth.vue — form field index, staggers the field-in animation delay',
                'peak-opacity':
                    'ZenParticlesAnimation.vue — per-band peak opacity, so three keyframe tracks cover all 62 particles',
            },
        },
        'secrets': { skip: 'No script ran it before larry upgrade.' },
        // Tests mirror src/ under tests/, one top-level directory per src/ directory: add a new area to both
        // together. `e2e: false` is a decision, not a gap: Playwright's Electron API is experimental, so
        // raise adding E2E before doing it. Thresholds only rise and the exclude list may not grow.
        // `vmBaseline: 0`: `wrapper.vm` is counted rather than banned.
        'testing': {
            config: 'vitest.config.ts',
            layout: { kind: 'mirrored', root: 'tests', areas: ['main', 'preload', 'renderer', 'schemas'] },
            e2e: false,
            thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
            excludes: {
                'src/renderer/main.ts': 'renderer bootstrap — mounts the app and installs plugins, no branch to cover',
                'src/main/index.ts': 'Electron entry — creates the BrowserWindow, only exercised by launching the app',
                'src/**/*.d.ts': 'declarations, no runtime',
                'src/**/*.html': 'markup, not code',
            },
            domEnvironment: { name: 'jsdom', config: 'vitest.config.ts' },
            vmBaseline: 0,
        },
        // The renderer runs with context isolation on and node integration off, so `process`, `Buffer` and
        // `require` do not exist there. `browserSources` checks the code as well as the config: one `///
        // <reference types="node" />` in any dependency's typings puts Node's globals in scope. Tests are
        // exempt. `nonEmitting` is not passed: no package here is consumed as TypeScript source.
        'tsconfigs': {
            nodeTyped: ['tsconfig.node.json'],
            browserProjects: ['tsconfig.app.json'],
            browserSources: ['src/renderer'],
            // Capacitor's generated Android project; `cap sync` copies the web build into it.
            ignore: ['android'],
        },
        // No options: the renderer has no `v-html` and the app registers no custom protocol. The first
        // `v-html` fails until a `vHtml` entry says why it is safe.
        'electron-security': {},
        // `cleanupRequired` is empty: the main process reads and writes JSON files synchronously, plus
        // argon2, which is stateless per call. Add a service the day one owns a watcher, a socket or a native
        // session.
        'error-handling/electron': { cleanupRequired: [] },
        'ipc-standards': {},
    },
});
