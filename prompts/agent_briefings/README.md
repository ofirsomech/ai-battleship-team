# Agent Briefings — Reference Cards

Per-role reference cards used by the Orchestrator when constructing `new_task` briefings. Useful when debugging a misbehaving sub-agent: copy the relevant section into a fresh `new_task` message and tighten the constraints.

Files:
- `builders.md` — Architect, DB Dev, Server Dev, Client Dev, Template Dev
- `reviewers.md` — all *-reviewer modes
- `qa.md` — QA Planner, Coverage Validator, QA Impl, Negative QA
- `signoff.md` — three final sign-off agents

Every card follows the same shape: **Role · Inputs · Branch · Deliverable · DoD · Handoff** — matching §3 of `prompts/orchestrator_master_prompt.md`.
