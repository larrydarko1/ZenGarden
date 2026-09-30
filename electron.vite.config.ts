import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    main: {
        resolve: {
            alias: {
                '@/main': fileURLToPath(new URL('./src/main', import.meta.url)),
                '@/schemas': fileURLToPath(new URL('./src/schemas', import.meta.url)),
            },
        },
        esbuild: { tsconfigRaw: { compilerOptions: { target: 'ESNext' } } },
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/main/index.ts'),
                },
            },
        },
    },
    preload: {
        resolve: {
            alias: {
                '@/preload': fileURLToPath(new URL('./src/preload', import.meta.url)),
                '@/schemas': fileURLToPath(new URL('./src/schemas', import.meta.url)),
            },
        },
        esbuild: { tsconfigRaw: { compilerOptions: { target: 'ESNext' } } },
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/preload/index.ts'),
                },
                output: {
                    format: 'cjs',
                    entryFileNames: 'index.cjs',
                },
            },
        },
    },
    renderer: {
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
                    // Injects only _variables.scss, which emits nothing. Files under styles/
                    // are exempt: they @use it themselves, and main.ts imports index.scss.
                    additionalData: (source: string, filename: string) =>
                        /[\\/]renderer[\\/]styles[\\/]/.test(filename)
                            ? source
                            : `@use 'sass:color';\n@use '@/renderer/styles/variables' as *;\n${source}`,
                },
            },
        },
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
