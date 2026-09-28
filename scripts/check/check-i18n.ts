#!/usr/bin/env node
/**
 * i18n locale consistency gate. What it checks — plural, placeholder and array
 * parity across locales, plus the createI18n options — lives in
 * @larrydarko/lint-config/gates/i18n; only this project's paths are here.
 *
 * src/renderer/locales/*.json are bundled with the renderer and imported by
 * src/renderer/i18n.ts, so `en` is both the reference and the fallback.
 */
import { checkI18n } from '@larrydarko/lint-config/gates/i18n';

checkI18n({
    localeDir: 'src/renderer/locales',
    configFile: 'src/renderer/i18n.ts',
});
