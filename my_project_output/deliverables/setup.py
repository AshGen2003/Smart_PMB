#!/usr/bin/env python3
"""
SMART PMB — one-click setup & run script.

Run:  python setup.py

It will:
  1. Verify Python (>=3.10) and Node.js (>=18) are installed
  2. Create the backend virtualenv + .env, install backend dependencies
  3. Run database migrations and seed the default admin user
  4. Create frontend .env.local, install frontend dependencies, build
  5. Start the backend (port 8000) and frontend (port 3000)
  6. Open the browser and stream live logs

Optional flags:
  --no-serve     do the full setup but do not start the servers
  --no-build     skip the frontend production build (only useful for dev)
  --no-browser   do not auto-open the browser
"""
import argparse
import ctypes
import os
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

IS_WINDOWS = os.name == "nt"

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = Path(os.environ.get("PMB_VENV_DIR", str(BACKEND / ".venv"))).resolve()

if IS_WINDOWS:
    PYTHON = VENV / "Scripts" / "python.exe"
else:
    PYTHON = VENV / "bin" / "python"

NPM = shutil.which("npm") or shutil.which("npm.cmd")
NODE = shutil.which("node") or shutil.which("node.exe")

# ─── ANSI colors ───
C_RESET, C_BOLD, C_DIM = "\033[0m", "\033[1m", "\033[2m"
C_GREEN, C_YELLOW, C_CYAN, C_RED, C_BLUE = "\033[92m", "\033[93m", "\033[96m", "\033[91m", "\033[94m"

BE_COLOR = C_GREEN
FE_COLOR = C_BLUE


def enable_ansi():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    if IS_WINDOWS:
        try:
            kernel32 = ctypes.windll.kernel32
            handle = kernel32.GetStdHandle(-11)
            mode = ctypes.c_uint32()
            if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
                kernel32.SetConsoleMode(handle, mode.value | 0x0004)
        except Exception:
            pass


def say(msg, color=C_RESET, end="\n"):
    print(f"{color}{msg}{C_RESET}", end=end, flush=True)


def die(msg):
    say(f"\n  {C_BOLD}ERROR:{C_RESET} {msg}", C_RED)
    sys.exit(1)


def step(n, text):
    say(f"\n  {C_BOLD}[Step {n}]{C_RESET} {text}", C_CYAN)


def run_capture(cmd, cwd=None):
    env = dict(os.environ, PYTHONUNBUFFERED="1")
    r = subprocess.run(
        cmd, cwd=str(cwd) if cwd else None,
        capture_output=True, text=True, encoding="utf-8", errors="replace", env=env,
    )
    return r.stdout.strip(), r.returncode


