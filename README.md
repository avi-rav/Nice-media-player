# 🎬 Nice Media Player

An Angular video gallery + player built on the [Pexels Videos API](https://www.pexels.com/api/).
Browse popular videos as cards, search by keyword (debounced), filter by resolution, and play a
selected video with **custom** controls.

## Features
- **Video gallery** — cards with poster, author, duration, and max resolution.
- **Debounced search** — `debounceTime(300) → distinctUntilChanged() → switchMap()`, so a new
  query cancels the previous in-flight request (no wasted renders / races).
- **Resolution filter** — narrows the list **client-side** (no extra network request).
- **Custom player** — play/pause, seek, time, volume/mute, fullscreen, quality switching, all
  keyboard-operable (Space, ←/→, ↑/↓, `m`, `f`).
- **Explicit states** — loading (skeletons), empty, and error (with **Retry** + toast).
- **Resilient data** — defensive mapper survives missing/partial/unsorted API data; non-playable
  videos are shown as unavailable.
- **Typed end-to-end** — separate API DTOs and normalized domain models (no `any`).
- **State management** — NgRx **SignalStore** (`@ngrx/signals`).

## Prerequisites
- Node.js 20.19+ (Angular 20).
- A free Pexels API key: https://www.pexels.com/api/

## Run locally
The browser never sees the API key — it calls the relative `/api/*` path and the dev proxy
([`proxy.conf.js`](./proxy.conf.js)) attaches the `Authorization` header from an env var.

```powershell
# PowerShell
$env:PEXELS_API_KEY = "<your-key>"
npm install
npm start
```

```bash
# bash
PEXELS_API_KEY=<your-key> npm install && npm start
```

Then open http://localhost:4200. Without a key, requests return 401 and the app shows its error
state + toast (handled gracefully).

## 🔐 API key security

The Pexels API requires the key in an `Authorization` header. **A key shipped in client-side JS is
public** — anyone can read it from the bundle or network tab. This project keeps the key off the
client:

- **Development:** the Angular bundle calls relative `/api/*`. The dev-server proxy (Node, not the
  browser) rewrites `/api` → `https://api.pexels.com` and injects the header from
  `process.env.PEXELS_API_KEY`. The key is never in the bundle and `.env`-style values are never
  committed.
- **Production (recommended):** put a thin **BFF / serverless proxy** in front of Pexels. The SPA
  calls your own origin; the proxy injects the key from a **server-side secret** (e.g. a CI/CD
  secret manager / cloud secret store) and can also cache and rate-limit. The browser never holds
  the secret. If you need any runtime config in the client, load a **non-secret** value via
  `APP_INITIALIZER` from a `/config` endpoint — never the API key.

There is a deliberate client-side auth seam ([`pexels-auth.interceptor.ts`](./src/app/core/interceptors/pexels-auth.interceptor.ts))
backed by a `RUNTIME_CONFIG` token; it is a no-op unless a runtime (non-secret) token is supplied.

## Architecture (short)
```
core/
  models/        DTOs (wire shape) + domain Video model
  services/      PexelsApiService (HTTP) · VideoCatalogService (orchestration)
                 VideoMapperService (defensive DTO→domain) · ResolutionService
                 NotificationService · ErrorMapperService
  interceptors/  retry (2× backoff on 429/5xx) · pexels-auth (runtime token seam)
features/videos/
  state/         VideosStore (NgRx SignalStore: query, filter, status, videos, selection)
  pages/         video-list (search/filter/states/grid) · video-player (custom controls)
shared/          DurationPipe · ToastComponent (aria-live)
```
- The store holds **state**; logic lives in services. Search uses `rxMethod` with the
  debounce/distinct/switchMap pipeline. `filteredVideos` and `availableResolutions` are memoized
  `computed` signals, so filtering never refetches.
- Components are `OnPush`; the player route is lazy-loaded.

See [`docs/PRD.md`](./docs/PRD.md) and [`docs/HLD.md`](./docs/HLD.md) for the full requirements and
design (with diagrams). AI-assistance notes: [`AI_NOTES.md`](./AI_NOTES.md).

## Scripts
| Command | Description |
| --- | --- |
| `npm start` | Dev server with proxy (set `PEXELS_API_KEY` first). |
| `npm run build` | Production build. |
| `npm test` | Unit tests (Karma + Jasmine, watch mode). |
| `npm run test:ci` | Unit tests once, headless (28 specs). |

## Testing
28 unit specs (headless Chrome) covering the highest-risk logic:
- `VideoMapperService` — unsorted/partial/missing/garbage data, mp4 filtering, dedupe, unplayable.
- `VideosStore` — debounce coalescing, empty/error states, error→toast, client-side filter with no refetch.
- `retry.interceptor` — 2× backoff on 429/5xx, fail-fast on 4xx.
- `ResolutionService` (label boundaries, union, filter) and `DurationPipe`.

## Responsive design
The player stage is a flex column capped to the viewport (`dvh`), so the video letterboxes and the
**controls stay reachable without scrolling** on phones; the control bar reflows (full-width seek
row) on small screens. The gallery grid is fluid across mobile/tablet/desktop.

## Notes / trade-offs
- Resolution labels are derived from pixel **height** (the `quality` field is unreliable).
- First page only (`per_page=15`); no pagination/infinite scroll (a clear next step).
- `secure: false` on the dev proxy is dev-only (corporate TLS inspection); a prod BFF uses a real trust chain.
