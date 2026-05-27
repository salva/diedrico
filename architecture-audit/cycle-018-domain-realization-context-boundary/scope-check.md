# Cycle 018 Scope Check — Domain realization context boundary (post-Wave-017)

## Status and source-control hygiene

This artifact is a scout/proposal design artifact only. No production source, tests, package/tooling, backend, docs/spec, persistence, command/undo, app-shell, scene-host, overlay behavior, or secret/config files were modified.

Fresh scoped evidence was captured under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`:

- `wave018-entry.stdout` / `.stderr` — current Wave 018 wave-plan entry.
- `designer-scoped-status.stdout` / `.stderr` — path-scoped status/diff evidence.
- `designer-realization-scan.stdout` / `.stderr` — current realization caller/signature scan.
- `designer-current-line-evidence.stdout` / `.stderr` — line-numbered excerpts for current scoped files.

Broad `git_status` overflows in this workspace, consistent with Wave 017 closure notes, so this scout used path-scoped status/diff. The scoped status shows unrelated dirty production files remain present and are explicitly protected/out of scope: `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts` (`designer-scoped-status.stdout`). They were not edited, staged, reverted, or incorporated into this proposal. Existing Cycle 018 audit/validation/review/decision/implementation artifacts were also present before this assignment; this task revises the scout/proposal artifacts for the current canonical fresh-scout stage and does not treat prior implementation-looking artifacts as authorization to implement source changes.

Forbidden secret/config paths were not read.

## Wave 018 entry and current premise check

The current wave-plan entry defines Wave 018 as **Domain realization context boundary** and scopes it to realization context contracts, 2D/3D realization classes, presentation read-port adapters, and focused tests. It requires a current caller inventory for `realize2D(...)`, `realize3D(...)`, `getPlaneEquation(...)`, and projection-plane realization helper APIs, then the smallest typed context boundary that removes concrete `World`/`any` from active realization contracts without creating a god context (`wave018-entry.stdout`).

### Premises that still hold

- Wave 017 deliberately stopped before broad domain realization API redesign. Its closure says `ThreeRealizationContext.ts` is only a typed binder supplied by concern adapters and recommends Wave 018 as the next central follow-up (`architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log-post-028.md`, “Realization-context ownership”, “Reviewer correction”, and “Re-ranked next-wave recommendation”).
- Wave 028 protected the canvas selector/read-port boundary: public canvas consumers no longer receive raw collection/realization seams, and projected-3D raw traversal is localized in `Projected3DCanvasReadPort.ts` (`architecture-audit/cycle-028-canvas-projection-dto-selectors/implementation-log.md`, “Deletes and proofs”, “Reviewer-blocker correction”). Wave 018 must preserve that boundary.
- The remaining central seam is inside realization context shape and adapter-owned context binding, not in presentation selectors. `CanvasWorldReadPort` and three concern adapters still wrap concrete `World` at the runtime adapter boundary and pass a realization context into domain realization calls (`CanvasWorldReadPort.ts:17-33`, `:40-112`; `ThreeRealizationContext.ts:14-26`; `ThreePlanarElementReadPort.ts:28-38`; `ThreeGuideReadPort.ts:29-42`; `ThreeHingeReadPort.ts:13-20`, captured in `designer-current-line-evidence.stdout`).

### Premises adjusted by current source

The wave-plan entry contains stale examples from before Wave 017/adjacent type cleanup. Current source already has typed base contracts in several places:

- `Element3D.realize3D(context: Element3DRealizationContext): Element3DRealization3D` is already typed, not `world: any` (`Element3D.ts:33-42`).
- `Plane3D.getPlaneEquation(context: PlaneEquationRealizationContext)` and `Plane3D.realize3D(context: PlaneEquationRealizationContext)` are already typed, not `any` (`Plane.ts:24-38`).
- `Point3D`, `Line3D`, `Segment3D`, `BrokenHingeLine`, and `HingeLine` no longer import concrete `World` for active realization signatures; their current realization APIs consume context types (`designer-realization-scan.stdout`).
- The old `ThreeWorldReadPort` god adapter no longer owns the call sites named in the wave-plan entry. It is now a composition/type export module that constructs named concern read ports (`ThreeWorldReadPort.ts:1-43`). Current 3D realization-context use lives in `ThreeRealizationContext.ts`, `ThreePlanarElementReadPort.ts`, `ThreeGuideReadPort.ts`, and `ThreeHingeReadPort.ts`.

Therefore, the Wave 018 premise is **not invalidated**, but the implementation scope must be narrowed from “replace remaining concrete `World`/`any` realization signatures” to “finish cleaning the now-current realization context boundary so typed contexts are not broad structural `World` facades and duplicated adapter binders.” No wave-plan edit is required before review because the target outcome still matches the entry: a narrow domain realization/read-context contract consumed by canvas and three adapters. However, any implementation decision must acknowledge that parts of the explicit DELETE list have already been satisfied by current source and must not reintroduce them.

## Current realization-context evidence

### Domain context shape

`ProjectionElementRealizationContext` currently combines multiple concerns in one interface (`ProjectionPlaneContext.ts:9-20`):

- element/plane lookup (`getProjectionPlaneById`, `getPoint2D`, `getLine2D`, `getCircle2D`, `getHingeLineById`),
- realization lookup (`getProjectionPlane2DRealization`, `getProjectionPlane3DRealization`, `get3DPlaneRealization`),
- broad collection traversal (`getAllProjectionPlanes`, `getAllHingeLines`).

Then `ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext` all extend that exact full interface without narrowing (`ProjectionPlaneContext.ts:22-26`). This is the current god-context risk: every realization algorithm gets the same full lookup + collection capability whether it needs it or not.

`ProjectionPlaneMutationContext` correctly remains separate for mutation/cache/dependency operations and adds mutation-only capabilities (`ProjectionPlaneContext.ts:28-37`). This boundary must be protected; Wave 018 should not move dependency registration, `markDirty`, or ID generation into read-only realization contexts.

### 2D realization

`Element2D.realize2D(context: ProjectionElementRealizationContext)` is already typed (`Element2D.ts:1`, `:108`). Many 2D subclasses still name the parameter `world`, but scans show the type is the context rather than concrete `World` (`designer-realization-scan.stdout`). Renaming parameters can improve clarity, but mass renaming is secondary to capability narrowing and should occur only where files are touched for contract changes.

### 3D and plane realization

Current active 3D/plane realization signatures are typed but broad because they inherit the full `ProjectionElementRealizationContext` capability set:

- `Element3D.realize3D(context: Element3DRealizationContext)` (`Element3D.ts:42`).
- `Plane3D.getPlaneEquation(context: PlaneEquationRealizationContext)` and `realize3D(context: PlaneEquationRealizationContext)` (`Plane.ts:31-38`).
- `BrokenHingeLine.realize3D(realizationContext: Element3DRealizationContext, options?: { planeId?: string })` (`BrokenHingeLine.ts:70`).
- `HingeLine.realize3D(world: ProjectionElementRealizationContext)` uses the broad context and, on structural errors, uses `getAllProjectionPlanes()` and `getAllHingeLines()` only for diagnostic logging (`HingeLine.ts:237-263`). This diagnostic use is a key narrowing candidate: if broad collections are retained only to build an error payload, they should not define the normal realization contract.

### Canvas adapter seam

`CanvasWorldReadPort.ts` still defines a canvas-local `createCanvasRealizationContext(world)` returning `ProjectionElementRealizationContext & Element3DRealizationContext` (`CanvasWorldReadPort.ts:17-33`). It exposes all current lookup and collection methods, including `getAllProjectionPlanes` and `getAllHingeLines` (`CanvasWorldReadPort.ts:30-31`). This duplicates the three-local context binder and keeps collection traversal available in any realization call.

The adapter’s public canvas read-port API remains narrow and must be protected (`CanvasWorldReadPort.ts:10-14`): `getCanvasPlaneTransforms`, `getPlaneCanvasItems`, and `getProjected3DCanvasItems`. Internal traversal and style/visibility remain adapter-owned (`CanvasWorldReadPort.ts:35-112`).

### Three adapter seam

`ThreeRealizationContext.ts` defines `createThreeRealizationContext(world, collections)` returning `ProjectionElementRealizationContext & Element3DRealizationContext` (`ThreeRealizationContext.ts:14-26`). Wave 017 already corrected it so collection traversal is injected by concern adapters rather than directly calling `world.getAllProjectionPlanes()` / `world.getAllHingeLines()` in the helper (`ThreeRealizationContext.ts:5-10`, `:23-24`; architecture guard in `threePresentationArchitectureBoundary.spec.ts:53-57`).

Current ownership is better than before but still exposes broad collection capability through the common domain context. Concern adapters supply collection providers according to their needs:

- `ThreePlanarElementReadPort` owns projection-plane traversal and supplies `getProjectionPlanes`, while hinge collection is empty (`ThreePlanarElementReadPort.ts:28-33`).
- `ThreeGuideReadPort` supplies empty collection providers because selected guide realization does not own broad traversal (`ThreeGuideReadPort.ts:29-33`).
- `ThreeHingeReadPort` owns hinge traversal and supplies both hinge and projection-plane collections (`ThreeHingeReadPort.ts:13-20`).

Wave 018 should preserve this Wave 017 ownership rule while moving the collection capability out of the default realization context or into a separately named diagnostic/collection context only where truly required.

## Selected bounded scope

In scope for Wave 018 proposals:

1. Refine `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` into explicit, capability-sized read-only realization contexts:
   - base element/realization lookup context for normal 2D/3D/plane realization;
   - optional collection/diagnostic context only for realization paths that demonstrably need collection traversal;
   - mutation context remains separate and unchanged except for type extension alignment.
2. Replace duplicated canvas/three context binder shapes with one small application/presentation adapter helper if it can stay limited to binding a concrete `World` to the domain realization context family.
3. Update canvas and three presentation adapters to pass the narrowest applicable context into `realize2D`, `realize3D`, `getPlaneEquation`, and projection-plane helper calls, while retaining collection traversal ownership inside concern adapters/read ports.
4. Update domain realization files only where signatures must narrow from the broad common interface, especially hinge/plane/3D paths and any 2D files that truly do not need collections.
5. Update focused tests and architecture guards to prove the old `any`/concrete-`World` signatures remain gone, broad collection traversal is not part of the default realization context, and Wave 017/028 presentation boundaries remain intact.

Out of scope:

- Production implementation in this scout stage.
- Reopening Wave 016/017 presentation selector/read-port architecture except for realization-context parameter wiring in adapters.
- Changing canvas public read-port methods or projected-3D selector DTO contracts.
- Scene-host, OrbitControls, CSS, overlay layout, pointer-event behavior, camera/renderer lifecycle, UI features, or broad rendering extraction.
- Command/undo, persistence/project schema, process tree, tools/controllers, app-shell orchestration, backend, package/tooling, validation-platform, docs/spec/comment cleanup, Drive/local services.
- Redesigning projection-plane mutation/dependency registration/cache ownership. If narrowing read-only contexts requires redesigning `ProjectionPlaneMutationContext`, stop and request a reviewed plan-edit/delta.

## DELETE list candidates

Already satisfied by current source; must stay deleted:

- `Element3D.realize3D(world: any): any`.
- `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)`.
- Concrete `World` realization signatures in active 3D element realization classes.
- Broad `ThreeWorldReadPort` selector dependency/god-interface role.
- Public canvas raw collection/realization seams removed by Wave 028.

Still valid candidates for Wave 018 implementation:

- Delete `getAllProjectionPlanes()` and `getAllHingeLines()` from the default `ProjectionElementRealizationContext` if the implementation inventory confirms they are only needed by narrower collection/diagnostic cases.
- Delete context aliases that extend the full context without narrowing (`ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, `PlaneEquationRealizationContext`) if replaced by explicit capability-specific interfaces.
- Delete duplicated `createCanvasRealizationContext` / `createThreeRealizationContext` bodies if a shared tiny binder can replace them without creating an app-kernel/read-model facade.
- Delete direct diagnostic dependence on broad collection traversal inside normal realization signatures, especially `HingeLine.realize3D`’s structural-error payload if it is the only reason the default context needs collections.
- Delete touched test `as any` / whole-World mocks whose only purpose is satisfying a weak broad context.
- Delete transitional overloads, compatibility aliases, and dual old/new context paths.

