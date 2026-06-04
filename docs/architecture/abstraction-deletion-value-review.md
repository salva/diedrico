# Abstraction Deletion Value Review

Date: 2026-06-04

Source docs:

- [`abstraction-audit.md`](./abstraction-audit.md)
- [`abstraction-simplification-plan.md`](./abstraction-simplification-plan.md)

Purpose: re-evaluate abstractions tagged for deletion/simplification and decide whether they provide non-obvious value through design consistency, documentation-by-shape, future extension, or testability. The goal remains simple, clean architecture, not indiscriminate deletion.

## Executive Summary

Most deletion candidates are still good deletions. However, the previous plan should be more careful with several items:

- `ActionGroup.ts` should not be deleted outright if it owns the active `createActionGroup()` factory. Move/co-locate the factory rather than removing the concept.
- `Line2DPerpendicularToLine` should be kept. It is a real domain construction, not merely a one-subclass convenience.
- Tool classes/protocol should be simplified, not collapsed into a generic mega-tool. The explicit tool classes provide readable product behavior.
- `CanvasWorldReadPort` and Three selectors provide useful presentation boundaries. Remove pure delegation and one-implementation ceremony, but do not pass raw `World` deep into UI selectors.
- `ProjectSessionPersistencePort` should stay; only the concrete forwarding class is questionable.
- `vec()` helper extraction is optional. The duplicated helper is small and local readability may be better than shared import ceremony.

## Decision Table

| Item | Provides real runtime behavior? | Design consistency value | Risk if deleted | Decision |
| --- | --- | --- | --- | --- |
| `perpendiculars.ts` / `distances.ts` | No active imports | Superficial calculation-module consistency only | None | Delete |
| `QuickToolUseCases.ts` | Only permanent failure | Placeholder for removed feature | Keeping is misleading | Delete or restore real feature; do not keep stub |
| `Process.ts` | No active creation path | Potential root-process naming | None; root is `Subprocess` | Delete |
| `ActionGroup.ts` | Yes, `createActionGroup()` is used | Consistent factory module with `Subprocess.ts` | Deleting outright loses active factory | Modify: move/co-locate factory, do not just delete |
| `DependencyEdge` | No | Names graph concept | None | Delete |
| Dead store exports | Mostly no external behavior | Store API completeness | Low; hidden features vanish | Delete unused returned/exported members only |
| `ITool.activate/deactivate` | No callers | Common lifecycle pattern | None if runtime never calls them | Delete |
| `return-to-selection` / `completeTool` | Dead branch currently | Future one-shot tool lifecycle | Loss only if quick/example tools return soon | Remove from active protocol; reintroduce with real one-shot tool |
| `IntersectionMask` | No constructed instances | Mask algebra symmetry | Low | Delete unless AND-mask feature is imminent |
| `SelectionMask.guide()` | Already absent or zero callers | Old alias consistency | None | No-op/delete if present |
| `SelectionMask.anyLine()` | Same as `line()` | Intent naming for line-like types | Small readability loss | Replace with `line()` and strengthen `line()` docs |
| `useHoverHighlight` factory | Factory works but unused externally | Vue composable factory convention | Test fresh-instance seam disappears | Keep factory unexported if useful; export singleton only |
| `CanvasVisibilityPolicy` | No active value beyond pass-through | Policy naming consistency | None | Delete |
| `AutoSaveRuntimeSessionPort` | Type-only alias | Role-specific name | Minor documentation loss | Delete or replace with real narrowed interface |
| Snapshot/restore base interfaces | Type-only, base restore is empty | Layered app-shell/persistence contract | Low; API becomes more honest | Merge into real persistence handle contracts |
| `vec()` helper duplication | Yes, repeated local conversion | Rendering adapter locality | Shared helper may add import noise | Optional: extract only if rendering utils already centralize conversions |
| ThreePresentation adapter/read-port chain | Yes via forwarding/context | Strong separation by rendering concern | Raw `World` leakage if over-deleted | Modify: keep selectors, collapse one-impl interfaces/context ceremony |
| `CanvasPresentationController` | Pure delegation | Controller naming symmetry | None | Delete |
| `ProjectSessionPersistenceAdapter` class | Pure forwarding | Named production adapter | Low; port remains | Replace class with factory/object, keep port |
| `CanvasWorldReadPort` | Yes, canvas read isolation | Protects selector from raw `World` | Medium if replaced by raw `World` | Modify/defer; keep boundary, simplify interface form |
| Empty realization intermediates | No members | Hierarchy symmetry | Low | Delete/flatten |
| `Segment3D` alias | Type alias only | Future union naming | Low | Delete until second variant exists |
| `Line2DPerpendicularToLine` | Yes, real perpendicular-line construction | Strong domain vocabulary | High: conflates ordinary perpendicular line with guide behavior | Keep |
| Duplicate `Subprocess` interfaces | Yes but duplicated shapes | Weak consistency | Low | Unify to one canonical type |
| Duplicate line-line intersection ops | Yes, duplicate behavior | Old op name compatibility | Saved command compatibility risk | Delete duplicate implementation; keep registry alias if needed |
| Tool protocol/classes | Yes, interaction model | Strong explicit product behavior | High if collapsed too far | Modify: remove dead lifecycle/boilerplate, keep explicit tools |

