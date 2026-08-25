#!/usr/bin/env node
/**
 * SCSS architecture gate.
 *   1. THE BARREL. index.scss @forwards the token modules and @uses the ones that
 *      emit rules, and main.ts imports it exactly once. Import it twice and every
 *      global rule is emitted twice; drop the @forward and `@use '@/renderer/styles'`
 *      silently stops resolving the tokens.
 *   2. THE VITE INJECTION. `css.preprocessorOptions.scss.additionalData` in
 *      electron.vite.config.ts is what makes `$space-*` and the colour aliases
 *      available inside every SFC without an import. Lose it and every component
 *      fails to compile at once — yet nothing in the style files themselves
 *      records that they depend on it. The `index.scss` guard in that function
 *      matters too: without it the barrel @uses itself and sass fails on a
 *      circular load. vite.config.ts carries the same injection for the Capacitor
 *      build, which compiles the identical SFCs.
 *   3. THEME TOKEN PARITY. The palettes live in variables.scss as one custom-
 *      property block per theme, plus a `:root` block for the frame that paints
 *      before App.vue puts the theme class on #app. So a token has three places
 *      it must agree:
 *        • the `:root` block — the pre-theme fallback;
 *        • every `#app.<theme>` block;
 *        • every `var(--token)` in a stylesheet or SFC.
 *      Each mismatch fails silently and differently. A token missing from ONE
 *      theme falls through to `:root`, so that element is off-palette in that
 *      theme only, for whoever picked it. A token in the themes but not in
 *      `:root` has nothing to paint on the first frame. A `var()` in neither
 *      renders as nothing. This is the CSS analogue of the locale parity in
 *      check-i18n.mjs, and it is the reason that gate exists.
 *   4. SELF-HOSTED EVERYTHING. No CDN `@import url()`, no remote font. Zero
 *      third-party requests is a claim about what is ABSENT from the repo, which
 *      only a sweep can check — and in a local-first app it is a privacy
 *      guarantee, not a performance preference. It also has to hold offline: the
 *      app ships as a desktop binary and an Android APK, neither of which can
 *      assume a network on first launch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const STYLES = 'src/renderer/styles';
const VARIABLES = `${STYLES}/variables.scss`;
const INDEX = `${STYLES}/index.scss`;
const MAIN_TS = 'src/renderer/main.ts';
const VITE_CONFIGS = ['electron.vite.config.ts', 'vite.config.ts'];
const REFERENCE_THEME = 'dark';

/**
 * Custom properties a component sets itself through a `:style` binding, so they
 * are deliberately absent from the theme palette. Keep the reason with the name.
 */
const COMPONENT_LOCAL_VARS = new Map([['i', 'MonkAuth.vue — form field index, staggers the field-in animation delay']]);

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. The barrel ────────────────────────────────────────────────────────────
const index = read(INDEX);
const mainTs = read(MAIN_TS);

if (!/@forward\s+['"][^'"]*variables['"]/.test(index)) {
    fail(
        INDEX,
        'does not `@forward` variables',
        "SFCs reach the tokens through `@use '@/renderer/styles'`, which only resolves what the barrel forwards.",
    );
}
if (!/@use\s+['"][^'"]*base['"]/.test(index)) {
    fail(
        INDEX,
        'does not `@use` base',
        'base.scss is the only module that EMITS global rules — the reset, :root and the reduced-motion override. Un-@used, none of it reaches the bundle.',
    );
}

const styleImports = [...mainTs.matchAll(/import\s+['"][^'"]*\.scss['"]/g)];
if (styleImports.length === 0) {
    fail(
        MAIN_TS,
        'imports no stylesheet',
        `The barrel has exactly one importer, and it is this file: \`import '@/renderer/styles/index.scss'\`.`,
    );
} else if (styleImports.length > 1) {
    fail(
        MAIN_TS,
        `imports ${styleImports.length} stylesheets`,
        'The barrel is the single entry point. A second import emits every global rule twice.',
    );
}

// ── 2. The Vite injection ────────────────────────────────────────────────────
for (const viteConfigPath of VITE_CONFIGS) {
    const viteConfig = read(viteConfigPath);
    const additionalData = viteConfig.match(/additionalData:\s*([\s\S]{0,400}?)\n\s*\},/);

    if (!/additionalData:/.test(viteConfig)) {
        fail(
            viteConfigPath,
            'has no `css.preprocessorOptions.scss.additionalData`',
            'It is what prepends the token @use to every SFC style block. Without it every `$`-variable in every component is an undefined-variable error.',
        );
        continue;
    }
    if (!/@use\s+['"]@\/renderer\/styles['"]\s+as\s+\*/.test(viteConfig)) {
        fail(
            viteConfigPath,
            "additionalData does not inject `@use '@/renderer/styles' as *`",
            'The `as *` is what puts the tokens in the SFC’s own namespace; without it every reference needs a prefix.',
        );
    }
    if (additionalData !== null && !/index\.scss/.test(additionalData[1])) {
        fail(
            viteConfigPath,
            'additionalData does not exempt index.scss',
            'The barrel would be given a @use of itself. Sass fails the whole build on the circular load, and the message points at the wrong file.',
        );
    }
}

// ── 3. Theme token parity ────────────────────────────────────────────────────
const variables = read(VARIABLES);

/**
 * Every custom-property block in variables.scss, keyed by the theme it paints.
 * `:root` shares its block with the default theme, so one block can answer to
 * two names — which is the point: they cannot drift apart.
 */
