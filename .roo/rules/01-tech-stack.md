# Tech Stack (Non-Negotiable)

| Layer | Choice | Pinned version |
|---|---|---|
| Client framework | React | 18.x |
| Client language | TypeScript | 5.x |
| Client bundler | Vite | 5.x |
| Client styling | TailwindCSS | 3.x |
| Server runtime | Node | 20 LTS |
| Server framework | Express | 4.x |
| Realtime | Socket.IO | 4.x |
| Server language | TypeScript | 5.x |
| State | In-memory only | — |
| Unit tests | Vitest | latest |
| E2E tests | Playwright | latest |
| Package manager | npm | 10+, with workspaces |
| Lint/format | ESLint + Prettier (default TS configs) | latest |

## Rules

- **No alternatives.** If you think Fastify, Vue, Yarn, or a database would be better, do not switch — request a stack change via the Orchestrator and wait.
- **No `any` types.** Anywhere. Use generics, unknown + narrowing, or amend `shared/types.ts`.
- **No CSS-in-JS, no inline `style={}`.** Tailwind classes only. If a one-off animation is needed, add a keyframe in `client/src/styles/`.
- **No fetch/axios for game traffic** — everything goes through Socket.IO. REST is allowed only for a `GET /health` endpoint.
