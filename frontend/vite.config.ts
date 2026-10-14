import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'syntax-highlighter': ['react-syntax-highlighter'],
        },
      },
    },
  },
  server: {
      host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/course': {
        target: 'http://localhost:18184',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        timeout: 420000,
        proxyTimeout: 420000,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        changeOrigin: true,
        ws: true,
        timeout: 420000,
        proxyTimeout: 420000,
      },
    },
  },
});
