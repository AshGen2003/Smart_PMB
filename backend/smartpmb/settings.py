"""
Django settings for the Smart PMB — Logistics Module backend.

Database strategy
-----------------
The project is designed to run on **Supabase Postgres**. Set the
``DATABASE_URL`` environment variable to your Supabase connection string
(see ``.env.example``). If ``DATABASE_URL`` is empty, Django transparently
falls back to a local SQLite database so you can develop and test the API
without a Supabase project.

The logistics tables (vehicle, driver, route, delivery, fuel_record,
maintenance_record, gps_tracking) are *managed* by Django migrations and will
be created inside your Supabase database.

Cross-module references (warehouse, purchase_intake, pmb_officer) are modelled
as *unmanaged* models with ``db_constraint=False`` foreign keys, so the
logistics module stays decoupled from the other Smart PMB modules that own
those tables. They simply point at the tables that already exist in the shared
Supabase schema.
"""
import os
import sys
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-me-to-a-long-random-string")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django_filters",
    "logistics",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "smartpmb.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "smartpmb.wsgi.application"
ASGI_APPLICATION = "smartpmb.asgi.application"

# --- Database -------------------------------------------------------------
# Production database: Supabase Postgres. Set DATABASE_URL to your Supabase
# connection string (Supabase dashboard -> Project Settings -> Database ->
# Connection string -> URI), e.g.:
#   postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres?sslmode=require
# The URI already carries ?sslmode=require, so Django connects over SSL.
#
# Local development fallback: if DATABASE_URL is empty (or still the
# CHANGE_THIS_DB_PASSWORD placeholder), Django uses a local SQLite file so the
# project runs without Supabase credentials — useful when you are a
# contributor who does not have the project owner's database password.
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL and "CHANGE_THIS" not in DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
    print(
        "WARNING: DATABASE_URL not set (or still placeholder) — using local "
        "SQLite (db.sqlite3) for development only.",
        file=sys.stderr,
    )

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Colombo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework ------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%S",
}

# --- CORS -----------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
