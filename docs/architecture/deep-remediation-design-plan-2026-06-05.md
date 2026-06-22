# Deep Remediation Design Plan - 2026-06-05

This plan turns `deep-design-implementation-audit-2026-06-05.md` into an implementation sequence. It is intentionally aggressive: the goal is simple and clean architecture, not compatibility with old tests, old project data, or organic adapter layers that grew between earlier designs.

Persistence rule: the current schema is accepted only until a phase changes serialized command/project shape. Any persistence-breaking phase bumps the schema and rejects older files. No migration layer is added.

## Decision Rules

- Prefer direct, explicit dependencies over bridges, adapters, barrels, facades, and generic ports that have one implementation.
- Delete compatibility code for old tests and old on-disk formats. Schema `7.0.0` is only the current pre-remediation boundary; any persistence-breaking cleanup bumps the schema and rejects older files.
- Make internal impossible states fail fast with precise errors.
- Keep user/input boundaries tolerant only where bad input is expected: project files, localStorage, auth/Drive, and tool validation intended for user feedback.
- Delete skipped tests for removed APIs instead of preserving historical behavior.
- Do not introduce broad frameworks to hide duplication unless the extracted invariant is small and obvious.
- Prefer fewer layers with accurate names over many hexagonal-looking seams with no alternative implementation.

## Target Architecture

### Domain State

`World` is a state container only:

- Owns maps for projection planes, hinge lines, 3D planes, 3D points, 3D lines, and 3D segments.
- Exposes direct storage methods: `put*`, `delete*`, `get*ById`, `getAll*`.
- Does not perform cross-storage search, sibling derivation, dependency registration, realization, construction, ID allocation, label generation, or process-tree work.
- Keeps all internal maps private.

Cross-storage query behavior moves to explicit query/context objects owned by runtime or construction services.

### Runtime Composition

`RuntimeDomainContext` owns all domain services. `RuntimeSession` owns application adapters and exposes UI-facing ports.

Runtime services:

- `World`
- `DependencyService`
- `ProcessTree`
- `WorldIdAllocator`
- `LabelGenerator`
- `RealizationService`
- `ProjectionConstructionService`
- `ReconstructionConstructionService`
- `ProjectionPlaneConstructionService`

The `OperationContext` remains explicit. It should not rely on `World` as a service locator or on public maps.

### Application Flow

Tools produce typed construction intents. Construction execution dispatches to typed executors. Executors build operations and process-tree actions. Operations mutate storage through explicit context services.

Presentation builders produce canvas/three render DTOs directly from explicit context. Remove single-use read-port layers unless they protect a real framework boundary.

## Phase 1: Remove Test And Compatibility Drag

Goal: remove code that preserves obsolete behavior before touching deeper architecture.

### 1.1 Delete skipped tests for removed APIs

Delete or rewrite only if still behaviorally relevant:

- `frontend/tests/integration/pointCreation.spec.ts`
- skipped blocks in `frontend/tests/unit/domain/world.spec.ts`
- skipped tests in `frontend/tests/unit/domain/projectionPlaneRealization.spec.ts`
- skipped old static-plane tests in `frontend/tests/unit/domain/plane.spec.ts`
- skipped semantic-reference tests that mention removed `World` origin helpers

Design detail:

- If a skipped test references a removed API, delete it.
- If it describes a current invariant, rewrite it against current services and unskip it.
- Do not keep historical tests in active test directories.

Verification:

- `npm run test -- --run`

### 1.2 Replace hidden WeakMap test service associations

File:

- `frontend/tests/helpers/worldHelpers.ts`

Current problem:

The helper maps a `World` to services with `WeakMap`s. That is compatibility-shaped support code from the earlier era where tests passed only a `World` around.

Target design:

Create a test runtime context object:

```ts
interface TestRuntimeContext {
  readonly world: World;
  readonly visibilityModel: VisibilityModel;
  readonly commandStack: CommandStack;
  readonly operationContext: OperationContext;
}
```

Implementation design:

- `createTestRuntimeContext()` constructs `RuntimeDomainContext`, `VisibilityModel`, and `CommandStack`.
- It calls `initializeWorld(...)` with the explicit operation context.
- Tests use `context.operationContext.realizationContext` instead of recovering services from `World`.
- Keep small semantic helper functions only when they accept `World` and perform direct current lookups.

Same-phase migration strategy:

1. Add `createTestRuntimeContext()`.
2. Migrate every `buildOperationContext(world, visibilityModel)` call site in the same change set.
3. Delete `buildOperationContext(world, ...)` APIs that create services from a `World`.
4. Delete all WeakMaps in the same phase.
5. Do not leave both hidden-service helpers and explicit test runtime helpers in place after the phase.

Verification:

- `npm run test -- --run`
- Knip should no longer report stale helper exports.

## Phase 2: Make Internal Geometry Fail Fast

Goal: fix unsafe internals before larger structural changes so failures are explicit during refactors.

### 2.1 Replace non-null assertions in projection-plane matrix computation

