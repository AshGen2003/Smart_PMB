"""Gunicorn production configuration for SMART PMB."""
import multiprocessing
import os

# ── Server Socket ──
bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:8000")
backlog = 2048

# ── Worker Process ──
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "uvloop")
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
worker_connections = 1000
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5

# ── Worker Resilience ──
max_requests = int(os.environ.get("GUNICORN_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.environ.get("GUNICORN_JITTER", "50"))

# ── Logging (structured JSON to stdout) ──
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# ── Process Name ──
proc_name = "smart_pmb"
pidfile = None

# ── Preload app for faster worker spawns ──
preload_app = True

# ── Security ──
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# ── Server Hooks ──
def on_starting(server):
    """Log startup."""
    server.log.info("SMART PMB Gunicorn starting")

def on_exit(server):
    """Log shutdown."""
    server.log.info("SMART PMB Gunicorn shutting down")
