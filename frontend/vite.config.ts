import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  envDir: '../',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'investingatti.com',
      'www.investingatti.com',
      '.trycloudflare.com'
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env': {},
  },
  build: {
    // Raise the warning threshold — we're splitting manually below
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor dependencies into separate long-cached chunks.
        // App code changes won't bust the vendor cache.
        manualChunks(id) {
          // React core — almost never changes
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Charting — large, infrequently updated
          if (id.includes('node_modules/recharts/') ||
              id.includes('node_modules/lightweight-charts/') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-')) {
            return 'vendor-charts';
          }
          // Radix UI — large, stable component library
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          // MSAL — ~400KB Microsoft auth SDK, only needed for MS login
          if (id.includes('node_modules/@azure/') ||
              id.includes('node_modules/@microsoft/')) {
            return 'vendor-msal';
          }
          // Zustand + utility libs
          if (id.includes('node_modules/zustand/') ||
              id.includes('node_modules/axios/') ||
              id.includes('node_modules/date-fns/') ||
              id.includes('node_modules/clsx/') ||
              id.includes('node_modules/tailwind-merge/') ||
              id.includes('node_modules/lucide-react/')) {
            return 'vendor-utils';
          }
        },
      },
    },
  },
});