File:

- `frontend/src/utils/projectionPlaneUtils.ts`

Current problem:

`computeProjectionPlaneMatrices` assumes every lookup succeeds and crashes with opaque TypeScript assertion failures.

Target design:

- Missing lines, planes, or realizations throw descriptive invariant errors.
- Geometric impossibility returns `null` only when `null` is the existing feasible/infeasible result contract.

Implementation design:

Add small local require helpers in the same file, not a broad shared framework:

```ts
function requireLine(context: ProjectionPlaneRealizationContext, id: string, role: string): Line2D {
  const line = context.getLine2D(id);
  if (!line) throw new Error(`${role} line not found: ${id}`);
  return line;
}
```

Use explicit checks for:

- `t1HingeTraceId`
- `t2OtherTraceId`
- `t2PrimeLineId`
- source projection planes
- 2D and 3D plane realizations

Do not catch these errors in `computeProjectionPlaneMatrices`.

Verification:

- Add focused tests for missing trace and missing plane realization.
- `npm run test -- --run tests/unit/utils/projectionPlaneUtils.spec.ts`
- Full test suite.

### 2.2 Stop swallowing internal errors in projection-plane tool validation

File:

- `frontend/src/tools/CreateProjectionPlaneTool.ts`

Current problem:

The validation catch returns `valid: true` for every error.

Target design:

- Known geometric non-computation can become a warning.
- Stale or missing user selections become invalid validation feedback before command execution.
- Internal missing references or thrown invariant errors are not converted into valid warnings.

Implementation design:

- Separate validation into two explicit categories:
  - User selection validation: missing selected elements, wrong element types, same-plane constraints, and incomplete arguments return `{ valid: false }` or a warning when the tool UX explicitly allows it.
  - Internal invariant validation: missing projection-plane realizations, missing dependency-owned elements after a successful lookup, and impossible realization context failures throw.
- Let `computeExpectedT2Prime` throw for internal missing state.
- Keep `if (!expected)` as the warning path for geometric non-computation.
- Remove broad catch.

Verification:

- Focused tool validation tests for stale/missing UI selection returning validation feedback.
- Focused tests for internal invariant failures propagating instead of becoming warnings.
- Full suite.

### 2.3 Preserve original operation errors during rollback failure

Files:

- `frontend/src/commands/Command.ts`
- `frontend/src/application/commandProduction/RuntimeCommandProducer.ts`

Target design:

If operation execution fails and rollback also fails, throw an error that preserves both failures.

Implementation design:

Add a single rollback failure path on `Command` and use it everywhere:

```ts
class Command {
  private rollbackState: 'not-started' | 'completed' | 'failed' = 'not-started';
  private rollbackGeneration = 0;
  rollbackAfterFailure(originalError: unknown): never;
}
```

Rules:

- `Command.rollback()` performs rollback once and updates `rollbackState`.
- If rollback fails, `rollbackState` becomes `failed` and no caller retries rollback.
- `rollbackAfterFailure(originalError)` calls `rollback()` only when rollback has not already been attempted.
- Rollback tracking is scoped to the current executed-operation generation, not the full command lifetime.
- Adding a new operation after a successful rollback resets rollback tracking for the new generation.
- Preview commands that intentionally rollback between preview rebuilds can add operations again and can still rollback a later generation exactly once.
- If rollback succeeds, it throws the original error.
- If rollback fails, it throws `AggregateError` directly:

```ts
throw new AggregateError([operationError, rollbackError], 'Command failed and rollback failed');
```

- `Command.addAndExecute()` uses `rollbackAfterFailure`.
- `RuntimeCommandProducer` catch blocks use `rollbackAfterFailure` instead of calling `command.rollback()` directly.

Apply the same rule to every rollback catch path in `RuntimeCommandProducer`:

- `executeToolCommand`
- preview `preview`
- preview `commit`
- preview `cancel` if cancellation needs to surface rollback failures
- `executeProcessCommand`

Do not return a success or normal failure result if rollback itself fails. Throw an `AggregateError` so diagnostics preserve both the original error and rollback error.

Command result boundary decision:

- Tool/user validation errors are converted to `ToolCommandResult` before command execution starts.
- Once a `Command` has begun executing operations, thrown errors are internal/invariant failures and propagate after rollback.
- `RuntimeCommandProducer` must not keep broad catch-to-result paths around operation execution.
- If a construction executor has a legitimate user-facing non-executable condition, model it as a typed validation result before creating/executing a command, not as a caught internal exception after partial execution.
- Rollback failures always escape as `AggregateError`, never as `{ success: false }`.

Verification:

- Add focused command test where apply throws and undo/rollback throws.
- Add focused `RuntimeCommandProducer` tests for rollback failure during `executeToolCommand`, preview `preview`, preview `commit`, and `executeProcessCommand`.
- Add focused test proving producer catch paths do not double-rollback after `addAndExecute()` already rolled back.
- Add preview tests for repeated preview rollback, rebuild, later failure, and cancel.

