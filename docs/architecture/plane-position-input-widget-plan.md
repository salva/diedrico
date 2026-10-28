# Plane Position Input Widget Plan

Status: implemented in the current candidate for free-position argument collection and status-bar entry. This document retains the original design rationale; broader proposals are not implied delivered.

## Summary

Add a direct coordinate-entry widget to the bottom status bar so any active tool argument that currently accepts a free click position can also be completed by typing coordinates in the active projection plane.

The first supported case is the existing `PointTool`, whose single `SelectionMask.none()` argument captures a free plane position from a canvas click. After this change, the same argument can be completed by typing coordinates such as `-20,105` and pressing Enter.

This is not a separate "point by coordinates" construction. It is a second input provider for the same kind of argument:

- click provider: click the canvas to submit a plane position;
- text provider: type `u,v` in the status bar to submit the same plane position.

## Goals

1. Let the user type exact plane coordinates whenever the active tool is waiting for a free plane position.
2. Keep the current click workflow unchanged.
3. Use a real HTML input so text editing, cursor movement, delete, selection, copy, paste, and undo behave normally.
4. Avoid collisions with tool shortcuts by routing numeric coordinate keys to the status-bar input when appropriate.
5. Implement the feature through the tool argument system rather than through point-specific command shortcuts.
6. Keep the first delivery narrow: support tools whose next viable argument accepts `SelectionMask.none()`, with `PointTool` as the initial user-facing beneficiary.
7. Fix keyboard routing so focused text inputs, including the coordinate widget, are not preempted by global Escape/Delete/tool shortcuts.

## Non-Goals

This plan does not add numeric radius, numeric angle, numeric length, formulas, relative coordinates, polar coordinates, or distance transport. Those can build on the same argument-input direction later, but the first implementation only submits a `Vector3(u, v, 1)` plane position.

This plan also does not change circle, line, or segment semantics. Today those tools require existing point elements. Allowing coordinates typed directly while those tools are waiting for points would require either changing their argument types or adding an explicit "create point from typed position and feed it to the current tool" coordinator. That is valuable, but it changes construction side effects and should be designed as a second phase after the status-bar position provider is proven.

## Current State

The current tool argument framework is centered on graphic selection.

`frontend/src/tools/ToolArgumentCollector.ts` defines:

```ts
export interface ArgumentValue {
  element: Element2D | null;
  planeCoords: Vector3;
}
```

`ArgumentCollectorTool.handleClick()` creates an `ArgumentValue` from either:

- an element hit under the cursor; or
- a click position when the next argument accepts `SelectionMask.none()`.

`PointTool` already uses this mechanism:

```ts
arguments: [
  { name: 'position', mask: SelectionMask.none() }
]
```

The missing capability is submitting the same `ArgumentValue` without a mouse click.

## User Experience

### Status Bar Widget

When the active tool can currently accept a free plane position, the status bar shows an enabled coordinate input:

```text
Plane: P_H   Tool: Point   Position: [ -20,105 ]
```

When the active tool is not waiting for a position, the widget is hidden or disabled:

```text
Plane: P_H   Tool: Line   Creating line: pick point1, point2
```

Recommended first label:

```text
position:
```

Later versions can show a more specific label if the tool exposes one, for example `circumference position`, `through position`, or `target position`.

### Keyboard Routing

When the app focus is not already inside another input, textarea, select, contenteditable element, or modal dialog, and the active tool can accept a plane position:

- `0-9`, `.`, `,`, `+`, and `-` focus the coordinate input and insert the typed character.
- While the coordinate input has focus, normal text-editing keys are handled by the browser:
  - Backspace
  - Delete
  - Home
  - End
  - ArrowLeft
  - ArrowRight
  - Shift+ArrowLeft/ArrowRight
  - Ctrl/Cmd+A
  - Ctrl/Cmd+C
  - Ctrl/Cmd+V
  - Ctrl/Cmd+X
- Enter parses and submits the coordinate pair.
- Escape clears the input if it has text. If the input is empty, Escape blurs the input and consumes that keypress; a second Escape then reaches the normal tool-cancel behavior.
- After a successful submission, the input clears and blurs. Rapid repeated entry still works because the next coordinate starter key immediately focuses the widget again.

