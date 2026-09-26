import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { pathToFileURL } from 'url'

// Serves api/github.js during `npm run dev`, the same way Vercel does in production
function githubApiDevServer(env) {
  return {
    name: 'github-api-dev-server',
    configureServer(server) {
      for (const key of ['GITHUB_TOKEN', 'GITHUB_ORG', 'VITE_FIREBASE_PROJECT_ID']) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }
      server.middlewares.use('/api/github', async (req, res) => {
        req.url = req.originalUrl;
        const { default: handler } = await import(pathToFileURL(path.resolve(__dirname, 'api/github.js')).href);
        await handler(req, res);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), githubApiDevServer(loadEnv(mode, process.cwd(), ''))],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
