# Battleship

A multiplayer Battleship game built with React, Express, and Socket.IO.

## Quickstart

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Documentation

- **[Game Specification](docs/game_spec.md)** — rules, phases, and acceptance criteria
- **[API Contract](docs/api_contract.md)** — Socket.IO event catalog

## Architecture

| Layer          | Directory        | Tech                           |
|----------------|------------------|--------------------------------|
| Shared types   | [`shared/`](shared/) | TypeScript interfaces |
| Server         | [`server/`](server/) | Express + Socket.IO |
| Client         | [`client/`](client/) | React 18 + Vite + TailwindCSS |

## Scripts

| Command            | Description                          |
|--------------------|--------------------------------------|
| `npm install`      | Install all workspace dependencies   |
| `npm run dev`      | Start server + client concurrently   |
| `npm run build`    | Build all workspaces                 |
| `npm run lint`     | Run ESLint on all TypeScript files   |
| `npm run format`   | Format with Prettier                 |