def run_stream(cmd, cwd, title=None, prefix="     "):
    if title:
        say(title, C_BOLD)
    env = dict(os.environ, PYTHONUNBUFFERED="1")
    proc = subprocess.Popen(
        cmd, cwd=str(cwd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, encoding="utf-8", errors="replace", bufsize=1, env=env,
    )
    for line in proc.stdout:
        print(f"{C_DIM}{prefix}{C_RESET}{line}", end="", flush=True)
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed (exit code {proc.returncode}): {' '.join(map(str, cmd))}")


def npm_cmd(args):
    if IS_WINDOWS and NPM.endswith((".cmd", ".bat")):
        return ["cmd", "/c", NPM, *args]
    return [NPM, *args]


# ─── Step 1: prerequisites ───
def check_python():
    v = f"{sys.version_info.major}.{sys.version_info.minor}"
    if sys.version_info < (3, 10):
        die(f"Python 3.10+ is required, but this is Python {v}. Please install Python 3.10+ first.")
    say(f"  Python {v}  ({sys.executable})", C_GREEN)


def check_node():
    if not NODE:
        die("Node.js was not found. Please install Node.js 18+ from https://nodejs.org")
    out, rc = run_capture([NODE, "--version"])
    say(f"  Node.js {out}", C_GREEN)
    if not NPM:
        die("npm was not found. Please install Node.js 18+ from https://nodejs.org")
    out, rc = run_capture(npm_cmd(["--version"]))
    say(f"  npm {out}", C_GREEN)


# ─── Step 2: backend ───
def create_venv():
    if PYTHON.exists():
        say(f"  Virtualenv already exists ({VENV.name}) — reusing it.", C_YELLOW)
        return
    say("  Creating virtualenv...", C_BOLD)
    run_stream([sys.executable, "-m", "venv", str(VENV)], ROOT)
    say(f"  Virtualenv created at {VENV}", C_GREEN)


def install_backend_deps():
    run_stream(
        [str(PYTHON), "-m", "pip", "install", "-r", "requirements.txt"],
        BACKEND, title="  Installing backend dependencies (pip install -r requirements.txt)...",
    )
    say("  Backend dependencies installed.", C_GREEN)


def create_backend_env():
    env_file = BACKEND / ".env"
    if env_file.exists():
        txt = env_file.read_text(encoding="utf-8")
        if "DATABASE_URL=" in txt and "sqlite" not in txt.lower():
            say(
                "  NOTE: backend/.env sets DATABASE_URL (PostgreSQL). If you do not have "
                "PostgreSQL running, remove that line so SQLite is used instead.", C_YELLOW,
            )
        say("  backend/.env already exists — leaving it as is.", C_YELLOW)
        return
    example = BACKEND / ".env.example"
    if not example.exists():
        die("backend/.env.example is missing. Please re-copy the project folder.")
    content = example.read_text(encoding="utf-8")
    content = content.replace(
        "DJANGO_SECRET_KEY=change-me-in-prod",
        f"DJANGO_SECRET_KEY={secrets.token_urlsafe(50)}",
    )
    env_file.write_text(content, encoding="utf-8")
    say(f"  Created backend/.env with a randomly generated secret key.", C_GREEN)


def migrate_and_seed():
    run_stream([str(PYTHON), "manage.py", "migrate", "--noinput"], BACKEND,
               title="  Applying database migrations...")
    run_stream([str(PYTHON), "manage.py", "seed_demo"], BACKEND,
               title="  Seeding default admin user (admin@pmb.lk / admin123)...")
    say("  Database is ready.", C_GREEN)


# ─── Step 3: frontend ───
def create_frontend_env(backend_port):
    env_file = FRONTEND / ".env.local"
    expected = f"NEXT_PUBLIC_API_URL=http://localhost:{backend_port}/api"
    if env_file.exists():
        txt = env_file.read_text(encoding="utf-8")
        if expected in txt:
            say("  frontend/.env.local already points at the right backend — leaving it as is.", C_YELLOW)
            return
        env_file.write_text(expected + "\n", encoding="utf-8")
        say(f"  Updated frontend/.env.local to point at the backend on port {backend_port}.", C_YELLOW)
        return
    env_file.write_text(expected + "\n", encoding="utf-8")
    say(f"  Created frontend/.env.local (NEXT_PUBLIC_API_URL=http://localhost:{backend_port}/api).", C_GREEN)


def install_frontend_deps():
    if (FRONTEND / "node_modules").exists():
        say("  node_modules already exists — skipping npm install.", C_YELLOW)
        return
    run_stream(npm_cmd(["install"]), FRONTEND, title="  Installing frontend dependencies (npm install)...")
    say("  Frontend dependencies installed.", C_GREEN)


def build_frontend():
    run_stream(npm_cmd(["run", "build"]), FRONTEND, title="  Building frontend (npm run build)...")
    say("  Frontend build complete.", C_GREEN)


# ─── Step 4: run servers ───
def pick_port(preferred, tries=20):
    for port in range(preferred, preferred + tries):
        ok = True
        for family, addr in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::")):
            s = socket.socket(family, socket.SOCK_STREAM)
            try:
                if family == socket.AF_INET6:
                    s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
                s.bind((addr, port))
            except OSError:
                ok = False
            finally:
                s.close()
            if not ok:
                break
        if ok:
            return port
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
    finally:
        s.close()


def wait_until_responding(url, timeout=60, what="", proc=None):
    say(f"  Waiting for {what} at {url} ...", C_DIM)
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc is not None and proc.poll() is not None:
            return False
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except urllib.error.HTTPError:
            return True
        except Exception:
            time.sleep(1)
    return False


def pump_output(proc, name, color):
    for line in proc.stdout:
        print(f"{color}{name}{C_RESET} {C_DIM}|{C_RESET} {line}", end="", flush=True)


def start_servers(backend_port, frontend_port):
    procs = []

    def start_backend(port):
        env = dict(os.environ, PYTHONUNBUFFERED="1")
        p = subprocess.Popen(
            [str(PYTHON), "manage.py", "runserver", "--noreload", f"127.0.0.1:{port}"],
            cwd=str(BACKEND), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", bufsize=1, env=env,
        )
        procs.append(p)
        threading.Thread(target=pump_output, args=(p, "backend ", BE_COLOR), daemon=True).start()
        return p

    def start_frontend(port):
        p = subprocess.Popen(
            npm_cmd(["run", "start", "--", "-p", str(port)]),
            cwd=str(FRONTEND), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", bufsize=1,
        )
        procs.append(p)
        threading.Thread(target=pump_output, args=(p, "frontend", FE_COLOR), daemon=True).start()
        return p

    def launch(name, spawn, port, health_path):
        url = f"http://127.0.0.1:{port}"
        say(f"  Starting {name} at {url} ...", C_BOLD)
        for attempt in range(6):
            p = spawn(port)
            ok = wait_until_responding(f"{url}{health_path}", what=name, proc=p)
            if ok:
                time.sleep(3)
                if p.poll() is None:
                    say(f"  {name.capitalize()} is up at {url}", C_GREEN)
                    return url
            try:
                p.terminate()
            except Exception:
                pass
            time.sleep(1)
            port = pick_port(port + 1)
            url = f"http://127.0.0.1:{port}"
            say(f"  Port {port - 1} is busy or startup failed — retrying on port {port} ...", C_YELLOW)
        die(f"{name.capitalize()} failed to start. Scroll up for its logs.")

    backend_url = launch("backend", start_backend, backend_port, "/api/auth/me/")
    frontend_url = launch("frontend", start_frontend, frontend_port, "/login")
    return procs, backend_url, frontend_url


def show_summary(backend_url, frontend_url):
    say("\n  " + "-" * 60, C_CYAN)
    say("   SMART PMB is running!", C_BOLD + C_GREEN)
    say(f"   Backend  : {backend_url}   (Django REST API)", C_CYAN)
    say(f"   Frontend : {frontend_url}   (web app)", C_CYAN)
    say("   Login    : admin@pmb.lk  /  admin123", C_CYAN)
    say("   Press Ctrl+C in this window to stop both servers.", C_DIM)
    say("  " + "-" * 60, C_CYAN)


def banner():
    say("=" * 60, C_CYAN)
    say("   SMART PMB — Warehouse Management System", C_BOLD)
    say("   One-click setup & launch", C_DIM)
    say("=" * 60, C_CYAN)
    say(f"  Project folder : {ROOT}", C_DIM)
    say(f"  Platform       : {sys.platform} ({os.name})", C_DIM)


def main():
    parser = argparse.ArgumentParser(description="SMART PMB one-click setup & run")
    parser.add_argument("--no-serve", action="store_true", help="setup only, do not start servers")
    parser.add_argument("--no-build", action="store_true", help="skip the frontend production build")
    parser.add_argument("--no-browser", action="store_true", help="do not auto-open the browser")
    args = parser.parse_args()

    enable_ansi()
    started = time.time()
    banner()

    step(1, "Checking prerequisites")
    check_python()
    check_node()

    step(2, "Setting up backend")
    create_venv()
    install_backend_deps()
    create_backend_env()
    migrate_and_seed()

    backend_port = pick_port(8000)
    frontend_port = pick_port(3000)

    step(3, "Setting up frontend")
    create_frontend_env(backend_port)
    install_frontend_deps()
    if not args.no_build:
        build_frontend()
    else:
        say("  Skipping frontend build (--no-build).", C_YELLOW)

    say(f"\n  Setup finished in {time.time() - started:.1f}s.", C_GREEN)

    if args.no_serve:
        say("  Run 'python setup.py' again (without --no-serve) to start the servers.", C_YELLOW)
        return

    step(4, "Starting servers")
    procs, backend_url, frontend_url = start_servers(backend_port, frontend_port)

    show_summary(backend_url, frontend_url)
    if not args.no_browser:
        try:
            webbrowser.open(frontend_url)
        except Exception:
            pass

    try:
        while True:
            time.sleep(1)
            for p in procs:
                if p.poll() is not None:
                    die(f"A server exited unexpectedly (code {p.returncode}). Scroll up for its logs.")
    except KeyboardInterrupt:
        say("\n  Shutting down servers...", C_YELLOW)
        for p in procs:
            try:
                p.terminate()
            except Exception:
                pass
        time.sleep(1)
        for p in procs:
            try:
                p.kill()
            except Exception:
                pass
        say("  Done. Bye!", C_GREEN)


if __name__ == "__main__":
    main()
