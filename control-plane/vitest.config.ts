import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts', 'test/**/*.spec.tsx'],
    exclude: ['node_modules', 'dist'],
  },
});
