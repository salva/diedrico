# Development setup

Diedrico is a frontend-only Vue 3 + TypeScript workspace.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer

## Install

```bash
npm install
```

The root workspace installs the `frontend` package and root VitePress documentation dependencies.

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
