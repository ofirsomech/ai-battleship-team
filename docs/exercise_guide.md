# Step-by-Step Guide — Gen4 Battleship Multi-Agent Home Exercise

This guide walks you from a blank machine to a graded submission. Estimated wall-clock time: **3–5 hours** (most of it is the LLM running unattended).

---

## 0. Prerequisites

| Tool | Version | Why |
|---|---|---|
| VS Code | latest | Host for RooCode |
| Node | 20.x LTS | Runtime for client + server |
| npm | 10+ | Workspace support |
| Git | any modern | Pipeline depends on branches |
| An LLM API key | — | Anthropic (Claude 4.x recommended) or OpenAI or OpenRouter |
| (Optional) Google Antigravity | — | For the final manual visual QA pass |

---

## 1. Install RooCode

1. Open VS Code → Extensions → search **"Roo Code"** → Install.
2. Open the extension settings:
   - **API Provider**: Anthropic (recommended) or your choice.
   - **API Key**: paste your key.
   - **Model**: `claude-sonnet-4-6` (good cost/quality), or `claude-opus-4-7` if you want maximum quality.
3. Verify the chat panel opens (sidebar icon → Roo).

---

## 2. Clone / Open this Repository

```bash
cd ~/Documents/stampli
# the repo already exists at ai-battleship-team/
code ai-battleship-team
```

Confirm these files exist at the repo root:
- `.roomodes` — 17 custom modes.
- `prompts/orchestrator_master_prompt.md` — the master prompt.
- `docs/game_spec.md` — game rules.

If RooCode does not detect the custom modes automatically, open the Roo panel → **Modes** → **Reload from `.roomodes`**.

---

## 3. Initialize Git Branches

In a terminal at the repo root:

```bash
git checkout -b main       # if not already on main
git push -u origin main    # optional: only if you've added a remote
git checkout -b dev main
git push -u origin dev     # optional
```

The orchestrator will refuse to start if `main` and `dev` are missing.

---

## 4. Set the Mode and Paste the Prompt

1. In the Roo chat panel, click the mode dropdown and select **Orchestrator AI**.
2. Open `prompts/orchestrator_master_prompt.md` in VS Code.
3. Select all (`Cmd+A`), copy (`Cmd+C`), paste into the Roo chat, hit Send.

Roo will start executing **Phase 0** (bootstrap) and **Phase 1** (Architecture).

---

## 5. First Halt — Architecture Approval

After ~5–15 minutes (model-dependent) Roo will stop and print:

```
WAITING_FOR_HUMAN_APPROVAL: Architecture plan is ready. ...
```

**Your job:**
1. Open `docs/api_contract.md` and `shared/types.ts`. Skim — does it look sane? Are events typed?
2. Open `docs/orchestration_log.md` — first rows should show Architect spawn + merge to dev.
3. If happy, reply in the chat: `Approved`.

If not happy, reply with concrete feedback ("the `shoot` event payload is missing the `playerId` field") — Roo will re-spawn the Architect.

---

## 6. Unattended Build (Phase 2)

This phase runs without your input for ~30–90 minutes depending on model speed. Roo will:
- Spawn `db-dev` → `db-reviewer` → merge.
- Spawn `server-dev` → `server-reviewer` → merge.
- Spawn `client-dev` + `template-dev` → `client-reviewer` → merge.
- Run `requirements-reviewer` for end-to-end AC coverage.

Glance at the chat occasionally. If you see `ESCALATION_REQUIRED`, intervene with guidance.

When phase 2 completes, the app should be runnable:

```bash
npm install
npm run dev          # starts both client + server (script created by Architect)
```

Open `http://localhost:5173` (Vite default) in two browser tabs and play a match end-to-end.

---

## 7. Phase 3 — QA

Roo continues automatically into QA. It will:
- Author `tests/e2e/scenarios.md`.
- Author Playwright specs in `tests/e2e/*.spec.ts`.
- Author `docs/antigravity_visual_tests.md`.

When QA finishes, Roo halts with:

```
PIPELINE PAUSED. Open docs/antigravity_visual_tests.md ...
```

---

