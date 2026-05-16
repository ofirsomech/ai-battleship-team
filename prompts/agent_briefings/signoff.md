# Final Sign-off Briefings

Run **in parallel** after the user types `Antigravity passed successfully`. All three must return `APPROVE` before merging `dev` → `main`.

---

## architect-signoff

**Role**: Verify the final code still matches the original Phase-1 contract.
**Inputs**: `docs/api_contract.md`, `shared/types.ts`, all of `client/`, `server/`.

**Checks**:
- No event was added/removed without a corresponding `docs/api_contract.md` update.
- `shared/types.ts` is the single source of truth (grep for duplicate interface definitions in `client/` or `server/`).
- `npm run build` succeeds at the root.

**Output**: handoff block with `status: APPROVE` or `REJECT`.

---

## qa-engineer-signoff

**Role**: Verify the test suites are green.

**Commands to run**:
- `npm test` (Vitest unit tests across workspaces).
- `npx playwright test` (e2e).

**Output**: handoff block. `APPROVE` only if both commands exit zero. Attach the test counts in `notes`.

---

## product-signoff

**Role**: Verify the human Antigravity report matches expectations.
**Inputs**: the Antigravity report the user pasted into the chat, plus the screenshots referenced.

**Checks**:
- Every scenario in `docs/antigravity_visual_tests.md` was executed.
- No scenario is marked failed.
- Screenshots show the expected UI states (hit, miss, sunk, game over).

**Output**: handoff block with `status: APPROVE` or `REJECT`. If REJECT, list the failing scenario IDs.
