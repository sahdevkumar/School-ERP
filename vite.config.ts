import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env': env
    },
    build: {
      outDir: 'build', // Explicitly output to 'build' for Vercel
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: undefined // Ensure default splitting
        }
      }
    }
  };
});