const paletteBlocks = new Map();
for (const m of variables.matchAll(
    /^((?::root|#app\.[a-z0-9-]+)(?:,\s*\n(?::root|#app\.[a-z0-9-]+))*)\s*\{([\s\S]*?)\n\}/gim,
)) {
    const tokens = new Set([...m[2].matchAll(/^\s*--([a-z0-9-]+)\s*:/gim)].map((t) => t[1]));
    if (tokens.size === 0) continue;
    for (const selector of m[1].split(',').map((sel) => sel.trim())) {
        paletteBlocks.set(selector === ':root' ? ':root' : selector.replace('#app.', ''), tokens);
    }
}

const rootTokens = paletteBlocks.get(':root') ?? new Set();
if (!paletteBlocks.has(':root')) {
    fail(
        VARIABLES,
        'has no `:root` block declaring custom properties',
        'It is the layer that paints before App.vue puts a theme class on #app — without it the first frame has no palette at all.',
    );
}

const themeTokens = new Map([...paletteBlocks].filter(([id]) => id !== ':root'));
if (themeTokens.size < 2) {
    fail(
        VARIABLES,
        `declares ${themeTokens.size} theme block(s), expected at least light and dark`,
        'The theme toggle in SettingsPopup offers both; a missing block means selecting that theme changes nothing.',
    );
}

const reference = themeTokens.get(REFERENCE_THEME);
if (reference === undefined) {
    fail(
        VARIABLES,
        `has no \`#app.${REFERENCE_THEME}\` block`,
        `${REFERENCE_THEME} is the reference palette and App.vue's initial value — every other theme is compared against its token set.`,
    );
} else {
    // 3a. Every theme carries exactly the reference token set.
    for (const [id, tokens] of themeTokens) {
        if (id === REFERENCE_THEME) continue;
        const missing = [...reference].filter((k) => !tokens.has(k));
        const extra = [...tokens].filter((k) => !reference.has(k));
        if (missing.length > 0) {
            fail(
                VARIABLES,
                `\`#app.${id}\` is missing ${missing.length} colour(s): ${missing.join(', ')}`,
                `Each one falls through to the \`:root\` value, so those elements are off-palette in this theme only — visible solely to whoever selected it.`,
            );
        }
        if (extra.length > 0) {
            fail(
                VARIABLES,
                `\`#app.${id}\` defines ${extra.length} colour(s) no other theme has: ${extra.join(', ')}`,
                'Either every theme needs the token, or nothing reads it and it is dead weight.',
            );
        }
    }

    // 3b. The `:root` layer matches the palette.
    const missingFallback = [...reference].filter((k) => !rootTokens.has(k));
    const orphanFallback = [...rootTokens].filter((k) => !reference.has(k));
    if (missingFallback.length > 0) {
        fail(
            VARIABLES,
            `:root has no fallback for ${missingFallback.join(', ')}`,
            'This is the layer that paints before the theme class lands, so a token missing here renders as nothing on the first frame.',
        );
    }
    if (orphanFallback.length > 0) {
        fail(
            VARIABLES,
            `:root defines ${orphanFallback.join(', ')}, which no theme block overrides`,
            'The token is permanently stuck at its fallback — a theme switch cannot change it, which is exactly the bug that is hardest to see.',
        );
    }
}

// 3c. Every `var(--token)` resolves to something.
const styleFiles = [];
const collect = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) collect(rel);
        else if (/\.(scss|vue)$/.test(entry.name)) styleFiles.push(rel);
    }
};
collect('src/renderer');

const declaredTokens = new Set([...rootTokens, ...(reference ?? []), ...COMPONENT_LOCAL_VARS.keys()]);
const unresolved = new Map();

for (const rel of styleFiles) {
    const source = read(rel);
    for (const m of source.matchAll(/var\(\s*--([a-z0-9-]+)/gi)) {
        if (!declaredTokens.has(m[1]) && !unresolved.has(m[1])) unresolved.set(m[1], rel);
    }
}

for (const [token, rel] of unresolved) {
    fail(
        rel,
        `uses \`var(--${token})\`, which nothing defines`,
        `Not in :root, not in any theme preset, and not listed as component-local in this gate. It resolves to nothing — the property is simply dropped.`,
    );
}

// ── 4. Self-hosted everything ────────────────────────────────────────────────
for (const rel of [...styleFiles, INDEX]) {
    const source = read(rel);
    for (const m of source.matchAll(
        /@import\s+url\(|https?:\/\/fonts\.(googleapis|gstatic)\.com|@font-face[\s\S]{0,300}?url\(\s*['"]?https?:/gi,
    )) {
        fail(
            rel,
            `pulls a remote stylesheet or font (\`${m[0].slice(0, 40)}…\`)`,
            'ZenGarden makes no network requests. A CDN font is a request on every launch, a build that is no longer reproducible, and a blank first paint offline.',
        );
    }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length > 0) {
    console.error(`✗ SCSS standards check failed — ${failures.length} problem(s):\n`);
    let current = '';
    for (const { file, what, why } of failures) {
        if (file !== current) {
            console.error(`  ${file}`);
            current = file;
        }
        console.error(`    • ${what}`);
        console.error(`      ${why}`);
    }
    process.exit(1);
}

console.log(
    `✓ SCSS standards check passed — barrel + injection intact, ${themeTokens.size} theme palettes agree on ${reference?.size ?? 0} tokens, ${styleFiles.length} style files self-hosted.`,
);
