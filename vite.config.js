import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) return 'vendor-antd';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('pdfjs-dist')) return 'vendor-pdf';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
