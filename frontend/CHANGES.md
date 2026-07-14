# Frontend changes in this revision

Applied from the Hazentra enhancement spec, §1 (Frontend Optimization & Modernization). Verified with `npx tsc -b`, `npx vite build`, and `npx oxlint` — all pass clean (see build output referenced in the accompanying conversation).

## `vite.config.ts`
- Added `manualChunks` (function form, grouped by package) splitting `vendor` (react/react-dom/react-router-dom), `motion` (framer-motion/gsap), `state` (zustand), and `zip` (jszip) out of the main bundle.
- `chunkSizeWarningLimit: 150` so an oversized chunk shows up as a build warning instead of silently shipping.
- `build.target: 'es2020'`, `cssCodeSplit: true`.

## `src/App.tsx`
- Routes converted to `React.lazy()` + `Suspense`, each page now its own chunk (confirmed in the build output: `Home`, `Upload`, `Results`, `Settings`, `About` all emit separately). Suspense fallback reuses the existing `DehazeLoader` component rather than introducing a new loading pattern.

## `src/lib/store.ts`
- Added `devtools` middleware (Redux DevTools integration, dev-only via `import.meta.env.DEV`).
- Added `persist` middleware, but **only** for `outputFormat`/`alphaBlending` via `partialize` — `queue`/`batchResults` are deliberately excluded since they can hold multiple full-size base64 images and would blow past `localStorage`'s ~5MB quota.

## `src/lib/api.ts`
- Updated to call the backend's new versioned endpoints (`/api/v1/dehaze/jobs`, `/api/v1/dehaze/jobs/{id}/stream`) to match the backend change. The backend keeps the old unversioned routes as aliases during the deprecation window, so this isn't a breaking change, just moving to the canonical path.
- **Base64 → reference-URL images (previously deferred, now implemented)**: the SSE `done` payload no longer contains `hazy_image`/`transmission_map`/`dehazed_image` as base64 strings. Instead, `dehazeImage()` builds plain URLs via a new `jobImageUrl(jobId, kind)` helper pointing at the backend's `GET /api/v1/dehaze/jobs/{id}/image/{kind}` endpoint. `DehazeResult.hazyDataUrl`/`transmissionDataUrl`/`dehazedDataUrl` (field names kept as-is, see `types.ts` comment) now hold these URLs instead of `data:` URLs — `<img src>` doesn't care either way, so `Results.tsx`/`Upload.tsx` needed no changes for display.

## `src/lib/upscale.ts`
- `loadImage()` now sets `img.crossOrigin = "anonymous"` — required because the result image is loaded from the backend's own origin now (not embedded as a `data:` URL), and without this the canvas resize operations below it would throw a `SecurityError` on `toDataURL()`. The backend's existing CORS middleware already allows the frontend's origin, so no backend change was needed beyond that.
- Replaced `dataUrlToBlob()` (which assumed every input was a `data:` URL and would throw on a plain URL) with `imageSrcToBlob()`, which handles both: a plain `http(s)` URL is fetched and returned as a Blob directly; a `data:` URL (still produced by `exportAtQuality()` whenever an actual resize happens) uses the original decode-in-place logic. `dataUrlToBlob` is kept as a deprecated export for compatibility but is no longer called from the app.

## `src/pages/Results.tsx`, `src/pages/Upload.tsx`
- Download call sites (`downloadSingle`, `downloadAll`, per-item download) switched from `dataUrlToBlob(exported)` to `await imageSrcToBlob(exported)` — the only change needed since `exportAtQuality()`'s return value is unchanged in shape.

