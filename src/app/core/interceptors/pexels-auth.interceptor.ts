import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { RUNTIME_CONFIG } from '../config/runtime-config.token';

/**
 * Attaches an Authorization header to /api requests ONLY when a runtime token is configured.
 *
 * Security note: there is deliberately no key here by default. In dev and prod the Pexels key
 * is injected server-side by the proxy/BFF, so `apiToken` is null and this interceptor is a
 * no-op. The seam lets a runtime-loaded (non-secret) token be attached without code changes.
 */
export const pexelsAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(RUNTIME_CONFIG);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (!config.apiToken || !isApiRequest) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: config.apiToken } }),
  );
};
