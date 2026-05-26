# Testing and validation

Root scripts are the required project validation surface. Where applicable they delegate to the `frontend` workspace; docs commands run VitePress from the root.

## Commands

```bash
npm run docs:build
npm run lint
npm run lint --workspace=frontend
npm run test:architecture
npm run test:architecture --workspace=frontend
npm run test
npm run test --workspace=frontend
npm run build
npm run build --workspace=frontend
npm run test:e2e
npm run test:e2e --workspace=frontend
```

Useful development commands:

```bash
npm run dev
npm run test:watch --workspace=frontend
npm run test:e2e:headed --workspace=frontend
```

There is no current `test:coverage` script.

## Test organization

- `frontend/tests/unit/architecture` — architecture/static boundary tests.
- `frontend/tests/unit` — Vitest unit tests.
- `frontend/tests/integration` — integration tests where present.
- `frontend/tests/e2e` — Playwright browser tests.

## Current residual debt

Recent refactor-wave validation documented pre-existing failures outside docs-only reconciliation scope: full Vitest has known intersection/PropertiesDialog/zero-test-guide failures, build can fail before Vite because of the Node 24/`vue-tsc` signature, and broad Playwright can be blocked by existing spec parse/corruption issues. New work should record exact logs and distinguish unchanged known debt from regressions introduced by the change.

## Expectations

Run focused tests for touched modules and the full cadence for implementation waves. Store long validation logs under the relevant `architecture-audit/cycle-*/validation/` directory.