## `src/pages/Upload.tsx`
- **Retry**: failed queue items now get a "Retry" button (re-submits the already-selected `File` through the existing `startNextInQueue`/concurrency-limited path — no new upload flow, reuses what's there).
- **Offline detection**: a banner appears via the new `useOnlineStatus` hook when `navigator.onLine` is false, and the "Choose Files" button disables — surfaces the problem immediately instead of letting a user wait out `api.ts`'s 45s SSE stall timeout.

## `src/components/IntroLoader.tsx`
- `prefers-reduced-motion` now skips the intro entirely (same code path as "already seen this session").
- Added a keyboard/screen-reader-reachable "Skip intro" button — previously the whole overlay was `aria-hidden`, meaning even a sighted keyboard user had no way to skip except waiting.

## `src/components/HazeField.tsx`
- Added a `useReducedMotion` guard around the GSAP ambient-drift timeline. The global CSS rule in `globals.css` only catches CSS transitions/animations — GSAP animates transforms directly and needed its own check.

## `src/pages/Results.tsx`
- Image `alt` text now includes the filename (`"Dehazed version of {filename}"`) instead of just the panel label, for more useful screen-reader context.

## `tailwind.config.js`
- Added a couple of spacing-scale values (`18`, `22`) that fill gaps in the default 4px scale.

## New files
- `src/hooks/useReducedMotion.ts`, `src/hooks/useOnlineStatus.ts` — small reusable hooks backing the above.

## New: `src/components/ui/` component system
Previously there was no shared component library — buttons, cards, and any dialog/notification pattern were either repeated Tailwind className strings per page or didn't exist at all. Added and wired up (not just written and left unused):
- **`Button.tsx`** — `variant` (primary/secondary/ghost/danger) × `size` (sm/md/lg), loading state with spinner, `focus-ring` built in. Replaced the ad-hoc CTA buttons in `Upload.tsx`, `Results.tsx`, and `Settings.tsx` (Choose Files, Retry, View all results, download/reset actions).
- **`Card.tsx`** — the `rounded-2xl border border-ink-700 bg-ink-900/60` pattern that was duplicated across pages, now one component. Used in `Results.tsx` for each result block.
- **`Modal.tsx`** — real focus trap (Tab/Shift+Tab cycle inside the dialog), Escape closes it, focus returns to the trigger element on close, rendered via a portal. Previously **no modal existed anywhere in the app**. Wired into `Settings.tsx` as a "Reset preferences" confirmation — a genuine use, not a demo.
- **`Toast.tsx`** + **`toastContext.ts`** — `ToastProvider` wraps the app in `App.tsx`; any page calls `useToast().showToast(message, kind)`. Wired into `Upload.tsx` (job success/failure, download started, offline/back-online) and `Results.tsx` (download success/failure) and `Settings.tsx` (preferences reset) — replacing what was previously silent completion.
- **`Skeleton.tsx`** — animated placeholder (skips the pulse animation under `prefers-reduced-motion`, still shows a static block). Used inside `BeforeAfterSlider` while both images are loading, instead of a blank square.

## New: `src/components/BeforeAfterSlider.tsx`
Replaces the old side-by-side "Original (hazy)" / "Dehazed" image grid in `Results.tsx` with a single draggable comparison slider — mouse drag, touch drag, and arrow-key adjustment when the handle is focused (so this doesn't regress keyboard accessibility versus what it replaced). Shows the `Skeleton` overlay until both images finish loading.

## `tailwind.config.js`
- Added a couple of spacing-scale values (`18`, `22`) that fill gaps in the default 4px scale.
- Added a `borderRadius` scale (`sm`/`md`/`lg`/`xl`/`2xl`) and two more `boxShadow` steps (`sm`/`md`) alongside the existing `glow`/`card` — the "standard button sizes / consistent shadows / border-radius system" from the UI review is now the actual token set `Button`/`Card`/`Modal` pull from, not just a spec suggestion.

## Removed
- `src/index.css` — dead file left over from the Vite scaffold template (unrelated light-theme color tokens, unused `#root` width rule). Never imported anywhere (`main.tsx` only imports `styles/globals.css`) — confirmed via grep before deletion.

## Already solid, left as-is
Worth calling out explicitly since the audit noted it: `.focus-ring` was already defined globally in `globals.css` and applied consistently across `Navbar.tsx`/`Sidebar.tsx`/`QualityMenu.tsx`/`Upload.tsx`, and a global `prefers-reduced-motion` CSS rule already capped animation/transition durations. The accessibility gaps that existed were narrower than a generic audit would assume — namely the intro overlay's blanket `aria-hidden` and GSAP's direct style manipulation bypassing the CSS rule, both fixed above.

## Not included in this pass (documented, not implemented)
- Vitest/Playwright test setup, Storybook — specified in the main enhancement-spec document but not included in this code drop.
- The `Button`/`Card` components weren't retrofitted onto every single existing button/card in the app (e.g. `Navbar.tsx`/`Sidebar.tsx` nav items, `QualityMenu.tsx`'s dropdown items) — those already had consistent, working styling of their own (see the accessibility note above) and swapping them for the new components would be a pure refactor with no functional change, so it was left out to keep this diff focused on things that actually behave differently now.
