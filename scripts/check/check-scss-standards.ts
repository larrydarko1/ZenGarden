#!/usr/bin/env node
/**
 * SCSS architecture gate. Stylesheets fail quietly — nothing throws when a token
 * is missing from one theme, when a rule is emitted once per component, or when a
 * `var()` names something nothing declares. The rules live in
 * @larrydarko/lint-config/gates/scss-standards.
 *
 * What stays here is this repo's answers.
 *
 * THE THREE FILE ROLES. `index.scss` is the BARREL: it `@forward`s variables and
 * mixins and nothing else. It is also the INJECTED module — both Vite configs
 * prepend `@use '@/renderer/styles' as *` to every SFC style block, and each block
 * is its own Sass compilation, so anything reachable from the barrel that emits a
 * rule ships once per component. `global.scss` is the ENTRY: it `@use`s the modules
 * that do emit, and main.ts imports it exactly once.
 *
 * `viteConfigs` names two files because there are two builds of the same SFCs:
 * electron-vite for the desktop app and plain Vite for the Capacitor Android app.
 *
 * `themes.source: 'css-blocks'` — the palettes are literal custom-property blocks
 * in _themes.scss, one `#app.<theme>` block per theme, with `:root` sharing the
 * dark block so the first frame is painted before App.vue puts the theme class on
 * #app.
 *
 * `componentLocalVars` — a custom property a component sets on itself through a
 * `:style` binding is deliberately absent from every palette, so the sweep has to
 * be told. The reason travels with the name so the exemption justifies itself.
 */
import { checkScssStandards } from '@larrydarko/lint-config/gates/scss-standards';

checkScssStandards({
    styles: 'src/renderer/styles',
    src: 'src/renderer',
    barrel: 'index.scss',
    entry: 'global.scss',
    injected: 'index.scss',
    mainScript: 'src/renderer/main.ts',
    viteConfigs: ['electron.vite.config.ts', 'vite.config.ts'],
    injectedSpecifier: '@/renderer/styles',
    forwarded: ['variables', 'mixins'],
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
});
