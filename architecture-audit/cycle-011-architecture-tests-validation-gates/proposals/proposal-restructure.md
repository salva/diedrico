# Wave 011 Proposal Restructure — Make validation a first-class contract and delete residual debug/UI command leaks first

## Summary

Implement Wave 011 one conceptual layer higher than direct test additions: create a first-class validation/architecture contract for the project, then make the source tree conform by deleting or moving residual debug/UI command leaks that would otherwise require permanent architecture-test allowlists. The main difference from Proposal Direct is that this proposal refuses to encode `ExamplesMenu.vue` as an allowed UI-to-operation violation. It either deletes the debug example menu and operation path now or moves example setup behind an application use case before enforcing the UI boundary.

This proposal still avoids broad Wave 012 placeholder/debug cleanup and Wave 013 docs/spec reconciliation. It only touches the debug/example surface because it directly blocks a truthful Wave 011 UI-to-operation gate.

## Why the fix belongs higher than test additions

Architecture tests should express the intended architecture, not memorize known exceptions. Current evidence shows one active component still violates the post-Wave-006 UI command boundary:

- `ExamplesMenu.vue` imports `Command`, `AddExampleSetupOp`, and `CommandStack` (`frontend/src/components/menus/ExamplesMenu.vue:50-55`).
- It injects `world` and `commandStack` directly (`frontend/src/components/menus/ExamplesMenu.vue:57-58`).
- It constructs, executes, commits, and pushes a command from the component (`frontend/src/components/menus/ExamplesMenu.vue:70-75`).

If Wave 011 adds a UI import-boundary test while preserving that component via allowlist, the project gets a weaker validation contract at the exact boundary the wave is supposed to harden. Because the project priorities prefer clean architecture and deletion over compatibility, this proposal removes the blocker before freezing the rule.

## Files to change

### Validation contract and architecture tests

- Add `frontend/tests/unit/architecture/helpers/sourceScanner.ts` with deterministic scanner utilities as in Proposal Direct.
- Replace `frontend/tests/unit/architecture/worldBoundary.spec.ts` with full-domain import rules:
  - `frontend/src/domain/**` must not import commands/application/services/components/stores/persistence;
  - keep a focused assertion for `World.ts` because it was the Wave 001 boundary.
