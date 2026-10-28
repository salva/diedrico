# Application defect investigation

## Delivered findings

- **P1 — failed New Project destroys active work.** `ProjectSessionUseCases.createProject` reset the live world/history before awaiting Drive creation. A rejected request left old file/name selected but replaced its content with an empty initialized world, risking subsequent autosave of that empty world to the old file. Reproduction: initialize session, undo initialization (retaining redo), select an existing file, reject `createFile`, compare snapshots and redo. Regression failed against f317c9d; now passes. The runtime now prepares a separate initialized candidate payload, submits that payload, and restores it only after creation succeeds. Existing active work and redo survive pending/rejected requests; success installs exactly the uploaded command stream. No remote request is replayed.
- **P2 — Drive initialization failure leaves no usable planes.** Startup catch hid the chooser without initializing the local world. Reject `drive.initialize()` on a fresh runtime: zero plane options. Regression failed before repair. Fallback now initializes the default world before dismissing the chooser.

Three regressions in `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` cover rejected creation, pending/successful creation, and initialization failure. Owners changed: `ProjectSessionUseCases.ts`, `ProjectSessionKernel.ts`, `RuntimeSession.ts` under `frontend/src/application/appShell/`.

## Investigation and limitations

Inspected command-stream serialization/validation/replay, isolated restore in RuntimeSession, startup/create/open and autosave boundaries, current guidance and browser configuration. Existing invalid-import and replay-failure preservation tests remain passing. No additional security defect is claimed. This is targeted investigation, not an exhaustive audit.

Follow-up leads for broader architecture review: autosave has no explicit in-flight serialization or session-generation ownership; asynchronous project operations likewise have no transition lock. These require deliberate concurrency scenarios and ownership design, not speculative edits here. Candidate creation preserves active edits while pending; once creation succeeds, switching projects intentionally replaces the active world. A remote create can succeed before an unexpected local restore/storage error; no rollback/retry guarantee is introduced.

Pages `.github/workflows/docs.yml` uses Node 20 and `cd frontend && npx vite build`, not routine typecheck/unit/lint/docs validation. This is a deployment validation gap, not an evidenced deployment failure; no workflow change was mandated or made. Actual Node 24.22.1/npm 11.19.1 checks here do not prove CI execution or Node 20 compatibility at every minor version.

## Verification

Final combined source and sibling guidance input:
- `npm run validate:routine`: 33 architecture tests; 118 Vitest files, 1162 passed, 6 skipped, 11 todo; typecheck and production build passed. Existing >500 kB bundle warning remains.
- `npm run lint`: passes with 123 warnings, zero errors (mostly unused declarations); not warning-free.
- `npm run validate:docs`: passes; existing bundle-size and unsupported `env` highlighting warnings.
- Project-local Chromium 1228 installed via `PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/ms-playwright" npx playwright install chromium`; explicit local launch passed. No browser/configuration changes committed.
- All 13 current Chromium e2e tests pass: shell/chooser, points, line argument collection/masks, active planes, coordinate status/input, keyboard selection/delete/undo/redo, 3D overlay pointer isolation and move/resize/minimize/maximize. This is the complete current Chromium suite, not exhaustive browser/product coverage. Live authenticated Google Drive/OAuth flows and other browser engines were not exercised; Drive failure regressions use explicit fake ports.
- `git diff --check` passes.

Raw command evidence retained in the card-owned work area (not committed): `routine-initial.log`, `regression-before.log` (two expected failing regressions), `routine-final.log`, `lint-final.log`, `docs-final.log`, `chromium-install.log`, `e2e-initial.log`, `e2e-final.log`. Initial routine passed 1159 tests plus the same skips/todos; the later passing run resolves the two new red regressions on changed source, not an assertion that the baseline was correct.
