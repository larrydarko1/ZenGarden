// vite.config.ts — Capacitor mobile build only.
// This config is NOT used by Electron. Electron uses electron.vite.config.ts.
import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    // Relative paths required for Capacitor's WebView
    base: './',
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'public'),
    build: {
        // Capacitor reads from the webDir defined in capacitor.config.ts (dist/)
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'src/renderer/index.html'),
            },
        },
    },
    server: {
        port: 3000,
    },
});