## Revised Recommendations

### Safe Deletes

These provide no meaningful design consistency beyond ceremony:

1. `perpendiculars.ts` and `distances.ts`
2. `QuickToolUseCases.ts` failing stub, plus its call path
3. `Process.ts`
4. `DependencyEdge`
5. Unused store exports, but only exported/returned members, not internal state needed by actions
6. `ITool.activate()` / `deactivate()`
7. Dead `return-to-selection` branch and `completeTool` callback, unless a real one-shot tool is restored now
8. `IntersectionMask`, `SelectionMask.intersection()`, and `isIntersectionMask()`
9. `CanvasVisibilityPolicy`
10. `AutoSaveRuntimeSessionPort` alias
11. Empty realization intermediate classes
12. `Segment3D` alias

### Modify Instead Of Delete

These abstractions have some value, but current form is more complex than needed:

#### `ActionGroup.ts`

Keep the active factory behavior. Do not delete the concept.

Preferred design:

- Move `createActionGroup()` next to the canonical `ActionGroup` type in `ProcessTree.ts`, or keep a small factory module only if `Subprocess.ts` remains as a matching process-node factory module.
- Avoid a file that exists only to re-export a type.

#### `useHoverHighlight`

The exported singleton is the product API. The factory is only useful as an internal helper or test seam.

Preferred design:

- Export only `useGlobalHoverHighlight()`.
- Keep `createHoverHighlightState()` unexported if it improves implementation clarity.

#### Snapshot/restore handles

The base/extended split is more abstract than the real contract.

Preferred design:

- Define concrete persistence handle contracts in one place.
- Do not keep empty base interfaces.
- Do not leak broad domain details into unrelated app-shell ports.

#### ThreePresentation chain

The rendering-concern separation is useful; the one-implementation interface chain is not.

Preferred design:

- Keep concern selectors: projection planes, planar elements, reconstructed elements, guides, hinges.
- Replace 5 adapter sub-interfaces with a concrete `ThreePresentationContext` type.
- Collapse `Three*ReadPort` factories where they only forward calls.
- Remove pure delegation controller.
- Do not pass raw `World` into every selector.

#### `CanvasWorldReadPort`

The boundary is useful because it prevents canvas presentation from consuming raw `World`.

Preferred design:

- Keep a canvas read context.
- Prefer concrete factory return type over one-implementation interface.
- Remove controller/pass-through layers first.

#### `ProjectSessionPersistenceAdapter`

The port is a useful test seam; the class is boilerplate.

Preferred design:

- Keep `ProjectSessionPersistencePort`.
- Replace concrete class with `createProjectSessionPersistencePort()` or an object literal at production wiring.

#### Duplicate line-line intersection operations

The old operation name may matter for serialized project data.

Preferred design:

- Keep one implementation class.
- If old serialized op type exists, register a descriptor alias mapping `AddIntersectionPoint2D` to the surviving implementation.

### Keep

These should not be deleted based on the current evidence:

#### `Line2DPerpendicularToLine`

It is a real domain concept, not just an intermediate class. It separates ordinary perpendicular lines from guide-specific behavior. `Guide2D` may share perpendicular geometry, but it is not equivalent to an ordinary perpendicular line because guide realization handles hinge/half-hinge behavior.

Recommendation:

- Keep the class.
- If duplication exists between `Line2DPerpendicularToLine.realize2D()` and `Guide2D.realize2D()`, extract a small geometry helper instead of deleting the domain type.

#### Tool protocol and explicit tool classes

The tool system has useful structure: tools collect arguments, produce construction intents, and leave command execution to application code. Explicit tool classes are readable product definitions.