Non-coordinate shortcuts continue to work when the coordinate input is not focused:

- `P`, `L`, `C`, `S`, `G`, `I`
- undo/redo shortcuts
- active-plane shortcuts
- fit-to-view and other app shortcuts

The implementation must not intercept keyboard events from existing text fields, dialogs, Google sign-in UI, project renaming, property editors, or future modal forms.

The existing global shortcut router currently handles Escape before respecting focused text inputs. This must be fixed as part of this feature: while focus is inside the coordinate input, Escape is owned by the widget first. More generally, global shortcuts should return early for editable targets unless they are explicitly intended to work inside text inputs.

Bare `+` and `-` are reserved for coordinate input when the coordinate widget is available. Zoom shortcuts, if added, should use modifier forms such as `Ctrl +`, `Ctrl =`, and `Ctrl -`; this keeps signed coordinate entry conflict-free and matches the existing `Ctrl+0` fit-to-view shortcut pattern.

### Click Interaction

Clicking the canvas continues to submit the plane position exactly as it does today.

When a canvas click successfully advances or completes a position argument, the coordinate input should clear and blur. This prevents stale typed text from suggesting that it is still pending.

### Parsing

First-version accepted forms:

```text
-20,105
-20, 105
37.45,70.36
(+10,-30)
-20,5;10,2
```

The parser should support two separator modes from the start:

- comma-separated coordinates with dot decimals: `37.45,70.36`;
- semicolon-separated coordinates with comma decimals: `37,45;70,36`.

When both forms could be interpreted, prefer comma as the coordinate separator and dot as the decimal separator. Semicolon is the explicit escape hatch for decimal-comma locales.

First-version rejected forms:

```text
-20
-20,105,0
u=-20, v=105
```

Rejected values show a concise inline error in the status bar and keep focus in the input.

Possible later extensions:

- whitespace separator;
- `u=... v=...` syntax;
- relative coordinates;
- polar coordinates.

## Architecture

The feature should flow through the existing tool pipeline:

```text
StatusBar input
  -> App/runtime action
  -> SvgCanvas/CanvasInteractionController
  -> current ITool
  -> ArgumentCollectorTool plane-position submission
  -> ToolConstructionIntent
  -> RuntimeCommandProducer
  -> Command/Operation
  -> World
```

The status bar must not construct geometry commands directly.

## Proposed Interfaces

### Tool Position Submission

Do not add coordinate-specific optional methods directly to the base `ITool` interface. Most tools do not need this surface, and optional methods on the core interface would make every tool appear coordinate-aware.

Instead add a narrow capability interface next to the tool protocol:

```ts
export interface PlanePositionInputCapableTool extends ITool {
  handlePlanePositionInput(context: ToolContext, position: Vector3): ToolResult;
  acceptsPlanePositionInput(): boolean;
  getPlanePositionInputLabel(): string;
}
```

For `ArgumentCollectorTool`, implement these once.

Add a local type guard where needed:

```ts
function supportsPlanePositionInput(tool: ITool): tool is PlanePositionInputCapableTool {
  return typeof (tool as Partial<PlanePositionInputCapableTool>).handlePlanePositionInput === 'function'
    && typeof (tool as Partial<PlanePositionInputCapableTool>).acceptsPlanePositionInput === 'function';
}
```

`handlePlanePositionInput()` should:

1. initialize viable sets if needed;
2. verify at least one viable next argument accepts `SelectionMask.none()`;
3. create:

   ```ts
   const argumentValue = {
     element: null,
     planeCoords: position,
   };
   ```

4. reuse the same argument-add, validation, viable-set update, completion, execution, reset, and status-message logic as `handleClick()`.

To avoid duplicating logic, extract a private helper from `handleClick()`:

```ts
private collectArgumentValue(
  argumentValue: ArgumentValue,
  context: ToolContext,
  collectionContext: CollectionContext
): ToolResult
```

Then both click and typed-position paths call that helper.

### Tool Capability Query

`ArgumentCollectorTool.acceptsPlanePositionInput()` should return true when at least one viable next argument accepts `SelectionMask.none()`.