## 8. Manual Visual QA (Antigravity)

1. Open `docs/antigravity_visual_tests.md` — it lists every visual scenario to check.
2. Open Google Antigravity, point it at the running local app.
3. Walk through each scenario, mark pass/fail, capture screenshots.
4. Compile the report into a markdown block (paste table of `scenario | result | note`).
5. Paste the report back into the Roo chat.

If everything passed: reply `Antigravity passed successfully`.
If anything failed: paste the failures verbatim — Roo enters the Bug Squasher phase (§9).

---

## 9. Bug Squasher Loop (only if needed)

For each failed scenario Roo will:
- Spawn the appropriate builder on `fix/<slug>`.
- Spawn its reviewer.
- Merge to `dev` on APPROVE.
- Halt with `FIX APPLIED for "..."` and ask you to re-run that one Antigravity scenario.

Repeat until you can type `Antigravity passed successfully`.

---

## 10. Sign-off & Ship

After your green-light, Roo spawns three sign-off agents in parallel:
- `architect-signoff` — contract still intact?
- `qa-engineer-signoff` — `npm test` + `npx playwright test` both green?
- `product-signoff` — visual match per your Antigravity report?

All three must APPROVE. Then Roo merges `dev` → `main`, pushes, and prints `Ship 🚀`.

---

## 11. Assemble the Submission Package

Your grader needs to see **both** the working software **and** the multi-agent process. Collect:

| Artifact | Where |
|---|---|
| Working app (run instructions) | `README.md` (Architect should have authored it; verify) |
| Git history showing multi-author commits | `git log --pretty='%an %s' main` |
| `docs/orchestration_log.md` | Proof of the pipeline run |
| `docs/api_contract.md` | The contract every agent honored |
| `tests/e2e/scenarios.md` + Playwright report | `npx playwright test --reporter=html` then zip the report dir |
| `docs/antigravity_visual_tests.md` + your screenshots | Manual visual evidence |
| A short write-up (`docs/SUBMISSION.md`) | See §12 |

---

## 12. Write `docs/SUBMISSION.md`

Required sections per the exercise brief:

```markdown
# Battleship — Gen4 Submission

## 1. The Software
- Live demo: `npm run dev` then visit http://localhost:5173 in two tabs.
- Tech stack: React 18 / TS / Vite / Tailwind  ·  Node / Express / Socket.IO  ·  In-memory state.
- Key design decisions: <bullets>

## 2. How I Built It with Multi-Agents
- Pipeline diagram: <embed/reference the step-6 image from the exercise>
- 17 RooCode custom modes (`.roomodes`)
- Strict git flow: every change went feature-branch → reviewer → dev → main
- Contract-first: Architect produced `shared/types.ts` + `docs/api_contract.md` before any code

## 3. What I Learned
- What worked: <bullets>
- What broke (and how I fixed it): <bullets>
- Where multi-agent shone vs. where a single agent would have been faster: <bullets>

## 4. How This Fits Future Development
- When you'd reach for multi-agent: <bullets>
- When you'd skip it: <bullets>
- Tooling I'd want next time: <bullets>
```

---

## 13. Submit

- Push everything to your fork / share the repo.
- Include `docs/SUBMISSION.md` as the entry-point doc in your README.
- (Optional but high-impact): record a 3-minute Loom showing a live match in two browser tabs, the orchestration log scrolling, and the test report.

---

## Troubleshooting Quick Reference

| Symptom | Action |
|---|---|
| Orchestrator starts writing code itself | Reply: "Stop. You must delegate via `new_task`. Re-read §0 of the master prompt." |
| Reviewer rejects 3 times in a row | The `ESCALATION_REQUIRED` halt fires automatically — provide concrete guidance. |
| Sub-agent imports the wrong type | Re-spawn `architect-reviewer` on a `fix/contract` branch to amend `shared/types.ts`. |
| Playwright fails on CI but passes locally | Ask `qa-impl` to add `await page.waitForLoadState("networkidle")` before assertions. |
| Socket events not firing in a second tab | Check CORS in `server/src/index.ts` — should allow `http://localhost:5173`. |
