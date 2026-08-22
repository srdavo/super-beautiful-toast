import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The demo imports the library by name but resolves to the source next door,
// so editing src/ hot-reloads here. That is deliberate: the showcase is also
// the workbench.
export default defineConfig({
    base: './',
    plugins: [vue()],
    resolve: {
        alias: {
            'super-beautiful-toast': fileURLToPath(new URL('../src/index.js', import.meta.url)),
        },
    },
})
