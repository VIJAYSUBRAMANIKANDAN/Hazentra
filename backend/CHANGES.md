# Backend changes in this revision

Applied from the Hazentra enhancement spec, §2 (Backend Modernization & Scalability). All changes verified by importing `app.main` and exercising the routes with `TestClient` (see test output referenced in the accompanying spec conversation) — model checkpoint itself was not re-run since no GPU/CUDA is available in the audit environment, but the full FastAPI app (including the real `torch`/`timm`/`torchvision`/`opencv` inference stack) imports and serves correctly.

## `app/main.py`
- **Bounded concurrency** (§2.2): replaced unbounded `threading.Thread()` per upload with a `ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS)`. New env vars `MAX_CONCURRENT_JOBS` (default 2) and `MAX_QUEUED_JOBS` (default `MAX_CONCURRENT_JOBS * 5`). Once the queue is full, new uploads get a `429` instead of piling on unbounded threads.
- **API versioning** (§2.1): all endpoints now live under `/api/v1/*` with typed Pydantic request/response models (`CreateJobResponse`, `HealthResponse`, `ErrorResponse`). The old unversioned `/api/*` routes are kept as thin deprecation-window aliases calling the same implementation — safe to delete once the frontend is fully on `/api/v1`.
- **Standardized error shape**: a global `HTTPException` handler now always returns `{"error_code": ..., "message": ...}`.
- **Startup warm-up** (§2.3): added a `lifespan` handler that loads the checkpoint (and does the model's first forward pass) before the server starts accepting traffic, instead of making the first real user pay that cold-start cost. If the checkpoint is missing, this logs loudly but doesn't crash the process — the existing per-request 503 still fires.
- **Input validation hardening** (§2.4): uploads are now decode-verified with Pillow (`Image.load()` + format check) rather than trusting the client-supplied `Content-Type` header alone.
- **EXIF stripped** from the echoed-back `hazy_image` before it's returned to the client.
- **Rate limiting** (§2.4): `slowapi`, default `10/hour` per IP on job creation, configurable via `RATE_LIMIT`.
- **CORS tightened** (§2.4): `allow_methods`/`allow_headers` narrowed from `["*"]` to only what's actually used.
- **Security headers middleware**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and HSTS when served over HTTPS.
- **Structured logging** (§2.5): `structlog`, JSON in production (`LOG_FORMAT=json`) / readable console in dev (default). Every job logs a bound `job_id` through creation, completion, and failure.
- **Narrowed exception handling** (§2.5): OOM (`torch.cuda.OutOfMemoryError` / CPU `RuntimeError`) now surfaces a distinct, user-safe "server overloaded" message instead of a generic failure string; other exceptions log full tracebacks server-side but never leak internals to the client.
- **Base64 → reference-URL image delivery** (§1.1/§2.3, previously deferred, now implemented): `_run_job()` writes the hazy/transmission/dehazed images to `results/{job_id}/` on disk instead of base64-encoding them into the SSE payload. New endpoint `GET /api/v1/dehaze/jobs/{job_id}/image/{hazy|transmission|dehazed}` serves them as normal PNG/JPEG file responses with `Cache-Control: public, max-age=3600, immutable`. The SSE `done` event now only carries `{id, metrics, benchmarked, filename}` — no image bytes at all. `_prune_expired_jobs()` deletes the on-disk folder alongside the in-memory job entry once `JOB_TTL_SECONDS` passes. New env var `RESULTS_DIR` (default `results`) controls where these are written — point it at a mounted volume in production so results survive a container restart, or swap the two `open()`/`FileResponse` calls for S3 reads/writes later without changing the endpoint's contract.

## `Dockerfile`
- Multi-stage build (builder stage installs deps to `--user`, runtime stage copies only the result).
- Runs as a non-root `appuser` (uid 1000).
- Added `HEALTHCHECK` against `/api/v1/health` with a 90s start period (checkpoint load + warm-up isn't instant).
- `LOG_FORMAT=json` set by default for the container image.

## `.dockerignore`
- New file — previously absent, meaning `__pycache__`, `.venv`, `.git`, and `.env` could all have been copied into build context/layers.

## `requirements.txt`
- Added `structlog==26.1.0` and `slowapi==0.1.10`. Everything else unchanged and still pinned.

## `.env.example`
- Documents the new `MAX_CONCURRENT_JOBS`, `MAX_QUEUED_JOBS`, `RATE_LIMIT`, `LOG_LEVEL`, `LOG_FORMAT` variables.

## `.github/workflows/ci.yml`
- New — previously no CI existed at all. Runs `pip-audit` (non-blocking for now — flip to blocking once existing findings are triaged) and an import/route-registration smoke test on every push/PR touching `backend/`.

## Not included in this pass (documented, not implemented)
These need infrastructure this environment can't provision or verify (Redis, S3, Sentry DSN, a second deploy environment) — they're specified in detail in the main enhancement spec (§2.2, §2.6) but intentionally left out of this code drop so nothing here silently depends on a service that isn't actually there:
- Redis-backed job store (needed only once you run >1 replica)
- Sentry integration
- PostgreSQL/Alembic (no feature needs persistence yet)
- Swapping local-disk `results/` storage for S3 — the image endpoint's contract (`GET /api/v1/dehaze/jobs/{id}/image/{kind}` → file bytes) is already S3-ready; only the two `open()`/`FileResponse` calls in `main.py` need to change to `boto3` calls once you have a bucket.

**Operational note on the new `results/` directory**: on a single-instance deploy this just needs a writable disk, which the default Dockerfile already provides. If you run this behind a container orchestrator that recreates the container on every deploy, mount `results/` as a persistent volume (or move straight to S3) — otherwise in-flight results are lost on redeploy, same as the in-memory job store already was.
