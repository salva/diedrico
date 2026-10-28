# Diedrico development guidelines

Use the repository-root `AGENTS.md` for current repository layout, setup, validation commands and code boundaries. Its repository-relative guidance also applies when working through this Copilot entry point.

Quick reference:

- Frontend-only Vue 3 + TypeScript npm workspace: `frontend/src/` and `frontend/tests/`, not root `src/` or `tests/`.
- Node.js >=20.19.0 and npm >=10.0.0; install from the repository root using the root lockfile.
- `npm run dev` starts the frontend; `npm run validate:routine`, `npm run lint`, `npm run test:e2e` and `npm run validate:docs` cover distinct validation scopes.
- Read `docs/contributing/development-setup.md` and `docs/contributing/testing.md` for details. Use current source/docs, not removed MVP plans or historical passing logs, as evidence of current behavior.
- Follow existing conventions and nearer applicable instructions.
