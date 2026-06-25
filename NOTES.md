# Teaching Notes

## Learner Profile
- Principal software engineer, applying for lead/architect Python role
- Interview is tomorrow — extreme time pressure
- Project was vibe-coded with AI; needs to own it as architect
- Intermediate FastAPI/Python (not beginner, but not deep expert)
- Goal: speak as the architect who designed it, not the developer who built it

## Session 1 (2026-06-24) — Topics Covered
- System architecture overview (4-layer pattern, request flow, technology choices)
- Concurrency and row locking (SELECT FOR UPDATE, IntegrityError defense-in-depth)
- Interview flashcards — 15 Q&A pairs covering all likely interview topics
- Architecture cheat sheet (printable reference)

## Key emphasis for this learner
- Focus on WHY decisions were made, not what the code does
- The concurrency fix (SELECT FOR UPDATE) is the strongest architectural story to tell
- Must be ready for "what would you do differently?" — have a thoughtful answer
- Must own the HS256 vs RS256 distinction for a senior interview

## If there is a second session
- Observability deep dive: correlation IDs, structured logging, Prometheus
- Terraform module walkthrough
- Hypothesis property testing patterns
- Mock interview simulation
