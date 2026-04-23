import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const kommoSubdomain = env.VITE_KOMMO_SUBDOMAIN || 'academicosoead';

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/api/sessions': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/kommo-api': {
          target: `https://${kommoSubdomain}.kommo.com`,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/kommo-api/, ''),
        },
      },
    },
  };
});
