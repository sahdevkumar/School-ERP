
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env': env
    },
    build: {
      sourcemap: false, // Critical for low memory environments
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['lucide-react', 'recharts', 'react-easy-crop'],
            'vendor-utils': ['@supabase/supabase-js', '@google/genai', '@aws-sdk/client-s3', 'jspdf', 'jspdf-autotable']
          }
        }
      }
    }
  };
});
