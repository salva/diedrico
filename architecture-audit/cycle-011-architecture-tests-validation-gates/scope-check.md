# Wave 011 Scope Check — Architecture tests and root validation gates

## Verdict

Wave 011 can proceed without editing `architecture-audit/wave-plan.md`.

The Wave 011 premise still holds after Wave 010, but its exact target changed in one important way: the backend is no longer an active workspace. Root validation should therefore be made truthful for the single active `frontend` workspace rather than re-adding backend coverage. Wave 010 removed the backend workspace from root `workspaces`, leaving only `frontend` (`package.json:7-9`), and the Wave 010 implementation log records deletion of the entire `backend/` workspace and the stale `OpenProjectDialog.vue` frontend/backend import surface (`architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`, “Deleted legacy surfaces”).

Wave 011 should tighten guardrails around the boundaries established by Waves 001–010 and make validation commands explicit about known red gates. It should not perform Wave 012 debug/placeholder cleanup or Wave 013 broad docs/spec reconciliation.

## Current root/workspace validation state

- Root scripts delegate only to the active frontend workspace: `build`, `test`, and `lint` all run `--workspace=frontend` (`package.json:13-16`). This is now consistent with the single active workspace after backend deletion (`package.json:7-9`).
- The frontend still exposes the mandatory command surfaces: `build` is `vue-tsc && vite build`, `test` is `vitest run`, `test:e2e` is `playwright test`, and `lint` invokes `eslint ... --fix` (`frontend/package.json:8-15`).
- The frontend manifest does not list `eslint` in `devDependencies` (`frontend/package.json:25-39`), matching the known Wave 010 lint failure classification: `eslint: not found` (`architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`, “Mandatory cadence attempted”).
- The frontend build still uses `vue-tsc` (`frontend/package.json:8`) and Wave 010 classified the current Node 24 / `vue-tsc` incompatibility as pre-existing validation debt (`architecture-audit/cycle-010-backend-frontend-project-contract/implementation-log.md`, “Mandatory cadence attempted”).
- Full Vitest remains blocked by pre-existing intersection expectation failures in `frontend/tests/unit/calculations/intersections.spec.ts`; that file asserts line-line behavior in many cases (`frontend/tests/unit/calculations/intersections.spec.ts:28-220`), and Wave 010 logged 10 existing line-line intersection failures as not attributable to backend deletion.
- Full e2e remains blocked by corrupted broad e2e files. `frontend/tests/e2e/keyboard-shortcuts.spec.ts:267` contains concatenated reversed code fragments before a second import block at `frontend/tests/e2e/keyboard-shortcuts.spec.ts:280`, matching the Wave 010 syntax-failure classification. Wave 010 also classified `frontend/tests/e2e/selection-mask.spec.ts` as syntactically corrupted; the inspected excerpt reaches a valid ending at `frontend/tests/e2e/selection-mask.spec.ts:240-259`, so the corruption may be earlier in the file and should be verified during implementation rather than assumed fixed.
- Playwright still carries stale backend comments in configuration: `frontend/playwright.config.ts:46-53` comments out a backend webServer that no longer exists. This is directly relevant to truthful validation gates and can be deleted in Wave 011 without broader docs/spec cleanup.

## Existing architecture test coverage

Current architecture tests are useful but fragmented and implementation-specific:

- `frontend/tests/unit/architecture/worldBoundary.spec.ts` checks only `src/domain/world/World.ts` import lines for application/commands/services/UI/stores/persistence imports (`frontend/tests/unit/architecture/worldBoundary.spec.ts:3-31`). It does not scan the rest of `frontend/src/domain/**`, so domain-to-command/service regressions outside `World.ts` are not guarded.
- `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts` scans active source/tests for deleted legacy duplicate-geometry path terms: `worldStore`, `useWorldStore`, `Workspace2D`, `ElementRenderer`, `ElementTypes`, `useSnapping`, `useElementGeometry`, and `getWorld` (`frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:3-12`, `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:40-50`). This directly enforces Wave 003 but should be moved into a shared architecture scanner so future boundary rules are consistent.
- `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` uses a shell `grep` via `execSync` (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:24-51`) and then intentionally swallows non-architectural command failures by warning and passing (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:99-107`). That makes it weaker than a deterministic Vitest-native file scanner.
- The Wave 010 frontend/backend guard currently lives in `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` rather than the architecture test directory. It scans frontend source/tests with `import.meta.glob` (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:13-23`), forbids frontend imports of `backend/src` (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-46`), and checks stale backend route/DTO/dialog terms (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:48-50`). This guard should be promoted/merged into architecture tests so boundary tests are centralized.
- Static scan evidence found only two active frontend/backend project API strings, both in the Wave 010 e2e guard where they deliberately fail stale backend requests (`frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts:7-21`). Any Wave 011 backend-route rule must allow this intentional negative-test pattern or move it into a named allowlist.

## Boundary evidence after Waves 001–010

### Domain-to-command/service imports

A static scan found no current imports from `frontend/src/domain/**` into commands, services, application, components, stores, or persistence (`architecture-audit/cycle-011-architecture-tests-validation-gates/static-scout-scans.stdout`, “domain importing commands/services/application/components/stores/persistence”). `World.ts` is guarded today (`frontend/tests/unit/architecture/worldBoundary.spec.ts:3-31`), but the rest of the domain is not.

### UI-to-operation imports

The main canvas/tool/panel/toolbar command leaks were addressed by earlier waves into application use cases, but one active component still directly constructs command operations: `frontend/src/components/menus/ExamplesMenu.vue` imports `Command`, `AddExampleSetupOp`, and `CommandStack` (`frontend/src/components/menus/ExamplesMenu.vue:50-55`), injects `world` and `commandStack` (`frontend/src/components/menus/ExamplesMenu.vue:57-58`), creates a `Command`, executes `AddExampleSetupOp`, commits, and pushes it (`frontend/src/components/menus/ExamplesMenu.vue:70-75`).

This is probably Wave 012 debug/example cleanup or a small prerequisite exception decision, not a reason to broaden Wave 011 into application refactoring. Wave 011 can either:

1. add architecture rules that forbid UI command/operation imports except a documented temporary allowlist for `ExamplesMenu.vue`, or
2. include deletion/replacement of the debug example menu as part of validation-truthfulness if reviewers judge it directly blocks a truthful architecture gate.

The scope guard recommends option 1 for the direct proposal and option 2 for the restructure proposal.

### Application-to-command imports

Application use cases intentionally own command construction after earlier waves. Examples include `ConstructionUseCases.ts` importing `Command`, command sequence factories, and concrete operations (`frontend/src/application/construction/ConstructionUseCases.ts:1-21`), canvas movement/style use cases importing `Command` and concrete operations (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:1-6`; `frontend/src/application/canvas/CanvasStyleUseCase.ts:1-5`), selection use cases importing deletion command construction (`frontend/src/application/appShell/SelectionUseCases.ts:1-5`), and initialization living in `frontend/src/application/world/initializeWorld.ts` with command/process operations (`frontend/src/application/world/initializeWorld.ts:1-7`). Architecture rules must permit these application-layer imports and should target UI/domain boundaries, not all command imports globally.

### Duplicate geometry ownership

The existing architecture test enumerates and scans deleted duplicate geometry path terms (`frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:3-12`, `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:40-50`). A static scan found no active references outside that test (`architecture-audit/cycle-011-architecture-tests-validation-gates/static-scout-scans.stdout`, “legacy duplicate geometry/state terms”). This boundary can be retained but should be implemented with shared scanner helpers and clearer allowlists.

### Forbidden frontend→backend imports / persistence contract

Wave 010 made frontend app-shell/project persistence the active stance and deleted backend. Root workspaces now list only `frontend` (`package.json:7-9`), while AppShellRuntime creates `ProjectService` and optional `GoogleDriveService` inside the frontend application shell (`frontend/src/application/appShell/AppShellRuntime.ts:21-35`). The existing Wave 010 guard forbids imports of backend implementation files and stale project API assumptions (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-50`). This rule belongs in Wave 011 architecture tests.

### App-shell keyboard/runtime boundaries

Wave 009/Wave 010 app-shell guards remain active in `AppShellBoundary.test.ts`: App.vue must stay free of moved shell orchestration imports and browser bridges (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:25-29`), Toolbar/StartupDialog should stay passive for global browser events (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:31-34`), and app-shell modules should not import Vue components (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:36-40`). `KeyboardShortcutRouter.test.ts` verifies that Ctrl/Cmd+O uses `showStartupProjectChooser` after the Wave 010 rename (`frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts:17-27`). These should remain focused app-shell tests, but Wave 011 can centralize generic import-boundary scanner helpers so they are consistent with architecture tests.

### Rendering selectors/adapters

Rendering selector/adapters from Wave 007 are not yet directly guarded by current architecture tests. Wave 011 should add targeted import-boundary tests only where the boundary is already established and stable; it should not broaden into renderer refactoring.

## Remaining waves re-ranked after Wave 010

1. **Wave 011 — Tighten architecture tests and root validation gates.** Still central because it freezes Waves 001–010 before further cleanup/refactoring and makes red validation debt explicit.
2. **Wave 012 — Remove vacant placeholders, noisy debug surfaces, and obsolete operation docs.** Still next because `ExamplesMenu.vue` and debug/example command surfaces intersect with a truthful UI-to-operation architecture gate, but should not be folded into Wave 011 unless chosen by reviewed restructure.
3. **Wave 013 — Reconcile docs/specs with the cleaned architecture.** Still last because broad docs/spec cleanup should describe the final post-wave architecture, not an intermediate validation-gate state.

No plan edit is required because Wave 011 remains exactly the next central wave and the backend deletion only resolves the backend-workspace premise by removing `backend/package.json` from scope.

## Scope exclusions for Wave 011

- Do not refactor application command construction; application use cases are the allowed command-construction layer after prior waves.
- Do not perform broad debug/log cleanup, placeholder operation deletion, or `ExamplesMenu.vue` deletion unless the reviewed restructure proposal explicitly selects it as necessary to make UI-to-operation gates truthful.
- Do not perform broad docs/spec reconciliation. Only remove/update validation-command comments/docs that would otherwise make gates false, such as stale backend webServer comments in Playwright config.
- Do not fix domain geometry behavior beyond classification of pre-existing Vitest debt; Wave 011 is about validation gates and architectural tests.
