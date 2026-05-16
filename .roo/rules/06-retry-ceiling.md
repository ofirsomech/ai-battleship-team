# Retry Ceiling

## For each builder ↔ reviewer loop

Maximum **2 REJECT cycles** before escalating.

### Cycle counter
- Cycle 0 — first attempt.
- Cycle 1 — first REJECT → builder re-spawned with reviewer feedback.
- Cycle 2 — second REJECT → builder re-spawned **with sharper guidance** and the previous attempt's diff in the briefing.
- Cycle 3 — third REJECT → **halt with `ESCALATION_REQUIRED`** and the full feedback chain.

## ESCALATION_REQUIRED format

```
ESCALATION_REQUIRED: <phase> stalled after 2 rejections.

Builder: <builder-slug>
Branch: <branch>
Reviewer: <reviewer-slug>

Attempt 1 feedback:
<verbatim feedback>

Attempt 2 feedback:
<verbatim feedback>

Suggested options:
- Amend the contract via architect-reviewer on feature/contract-amend-*
- Relax the AC in docs/game_spec.md (requires user approval)
- Provide a hint to the builder

Please advise.
```

After the user responds, log a `resume` row in `docs/orchestration_log.md` and re-spawn accordingly.

## What never counts toward the ceiling

- A `qa-impl` Playwright test failure — that's **always** the code being wrong, route to the responsible builder (Phase 5 Bug Squasher), don't penalize QA.
- A `requirements-reviewer` REJECT — same, route to the responsible builder.
