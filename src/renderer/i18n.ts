// i18n — vue-i18n instance with 8 locale bundles, English as default/fallback.

import { createI18n } from 'vue-i18n';
import en from '../../assets/locales/en.json';
import es from '../../assets/locales/es.json';
import it from '../../assets/locales/it.json';
import fr from '../../assets/locales/fr.json';
import de from '../../assets/locales/de.json';
import pt from '../../assets/locales/pt.json';
import zh from '../../assets/locales/zh.json';
import ja from '../../assets/locales/ja.json';

export const i18n = createI18n({
    legacy: false,
    locale: 'en', // Default to English, will be set from user data after login
    fallbackLocale: 'en',
    escapeParameter: true,
    messages: {
        en,
        es,
        it,
        fr,
        de,
        pt,
        zh,
        ja,
    },
});
