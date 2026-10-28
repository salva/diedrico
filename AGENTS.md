# Diedrico repository instructions

Scope: this repository and its descendants, unless nearer instructions apply. Paths below are relative to the repository root; no external machine-specific memory file is required.

The Copilot-facing entry point is `.github/agents/copilot-instructions.md`. Keep its repository facts aligned with this file.

## Current project

Diedrico is a frontend-only Vue 3 + TypeScript npm workspace. There is no active backend workspace.

- `frontend/src/`: application/controllers, commands, Vue components, domain geometry, infrastructure, rendering, stores and tools.
- `frontend/tests/`: unit (including architecture), integration and Playwright e2e tests.
- `docs/`: VitePress guides, architecture/API reference and contributing documentation.
- `architecture-audit/`: reviewed refactor-wave artifacts and validation evidence.
- `specs/`: reserved for current specifications, not the removed `001-dihedral-learning-mvp` plans.

Use current source, `README.md` and applicable current docs/audit artifacts. Historical plans and validation logs are context, not proof of current behavior or passing checks.

## Setup and validation

Use Node.js >=20.19.0 and npm >=10.0.0 (see root `package.json`). Install from the repository root with `npm ci` for the committed lockfile, or `npm install` when intentionally updating dependencies.

Run root scripts:

- `npm run dev`: frontend Vite server.
- `npm run validate:routine`: architecture tests, full frontend Vitest suite and frontend typecheck/build.
- `npm run lint`: frontend ESLint analysis.
- `npm run test:e2e`: Playwright browser tests.
- `npm run validate:docs`: VitePress documentation build.

See `docs/contributing/development-setup.md` and `docs/contributing/testing.md` for individual commands and scope. Run checks relevant to the change and report actual results; a documentation build does not validate application runtime behavior.

## Code style and boundaries

Follow existing conventions unless a nearer file or explicit user instruction says otherwise. Domain code owns geometry; application controllers/use cases translate UI intents into commands; Vue components render state and forward interactions. Keep docs synchronized with the current tree and scripts. Do not use removed MVP planning/spec files as design authority.
