import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@recipes': fileURLToPath(new URL('./src/recipes', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