## Phase 3: Make `World` Storage-Only

Goal: remove remaining domain-query behavior and public storage leakage from `World`.

### 3.1 Make all maps private

File:

- `frontend/src/domain/world/World.ts`

Target design:

- `projectionPlanes` becomes private.
- All callers use explicit methods or query services.
- Current direct-access call sites that must migrate before the map can be made private:
  - `RemoveElementOps.ts`: 11 `context.world.projectionPlanes.get(...)` accesses
  - `operationHelpers.ts`: 1 `context.world.projectionPlanes` passed to invalidation
  - `DeletionSequenceFactory.ts`: 1 `world.projectionPlanes.entries()` iteration

Required replacement APIs:

```ts
getAllProjectionPlanes(): ProjectionPlane[];
getProjectionPlaneById(id: string): ProjectionPlane | undefined;
hasProjectionPlane(id: string): boolean;
```

For realization invalidation, avoid passing the raw map. Replace `RealizationService.invalidateElement(..., projectionPlanes: Map<string, ProjectionPlane>)` with:

```ts
invalidateElement(elementId, dependencyQuery, projectionPlanes: Iterable<ProjectionPlane>): string[]
```

or:

```ts
invalidateElement(elementId, dependencyQuery, projectionPlaneQuery): string[]
```

Choose `Iterable<ProjectionPlane>` first because it is simpler and sufficient.

Migration strategy:

- Update invalidation helpers first.
- Update deletion/factory call sites.
- Make map private and let TypeScript find any remaining direct access.

Verification:

- `npm run build`
- `npm run test:architecture`

### 3.2 Remove cross-storage lookup behavior from `World`

Current `World` method destinations:

| Method | Destination |
| --- | --- |
| `putProjectionPlane`, `deleteProjectionPlane`, `putHingeLine`, `deleteHingeLine`, `putPoint3D`, `deletePoint3D`, `putLine3D`, `deleteLine3D`, `putSegment3D`, `deleteSegment3D`, `putPlane3D`, `deletePlane3D` | Keep on `World` as storage mutation. |
| `getProjectionPlaneById`, `getAllProjectionPlanes`, `getHingeLineById`, `getAllHingeLines`, `get3DPoint`, `getAll3DPoints`, `get3DLine`, `getAll3DLines`, `get3DSegment`, `getAll3DSegments`, `get3DPlane`, `getAllPlanes` | Keep on `World` as direct storage lookup/collection. |
| `getPlaneById` | Delete or alias internally to `get3DPlane`; do not keep duplicate public naming. |
| `getProjectionPlaneByLabel` | Move to test semantic helpers or a file-local production helper if production still needs it. |
| `getPlaneForElement`, `getElement2D`, `getPoint2D`, `getLine2D`, `getCircle2D`, `getSegment2D`, `getGuide2D`, `getElement3DById` | Move only production-needed methods to `GeometryElementLookup`. Delete unused helpers. |
| `getHalfHingeLines2D`, `getHingeLineFromHalfHingeLine`, `getSiblingPlaneForIntersection` | Move to file-local helpers near callers first. Create `HingeGeometryQueries` only if multiple production call sites remain. |

Target design:

Do not create one broad relocated `World` facade. Move each non-storage behavior to the smallest concrete place that actually needs it.

Approved destinations:

- File-local lookup/require helpers when a lookup is used by one module.
- A narrow `GeometryElementLookup` only for lookup methods needed by at least two current production call sites after migration.
- `HingeGeometryQueries` only if hinge/sibling helpers have multiple real call sites after `World` cleanup. Otherwise keep those helpers file-local near the caller.

`GeometryElementLookup` must not be designed by copying old `World` methods. Before adding a method, list the exact production call sites in the implementation PR. If there is only one call site, keep the helper local to that file.

Allowed shape:

```ts
class GeometryElementLookup {
  constructor(private readonly world: World) {}
  // Only methods with at least two current production call sites go here.
}
```

Internal invariant helpers are not service methods by default. Prefer local functions:

```ts
function requireLine2D(lookupLine2D: (id: string) => Line2D | undefined, id: string, role: string): Line2D {
  const line = lookupLine2D(id);
  if (!line) throw new Error(`${role} line not found: ${id}`);
  return line;
}
```

Design rules:

- Add a lookup method only when multiple production call sites need it.
- Do not migrate every old `World` helper wholesale.
- `get*` methods are lookup-boundary methods and may return `undefined`.
- `require*` helpers are internal-invariant helpers and throw precise errors.
- UI selection validation may use `get*` and return user feedback.

Migration strategy:

1. Move single-use lookup logic to file-local helpers at the caller first.
2. Add `GeometryElementLookup` only when duplication appears across at least two current production call sites.
3. Expose `GeometryElementLookup` through `OperationContext.lookup` only if command/construction execution has multiple lookup needs after local helper extraction; otherwise pass local helpers directly.
4. Move application/read-model call sites.
5. Move construction/deletion call sites.
6. Remove moved methods from `World`.

