import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'logo.svg'],
          manifest: {
            name: 'Monitor de Emergencias España',
            short_name: 'Emergencias ES',
            description: 'Monitor de emergencias y sucesos en tiempo real en España',
            theme_color: '#0f172a',
            icons: [
              {
                src: 'logo.svg',
                sizes: '192x192',
                type: 'image/svg+xml'
              },
              {
                src: 'logo.svg',
                sizes: '512x512',
                type: 'image/svg+xml'
              },
              {
                src: 'logo.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
