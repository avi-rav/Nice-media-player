/**
 * Client-safe configuration ONLY.
 *
 * Note there is no API key here. The browser calls the relative `/api/*` path; the
 * Pexels `Authorization` header is injected server-side by the dev proxy (proxy.conf.js)
 * in development and by a BFF/serverless proxy in production. See README "API key security".
 */
export const environment = {
  production: false,
  /** Base path proxied to https://api.pexels.com/videos (see proxy.conf.js). */
  apiBaseUrl: '/api/videos',
} as const;
