# Scope Check — Projection Plane / World Split

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Parent wave:** Cycle 015 TypeScript build contracts  
**Status:** scout/proposal only; no implementation or revert work performed.

## Scope boundary

This mini-cycle exists because the previous correction implementation hit the split stop condition for the projection-plane/world realization lane. The correction decision requires the implementation to stop when projection-plane/world completion requires choosing between conceptual owners beyond one narrow named read-only realization context, when optional-vs-required context semantics cannot be made consistent locally, or when `World.getPlaneForElement` is public only because of structural compatibility pressure (`architecture-audit/cycle-015-typescript-build-contracts/correction-decision.md`).

The current stage is limited to documenting the exact residual projection/world build errors and proposing bounded correction paths. It must not edit source, tests, package files, tooling, or reverts.

## Evidence read

- `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` records that the earlier correction retained process-tree identity fixes, retained `World.getPlaneForElement`, reverted/deferred the projection context lane, and left residual projection-plane build failures.
- `architecture-audit/cycle-015-typescript-build-contracts/correction-decision.md` selects the restructure correction path and gates projection/world changes as a set.
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.correction-after-regression-fix.stdout` is the current red frontend build evidence.
- `architecture-audit/cycle-015-typescript-build-contracts/validation/projection-context.final.stdout` shows the existing focused projection tests still pass despite the frontend build being red.
- Fresh scout inspection of the current working tree diff and numbered source files was performed without writing validation artifacts; findings are cited below to current source paths and the existing build/test logs.

## Current partial diff state for this lane

Fresh name-only diff for the lane shows current uncommitted changes in:

- `frontend/src/domain/world/Circle.ts`
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/Line.ts`
- `frontend/src/domain/world/Segment.ts`
- `frontend/src/domain/world/World.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`

No current diff is present in `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`, `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`, `frontend/src/domain/world/Point.ts`, or `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts` for this scoped lane, although those files remain part of the conceptual owner boundary and/or build-error surface.

The focused diff shows two retained/deferred context edits that matter for this mini-cycle:

1. `frontend/src/domain/world/World.ts:494` has `getPlaneForElement(elementId: string): ProjectionPlane | undefined` public rather than private. The implementation log says this was retained because owner code already requires `World` to satisfy `ProjectionPlaneMutationContext` and making it private caused broad owner-port failures.
2. `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:10-12` currently defines `ProjectionPlaneElementRealizationContext` with optional `getPoint2D?` but no `getCircle2D?`; the previous attempted context migration was otherwise reverted/deferred.

## Residual projection/world build errors

The current frontend build log reports these projection/world residual errors:

### Element realization methods still require `World`, not a narrow context

- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:260`, `:284`, and `:308` pass `ProjectionPlaneMutationContext` into `point.realize2D`, `line.realize2D`, and `circle.realize2D`, but the element APIs still require `World` (`Element2D.realize2D(world: World)` at `frontend/src/domain/world/Element2D.ts:108`, `Point.ts:109`, `Line.ts:161`, `Circle.ts:89`). TypeScript reports `ProjectionPlaneMutationContext` is missing many `World` fields.
- The same mismatch repeats at `ProjectionPlane.ts:428-429`, `:475-476`, `:527-528`, `:593-594`, `:647`, `:694`, `:805`, `:968`, and `:1017` where line/circle/point/guide dependencies call `realize2D(world)` with `ProjectionPlaneMutationContext`.
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts:74` and `:125` call `computeProjectionPlaneMatrices(..., context)` where the helper currently expects `World`; passing `ProjectionPlaneRealizationContext` is rejected as missing `World` fields.

### Strict undefined guards remain incomplete

- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:428-429` uses `l1.realize2D(world)` and `l2.realize2D(world)` after fallback lookups that can return `undefined`.
- `ProjectionPlane.ts:475-476`, `:527-528`, `:647`, `:694`, `:805`, and related lines have the same pattern: local plane/global context lookup can return `undefined`, but the code dereferences before a strict guard.
- The same strictness category exists in element files already listed in the lane diff: `Circle.ts:139-140`, `:235-237`; `Line.ts:222-223`, `:311`, `:323`, `:561`, `:567`, `:737`; and `Segment.ts:77-78`.

### Context shape is internally inconsistent

- `ProjectionPlaneContext.ts:6-12` defines a small realization context (`getLine2D`, optional `getPoint2D`, `getProjectionPlaneById`) but current element APIs do not consume it.
- `ProjectionPlaneContext.ts:20-26` makes mutation context extend that realization context and adds mutation helpers plus `getPlaneForElement`.
- `World.ts:23-26` documents world-level element lookup helpers (`getPoint2D`, `getLine2D`, `getCircle2D`, `getElement2D`), while `World.ts:67-74` explicitly warns against mirroring projection-plane internal storage back into `World`. The current context design is therefore caught between a read-only realization port and a mutation/global-owner port.

## Already reverted/deferred context edits

The prior implementation log says the attempted narrow context signature migration was reverted/deferred for these files: `ProjectionPlaneContext.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, `HingeLine.ts`, and `BrokenHalfHingeLine2D.ts`. The fresh diff confirms that `Point.ts`, `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, and `BrokenHalfHingeLine2D.ts` do not currently carry source diffs in this lane, while other element/context files remain dirty from the inherited partial state and must be reconciled deliberately before any implementation claim.

## Retained `World.getPlaneForElement` visibility

`World.getPlaneForElement` is currently public at `frontend/src/domain/world/World.ts:494`. This is not accepted as an architectural endpoint by itself; it is retained only because current build-cited behavior needs a plane-owner query for sibling/intersection creation (`ProjectionPlane.ts:1075-1080`) and because reverting to private previously created owner-port failures. A final implementation must either document it as an intentional narrow owner port or replace the need with a more explicit projection context API.

## What this mini-cycle must preserve

- Preserve Wave 014 protected repairs and do not touch protected files unless a current build-cited direct owner dependency requires it.
- Preserve the process-tree identity correction already recorded in the implementation log: `RemoveActionFromProcessTreeOp(actionId)` must keep receiving authoritative action-node ids, not element ids, group ids, subprocess ids, or payload ids.
- Do not introduce suppressions, skipped tests, package/tooling weakening, broad casts, compatibility shims, dual old/new context paths, or arbitrary cleanup.
- Do not broaden this lane into command-output, UI/store, Google Drive, ProjectService, rendering DTO, or toolbar repairs; those are separate Wave 015 build-contract categories.

## Stop condition for implementation

If review selects an implementation path and the implementer discovers that element realization cannot be made to consume one explicit context contract without rewriting geometric semantics, this lane must stop again for a higher-level domain realization mini-cycle rather than forcing `ProjectionPlaneMutationContext` to masquerade as `World`.