Do not keep deprecated wrappers on `World`.

Verification:

- `npm run build`
- `npm run test -- --run`
- Architecture test that `World.ts` does not import or expose query-service behavior.
- Knip check should not show a new unused broad query service surface.

### 3.3 Remove semantic label lookup from `World` if it is only test convenience

Method:

- `getProjectionPlaneByLabel`

Decision:

- If production uses label lookup, move it to a narrow helper or `GeometryElementLookup` only if there is an active production call site.
- If only tests use it, replace tests with current IDs from initialization outputs or explicit semantic helpers.

No backward compatibility wrapper.

## Phase 4: Type Construction Intents And Split Execution

Goal: remove unchecked `Map` extraction and central construction switch.

### 4.1 Replace `Map<string, ArgumentValue>` at execution boundary

Current shape:

```ts
interface ToolConstructionIntent {
  type: string;
  args: Map<string, ArgumentValue>;
}
```

Target shape:

Each intent variant carries IDs plus the expected semantic role. It does not carry mutable domain objects across the tool/execution boundary. Execution re-queries through local lookup helpers over current storage APIs and validates that the referenced element still exists and has the expected kind.

```ts
type ToolConstructionIntent =
  | { type: 'point'; planeId: string; position: Vector3; description: string }
  | { type: 'line'; planeId: string; point1Id: string; point2Id: string; description: string }
  | { type: 'circle'; planeId: string; centerPointId: string; circumferencePointId: string; description: string }
  | { type: 'segment'; planeId: string; point1Id: string; point2Id: string; description: string }
  | { type: 'guide'; planeId: string; referenceLineId: string; throughPointId: string; description: string }
  | { type: 'parallel-line'; planeId: string; referenceLineId: string; throughPointId: string; description: string }
  | { type: 'perpendicular-line'; planeId: string; referenceLineId: string; throughPointId: string; description: string }
  | { type: 'intersection'; planeId: string; element1Id: string; element2Id: string; selectionPoint: Vector3; description: string }
  | { type: 'tangent-line-to-circle-through-point'; planeId: string; circleId: string; throughPointId: string; tangentIndex: 0 | 1; selectionPoint: Vector3; description: string }
  | { type: 'tangent-line-to-circle-parallel'; planeId: string; circleId: string; referenceLineId: string; tangentIndex: 0 | 1; selectionPoint: Vector3; description: string }
  | { type: 'create3dpoint'; projection1PointId: string; projection2PointId: string; description: string }
  | { type: 'create3dline'; projection1LineId: string; projection2LineId: string; description: string }
  | { type: 'create3dsegment'; projection1SegmentId: string; projection2SegmentId: string; description: string }
  | { type: 'create3dplane'; trace1LineId: string; trace2LineId: string; description: string }
  | { type: 'createprojectionplane'; t1HingeTraceLineId: string; t2OtherTraceLineId: string; t2PrimePositionLineId: string; description: string };
```

`planeId` appears only on planar construction intents where it names the target 2D construction plane. Reconstruction and projection-plane creation intents do not carry active canvas `planeId`; execution derives source planes from the referenced projection elements/traces and validates those roles explicitly.

Delete the disabled variant that throws at execution:

- `interactiveprojectionsetup` (has a case that throws, not a working executor)

Keep `createprojectionplane` as a working typed intent variant with its own explicit fields; do not delete it.

Delete generic metadata/map escape hatches:

- `ToolConstructionMetadata`
- `MetadataConstructionIntentType`
- `BaseToolConstructionIntent` (the base carrying `args: Map<string, ArgumentValue>`)
- `BasicConstructionIntentType` (union of non-metadata intent types; used only to type the `BaseToolConstructionIntent` branch, not independently after typed intents replace the map-based shape)

The typed intent fields carry `selectionPoint` and `tangentIndex` directly.

Design rule:

- Argument collectors may still use maps internally while collecting user input.
- The object passed to `executeConstructionIntent` must be typed and complete.
- Missing user selections are validation failures before intent creation.
- Execution must re-query every ID through local lookup helpers and fail if the referenced element vanished or has the wrong kind.
- No intent variant should expose `element`, `args`, or generic `metadata`.

Validation matrix:

| Intent | User validation failures | Internal invariant failures |
| --- | --- | --- |
| `point` | Missing plane coordinates, invalid numeric coordinates, inactive/missing target plane selected by UI. | Target plane vanished after validation. |
| `line`, `segment` | Missing point selections, wrong selected type, same point selected twice. | Point IDs do not exist on `planeId` at execution. |
| `circle` | Missing center/circumference point, same point selected twice. | Referenced points do not exist on `planeId` at execution. |
| `guide`, `parallel-line`, `perpendicular-line` | Missing line/point selections, wrong selected type, infeasible selected reference geometry. | Referenced line/point do not exist on `planeId` at execution. |
| `intersection` | Missing elements, unsupported type pair, no geometric intersection, same element selected twice. | Referenced IDs no longer exist or belong to a different plane after validation. |
| tangent intents | Missing circle/reference/point selections, wrong selected types, no valid tangent for selected geometry. | Referenced IDs no longer exist or belong to a different plane after validation. |
| `create3dpoint` | Missing point projections, same projection plane for both projections, wrong selected type. | Projection point IDs no longer exist or source plane roles disagree with selected projections at execution. |
| `create3dline` | Missing line projections, same projection plane for both projections, wrong selected type. | Projection line IDs no longer exist or source plane roles disagree with selected projections at execution. |
| `create3dsegment` | Missing segment projections, same projection plane for both projections, wrong selected type. | Projection segment IDs no longer exist or source plane roles disagree with selected projections at execution. |
| `create3dplane` | Missing trace lines, same projection plane for both traces, infeasible traces. | Trace line IDs no longer exist or trace planes changed after validation. |
| `createprojectionplane` | Missing T1/T2/T2' lines, T1/T2 same plane, invalid T2' placement warning where allowed. | Referenced lines or projection-plane realizations vanish after validation. |

Rule: user validation failures return tool validation feedback before command execution. Internal invariant failures throw during execution.

Single-path migration strategy:

1. Each tool emits its own typed intent directly.
2. Update `CanvasToolController` to receive typed intents only.
3. Delete generic map access from `ConstructionUseCases` in the same phase.
4. Delete `ArgumentValue` imports from `ToolCommandIntents.ts`.
5. Rewrite or delete `ArgumentCollectorTool.buildConstructionIntent()` and any `constructionIntentType` base-path that emits `{ type, planeId, args }`.
6. Build must fail if any production code still reads `intent.args`.

Allowed helper rule:

- A tool may use a tiny file-local constructor for its own intent shape.
- No generic `ToolIntentBuilder`, map-to-intent adapter, `ArgumentValue`, `metadata`, or `element` escape hatch is allowed.

### 4.2 Replace central switch with typed executor table or functions

Target design:

Use a simple object of functions, not a class hierarchy unless needed:

```ts
const executors = {
  point: executePointIntent,
  line: executeLineIntent,
  circle: executeCircleIntent,
};
```

Each executor receives:

```ts
interface ConstructionExecutionContext {
  readonly cmd: CommandOperationBuilder;
  readonly operationContext: OperationContext;
  readonly realizationContext: CachedProjectionElementRealizationContext;
  readonly groupId: string;
}
```

Post-refactor execution boundary:

```ts
interface ExecuteConstructionParams {
  readonly intent: ToolConstructionIntent;
  readonly operationContext: OperationContext;
  readonly commands: ToolCommandExecutionPort;
}
```

Composition path:

- `CanvasToolController` calls `executeConstructionIntent({ intent, operationContext, commands })`.
- `executeConstructionIntent` builds `ConstructionExecutionContext` from `operationContext`.
- Executors use file-local require helpers over `operationContext.world` direct storage methods and explicit construction/realization services from `OperationContext`.
- Add `GeometryElementLookup` only later if duplicate local lookup helpers survive across multiple production executors.

Design rule:

- Executors are functions unless state is needed.
- Shared process-tree action recording goes through a small helper.
- Do not create one class per construction unless it simplifies dependencies.
- Executors must re-query IDs from typed intents through local `require*` helpers for accepted IDs.

Architecture gates:

- No production `intent.args` references.
- No `ArgumentValue` import outside argument collection code.
- No `ToolConstructionMetadata`, `MetadataConstructionIntentType`, or `BasicConstructionIntentType`.
- No typed intent field named `element` or carrying domain objects across the tool/execution boundary.
- No base `ArgumentCollectorTool` method emits a generic construction intent.

Verification:

- Build catches exhaustive intent typing.
- Tool tests verify each intent creation path.
- Construction use-case tests verify execution without maps.

## Phase 5: Simplify Presentation Boundaries

Goal: remove read-port/selector bridges that exist only because earlier layers had different shapes.

### 5.1 Three presentation

Current problem:

`ThreeWorldReadPort` creates five read ports, each builds significant DTOs, then `ThreePresentationSelector` aggregates them.

Target design option A, preferred:

Create concrete builders with accurate names and a single top-level function:

```ts
buildThreePresentationModel({ world, realizations, visibility, selectedIds, displayOptions }): ThreePresentationModel
```

Internal helpers:

- `buildProjectionPlaneModels`
- `buildPlanarElementModels`
- `buildReconstructedElementModels`
- `buildGuideModels`
- `buildHingeModels`

No exported read-port interfaces unless a renderer consumes them independently.

Target design option B:

Keep separate files, but rename `ReadPort` to `Builder` or `Projector` and remove the extra selector aggregation layer.

Decision:

Use option A unless file size becomes too large. The current split appears abstraction-heavy for one consumer.

Same-change migration strategy:

