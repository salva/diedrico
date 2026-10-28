# Development setup

Diedrico is a frontend-only Vue 3 + TypeScript workspace.

## Prerequisites

- Node.js >=20.19.0
- npm >=10.0.0 (the root `package.json` engines are authoritative)

## Install

```bash
npm install
```

The root workspace installs the `frontend` package and root VitePress documentation dependencies.
Run installation from the repository root, which owns `package-lock.json`.
For a reproducible install of the committed dependencies, use `npm ci` instead.
Use `npm install` when intentionally updating dependencies; preserve the lockfile
when troubleshooting ordinary installation failures.

## Run the application

```bash
npm run dev
```

This delegates to the frontend Vite dev server. Open the URL printed by Vite, normally `http://localhost:5173`.

## Useful validation commands

```bash
npm run docs:build
npm run lint
npm run test:architecture
npm run test
npm run build
npm run test:e2e
```

Use `--workspace=frontend` when you need to run the underlying frontend script directly.

## Source layout

```text
frontend/              # Vue application source and tests
docs/                  # VitePress documentation
architecture-audit/    # reviewed refactor-wave artifacts
```
