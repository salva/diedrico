# Wave 011 Proposal Restructure — Make validation a first-class contract and delete residual debug/UI command leaks first

## Summary

Implement Wave 011 one conceptual layer higher than direct test additions: create a first-class validation/architecture contract for the project, then make the source tree conform by deleting or moving residual debug/UI command leaks that would otherwise require permanent architecture-test allowlists. The main difference from Proposal Direct is that this proposal refuses to encode `ExamplesMenu.vue` as an allowed UI-to-operation violation. It either deletes the debug example menu and operation path now or moves example setup behind an application use case before enforcing the UI boundary.

This proposal still avoids broad Wave 012 placeholder/debug cleanup and Wave 013 docs/spec reconciliation. It only touches the debug/example surface because it directly blocks a truthful Wave 011 UI-to-operation gate.


## Round-01 blocker corrections incorporated

This proposal was corrected after `reviews/round-01-review.md` to remove ambiguity from the validation contract and source-cleanup scope:

- **Executable lint/static gate:** root `npm run lint` must delegate to a real frontend command, and frontend lint must either gain minimal ESLint dependencies/config or be replaced by the installed `vue-tsc --noEmit` static gate. The current missing `eslint` executable may not remain as classified residual debt, and no no-op lint script is allowed.
- **Root/frontend validation contract:** the command table now states the exact root and frontend `lint`, `test`, `build`, `test:e2e`, and `test:architecture` surfaces after backend deletion. Restructure explicitly adds root `test:e2e` as a transparent delegation to `npm run test:e2e --workspace=frontend` so the root cadence is directly executable.
- **ExamplesMenu leak handling:** this proposal does not keep an allowlist. It requires either deleting the debug examples path or moving command construction behind an application use case before enforcing the strict UI boundary. The selected cleanup is the only Wave 012-adjacent source change allowed in Wave 011.
- **Validation debt scope:** stale backend Playwright comments are required deletes, Node 24/`vue-tsc`, intersections, and broad e2e failures must be remediated only when narrowly validation-gate-related or classified with exact output, and unrelated Wave 012/013 cleanup remains excluded.

## Why the fix belongs higher than test additions

Architecture tests should express the intended architecture, not memorize known exceptions. Current evidence shows one active component still violates the post-Wave-006 UI command boundary:

- `ExamplesMenu.vue` imports `Command`, `AddExampleSetupOp`, and `CommandStack` (`frontend/src/components/menus/ExamplesMenu.vue:50-55`).
- It injects `world` and `commandStack` directly (`frontend/src/components/menus/ExamplesMenu.vue:57-58`).
- It constructs, executes, commits, and pushes a command from the component (`frontend/src/components/menus/ExamplesMenu.vue:70-75`).

If Wave 011 adds a UI import-boundary test while preserving that component via allowlist, the project gets a weaker validation contract at the exact boundary the wave is supposed to harden. Because the project priorities prefer clean architecture and deletion over compatibility, this proposal removes or moves the blocker before freezing the rule.

## Concrete validation command contract after Wave 010

Wave 011 must leave the validation command surface below. Root commands are delegators to the single active frontend workspace; frontend commands are the executable implementations.

| Command surface | Required Wave 011 state |
| --- | --- |
| Root `npm run lint` | Delegates to `npm run lint --workspace=frontend` and must execute a real frontend static gate. It must not call a missing binary and must not be `true`, `echo`, or `|| true`. |
| Frontend `npm run lint --workspace=frontend` | Make the existing lint contract truthful by adding/restoring minimal ESLint dependencies/config **or** replacing it with the installed TypeScript static gate `vue-tsc --noEmit`. Restructure prefers a real ESLint setup if the dependency/config addition is small, because a first-class validation contract should preserve the semantic meaning of `lint`; if that expands scope, use `vue-tsc --noEmit` and rename/describe the command in `implementation-log.md` as the project’s static lint gate. |
| Root `npm run test` | Remains `npm run test --workspace=frontend`; full Vitest failures from pre-existing intersections debt are classified with exact files/errors if still red. |
| Frontend `npm run test --workspace=frontend` | Remains `vitest run`; full-suite failures are classified unless caused by Wave 011 changes. |
| Root `npm run build` | Remains `npm run build --workspace=frontend`; Node 24/`vue-tsc` debt is remediated if small and tooling-scoped, otherwise classified exactly. |
| Frontend `npm run build --workspace=frontend` | Remains the active frontend build command; no backend build command is reintroduced. |
| Root `npm run test:e2e` | **Add a root e2e alias** `test:e2e` -> `npm run test:e2e --workspace=frontend` in this restructure proposal. The project objectives name root/workspace validation cadence, and this proposal makes the root contract explicit rather than relying on implementation-log explanation. |
| Frontend `npm run test:e2e --workspace=frontend` | Remains the sole implementation e2e entrypoint; the root alias delegates here. Broad e2e syntax debt is classified unless Wave 011 touches the affected file or the failure blocks the focused Wave 010 guard/examples smoke. |
| Root `npm run test:architecture` | Add this alias to delegate to `npm run test:architecture --workspace=frontend`. |
| Frontend `npm run test:architecture --workspace=frontend` | Add `vitest run tests/unit/architecture` as the focused architecture gate. |