## Validation requirements for implementation

Implementation must capture logs under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`:

1. Pre-edit caller/static scans for `realize2D`, `realize3D`, `getPlaneEquation`, `ProjectionElementRealizationContext`, broad collection methods, realization `World` imports, `any` realization contracts, and presentation adapter calls.
2. Focused Vitest for changed realization contexts/domain elements/read-port adapters, including representative 2D realization, 3D point/line/segment/plane/hinge realization, canvas read-port, projected-3D canvas read-port, and three concern read-port/architecture guards.
3. Root and frontend lint where scripts exist.
4. Full root and frontend Vitest.
5. Root and frontend build.
6. Root/frontend Playwright e2e because realization affects user-visible 2D/3D rendering and must preserve `current-ui-contract.spec.ts` pointer-boundary behavior.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and live/browser smoke confirming representative 2D canvas primitives and 3D view still render.

## 3D/canvas behavior implications and protected surfaces

Wave 018 should be behavior-preserving. The user-observable contracts to protect are:

- 2D canvas rendering, selection/query items, visibility, style, projected 3D-on-2D overlays, and input transforms remain equivalent.
- 3D view renders projection planes, planar elements, selected guides, guide intersections, hinges, and reconstructed 3D elements equivalently.
- `.three-view-overlay` keeps `pointer-events: auto` and drag gestures inside the overlay do not pass through to move the SVG canvas (`current-ui-contract.spec.ts:89-124`).
- No scene-host/OrbitControls/CSS/layout changes are authorized.

## Wave-plan edit recommendation

No corrective wave-plan edit is required before review. The wave’s high-level target remains valid, but proposals must explicitly correct stale premise details: current source already removed the old `any`/concrete-`World` 3D signatures, so Wave 018 implementation should focus on narrowing the realization context’s capabilities, deleting duplicate binders/aliases, and preserving the existing presentation boundaries.
