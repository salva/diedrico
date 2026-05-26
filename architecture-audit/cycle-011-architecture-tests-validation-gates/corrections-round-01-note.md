# Wave 011 Corrections Round 01 Note

## Source immutability

This corrections round edits proposal/audit artifacts only. It does not implement application source changes and does not modify `frontend/`, `backend/`, `specs/`, `docs/`, root `package.json`, or `frontend/package.json`. Package/source files were used only as evidence for the proposal text.

## Round-01 blocker mapping

### Blocker 1 — sharpen root/frontend lint gate plan

Reviewer finding: both proposals left open a non-truthful result where `frontend/package.json` still declares `lint` with missing `eslint`.

Edits made:

- `proposals/proposal-direct.md` → `Round-01 blocker corrections incorporated`, `Concrete validation command contract after Wave 010`, `Package/script/config changes`, and `Known debt classification/remediation strategy`: now requires every declared validation script to be truthful/executable; requires root/frontend lint to start; **prefers replacing the missing ESLint script with the installed TypeScript static gate `vue-tsc --noEmit`**; allows restoring minimal ESLint dependencies/config as the alternative; forbids no-op scripts, `|| true`, missing executables, `--fix`-only churn, and leaving `eslint: not found` as classified residual debt.
- `proposals/proposal-direct.md` → `Validation plan` and `Known debt classification/remediation strategy`: root/frontend lint commands are exact and the missing executable is not accepted as residual debt.
- `proposals/proposal-restructure.md` → `Round-01 blocker corrections incorporated`, `Concrete validation command contract after Wave 010`, `Package/script/config changes`, and `Known debt classification/remediation strategy`: same truthful/executable lint contract, but Restructure prefers adding/restoring minimal ESLint dependencies/config because it treats validation as a first-class contract; `vue-tsc --noEmit` remains the allowed fallback if ESLint would cause broad unrelated style churn.
- `proposals/proposal-restructure.md` → `Validation plan` and `Known debt classification/remediation strategy`: root/frontend lint commands must start and cannot fail because of a missing binary.

### Blocker 2 — state root validation contract after Wave 010 backend deletion

Reviewer finding: both proposals underspecified root e2e alias handling and the root/workspace command surface.

Edits made:

- `proposals/proposal-direct.md` → `Round-01 blocker corrections incorporated`, `Concrete validation command contract after Wave 010`, and `Package/script/config changes`: defines root command contract after backend deletion: only `frontend` workspace; root `lint`, `test`, and `build` delegate to frontend; add root `test:architecture`; intentionally do **not** add root `test:e2e`; mandatory e2e is satisfied by the explicit frontend workspace command and the implementation log must record the root alias absence; no backend scripts.
- `proposals/proposal-direct.md` → `Validation plan`: lists exact root and frontend commands: root/frontend lint, root/frontend `test:architecture`, root/frontend test/build, and the active workspace e2e command `npm run test:e2e --workspace=frontend`; it explicitly records that Proposal Direct does not add root `npm run test:e2e`.
- `proposals/proposal-restructure.md` → `Package/script/config changes`: same root/frontend command contract, including root `test:e2e` delegation and no backend validation.
- `proposals/proposal-restructure.md` → `Validation plan`: lists the same mandatory root/frontend command surface and requires no backend workspace assumptions.

### Blocker 3 — tighten Proposal Direct `ExamplesMenu.vue` exception language

Reviewer finding: Proposal Direct could normalize a durable UI-to-command exception.

Edits made:

- `proposals/proposal-direct.md` → `Test/helper changes`: the active exception is now exactly `frontend/src/components/menus/ExamplesMenu.vue`, only for the current `Command`, `AddExampleSetupOp`, and `CommandStack` leak at lines 50-75; any other component or additional import must fail.
- `proposals/proposal-direct.md` → `Test/helper changes`: the scanner/test failure message and allowlist reason must name `TEMPORARY Wave 012 ExamplesMenu debug/example command leak`, state that Wave 012 must delete or migrate it, and print the file path.
- `proposals/proposal-direct.md` → `Risks`: mitigation now repeats the single-file, visible, Wave-012-bound residual requirement.

## Additional tightening requested by expected outcomes

- Both proposals require deleting the stale backend `webServer` comment block from `frontend/playwright.config.ts:46-53`.
- Both proposals classify known Node 24/`vue-tsc`, intersections Vitest, and broad e2e syntax debt by exact tool/file/error, while keeping focused architecture gates green.
- `proposals/proposal-restructure.md` now explicitly states the final implementation must not leave a UI command/operation allowlist for `ExamplesMenu.vue` or any other component; Option B must prove `ExamplesMenu.vue` no longer imports command/operation/CommandStack symbols, otherwise Option A deletion is required.
- Both proposals retain the no Wave 012/013 overreach boundary: only validation-gate enabling cleanup is in scope.

## Ready for review round 02

The corrected proposals are intended to be reviewed in `cycle-011-review-round-02` against `reviews/round-01-review.md` and this corrections note.
