# Proposal Direct — Add a Narrow Wave 015 for Build/Type-Contract Ownership

**Stage:** `cycle-014-build-contract-plan-edit-scout`  
**Proposal kind:** smallest reviewed plan-edit path.  
**Source-code changes proposed in this scout:** none.

## Recommendation

Do **not** extend Wave 014 implementation in-place. Add a new immediately following plan entry, **Wave 015 — Restore TypeScript/build contract ownership**, then run its normal scout/review/decision/implementation/validation cycle. Wave 014's scoped repairs remain committed and should not be reverted. Wave 014 final validation/preview closure resumes only after Wave 015 restores the active build gate.

This is the smallest safe path because the current failure is not the original invalid `vue-tsc` runtime abort. The build log shows broad real TypeScript errors after `vue-tsc` was updated, spanning app shell, command factories, command operations, process-tree types, projection-plane/world contexts, UI panels/toolbars/workspace rendering, services, stores, and domain world modules. Fixing that backlog inside Wave 014 would exceed the reviewed implementation file list and violate the stop rule recorded in `architecture-audit/cycle-014-validation-contract-ownership/decision.md`.

## Proposed wave-plan edit

Insert this entry after Wave 014 and before any subsequent refactor wave:

### Wave 015 — Restore TypeScript/build contract ownership

**Scope**

- Active frontend build contract: `frontend/package.json` script `build = vue-tsc && vite build` and root build only as needed to call the same active workspace gate.
- TypeScript configuration and ambient typing only where needed to make the existing active build contract express real source ownership; no alternate build scripts, allowlists, or broad type suppression.
- Build-failing modules evidenced by `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout`:
  - app shell/env/auth port: `frontend/src/App.vue`, app/service auth port definitions and Vite env typing if present/needed.
  - command descriptor/factory/operation contracts: `frontend/src/commands/factories/**`, `frontend/src/services/factories/**`, `frontend/src/commands/operations/**`, operation descriptor/serialization types.
  - process-tree action contracts: `frontend/src/domain/processTree/**`, `frontend/src/stores/processStore.ts`, `frontend/src/components/panels/Action*.vue`, `frontend/src/components/panels/ProcessTreeNode.vue`, process-tree operations.
  - projection-plane/world context contracts: `frontend/src/domain/world/World.ts`, `frontend/src/domain/world/projectionPlane/**`, element `realize2D` context types, world operations that pass `World` to projection-plane methods.
  - UI/store/rendering contracts surfaced by the build: `frontend/src/components/dialogs/**`, `frontend/src/components/toolbars/**`, `frontend/src/components/workspace/SvgCanvas.vue`, hover/view stores, rendering primitive DTOs.
  - service/domain strictness surfaced by the build: `frontend/src/services/**`, `frontend/src/composables/**`, `frontend/src/domain/calculations/**`, `frontend/src/domain/world/{Circle,Line,Segment}.ts`.
- Focused tests for any behavior-bearing contract touched to make the build green.

**Target outcome**

The repository has one honest frontend TypeScript/build contract. `npm run build --workspace=frontend` and the root build path that delegates to it execute `vue-tsc && vite build` without TypeScript errors, without skip/todo/allowlist files, without alternate `tsc`/`vue-tsc` bypasses, and without weakening `strict`/unused checks to hide source problems. Type repairs are owned by the modules whose contracts drifted: app shell ports, command descriptors, process-tree actions, projection-plane/world contexts, UI rendering/store DTOs, and services.

**Explicit DELETE list**

- Delete stale imports of removed exports (`ConstructiveAction`, `ActionType`, `Plane3DCoordinateSystem`, wrong-cased calculation imports, missing `ProjectService.projectService`, stale backend/domain DTO imports if encountered in the build path).
- Delete stale UI references to removed fields/APIs (`Action.id`, `Action.infeasible`, `Action.actionType`, `Action.timestamp`, `ProcessNode.name` where not common, `ProjectionPlane.getArc`, `Primitive.geometry`, obsolete tool-store methods such as `clearTool`/`setActiveTool`) rather than reintroducing compatibility fields solely for build success.
- Delete invalid serialization fields in operation classes (for example `circleId`/`tangentIndex` on parallel/perpendicular line operations) and stale operation descriptor shapes that do not represent current command data.
- Delete CommonJS `require` usage from frontend source; replace with typed ESM imports or remove the dead branch that requires it.
- Delete dead helper code or tests whose only purpose is to preserve stale type surfaces revealed by the build.
- Delete any new suppressions (`// @ts-ignore`, blanket `as any`, `skipLibCheck`/strictness downgrades, custom allowlists, alternate build scripts) introduced merely to make `vue-tsc` pass.

