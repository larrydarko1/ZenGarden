/**
 * vite.config.ts — Capacitor mobile build only.
 * This config is NOT used by Electron. Electron uses electron.vite.config.ts.
 * It compiles the identical renderer SFCs, so the alias map and the SCSS token
 * injection below must stay in step with that file's `renderer` block — a
 * component that builds for desktop and fails on Android is the failure mode.
 */
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@/renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
            '@/schemas': fileURLToPath(new URL('./src/schemas', import.meta.url)),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                loadPaths: [fileURLToPath(new URL('./src/renderer/styles', import.meta.url))],
                // Files under styles/ are exempt: the barrel would @use itself.
                additionalData: (source: string, filename: string) =>
                    /[\\/]renderer[\\/]styles[\\/]/.test(filename)
                        ? source
                        : `@use 'sass:color';\n@use '@/renderer/styles' as *;\n${source}`,
            },
        },
    },
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
