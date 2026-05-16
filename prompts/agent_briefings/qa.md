# QA Briefings

---

## qa-planner

**Role**: Design the test plan (no test code yet).
**Inputs**: `docs/game_spec.md`, `docs/api_contract.md`, the merged `dev` branch.
**Branch**: `feature/qa-plan` off `dev`.
**Git identity**: `QA Planner AI` / `qa-planner@battleship.local`.

**Deliverable**:
- `tests/e2e/scenarios.md` — every scenario as a bulleted Given/When/Then.
- `docs/antigravity_visual_tests.md` — human-readable manual checklist for the Antigravity pass.

**DoD**: every AC in `docs/game_spec.md` §10 maps to at least one scenario in either file. Handoff block.

---

## coverage-validator

**Role**: Map ACs to test scenarios — build the traceability matrix.
**Branch**: same as qa-planner (`feature/qa-plan`).
**Git identity**: `Coverage Validator AI` / `coverage-validator@battleship.local`.

**Deliverable**: append a `## Traceability Matrix` table to `tests/e2e/scenarios.md`:

| AC# | Scenario IDs |
|----|---|
| AC-1 | S1, S2 |
| AC-2 | S2, S3 |
| ... | ... |

**DoD**: no AC has zero scenarios. Every Antigravity manual scenario also appears in the table. Handoff block.

---

## qa-impl

**Role**: Implement Playwright tests for the happy/golden paths.
**Inputs**: `tests/e2e/scenarios.md`, running app on `:5173`.
**Branch**: `feature/qa-impl-playwright` off `dev`.
**Git identity**: `QA Impl AI` / `qa-impl@battleship.local`.

**Hard rule**: **never modify or delete existing tests**. Only add new ones. If a test fails, the **code is wrong** — escalate to the Orchestrator, who routes the failure back to the responsible builder via Phase 5 (Bug Squasher).

**Deliverable**:
- `playwright.config.ts` — two browser contexts (`chromium`), headless, base URL `http://localhost:5173`.
- `tests/e2e/happy-path.spec.ts` — full match from lobby to win.
- `tests/e2e/placement.spec.ts` — drag-drop + randomize + ready.
- `tests/e2e/turn-flow.spec.ts` — alternating turns, hit/miss/sunk indicators.
- Add `test:e2e` script to root `package.json`.

**DoD**: `npx playwright test` runs and reports. Handoff block.

---

## negative-qa

**Role**: Implement Playwright specs for invalid inputs and edge cases.
**Branch**: `feature/qa-negative` off `dev`.
**Git identity**: `Negative QA AI` / `negative-qa@battleship.local`.

**Deliverable** — `tests/e2e/negative.spec.ts`:
- Shoot same cell twice → server rejects, UI shows error.
- Shoot before opponent ready → rejected.
- Place overlapping ships → UI prevents, server rejects if forged.
- Connect with invalid room code → "room not found" message.
- Disconnect mid-battle → opponent sees 30 s countdown; reconnect within window resumes; after window opponent wins by forfeit.

**DoD**: each negative scenario asserts both UI state and server response. Handoff block.
