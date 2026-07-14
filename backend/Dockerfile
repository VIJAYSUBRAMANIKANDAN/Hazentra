FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY app ./app
COPY weights ./weights

RUN chown -R appuser:appuser /app

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    MODEL_CHECKPOINT_PATH=weights/nas_dehazing_final_model.pth \
    BENCHMARK_REPORT_PATH=weights/bulk_evaluation_report.json \
    ALLOWED_ORIGINS=http://localhost:3000 \
    LOG_FORMAT=json

USER appuser

EXPOSE 8000

# start-period is generous because loading the checkpoint (plus the new
# startup warm-up forward pass) takes real time — without it an orchestrator
# can kill the container before the model finishes loading.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
