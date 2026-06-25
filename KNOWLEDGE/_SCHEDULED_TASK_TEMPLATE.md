# Scheduled task template — monthly health check

This is the one-pager for the recurring health check that audits every active knowledge base on the 1st of each month. You set it up once per workspace.

## What it does

Once a month the task walks every folder inside `KNOWLEDGE/` that contains a `CLAUDE.md` file and runs the `knowledge-base-health-check-skill` against it. Each knowledge base gets its own sub-agent so token use stays predictable as your system grows. Most months it's a delta audit; the 1st of January, April, July, and October fires a full audit.

Each run auto-fixes routine drift (writing-rules violations, broken backlinks, em-dash bullet patterns, orphan RAW registration, emerging→established promotions, contradiction cross-references), auto-drafts up to three suggested new articles where there's enough evidence, and logs everything to each knowledge base's `CHANGELOG.md`. Anything that needs your judgement gets flagged for follow-up.

## How to set it up

The full setup — the exact prompt, the cron expression, the task ID, the description — lives inside the skill itself, in the section called **Setting up the monthly scheduled task** at the bottom of the SKILL.md inside `knowledge-base-health-check-skill.skill`.

Easiest path: install the skill, then say to Claude:

> "Set up the knowledge base monthly health check."

Claude will read the skill's setup section and pass the values to Cowork's built-in `schedule` skill for you.

Manual path: open the skill, copy the values from the setup section, and paste them into Cowork's `schedule` skill yourself. The cron is `0 9 1 * *` (9am on the 1st of every month) — change the hour if you'd rather it run at a different time.

## After setup

Manage the task from the Scheduled section in the Cowork sidebar. Every new knowledge base you create later is picked up automatically by the existing task — no edits needed.
