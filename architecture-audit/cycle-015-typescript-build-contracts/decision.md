# Decision — Cycle 015 TypeScript Build Contracts

**Stage:** `cycle-015-decision`  
**Wave:** 015 — Converge frontend TypeScript contracts around owned boundaries  
**Decision status:** review convergence complete.  
**Review result:** `reviews/round-01-review.md` records **NO BLOCKING ISSUES**.  
**Selected implementation framing:** `proposals/proposal-restructure.md`.  
**Source/test/package/tooling implementation edits in this decision stage:** none.

## Artifacts cited

- `architecture-audit/cycle-015-typescript-build-contracts/scope-check.md`
- `architecture-audit/cycle-015-typescript-build-contracts/proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/proposals/proposal-restructure.md`
- `architecture-audit/cycle-015-typescript-build-contracts/reviews/round-01-review.md`
- `architecture-audit/wave-plan.md` — Wave 015 entry
- `architecture-audit/cycle-014-build-contract-plan-edit/decision.md`
- `architecture-audit/cycle-014-validation-contract-ownership/validation/frontend-build.after5.stdout`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.scope-check.stdout`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.scope-check.stderr`

## Convergence basis

Wave 015 exists because Wave 014's build-contract repair made the active frontend build gate execute real `vue-tsc` checking. The Wave 014 build-contract decision inserted Wave 015 before returning to `cycle-014-validation-and-preview-refresh`, because Wave 014 cannot honestly close while the active frontend build remains red on out-of-scope TypeScript contract errors.

The Wave 015 scope check reran `npm run build --workspace=frontend` and found the backlog materially unchanged from Wave 014's `frontend-build.after5.stdout`. The failure is no longer the old Node 24 / `vue-tsc` string-patch tooling abort; it is the real frontend TypeScript backlog exposed by the existing `vue-tsc && vite build` script. The scope check classifies the active errors into six owner-boundary lanes:

1. app shell and service-port boundary;
2. command descriptor and operation boundary;
3. process-tree action boundary;
4. projection-plane/world context boundary;
5. UI rendering/store DTO boundary;
6. service/domain strictness cleanup required by build.

Round-01 review scored both proposals against all required criteria and recorded **NO BLOCKING ISSUES**. The review recommends `proposal-restructure.md` because it treats the backlog as owned contract convergence rather than independent compiler silencing, while preserving the direct proposal's strict build-log bound, deletion-first stance, protected-surface rule, validation cadence, and return-to-Wave-014 closure requirement.

## Selected alternative

Select `architecture-audit/cycle-015-typescript-build-contracts/proposals/proposal-restructure.md` as the winning implementation proposal.

Rationale:

- It aligns with the project's top priority: architecture and contract ownership before local patching.
- It keeps the exact Wave 015 wave-plan boundary: current `vue-tsc` errors plus direct owner dependencies only.
- It requires each repeated error category to be converged at the owning boundary rather than cast away at call sites.
- It preserves no-backcompat/deletion-first priorities by deleting stale consumers and removed type surfaces instead of restoring legacy fields.
- It carries the mandatory expansion stop rule for any category that becomes a larger conceptual redesign.
- It preserves Wave 014 repaired surfaces and requires returning to Wave 014 validation closure after Wave 015 validates green.

## Rejected/deferred alternative

`proposal-direct.md` is rejected as the primary implementation framing, but incorporated where it overlaps the selected proposal.

Rejected/deferred aspects:

- A line-by-line or category-by-category direct closure framing is more likely to drift into local compiler fixes, per-call-site casts, or accidental compatibility adapters.
- It is less explicit than the selected proposal about treating app-shell ports, operation outputs, process-tree action types, projection-plane/world contexts, UI DTOs, and service/domain strictness as authoritative owned boundaries.

Incorporated aspects:

- exact current build-log/direct-owner scope;
- explicit DELETE list and deletion-first stance;
- anti-suppression and anti-overreach constraints;
- protected Wave 014 surfaces and prior `ActionsPanel.vue` boundary guard;
- mandatory validation cadence;
- return-to-Wave-014 validation closure plan.

## Exact implementation scope

The next implementation stage may touch only files directly named by the current `vue-tsc` backlog or direct owner dependencies required to eliminate those exact errors honestly. The implementation must remain within the six owner-boundary lanes from `scope-check.md` and the Wave 015 wave-plan entry:

