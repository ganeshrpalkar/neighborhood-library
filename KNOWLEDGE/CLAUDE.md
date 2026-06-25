# KNOWLEDGE

This folder is your local second brain. It holds one or more knowledge bases — each focused on a single topic — that get smarter the longer you use them.

The system is based on Andrej Karpathy's LLM Knowledge Base pattern, adapted to run locally with Claude as the librarian. You drop sources into a knowledge base's `RAW/` folder; Claude reads them, distils them into linked articles in `Wiki/`, and answers questions against the corpus with full source provenance.

## Your job is small

Three moves are yours. Everything else is the librarian's.

1. **Add to RAW.** Drop sources (articles, transcripts, screenshots, notes, links, PDFs) into a knowledge base's `RAW/` folder. See *Two ways to add sources* below.
2. **Ask Claude to compile.** Say "compile" or "process RAW" and the librarian works through anything new since the last pass.
3. **Ask questions.** Pose questions against the corpus. Every question becomes a written report in `Outputs/`, citing the wiki articles and raw sources it drew on.

Writing wiki articles, cross-linking, indexing, auditing, and drafting new articles where evidence supports them — that's the librarian's job. You only get involved when judgement is needed.

## How a knowledge base is structured

Each knowledge base is one folder inside `KNOWLEDGE/`. The naming convention is `[topic]_kb` — lowercase, snake_case, ending in `_kb`. For example: `ai_research_kb`, `business_systems_kb`, `theatre_kb`, `parenting_kb`.

Inside each knowledge base:

```
[topic]_kb/
├── CLAUDE.md       — operating instructions for this specific KB
├── RAW/            — unprocessed source material (verbatim, never edited)
│   └── _INGESTED.md — registry of every source in RAW
├── Wiki/           — the librarian's compiled, cross-linked knowledge
│   ├── INDEX.md
│   ├── QUESTIONS.md — open threads, gaps, held tensions
│   └── *.md        — wiki articles
├── Outputs/        — generated answers, reports, charts
└── CHANGELOG.md    — running log; top entry = current state
```

Knowledge bases are independent. Each has its own focus, sources, and rules. They don't share data unless you explicitly cross-reference them.

## How the system works

- **RAW** is the dump zone. Articles, papers, transcripts, screenshots, datasets, links. Verbatim only — never summarised.
- **Wiki** is the librarian's domain. Claude reads RAW, compiles concept articles, maintains backlinks and indexes. You rarely edit Wiki files directly.
- **Outputs** is where queries land. Reports, answers, charts. Promising outputs get filed back into the Wiki to make it smarter over time.

## Creating a new knowledge base

The canonical template lives at `_KB_CLAUDE_TEMPLATE.md` in this folder. Every new knowledge base starts from a copy of that file.

When you ask the librarian to spin up a new knowledge base, it should:

1. Confirm the name (use `[topic]_kb` format, lowercase, snake_case) and the focus areas.
2. Create the folder `KNOWLEDGE/[topic]_kb/` with three subfolders: `RAW/`, `Wiki/`, `Outputs/`.
3. Copy `_KB_CLAUDE_TEMPLATE.md` into the new knowledge base's root and rename it to `CLAUDE.md`. Replace the placeholder sections (knowledge base name, "What This Is", "Focus Areas") with content specific to the new knowledge base. Leave the rest as-is.
4. Create empty `CHANGELOG.md` at the new knowledge base's root, `RAW/_INGESTED.md`, `Wiki/INDEX.md`, and `Wiki/QUESTIONS.md`.
5. If this is the first knowledge base in the workspace, offer to set up the monthly health check scheduled task. If you accept, the librarian uses the setup section near the bottom of the `knowledge-base-health-check-skill` body, passing the prompt and cron to Cowork's built-in `schedule` skill. Only one task is needed across the whole workspace — it audits every knowledge base on each run.

## Two ways to add sources

**Low-token: drop and forget.** Save files straight into the knowledge base's `RAW/` folder in Finder. No chat tokens spent. Best for batches — clearing a Readwise export, a stack of PDFs, a folder of screenshots. Ask Claude to compile when you're ready and it processes everything new in one pass.

