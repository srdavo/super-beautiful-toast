import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Library build. Two entries on purpose:
//   index → the Vue adapter (the package you install)
//   core  → the framework-free engine, so a future React or vanilla adapter
//           is a new folder rather than a rewrite.
export default defineConfig({
    plugins: [vue()],
    build: {
        lib: {
            entry: {
                'super-beautiful-toast': 'src/index.js',
                core: 'src/core/index.js',
            },
            formats: ['es'],
            cssFileName: 'style',
        },
        rollupOptions: {
            external: ['vue'],
        },
        cssCodeSplit: false,
        sourcemap: true,
        target: 'es2020',
    },
})