1. **App shell/service ports:** align `App.vue`, application app-shell runtime ports, auth/project/Drive service port definitions, and minimal Vite ambient env typing so the runtime/store/session contract has one meaning.
2. **Command descriptor/operation results:** converge command factories, operation descriptors/results, serialization values, and wrong imports at their owning operation/descriptor boundary; introduce typed outputs or narrow validation guards where JSON bags are the true external boundary.
3. **Process-tree action model:** treat `Action.ts` / `ProcessTree.ts` as authoritative; align stores, panels, factories, and process-tree operations to current `Action`, `ActionNode`, and discriminated `ProcessNode` shapes.
4. **Projection-plane/world context ports:** make mutation/realization context ownership explicit through a narrow named port/context supplied or implemented intentionally by `World`, or by adjusting element/plane realization signatures to consume the narrow port consistently.
5. **UI rendering/store DTOs:** align cited dialogs, panels, toolbars, `SvgCanvas.vue`, hover/tool/view stores, and primitive rendering DTO consumers to current store/render shapes; delete stale reads rather than extending DTOs only for obsolete consumers.
6. **Service/domain strictness:** fix only the active strict import/null/result/default/undefined failures in services, composables, calculations, and domain element modules that block `vue-tsc`.

A file not directly named by the build is in scope only if the implementation log documents it as a direct owner dependency of a current build error. Non-build architectural discoveries are future-wave candidates only.

## DELETE and repair constraints

Implementation must delete or replace stale surfaces proven by the current build errors and direct owner inspection, including:

- `ConstructiveAction`, `ActionType`, stale `Action.id`, `Action.infeasible`, `Action.infeasibilityReason`, `Action.actionType`, `Action.timestamp`, stale process-node `inputs`/`outputs`, and unguarded `ProcessNode.name` assumptions;
- duplicate or optional `ActionGroup` models if inspection confirms a stale parallel contract;
- stale command serialization/result fields such as `circleId` and `tangentIndex` where not owned by the current operation;
- raw `JsonValue | undefined` factory plumbing where typed operation outputs or guards should own the boundary;
- stale singleton imports such as `projectService`;
- wrong-cased or removed imports including `../domain/calculations/intersections`, `Plane3DCoordinateSystem`, `Element2D` from the wrong module, and stale view-state command/type paths;
- stale renderer/store API reads including `ProjectionPlane.getArc`, common `Primitive.geometry`, missing hover `temporary`, removed tool-store methods, and missing display defaults;
- frontend CommonJS `require` usage;
- unused imports/locals reported by `vue-tsc` when they have no runtime purpose;
- dead helpers/tests whose only purpose is preserving removed type surfaces, replacing them with current-owner behavior tests where behavior is affected.

Forbidden repairs:

- `@ts-ignore`, `@ts-expect-error`, blanket TypeScript suppressions, or `tsconfig` weakening;
- broad `as any` or `as unknown as` compatibility casts;
- projection-plane/world fixes that rely on accidental structural typing escapes or publicize private methods solely to satisfy compiler shape compatibility;
- compatibility shims or adapter wrappers that keep both old and new contracts alive;
- restoring removed domain fields solely for stale UI/store code;
- package/tooling changes except minimal ambient Vite env typing if required by the current error;
- alternate build scripts, build allowlists, or parallel type-check paths;
- unrelated command-controller, rendering, persistence, docs, debug-log, naming, formatting, or UI-normalization cleanup.

## Review cautions elevated to implementation guardrails

The following round-01 review cautions are binding implementation guardrails:

- **Projection-plane/world:** no casts, suppressions, or accidental structural-typing escape hatches for projection-plane/world mutation or realization contexts. A narrow context must be intentional and named, or the implementation must stop for a reviewed delta/mini-cycle.
- **Process tree:** statically check stale panel/store/factory consumers and delete obsolete paths rather than restoring removed `Action` fields or old process-node fields.
- **Command descriptors/results:** focused command/serialization/undo tests are required for behavior-bearing command descriptor/result fixes because those changes can affect undo and persistence semantics.
- **PropertiesDialog:** `frontend/src/components/dialogs/PropertiesDialog.vue` remains protected from Wave 014 except for the directly cited `Point2D.type` DTO mismatch and direct owner dependencies; its Wave 014 close/save emit contract must not be reverted.

