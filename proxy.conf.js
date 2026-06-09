/**
 * Angular dev-server proxy.
 *
 * Purpose: keep the Pexels API key OUT of the client bundle. The browser only ever calls
 * the relative `/api/*` path. This proxy (which runs in the Node dev server, not the browser)
 * rewrites `/api` -> the Pexels base URL and attaches the `Authorization` header from the
 * `PEXELS_API_KEY` environment variable. The key therefore never reaches client JavaScript.
 *
 * Usage:
 *   PowerShell:  $env:PEXELS_API_KEY = "<your-key>"; npm start
 *   bash:        PEXELS_API_KEY=<your-key> npm start
 *
 * In production you would replace this with a thin BFF / serverless proxy that injects the
 * key from a server-side secret manager (see README).
 */
const apiKey = process.env.PEXELS_API_KEY || '';

if (!apiKey) {
  // Surfaced once at startup so a missing key is obvious; requests will 401 and the app
  // shows its error state + toast.
  // eslint-disable-next-line no-console
  console.warn('[proxy] PEXELS_API_KEY is not set — Pexels requests will be unauthorized (401).');
}

module.exports = {
  '/api': {
    target: 'https://api.pexels.com',
    // Dev only: don't verify the upstream TLS cert. Needed behind corporate SSL inspection
    // proxies whose custom CA isn't in Node's trust store ("unable to get local issuer
    // certificate"). A production BFF would use a proper trust chain instead.
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    headers: {
      Authorization: apiKey,
    },
  },
};
