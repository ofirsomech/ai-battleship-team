# Orchestration Log

The Orchestrator MUST append one row to `docs/orchestration_log.md` after every action.

## Header (initialized in Phase 0)

```markdown
# Orchestration Log

| Timestamp (ISO 8601) | Phase | Agent | Branch | Action | Result |
|---|---|---|---|---|---|
```

## Row format

```markdown
| 2026-05-16T14:23:00Z | Phase 2A | db-dev | feature/db-domain | spawn | COMPLETED |
| 2026-05-16T14:31:00Z | Phase 2A | db-reviewer | feature/db-domain | review | APPROVE |
| 2026-05-16T14:32:00Z | Phase 2A | orchestrator | feature/db-domain → dev | merge | OK |
```

## What counts as an "action"

- `spawn` — `new_task` issued to a sub-agent.
- `review` — reviewer returned APPROVE/REJECT/AC_COV.
- `merge` — feature branch merged into `dev` (or `dev` into `main`).
- `halt` — pipeline paused for human input.
- `resume` — human responded; pipeline continued.
- `escalate` — retry ceiling hit; awaiting human.
- `fix` — Bug Squasher branch opened.

## Why this matters

This file is the **single artifact** that proves to the grader your pipeline ran. Curate it: clean rows, no debug noise.
