# MCP tool structure: how to encode the UI surface

How the 63 user-level actions enumerated in [the tool surface](./mcp-tool-surface.md)
become actual MCP tools. That document owns *what* can be done; this one owns *how it is
encoded*.

Status: **proposal, not implemented**. Only `hello` exists today.

## 1. Constraints that shape the decision

| Constraint | Consequence |
| --- | --- |
| OpenCode requires client names matching `[a-zA-Z0-9_-]+` and prefixes every tool with the client name (`diedrico_ab12.create_point`) | Tool names stay short; no need to repeat the product name |
| Every tool's name, description and JSON schema sits in the model's context on every turn | Tool count is a budget, not a style preference |
| Code Mode calls tools as functions, so a wrong enum value fails at call time, not at selection time | The tool name is the dispatcher the model sees first |
| Error messages are the model's correction signal | "missing point1Id" beats "invalid value for kind" |
| Tool schemas are not validated by the OpenCode client helper | Each tool must validate its own arguments and say what is wrong |

Rough budget: a simple observation costs ~40–50 tokens of schema, a construction with
three ids ~80–100. 63 tools land around 4–5k tokens per turn; 38 land near 2.5–3k.

## 2. When to group

Group operations into one tool only when **all four** hold:

1. **Same target object.** Selection actions act on the selection; process actions act on
   the process tree.
2. **Mutually exclusive in one call.** You never push and pop in the same breath.
3. **Arguments are a superset with a discriminator**, not disjoint shapes. `select` and
   `clear` differ only by `entityIds`.
4. **The grouped name still reads like a user action.** `process_edit` does;
   `do_something(action)` does not.

Keep tools flat when any of these is true:

- **The verb is the contract.** `create_point` and `create_line` take different required
  arguments; folding them into `create({kind})` turns a missing argument into a wrong
  enum value.
- **The action is high-frequency.** `undo`, `redo`, `select_tool` are said constantly;
  a discriminator adds noise to the most common calls.
- **The arguments are structurally different.** Position edits and process-tree edits
  share no fields.

## 3. Result: 63 actions, 38 tools

| Group | Now | After | What merges |
| --- | --- | --- | --- |
| Discovery | 9 | 8 | `get_dependents` becomes `get_relations(direction)` |
| Construction 2D | 11 | 11 | flat |
| Construction 3D | 7 | 4 | the four projection-based creations into one |
| Selection | 5 | 2 | four mutations into `selection_update`; `get_selection` stays |
| Editing | 5 | 3 | `move_free_point` and `toggle_visibility` fold into `update_entity` |
| History | 3 | 2 | `get_history` folds into `get_state` |
| Tool state | 5 | 3 | `get_tool_state` folds into `get_state`; `set_hover` dropped |
| View | 8 | 2 | groups into `set_view` and `set_display` |
| Process tree | 6 | 1 | one `process_edit` with an action enum |
| Project/settings | 4 | 2 | `get_project_state` folds into `get_state`; `get_settings` into `set_settings` |

## 4. Final catalog

### Discovery (8)

| Tool | Arguments |
| --- | --- |
| `get_state` | — |
| `list_planes` | — |
| `set_active_plane` | `planeId` |
| `list_entities` | `planeId?`, `kind?`, `limit?` |
| `inspect_entity` | `entityId` |
| `get_relations` | `entityId`, `direction` (`up` \| `down` \| `both`), `depth?` |
| `get_process_tree` | `depth?` |
| `find_candidates` | `kind`, `planeId?`, `near?` |

`get_state` absorbs tool state, history availability, project state, selection size and
settings, because they are all "where am I" answers the model needs before acting.
`get_relations(direction: 'down')` is the dependents inspection: everything that hangs
from an element, in deletion order.

### Construction 2D (11)

`create_free_point`, `create_intersection`, `create_line`, `create_angle_line`,
`create_parallel_line`, `create_perpendicular_line`, `create_tangent_line`,
`create_segment`, `create_circle`, `create_circle_by_radius`, `create_guide`.

Flat on purpose: each required argument set is distinct, the name is the contract, and
the multi-solution protocol lives on `create_intersection` and `create_tangent_line`
without a wrapper adding a second indirection.

### Construction 3D (4)

| Tool | Arguments |
| --- | --- |
| `create_3d_from_projections` | `kind` (`point` \| `line` \| `segment` \| `plane`), `projection1Id`, `projection2Id` |
| `create_3d_point_xyz` | `x`, `y`, `z` |
| `create_projection_plane` | `t1HingeTraceLineId`, `t2OtherTraceLineId`, `t2PrimePositionLineId` |
| `add_yz_projection_plane` | — |