Recommendation:

- Keep `ITool`, `ToolContext`, `ToolCommandSink`, and `ArgumentCollectorTool`.
- Remove dead lifecycle methods and repeated completion boilerplate.
- Extract validator/spec helpers for truly identical tool patterns.
- Do not replace all tools with a generic config-driven mega-tool.

#### `ProcessTree`

Keep as a cohesive aggregate. The audit did not show enough benefit to split it further.

#### `World` and `ProjectionPlane`

Do not inline or extract more from these yet solely because they are large. They own real domain invariants. Simplify surrounding dead/ceremonial layers first.

## Updated Execution Guidance

### Batch 1: Delete No-Value Surface

Delete only items confirmed as no-runtime/no-design-value:

- `perpendiculars.ts`, `distances.ts`
- `QuickToolUseCases.ts` failing stub and call path
- `Process.ts`
- `DependencyEdge`
- exported dead store members
- dead selection mask constructs
- `CanvasVisibilityPolicy`
- autosave exact alias
- `Segment3D` alias

Validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend
```

### Batch 2: Modify Useful But Over-Ceremonial Abstractions

- Move/co-locate `createActionGroup()` rather than deleting it.
- Simplify `useHoverHighlight` exported API.
- Merge persistence handle types into the actual contract.
- Replace `ProjectSessionPersistenceAdapter` class with an object/factory while retaining the port.

Validation:

```bash
npm test --workspace=frontend -- processTree hoverHighlight ProjectService AppShell
npm run build --workspace=frontend
```

### Batch 3: Presentation Chain Simplification

- Remove pure delegation controllers.
- Keep presentation selectors.
- Replace one-implementation read-port interfaces with concrete context types.
- Do not pass raw `World` into selectors.

Validation:

```bash
npm test --workspace=frontend -- canvasPresentation threePresentation SvgCanvas ThreeView
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Batch 4: Domain Hierarchy Flatting With Guardrails

- Remove empty realization intermediates.
- Keep `Line2DPerpendicularToLine`.
- Defer `Element3D`, `Line3D`, `Realization`, `World`, and `ProjectionPlane` decisions.

Validation:

```bash
npm test --workspace=frontend -- realization guide Line3D Point3D Segment3D
npm test --workspace=frontend
```

### Batch 5: Tool Protocol Cleanup

- Remove unused lifecycle hooks.
- Remove dead completion mode if no real one-shot tool exists.
- Keep explicit tool classes.
- Extract shared validators only where obvious.

Validation:

```bash
npm test --workspace=frontend -- tools canvasToolControllers canvasInteractionController
npm run build --workspace=frontend
```

## Architecture Principle Refinement

The key rule should be:

> Delete abstractions that are neither behavior, boundary, vocabulary, nor tested variation.

That means:

- A one-implementation interface can still be useful if it prevents raw domain leakage into presentation or isolates an external dependency.
- A class with one subclass can still be useful if it names a real domain construction (`Line2DPerpendicularToLine`).
- A factory module can still be useful if it creates a canonical domain object (`createActionGroup()`), but not if it only re-exports a type.
- Repetition can be preferable to a generic abstraction when the abstraction would hide command semantics.

## Corrections To Prior Plan

Update [`abstraction-simplification-plan.md`](./abstraction-simplification-plan.md) before execution:

1. Change `ActionGroup.ts` from "delete" to "move/co-locate active factory; remove type-only re-export indirection."
2. Change `Line2DPerpendicularToLine` from "merge into Guide2D" to "keep; optionally extract shared perpendicular geometry helper."
3. Clarify that `CanvasWorldReadPort` should preserve a presentation read boundary, even if the interface form is simplified.
4. Clarify that ThreePresentation simplification should preserve concern selectors and avoid raw `World` leakage.
5. Clarify that tool simplification keeps explicit tool classes and protocol core.
6. Make `vec()` extraction optional, not required.
7. Require saved-command compatibility review before removing `AddIntersectionPoint2D` registry support.

## Final Recommendation

Proceed with simplification, but split candidates into three groups:

- **Delete now**: dead files, dead exports, pure pass-through policy/controller/alias layers.
- **Modify**: useful concepts currently expressed with too much ceremony.
- **Keep/defer**: abstractions that encode domain vocabulary or protect real boundaries.

This keeps the objective aligned with clean architecture: fewer accidental abstractions, but no loss of useful vocabulary, test seams, or boundary clarity.
