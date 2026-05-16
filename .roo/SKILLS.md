# Skills / MCP Servers — What's Wired and Why

RooCode supports skills via **MCP (Model Context Protocol)** — the same protocol Claude Code uses. The configured servers live in `.roo/mcp.json`.

## Configured servers

| Server | Package | Used by | Why |
|---|---|---|---|
| **filesystem** | `@modelcontextprotocol/server-filesystem` | All modes | Safer read/write scoped to this repo (vs. RooCode's native `read_file`). Auto-approves common read ops. |
| **sequential-thinking** | `@modelcontextprotocol/server-sequential-thinking` | `architect-reviewer`, `qa-planner` | Long-horizon design tasks. Architect uses it to enumerate every Socket.IO event before writing the contract; QA Planner uses it to enumerate scenarios. |
| **memory** | `@modelcontextprotocol/server-memory` | `orchestrator` | Persists decisions across `new_task` sub-shells. Without it, the Orchestrator loses context between phases. |
| **playwright** | `@executeautomation/playwright-mcp-server` | `qa-impl`, `negative-qa` | Lets the QA modes drive a real browser to verify assertions and capture screenshots. |
| **github** *(disabled by default)* | `@modelcontextprotocol/server-github` | `orchestrator` (Phase 6) | Auto-creates a PR `dev → main` instead of merging locally. Enable by setting `disabled: false` and providing `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env`. |

## How to enable a disabled server

1. Open `.env` and add the required token:
   ```
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
   ```
2. In `.roo/mcp.json`, flip `"disabled": false` for that server.
3. Restart RooCode (close + reopen the Roo panel).

## How to verify they're loaded

In the RooCode chat, type:
```
@filesystem list_directory path=.
```
If the server responds with the file list, it's wired. Repeat for each server name.

## Important: per-mode allowlist

Some modes don't need every skill. To restrict, edit the mode's `roleDefinition` in `.roomodes` and mention the allowed servers. RooCode does **not** currently support per-mode MCP allowlisting natively, so the discipline is enforced by prompting (mention the servers the mode should use, and instruct it to ignore the others).

## When to add more skills

| Need | Skill |
|---|---|
| Generate SVG board diagrams | `@modelcontextprotocol/server-puppeteer` |
| Search the web for Socket.IO patterns | `@modelcontextprotocol/server-brave-search` |
| Slack notifications when the pipeline halts | `@modelcontextprotocol/server-slack` |
| Database (if you decide to add persistence) | `@modelcontextprotocol/server-postgres` |

Add to `.roo/mcp.json` with the same shape, restart RooCode.
