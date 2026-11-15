import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ─── Ambienti: lavoro (default) e laboratorio (--mode lab) ──────────────────────
// Il laboratorio legge le variabili SOLO da lab/env/ (mai da .env.local, che è del
// lavoro): nessuna chiave mancante può "ripiegare" sul progetto reale.
const LAB_PROJECT_ID = 'syrio-lab';
const WORK_PROJECT_IDS = ['next-move---crm', 'next-move---crm---dev'];

function labTitle(): Plugin {
  return {
    name: 'syrio-lab-title',
    transformIndexHtml: html => html.replace(/<title>/, '<title>[LAB] '),
  };
}

export default defineConfig(({ mode }) => {
  const isLab = mode === 'lab';
  const envDir = isLab ? 'lab/env' : '.';
  const env = loadEnv(mode, envDir, 'VITE_');
  const appEnv = isLab ? 'lab' : 'work';
  const projectId = (env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  if (isLab) {
    if (env.VITE_APP_ENV !== 'lab') throw new Error('[lab] VITE_APP_ENV deve valere "lab" in lab/env/.env.lab');
    if (projectId !== LAB_PROJECT_ID || WORK_PROJECT_IDS.includes(projectId)) {
      throw new Error(`[lab] progetto Firebase "${projectId}" non ammesso: il laboratorio usa solo "${LAB_PROJECT_ID}"`);
    }
  } else {
    if (env.VITE_APP_ENV === 'lab') throw new Error('[work] VITE_APP_ENV=lab fuori dalla modalità lab: usa npm run dev:lab / build:lab');
    if (projectId === LAB_PROJECT_ID) throw new Error('[work] la build di lavoro punta al progetto di laboratorio');
  }

  return {
  envDir,
  define: {
    // Ambiente dell'app (src/lib/appEnv.ts)
    __APP_ENV__: JSON.stringify(appEnv),
    // Timestamp di build, mostrato in Impostazioni → Aggiornamento App per
    // capire quale versione è effettivamente installata sul device.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    ...(isLab ? [labTitle()] : []),
    VitePWA({
      // 'prompt': il nuovo service worker resta in attesa finché l'utente non
      // clicca "Aggiorna" (UpdateBanner). Niente skipWaiting/clientsClaim qui:
      // l'attivazione è controllata da updateServiceWorker(true).
      registerType: 'prompt',
      workbox: {
        // Aumenta il limite per precachare tutti i chunk
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Il fallback di navigazione (tutte le richieste non-precache tornano
        // index.html, la SPA) non deve intercettare /landing: è una pagina
        // statica separata, non una rotta interna dell'app.
        navigateFallbackDenylist: [/^\/landing/],
      },
      manifest: {
        name: isLab ? '[LAB] SYRIO — Laboratorio' : 'SYRIO — Your sales guide',
        short_name: isLab ? '[LAB] SYRIO' : 'SYRIO',
        theme_color: '#0a0c0d',
        background_color: '#0a0c0d',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet') || id.includes('node_modules/@react-leaflet')) {
            return 'vendor-maps';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
};
});
