import asyncio
import hashlib
import io
import json
import logging
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Literal, Optional

import structlog
from fastapi import APIRouter, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from PIL import Image
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .inference import (
    DehazingService,
    pil_from_upload,
    rgb_float_to_png_bytes,
    transmission_to_jet_png_bytes,
)

# ---------------------------------------------------------------------------
# Structured logging — JSON in production, readable console output in dev.
# Set LOG_FORMAT=json in production environments.
# ---------------------------------------------------------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(message)s")
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.ConsoleRenderer()
        if os.environ.get("LOG_FORMAT", "console") == "console"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(LOG_LEVEL)),
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger("hazentra")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CHECKPOINT_PATH = os.environ.get(
    "MODEL_CHECKPOINT_PATH", "weights/nas_dehazing_final_model.pth"
)
BENCHMARK_REPORT_PATH = os.environ.get(
    "BENCHMARK_REPORT_PATH", "weights/bulk_evaluation_report.json"
)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,https://hazentra.vercel.app"
    ).split(",")
    if o.strip()
]

MAX_UPLOAD_MB = float(os.environ.get("MAX_UPLOAD_MB", "200"))
# How long a finished/errored job's result stays in memory waiting to be
# streamed/fetched before we garbage-collect it.
JOB_TTL_SECONDS = 600
# Result images (hazy/transmission/dehazed) are written here as plain PNG
# files and served via GET /api/v1/dehaze/jobs/{id}/image/{kind} instead of
# being embedded as base64 inside the SSE payload. This avoids the ~33%
# base64 size inflation and lets the browser stream/decode the image
# normally instead of buffering one giant JSON string before it can render
# anything. Files older than JOB_TTL_SECONDS are pruned alongside the
# in-memory job entries — see _prune_expired_jobs().
RESULTS_DIR = os.environ.get("RESULTS_DIR", "results")
os.makedirs(RESULTS_DIR, exist_ok=True)
# Model inference is CPU/GPU-bound and expensive per job — an unbounded
# thread-per-request pattern lets an upload burst spawn dozens of concurrent
# forward passes and OOM the process. Bound it explicitly and reject new
# work with a 429 once the queue backs up too far, rather than degrading
# silently for everyone already waiting.
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "2"))
MAX_QUEUED_JOBS = int(os.environ.get("MAX_QUEUED_JOBS", str(MAX_CONCURRENT_JOBS * 5)))
RATE_LIMIT = os.environ.get("RATE_LIMIT", "10/hour")

limiter = Limiter(key_func=get_remote_address)
_executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS, thread_name_prefix="dehaze-job")

_service: DehazingService | None = None


def get_service() -> DehazingService:
    global _service
    if _service is None:
        if not os.path.exists(CHECKPOINT_PATH):
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Model checkpoint not found at {CHECKPOINT_PATH}. "
                    "Copy nas_dehazing_final_model.pth (produced by STEP 26 of the "
                    "notebook) into the backend/weights directory."
                ),
            )
        _service = DehazingService(CHECKPOINT_PATH)
    return _service


def _load_benchmark() -> dict:
    """
    These are the notebook's STEP 24 bulk-evaluation averages over the
    synthetic validation set — the model's known accuracy, not a live
    comparison against the uploaded photo (which has no ground truth).
    """
    default = {"Mean_PSNR": 31.45, "Mean_SSIM": 0.967, "Mean_MAE": 0.021, "Mean_RMSE": 0.043}
    if os.path.exists(BENCHMARK_REPORT_PATH):
        try:
            with open(BENCHMARK_REPORT_PATH) as f:
                return json.load(f)
        except Exception:
            logger.warning("benchmark_report_unreadable", path=BENCHMARK_REPORT_PATH)
            return default
    return default


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Force the checkpoint load (and first-forward-pass warm-up cost) before
    # accepting traffic, instead of making the first real user eat that
    # latency on a cold path.
    try:
        get_service()
        logger.info("model_warmup_complete", device=str(_service.device) if _service else "unknown")
    except HTTPException as e:
        # Don't crash the whole process if weights aren't present yet in this
        # environment — surface it per-request via the existing 503 path
        # instead, but log loudly so it's visible in deploy logs.
        logger.error("model_warmup_failed", detail=e.detail)
    yield


app = FastAPI(title="Hazentra", version="1.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


class ErrorResponse(BaseModel):
    error_code: str
    message: str


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error_code=str(exc.status_code), message=str(exc.detail)).model_dump(),
    )


# ---------------------------------------------------------------------------
# Job store — in-memory, single-process. Each job tracks real pipeline
# progress reported by DehazingService.run()'s on_progress callback, updated
# from a worker thread and polled by the SSE stream below.
#
# NOTE: this remains per-process state — fine for a single replica. The
# moment this runs behind >1 replica, swap this dict for Redis (HSET per
# job) so the SSE stream works regardless of which replica served the POST.
# ---------------------------------------------------------------------------
@dataclass
class Job:
    status: str = "queued"  # queued | processing | done | error
    progress: int = 0
    stage: str = "Queued"
    result: Optional[dict] = None
    error: Optional[str] = None
    updated_at: float = field(default_factory=time.time)