The method should lazily initialize viable sets in the same way as `getSelectionMask()`.

Pseudo-code:

```ts
acceptsPlanePositionInput(): boolean {
  this.ensureViableSetsInitialized();
  return this.getViableNextArgumentSpecs()
    .some(spec => spec.mask instanceof NoneMask);
}
```

`getPlanePositionInputLabel()` can return the first viable `SelectionMask.none()` spec name, falling back to `position`.

### Canvas Controller Entry Point

Add an application-facing method to `CanvasInteractionController`:

```ts
submitPlanePositionInput(args: {
  activePlaneId: string;
  planePos: Vector3;
  commandSink: ToolCommandSink;
  readPort: ToolInteractionReadPort;
}): ToolResult;
```

This method delegates to the current concrete tool's `handlePlanePositionInput()`.

The current controller already owns the concrete tool lifecycle, so it is the right place to prevent Vue components from knowing concrete tool classes.

The controller should use the capability type guard. If the active tool does not implement `PlanePositionInputCapableTool`, or implements it but does not currently accept a typed position, return a failed `ToolResult` without mutating tool state.

### SvgCanvas Public Method

Expose a method from `SvgCanvas.vue`:

```ts
submitPlanePositionInput(coords: { u: number; v: number }): ToolResult;
```

It should:

1. read the active plane id;
2. require an active projection plane;
3. construct `new Vector3(u, v, 1)`;
4. build the same tool context dependencies used by click handling, but without requiring screen/canvas hit-test coordinates;
5. call `controller.submitPlanePositionInput(...)`;
6. refresh tool status message.

If the active plane is missing or the current tool does not accept a plane position, return a failed `ToolResult` with a clear message.

### Runtime/App Wiring

`App.vue` currently holds refs to `SvgCanvas` and renders `StatusBar`.

Add a callback path:

```vue
<StatusBar
  ...
  :plane-position-input="planePositionInputState"
  @submit-plane-position="handleSubmitPlanePosition"
/>
```

`handleSubmitPlanePosition` calls:

```ts
svgCanvasRef.value?.submitPlanePositionInput({ u, v })
```

The result should be fed back to the widget so it can clear on success or display an error on failure.

This is acceptable as a first step because `App.vue` already mediates between `StatusBar` and `SvgCanvas` for status-level concerns. Do not move the state into a Pinia store for the first implementation: the coordinate input availability is transient tool-interaction state derived from the current concrete tool, not durable UI preference state.

Later, the callback can move behind a runtime port if this path grows.

## Status Bar Design

Create a small component:

```text
frontend/src/components/toolbars/PlanePositionInput.vue
```

Props:

```ts
interface Props {
  enabled: boolean;
  label: string;
  activePlaneName: string;
  error?: string;
}
```

Emits:

```ts
submit: [{ u: number; v: number }]
clear: []
focusStateChanged: [focused: boolean]
```

Responsibilities:

- render a real `<input>`;
- maintain local text buffer;
- parse on Enter;
- display inline error;
- expose `focusAndInsert(text: string)` via `defineExpose`;
- clear on successful submission or explicit clear.

`StatusBar.vue` embeds this component and exposes a method upward if needed:

```ts
defineExpose({
  focusCoordinateInputWithText,
  isCoordinateInputFocused,
});
```

Alternative: keep the exposed ref in `App.vue` by giving `PlanePositionInput` a direct ref there. The cleaner first implementation is to keep it inside `StatusBar` and expose a narrow method.

## Keyboard Router

The existing `KeyboardShortcutRouter` owns app-level shortcuts. It should perform coordinate-input routing before shortcut dispatch.

Add dependencies:

```ts
coordinateInput: {
  isAvailable(): boolean;
  focusWithText(text: string): void;
  isFocused(): boolean;
  clear(): void;
  blur(): void;
  hasText(): boolean;
}
```

The coordinate adapter belongs in the router rather than in a competing `window.keydown` listener. Keyboard priority is already centralized here, and the existing Escape behavior must be corrected in the same place.

Recommended router behavior:

```ts
if (coordinateInput.isFocused()) {
  if (event.key === 'Escape') {
    if (coordinateInput.hasText()) {
      coordinateInput.clear();
      event.preventDefault();
      return;
    }
    coordinateInput.blur();
    // Let the next Escape, not this one, perform global tool cancel.
    event.preventDefault();
    return;
  }
  return;
}

if (isEditableExternalTarget(event.target)) return;

if (coordinateInput.isAvailable() && isCoordinateStarterKey(event)) {
  coordinateInput.focusWithText(event.key);
  event.preventDefault();
  return;
}

// Existing shortcut routing continues.
```

Coordinate starter keys:

```ts
const COORDINATE_STARTER_KEYS = new Set([
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '.', ',', '+', '-',
]);
```

Do not treat Enter as a starter key. Enter should only submit once the input is focused.

Coordinate starter routing must ignore modified key combinations except Shift where needed to type `+` on keyboard layouts that require it. `Ctrl`, `Meta`, and `Alt` combinations stay reserved for browser/app shortcuts and text editing.

## Plane Position Input State

The widget needs to know whether the active tool can accept a position.

Add a computed state in `SvgCanvas.vue` or tool runtime:

```ts
{
  enabled: boolean;
  label: string;
}
```

The source of truth should be the current tool instance, via `CanvasInteractionController`.

Possible `CanvasInteractionController` methods:

```ts
acceptsPlanePositionInput(): boolean;
getPlanePositionInputLabel(): string;
```

`SvgCanvas` can emit state changes to `App.vue`:

```ts
'update-plane-position-input-state': [
  state: { enabled: boolean; label: string }
]
```

This keeps `StatusBar` presentational.

Initial implementation can recompute on:

- active tool changes;
- each tool argument collection result;
- tool reset/cancel;
- active plane changes.

## Error Handling

Parser errors:

- show inline text such as `Enter coordinates as u,v`;
- keep focus in the input;
- do not modify tool state.

Tool submission errors:

- show the tool result message;
- keep the typed text so the user can correct it;
- do not reset the current tool unless the tool itself resets after execution failure.

Successful submission:

- clear input;
- clear input error;
- blur input so ordinary tool shortcuts remain available immediately;
- rely on coordinate starter keys to re-focus the input for rapid repeated coordinate entry.

## Implementation Steps

### Step 1: Parser

Add:

```text
frontend/src/application/coordinates/parsePlaneCoordinateInput.ts
```

Export:

```ts
export interface ParsedPlaneCoordinates {
  u: number;
  v: number;
}

export function parsePlaneCoordinateInput(input: string): ParsedPlaneCoordinates;
```

Tests:

```text
frontend/tests/unit/application/coordinates/parsePlaneCoordinateInput.spec.ts
```

### Step 2: Add Plane Position Capability Interface

Update:

- `frontend/src/tools/ITool.ts`
- `frontend/src/tools/ArgumentCollectorTool.ts`

Add `PlanePositionInputCapableTool` as a specialized interface and implement it in `ArgumentCollectorTool`. Do not add optional coordinate methods to base `ITool`.

Add focused unit tests for:

- `PointTool` accepts plane-position input initially;
- submitting `Vector3(-20, 105, 1)` creates a point through the normal command sink;
- tools that do not have a viable `SelectionMask.none()` argument reject typed positions.

### Step 3: Canvas Controller

Update:

- `frontend/src/application/canvas/CanvasInteractionController.ts`
- `frontend/src/components/workspace/SvgCanvas.vue`

Expose the submit path from Vue to the controller and ensure tool status updates mirror click behavior.

### Step 4: Widget Component

Add:

- `frontend/src/components/toolbars/PlanePositionInput.vue`

Update:

- `frontend/src/components/toolbars/StatusBar.vue`

The widget should be compact and fit the existing status bar density.

### Step 5: App Wiring

Update:

- `frontend/src/App.vue`

Wire:

- plane-position input availability state from `SvgCanvas`;
- submit event from `StatusBar` to `SvgCanvas`;
- submission result back to `StatusBar`.

### Step 6: Keyboard Routing

Update `frontend/src/application/appShell/KeyboardShortcutRouter.ts` to accept a coordinate-input adapter.