- Replace `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts` with shared-helper implementation that keeps the deleted duplicate-state terms from the current test (`frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:3-12`).
- Replace `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` with a scanner-based deterministic test and delete the shell/grep warning-pass implementation (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:24-51`, `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:99-107`).
- Add `frontend/tests/unit/architecture/importBoundaries.spec.ts` with **no UI command/operation allowlist** after the source cleanup below:
  - components may not import `@/commands/**`, concrete operations, command factories, or `CommandStack`;
  - application/use-case modules may import commands/operations;
  - frontend source/tests may not import backend implementation files;
  - stale backend project route/DTO/dialog terms are forbidden except inside explicitly named negative-test guard strings in `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts:7-21`.
- Move generic Wave 010 backend rules from `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-50` into architecture tests, leaving app-shell-specific rules at `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:25-40`.

### Source cleanup required for a truthful UI gate

Choose one during implementation based on quick usage evidence, with deletion preferred:

#### Option A — Delete debug example menu path

- Delete `frontend/src/components/menus/ExamplesMenu.vue` if static search shows it is debug/non-essential and not part of current user-facing flows.
- Delete `frontend/src/commands/operations/debug/AddExampleSetupOp.ts` and any `frontend/src/commands/operations/debug/` directory if this operation is only used by the menu.
- Remove the menu from its parent component(s) and tests/e2e references.
- Delete tests/fixtures that reference the examples menu or debug setup operation.

#### Option B — Move example setup behind application use case

Only if review decides the examples menu is a real user-facing feature worth retaining in Wave 011:

- Add `frontend/src/application/examples/ExampleSetupUseCases.ts` or similar to own `Command`, `CommandStack`, and `AddExampleSetupOp` construction.
- Change `ExamplesMenu.vue` to emit/select example setup intents and call the application use case through a typed injection/prop; it must not import command/operation classes or inject raw `CommandStack`.
- Keep `AddExampleSetupOp` only if it remains an application-owned implementation detail. Otherwise delete it.

### Package/script/config changes

- Root `package.json`:
  - keep only the active `frontend` workspace (`package.json:7-9`);
  - add root script aliases for architecture tests if useful, e.g. `test:architecture` delegates to frontend;
  - do not add backend validation because backend was deleted in Wave 010.
- `frontend/package.json`:
  - add `test:architecture`;
  - make `lint` executable and truthful, because it currently invokes missing `eslint` (`frontend/package.json:15`, `frontend/package.json:25-39`). Prefer adding minimal dependencies/config rather than making lint a no-op.
- `frontend/playwright.config.ts`:
  - delete stale commented backend webServer block (`frontend/playwright.config.ts:46-53`).

## Files/tests/docs/fixtures to DELETE

Required deletes:

- Delete the shell/grep warning-pass implementation in `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` and replace it with deterministic scanner logic.
- Delete generic backend-boundary assertions from `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` once moved.
- Delete stale backend webServer comments from `frontend/playwright.config.ts`.

Conditional but preferred deletes:

- Delete `frontend/src/components/menus/ExamplesMenu.vue` if it is debug-only.
- Delete `frontend/src/commands/operations/debug/AddExampleSetupOp.ts` and the debug operation directory if no longer active.
- Delete tests/e2e/docs references to the examples/debug setup surface if they only preserve debug convenience.

Do **not** delete README-only operation placeholder directories or broad debug logging in this wave unless they are directly part of the example menu cleanup. Those remain Wave 012.

## Expected behavior change

- If Option A is selected: the Examples menu/debug setup affordance disappears. This is acceptable if the menu is classified as debug-only; no compatibility shim should remain.
- If Option B is selected: user-visible Examples menu behavior remains, but command construction moves out of the component into an application use case.
- Developer/validation behavior:
  - architecture tests enforce a strict no-UI-command-import rule with no residual allowlist;
  - full-domain import boundaries are tested;
  - frontend/backend deleted-backend rules are centralized in architecture tests;
  - root/frontend scripts include focused architecture validation;
  - lint is made executable or explicitly classified if impossible within the wave.

## Validation plan

Capture all logs under `architecture-audit/cycle-011-architecture-tests-validation-gates/validation/`.

1. Static scans:
   - no `frontend/src/domain/**` imports from forbidden outer layers;
   - no `frontend/src/components/**` imports from `@/commands/**`, command factories, operations, or `CommandStack`;
   - no frontend imports from `backend/src/**` and no stale backend project terms except the Wave 010 negative e2e guard.
2. Focused architecture tests:
   - root `npm run test:architecture` if added;
   - frontend `npm run test:architecture`.
3. Focused tests for source cleanup:
   - if deleting examples/debug path, run static scans proving deleted files are absent and no source/tests reference them;
   - if moving examples, run new focused application example use-case tests plus a component test if present.
4. Focused app-shell tests:
   - `AppShellBoundary.test.ts`, `KeyboardShortcutRouter.test.ts`, and Wave 010 project-flow e2e guard.
5. Mandatory cadence:
   - root/frontend lint;
   - focused Vitest for touched tests/source;
   - full root/frontend Vitest with existing intersections debt classification if still failing;
   - root/frontend build with `vue-tsc`/Node classification if still failing;
   - frontend e2e with broad syntax debt classification if still failing.
6. Live app verification:
   - refresh preview on `0.0.0.0` and probe `http://127.0.0.1:5173/`;
   - run a Playwright smoke covering startup and, if retained, examples menu behavior. If examples are deleted, the smoke should assert there is no dead affordance/reference.

## Known debt classification/remediation strategy

- **Lint:** This proposal strongly prefers making lint executable in Wave 011 because validation gates are central to the wave. Add proper dependencies/config; do not hide lint behind `|| true` or a no-op.
- **Build/vue-tsc:** Remediate if a dependency update/config pin is low-risk and directly tooling-scoped; otherwise classify as pre-existing debt.
- **Full Vitest intersections failures:** Classify as pre-existing geometry correctness debt unless source cleanup causes new failures.
- **E2E syntax corruption:** Because this proposal may touch/removes a UI affordance, repair or delete directly affected e2e references. Do not rewrite unrelated corrupted e2e files unless necessary to make the e2e command parse.

## Risks

- Deleting `ExamplesMenu.vue` may remove a user-visible convenience. Mitigation: first verify usage/imports and choose Option B if it is genuinely part of accepted behavior.
- Moving examples behind a use case risks overlapping Wave 012 debug cleanup. Mitigation: keep the change narrow; only address the UI-to-command leak needed for a strict architecture test.
- Making lint executable could reveal many style issues unrelated to Wave 011. Mitigation: configure lint as a static correctness/architecture gate without automatic broad formatting churn, or classify residual lint failures precisely.
- Strict UI boundary tests could block future application composition if too broad. Mitigation: define allowed command imports by layer (`frontend/src/application/**`), not by arbitrary file names.

## Recommendation

Prefer this proposal if reviewers agree that `ExamplesMenu.vue` is debug-only or easily moved. Otherwise choose Proposal Direct with a temporary allowlist and require Wave 012 to delete or migrate the examples/debug surface before it can become permanent validation debt.