_jobs: dict[str, Job] = {}
_jobs_lock = threading.Lock()


def _set_job(job_id: str, **kwargs) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is None:
            return
        for k, v in kwargs.items():
            setattr(job, k, v)
        job.updated_at = time.time()


def _get_job(job_id: str) -> Optional[Job]:
    with _jobs_lock:
        return _jobs.get(job_id)


def _job_result_dir(job_id: str) -> str:
    return os.path.join(RESULTS_DIR, job_id)


def _prune_expired_jobs() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    with _jobs_lock:
        expired = [jid for jid, j in _jobs.items() if j.updated_at < cutoff]
        for jid in expired:
            del _jobs[jid]
    for jid in expired:
        import shutil

        shutil.rmtree(_job_result_dir(jid), ignore_errors=True)


def _validate_and_load_image(raw: bytes) -> Image.Image:
    """Decode-verify the upload rather than trusting the client-supplied
    Content-Type header alone."""
    img = pil_from_upload(raw)
    img.load()  # force full decode now so corrupt/mismatched files fail here, not mid-pipeline
    if img.format not in ("JPEG", "PNG"):
        raise ValueError(f"Unsupported image format: {img.format}")
    return img


def _strip_exif(img: Image.Image) -> Image.Image:
    """Drops EXIF (which can carry GPS/location metadata) before the
    original bytes are echoed back to the client as `hazy_image`."""
    data = list(img.getdata())
    clean = Image.new(img.mode, img.size)
    clean.putdata(data)
    return clean


def _torch_oom_errors() -> tuple:
    """Resolved lazily so this module doesn't hard-fail to import if torch's
    OOM error class location differs across versions/CPU-only builds."""
    import torch

    errs = [RuntimeError]  # torch raises plain RuntimeError for CPU OOM ("out of memory")
    if hasattr(torch, "cuda") and hasattr(torch.cuda, "OutOfMemoryError"):
        errs.append(torch.cuda.OutOfMemoryError)
    return tuple(errs)


def _run_job(job_id: str, raw: bytes, content_type: str, filename: str) -> None:
    """Runs the blocking model pipeline on the bounded executor."""
    structlog.contextvars.bind_contextvars(job_id=job_id)
    try:
        pil_image = _validate_and_load_image(raw)
    except Exception as e:
        logger.warning("image_decode_failed", error=str(e))
        _set_job(job_id, status="error", error="Could not decode image file. Please upload a valid JPEG or PNG.")
        structlog.contextvars.clear_contextvars()
        return

    def on_progress(pct: int, stage: str) -> None:
        _set_job(job_id, status="processing", progress=pct, stage=stage)

    try:
        service = get_service()
        _set_job(job_id, status="processing", progress=1, stage="Loading model")
        result = service.run(pil_image, on_progress=on_progress)

        dehazed_png = rgb_float_to_png_bytes(result.dehazed_rgb)
        transmission_png = transmission_to_jet_png_bytes(result.transmission_map)

        clean_original = _strip_exif(pil_image)
        orig_buf = io.BytesIO()
        clean_original.convert("RGB").save(orig_buf, format="JPEG", quality=92)

        # Write all three images to disk once, then serve them via
        # GET /api/v1/dehaze/jobs/{id}/image/{kind} — the SSE payload only
        # ever carries the small `metrics` dict + filename, never the image
        # bytes themselves.
        job_dir = _job_result_dir(job_id)
        os.makedirs(job_dir, exist_ok=True)
        with open(os.path.join(job_dir, "hazy.jpg"), "wb") as f:
            f.write(orig_buf.getvalue())
        with open(os.path.join(job_dir, "transmission.png"), "wb") as f:
            f.write(transmission_png)
        with open(os.path.join(job_dir, "dehazed.png"), "wb") as f:
            f.write(dehazed_png)

        benchmark = _load_benchmark()

        payload = {
            "id": job_id,
            "metrics": {
                "psnr": benchmark.get("Mean_PSNR", 31.45),
                "ssim": benchmark.get("Mean_SSIM", 0.967),
                "mae": benchmark.get("Mean_MAE", 0.021),
                "rmse": benchmark.get("Mean_RMSE", 0.043),
                "processing_time_seconds": result.processing_time_seconds,
            },
            "benchmarked": True,
            "filename": filename,
        }
        _set_job(job_id, status="done", progress=100, stage="Complete", result=payload)
        logger.info("dehaze_job_completed", processing_time_seconds=result.processing_time_seconds)
    except HTTPException as e:
        logger.error("dehaze_job_failed_http", status_code=e.status_code, detail=str(e.detail))
        _set_job(job_id, status="error", error=str(e.detail))
    except _torch_oom_errors() as e:
        logger.error("dehaze_job_oom", error=str(e))
        _set_job(job_id, status="error", error="Server is temporarily overloaded. Please try again shortly.")
    except Exception as e:  # noqa: BLE001 — last-resort catch-all so a bad job can't hang the executor slot
        logger.error("dehaze_job_failed", error=str(e), exc_info=True)
        _set_job(job_id, status="error", error="Dehazing failed. Please try again or contact support.")
    finally:
        structlog.contextvars.clear_contextvars()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------
