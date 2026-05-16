# Contract-First Principle

The Architect produces two artifacts that no downstream agent may bypass:

1. `shared/types.ts` — all TypeScript interfaces.
2. `docs/api_contract.md` — every Socket.IO event documented (name · direction · payload type · state transition).

## Builders

- Read both files **before** writing a line of code.
- Import types from `shared/types.ts`. Never redefine.
- If a type is missing or wrong, **do not patch locally**. Stop and tell the Orchestrator. The fix path:
  - Orchestrator spawns `architect-reviewer` on `feature/contract-amend-<short-slug>`.
  - Architect amends `shared/types.ts` + `docs/api_contract.md`.
  - Reviewer approves.
  - Orchestrator merges to `dev`.
  - Your builder is re-spawned with the amended contract.

## Reviewers

- First check: does the diff import all needed types from `shared/`?
- Second check: does every Socket.IO event in the diff appear in `docs/api_contract.md`?
- If either fails: REJECT with the specific clause that's missing.

## Orchestrator

- Reject any builder handoff with `contract_compliance: false` and route through the amendment loop.
