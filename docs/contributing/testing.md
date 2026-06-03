# Testing and validation

Root scripts are the required project validation surface. Where applicable they delegate to the `frontend` workspace; docs commands run VitePress from the root.

## Commands

```bash
npm run docs:build
npm run validate:docs
npm run validate:routine
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

## Script meanings

- `npm run lint` — ESLint-based TypeScript/Vue static analysis for the frontend workspace.
- `npm run test:architecture` — Vitest architecture/static boundary tests.
- `npm run test` — full frontend Vitest suite.
- `npm run build` — frontend typecheck and Vite build.
- `npm run test:e2e` — Playwright browser tests.
- `npm run validate:routine` — routine implementation gate: architecture tests, full frontend Vitest, and frontend build.
- `npm run validate:docs` — VitePress documentation build.

## Test organization

- `frontend/tests/unit/architecture` — architecture/static boundary tests.
- `frontend/tests/unit` — Vitest unit tests.
- `frontend/tests/integration` — integration tests where present.
- `frontend/tests/e2e` — Playwright browser tests.

## Current validation baseline

The architecture remediation wave restored the routine validation baseline: `npm run test:architecture`, `npm run lint`, `npm run test --workspace=frontend`, `npm run build --workspace=frontend`, and `npm run docs:build` pass. `npm run lint` currently reports warnings only. The frontend build emits Vite's large chunk warning, but exits successfully.

## Expectations

Run focused tests for touched modules and the full cadence for implementation waves. Store long validation logs under the relevant `architecture-audit/cycle-*/validation/` directory.