The four projection-based creations share one shape (two projections on different
planes), so the discriminator is genuinely the only difference. `create_3d_plane`
additionally means "two trace lines", which the same two-id shape covers.

### Selection (2)

| Tool | Arguments |
| --- | --- |
| `selection_update` | `action` (`select` \| `add` \| `clear` \| `all`), `entityIds?` |
| `get_selection` | — |

### Editing (3)

| Tool | Arguments |
| --- | --- |
| `update_entity` | `entityId`, `position?`, `radius?`, `angleDegrees?`, `color?`, `lineWidth?`, `lineStyle?`, `visible?` |
| `preview_delete` | `entityIds` |
| `delete_entities` | `entityIds` |

`update_entity` is one partial update over the properties dialog, of which moving a free
point and toggling an eye are degenerate cases. Splitting them would be three tools for
one user surface.

### History (2)

`undo`, `redo`.

### Tool state (3)

`select_tool`, `submit_tool_argument`, `cancel_interaction`.

### View (2)

| Tool | Arguments |
| --- | --- |
| `set_view` | `fit?`, `zoom?`, `panX?`, `panY?` |
| `set_display` | `grid?`, `projectedElements?`, `show3DView?`, `planes?`, `elementsOnPlanes?`, `projectionLines?`, `threeDGrid?`, `axes?`, `windowMode?` |

Both are partial setters. The user sees them as one toolbar plus one 3D options panel, so
two tools match the surface better than eight toggles.

### Process tree (1)

| Tool | Arguments |
| --- | --- |
| `process_edit` | `action` (`push` \| `pop` \| `rename` \| `set_output` \| `set_encapsulation` \| `select`), `nodeId?`, `label?`, `value?` |

Six homogeneous operations over one tree. Prefer desired state (`value: true`) over the
UI's toggles, so a retry is idempotent.

### Project and settings (2)

`rename_project`, `set_settings`. Drive and account operations remain out of scope.

## 5. Rejected groupings

| Rejected | Why |
| --- | --- |
| One `construct({kind})` for all 15 creations | Disjoint required arguments; a missing id becomes an opaque enum error; the model cannot tell which tool to reach for |
| `entity({action: 'create' \| 'update' \| 'delete'})` | Creation, mutation and destructive deletion have different risk and different validation; three tools describe them better |
| `selection` absorbing `get_selection` | A read that returns ids is better kept separate from a mutation, so the model can inspect without side effects |
| `history({action})` | `undo` and `redo` are the two most frequent calls; a discriminator only adds noise |
| `view` as one tool with 9 optional fields | `set_view` (viewport) and `set_display` (visibility/composition) change different things and are checked differently |
| `get_state` split into four gets | The model asks "where am I" far more often than it asks for one slice; four round trips is worse than one slightly larger answer |
| `set_hover` | Transient pointer decoration with no user-level outcome; it belongs to the UI, not the contract |

## 6. Implementation order

Each tier is independently testable and useful on its own:

1. **Observations** (`get_state`, `list_planes`, `list_entities`, `inspect_entity`,
   `get_relations`, `get_selection`). Read-only, no risk, immediately useful for
   grounding.
2. **Construction 2D.** The core value; exercise the multi-solution protocol here.
3. **Editing, deletion and history.** Needs care with cascade results and undo.
4. **3D, selection mutation, tool state.**
5. **View, process tree, project and settings.**

## 7. Screenshots

Screenshots do **not** belong in the MCP bridge:

- The embedded browser already provides `browser.screenshot`, which returns the image and
  a server-local path. Adding a `render_snapshot` tool would create a second rendering
  mechanism for one concern.
- It only works while Diedrico runs inside that browser tab and the tab is visible;
  a standalone browser tab has no such path, and a hidden tab fails to capture.
- Pixels are untrusted and lossy: they are a verification aid, not an authority. Geometry,
  ids and relationships must come from the observation tools.

Recommended flow: act through the MCP tools, then screenshot to confirm the visual
result, then correct with another tool call. Text observations answer "what is there";
the screenshot answers "does it look right".

## 8. Remaining questions

- Whether `get_state` should accept a `sections` filter once the payload grows.
- Whether `find_candidates` and `inspect_entity` should share a response shape for
  arguments.
- Whether `process_edit` should expose UI-only collapse state (currently excluded).