1. Introduce `buildThreePresentationModel` and switch `RuntimeSession.threePresentationPort()` to it in the same change set.
2. Delete `ThreeWorldReadPort`, `createThreePresentationReadPorts`, read-port interfaces, and imports before the change set is considered complete.
3. Do not commit or merge a state where both the new top-level builder and old read-port bridge are used by production code.
4. Keep tests at model-output level, not per-port interface level, unless a helper is complex enough to test directly.

Phase gate:

- No production import of `ThreeWorldReadPort` remains.
- No `Three*ReadPort` interface remains unless there is a named external consumer and the plan is updated with that reason.
- `npm run build` must fail if both `createThreePresentationReadPorts` and `buildThreePresentationModel` are production imports.

### 5.2 Canvas projected 3D presentation

Current problem:

`Projected3DCanvasReadPort` is a single-use adapter into `Projected3DCanvasSelector`.

Target design:

Fold source construction into the projected 3D builder:

```ts
buildProjected3DCanvasItems({ world, realizations, realizationContext, planeTransforms }): CanvasRenderItem[]
```

Same-change migration strategy:

1. Move source construction into `buildProjected3DCanvasItems`.
2. Switch the runtime canvas presentation path to that builder in the same change set.
3. Delete `Projected3DCanvasReadPort` and its production imports/exports before the change set is considered complete, unless the implementation PR updates this plan with a named second consumer.

Phase gate:

- No production import or export of `Projected3DCanvasReadPort` remains.
- No canvas read-port bridge remains if its only job is forwarding to `Projected3DCanvasSelector`.

### 5.3 Canvas item discriminated union

Current problem:

Required fields are optional for some item kinds.

Target design:

```ts
type CanvasPlaneItem =
  | { kind: 'point'; position: Vector3; ... }
  | { kind: 'line'; point: Vector3; direction: Vector3; ... }
  | { kind: 'finite-segment'; point1: Vector3; point2: Vector3; ... }
  | { kind: 'circle'; center: Vector3; radius: number; ... };
```

Remove non-null assertions in selectors.

Verification:

- TypeScript should reject invalid item construction.
- Canvas presentation tests should not need `as never` for valid items.

## Phase 6: Normalize Construction Services And Storage Ports

Goal: settle service boundaries rather than keeping a half-port, half-concrete design.

Decision:

Delete storage port interfaces and pass concrete storage-only `World` unless an implementation PR documents an actual second implementation or a real dependency boundary.

Plan:

- Review `GeometryStoragePorts.ts` after `World` is storage-only.
- Delete `GeometryStoragePorts.ts` if `World` is the only implementation.
- Pass concrete storage-only `World` to domain construction services.
- Keep or introduce a storage port only with documented evidence of a second implementation or a dependency boundary that cannot be expressed by direct concrete `World` use.

Preferred simplification:

- Keep `World` concrete in domain construction services if those services are part of the same domain module and `World` is storage-only.
- Use ports at application/runtime boundaries, not between closely related domain classes without a reason.

Verification:

- Knip should report fewer unused exported interfaces.
- Architecture tests should enforce no service ownership on `World`, not require unnecessary ports.

## Phase 7: Deletion Operations And Process Tree Cleanup

### 7.1 Remove-element operation duplication

Target design:

Extract tiny helpers only for real invariants:

```ts
function removeStoredElement({ invalidate, remove, unregister }): boolean
```

But avoid a generic removal framework if it obscures element-specific undo data.

Required invariant:

1. Invalidate realizations before dependency graph changes.
2. Remove from storage.
3. Unregister dependency node if removal succeeded.

Verification:

- Focused tests for invalidation ordering.
- Existing deletion tests.

### 7.2 Process tree tombstones

Decision:

Remove tombstones and compact arrays. Do not preserve stable indexes for old project data.

Schema decision:

- Bump the project schema for this phase, for example from `7.0.0` to `8.0.0`.
- Reject older project files instead of migrating process-tree tombstones or old operation descriptors.

Exception:

Only keep stable indexes if a named current runtime feature requires them inside one live session. If such a feature exists, document it in this plan before implementation and hide tombstones behind traversal helpers. Persisted-data compatibility is not a valid reason.

Implementation design:

- Replace `Action | null` children with `Action[]`.
- Delete tombstone filtering from read models.
- Update deletion semantics to remove actions directly.
- Stop exposing mutable tree internals as the application read boundary.
- Add read APIs that return readonly snapshots or iterator results:
  - `getRootSnapshot(): ProcessNodeSnapshot`
  - `getChildrenSnapshot(nodeId: string): readonly ProcessNodeSnapshot[]`
  - `findAction(actionId: string): Action | undefined`
  - `findGroup(groupId: string): ActionGroup | undefined`
- Read models consume snapshots or traversal methods, not raw mutable `root.children` arrays.
- Store removal undo metadata as `{ groupId, actionNode, originalIndex, previousSiblingId?: string, nextSiblingId?: string }`.
- Redo removes by `action.id`, not by index.
- Undo reinserts deterministically:
  - If `nextSiblingId` exists in the current group, insert immediately before it.
  - Else if `previousSiblingId` exists, insert immediately after it.
  - Else insert at `Math.min(originalIndex, currentChildren.length)`.
  - If the action already exists, throw an internal invariant error.
