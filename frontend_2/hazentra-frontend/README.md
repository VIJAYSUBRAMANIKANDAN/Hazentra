# Hazentra Frontend (Vite + React + TS)

Complete rebuild of the Hazentra frontend. **Backend is untouched** — this
talks to the exact same `POST /api/dehaze` endpoint with the exact same
request/response shape as before, so nothing on the FastAPI/Railway side
needs to change.

## Stack
React 19 + TypeScript (strict) + Vite + Tailwind CSS + Framer Motion + GSAP
(ScrollTrigger) + Lenis (smooth scroll) + React Router + Zustand + Lucide icons.

## Setup

```bash
npm install
cp .env.example .env
# edit .env — set VITE_MODEL_API_URL to your backend's URL, NO trailing slash
npm run dev
```

Open http://localhost:5173.

## Environment variables

| Key | Example | Notes |
|---|---|---|
| `VITE_MODEL_API_URL` | `https://cooperative-spirit-production-fa2b.up.railway.app` | **No trailing slash** — the client appends `/api/dehaze` itself. A trailing slash produces a double `//` and a 404. |

Vite only exposes env vars prefixed with `VITE_` to the browser (this is the
Vite equivalent of Next.js's `NEXT_PUBLIC_` prefix) — that's why the variable
is named `VITE_MODEL_API_URL` here instead of `NEXT_PUBLIC_MODEL_API_URL`.

On Vercel: Project → Settings → Environment Variables → add
`VITE_MODEL_API_URL` with your Railway URL, then redeploy. If you're
deploying this as a static Vite app (not Next.js), set Vercel's Framework
Preset to "Vite" — build command `npm run build`, output dir `dist`.

## What talks to the backend, and how
`src/lib/api.ts` is the only file that knows about the backend. It builds
the URL from `VITE_MODEL_API_URL`, posts the file as `multipart/form-data`
to `/api/dehaze`, and maps the JSON response
(`hazy_image`, `transmission_map`, `dehazed_image`, `metrics.*`) into the
app's internal `DehazeResult` type. Never hardcode a URL anywhere else —
change the `.env` value (locally) or the Vercel dashboard variable (in
production) instead.

## Notes on scope
History/job persistence (previously backed by Prisma/Postgres in the old
Next.js app) is not re-implemented here, since the backend only exposes
`/api/dehaze` — there's no history endpoint to call yet. The Results page
shows the most recent job in memory (Zustand), matching what the backend
can actually provide today. If you want persisted history back, that needs
a small addition to the FastAPI backend (a `/api/history` endpoint plus a
database) — say the word and it can be added without touching anything
currently working.
