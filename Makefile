.DEFAULT_GOAL := help
.PHONY: help install dev lint format test test-unit test-property test-contract \
        docker-up docker-down docker-build seed-db clean migrate migration \
        tf-init tf-plan tf-apply tf-destroy frontend-install frontend-build

# ─────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────

install:  ## Install all dependencies (runtime + dev)
	uv sync

install-prod:  ## Install runtime dependencies only
	uv sync --no-dev

lock:  ## Regenerate uv.lock from pyproject.toml
	uv lock

# ─────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────

dev:  ## Start development server with auto-reload
	uv run uvicorn app.main:app --reload --port 8000

worker:  ## Start Celery worker
	uv run celery -A app.core.celery_app worker --loglevel=INFO --concurrency=2 -Q default

# ─────────────────────────────────────────────────────────────
# Database migrations (Alembic)
# ─────────────────────────────────────────────────────────────

migrate:  ## Apply all pending migrations (alembic upgrade head)
	uv run alembic upgrade head

migration:  ## Autogenerate a migration: make migration m="add books table"
	uv run alembic revision --autogenerate -m "$(m)"

# ─────────────────────────────────────────────────────────────
# Code quality
# ─────────────────────────────────────────────────────────────

lint:  ## Run ruff linter and mypy type checker
	uv run ruff check app/ tests/ || true
	uv run mypy app/ --ignore-missing-imports || true

format:  ## Auto-format code with ruff
	uv run ruff format app/ tests/
	uv run ruff check --fix app/ tests/

# ─────────────────────────────────────────────────────────────
# Testing
# ─────────────────────────────────────────────────────────────

test:  ## Run unit + property + smoke tests (no DB required)
	uv run pytest tests/unit/ tests/properties/ tests/test_startup_smoke.py \
		-v --tb=short -q

test-unit:  ## Run unit tests only
	uv run pytest tests/unit/ -v --tb=short

test-property:  ## Run Hypothesis property tests
	uv run pytest tests/properties/ -v --tb=short

test-smoke:  ## Run startup smoke tests
	uv run pytest tests/test_startup_smoke.py tests/test_health.py -v --tb=short

test-contract:  ## Run contract tests (requires local PostgreSQL + Redis)
	uv run pytest tests/test_health.py tests/contract/ \
		-m "contract and not mutation" \
		-v --tb=short -q \
		--co -q 2>/dev/null | head -20 || true
	uv run pytest tests/test_health.py tests/contract/ \
		-m "contract and not mutation" \
		-v --tb=short -q

test-all:  ## Run all tests including contract
	uv run pytest tests/ -m "not mutation" -v --tb=short -q

coverage:  ## Run tests with coverage report
	uv run pytest tests/unit/ tests/properties/ tests/test_startup_smoke.py \
		--cov=app --cov-report=html --cov-report=term-missing

# ─────────────────────────────────────────────────────────────
# Docker
# ─────────────────────────────────────────────────────────────

docker-up:  ## Start all services (API, worker, PostgreSQL, Redis)
	docker compose up -d

docker-down:  ## Stop all services
	docker compose down

docker-build:  ## Build Docker images
	docker compose build

docker-logs:  ## Follow logs from all services
	docker compose logs -f

docker-shell:  ## Open a shell in the running API container
	docker compose exec api bash

# ─────────────────────────────────────────────────────────────
# Terraform (AWS infrastructure — see terraform/README.md)
# ─────────────────────────────────────────────────────────────

tf-init:  ## terraform init in terraform/
	terraform -chdir=terraform init

tf-plan:  ## terraform plan
	terraform -chdir=terraform plan

tf-apply:  ## terraform apply
	terraform -chdir=terraform apply

tf-destroy:  ## terraform destroy (set rds_deletion_protection=false first)
	terraform -chdir=terraform destroy

# ─────────────────────────────────────────────────────────────
# Frontend (Next.js static export → S3/CloudFront)
# ─────────────────────────────────────────────────────────────

frontend-install:  ## Install frontend dependencies
	cd frontend && npm ci

frontend-build:  ## Build the static export into frontend/out
	cd frontend && npm run build

# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────

clean:  ## Remove Python cache files and test artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache .coverage htmlcov .mypy_cache .ruff_cache

health:  ## Check app health endpoint
	curl -s http://localhost:8000/api/health | python3 -m json.tool

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