**Success criteria**

- `npm run build --workspace=frontend` succeeds with the existing `vue-tsc && vite build` contract.
- Root `npm run build` succeeds if defined and delegates consistently to active workspaces; if root build does not exist, the implementation log records that fact and the frontend build evidence.
- No TypeScript config or package script change reduces type safety, hides unused-code errors, or creates a second build path.
- Each build-failure category in the Wave 014 after5 log is either fixed, deleted as stale/dead, or explicitly moved to a reviewed residual only if it is unreachable by the active build. Residuals cannot be build errors.
- Focused tests cover behavior-bearing fixes in command descriptors/process-tree/projection-plane contexts/rendering-service boundaries; pure type/import deletions are covered by the successful build.
- The implementation log includes a build-error ownership map mapping each original category to the module boundary that fixed/deleted it.
- No committed Wave 014 scoped repair is reverted unless a direct causal link to a specific build error is proven and documented.

**Validation plan**

1. Re-run `npm run build --workspace=frontend` before implementation and capture the current error list under Wave 015 validation logs.
2. Run focused Vitest for any behavior-bearing module touched: command descriptor/factory operations, process-tree actions/panels, projection-plane/world context behavior, App/auth/env service adapters, rendering DTO adapters, and service persistence/Drive changes as applicable.
3. Run `npm run lint --workspace=frontend` and root lint where defined.
4. Run frontend full Vitest and root test where defined.
5. Run `npm run build --workspace=frontend` and root build where defined; both must pass or the wave fails.
6. Because frontend source/UI/service contracts may change, run frontend e2e and root e2e where defined. If a touched category is proven non-user-observable and e2e is skipped, the implementation log must justify it explicitly, but build closure itself cannot be skipped.
7. Refresh the live preview on `0.0.0.0:5173`, capture an HTTP 200 probe, and perform at least one Playwright MCP/live smoke through the app shell after build success.

**Risks**

- The error list is broad enough that a small type-only patch could become arbitrary cleanup. Bound implementation to errors emitted by the current `vue-tsc` build and their direct dependencies.
- Some fixes may reveal deeper architecture choices, especially the `World` versus `ProjectionPlaneMutationContext` contract and process-tree `Action` model. If a category requires conceptual redesign beyond making the existing build contract honest, stop for a mini-cycle rather than inventing compatibility shims.
- UI rendering errors in `SvgCanvas.vue` may tempt a rendering wave. Keep Wave 015 to build-contract alignment; defer non-build rendering architecture improvements to existing rendering waves unless necessary for compilation.
- Changing process-tree or command descriptor shapes may affect persistence/undo behavior; behavior-bearing changes require focused tests.

**Dependencies**

- Depends on Wave 014 implementation commits because they update `vue-tsc` to a supported version and reveal the real build backlog.
- Must complete before `cycle-014-validation-and-preview-refresh`, because Wave 014 success criteria require root/frontend build success and live preview refresh.

## Return-to-Wave-014 closure plan

After Wave 015 passes build validation, do **not** mark Wave 014 complete automatically. Return to the Wave 014 validation-and-preview-refresh stage and run the full mandatory Wave 014 cadence against the source tree containing both Wave 014 scoped validation repairs and Wave 015 build/type-contract repairs:

- root/frontend lint where defined;
- focused and full Vitest;
- root/frontend build;
- root/frontend e2e/Playwright;
- live preview refresh on `0.0.0.0:5173` with HTTP reachability probe;
- Playwright MCP/live checks for the repaired keyboard-shortcut and selection-mask flows.

Wave 014 implementation log should then be amended only in its validation/preview closure section, not rewritten to pretend the build backlog was part of the original scoped repair.

## Anti-overreach boundaries

- Do not implement Wave 015 during this scout/review stage.
- Do not edit `architecture-audit/wave-plan.md` until this plan edit has been reviewed and decided.
- Do not reintroduce deleted/stale APIs as compatibility shims just to satisfy old call sites; prefer deleting stale call sites or aligning them to current authoritative contracts.
- Do not weaken TypeScript configuration, suppress errors, skip `vue-tsc`, split the build into a non-typechecked build path, or add allowlists.
- Do not pull unrelated architecture improvements forward unless directly required to eliminate a current build error.
