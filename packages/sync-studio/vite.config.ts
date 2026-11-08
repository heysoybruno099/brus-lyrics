import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@brus-lyrics/shared-types': path.resolve(__dirname, '../shared-types/index.ts'),
      '@brus-lyrics/ttml-engine/styles.css': path.resolve(__dirname, '../ttml-engine/src/styles.css'),
      '@brus-lyrics/ttml-engine': path.resolve(__dirname, '../ttml-engine/src/index.ts'),
    },
  },
});