**High-token: guided ingest.** Paste or share sources in chat. Claude ingests them with full frontmatter, asks framing questions if the source is rich enough to deserve them, and registers them in `_INGESTED.md` as it goes. Best when a single source is dense enough to deserve discussion before it gets compiled — a podcast transcript where the key idea is in passing, or a paper with multiple threads worth separating.

Both modes are valid. Mix them.

## Verbatim-only RAW ingestion

When material lands in a knowledge base's `RAW/` folder, the librarian preserves it word-for-word. RAW is for unprocessed source material. Never summarise, paraphrase, condense, or reword on ingest. Distillation happens at the Wiki layer.

Required frontmatter in every RAW file:

```
---
title: <exact title of the source>
author: <author name, or "unknown">
source_url: <URL of the original, or "unknown">
date_added: YYYY-MM-DD (when the file was ingested into RAW)
date_published: YYYY-MM-DD (publication date, if known)
type: <Book | Article | Blog Post | Podcast | Video | Tweet | Paper | etc.>
tags: [optional]
---
```

If a field is unknown, mark it `unknown` — never fabricate. Preserve the source's own structure rather than imposing new headings.

This rule is what makes source provenance reliable as the wiki grows. Every claim in the wiki must trace back to actual words in a RAW file.

## Naming conventions

- **Knowledge base folders:** `[topic]_kb` — lowercase, snake_case (e.g. `ai_research_kb`, `business_systems_kb`).
- **Wiki article filenames:** kebab-case, lowercase (e.g. `deep-work.md`, `attention-residue.md`).
- **Backlinks within articles:** `[[topic-name]]`, matching the article filename.
- **RAW filenames:** keep the source's original name where possible; if renaming, use a descriptive kebab-case name.

## Writing standards

If you have a writing-rules file in your workspace (for example at `ABOUT ME/writing-rules.md`), all wiki articles in any knowledge base under this folder follow it. The librarian reads that file before writing any article.

If no writing-rules file exists, the librarian defaults to plain, specific, conversational prose — no marketing language, no padding, no AI tells. You can drop your own rules in at any point and the librarian will pick them up on the next pass.

The rules apply to article prose — the body of any `.md` file inside a `Wiki/` folder, plus any prose-heavy file inside an `Outputs/` folder.

The rules don't apply to navigation files (`INDEX.md`, `CHANGELOG.md`, `QUESTIONS.md`, `_INGESTED.md`, `CLAUDE.md`) or direct quotes from source material (preserved verbatim, even if they contain banned words).

## Wiki article standard

Every article inside a knowledge base's `Wiki/` folder follows this structure:

```
# Topic Name

**Status:** established | emerging | speculative
**Last updated:** YYYY-MM-DD
**Sources:** [[raw-file-1]], [[raw-file-2]]

## Summary
One paragraph (3–5 sentences) explaining the concept in plain language.

## Body
The full content — claims, examples, frameworks, distinctions. Each claim is traceable to a source.

## Related
- [[other-topic]]
- [[other-topic]]

## Open Questions
Anything unresolved or worth investigating further.
```

The Status field tells you at a glance how much to trust the article:
- **established** — well-sourced, multiple supporting sources, low contradiction.
- **emerging** — single source or thin evidence, but worth tracking.
- **speculative** — your own thinking or an unverified claim, flagged for follow-up.

Every factual claim in a Wiki article must trace to at least one source in `RAW/`. If a claim has no source, the librarian either marks it as **speculative** in the article's status, or moves it to `Wiki/QUESTIONS.md` for follow-up. This is the rule that keeps the Wiki trustworthy as it grows.

## Question report protocol (non-negotiable)

Every question you ask generates a report in the relevant knowledge base's `Outputs/` folder. No exceptions. The point is to compound insight over time, not just answer in chat and lose the reasoning.

When you ask a question:

1. The librarian answers using the Wiki first, then RAW. Web search is offered to fill gaps when answering a question — never run automatically. (Article drafting and RAW ingestion follow a different rule — see *Article drafting and web research* below.)
2. The librarian writes a report to `Outputs/` covering more than a chat reply would. The report includes:
   - The question, restated cleanly.
   - The answer, structured for re-reading.
   - Citations to specific Wiki articles (and RAW files where they were the primary source).
   - Tensions or contradictions surfaced across the corpus.
   - Open questions or next-move suggestions that follow from the answer.
