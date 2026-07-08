# ClearVision AI

Full-stack image dehazing app: Next.js 14 frontend (matching your reference
design) + FastAPI service wrapping your trained Searchable ViT + NAS codebook
+ RefinementNet model exactly as defined in `Dehazing (3).ipynb` + Postgres
(Prisma) job history.

```
clearvision-ai/
├── frontend/                Next.js 14 (App Router) + TS + Tailwind + Framer Motion
│   ├── app/
│   │   ├── page.tsx              Home
│   │   ├── upload/page.tsx       Upload
│   │   ├── results/page.tsx      Results
│   │   ├── settings/page.tsx     Settings
│   │   ├── about/page.tsx        About
│   │   └── api/history/route.ts  Prisma-backed job history API
│   ├── components/ (AppShell, Sidebar)
│   ├── lib/ (types, store, api client, prisma client)
│   └── prisma/schema.prisma
├── backend/                  FastAPI model-serving layer
│   ├── app/model.py          Architecture, ported 1:1 from the notebook
│   ├── app/inference.py      STEP 25 dehazing pipeline, ported 1:1
│   ├── app/main.py           /api/dehaze endpoint
│   └── weights/              <-- put your .pth checkpoint here
└── docker-compose.yml
```

## 1. Get your trained weights into the backend

Your notebook's **STEP 26** already produces the single checkpoint the
backend needs:

```python
checkpoint_path = os.path.join(SAVE_DIR, 'nas_dehazing_final_model.pth')
```

Copy that file (and, if you have it, `bulk_evaluation_report.json` from
STEP 24) into `backend/weights/`:

```
backend/weights/nas_dehazing_final_model.pth
backend/weights/bulk_evaluation_report.json   (optional — used for the metric cards)
```

Without a checkpoint the `/api/dehaze` endpoint returns a clear 503 telling
you what's missing, instead of failing silently.

## 2. Run locally

```bash
# --- Backend (FastAPI) ---
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# --- Database (Postgres) ---
# Easiest: docker run -p 5432:5432 -e POSTGRES_PASSWORD=clearvision -e POSTGRES_DB=clearvision postgres:16-alpine

# --- Frontend (Next.js) ---
cd ../frontend
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000. Upload a hazy JPG/PNG on the Upload page — it's
sent to the FastAPI service, which runs your exact model and returns the
dehazed image, the transmission map, and metrics; the Results page then
displays them and the job gets saved to Postgres.

### Or with Docker Compose

```bash
docker compose up --build
```

## 3. Important accuracy note

The notebook's PSNR/SSIM/MAE/RMSE (STEP 21 & STEP 24) are computed against a
**synthetic ground-truth beta map** that only exists for the training/eval
dataset you generated. A real photo a user uploads has no ground truth, so
the Results page reports the model's **benchmark averages** (from STEP 24's
`bulk_evaluation_report.json`, or the notebook's last printed values as a
fallback) rather than fabricating a live PSNR for an image with no reference.
This is labeled in the UI so it isn't misleading.

## 4. Deployment

| Layer | Recommended platform | Why |
|---|---|---|
| Frontend + API routes | **Vercel** | Native Next.js hosting, zero-config |
| Database | **Supabase** or **Railway Postgres** | Managed Postgres, easy `DATABASE_URL` |
| Model service | **Railway** (Docker) or a GPU box on **Modal**/**Runpod** | Your model needs `torch`+`timm`+OpenCV and a ~90MB ViT checkpoint — this doesn't fit Vercel's serverless function limits, so it needs its own long-running container. Railway is the simplest if you're CPU-inference (a ViT-Small forward pass is fine on CPU, a few hundred ms–1s per image); use Modal if you want GPU autoscaling. |

### Frontend → Vercel
1. Push `frontend/` to a GitHub repo (or the monorepo with root directory set to `frontend`).
2. Import the repo in Vercel, set root directory to `frontend`.
3. Environment variables: `DATABASE_URL`, `NEXT_PUBLIC_MODEL_API_URL` (your deployed backend's public URL).
4. Build command stays default (`next build`); Vercel runs `prisma generate` automatically if you add `"postinstall": "prisma generate"` to `package.json` (already included).

### Database → Supabase
1. Create a project, copy the connection string (use the "connection pooling" URI for serverless).
2. Set it as `DATABASE_URL` in Vercel.
3. Run `npx prisma db push` once locally (pointed at the Supabase URL) to create the `DehazeJob` table.

### Model service → Railway
1. New project → Deploy from repo → root directory `backend` (it has its own `Dockerfile`).
2. Upload your checkpoint: since Railway's filesystem is ephemeral on redeploy, either (a) bake `weights/*.pth` into the image by committing it (fine for a ~90MB file via Git LFS), or (b) mount a Railway volume at `/app/weights` and upload the file once via `railway run` / SFTP.
3. Environment variables: `ALLOWED_ORIGINS=https://<your-vercel-domain>`.
4. Note your Railway service's public URL and set it as `NEXT_PUBLIC_MODEL_API_URL` in Vercel.

### Wiring it all together
```
NEXT_PUBLIC_MODEL_API_URL = https://clearvision-backend.up.railway.app
DATABASE_URL              = postgresql://...supabase pooling URL...
ALLOWED_ORIGINS (backend) = https://clearvision.vercel.app
```
