import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/main/index.ts'),
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/preload/index.ts'),
                },
            },
        },
    },
    renderer: {
        plugins: [vue()],
        base: './',
        root: resolve(__dirname, 'src/renderer'),
        publicDir: resolve(__dirname, 'public'),
        server: {
            port: 3000,
            strictPort: true,
        },
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/index.html'),
                },
            },
        },
    },
});
