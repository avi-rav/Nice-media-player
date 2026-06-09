# PRD — Pexels Video Media Player

**Status:** Draft for build · **Owner:** avinoam@ravtech.co.il · **Date:** 2026-06-09
**Type:** Interview deliverable (~2.5h time-box) · **Platform:** Web (Angular SPA)

---

## 1. Summary
A single-page web application that fetches videos from the Pexels API and presents them as a
browsable, searchable gallery of cards. Users can search by keyword (debounced), optionally
filter by resolution, and select a video to play it in a player with **custom** controls. The
app demonstrates high-quality, production-minded Angular: strong typing, single-responsibility
services, defensive data handling, visible loading/empty/error states, accessibility, and a
secure approach to the API key.

## 2. Goals
- **G1** Display a "nice" responsive list of video cards: poster, author, duration, resolution.
- **G2** Let the user play a selected video with custom, keyboard-operable controls.
- **G3** Keyword search that is **debounced** and cancels in-flight requests on new input.
- **G4** Filter the list by resolution when resolutions are available.
- **G5** Visibly distinguish **loading**, **empty**, and **error** states.
- **G6** Model the API with real, precise TypeScript types — **no `any`/blanket types**.
- **G7** Handle partial / unsorted / missing video data gracefully (degrade, never crash).
- **G8** Keep the API key out of the client bundle; document a production-secure approach.
- **G9** Be partly keyboard operable with sensible labels / ARIA.
- **G10** Avoid needless re-renders and redundant network requests.

## 3. Non-Goals (out of scope for the time-box)
- Authentication / user accounts, favorites, playlists, comments.
- Infinite scroll / pagination beyond the first page (`per_page=15`).
- A real backend BFF (documented as the prod approach, not implemented).
- Offline support / PWA, i18n, theming/dark-mode toggle.
- Native mobile apps; full cross-browser QA matrix.

## 4. Users & use cases
- **Primary user:** someone browsing stock videos. Wants to scan a gallery, find a clip by
  keyword, judge quality (resolution/duration/author), and watch it.
- **Reviewer (interviewer):** evaluates code quality, architecture, typing, tests, a11y, and
  the handling of edge cases / failures.

## 5. Data source
Pexels Videos API (the URL in the brief is corrected to the real endpoints):
- **Popular:** `GET https://api.pexels.com/videos/popular?per_page=15`
- **Search:** `GET https://api.pexels.com/videos/search?query={kw}&per_page=15`
- **By id (deep-link fallback):** `GET https://api.pexels.com/videos/videos/{id}`
- **Auth:** header `Authorization: <API_KEY>`. Free tier ≈ 200 requests/hour.
- Each video exposes: `image` (poster), `user.name` (author), `duration` (seconds), and
  `video_files[]` each with `width`/`height`/`quality`/`file_type`/`link` (resolution sources).

## 6. Functional requirements

### 6.1 Video list
- **FR-1** On load, fetch **popular** videos and render them as cards.
- **FR-2** Each card shows: poster image, author name, duration (m:ss), and the highest
  available resolution label (e.g. `1080p`) — resolution shown only **if it exists**.
- **FR-3** Cards are responsive (grid) and visually polished.
- **FR-4** Missing fields degrade gracefully: no poster → placeholder; no author → "Unknown";
  no duration → hidden; no playable source → card marked unavailable (not selectable to play).

### 6.2 Search
- **FR-5** A search input filters videos by keyword via the Pexels search endpoint.
- **FR-6** Input is **debounced (300ms)**, **de-duplicated** (no request if query unchanged),
  and uses **switchMap** so a new query **cancels** the previous in-flight request.
- **FR-7** Empty query returns to the popular list.

### 6.3 Resolution filter
- **FR-8** When the loaded results contain ≥1 resolution, show a resolution filter control.
- **FR-9** Selecting a resolution narrows the displayed list **client-side** (no new request).
- **FR-10** An "All" option clears the filter.