The implementation must select and document one executable lint/static path before changing tests:

1. **Preferred restructure path:** add minimal ESLint dependency/config so `frontend/package.json`'s lint script remains semantically a lint command and runs with installed tooling.
2. **Allowed fallback:** replace `lint` with `vue-tsc --noEmit` or equivalent installed static checker if ESLint config would cause broad unrelated style churn. If this fallback is selected, no no-op script is allowed and the implementation log must explicitly state that `lint` currently means the supported TypeScript static gate.

Either path must remove the current missing executable failure. “Classify `eslint: not found` if still red” is not an acceptable result.

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

Choose one during implementation based on quick usage evidence, with deletion preferred. This choice is the only Wave 012-adjacent source cleanup allowed in Wave 011; do not broaden into unrelated debug/placeholder deletion.

#### Option A — Delete debug example menu path

- Delete `frontend/src/components/menus/ExamplesMenu.vue` if static search shows it is debug/non-essential and not part of current user-facing flows.
- Delete `frontend/src/commands/operations/debug/AddExampleSetupOp.ts` and any `frontend/src/commands/operations/debug/` directory if this operation is only used by the menu.
- Remove the menu from its parent component(s) and tests/e2e references.
- Delete tests/fixtures that reference the examples menu or debug setup operation.
- Focused validation must include a static scan proving no source/test/doc fixture still references the deleted examples/debug setup surface.

#### Option B — Move example setup behind application use case

Only if review decides the examples menu is a real user-facing feature worth retaining in Wave 011:

- Add `frontend/src/application/examples/ExampleSetupUseCases.ts` or similar to own `Command`, `CommandStack`, and `AddExampleSetupOp` construction.
- Change `ExamplesMenu.vue` to emit/select example setup intents and call the application use case through a typed injection/prop; it must not import command/operation classes or inject raw `CommandStack`.
- Keep `AddExampleSetupOp` only if it remains an application-owned implementation detail. Otherwise delete it.
- Add focused tests/static scans proving `ExamplesMenu.vue` no longer imports command/operation/CommandStack symbols; if this cannot be done narrowly, fall back to Option A deletion rather than allowlisting.
- Focused validation must include a component/use-case test proving the menu no longer imports command surfaces plus the strict UI architecture gate.

### Package/script/config changes

- Root `package.json`:
  - keep only the active `frontend` workspace (`package.json:7-9`);
  - add `test:architecture` delegating to frontend;
  - add `test:e2e` delegating to frontend so the mandatory root cadence has an explicit root entrypoint after backend deletion;
  - do not add backend validation because backend was deleted in Wave 010.
- `frontend/package.json`:
  - add `test:architecture`;
  - make `lint` executable and truthful by adding minimal ESLint dependencies/config or replacing it with `vue-tsc --noEmit`; no missing executable and no no-op script are allowed.
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

Do **not** delete README-only operation placeholder directories, broad debug logging, or broad docs/spec references in this wave unless they are directly part of the selected example menu cleanup. Those remain Wave 012/013.

## Expected behavior change

- If Option A is selected: the Examples menu/debug setup affordance disappears. This is acceptable if the menu is classified as debug-only; no compatibility shim should remain.
- If Option B is selected: user-visible Examples menu behavior remains, but command construction moves out of the component into an application use case.
- Developer/validation behavior:
  - architecture tests enforce a strict no-UI-command-import rule with no residual allowlist;
  - full-domain import boundaries are tested;
  - frontend/backend deleted-backend rules are centralized in architecture tests;
  - root/frontend scripts include focused architecture validation;
  - root scripts include an explicit e2e alias delegating to the active frontend workspace;
  - lint is executable and truthful; the current missing-ESLint failure is gone;
  - stale backend Playwright comments are removed.

## Validation plan

