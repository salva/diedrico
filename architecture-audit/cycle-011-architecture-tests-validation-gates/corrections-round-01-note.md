# Wave 011 Corrections Round 01 Note

## Source of corrections

Corrections address every blocking issue in `architecture-audit/cycle-011-architecture-tests-validation-gates/reviews/round-01-review.md`. No application source files were changed in this corrections task.

## Blocker-to-edit map

### Blocker 1 — Both proposals must sharpen the root/frontend lint gate plan

**Reviewer concern:** the proposals allowed a non-truthful outcome where `frontend/package.json` kept declaring `eslint ... --fix` while `eslint` was absent from dev dependencies; “classify if still red” was insufficient for a missing executable.

**Proposal Direct edits:**

- Added `## Round-01 blocker corrections incorporated`, bullet **Executable lint/static gate**, requiring a real command and forbidding missing executables/no-op scripts/residual `eslint: not found` classification.
- Tightened `## Concrete validation command contract after Wave 010`, rows for root `npm run lint` and frontend `npm run lint --workspace=frontend`, to prefer `vue-tsc --noEmit` with installed tooling or require minimal ESLint dependencies/config as the only alternative.
- Tightened `## Package/script/config changes`, `## Validation plan`, and `## Known debt classification/remediation strategy` so lint/static remediation is mandatory in Wave 011 and a missing ESLint binary cannot be accepted as debt.

**Proposal Restructure edits:**

- Added `## Round-01 blocker corrections incorporated`, bullet **Executable lint/static gate**, requiring either minimal ESLint dependencies/config or the installed `vue-tsc --noEmit` gate.
- Tightened `## Concrete validation command contract after Wave 010`, root/frontend lint rows and implementation-path bullets, to remove the current missing executable failure.
- Tightened `## Package/script/config changes`, `## Validation plan`, and `## Known debt classification/remediation strategy` to forbid no-op lint scripts and residual `eslint: not found` classification.

### Blocker 2 — Both proposals must state the root validation contract after Wave 010 backend deletion more explicitly

**Reviewer concern:** root/workspace validation cadence was underspecified, especially whether root `test:e2e` would exist and how e2e would be invoked without backend workspace assumptions.

**Proposal Direct edits:**

- Added `## Round-01 blocker corrections incorporated`, bullet **Root/frontend validation contract**.
- Added a full command-surface table in `## Concrete validation command contract after Wave 010` covering root and frontend `lint`, `test`, `build`, `test:e2e`, and `test:architecture`.
- Explicitly states **do not add a root `test:e2e` alias**; mandatory e2e is satisfied by `npm run test:e2e --workspace=frontend`, with the intentional root alias absence recorded in `implementation-log.md`.
- `## Validation plan` now lists root/frontend mandatory cadence separately and calls out workspace e2e plus focused Playwright guard invocation.

**Proposal Restructure edits:**

- Added `## Round-01 blocker corrections incorporated`, bullet **Root/frontend validation contract**.
- Added a full command-surface table in `## Concrete validation command contract after Wave 010` covering root and frontend commands.
- Explicitly states **add root `test:e2e`** as `npm run test:e2e --workspace=frontend`, while frontend remains the sole implementation e2e entrypoint.
- `## Validation plan` now requires root `npm run test:e2e` and frontend `npm run test:e2e --workspace=frontend`.

### Blocker 3 — Proposal Direct must tighten the `ExamplesMenu.vue` exception language

**Reviewer concern:** the direct allowlist could become a durable exception unless made single-file, visible, and tied to Wave 012 deletion/migration.

**Proposal Direct edits:**

- Added `## Round-01 blocker corrections incorporated`, bullet **ExamplesMenu temporary exception**.
- `## Summary` now states the allowlist is named, single-file, temporary, visible, narrow, and scheduled for Wave 012 deletion/migration.
- `## Files to change` / `importBoundaries.spec.ts` requirements now restrict the exception to exact path `frontend/src/components/menus/ExamplesMenu.vue`, exact known `Command`, `AddExampleSetupOp`, and `CommandStack` imports/usage, with failure output naming `TEMPORARY Wave 012 ExamplesMenu debug/example command leak` and forbidding additional components/imports without reviewed proposal.
- `## Risks` now calls out the allowlist shim risk and mitigation through exact-path failure text and implementation-log tracking.

**Proposal Restructure relation:**

- Restructure keeps no `ExamplesMenu.vue` allowlist. Its `## Round-01 blocker corrections incorporated`, `## Source cleanup required for a truthful UI gate`, and `## Validation plan` clarify that the leak is either deleted or moved behind an application use case before strict no-UI-command-import tests are enforced.

## Additional validation-language tightening

Both proposals now explicitly require:

- focused architecture import-boundary tests/static scans;
- root/frontend package-script validation after backend deletion;
- stale backend Playwright webServer comment deletion;
- exact classification or narrow remediation of known Node 24/`vue-tsc`, intersections, and broad e2e debt;
- no broad Wave 012/013 overreach beyond the selected direct allowlist tracking or restructure examples cleanup.

## Files edited in this corrections task

- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-direct.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-restructure.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/corrections-round-01-note.md`
