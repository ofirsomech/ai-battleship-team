# Reviewer Briefings

Reviewers run **read-only** (their `.roomodes` group is `["read", "command"]` — no `edit`). They check out the builder's branch, audit, and return `APPROVE` or `REJECT` in the handoff block.

A `REJECT` must list **specific** issues with file:line references. A vague rejection should itself be rejected by the Orchestrator and re-prompted.

---

## db-reviewer

**Checks**:
- All exported functions in `server/src/domain/*` have a Vitest test.
- No imports from `express`, `socket.io`, or `react`.
- Types match `shared/types.ts` exactly (run `tsc --noEmit` and report errors).
- Edge cases covered: out-of-bounds placement, overlapping ships, shooting outside grid, shooting same cell twice.

**Output**: handoff block with `status: APPROVE` or `REJECT`.

---

## server-reviewer

**Checks**:
- Every event in `docs/api_contract.md` has a handler.
- Handlers delegate to `domain/` — no business logic inline.
- Disconnect handling implements the 30 s grace window from `docs/game_spec.md` §8.
- CORS allows `http://localhost:5173`.
- No `any` types on Socket.IO generics.

**Output**: handoff block.

---

## client-reviewer

**Checks**:
- All 13 AC items are reachable in the UI.
- Components render without console errors or warnings.
- Socket events: every emit has a matching listener; cleanup on unmount.
- Coordinates render as `a–j` × `1–10`.
- Tailwind classes used, not inline styles.

**Output**: handoff block.

---

## architect-reviewer (audit mode, post-build)

**Checks**:
- The current `dev` branch still implements every event documented in `docs/api_contract.md` (no silent drift).
- No builder added new fields to `shared/types.ts` outside the original contract. If yes, REJECT and require an Architect amendment via a new `feature/contract-amend-*` branch.

**Output**: handoff block.

---

## requirements-reviewer

**Run point**: after all three build loops merge to `dev`, before QA starts.
**Checks**: each AC item from `docs/game_spec.md` §10.

**Output**: handoff block with `status: AC_COV` (all 13 ACs verified) or `REJECT` (list which ACs fail with reproduction steps).