Capture all logs under `architecture-audit/cycle-011-architecture-tests-validation-gates/validation/`.

1. Static scans:
   - no `frontend/src/domain/**` imports from forbidden outer layers;
   - no `frontend/src/components/**` imports from `@/commands/**`, command factories, operations, or `CommandStack`, with no allowlist;
   - no frontend imports from `backend/src/**` and no stale backend project terms except the Wave 010 negative e2e guard;
   - if Option A is selected, no references to `ExamplesMenu.vue`, `AddExampleSetupOp`, or debug example setup remain outside the implementation log/proposal artifacts;
   - if Option B is selected, `ExamplesMenu.vue` imports only application-facing use-case/injection surfaces, not command/operation classes.
2. Focused architecture tests:
   - root: `npm run test:architecture`;
   - frontend: `npm run test:architecture --workspace=frontend`.
3. Focused tests for source cleanup:
   - if deleting examples/debug path, run static scans proving deleted files are absent and no source/tests reference them;
   - if moving examples, run new focused application example use-case tests plus a component test if present.
4. Focused app-shell tests:
   - `npx vitest run tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts` from `frontend/` or equivalent workspace invocation;
   - `npx playwright test tests/e2e/wave010-app-shell-project-flow.spec.ts` from `frontend/` or equivalent workspace invocation.
5. Mandatory cadence:
   - root: `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`;
   - frontend workspace: `npm run lint --workspace=frontend`, `npm run test --workspace=frontend`, `npm run build --workspace=frontend`, `npm run test:e2e --workspace=frontend`;
   - lint must no longer fail because `eslint` is missing. If lint fails, it must fail from the selected real checker and be classified/remediated with exact output;
   - full root/frontend Vitest may still expose existing intersections debt and must be classified if not caused by Wave 011;
   - root/frontend build may still expose Node 24/`vue-tsc` debt and must be classified if not caused by Wave 011;
   - root/frontend e2e may still expose broad syntax debt and must be classified unless directly affected by the examples cleanup.
6. Live app verification:
   - refresh preview on `0.0.0.0` and probe `http://127.0.0.1:5173/`;
   - run a Playwright smoke covering startup and, if retained, examples menu behavior. If examples are deleted, the smoke should assert there is no dead affordance/reference.

## Known debt classification/remediation strategy

- **Lint/static gate:** Remediate in Wave 011. The current `eslint: not found` state is not acceptable as classified residual debt because it makes a declared validation command non-executable. Prefer minimal ESLint dependencies/config; fall back to `vue-tsc --noEmit` if ESLint expands scope.
- **Build/vue-tsc:** Remediate if a dependency update/config pin is low-risk and directly tooling-scoped; otherwise classify as pre-existing debt.
- **Full Vitest intersections failures:** Classify as pre-existing geometry correctness debt unless source cleanup causes new failures.
- **E2E syntax corruption:** Because this proposal may touch/remove a UI affordance and adds a root e2e alias, repair or delete directly affected e2e references. Do not rewrite unrelated corrupted e2e files unless necessary to make the e2e command parse and reviewers accept it as validation-gate debt.
- **Wave 012/013 overreach guard:** Only the selected `ExamplesMenu.vue`/debug operation cleanup is allowed here because it directly blocks the strict UI boundary. Leave unrelated placeholders/debug docs for Wave 012 and broad docs/spec reconciliation for Wave 013.

## Risks

- Deleting `ExamplesMenu.vue` may remove a user-visible convenience. Mitigation: first verify usage/imports and choose Option B if it is genuinely part of accepted behavior.
- Moving examples behind a use case risks overlapping Wave 012 debug cleanup. Mitigation: keep the change narrow; only address the UI-to-command leak needed for a strict architecture test.
- Making lint executable could reveal many style issues unrelated to Wave 011. Mitigation: configure lint as a static correctness/architecture gate without automatic broad formatting churn, or use the supported TypeScript static gate and classify residual style lint as future work.
- Strict UI boundary tests could block future application composition if too broad. Mitigation: define allowed command imports by layer (`frontend/src/application/**`), not by arbitrary file names.
- Adding root `test:e2e` changes the root command surface. Mitigation: make it a transparent delegation to the already-active frontend workspace and validate both root and frontend invocations.

## Recommendation

Prefer this proposal if reviewers agree that `ExamplesMenu.vue` is debug-only or easily moved. Otherwise choose Proposal Direct with its explicitly temporary single-file allowlist and require Wave 012 to delete or migrate the examples/debug surface before it can become permanent validation debt.
