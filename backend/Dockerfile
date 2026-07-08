FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY weights ./weights

ENV MODEL_CHECKPOINT_PATH=weights/nas_dehazing_final_model.pth
ENV BENCHMARK_REPORT_PATH=weights/bulk_evaluation_report.json
ENV ALLOWED_ORIGINS=http://localhost:3000

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
