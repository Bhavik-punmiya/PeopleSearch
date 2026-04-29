import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  base: './', // CRITICAL: Ensure paths are relative for Electron
  plugins: [react()],
});
