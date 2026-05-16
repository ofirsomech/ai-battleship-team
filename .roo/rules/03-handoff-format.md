# Handoff Block — Mandatory End-of-Turn Format

Every sub-agent (builder, reviewer, QA, sign-off) MUST end its turn with this fenced block:

````
```handoff
agent: <your-slug>
branch: <branch-name-you-worked-on>
status: COMPLETED | REJECT | APPROVE | AC_COV | ESCALATE
files_changed:
  - <repo-relative-path>
  - <repo-relative-path>
contract_compliance: true | false | n/a
tests_added: <integer>
notes: |
  <one paragraph. For REJECT: list specific file:line issues and the contract clause violated.
   For APPROVE: confirm DoD met. For ESCALATE: explain the blocker concretely.>
```
````

## Status semantics

- `COMPLETED` — builder finished and is ready for review.
- `APPROVE` — reviewer says merge to `dev`.
- `REJECT` — reviewer says go back, with concrete issues.
- `AC_COV` — `requirements-reviewer` only: all 13 ACs verified on `dev`.
- `ESCALATE` — you've tried and can't proceed. Caller decides next step.

## Reviewer must include

- For REJECT: at least one `<file>:<line>` reference per issue.
- For APPROVE: an explicit DoD checklist match.

The Orchestrator will reject any reviewer output without these.
