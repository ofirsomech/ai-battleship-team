# Git Flow (Hard Rules)

## Branch model

- `main` — production. Touched **only** by the Orchestrator after final sign-off.
- `dev` — integration. Touched **only** by the Orchestrator after a reviewer APPROVES a feature branch.
- `feature/<slug>` — builder branches off `dev`.
- `feature/<parent>-<sub>` — sub-branch when two builders need to coordinate (e.g. `feature/client-app-styles` off `feature/client-app`).
- `fix/<slug>` — bug squasher branches off `dev`.

## Before every commit

Run exactly:
```bash
git config user.name  "<Your Persona Name>"
git config user.email "<your-slug>@battleship.local"
```
Use the persona name from `.roomodes` (e.g., `"DB Dev AI"`, `"Server Rev. AI"`).

## What you may not do

- `git push --force` on `main`, `dev`, or any shared branch.
- `git commit --no-verify` (skip hooks).
- `git rebase -i` interactively.
- `git reset --hard` on a branch you don't own.
- Direct commits to `main` or `dev`. The Orchestrator merges; you don't.

## Commit message format

```
<type>(<scope>): <subject>

<body — what + why, max 72 cols per line>
```
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
Scope examples: `domain`, `socket`, `lobby`, `placement`, `qa`.