- Same-command multi-delete undo relies on command-stack reverse undo order. Add tests for adjacent actions, first action, last action, and whole-group deletion.
- Command replay for the new schema reconstructs compact arrays only.

New persisted operation descriptor DTO shapes:

```ts
type ActionNodeDescriptorV8 = {
  id: string;
  type: 'action';
  created: string; // ISO timestamp
  elementId: string;
  description: string;
};

type ActionGroupDescriptorV8 = {
  id: string;
  type: 'actionGroup';
  created: string; // ISO timestamp
};

type SubprocessDescriptorV8 = {
  id: string;
  type: 'subprocess';
  created: string; // ISO timestamp
  name: string;
};

type AddProcessTreeActionGroupDescriptorV8 = {
  opType: 'AddProcessTreeActionGroup';
  schemaVersion: '8.0.0';
  group: ActionGroupDescriptorV8;
};

type AddProcessTreeActionDescriptorV8 = {
  opType: 'AddProcessTreeActionOp';
  schemaVersion: '8.0.0';
  groupId: string;
  actionNode: ActionNodeDescriptorV8;
};

type RemoveActionFromProcessTreeDescriptorV8 = {
  opType: 'RemoveActionFromProcessTree';
  schemaVersion: '8.0.0';
  groupId: string;
  actionId: string;
  removedActionNode: ActionNodeDescriptorV8;
  originalIndex: number;
  previousSiblingId?: string;
  nextSiblingId?: string;
};

type PushSubprocessDescriptorV8 = {
  opType: 'PushSubprocess';
  schemaVersion: '8.0.0';
  subprocess: SubprocessDescriptorV8;
};

type PopSubprocessDescriptorV8 = {
  opType: 'PopSubprocess';
  schemaVersion: '8.0.0';
};

type RenameSubprocessDescriptorV8 = {
  opType: 'RenameSubprocess';
  schemaVersion: '8.0.0';
  subprocessId: string;
  newName: string;
};

type ToggleEncapsulationDescriptorV8 = {
  opType: 'ToggleEncapsulation';
  schemaVersion: '8.0.0';
  subprocessId: string;
};

type ToggleOutputDescriptorV8 = {
  opType: 'ToggleOutput';
  schemaVersion: '8.0.0';
  nodeId: string;
};
```

Descriptor rules:

- `groupId` is always stored separately for action descriptors; it is not part of `ActionNodeDescriptorV8`.
- `created` is serialized as an ISO string and restored to `Date` at the process-tree boundary for action, action-group, and subprocess nodes.
- `AddProcessTreeActionGroupOp` serializes the full action-group DTO, including node `id`, `type`, and `created`; replay inserts that group directly without generating a replacement ID or timestamp.
- `AddProcessTreeActionOp` keeps `opType: 'AddProcessTreeActionOp'`, serializes the full action node DTO, including node `id`, `type`, `created`, action fields, and separate `groupId`; replay inserts that node directly.
- `RemoveActionFromProcessTreeOp` serializes enough data to undo after reload without tombstones.
- `PushSubprocessOp` serializes the full subprocess DTO, including `id`, `type`, `created`, and `name`; replay pushes/inserts that subprocess directly without generating a replacement ID or timestamp.
- `PopSubprocessOp` serializes no node body; replay computes the popped subprocess from the current stack before popping, and undo restores that captured ID.
- `RenameSubprocessOp`, `ToggleEncapsulationOp`, and `ToggleOutputOp` serialize only the IDs and scalar fields they mutate.
- Replay removes by `actionId`, not by index.
- Undo after reload reinserts `removedActionNode` with the deterministic anchor algorithm above.
- No regenerated node/action IDs are used during replay or undo.
- Old process-tree operation descriptors are rejected with older schema files.
- New-schema files containing old process-tree descriptor shapes are rejected too.
- Operation restore validates `schemaVersion: '8.0.0'` and the explicit DTO shape before creating operations.
- Operation restore rejects unknown, missing, or legacy fields for process-tree descriptors, including old `outputs`-based identity fields.
- Operation restore rejects `opType: 'AddProcessTreeAction'` as a legacy/invalid process-tree descriptor name; the V8 name is `AddProcessTreeActionOp`.
- Old process-tree descriptor restorers are removed or replaced in the schema-breaking phase, not left registered behind a compatibility branch.

Process-tree insertion APIs:

- Add an API that appends or inserts a provided `ActionNode` without generating a replacement node ID.
- Add equivalent APIs for provided `ActionGroup` and `Subprocess` nodes used by replay/undo.
- Every API that imports a provided process node validates uniqueness and reserves that ID with the process-tree ID generator/counter before future generated IDs are issued.
- Replaying old IDs must advance/import the generator state so a later live subprocess, action group, or action node cannot collide with restored IDs.
- Keep any convenience API that builds a new `ActionNode` from an `Action` only for live new actions, not replay/undo.
- If implementation chooses to remove distinct action-node IDs from the model, update this plan first and prove persisted/replay/undo identity is still deterministic.

