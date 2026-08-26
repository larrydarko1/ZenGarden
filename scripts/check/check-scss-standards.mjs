#!/usr/bin/env node
/**
 * SCSS architecture gate.
 *   1. THE BARREL AND THE ENTRY POINT. These are two files on purpose.
 *      index.scss is the barrel: it @forwards variables and mixins and NOTHING
 *      else, because Vite injects it into every SFC and each SFC style block is
 *      its own sass compilation — so anything reachable from it that emits a
 *      rule ships once per component instead of once per app. global.scss is the
 *      entry point: it @uses the modules that emit, and main.ts imports it
 *      exactly once. Import it twice and every global rule is emitted twice;
 *      drop a @forward and `@use '@/renderer/styles'` silently stops resolving
 *      the tokens.
 *   2. THE VITE INJECTION. `css.preprocessorOptions.scss.additionalData` in
 *      electron.vite.config.ts is what makes `$space-*` and the colour aliases
 *      available inside every SFC without an import. Lose it and every component
 *      fails to compile at once — yet nothing in the style files themselves
 *      records that they depend on it. The styles-directory guard in that
 *      function matters too: without it the barrel @uses itself and sass fails
 *      on a circular load. vite.config.ts carries the same injection for the Capacitor
 *      build, which compiles the identical SFCs.
 *   3. THEME TOKEN PARITY. The palettes live in _themes.scss as one custom-
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
const THEMES = `${STYLES}/_themes.scss`;
const INDEX = `${STYLES}/index.scss`;
const GLOBAL = `${STYLES}/global.scss`;
const MAIN_TS = 'src/renderer/main.ts';
const VITE_CONFIGS = ['electron.vite.config.ts', 'vite.config.ts'];
const REFERENCE_THEME = 'dark';

/**
 * Custom properties a component sets itself through a `:style` binding, so they
 * are deliberately absent from the theme palette. Keep the reason with the name.
 */
const COMPONENT_LOCAL_VARS = new Map([
    ['i', 'MonkAuth.vue — form field index, staggers the field-in animation delay'],
    ['peak-opacity', 'ZenParticlesAnimation.vue — per-band peak opacity, so three keyframe tracks cover all 62 particles'],
]);

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. The barrel ────────────────────────────────────────────────────────────
const index = read(INDEX);
const global = read(GLOBAL);
const mainTs = read(MAIN_TS);

for (const module of ['variables', 'mixins']) {
    if (!new RegExp(`@forward\\s+['"][^'"]*${module}['"]`).test(index)) {
        fail(
            INDEX,
            `does not \`@forward\` ${module}`,
            `Every SFC reaches the design system through this barrel and nothing else. Un-forwarded, each \`$\`-name in _${module}.scss is an undefined-variable error in all 20 components at once.`,
        );
    }
}

for (const [module, why] of [
    ['themes', 'The palettes are CSS custom properties. Un-@used, every `var(--token)` in the app resolves to nothing.'],
    ['base', '_base.scss carries the reset, element defaults and the reduced-motion override. Un-@used, none of it reaches the bundle.'],
    ['components', 'components/ holds the classes shared across unrelated SFCs. Un-@used, every template that names one of them renders unstyled.'],
]) {
    if (!new RegExp(`@use\\s+['"][^'"]*${module}['"]`).test(global)) {
        fail(GLOBAL, `does not \`@use\` ${module}`, why);
    }
}

const EMITTING_AT_RULES = /^\s*@(media|supports|keyframes|font-face|include|extend|at-root|container|layer|page|property|counter-style)\b/;
const seenBarrelModules = new Set();