## Protected prior-wave surfaces

Wave 015 must preserve Wave 014 scoped repairs unless a specific current build error is causally traced to the file and documented in the Wave 015 implementation log:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue` — current direct exception only for the cited `Point2D.type` mismatch
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` `vue-tsc` build-gate upgrade

`frontend/src/components/panels/ActionsPanel.vue` is also a prior repaired process-tree/dependency surface. It may be touched only because the current build directly cites type-contract failures there, and only for those failures plus direct owner dependencies. Wave 015 must not use this as authorization to redesign dependency service architecture, panel workflows, or command-controller cleanup.

## Expansion stop rule

If any owner-boundary lane cannot be converged without broader conceptual redesign than required to honestly eliminate the current `vue-tsc` errors, implementation must stop and request a reviewed delta/mini-cycle before continuing. The implementer must not smuggle later-wave redesign into Wave 015.

Examples requiring stop/review:

- projection-plane/world ports require a domain redesign larger than a narrow explicit context convergence;
- process-tree UI fixes require resurrecting old action identity/history semantics;
- command descriptor repairs require changing the persistence/undo contract beyond current build-error owners;
- UI/rendering DTO failures require broad `SvgCanvas.vue` renderer extraction rather than current DTO alignment.

## Accepted residual risks

- The backlog is broad enough that implementation may discover deeper architecture pressure; the expansion stop rule is the mitigation.
- Boundary-first fixes can overreach if not tied to the build log; the direct-owner rule and implementation-log ownership map are required controls.
- Deleting stale process/UI consumers may alter user-visible behavior if a supposedly obsolete path is still active; focused tests and static usage checks are required where behavior is affected.
- Command descriptor/result fixes can affect undo, serialization, and persistence; focused command/serialization/undo tests are required for behavior-bearing changes.
- Service/domain strictness fixes can accidentally hide invalid data through defaults; every default or guard introduced at an owner boundary must be documented as an authoritative contract.
- Wave 015 delays Wave 014 closure, but this risk is accepted because Wave 014 cannot close while the trusted build gate is red.

## Validation requirements for implementation

The implementation stage must capture all stdout/stderr under `architecture-audit/cycle-015-typescript-build-contracts/validation/` and record command outcomes in `implementation-log.md`.

Required validation:

1. Before edits, capture a fresh failing `npm run build --workspace=frontend` baseline and compare it to the scope-check backlog.
2. Run focused Vitest for every behavior-bearing boundary changed, including command/operation descriptors, process-tree action rendering, projection-plane/world context semantics, app/service ports, and rendering/store DTOs.
3. Run `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
4. Run root and frontend full Vitest where defined.
5. Run `npm run build` and `npm run build --workspace=frontend`; build success is mandatory and must use the existing `vue-tsc && vite build` path.
6. Run root and frontend e2e/Playwright where defined because UI/app/service/rendering contracts may change.
7. Refresh the live preview on `0.0.0.0:5173`, capture an HTTP 200 reachability probe, and run Playwright MCP/live smoke through project creation/rendering/selection startup.

If any root/workspace command is undefined, the implementation log must cite exact package-script evidence rather than silently skipping it. If any validation fails for reasons attributable to Wave 015, the wave is not complete.

## Implementation log requirements

`architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` must include:

- source files changed;
- stale surfaces/tests/docs/fixtures deleted, with paths;
- the six-boundary ownership map with fixed/deleted status for current errors;
- tests and validation commands run, with stable log paths and outcomes;
- residual architectural issues discovered as future-wave candidates, with no active TypeScript build errors left in residual status;
- protected-surface causal-link notes for any Wave 014 or prior repaired surface touched;
- confirmation that no suppressions, compatibility shims, type-safety downgrades, alternate build paths, or restored stale fields were introduced;
- the return-to-Wave-014 validation closure plan.

## Next stage recommendation

Proceed to `cycle-015-implement-typescript-build-contracts` using `proposal-restructure.md` as the binding implementation framing and this decision as the constraint set.

Validation and live preview refresh remain a separate later stage after implementation. Once Wave 015 implementation and validation are green, return to `cycle-014-validation-and-preview-refresh` and run the full Wave 014 validation cadence against the combined Wave 014 + Wave 015 source tree before closing Wave 014.
