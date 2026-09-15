import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import viewsHandler from './api/views.ts';
import verifyHandler from './api/verify.ts';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'local-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const isViews = req.url && req.url.startsWith('/api/views');
            const isVerify = req.url && req.url.startsWith('/api/verify');

            if (isViews || isVerify) {
              const targetHandler = isViews ? viewsHandler : verifyHandler;
              try {
                if (req.method === 'POST') {
                  let body = '';
                  req.on('data', (chunk) => {
                    body += chunk;
                  });
                  req.on('end', async () => {
                    try {
                      (req as any).body = body ? JSON.parse(body) : {};
                    } catch {
                      (req as any).body = {};
                    }
                    await targetHandler(req as any, res as any);
                  });
                } else {
                  await targetHandler(req as any, res as any);
                }
              } catch (err) {
                console.error('Lỗi API Local:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: String(err) }));
              }
              return;
            }
            next();
          });
        },
      },
    ],
  };
});
