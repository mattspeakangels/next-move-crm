import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { AuthProvider } from './lib/authContext';
import { initSentry } from './config/sentry';
import './index.css';

// Initialize Sentry error tracking
initSentry();

// Create Sentry-wrapped Router
const SentryRoutes = Sentry.withSentryRouting(BrowserRouter);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryRoutes>
      <AuthProvider>
        <Sentry.ErrorBoundary
          fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', fontFamily: 'sans-serif', textAlign: 'center', padding: '1rem' }}>
              <p>Si è verificato un errore imprevisto.</p>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Ricarica
              </button>
            </div>
          }
          showDialog
        >
          <App />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </SentryRoutes>
  </React.StrictMode>
);
