import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Ruta base para GitHub Pages (javierb507.github.io/Alerta-Spain/)
      base: mode === 'production' ? '/Alerta-Spain/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['logo.svg'],
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
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Versión y momento de compilación, mostrados en el pie de la app
        __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')).version),
        __BUILD_DATE__: JSON.stringify(new Date().toISOString())
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
