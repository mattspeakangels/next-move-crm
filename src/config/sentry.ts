import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (!dsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 0.5,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
  });

  console.log('[Sentry] Initialized:', { dsn, environment });
}

/**
 * Capture API errors with context
 */
export function captureAPIError(
  error: Error,
  context: {
    endpoint: string;
    method: string;
    status?: number;
    userId?: string;
  }
) {
  Sentry.captureException(error, {
    tags: {
      type: 'api_error',
      endpoint: context.endpoint,
      method: context.method,
      ...(context.status && { status: context.status.toString() }),
    },
    contexts: {
      api: {
        endpoint: context.endpoint,
        method: context.method,
        status: context.status,
        userId: context.userId,
      },
    },
  });
}

/**
 * Capture Firestore errors
 */
export function captureFirestoreError(
  error: Error,
  context: {
    collection: string;
    operation: 'read' | 'write' | 'delete';
  }
) {
  Sentry.captureException(error, {
    tags: {
      type: 'firestore_error',
      collection: context.collection,
      operation: context.operation,
    },
    contexts: {
      firestore: {
        collection: context.collection,
        operation: context.operation,
      },
    },
  });
}

/**
 * Capture rate limit hits (informational, not an error)
 */
export function captureRateLimitHit(userId: string) {
  Sentry.captureMessage('Rate limit exceeded', {
    level: 'warning',
    tags: {
      type: 'rate_limit',
      userId,
    },
  });
}

/**
 * Capture authentication failures
 */
export function captureAuthFailure(reason: string, userId?: string) {
  Sentry.captureMessage(`Authentication failed: ${reason}`, {
    level: 'warning',
    tags: {
      type: 'auth_failure',
      reason,
      ...(userId && { userId }),
    },
  });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}
