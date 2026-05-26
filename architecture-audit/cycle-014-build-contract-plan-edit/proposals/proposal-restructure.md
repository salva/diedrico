# Proposal Restructure — Treat the Blocker as a Type-Contract Architecture Wave

**Stage:** `cycle-014-build-contract-plan-edit-scout`  
**Proposal kind:** evaluate whether the correct fix is a broader type-contract architecture wave.  
**Source-code changes proposed in this scout:** none.

## Recommendation

Create a new Wave 015, but frame it as an architecture-owned **type-contract convergence wave**, not merely a checklist of `vue-tsc` errors. The direct proposal is acceptable if interpreted as a narrow plan edit; this restructure proposal is stronger because the error categories reveal boundary contracts that are inconsistent across layers:

- app shell service ports and browser env typing;
- command descriptor/factory/operation serialization contracts;
- process-tree action/action-group model exposure;
- projection-plane/world mutation and realization contexts;
- rendering/store DTOs consumed by UI components;
- service/domain nullability and import ownership.

Those are architectural contracts. A successful wave should leave each major boundary with an explicit owner and delete stale call sites rather than scatter local casts until `vue-tsc` turns green.

## Proposed Wave 015 framing

### Wave 015 — Converge frontend TypeScript contracts around owned boundaries

**Scope**

This wave is bounded to the active TypeScript build backlog produced by `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout` and direct dependencies required to make those errors honest. It may touch source/tests/package metadata only where needed to converge the following boundaries:

1. **App shell and service-port boundary**
   - `frontend/src/App.vue`
   - auth/project/Drive service port definitions and Vite ambient env typing if present/needed
   - app lifecycle tests where behavior changes

2. **Command descriptor and operation boundary**
   - `frontend/src/commands/factories/**`
   - `frontend/src/services/factories/**`
   - `frontend/src/commands/operations/**`
   - operation descriptor/result/serialization types
   - focused command/factory/serialization tests

3. **Process-tree action boundary**
   - `frontend/src/domain/processTree/**`
   - process-tree command operations
   - process store and panels that render action/process-node data
   - focused process-tree/panel tests where behavior changes

4. **Projection-plane/world context boundary**
   - `frontend/src/domain/world/World.ts`
   - `frontend/src/domain/world/projectionPlane/**`
   - 2D element realization signatures and mutation/realization context ports
   - world operations that add/remove/realize projection-plane elements
   - focused domain tests for projection-plane context behavior

5. **UI rendering/store DTO boundary**
   - `frontend/src/components/dialogs/**`
   - `frontend/src/components/toolbars/**`
   - `frontend/src/components/workspace/SvgCanvas.vue`
   - hover/view/tool stores and rendering primitive DTO definitions
   - focused component/rendering tests where behavior changes

6. **Service/domain strictness cleanup required by build**
   - `frontend/src/services/**`
   - `frontend/src/composables/**`
   - `frontend/src/domain/calculations/**`
   - `frontend/src/domain/world/{Circle,Line,Segment}.ts`

The wave must not use this scope as permission for arbitrary refactoring outside the build backlog. If a file has no current `vue-tsc` error and is not a direct dependency of a build-error fix, leave it for the existing ordered waves.

**Target outcome**

The frontend source tree compiles because cross-layer contracts are explicit and owned, not because errors were hidden. Each of the six boundaries above has a concise ownership note in the implementation log describing:

- authoritative types/interfaces after the wave;
- stale exports, fields, or call sites deleted;
- tests that protect behavior-bearing changes;
- residual architectural questions deferred to later waves.

The result is a trustworthy `vue-tsc && vite build` gate that future architecture waves can rely on.

## Explicit DELETE list

The wave should aggressively delete stale surfaces proven by the build log, including but not limited to:

- removed action model exports and call sites: `ConstructiveAction`, `ActionType`, stale `Action.id`, `Action.infeasible`, `Action.infeasibilityReason`, `Action.actionType`, `Action.timestamp` assumptions.
- stale process-node field reads (`inputs`, `outputs`, `name`) where the current discriminated node model does not guarantee them.
- stale command operation serialization fields that are not owned by the class (`circleId`/`tangentIndex` on parallel/perpendicular line operations).
- stale `JsonValue | undefined` descriptor plumbing where a typed descriptor or validation guard is the correct boundary.
- stale service singleton imports such as `projectService` where only `ProjectService` is exported.
- wrong-cased or removed imports such as `../domain/calculations/intersections`, `Plane3DCoordinateSystem`, and `Element2D` from the wrong module.
- stale renderer/store API reads such as `ProjectionPlane.getArc`, `Primitive.geometry`, missing hover `temporary`, and removed tool-store methods.
- frontend CommonJS `require` usage.
- compatibility wrappers, synthetic fields, casts, broad `any`, `@ts-ignore`, `@ts-expect-error`, custom build allowlists, alternate build scripts, or TypeScript config relaxations added only to force build success.