Verification:

- Process tree tests.
- Tests that read-model code cannot mutate process-tree children through returned snapshots.
- Focused tests for delete, undo, redo, and deleting multiple actions from one group.
- Project replay and round-trip tests for the new schema only.
- Test that old schema files are rejected at the project boundary.
- Test that a new-schema project file containing old process-tree operation descriptors is rejected.
- Test that live process nodes created after project replay do not collide with restored subprocess, action-group, or action-node IDs.

## Phase 8: RuntimeSession Cleanup Without New Adapter Bridges

Goal: keep `RuntimeSession` as composition root without letting it become an unstructured facade.

Target design:

- `RuntimeSession` owns lifecycle and high-level port exposure only.
- Keep direct small methods on `RuntimeSession` when they are clearer than factories.
- Do not create `createCanvasRuntimePort`, `createToolRuntimePort`, or similar modules just to move code out of the file.

Extraction trigger:

Extract a runtime adapter module only when all are true:

- The extracted module owns repeated construction logic or lifecycle state.
- It reduces dependencies visible to `RuntimeSession`.
- It does not introduce a second abstraction name for the same existing port.
- It has a single obvious responsibility that can be described without mentioning `RuntimeSession`.

Verification:

- `RuntimeSession` becomes simpler because earlier phases removed adapter complexity, not because complexity moved into bridge modules.
- Any extracted module has no hidden global state and no compatibility purpose.

## Phase 9: Comment, Type Surface, And Tooling Cleanup

### 9.1 Remove phase-history comments

Target:

- Inline comments describe current invariants only.
- Historical context lives in architecture docs.

Examples to rewrite:

- `Element2D.ts` long phase history.
- `World.ts` comments around old initialization/service removal.
- `projectionPlaneUtils.ts` phase references.

### 9.2 Reduce exported type surface

Use Knip as a guide, but do not blindly delete public types before boundary simplification.

Rules:

- File-local type by default.
- Export only if imported by another module.
- Delete barrel files unless they serve a real package boundary.

### 9.3 Dependency cleanup

After runtime/type cleanup, revisit Knip dependency findings:

- `d3`
- `@types/d3`
- `@types/katex`
- `@vue/tsconfig`
- `concurrently`
- `@vitest/coverage-v8`

Do not remove dependencies in the architecture phases unless verification confirms they are unused by build, docs, tests, and configs.

### 9.4 Replace brittle source-text architecture tests

Files:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
- `frontend/tests/unit/architecture/helpers/sourceScanner.ts`

Target:

- Delete tests that assert old adapter names, old phase names, or implementation strings.
- Keep or rewrite only tests that express current dependency rules.
- Prefer import-boundary checks over source text assertions.
- If static checking remains necessary, use a parser-aware tool or a very small rule with documented limitations.

Concrete replacement gates:

- `World.ts` must not import runtime/application services.
- Production code must not import deleted compatibility modules.
- Construction execution must not reference `intent.args` or `ArgumentValue`.
- Presentation code must not import deleted read-port bridge modules after Phase 5.

## Phase Order And Gates

1. Test compatibility cleanup.
2. Fail-fast geometry/internal errors.
3. `World` storage-only and query extraction.
4. Typed construction intents and executor split.
5. Presentation boundary simplification.
6. Construction service/storage port normalization.
7. Deletion/process-tree cleanup.
8. RuntimeSession adapter cleanup.
9. Comment/type/dependency cleanup.

Every phase must pass:

```bash
npm run build
npm run test:architecture
npm run test -- --run
npm run lint
```

For phases that touch persistence or project replay, also run focused project-service round-trip and self-containment tests.

Knip policy:

- Run `npx --yes knip` after phases that delete files, exports, adapter layers, or dependencies.
- Knip is an audit signal, not a mandatory zero-findings gate until the final type-surface cleanup phase.
- Any remaining production unused-file or unused-export finding after a cleanup phase must be either removed or documented in the phase notes.
- The final cleanup phase should either clear Knip production findings or record explicit false positives.

## Success Criteria

- `World` is storage-only with private maps.
- No hidden WeakMap service associations in tests.
- No skipped tests for removed APIs.
- `ConstructionUseCases` no longer reads from generic argument maps.
- `computeProjectionPlaneMatrices` has no non-null assertions for internal lookups.
- Presentation code has fewer single-use read-port interfaces and more direct builders.
- Canvas item DTOs encode required geometry fields in the type system.
- Knip reports substantially fewer unused files/exports/types, with remaining findings either documented or tool false positives.
- Architecture tests enforce current boundaries rather than historical implementation names.

## Anti-Goals

- No compatibility layer for old project schemas.
- No compatibility layer for old tests.
- No new generic operation framework just to make code look abstract.
- No service locator on `World`.
- No broad adapter layer whose only job is to connect two earlier refactor styles.
