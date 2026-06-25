# AI Tooling

This repo is configured for multiple AI coding assistants. This page documents the **Skills** and **MCP servers** layered on top of the instruction files.

## Instruction files (already present)

| File | Tool |
|------|------|
| `CLAUDE.md` | Claude Code |
| `AGENTS.md` | Codex CLI, OpenCode |
| `GEMINI.md` | Gemini CLI / Antigravity |
| `.cursor/rules/*.mdc` | Cursor |
| `.claude/agents/*.md` | Claude Code subagents |
| `opencode.json`, `.codex/config.toml`, `.claude/settings.json` | tool configs |

## Claude Code Skills

Model-invoked procedures in `.claude/skills/<name>/SKILL.md`. Claude auto-invokes them when a task matches the `description`; you can also trigger one explicitly with `/<name>`.

| Skill | When it fires | Purpose |
|-------|---------------|---------|
| `efficient-context` | start of any task / exploration | **Token reduction** — cheapest path to an answer; consult docs first, locate before reading, delegate fan-out to the Explore subagent, use MCP instead of guessing |
| `add-api-module` | adding a new REST domain module | exact scaffold + layer contract (mirrors `app/api/v1/books/`) |
| `run-tests` | running/debugging tests | exact command per tier + which need a DB |
| `pre-pr-checks` | before commit/PR | lint + type + test gate and checklist |

### Why these save tokens
`efficient-context` is the headline: it steers the assistant to use the structured knowledge already in `CLAUDE.md`/`docs/` and targeted `Grep`/`Read(offset,limit)` instead of reading whole files or re-discovering structure each turn, and to hand large searches to a subagent so file dumps stay out of the main context window. The other three replace "re-derive the procedure" with a short, fixed recipe.

## MCP servers

Defined in `.mcp.json` (Claude Code), `opencode.json` → `mcp` (OpenCode), and `.codex/config.toml` → `[mcp_servers.*]` (Codex).

| Server | Command | What it gives you |
|--------|---------|-------------------|
| `postgres` | `npx -y @modelcontextprotocol/server-postgres` | Inspect tables, columns, indexes, and sample rows directly. **Read-only** — safe for dev exploration. |
| `context7` | `npx -y @upstash/context7-mcp` | Up-to-date docs for FastAPI / SQLAlchemy / Alembic / Celery / Pydantic on demand — reduces guessing and token spend |
| `fetch` | `uvx mcp-server-fetch` | Fetch a specific URL / web doc |
| `github` | `npx -y @modelcontextprotocol/server-github` | Query PRs, issues, CI run logs, and file contents from GitHub |

### Setup
```bash
# PostgreSQL MCP — point it at your dev DB
export POSTGRES_MCP_URL="postgresql+psycopg://library:library@localhost:5432/library"

# Context7 — optional API key for higher rate limits (recommended; free tier throttles in active sessions)
export CONTEXT7_API_KEY="..."

# GitHub MCP — personal access token with repo(read) + actions:read scopes
export GITHUB_PERSONAL_ACCESS_TOKEN="github_pat_..."
```
- `npx` requires Node.js; `uvx` ships with `uv` (already used by this project).
- No secrets are committed — all keys are read from environment variables at runtime.
- Add `CONTEXT7_API_KEY` and `GITHUB_PERSONAL_ACCESS_TOKEN` to your `.env` (already in `.env.template`).
- The postgres server is read-only by design — use migrations (Alembic) for any schema or data changes.

### Verify (Claude Code)
```
/mcp        # lists connected MCP servers and their tools
```

## PostToolUse Lint Hook

Add this to `.claude/settings.json` to get automatic ruff feedback after every file edit:

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "uv run ruff check app/ tests/ --quiet 2>&1 | head -30" }]
    }
  ]
}
```

## Cross-tool summary

| Capability | Claude Code | Cursor | OpenCode | Codex | Gemini/Antigravity |
|-----------|-------------|--------|----------|-------|--------------------|
| Project rules | `CLAUDE.md` | `.cursor/rules/` (6 files) | `AGENTS.md` | `AGENTS.md` | `GEMINI.md` |
| Subagents | `.claude/agents/` (5) | — | — | — | — |
| Skills | `.claude/skills/` (5) | — | — | — | — |
| MCP | `.mcp.json` (4 servers) | (native) | `opencode.json` | `.codex/config.toml` | (native) |
