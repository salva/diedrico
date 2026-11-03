# MCP tool surface: full UI coverage

Inventory of every interactive surface in Diedrico and the high-level tool contract
that should expose it to an OpenCode session.

Status: **enumeration and proposed contract, not implemented**. Today only `hello`
exists (see [the MCP bridge](./mcp-bridge.md)).

## 1. Contract rules

The tools must read like what a competent user can do, not like DOM events:

1. **Intent, not pointer.** No "click at (412, 233)". Tools take plane coordinates,
   element IDs and enum values.
2. **One tool, one user action.** A tool maps to one thing a user can do from the UI
   (create a point, toggle the grid, rename a process node), not to a bundle of them.
3. **The user's vocabulary.** Tool names follow the toolbar and panel labels: `free
   point`, `intersection point`, `push subprocess`, `mark as output`.
4. **Observation before action.** Every entity the model may act on must be
   discoverable through a read tool, with stable IDs returned in that same response.
5. **Explicit ambiguity.** Anything the user resolves by clicking (which branch of an
   intersection, which of two tangents) is resolved by an explicit argument, never by
   guessing a "reasonable" position.
6. **Honest gaps.** Capabilities that do not exist (Transport tool) must return a
   typed "unavailable" result, not fail obscurely.
7. **Same command stack.** Tool calls go through the existing commands, so undo, autosave
   and the process tree behave exactly as after a manual action.

Element identity follows the distinction in the design: `entityId` (one domain
definition) is the tool-facing handle; labels are search hints only; presentation
`representationId`s are never accepted as construction arguments.

## 2. Inventory of interactive surfaces

### 2.1 Toolbar (top bar)

| Control | What the user does |
| --- | --- |
| New Project | Starts an empty project |
| Open Project | Opens the project chooser (Drive or local mode) |
| Undo / Redo | Steps through command history, disabled when empty |
| Active plane selector | Dropdown listing planes; selects the active plane |
| Toggle Grid | Shows or hides the drawing grid |
| Toggle 3D Projections | Shows or hides projected 3D elements on the 2D canvas |
| Fit to View | Fits the whole drawing in the viewport |
| Selection Tool | Switches to select mode (Esc) |
| Eight tool families | Each opens a dropdown of tools; picking one changes the active tool |
| Sign in / Sign out | Google Drive account state |

### 2.2 Tool families and tools (from `config/toolFamilies.ts`)

| Family | Tool id | Label | Shortcut | Notes |
| --- | --- | --- | --- | --- |
| Point | `point` | Free Point | P | Click places a point |
| Point | `intersection` | Intersection Point | I | Select two elements |
| Line | `line` | Line Through Points | L | Two points |
| Line | `line-with-angle` | Line With Angle | — | Reference line + point + angle |
| Line | `parallel-line` | Parallel Line | — | Reference line + point |
| Line | `perpendicular-line` | Perpendicular Line | — | Reference line + point |
| Line | `tangent-line-to-circle-through-point` | Tangent (Point) | — | Circle + external point, 2 solutions |
| Line | `tangent-line-to-circle-parallel` | Tangent (Parallel) | — | Circle + reference line, 2 solutions |
| Segment | `segment` | Segment | S | Two points |
| Circle | `circle` | Circle | C | Center + circumference point |
| Guide | `guide` | Guide | G | Perpendicular to hinge line, through point |
| Transport | `transport` | Transport | T | **Not implemented** (placeholder) |
| 3D Elements | `create3dpoint` | 3D Point | — | From two 2D projections |
| 3D Elements | `create3dline` | 3D Line | — | From two projected lines |
| 3D Elements | `create3dsegment` | 3D Segment | — | From two projected segments |
| 3D Elements | `create3dplane` | 3D Plane | — | From two trace lines |
| 3D Elements | `createprojectionplane` | Projection Plane | — | T1 hinge + T2 trace + T2′ position |
| Constructions | `create3dpoint-by-coordinates` | 3D Point XYZ | — | Dialog with X, Y, Z |
| Constructions | `quick-yz-projection-plane` | Add YZ Plane | — | Adds the YZ profile plane |
| Constructions | `quickprojectionsetup` | Folding Plane Setup | — | Creates T1, T2, T2′ |
| Constructions | `quick3dline` | Quick 3D Line | — | Example macro |
| Constructions | `quick3dsegment` | Quick 3D Segment | — | Example macro |

### 2.3 Canvas

| Gesture | What the user does |
| --- | --- |
| Click with a construction tool | Places the element, or collects the next argument |
| Click with Selection Tool | Selects the element under the pointer |
| Shift+click | Adds an element to the selection |
| Drag on empty space | Pans the viewport |
| Mouse wheel | Zooms around the pointer |
| Drag a free point | Moves the point with preview and commit |
| Double-click | Opens the properties dialog for the element |
| Hover | Highlights the element under the pointer |
| Typing a number while a tool waits for a position | Opens the coordinate input and accepts `u,v` |

### 2.4 Element panel (left, top)

| Control | What the user does |
| --- | --- |
| Collapse 2D / 3D section | Folds the section |
| Collapse plane group | Folds that plane's list |
| Click an element row | Selects that element |
| Eye icon | Toggles element visibility |

### 2.5 Construction history panel (left, bottom)

| Control | What the user does |
| --- | --- |
| Push subprocess `>` | Creates a subprocess and enters it |
| Pop subprocess `<` | Closes the current subprocess |
| Collapse node | Folds children |
| Double-click a node / action label | Renames it |
| Click a node | Selects the related elements |
| Show Intermediates (gear) | Toggles encapsulation visibility |
| Mark as Output (check) | Marks a node as an output |
| Click an element label inside an action | Selects that element |
| Double-click the description | Expands or collapses it |

### 2.6 Properties dialog

Position `u`/`v` (free points), parameter (circle radius, line angle), color, line width,
line style (solid/dashed/dotted), visibility — each with its own override checkbox.
Confirm or cancel.

### 2.7 3D window

Minimize, maximize/restore, move by dragging the title bar, and five display options:
show planes, show 2D elements on planes, show projection lines, show grid, show
reference axes.

### 2.8 Status bar

Read-only: active plane, active tool, tool step message, cascade-deletion warning,
save status, 3D coordinates under the pointer. The coordinate input becomes actionable
when a tool waits for a position.

### 2.9 Dialogs and account

Startup dialog (sign in, create project, open project, continue in local mode), 3D
coordinates dialog, rename-project inline editor (F2), sign-in/sign-out.

### 2.10 Keyboard shortcuts (user-level actions)

`P` `L` `S` `C` `G` `I` tool selection · `D` projections · `Esc` select mode +
clear selection · `Del`/`Backspace` delete selection · `F2` rename project · `Tab`/
`Shift+Tab` cycle active plane · `Ctrl+N` new · `Ctrl+O` open · `Ctrl+A` select all in
active plane · `Ctrl+0` fit to view · `Ctrl+Z` undo · `Ctrl+Y`/`Ctrl+Shift+Z` redo.

## 3. Proposed tool catalog

### 3.1 Discovery and observation

| Tool | Arguments | Returns / effect |
| --- | --- | --- |
| `get_state` | — | Active plane, tool, planes, entity counts, presentation version, undo/redo availability, save status, selection size |
| `list_planes` | — | Every plane: id, name, kind (main/auxiliary), element counts |
| `set_active_plane` | `planeId` | Selects the plane; rejects unknown ids instead of falling back |
| `list_entities` | `planeId?`, `kind?`, `limit?` | Entities with id, kind, label, plane, visibility |
| `inspect_entity` | `entityId` | Geometry, definition mode, dependencies, representations, where it is selectable |
| `get_relations` | `entityId` | Construction parents/children, sibling links, 3D reconstructions |
| `get_process_tree` | `depth?` | Process tree nodes: id, label, kind, output/encapsulation flags, active subprocess |
| `find_candidates` | `kind`, `planeId?`, `near?` | Candidate entities for a tool argument, with the reason each qualifies |

### 3.2 Construction (2D)

| Tool | Arguments | Maps to tool |
| --- | --- | --- |
| `create_free_point` | `planeId?`, `u`, `v` | Free Point (`point`) |
| `create_intersection` | `element1Id`, `element2Id`, `solutionIndex?` | Intersection Point (`intersection`); see 3.2.1 |
| `create_line` | `point1Id`, `point2Id` | Line Through Points (`line`) |
| `create_angle_line` | `referenceLineId`, `throughPointId`, `angleDegrees` | Line With Angle |
| `create_parallel_line` | `referenceLineId`, `throughPointId` | Parallel Line |
| `create_perpendicular_line` | `referenceLineId`, `throughPointId` | Perpendicular Line |
| `create_tangent_line` | `circleId`, `throughPointId?`, `referenceLineId?`, `solutionIndex?` | Both tangent tools; see 3.2.1 |
| `create_segment` | `point1Id`, `point2Id` | Segment (`segment`) |
| `create_circle` | `centerPointId`, `circumferencePointId` | Circle (`circle`) |
| `create_circle_by_radius` | `centerPointId`, `radius` | Radius-vector variant |
| `create_guide` | `referenceLineId`, `throughPointId` | Guide (`guide`) |

#### 3.2.1 Two-phase disambiguation

Constructions with more than one valid answer never guess. The protocol is the same
for every multi-solution tool (line/line, line/circle and circle/circle intersections,
both tangent variants):

1. **First call omits `solutionIndex`.** Exactly one valid solution means the tool
   executes normally and returns the created entity.
2. **Several valid solutions return unresolved, not an exception.**
   `create_intersection` and `create_tangent_line` answer with `isError: true`, and the
   text content carries this JSON payload:

   ```json
   {
     "code": "ambiguous_solutions",
     "message": "2 intersections between line-12 and circle-7",
     "drawingRevision": 42,
     "candidates": [
       { "index": 0, "kind": "finite-segment", "position": { "u": 12.5, "v": -3 }, "summary": "inside the segment" },
       { "index": 1, "kind": "finite-segment", "position": { "u": 41, "v": 8 }, "summary": "outside the segment" }
     ]
   }
   ```
3. **The model retries the same tool with `solutionIndex`** plus the `drawingRevision`
   it received. A stale revision is rejected rather than silently mapped to a different
   candidate.
4. Zero valid solutions returns `code: "no_solution"` with the reason (parallel,
   disjoint, degenerate), never an empty error.

Candidate `index` values are derived from a deterministic ordering computed by the
shared construction logic, so the same inputs produce the same indices. The UI's own
click position is not part of this contract: the existing mouse-driven branch selection
must move into that shared logic, and both the UI and the tools consume the same
ordered candidate list.

Macros stay out of this protocol: they are parameterless today.


### 3.3 Construction (3D and planes)

| Tool | Arguments | Maps to tool |
| --- | --- | --- |
| `create_3d_point` | `projection1PointId`, `projection2PointId` | 3D Point |
| `create_3d_point_xyz` | `x`, `y`, `z` | 3D Point XYZ dialog |
| `create_3d_line` | `projection1LineId`, `projection2LineId` | 3D Line |
| `create_3d_segment` | `projection1SegmentId`, `projection2SegmentId` | 3D Segment |
| `create_3d_plane` | `trace1LineId`, `trace2LineId` | 3D Plane |
| `create_projection_plane` | `t1HingeTraceLineId`, `t2OtherTraceLineId`, `t2PrimePositionLineId` | Projection Plane |
| `add_yz_projection_plane` | — | Add YZ Plane |

### 3.4 Selection

| Tool | Arguments | Effect |
| --- | --- | --- |
| `select_entities` | `entityIds` | Replaces the selection, validating membership |
| `add_to_selection` | `entityIds` | Adds without clearing |
| `clear_selection` | — | Empties the selection |
| `select_all_in_active_plane` | — | `Ctrl+A` equivalent |
| `get_selection` | — | Selected ids plus the cascade preview |

### 3.5 Editing and deletion

| Tool | Arguments | Effect |
| --- | --- | --- |
| `move_free_point` | `entityId`, `u`, `v` | Preview + commit as one command |
| `update_entity` | `entityId`, `position?`, `radius?`, `angleDegrees?`, `color?`, `lineWidth?`, `lineStyle?`, `visible?` | Properties dialog equivalent |
| `toggle_visibility` | `entityId` | Eye icon in the element panel |
| `preview_delete` | `entityIds` | Cascade list without deleting |
| `delete_entities` | `entityIds`, `expectedCascadeCount?` | Delete with cascade confirmation guard |

### 3.6 History

| Tool | Arguments | Effect |
| --- | --- | --- |
| `get_history` | `limit?` | Undo/redo availability, next undo/redo ids and labels |
| `undo` | `expectedCommandId?` | Undo one command |
| `redo` | `expectedCommandId?` | Redo one command |

### 3.7 Tool state and interaction

| Tool | Arguments | Effect |
| --- | --- | --- |
| `select_tool` | `toolId`, `subToolId?` | Same as clicking a toolbar entry; rejects the unimplemented `transport` |
| `get_tool_state` | — | Active tool, next expected argument, step message |
| `submit_tool_argument` | `argument` | Coordinate input or typed argument for the pending step |
| `cancel_interaction` | — | `Esc`: back to Selection Tool and clear the pending step |
| `set_hover` | `entityId` | Transient highlight; `null` clears it |

### 3.8 View and presentation

| Tool | Arguments | Effect |
| --- | --- | --- |
| `fit_to_view` | — | `Ctrl+0` |
| `set_zoom` | `zoom`, `focus?` | Wheel zoom equivalent, clamped to the user range |
| `pan_view` | `deltaX`, `deltaY` | Drag-pan equivalent |
| `toggle_grid` | `visible?` | Toolbar grid button |
| `toggle_projected_elements` | `visible?` | Toolbar projections button |
| `show_3d_view` | `visible?` | Opens or hides the 3D window |
| `set_3d_display_options` | `planes?`, `elementsOnPlanes?`, `projectionLines?`, `grid?`, `axes?` | The five 3D checkboxes |
| `set_3d_window_mode` | `mode` | `floating` / `minimized` / `maximized` |

### 3.9 Process tree

| Tool | Arguments | Effect |
| --- | --- | --- |
| `push_subprocess` | `label?` | `>` button |
| `pop_subprocess` | — | `<` button; fails honestly at the root |
| `rename_process_node` | `nodeId`, `label` | Double-click rename |
| `toggle_process_output` | `nodeId` | Mark as Output |
| `toggle_process_encapsulation` | `nodeId` | Show Intermediates |
| `select_process_node` | `nodeId` | Selects the node's related elements |

### 3.10 Project, account and settings

Drive and account operations are **out of scope for the first release** (decided). Only
local project metadata and preferences remain.

| Tool | Arguments | Effect |
| --- | --- | --- |
| `get_project_state` | — | Name, dirty state, save status, last save, Drive availability |
| `rename_project` | `name` | Inline rename (`F2`); autosave keeps its normal behaviour |
| `get_settings` / `update_settings` | `gridSpacing?`, `gridColor?`, `snapEnabled?`, `snapRadius?` | Preferences; no UI exists yet for these |

Excluded for now, listed so the gap is intentional and not an oversight:

| Not exposed | Why |
| --- | --- |
| `list_projects`, `open_project` | Require a signed-in Drive session and a resource choice |
| `create_project`, `save_project` | Cross the Drive boundary and may need a user gesture |
| `get_account_state`, `sign_in`, `sign_out` | Account transitions, not drawing work |

The startup dialog stays a human-only surface in the first release. `get_project_state`
still reports whether Drive is available, so the model can explain the limitation instead
of trying an operation that cannot succeed.

## 4. Interactive elements that must not become tools

| Element | Why | Where it belongs |
| --- | --- | --- |
| Status bar readouts (plane, tool, save status, coordinates) | Pure presentation | Fields of `get_state` |
| Tool step message | Feedback for a pending tool step | `get_tool_state` |
| Cascade warning | Preview of a destructive action | `preview_delete` / `get_selection` |
| Hover highlight | Transient pointer feedback | `set_hover`, not a user action |
| Panel collapse state, description expansion, window drag | Local presentation state | Excluded: no user-level outcome |
| Toolbar dropdown opening | Navigation affordance for choosing a tool | `select_tool` |
| Login status badge | Presentation of `get_account_state` | Observation only |

## 5. Explicit non-goals and open decisions

- **Transport tool** (`T`): advertised in the toolbar but not implemented. `select_tool`
  must return `unavailable` with that reason.
- **Constructions macros** (`Folding Plane Setup`, `Quick 3D Line`, `Quick 3D Segment`):
  decided. They are proof-of-concept helpers and stay unexposed while they remain so.
  When the family stabilizes, the whole family is reached through **one** tool,
  `run_macro({ macroId, arguments? })`, with a closed `macroId` union and per-macro
  argument schemas — not one tool per example. No per-macro tools will be added in
  between.
- **Destructive operations**: deletion already has a cascade preview. Decision needed
  whether `delete_entities` requires a matching `expectedCascadeCount` (safer, more
  calls) or trusts the model's intent.
  *What it means:* deleting an entity also deletes every transitive dependent, so one
  requested id can remove a large part of the drawing. `expectedCascadeCount` is an
  optimistic guard: the model calls `preview_delete` first, then passes the count it
  saw. If the cascade changed in between, the deletion is refused with
  `cascade_mismatch` (expected, actual, ids) instead of deleting something else. It
  protects both the size of the action and the freshness of the preview. A reasonable
  policy is to require it only above a small cascade threshold and always return the
  deleted ids.
- **Tangent and intersection branches**: decided, see 3.2.1. The tool omits
  `solutionIndex` first; multiple solutions return `ambiguous_solutions` with the
  ordered candidate list, and the model retries with the index it chose. The UI's
  click-derived branch selection moves into the same shared logic so both paths agree.
- **Project and account operations**: decided, out of the first release. Drive and account
  transitions stay human-only; see 3.10. Local project metadata remains readable so the
  model can reason about the open document.
- **Settings**: no UI exists today. Exposing settings before the UI exists violates the
  "user's vocabulary" rule; keep them out until the UI ships them.
- **Zoom/pan**: exposing raw viewport numbers is borderline; `fit_to_view` covers the
  user-level intent. Keep `set_zoom`/`pan_view` only if a concrete need appears.

## 6. Coverage summary

| Surface | Interactive items | Proposed tools |
| --- | --- | --- |
| Toolbar file/history/account | 7 | 4 now (history + project state/rename); Drive and account deferred |
| Active plane + view toggles | 4 | 5 |
| Tool families | 22 tools | 19 now + `run_macro` when the macros stop being PoC |
| Canvas gestures | 9 | 8 (drag and wheel included as high-level ops) |
| Element panel | 4 | 3 (select, visibility, list) |
| Construction history | 8 | 6 |
| Properties dialog | 6 fields | 2 (`update_entity`, `move_free_point`) |
| 3D window | 8 | 2 |
| Settings (no UI yet) | 4 | 2 (deferred) |

Totals: **~46 tools in the first release**, grouped in nine namespaces, plus the reserved
`run_macro`. Every row in section 2 has either a tool here, an explicit exclusion, or a
documented reason to stay out.