This is not optional for the final implementation because the router currently handles Escape globally before respecting focused inputs. The coordinate input must be integrated into the router's priority order so Escape, Delete, Backspace, cursor keys, and copy/paste behave correctly inside the input.

Also keep `+` and `-` free for signed coordinate input when unmodified. If zoom shortcuts are added in this pass, use `Ctrl+Plus`/`Ctrl+=` and `Ctrl+-`, not bare plus/minus.

### Step 7: E2E Coverage

Add Playwright tests:

```text
frontend/tests/e2e/plane-position-input-widget.spec.ts
```

Scenarios:

1. Select Point tool, type `-20,105`, press Enter, assert a point appears at `(-20, 105)` in the `P_H` element panel or via SVG/render state.
2. Type `37.45,70.36`, use ArrowLeft/Backspace/Delete to edit, press Enter, assert the final coordinate is used.
3. Paste `-20,105`, press Enter, assert point creation.
4. With Point active and no input focus, press `L`; assert Line tool activates.
5. With Point active and no input focus, press `-`; assert coordinate input focuses and contains `-`.
6. With coordinate input focused and containing text, press Escape; assert it clears without switching tools.
7. With coordinate input focused and empty, press Escape; assert it blurs without switching tools, then press Escape again and assert existing tool-cancel/select behavior works.
8. Type or paste `-20,5;10,2`, press Enter, and assert decimal-comma parsing uses `u = -20.5`, `v = 10.2`.

## Validation Commands

Run from repository root:

```bash
npm run test --workspace=frontend
npm run test:e2e --workspace=frontend
npm run lint --workspace=frontend
```

If the change touches architectural boundaries or command wiring significantly:

```bash
npm run test:architecture --workspace=frontend
```

## Risks And Mitigations

### Keyboard Conflicts

Risk: coordinate input steals shortcuts unexpectedly.

Mitigation:

- only coordinate starter keys auto-focus the input;
- never intercept external input/modal targets;
- keep non-coordinate shortcuts routed normally unless the coordinate input is focused;
- blur after successful submission so tool hotkeys are immediately available again.

### Hidden Tool State Divergence

Risk: typed input path and click path behave differently.

Mitigation:

- both paths must create an `ArgumentValue`;
- both paths must pass through the same `tryAddArgument`, validation, viable-set update, completion, execution, and reset logic.

### Status Bar Becoming Stateful

Risk: `StatusBar` grows into a tool controller.

Mitigation:

- `StatusBar` owns only text input UI state;
- it emits parsed coordinates;
- it does not know concrete tools, commands, or world state.

### Ambiguous Locale Parsing

Risk: comma as coordinate separator conflicts with decimal-comma expectations.

Mitigation:

- support comma-separated dot-decimal coordinates and semicolon-separated comma-decimal coordinates from the first parser version;
- keep ambiguous comma-only input interpreted as coordinate-separator syntax.

## Future Extensions

Once this path works for `SelectionMask.none()` position arguments, the app can generalize the argument framework more explicitly:

```ts
type ToolArgumentSpec =
  | { name: string; kind: 'selection'; mask: SelectionMask }
  | { name: string; kind: 'plane-position' }
  | { name: string; kind: 'scalar'; role: 'length' | 'angle' | 'number' };
```

At that point, the status bar can expose:

- coordinate input for `plane-position`;
- numeric input for `scalar`;
- future distance/angle transport providers.

The important principle remains the same: tools declare what kind of argument they need, and the UI offers compatible input providers.

### Point Arguments From Typed Coordinates

A high-value later extension is to let typed coordinates satisfy tools that currently expect point elements, such as `LineTool`, `SegmentTool`, and `CircleTool`.

That should not be part of the first implementation because it creates additional geometry as a side effect. The later design should make that side effect explicit:

1. the active tool asks for a point element;
2. the user enters coordinates;
3. the coordinator creates a free point at those coordinates through the normal command pipeline;
4. the newly created point is immediately fed back to the active tool as the requested point argument;
5. the process tree records both the intermediate point and the final construction, or intentionally encapsulates the intermediate point according to a documented rule.

This extension would make workflows such as "type two endpoints while Segment is active" possible without weakening the first version's simpler guarantee: typed input initially submits only arguments that already accept free plane positions.