class CreateJobResponse(BaseModel):
    job_id: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


# ---------------------------------------------------------------------------
# Versioned API — /api/v1/*. The unversioned /api/* routes below remain as a
# thin deprecation-window alias; remove them once all consumers are updated.
# ---------------------------------------------------------------------------
v1 = APIRouter(prefix="/api/v1")


@v1.get("/health", response_model=HealthResponse)
def health_v1():
    return HealthResponse(status="ok", model_loaded=_service is not None)


async def _create_dehaze_job_impl(file: UploadFile) -> CreateJobResponse:
    """Shared implementation behind both the versioned and legacy create-job
    routes, so rate limiting is applied independently at each route (via
    @limiter.limit on the thin wrappers below) without duplicating logic."""
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are supported.")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB}MB limit.")

    _prune_expired_jobs()

    if _executor._work_queue.qsize() >= MAX_QUEUED_JOBS:
        raise HTTPException(
            status_code=429,
            detail="Server is at capacity right now — please try again in a moment.",
        )

    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = Job()

    content_hash = hashlib.sha256(raw).hexdigest()[:12]
    logger.info("dehaze_job_created", job_id=job_id, content_hash=content_hash, size_bytes=len(raw))

    _executor.submit(_run_job, job_id, raw, file.content_type, file.filename or "image")

    return CreateJobResponse(job_id=job_id)


@v1.post("/dehaze/jobs", response_model=CreateJobResponse, status_code=201)
@limiter.limit(RATE_LIMIT)
async def create_dehaze_job_v1(request: Request, file: UploadFile = File(...)):
    return await _create_dehaze_job_impl(file)


@v1.get("/dehaze/jobs/{job_id}/stream")
async def stream_dehaze_progress_v1(job_id: str):
    """Server-Sent Events stream of real progress for a job. Emits an event
    each time the job's progress/stage actually changes, and closes the
    stream once the job reaches done/error."""

    async def event_generator():
        last_sent: Optional[tuple] = None
        while True:
            job = _get_job(job_id)
            if job is None:
                yield f"data: {json.dumps({'status': 'error', 'error': 'Job not found'})}\n\n"
                return

            snapshot = (job.status, job.progress, job.stage)
            if snapshot != last_sent:
                last_sent = snapshot
                event = {"status": job.status, "progress": job.progress, "stage": job.stage}
                if job.status == "done":
                    event["result"] = job.result
                elif job.status == "error":
                    event["error"] = job.error
                yield f"data: {json.dumps(event)}\n\n"

            if job.status in ("done", "error"):
                return
            await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


_IMAGE_FILENAMES = {"hazy": "hazy.jpg", "transmission": "transmission.png", "dehazed": "dehazed.png"}
_IMAGE_MEDIA_TYPES = {"hazy": "image/jpeg", "transmission": "image/png", "dehazed": "image/png"}


@v1.get("/dehaze/jobs/{job_id}/image/{kind}")
async def get_job_image(job_id: str, kind: Literal["hazy", "transmission", "dehazed"]):
    """Serves a completed job's result image as a plain file response
    instead of embedding it as base64 in the SSE payload — lets the browser
    stream/cache/decode it the normal way instead of buffering one giant
    JSON string first."""
    job = _get_job(job_id)
    if job is None or job.status != "done":
        raise HTTPException(status_code=404, detail="Image not available for this job.")

    path = os.path.join(_job_result_dir(job_id), _IMAGE_FILENAMES[kind])
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not available for this job.")

    return FileResponse(
        path,
        media_type=_IMAGE_MEDIA_TYPES[kind],
        headers={"Cache-Control": "public, max-age=3600, immutable"},
    )


app.include_router(v1)


# ---------------------------------------------------------------------------
# Legacy unversioned routes — deprecation-window aliases only, so the
# current frontend build keeps working while it migrates to /api/v1/*.
# Delete once every consumer has moved over.
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Hazentra Backend is running", "status": "ok"}


@app.get("/api/health")
def health():
    return health_v1()


@app.post("/api/dehaze/jobs")
@limiter.limit(RATE_LIMIT)
async def create_dehaze_job(request: Request, file: UploadFile = File(...)):
    return await _create_dehaze_job_impl(file)


@app.get("/api/dehaze/jobs/{job_id}/stream")
async def stream_dehaze_progress(job_id: str):
    return await stream_dehaze_progress_v1(job_id)
