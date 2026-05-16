# PLAN — Battleship Multi-Agent Orchestrator (RooCode)

**Date:** 2026-05-16
**Owner:** Ofir
**Goal:** Produce a production-grade orchestrator prompt + step-by-step submission guide for the Gen4 Battleship home-exercise, executed inside RooCode with the 17 Custom Modes defined in `.roomodes`.

---

## 1. Why this work

The existing prompt in `craw.md` defines a reasonable phase sequence (Architecture → Build → QA → Sign-off) and enforces a strict Git flow, but it is **brittle for autonomous execution**:

- No tech stack — every sub-agent will pick its own framework, breaking integration.
- No contract artifact — Architect produces free-form docs that downstream builders cannot reliably consume.
- No acceptance criteria — Reviewers have nothing concrete to validate.
- Two defined sub-agents (`Template Dev`, `Negative QA`, `Requirements Reviewer`) are never invoked.
- No retry ceiling — a hostile reviewer creates an infinite loop.
- No orchestration log — there is no artifact to demonstrate the multi-agent process to a grader.

The deliverable closes those gaps and produces an exercise-grade submission package.

## 2. Approved decisions

| Decision | Choice |
|---|---|
| Client stack | React 18 + TypeScript + Vite + TailwindCSS |
| Server stack | Node + Express + Socket.IO + TypeScript |
| State | In-memory (no DB) |
| Tests | Vitest (unit) + Playwright (e2e) |
| Game mode | Online 2-player via Socket.IO (room codes) |
| QA approach | Playwright automated + Antigravity manual visual pass |
| Artifact language | English (prompts, docs, code) |

## 3. Files to produce

| Path | Purpose |
|---|---|
| `prompts/orchestrator_master_prompt.md` | The master prompt the user pastes into RooCode Orchestrator mode. |
| `prompts/agent_briefings/*.md` | Per-agent reference cards (15 files), used to debug a misbehaving sub-agent. |
| `docs/game_spec.md` | Canonical Battleship rules + acceptance criteria. Architect imports it. |
| `docs/exercise_guide.md` | Step-by-step instructions to run the pipeline and assemble the submission. |
| `.roomodes` (updated) | `roleDefinition` of each agent extended with contract-aware constraints. |
| `CHANGES.md` (in this plan dir) | Final list of files added/modified + suggested commit message. |
| `CHANGELOG.md` (repo root) | Dated entry per global rule. |

## 4. Verification

1. Open RooCode, switch to `orchestrator` mode, paste `orchestrator_master_prompt.md`. Observe:
   - Creates `main` and `dev` branches.
   - Calls `new_task` with `mode=architect-reviewer` (does not author code itself).
   - Halts with the literal `WAITING_FOR_HUMAN_APPROVAL` marker.
2. Open `docs/exercise_guide.md` cold and confirm the user can execute end-to-end with no missing steps.
3. Cross-check: every agent slug referenced in the prompt exists in `.roomodes`.

## 5. Out of scope

- Actually running the pipeline and producing the working Battleship app — that happens after the user approves the prompt and triggers it in RooCode.
- Hosting/deployment — local `npm run dev` is sufficient for the exercise.
