# Future Enhancements

A roadmap of improvements across the whole project — backend, data model, async work,
security, testing, observability, frontend, and infrastructure. Grounded in the current
codebase, not generic advice. Each item notes **where** it lands and **why** it matters.

For database-table-level ideas (book copies, fines ledger, reservations, etc.) see
[`SCHEMA.md` → Future Schema Enhancements](./SCHEMA.md#future-schema-enhancements).
This document covers everything else and references that section where they overlap.

Legend: 🔴 high impact / foundational · 🟡 valuable · 🟢 nice-to-have.

---

## 1. Backend API & domain logic

- 🔴 **Real email/notification delivery.** `app/services/email_service.py` is a stub
  (`# TODO: implement real email sending`). Wire it to SES (already in the AWS stack) or
  SMTP, and have the overdue Celery job actually notify members. Persist sent messages
  (see SCHEMA.md notifications table).
- 🔴 **Borrowing-policy enforcement.** Today `borrow_book` only checks copy availability.
  Add max-active-loans per member, block borrowing for inactive/expired members, and
  reject borrows for members with unpaid fines over a threshold. Keep the policy in
  config (and eventually DB) per the Hard Rules.
- 🟡 **Loan renewal endpoint.** `POST /api/v1/loans/{loan_id}/renew` to extend `due_date`,
  with a renewal cap. Pairs with the `renewal_count` schema change.
- 🟡 **Reservations / holds API.** Let members queue for checked-out titles and be
  notified when a copy frees up. Needs the `reservations` table.
- 🟡 **Consistent pagination & filtering.** Ensure every list endpoint
  (`books`, `members`, `loans`) shares one pagination contract (limit/offset or cursor)
  and a documented sort/filter param set. Consider cursor pagination for large loan lists.
- 🟢 **Bulk operations.** CSV import for the initial book catalog and member roster;
  bulk return. Useful for onboarding a real library.
- 🟢 **Soft delete** for members/books (`deleted_at`) instead of hard deletes, since
  `loans` reference them historically.

## 2. Data model

See [`SCHEMA.md`](./SCHEMA.md#future-schema-enhancements) for the full list. The single
highest-leverage change is introducing a **`book_copies`** table to model physical
inventory as rows (replacing the `total/available_copies` counters), which unblocks
per-copy holds, condition tracking, and a true "one active loan per copy" constraint.

## 3. Async & background work (Celery)

- 🔴 **Schedule the existing job.** `loans.flag_overdue_loans` exists but appears
  fire-on-demand. Add Celery Beat (or an EventBridge schedule hitting the worker) to run
  it daily, plus a fine-recalculation pass.
- 🟡 **Reminder pipeline.** Tasks for "due soon" (e.g. 2 days before) and "overdue"
  reminders, gated on the notifications table to avoid duplicate sends (idempotency).
- 🟡 **Dead-letter / retry policy.** Configure task retries with backoff and a DLQ so a
  failing email provider doesn't silently drop reminders.
- 🟢 **Task observability.** Flower (or push task metrics to CloudWatch) to watch queue
  depth and failures.

## 4. Security & auth

- 🔴 **Refresh tokens / token revocation.** Currently HS256 access tokens only. Add short
  access + refresh tokens, and a Redis-backed denylist for logout/rotation (Redis is
  already a dependency).
- 🔴 **Secrets hygiene.** `.env` lives only locally now; confirm production pulls all
  secrets from AWS Secrets Manager (Terraform provisions it) and that nothing secret is
  ever committed. Document secret rotation.
- 🟡 **Granular roles/permissions.** `users.roles` is a JSON list with `require_admin` /
  `require_roles`. Define concrete roles (librarian, admin, read-only) and audit every
  route's guard. A security-reviewer pass over all routers is cheap insurance.
- 🟡 **Rate limiting coverage.** `slowapi` limiter exists (`app/core/limiter.py`); ensure
  it's actually applied to auth endpoints (login/register) to blunt brute-force, and tune
  per-route limits.
- 🟡 **Password policy + lockout.** Enforce minimum strength on register, and lock/slow
  repeated failed logins.
- 🟢 **Audit log.** Record who created/modified records (`created_by`/`updated_by`),
  linking the staff `users` table into the domain.
- 🟢 **Dependency & container scanning** in CI (pip-audit, Trivy on the image).

## 5. Performance & caching

- 🟡 **Cache invalidation strategy.** `@redis_cache_response` caches list reads; make sure
  writes (borrow/return/create/update) bust the relevant keys so staff don't see stale
  inventory. Document the key namespaces.
- 🟡 **DB connection pooling tuning** for ECS Fargate (pool size vs. task count vs. RDS
  max_connections) — easy to exhaust connections under autoscaling.
- 🟢 **Move cover images out of Postgres.** `books.cover_image` as `bytea` bloats the
  table; serve covers from S3/CloudFront (already in the stack).
- 🟢 **N+1 review.** Audit loan-list endpoints for eager-loading `book`/`member`
  relationships (`selectinload`) to avoid per-row queries.

## 6. Testing & quality

- 🔴 **Grow coverage.** ~36 test functions across unit/property/contract today. Target the
  borrow/return concurrency paths (the recent row-lock fix), fine accrual math, and auth
  guards specifically. Wire `make coverage` into CI with a threshold gate.
- 🟡 **Contract tests for every endpoint.** Ensure each route has at least one
  happy-path + one error-path (404/409/422) contract test against live Postgres+Redis.
- 🟡 **Property tests for fine calculation** and inventory invariants
  (`available_copies` never goes negative or exceeds total) via Hypothesis.
- 🟡 **Load / concurrency test** the borrow endpoint to validate the row-locking fix under
  real contention.
- 🟢 **Mutation testing** expansion (markers already exist) to find weak assertions.
- 🟢 **Frontend tests** — component/integration tests for the Next.js staff UI (none
  evident yet).

## 7. Observability & operations

- 🟡 **Structured logging → centralized store.** Logging middleware + correlation IDs
  exist; ship logs to CloudWatch Logs Insights (or similar) and confirm `SENSITIVE_KEYS`
  masking covers tokens/passwords.
- 🟡 **Metrics & tracing.** Add Prometheus/OpenTelemetry metrics (request latency, error
  rate, cache hit ratio, queue depth) and traces. The `observability/` package is a
  natural home.
- 🟡 **Health/readiness depth.** Extend `/api/v1/health` into liveness vs. readiness
  (checks DB + Redis) so ECS/ALB can route correctly during deploys.
- 🟢 **Alerting** on error-rate / overdue-job-failure via CloudWatch Alarms → SNS.
- 🟢 **Error tracking** (Sentry) for both API and frontend.

## 8. Frontend (Next.js staff UI)

- 🟡 **Member loan history & detail pages.** Surface per-member outstanding/overdue loans
  (the API already supports `/members/{id}/loans`).
- 🟡 **Reservations & overdue dashboards** once those APIs land; show fines owed.
- 🟡 **Auth UX.** Token refresh handling, idle logout, and role-aware UI (hide admin
  actions from non-admins) tied to the backend roles work.
- 🟢 **Accessibility & i18n pass** on forms and tables.
- 🟢 **Optimistic UI / toasts** for borrow/return actions; the building blocks
  (ErrorBoundary, ErrorState, modals) already exist.
- 🟢 **Reconsider the Three.js hero scene** (`HeroScene.tsx`) for a staff tool — weigh
  bundle size vs. value.

## 9. Infrastructure & CI/CD

- 🟡 **Staging environment.** A second Terraform workspace/env so deploys are validated
  before production.
- 🟡 **Migration safety in deploy.** Confirm `deploy.yml` runs Alembic as a one-off ECS
  task *before* rolling services, with a rollback story for failed migrations.
- 🟡 **Autoscaling policies** for the ECS api/worker services (CPU/queue-depth based).
- 🟢 **Cost & resource right-sizing** review of Fargate task sizes and RDS/ElastiCache
  instance classes.
- 🟢 **Backups & DR.** Verify RDS automated backups + point-in-time recovery and a tested
  restore procedure; lifecycle policies on S3.
- 🟢 **Infra tests** (terraform validate/plan in CI, tflint, checkov).

## 10. Documentation

- 🟢 **OpenAPI examples** on every endpoint and a published API reference.
- 🟢 **Runbook** for common ops (rotate secrets, run overdue job manually, restore DB).
- 🟢 **ADR log** (architecture decision records) for major decisions (book_copies
  migration, token strategy, etc.).

---

## Suggested priority order

1. **Make overdue handling real** — schedule `flag_overdue_loans` + implement email +
   persist notifications (#3, #1).
2. **Borrowing policy + auth hardening** — loan limits, refresh tokens, rate-limit auth
   routes (#1, #4).
3. **`book_copies` refactor** — the foundational data-model change (#2 / SCHEMA.md).
4. **Test coverage on concurrency, fines, and auth** + CI coverage gate (#6).
5. **Observability** — metrics, tracing, alerting, deeper health checks (#7).
6. **Frontend depth + staging environment** (#8, #9).

Every item is additive — incremental Alembic migrations and new modules following the
`books/` reference pattern, no destructive rewrites.