const emitsCss = (rel) => {
    if (seenBarrelModules.has(rel)) return false;
    seenBarrelModules.add(rel);

    let source;
    try {
        source = read(rel);
    } catch {
        fail(INDEX, `forwards \`${rel}\`, which does not exist`, 'The barrel names a module Sass cannot resolve; every SFC fails to compile.');
        return false;
    }

    // Strip comments and every {…} body, leaving the lines that OPEN a block.
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    let offending = false;

    for (const line of stripped.split('\n')) {
        const opensBlock = line.includes('{');
        if (!opensBlock) continue;
        const head = line.slice(0, line.indexOf('{')).trim();
        if (head === '') continue;
        // Declarations of things that emit nothing until used.
        if (/^@(mixin|function|use|forward|if|else|each|for|while|return|debug|warn|error)\b/.test(head)) continue;
        if (head.startsWith('%')) continue;
        if (EMITTING_AT_RULES.test(head)) {
            offending = true;
            continue;
        }
        // Interpolation inside a value, not a selector.
        if (head.endsWith(':') || /:\s*\S/.test(head)) continue;
        offending = true;
    }

    if (offending) {
        fail(
            rel,
            'is reachable from index.scss but emits CSS',
            'Every SFC @uses the barrel in its own compilation, so these rules ship once per component. Move them behind global.scss, which only main.ts loads.',
        );
    }

    // Follow the graph: a forwarded module's own forwards are equally reachable.
    for (const m of stripped.matchAll(/@(?:use|forward)\s+['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        if (spec.startsWith('sass:')) continue;
        const name = spec.replace('@/renderer/styles/', '').replace(/^\.\//, '');
        const dir = path.dirname(name) === '.' ? '' : `${path.dirname(name)}/`;
        const base = path.basename(name);
        for (const candidate of [`${STYLES}/${dir}_${base}.scss`, `${STYLES}/${dir}${base}.scss`, `${STYLES}/${dir}${base}/_index.scss`]) {
            if (fs.existsSync(path.join(ROOT, candidate))) {
                emitsCss(candidate);
                break;
            }
        }
    }
    return offending;
};

emitsCss(INDEX);

const styleImports = [...mainTs.matchAll(/import\s+['"][^'"]*\.scss['"]/g)];
if (styleImports.length === 0) {
    fail(
        MAIN_TS,
        'imports no stylesheet',
        `global.scss has exactly one importer, and it is this file: \`import '@/renderer/styles/global.scss'\`.`,
    );
} else if (styleImports.length > 1) {
    fail(
        MAIN_TS,
        `imports ${styleImports.length} stylesheets`,
        'global.scss is the single entry point. A second import emits every global rule twice.',
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
            'It is what prepends the barrel @use to every SFC style block. Without it every `$`-variable in every component is an undefined-variable error.',
        );
        continue;
    }
    if (!/@use\s+['"]@\/renderer\/styles['"]\s+as\s+\*/.test(viteConfig)) {
        fail(
            viteConfigPath,
            "additionalData does not inject `@use '@/renderer/styles' as *`",
            'It must inject the barrel, never global.scss: global.scss @uses the modules that emit, and injecting it ships every global rule once per SFC. The `as *` is what puts the tokens in the SFC’s own namespace.',
        );
    }
    if (additionalData !== null && !/renderer.{1,4}styles/.test(additionalData[1])) {
        fail(
            viteConfigPath,
            'additionalData does not exempt the styles directory',
            'The barrel would be given a @use of itself. Sass fails the whole build on the circular load, and the message points at the wrong file.',
        );
    }
}

// ── 3. Theme token parity ────────────────────────────────────────────────────
const variables = read(THEMES);

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
        THEMES,
        'has no `:root` block declaring custom properties',
        'It is the layer that paints before App.vue puts a theme class on #app — without it the first frame has no palette at all.',
    );
}

const themeTokens = new Map([...paletteBlocks].filter(([id]) => id !== ':root'));
if (themeTokens.size < 2) {
    fail(
        THEMES,
        `declares ${themeTokens.size} theme block(s), expected at least light and dark`,
        'The theme toggle in SettingsPopup offers both; a missing block means selecting that theme changes nothing.',
    );
}

const reference = themeTokens.get(REFERENCE_THEME);
if (reference === undefined) {
    fail(
        THEMES,
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
                THEMES,
                `\`#app.${id}\` is missing ${missing.length} colour(s): ${missing.join(', ')}`,
                `Each one falls through to the \`:root\` value, so those elements are off-palette in this theme only — visible solely to whoever selected it.`,
            );
        }
        if (extra.length > 0) {
            fail(
                THEMES,
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
            THEMES,
            `:root has no fallback for ${missingFallback.join(', ')}`,
            'This is the layer that paints before the theme class lands, so a token missing here renders as nothing on the first frame.',
        );
    }
    if (orphanFallback.length > 0) {
        fail(
            THEMES,
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
for (const rel of [...styleFiles, INDEX, GLOBAL]) {
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