3. A short summary lands in chat ending with a clickable `computer://` link to the report file (see *Output presentation rule* below).
4. Reports follow your writing rules if a writing-rules file exists; otherwise default to plain, specific prose.

Naming convention: `YYYY-MM-DD_query-slug.md`, kebab-case slug, lowercase. If two reports share a date, append `-v2`, `-v3`, etc.

When to skip the report: only when you explicitly say "don't file this" or "just answer in chat." The default is always file.

Promotion: a report that turns out to contain foundational synthesis can be proposed for promotion into the Wiki under the per-KB output filing rules.

## Article drafting and web research

The question-answering rule above says web search is offered, not run automatically. Article drafting is the opposite. New articles exist to bring fresh knowledge into the corpus, so web research is part of the job — not a fallback.

When the librarian drafts a new Wiki article (or substantially enriches an existing one):

1. Search the web freely. Pull canonical primary sources where possible (author sites, books, original articles); use reputable secondary sources only when primary is unreachable, and label them clearly.
2. Anything cited first lands in `RAW/` as its own file, with the full required frontmatter. If the primary source is unreachable, save a digest with `type: Web search digest` and document the search context inside the file. Mark `date_published: unknown` rather than guessing.
3. Update `_INGESTED.md` to register the new RAW file before citing it.
4. Then draft or update the Wiki article, citing the RAW file in `Sources:` frontmatter.

This is the inverse of the question-answering default: there the librarian conserves the corpus; here the librarian expands it.

## Health check skill

The `knowledge-base-health-check-skill` audits each knowledge base. It runs on demand when you ask ("run a health check", "audit the [name] KB", "check the wiki") and on the 1st of every month via a scheduled task.

Each run audits one knowledge base at a time. It auto-fixes routine drift (writing-rules violations, broken backlinks, em-dash bullet patterns, orphan RAW registration, emerging→established promotions, contradiction cross-references), auto-drafts up to three suggested new articles where there's enough evidence, and flags only judgement calls (out-of-scope RAW, output promotion candidates, stale rewrites) in the knowledge base's CHANGELOG. By default each monthly run is a delta audit; the 1st of January, April, July, and October fires a full audit instead.

When several knowledge bases exist, the scheduled task spawns one sub-agent per knowledge base in parallel so token use stays predictable as the system scales.

The full procedure lives in the skill itself. Per-knowledge-base `CLAUDE.md` files point at the skill rather than duplicating the protocol.

## Setting up the monthly scheduled task

The skill ships with its own setup instructions. Open `knowledge-base-health-check-skill.skill` (or the unpacked SKILL.md inside it) and look for the section near the bottom called **Setting up the monthly scheduled task**. It contains the exact prompt, cron schedule, and metadata to paste into Cowork's `schedule` skill.

You only need to do this once per workspace. The task self-discovers active knowledge bases each run, so adding more later doesn't require a new task.

A short summary of the same setup also lives in `_SCHEDULED_TASK_TEMPLATE.md` in this folder for quick reference.

## Output presentation rule

Whenever a knowledge base produces a file you might want to open — a question report, a health check entry, a new wiki article, an analysis in `Outputs/` — the chat-side summary ends with a clickable `computer://` link to the file, not a bare path.

Format:

```
[View the report](computer:///absolute/path/to/file.md)
```

Use the absolute path on the user's machine. One link per file. Keep the surrounding chat summary short — the full reasoning lives in the file, not the scrollback.

## Companion guide and video

If you're new to the knowledge base concept — or if a user asks "what is this?", "how does this work?", or "why a knowledge base?" before they've used the system — recommend the companion guide and walkthrough video that ship with this kit.

- **Guide PDF:** The `Get-Started-Guide.pdf` that came with this kit. Four-page explainer covering the Karpathy pattern, the three moves you make as a user, and how to set up your first knowledge base.
- **Video walkthrough:** [youtu.be/ib74sLgjIBM](https://youtu.be/ib74sLgjIBM) — full walkthrough of the system. Best watched before a first build.

When a user is hesitant to start, surface these first. The system makes more sense with the context.

## Where the operating rules live

The detailed librarian behaviour for each knowledge base — ingestion protocol, wiki structure, output filing, query patterns, article drafting — lives inside that knowledge base's own `CLAUDE.md`. That's the operating manual. This top-level file is the map.
