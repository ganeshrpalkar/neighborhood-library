# Mission: Own This Codebase for a Principal/Architect Interview

## Why
Interview tomorrow for a lead/architect Python role. The neighborhood library API was AI-assisted (vibe coded), and the goal is to fully own every architectural decision — able to explain, defend trade-offs, and narrate the system as the engineer who designed it, not the one who executed it.

## Success looks like
- Delivers a clear 2-minute architectural narrative without prompting
- Explains every technology choice and its trade-offs (FastAPI, sync SQLAlchemy, HS256, Redis, Celery)
- Owns the concurrency story: race condition → SELECT FOR UPDATE → IntegrityError defense-in-depth
- Describes the testing pyramid and what each tier catches
- Narrates the infrastructure: ECS Fargate, Alembic migrations, Terraform, OIDC deploy
- Answers "why" questions, not just "what" questions
- Has a thoughtful answer to "what would you do differently?"

## Constraints
- Interview is tomorrow — one session only
- Intermediate FastAPI/Python familiarity (not a beginner)
- Must speak as the architect who designed it

## Out of scope
- Learning FastAPI/SQLAlchemy from scratch
- Deep Terraform module internals
- Writing new code before the interview
