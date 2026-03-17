import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';
import it from './locales/it.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

export const i18n = createI18n({
    legacy: false,
    locale: 'en', // Default to English, will be set from user data after login
    fallbackLocale: 'en',
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
