# Data Model Optimization Plan: Simplified Project Format

## 1. Problem Analysis

The current `ProjectData` persistence format contains significant redundancy:
1.  **Command Metadata**: properties like `id`, `timestamp`, and `description` are stored for every command but are largely irrelevant for state reconstruction.
2.  **Redundant Parameters**: Operations often store context (like `planeId`) that could be inferred from other parameters (e.g., the elements being operated on).
3.  **Verbose Structure**: The JSON structure uses verbose keys for every operation definition.

Conversely, the user highlighted a reliability risk:
*   **Missing Creation IDs**: Replaying constructive operations (like "Add Point") without persisting the *resulting* ID means valid references cannot be maintained across sessions. (Note: This was partially addressed in Phase 95 via parameter back-filling, but needs a formalized standard).

## 2. Optimization Strategy

### 2.1. Structural Simplification (The "Journal" Format)

Flatten the `Command` > `Operation` hierarchy into a streamlined transaction log.

**Current (Verbose):**
```json
{
  "commands": [
    {
      "id": "uuid-1234",
      "timestamp": "2026-02-02T...",
      "description": "Add Point",
      "operations": [
        { "type": "AddPoint2DOp", "parameters": { "planeId": "p1", "x": 10, "y": 20 } }
      ]
    }
  ]
}
```

**Proposed (Compact):**
```json
{
  "v": 4, // Schema version (was schemaVersion)
  "history": [
    // Array of transactions. Simple commands are single-element arrays (or just objects).
    // Let's standardize on Array<CompactOperation> for each undo step.
    [
      { "t": "AddPoint", "p": { "planeId": "p1", "x": 10, "y": 20, "id": "pt_1" } }
    ]
  ]
}
```

### 2.2. Parameter Optimization

Identify operations with redundant context and infer it during reconstruction.

*   **Logic**: If an element resides in a container (Point in Plane), and we provide the Element ID, looking up the container via the Element ID during runtime is safer and reduces storage.
*   **Caveat**: For *creation* (`Add*`) operations, we usually *need* the container ID because the element doesn't exist yet.
*   **Candidate**: `AddSegment2D(planeId, p1Id, p2Id)` -> `AddSegment2D(p1Id, p2Id)`.
    *   *Constraint*: `p1` and `p2` must be on the same plane. The operation logic validates this anyway. The `planeId` in storage is redundant.
*   **Candidate**: `RemoveElement(planeId, elementId)` -> `RemoveElement(elementId)`.
    *   Since the element exists in World maps (or we can find it), `planeId` is redundant.

### 2.3. ID Persistence Standard

Establish a strict rule for all Constructive Operations:
*   **Requirement**: Any operation that generates a simplified ID (e.g., `point2d_5`) *must* write that ID back into its persisted parameters.
*   **Implementation**: The `serialization` method of ops should return the *output* ID as part of the parameters, not just the input args.

## 3. Implementation Plan

### Phase 96: Operations Serialization Refactoring

1.  **Audit Operations**: Review all `Add*` and `Remove*` operations.
    *   Identify generated IDs.
    *   Identify redundant container IDs.
2.  **Update `serialize()` methods**:
    *   Modify `IOperation` to enforce a `serialize()` method (currently it might rely on standard `parameters` property).
    *   Ensure `serialize()` returns a compact object `{ t: 'Type', p: { ... } }`.
    *   Ensure generated IDs are included.
    *   Exclude redundant `planeId` where safely inferable.

### Phase 97: Project Service Migration

1.  **New Serialization Logic**:
    *   Create `serializeCompact()` in `ProjectService`.
    *   Map `CommandStack` to `CompactHistory`.
    *   Strip Command metadata (Id, Description, Timestamp).
2.  **New Deserialization Logic**:
    *   Create `deserializeCompact()`.
    *   Reconstruct `Command` objects wrapper on the fly (generate ephemeral IDs/Descriptions for the UI).
3.  **Migration Path**:
    *   Increment Schema Version to `4.0.0`.
    *   Detect legacy format vs new format in `loadFile`.

## 4. Example Transformation

**Before:**
```json
{
  "type": "AddSegment2DByPointsOp",
  "parameters": {
    "planeId": "proj_plane_1", 
    "point1Id": "point2d_10",
    "point2Id": "point2d_11",
    "id": "segment2d_5" // (If backfilled)
  }
}
```

**After:**
```json
{
  "t": "AddSeg", // Mapped type alias
  "p": [ "point2d_10", "point2d_11", "segment2d_5" ] // Positional args? Or specialized dict?
}
// OR (Properties)
{
  "t": "AddSeg",
  "p": { "p1": "point2d_10", "p2": "point2d_11", "id": "segment2d_5" } // planeId removed
}
```
*Recommendation*: Stick to short property names over positional arrays for robustness against schema changes.

## 5. Next Steps

1.  Approve this plan.
2.  Execute Phase 96 (Operation cleanup).
3.  Execute Phase 97 (Service update).
\n## Status Update (2026-02-02)\n- Implemented 'serialize()' in 'InitializationOps', 'AddFreePointOp', 'AddLineOp' and others.\n- Refactored 'ProjectService' to read/write v4.0.0 Journal Format.
\n- Updated serialization/deserialization to use simple numeric arrays for vectors [x, y, z] instead of objects {x, y, z}.
