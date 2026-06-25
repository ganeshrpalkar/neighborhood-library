---
date: 2026-06-24
session: 1
---

# 0001: Pre-Interview Architecture Review

## Context
First teaching session. Principal software engineer, interview tomorrow for lead/architect Python role. Codebase was vibe-coded with AI assistance; user needs to own all architectural decisions convincingly.

## Key Insights Established

### Services never import FastAPI
The hardest invariant to maintain as a project grows. The payoff: services are testable in isolation, reusable in Celery/CLI, and clearly scoped. Any drift here is an architecture smell.

### Sync SQLAlchemy over async is a deliberate choice
Not a limitation or oversight — a considered trade-off. Simpler transaction model, natural row locking. Right call when write latency is acceptable and the team prioritizes readability over concurrency throughput.

### Three-layer defense for inventory integrity
SELECT FOR UPDATE (primary) → IntegrityError handler (secondary) → DB CHECK constraint (tertiary). The ability to articulate all three layers, and WHY each exists, is what distinguishes an architect from a developer.

### HS256 vs RS256 distinction
For a single-service system: HS256 is appropriate. For multi-service: RS256 because verifiers must not hold the signing secret. This is a senior interview question and the user must be fluent on it.

### "What would you do differently?"
Events table for loan history, permissions table instead of JSON roles column, APScheduler before Celery. Having thoughtful critiques of your own work signals architectural maturity.

## Zone of Proximal Development
User understands the code. The gap is articulating the ARCHITECTURE — the "why" behind decisions. Lessons focus on that gap.

## If a second session occurs
- Observability deep dive: correlation IDs, structured logging patterns, Prometheus instrumentation
- Terraform module walkthrough (what each module owns, why it's split that way)
- Hypothesis property testing patterns (writing good strategies for domain objects)
- Mock interview simulation under time pressure
