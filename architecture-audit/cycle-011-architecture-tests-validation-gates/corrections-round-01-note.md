# Wave 011 Corrections Round 01 Note

## Source review

Corrections are based on `architecture-audit/cycle-011-architecture-tests-validation-gates/reviews/round-01-review.md`, especially the three blocking issues under “Blocking issues”. No application/source implementation files were changed during this correction task.

## Blocker 1 — Sharpen root/frontend lint gate plan

**Reviewer blocker:** Both proposals left open a non-truthful outcome where `lint` remains declared but non-executable because `frontend/package.json` invokes missing `eslint`. Each proposal must say exactly which real executable gate Wave 011 leaves in place and whether that means installing/configuring ESLint or replacing lint with another supported static command.

### Edits made in `proposals/proposal-direct.md`

- Added `## Concrete validation command contract after Wave 010`.
- In the command table, specified:
  - root `npm run lint` remains a frontend delegator but must execute a real static gate;
  - frontend `npm run lint --workspace=frontend` must replace missing `eslint` with an installed TypeScript static gate such as `vue-tsc --noEmit`, unless implementation deliberately adds minimal ESLint dependencies/config;
  - no no-op, missing executable, `true`, `echo`, or `|| true` lint outcome is allowed.
- Added an explicit implementation choice list:
  - preferred direct path: `vue-tsc --noEmit` or equivalent installed static check;
  - allowed alternative: add/restore minimal ESLint dependencies/config.
- Updated `### Package/script/config changes`, `## Validation plan`, and `## Known debt classification/remediation strategy` to require proof that the `eslint: not found` failure is gone and to reject “classify if still red” for the missing executable.

### Edits made in `proposals/proposal-restructure.md`

- Added `## Concrete validation command contract after Wave 010`.
- In the command table, specified:
  - root `npm run lint` remains a frontend delegator but must execute a real static gate;
  - frontend lint must either add minimal ESLint dependencies/config or use `vue-tsc --noEmit` as an installed static gate;
  - no missing executable/no-op lint outcome is allowed.
- Added an explicit implementation choice list:
  - preferred restructure path: minimal ESLint dependency/config so `lint` remains semantically a lint command;
  - allowed fallback: `vue-tsc --noEmit` if ESLint would expand scope.
- Updated `### Package/script/config changes`, `## Validation plan`, and `## Known debt classification/remediation strategy` to require remediation of the missing executable rather than classification.

## Blocker 2 — State root validation contract after Wave 010 backend deletion

**Reviewer blocker:** Both proposals needed to explicitly state whether root `package.json` gains a root `test:e2e` alias and, if not, how mandatory cadence is satisfied truthfully from root versus workspace level.

### Edits made in `proposals/proposal-direct.md`

- Added command-table rows for root/frontend `test`, `build`, `test:e2e`, and `test:architecture`.
- Explicitly chose **not** to add root `test:e2e` in Proposal Direct.
- Required implementation logs to state that root e2e is intentionally absent after backend deletion and that the mandatory e2e cadence is satisfied by running `npm run test:e2e --workspace=frontend`.
- Updated `### Package/script/config changes` to say root `test:e2e` is not added.
- Updated `## Validation plan` to list root mandatory commands separately from the active workspace e2e command and to avoid implying a root e2e alias exists.

### Edits made in `proposals/proposal-restructure.md`

- Added command-table rows for root/frontend `test`, `build`, `test:e2e`, and `test:architecture`.
- Explicitly chose to **add** root `test:e2e` as `npm run test:e2e --workspace=frontend` in Proposal Restructure.
- Updated `### Package/script/config changes` to require the root e2e alias.
- Updated `## Validation plan` to require both root `npm run test:e2e` and frontend `npm run test:e2e --workspace=frontend`, plus focused Wave 010 e2e.

## Blocker 3 — Tighten Proposal Direct `ExamplesMenu.vue` exception language

**Reviewer blocker:** Proposal Direct could keep the allowlist only if it explicitly restricts the exception to one file, requires test failure output to name the residual as temporary, and points to Wave 012 removal/move as the planned delete target.

### Edits made in `proposals/proposal-direct.md`

- Strengthened `## Summary` to call the allowlist “named, single-file, temporary”.
- Updated `### Test/helper changes` / `importBoundaries.spec.ts` requirements to state:
  - the only exception is exactly `frontend/src/components/menus/ExamplesMenu.vue`;
  - the exception is not a glob and only covers the known `Command`, `AddExampleSetupOp`, and `CommandStack` leak;
  - the test output must name it as `TEMPORARY Wave 012 ExamplesMenu debug/example command leak`;
  - adding any other component or import to the allowlist is forbidden without reviewed proposal change;
  - the exception must be recorded in `implementation-log.md` as a Wave 012 delete/move target.
- Updated `## Expected behavior change`, `## Validation plan`, `## Known debt classification/remediation strategy`, and `## Risks` to keep the exception visible and time-boxed.

### Edits made in `proposals/proposal-restructure.md`

- Preserved and clarified the no-allowlist stance.
- Updated source-cleanup sections and validation scans to require either deletion of `ExamplesMenu.vue`/`AddExampleSetupOp` or moving command construction behind an application use case before enforcing the strict UI rule.

## Additional reviewer findings addressed

- **Stale backend Playwright config:** Both proposals now keep deletion of `frontend/playwright.config.ts:46-53` as a required config cleanup and include it in files-to-delete/validation language.
- **Known Node 24 / `vue-tsc`, intersections, and e2e debt:** Both proposals now distinguish missing lint executable remediation from classifiable pre-existing build/Vitest/e2e debt. The proposals prohibit treating `eslint: not found` as residual debt while allowing exact classification of unrelated Node 24/`vue-tsc`, intersections, and broad e2e syntax failures.
- **No Wave 012/013 overreach:** Proposal Direct explicitly does not delete examples/debug surfaces; it only tracks the residual for Wave 012. Proposal Restructure permits only the `ExamplesMenu.vue`/debug operation cleanup needed for a strict UI architecture gate and leaves unrelated placeholders/debug docs and broad docs/spec reconciliation to Wave 012/013.
- **Architecture import-boundary focused tests/static scans:** Both proposals now explicitly require focused architecture scripts, domain/UI/backend-boundary scans, shared scanner helpers, app-shell boundary tests after moving generic guards, and focused Wave 010 e2e validation.

## Files edited in this corrections round

- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-direct.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-restructure.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/corrections-round-01-note.md`

## Source immutability statement

This corrections round was limited to Wave 011 audit/proposal artifacts. It did not edit `frontend/`, `backend/`, `specs/`, or `docs/` application/source files.