## Anti-overreach constraints

This wave must avoid becoming a catch-all cleanup wave:

- **Build-log bound:** Only fix errors from the current `vue-tsc` build and direct dependencies that emerge while fixing them. Do not sweep unrelated TODOs, comments, naming, formatting, or architecture issues.
- **Boundary-first:** For repeated errors in one category, fix the owner contract once. Example: resolve `ProjectionPlaneMutationContext` versus `World` coherently instead of casting every operation call site.
- **No compatibility theater:** Do not add removed fields back to domain models solely for stale UI/store code. Align UI/store code to the current model or delete stale UI paths if static search proves they are dead.
- **No suppression:** Do not weaken `tsconfig`, disable strict/unused checks, introduce blanket `as any`, add ignore comments, or create a parallel build path.
- **Stop for deeper redesign:** If a category requires a conceptual redesign beyond the build contract—for example a new rendering selector architecture, command/undo persistence redesign, or process-tree data model replacement—stop and write a mini-cycle proposal. Do not smuggle a later wave under Wave 015.
- **Preserve Wave 014 repairs:** Do not revert Wave 014 scoped validation repairs unless a specific build error is causally traced to a specific repair and the replacement remains within reviewed scope.

## Success criteria

- `npm run build --workspace=frontend` passes using the existing `vue-tsc && vite build` script.
- Root build passes where defined; if root build is absent or delegates differently, implementation log records the exact root command status.
- All six build-failure boundary categories in `scope-check.md` are represented in the implementation ownership map, with explicit fixed/deleted/residual status. Residual status cannot include active TypeScript build errors.
- No type-safety downgrade, parallel build script, allowlist, ignore comment, or compatibility shim is introduced to silence `vue-tsc`.
- Focused tests cover behavior-bearing changes in command/operation descriptors, process-tree action rendering, projection-plane/world context semantics, app/service ports, and rendering/store DTOs. Pure dead-import/dead-call-site deletions may rely on build plus existing tests.
- The implementation log records any architectural issues discovered that should become future waves, without expanding Wave 015 beyond build-contract ownership.

## Validation requirements

Minimum validation for Wave 015:

1. Capture a fresh failing `npm run build --workspace=frontend` before edits to ensure the backlog has not changed.
2. Run focused Vitest for every behavior-bearing boundary changed.
3. Run `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
4. Run root and frontend full Vitest.
5. Run root and frontend build; build success is mandatory.
6. Run frontend e2e and root e2e where defined because UI/app/service/rendering contracts may change.
7. Refresh live preview on `0.0.0.0:5173`, capture HTTP 200, and run Playwright MCP/live smoke through project creation/rendering/selection enough to prove the compiled app starts.

All stdout/stderr must be captured under the Wave 015 validation directory. If any command is undefined at root, record the exact package-script evidence instead of silently skipping.

## Risks and mitigations

- **Risk: superficial casts pass build but worsen architecture.** Mitigation: reviewer should reject casts/suppressions unless they are local, typed, and justified by a boundary contract; implementation log must map categories to owner contracts.
- **Risk: projection-plane/world context needs a larger domain wave.** Mitigation: choose the smallest coherent context contract for compilation; if that cannot be done without changing geometric behavior broadly, stop for a mini-cycle.
- **Risk: process-tree UI is stale/dead and could waste effort.** Mitigation: static-search usage before preserving any panel/store path; delete dead paths rather than rebuilding obsolete fields.
- **Risk: command descriptor fixes alter persistence/undo.** Mitigation: run focused command serialization/undo tests for touched operations and e2e if user-visible flows change.
- **Risk: Wave 015 delays Wave 014 closure.** Mitigation: Wave 015 exists only because Wave 014 cannot honestly close without build success; after Wave 015, immediately return to Wave 014 validation/preview rather than continuing to later waves.

## Dependency and return-to-Wave-014 plan

Wave 015 depends on Wave 014's committed scoped repairs and `vue-tsc` update. It is a corrective plan-edit wave inserted solely to restore the build contract required by Wave 014 validation.

After Wave 015 completes:

1. Do not proceed to a new unrelated refactor wave.
2. Re-enter `cycle-014-validation-and-preview-refresh`.
3. Run the full Wave 014 validation cadence with stable logs under `architecture-audit/cycle-014-validation-contract-ownership/validation/` or a clearly linked final validation subdirectory.
4. Refresh the live preview and run Playwright MCP/live checks for the Wave 014 keyboard-shortcut and selection-mask flows.
5. Close Wave 014 only if the mandatory gates pass with both Wave 014 and Wave 015 changes present.

## Why this is better than extending Wave 014

Extending Wave 014 would blur validation-artifact ownership with repository-wide source type contracts. The Wave 014 decision deliberately limited source edits and set a stop rule for broad build repair. A new Wave 015 respects the review protocol, protects the already-completed validation repairs, and lets reviewers judge the real architectural boundary choices before implementation begins.
