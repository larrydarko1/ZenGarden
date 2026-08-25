/** main — app entry point: creates the Vue instance, registers plugins, mounts to DOM. */
import { createApp } from 'vue';
import '@/renderer/styles/index.scss';
import App from '@/renderer/App.vue';
import { i18n } from '@/renderer/i18n';

createApp(App).use(i18n).mount('#app');
