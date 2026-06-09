import { InjectionToken } from '@angular/core';

/**
 * Runtime configuration — values that may be supplied at deploy/runtime, NOT baked into the
 * client bundle at build time. In this app the Pexels key is injected by the proxy/BFF, so
 * `apiToken` is normally null. The seam exists so that, if you ever front the API differently,
 * a short-lived/public token could be loaded (e.g. via APP_INITIALIZER from a `/config`
 * endpoint) without changing the interceptor. A real secret must never live here.
 */
export interface RuntimeConfig {
  /** Optional bearer/authorization value attached to /api requests, or null. */
  apiToken: string | null;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG', {
  providedIn: 'root',
  factory: (): RuntimeConfig => ({ apiToken: null }),
});
