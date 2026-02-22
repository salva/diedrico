# Command System

All mutations to the `World` go through the command system, enabling undo/redo, serialization, and history tracking.

## Architecture

```
CommandStack
├── undoStack: Command[]
└── redoStack: Command[]

Command
├── operations: IOperation[]
├── status: Building | Committed | Undone
├── addAndExecute(op) → executes immediately, stores for undo
├── commit() → finalizes, pushes to stack
├── undo() → reverses all ops in reverse order
└── redo() → reapplies all ops in original order
```

## IOperation Interface

Every mutation is an `IOperation`:

```typescript
interface IOperation {
  type: string
  parameters: Record<string, unknown>
  outputs: Record<string, unknown>
  apply(world: World): OperationResult
  undo(world: World): void
  serialize?(): SerializedOperation
}
```

**Requirements:**
- **Deterministic** — same inputs always produce the same outputs
- **Serializable** — can be saved to JSON and reconstructed
- **Self-contained** — all data needed is in `parameters` and `outputs`
- **Reversible** — `undo()` fully reverses `apply()`

## Operation Categories

### World Operations

| Operation | Purpose |
|-----------|---------|
| `AddFreePoint2DOp` | Create a point at (u, v) on a plane |
| `AddLine2DByTwoPointsOp` | Create line through two points |
| `AddSegment2DByPointsOp` | Create segment between two points |
| `AddCircle2DByCenterAndPointOp` | Create circle from center + radius point |
| `AddGuide2DPerpendicularToLineOp` | Create guide perpendicular to hinge |
| `AddSiblingGuide2DOp` | Auto-create paired guide on sibling plane |
| `AddLineLineIntersectionPoint2DOp` | Intersection of two lines |
| `AddLineCircleIntersectionPoint2DOp` | Line-circle intersection |
| `AddCircleCircleIntersectionPoint2DOp` | Circle-circle intersection |
| `AddSiblingIntersectionPoint2DOp` | Paired intersection on sibling plane |
| `Add3DPointOp` | Create 3D point from projections |
| `Add3DLineOp` | Create 3D line from projections |
| `Add3DSegmentOp` | Create 3D segment from projections |
| `Add3DPlaneOp` | Create 3D plane from three points |
| `AddAuxiliaryProjectionPlaneOp` | Create new projection plane |
| `AddBrokenHingeLineOp` | Add fold line for auxiliary plane |
| `UpdateFreePoint2DPositionOp` | Move a free point |
| `UpdateElementStyleOp` | Change visual style |
| `RemovePoint2DOp` / `RemoveLine2DOp` / ... | Delete elements |

### Process Tree Operations

| Operation | Purpose |
|-----------|---------|
| `AddProcessTreeActionOp` | Record action in tree |
| `AddProcessTreeActionGroupOp` | Create action group |
| `PushSubprocessOp` / `PopSubprocessOp` | Manage subprocess stack |
| `RenameSubprocessOp` | Rename subprocess |
| `ToggleEncapsulationOp` | Toggle intermediate visibility |
| `ToggleOutputOp` | Toggle output flag |

## Command Lifecycle

```
1. Tool creates new Command
2. Tool calls command.addAndExecute(op1)  → op1.apply(world)
3. Tool calls command.addAndExecute(op2)  → op2.apply(world)
4. If any op fails → entire command rolls back
5. command.commit() → pushed to CommandStack.undoStack
6. User presses Ctrl+Z → command.undo() → ops reversed
7. User presses Ctrl+Y → command.redo() → ops reapplied
```

## Command Factories

Factories encapsulate common multi-operation patterns:

| Factory | Operations Created |
|---------|-------------------|
| `PointSequenceFactory` | Point + process tree entries |
| `LineSequenceFactory` | Line + process tree entries |
| `CircleSequenceFactory` | Circle + process tree entries |
| `GuideSequenceFactory` | Guide + sibling guide + tree entries |
| `IntersectionSequenceFactory` | Intersection points + siblings + tree entries |
| `DeletionSequenceFactory` | Remove element + dependency cleanup |
| `InitializationSequenceFactory` | World setup (planes, hinges, origin) |
| `ProjectionSetupFactory` | Standard folding plane setup |

## Serialization

Commands serialize to JSON for persistence:

```json
{
  "operations": [
    {
      "type": "AddFreePoint2DOp",
      "parameters": { "planeId": "projPlane1", "u": 3.5, "v": 2.0 },
      "outputs": { "pointId": "projPlane1/point2d5" }
    }
  ]
}
```

The `ProjectService.reconstructOperation()` switch handles deserialization of all operation types.
