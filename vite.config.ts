import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Plugin que serve /env-config.js com os valores reais do .env em desenvolvimento
function envConfigPlugin(env: Record<string, string>): Plugin {
  const content = `window.__env__ = {
  SUPABASE_URL: "${env.VITE_SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: "${env.VITE_SUPABASE_ANON_KEY || ''}",
  SUPABASE_SERVICE_KEY: "${env.VITE_SUPABASE_SERVICE_KEY || ''}",
  KOMMO_TOKEN: "${env.VITE_KOMMO_TOKEN || ''}",
  KOMMO_SUBDOMAIN: "${env.VITE_KOMMO_SUBDOMAIN || 'academicosoead'}"
};`;

  return {
    name: 'env-config-dev',
    configureServer(server) {
      server.middlewares.use('/env-config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(content);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const kommoSubdomain = env.VITE_KOMMO_SUBDOMAIN || 'academicosoead';

  return {
    plugins: [react(), envConfigPlugin(env)],
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
