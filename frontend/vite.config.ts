import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Warn (not fail) if any chunk exceeds this — route-level lazy loading
    // in App.tsx keeps the *initial* load well under this; large chunks
    // here are usually a sign a heavy library (gsap, jszip) snuck into the
    // main bundle instead of a lazy-loaded route.
    chunkSizeWarningLimit: 150,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/react|react-dom|react-router-dom/.test(id)) return 'vendor';
            if (/framer-motion|gsap/.test(id)) return 'motion';
            if (/zustand/.test(id)) return 'state';
            if (/jszip/.test(id)) return 'zip';
          }
        },
      },
    },
  },
})
