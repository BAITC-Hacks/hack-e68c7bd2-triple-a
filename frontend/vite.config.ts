import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'pages' && env.VITE_SEARCH_MODE === 'api') {
    let api: URL;
    try { api = new URL(env.VITE_API_BASE_URL || ''); } catch {
      throw new Error('Pages API mode requires a public HTTPS VITE_API_BASE_URL.');
    }
    if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) {
      throw new Error('Pages API mode requires an HTTPS URL without credentials, query or hash.');
    }
  }
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api(?=\/|$)/, ''),
    },
  };

  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    server: { host: '0.0.0.0', port: 4173, strictPort: true, proxy },
    preview: { host: '0.0.0.0', port: 4174, strictPort: true, proxy },
    build: { sourcemap: false },
  };
});