### 6.4 Playback
- **FR-11** Selecting a playable card navigates to a player view and plays the video.
- **FR-12** **Custom** controls: play/pause, seek bar with current/total time, volume + mute,
  fullscreen, and — when multiple sources exist — a **resolution/quality selector**.
- **FR-13** Deep-linking to a player URL works even with an empty store (fetch by id; show a
  not-found state on failure).

### 6.5 States & feedback
- **FR-14** **Loading:** skeleton/spinner with `aria-busy`.
- **FR-15** **Empty:** clear "no results" message (distinct from error).
- **FR-16** **Error:** clear message + **Retry** action.
- **FR-17** Transient failures (429 / 5xx) **auto-retry up to 2×** with exponential backoff;
  on exhaustion, show the error state **and** notify the user via a toast.

## 7. Non-functional requirements
- **NFR-1 Type safety:** explicit DTO and domain models; no `any`/blanket casts.
- **NFR-2 Architecture:** single-responsibility services; UI components stay thin; state in a
  dedicated store; clear core/feature/shared layering.
- **NFR-3 Performance:** `OnPush` + signals, memoized derived state, tracked `@for`, lazy poster
  images, lazy-loaded player route; no redundant requests on filter or duplicate query.
- **NFR-4 Resilience:** one malformed record must not break the list; tolerate unsorted/partial
  `video_files`; only offer playable `video/*` (mp4) sources.
- **NFR-5 Accessibility:** keyboard-operable search, cards, filter, and player; sensible labels /
  ARIA roles; focus management; `aria-live` for async/status changes.
- **NFR-6 Security:** API key never shipped in client JS; dev proxy injects it from an env var;
  prod approach (BFF/serverless proxy + secret manager) documented.
- **NFR-7 Testability:** unit tests for the defensive mapper, store search pipeline, retry
  interceptor, resolution logic, duration pipe, and a representative component.
- **NFR-8 Maintainability:** consistent naming, small files, documented public surfaces.

## 8. Acceptance criteria
- **AC-1** App loads → popular videos render as cards with poster/author/duration/resolution.
- **AC-2** Typing in search rapidly issues **one** resolved request for the final query; earlier
  requests are cancelled (verifiable in the Network tab).
- **AC-3** Selecting a resolution filters the visible cards with **no** new network request.
- **AC-4** A query with no matches shows the **empty** state; a forced failure shows the **error**
  state with Retry and a toast; a transient 5xx recovers within ≤2 retries.
- **AC-5** A card with no playable source is shown as unavailable and cannot open the player.
- **AC-6** A video plays with fully custom controls; play/pause, seek, volume, mute, fullscreen,
  and quality switching all work, including via keyboard.
- **AC-7** The built bundle (`dist/`) contains **no** API key string.
- **AC-8** `npm test` passes (mapper, store, retry interceptor, resolution, pipe, card specs).

## 9. Success metrics (qualitative, for review)
- Clean, readable, well-typed code with sensible separation of concerns.
- Edge cases visibly handled rather than ignored.
- Accessible by keyboard with meaningful labels.
- Tests target the highest-risk logic (parsing, async pipeline, retry).

## 10. Risks & assumptions
- **Key exposure** is inherent to client-side calls → mitigated by dev proxy; prod needs a BFF.
- **Rate limiting (200/hr)** can cause 429s → handled by limited retry + user notification.
- **Resolution semantics** (`quality` vs `width/height`) are inconsistent → label derived from
  `height` in the mapper.
- **Assumption:** first page (`per_page=15`) is sufficient for the demo; no pagination.
- **Assumption:** modern evergreen browser with native `<video>` (HTML5) support.

## 11. Reference docs
- High-Level Design: [docs/HLD.md](./HLD.md)
- README (setup, run, key security): `../README.md`
- AI usage notes: `../AI_NOTES.md`
