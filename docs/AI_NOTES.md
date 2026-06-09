# AI Notes

Brief, honest account of how I used AI assistance on this exercise.

## 1. Which AI tools I used, and for what
- **AI coding assistant (Claude Code)** — used to:
  - scaffold boilerplate (Angular CLI commands, file/folder skeletons);
  - draft the defensive mapper and the SignalStore search pipeline from my spec;
  - draft the docs (PRD/HLD/README) from my outline.
- **What I did by hand / verified myself:** the architecture decisions (SignalStore vs full NgRx,
  service boundaries, proxy-based key handling), the API correction, reviewing every generated
  file, and running the build to confirm it actually works.

## 2. A few prompts I wrote — and one I had to refine
1. *"Model the Pexels videos response as real TypeScript types — separate raw DTOs from a
   normalized domain model, no `any`."*
2. *"Write the search as an NgRx SignalStore `rxMethod` with `debounceTime(300)`,
   `distinctUntilChanged()`, and `switchMap` so a new query cancels the in-flight request."*
3. *"Make the DTO→domain mapper defensive: tolerate missing author/duration/poster, unsorted and
   partial `video_files`, and mark a video unavailable when there's no playable source."*

**Refinement example (prompt 3).** My first version was just *"map the API response to a Video
model."* The output assumed every field was present and that `video_files` were sorted and always
mp4 — it would throw on a record with `video_files: null`. I refined it to spell out the exact
failure cases (null arrays, missing height, non-`video/*` types, unsorted order) and to require
that *one bad record must not break the whole list*. The second result wrapped per-record mapping
in a guard and sorted/deduped sources — which is what shipped.

## 3. How I caught the AI being wrong
- **Wrong API URL:** the brief's URL (`http://api.pexels.com/videos/popular/per_page=15`) is
  malformed and the assistant initially echoed it. I checked the official Pexels docs and corrected
  it to `https://api.pexels.com/videos/popular?per_page=15` with an `Authorization` header (and the
  `search` / `videos/:id` endpoints).
- **Insecure key handling:** an early suggestion put the API key in `environment.ts` (i.e. in the
  client bundle). I caught that this exposes the key publicly and replaced it with a dev proxy that
  injects the header server-side, plus a documented BFF approach for production.
- **Over-optimistic parsing:** as above, I reviewed the mapper against real edge cases rather than
  trusting that the happy path was enough.
