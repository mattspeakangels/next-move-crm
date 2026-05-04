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
        <Sentry.ErrorBoundary fallback={<div>An error occurred</div>} showDialog>
          <App />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </SentryRoutes>
  </React.StrictMode>
);
