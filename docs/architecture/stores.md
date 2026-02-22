# Stores

Diedrico uses Pinia for reactive state management. Each store handles a specific concern.

## Store Overview

| Store | Purpose |
|-------|---------|
| `processStore` | Construction history tree + command stack |
| `selectionStore` | Selected and highlighted elements |
| `toolStore` | Active tool and tool family management |
| `viewStore` | Viewport state (zoom, pan) and 3D options |
| `settingsStore` | User preferences (grid, snap, styles) |
| `authStore` | Google authentication state |

## processStore

Manages the `ProcessTree` and `CommandStack`:

**State:**
- `root: Process` — the process tree
- `commandHistory: CommandStack` — undo/redo stacks

**Getters:**
- `getNodeByPath(path)` — find node by tree path
- `visibleSubprocesses` — subprocesses respecting encapsulation
- `allActions` — flat list of all actions

**Actions:**
- `addSubprocess()`, `addActionGroup()`, `addAction()`
- `removeSubprocess()`, `removeActionGroup()`
- `clear()` — reset everything

## selectionStore

Tracks which elements are selected and highlighted:

**State:**
- `selectedIds: Set<string>` — currently selected element IDs
- `cascadeHighlightIds: Set<string>` — dependents highlighted on hover

**Computed:**
- `hasSelection` — boolean, any selection exists
- `selectionCount` — number of selected items

**Actions:**
- `selectSingle(id)` — replace selection with one element
- `addToSelection(id)` — add to current selection
- `toggleSelection(id)` — add or remove (Shift+click)
- `clearSelection()` — deselect everything
- `selectMultiple(ids)` — replace with a set
- `setCascadeHighlight(ids)` — highlight dependents on hover

## toolStore

Manages the active construction tool:

**Tool families** (toolbar groups):
- Point family: Free Point, Intersection
- Line family: Line, Parallel, Perpendicular, Tangent variants
- Segment family: Segment
- Circle family: Circle
- Guide family: Guide
- 3D Elements: 3D Point, 3D Line, 3D Segment, 3D Plane, Aux. Projection Plane
- Examples: Folding Plane Setup, Quick 3D Line

**Features:**
- Last-used tool per family (persisted in `localStorage`)
- Keyboard shortcuts: `P`, `L`, `S`, `C`, `G`, `I`, `Esc`
- Tool activation/deactivation lifecycle
- Argument collection state for multi-pick tools

## viewStore

Controls the 2D viewport and 3D display options:

**State:**
- `zoom`, `panX`, `panY` — 2D canvas viewport
- `gridVisible` — grid toggle
- `threeViewOptions` — 3D view toggles (persisted in `localStorage`)
- `showProjectedElements` — show 3D projections on planes

**Actions:**
- `setZoom(level)`, `setPan(x, y)`
- `adjustZoom(delta, focusPoint)` — zoom toward cursor
- `resetViewport()` — return to default view

## settingsStore

User preferences, auto-saved to `localStorage`:

**Categories:**

| Category | Settings |
|----------|----------|
| Grid | Visibility, spacing, snap-to-grid |
| Snap | Enabled, snap radius |
| Default Styles | Colors and line widths for points, lines, circles, guides |
| 3D View | Default visibility of planes, projection lines |

All settings use deep watchers for automatic persistence.

## authStore

Manages Google OAuth2 authentication state for Drive integration.
