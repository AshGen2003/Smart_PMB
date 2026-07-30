# ── Build Stage ──
FROM python:3.13-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies required by psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-warn-script-location -r requirements.txt

# ── Runtime Stage ──
FROM python:3.13-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/home/appuser/.local/bin:$PATH \
    DJANGO_SETTINGS_MODULE=smart_pmb.settings

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /home/appuser -s /bin/bash appuser && \
    mkdir -p /home/appuser/.local && chown -R appuser:appgroup /home/appuser

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local

WORKDIR /app

# Copy application code
COPY --chown=appuser:appgroup . .

# Collect static files
RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["gunicorn", "smart_pmb.wsgi:application", "-c", "gunicorn.conf.py"]
