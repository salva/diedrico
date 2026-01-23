# Phase 85: ProcessTree Subprocess Stack Architecture

**STATUS**: 📋 PLANNED (Jan 23, 2026) - Ready for implementation

## Problem

The current ProcessTree action registration is backwards. Every operation checks "am I in initialization subprocess?" which is fragile and error-prone:

```typescript
// CURRENT ANTI-PATTERN - operations check for subprocess
const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
if (initSubprocess) {
  world.addAction(
    createInitializeHalfHingeLine2DAction(...),
    undefined,
    initSubprocess.id
  );
}
```

**Issues:**
1. **Conditional registration**: Actions only recorded if specific subprocess exists
2. **Fragile naming**: Relies on string matching ("World Initialization")
3. **Missing dependencies**: HingeLine/HalfHingeLine2D created in user operations (auxiliary planes) don't get recorded in ProcessTree
4. **Scattered logic**: Each operation decides where to add itself
5. **No nesting**: Cannot group related operations hierarchically

**Concrete Bug**: When creating auxiliary projection planes via `PlaneSequenceFactory.createAuxiliaryProjectionPlane()`, the HingeLine and HalfHingeLine2D objects are NOT recorded in ProcessTree (because initialization subprocess doesn't exist), breaking the dependency graph and preventing cache invalidation when trace lines move.

## Solution Architecture

Implement a **subprocess stack** where operations automatically add to the current active subprocess:

```typescript
// NEW PATTERN - subprocess stack
cmd.addAndExecute(new PushSubprocessOp('World Initialization'));
// ... all initialization operations run
// ... they automatically add to current subprocess at top of stack
cmd.addAndExecute(new PopSubprocessOp());

// When creating auxiliary plane
cmd.addAndExecute(new PushSubprocessOp('Create Projection Plane'));  
// ... factory creates plane, hingeline, half-hinge-lines
// ... all actions automatically recorded to current subprocess
cmd.addAndExecute(new PopSubprocessOp());
```

### Key Components

#### 1. ProcessTree Subprocess Stack

```typescript
// ProcessTree.ts
export class ProcessTree {
  root: Subprocess;
  private subprocessStack: Subprocess[] = [];  // NEW: subprocess stack
  private _version: number = 0;

  constructor() {
    this.root = {
      id: this.generateId(),
      type: 'subprocess',
      name: 'Root Process',
      children: [],
      visible: true,
      created: new Date()
    };
    // Root is always at bottom of stack
    this.subprocessStack = [this.root];
  }

  /**
   * Get the current active subprocess (top of stack)
   */
  getCurrentSubprocess(): Subprocess {
    return this.subprocessStack[this.subprocessStack.length - 1];
  }

  /**
   * Push a new subprocess onto the stack
   * All subsequent actions will be added to this subprocess
   */
  pushSubprocess(name: string): Subprocess {
    const subprocess: Subprocess = {
      id: this.generateId(),
      type: 'subprocess',
      name,
      children: [],
      visible: true,
      created: new Date()
    };

    // Add to current subprocess's children
    const parent = this.getCurrentSubprocess();
    parent.children.push(subprocess);
    
    // Push onto stack
    this.subprocessStack.push(subprocess);
    this.notifyChange();

    return subprocess;
  }

  /**
   * Pop the current subprocess from the stack
   * Returns to parent subprocess
   */
  popSubprocess(): void {
    if (this.subprocessStack.length <= 1) {
      throw new Error('Cannot pop root subprocess');
    }
    this.subprocessStack.pop();
    this.notifyChange();
  }

  /**
   * Add an action to the current active subprocess
   * No longer needs parentSubprocessId parameter
   */
  addAction(action: Action, groupName?: string): ActionGroup {
    // Wrap action in ActionNode
    const actionNode: ActionNode = {
      ...action,
      type: 'action',
      created: new Date()
    };

    // Create action group for this action
    const actionGroup: ActionGroup = {
      id: this.generateId(),
      type: 'actionGroup',
      children: [actionNode],
      isAuxiliary: false,
      created: new Date()
    };

    // Add to current subprocess (top of stack)
    const currentSubprocess = this.getCurrentSubprocess();
    currentSubprocess.children.push(actionGroup);
    this.notifyChange();

    return actionGroup;
  }
}
```

#### 2. Push/Pop Operations

```typescript
// PushSubprocessOp.ts
export class PushSubprocessOp implements IOperation {
  readonly type = 'PushSubprocess';
  readonly parameters: Record<string, any>;
  outputs: Record<string, any> = {};
  
  constructor(private readonly subprocessName: string) {
    this.parameters = { subprocessName };
  }

  apply(world: World): OperationResult {
    const subprocess = world.getProcessTree().pushSubprocess(this.subprocessName);
    this.outputs = { subprocessId: subprocess.id };
    return { success: true, outputs: this.outputs };
  }

  undo(world: World): void {
    world.getProcessTree().popSubprocess();
  }
}

// PopSubprocessOp.ts
export class PopSubprocessOp implements IOperation {
  readonly type = 'PopSubprocess';
  readonly parameters: Record<string, any> = {};
  outputs: Record<string, any> = {};
  
  apply(world: World): OperationResult {
    world.getProcessTree().popSubprocess();
    return { success: true, outputs: {} };
  }

  undo(world: World): void {
    // Restore previous subprocess by re-pushing
    // Note: This requires storing the subprocess name in undo
    // Implementation detail: store popped subprocess in outputs during apply
    throw new Error('PopSubprocessOp undo not yet implemented');
  }
}
```

#### 3. Remove Conditional Registration

All operations like `AddHingeLineOp`, `AddHalfHingeLine2DOp` lose the conditional subprocess check:

```typescript
// BEFORE
apply(world: World): OperationResult {
  const hingeLine = world.addHingeLine(...);
  
  // Conditional registration - REMOVE THIS
  const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
  if (initSubprocess) {
    world.addAction(
      createInitializeHingeLineAction(...),
      undefined,
      initSubprocess.id
    );
  }
  
  return { success: true, outputs: { hingeLineId: hingeLine.id } };
}

// AFTER
apply(world: World): OperationResult {
  const hingeLine = world.addHingeLine(...);
  
  // ALWAYS register - goes to current subprocess automatically
  world.addAction(createInitializeHingeLineAction(...));
  
  return { success: true, outputs: { hingeLineId: hingeLine.id } };
}
```

#### 4. Update Factory Methods

Factories wrap their operation sequences in Push/Pop:

```typescript
// PlaneSequenceFactory.createAuxiliaryProjectionPlane()
static createAuxiliaryProjectionPlane(
  cmd: Command,
  world: import('@/domain/world/World').World,
  plane3DId: string,
  t1HingeTraceId: string,
  t2OtherTraceId: string,
  t2PrimeLineId: string,
  hingeTracePlaneId: string,
  name?: string
): { projPlaneId: string } {
  // Push subprocess for this logical operation
  cmd.addAndExecute(new PushSubprocessOp('Create Auxiliary Projection Plane'));
  
  // Create auxiliary projection plane
  const result = cmd.addAndExecute(new AddAuxiliaryProjectionPlaneOp(...));
  const projPlaneId = result.outputs.projPlaneId as string;
  
  // Create hinge line (automatically added to current subprocess)
  const hingeLineResult = cmd.addAndExecute(new AddHingeLineOp(projPlaneId, hingeTracePlaneId));
  const hingeLineId = hingeLineResult.outputs.hingeLineId as string;
  
  // Create half hinge lines (automatically added to current subprocess)
  cmd.addAndExecute(new AddHalfHingeLine2DOp(projPlaneId, hingeLineId));
  cmd.addAndExecute(new AddHalfHingeLine2DOp(hingeTracePlaneId, hingeLineId));
  
  // Hide T1 if needed
  const hingePlane = world.getProjectionPlaneById(hingeTracePlaneId);
  if (hingePlane) {
    const t1Line = hingePlane.getLine(t1HingeTraceId);
    if (t1Line && !(t1Line instanceof HalfHingeLine2D)) {
      cmd.addAndExecute(new UpdateElementStyleOp(t1HingeTraceId, hingeTracePlaneId, { visible: false }));
    }
  }
  
  // Pop subprocess - all operations above are now grouped
  cmd.addAndExecute(new PopSubprocessOp());
  
  return { projPlaneId };
}
```

#### 5. Update World Initialization

```typescript
// ProjectService.initializeWorld() or bootstrap code
const cmd = new Command(world);

// Push initialization subprocess
cmd.addAndExecute(new PushSubprocessOp('World Initialization'));

// Create projection planes
cmd.addAndExecute(new AddProjectionPlaneFixedOp('P_H', ...));
cmd.addAndExecute(new AddProjectionPlaneFixedOp('P_V', ...));

// Create hinge line
cmd.addAndExecute(new AddHingeLineOp(P_H.id, P_V.id));

// Create half hinge lines
cmd.addAndExecute(new AddHalfHingeLine2DOp(P_H.id, hingeLineId));
cmd.addAndExecute(new AddHalfHingeLine2DOp(P_V.id, hingeLineId));

// Pop initialization subprocess
cmd.addAndExecute(new PopSubprocessOp());

cmd.commit();
```

## Benefits

1. **Automatic registration**: All operations always record actions, no conditional logic
2. **Hierarchical grouping**: Related operations grouped in subprocesses
3. **Clear scope**: Push/Pop clearly define subprocess boundaries
4. **Dependency tracking**: All elements properly registered, dependency graph complete
5. **Simpler operations**: Operations don't need to know about subprocesses
6. **Undo-friendly**: Pop/Push are undoable operations

## Implementation Steps

### Step 1: Add subprocess stack to ProcessTree
- Add `subprocessStack: Subprocess[]` field
- Implement `getCurrentSubprocess()`
- Implement `pushSubprocess(name: string)`
- Implement `popSubprocess()`
- Update `addAction()` to use current subprocess (remove `parentSubprocessId` parameter)

### Step 2: Create Push/Pop operations
- Create `PushSubprocessOp` in `frontend/src/commands/operations/processTree/`
- Create `PopSubprocessOp` in `frontend/src/commands/operations/processTree/`
- Implement `apply()` and `undo()` for both

### Step 3: Update World.addAction()
- Remove `parentSubprocessId` parameter
- Simplify to always use current subprocess

### Step 4: Remove conditional registration from operations
Files to update:
- `InitializationOps.ts` (AddHingeLineOp, AddHalfHingeLine2DOp, etc.)
- Any other operations that check for initialization subprocess

Remove patterns like:
```typescript
const initSubprocess = world.getProcessTree().findSubprocessByName('World Initialization');
if (initSubprocess) {
  world.addAction(..., undefined, initSubprocess.id);
}
```

Replace with:
```typescript
world.addAction(...);
```

### Step 5: Update initialization code
- Find world initialization (likely in `ProjectService.ts` or bootstrap)
- Wrap with `PushSubprocessOp('World Initialization')` / `PopSubprocessOp()`

### Step 6: Update factories
Files to update:
- `PlaneSequenceFactory.ts` - wrap `createAuxiliaryProjectionPlane()` with Push/Pop
- Any other factory methods that create multiple related elements

### Step 7: Remove factory's manual ProcessTree action recording
Since operations now automatically record, remove manual calls like:
```typescript
cmd.addAndExecute(new AddProcessTreeActionOp(
  createInitializeHingeLineAction(hingeLineId, projPlaneId, hingeTracePlaneId)
));
```

These are now redundant - the operations do it automatically.

### Step 8: Update AddProcessTreeActionOp
This operation might become obsolete or need simplification since operations now auto-record.

### Step 9: Test dependency invalidation
Verify that:
- Moving trace lines invalidates auxiliary projection plane
- Auxiliary projection plane invalidation cascades to HingeLine
- HingeLine invalidation cascades to both HalfHingeLine2D objects
- Both HalfHingeLine2D objects update when trace lines move

### Step 10: Clean up
- Remove `findSubprocessByName()` if no longer used
- Update documentation
- Add tests for subprocess stack

## Files to Create/Modify

### Create:
- `frontend/src/commands/operations/processTree/PushSubprocessOp.ts`
- `frontend/src/commands/operations/processTree/PopSubprocessOp.ts`

### Modify:
- `frontend/src/domain/processTree/ProcessTree.ts` - add subprocess stack
- `frontend/src/domain/world/World.ts` - update addAction() signature
- `frontend/src/commands/operations/world/InitializationOps.ts` - remove conditional registration
- `frontend/src/services/factories/PlaneSequenceFactory.ts` - wrap with Push/Pop, remove manual recording
- `frontend/src/services/ProjectService.ts` (or bootstrap code) - wrap initialization with Push/Pop
- `frontend/src/commands/operations/processTree/AddProcessTreeActionOp.ts` - simplify or remove

## Testing

1. **Unit tests** for ProcessTree stack operations
2. **Integration tests** for subprocess grouping
3. **Regression tests** for existing functionality (world initialization, auxiliary planes)
4. **Dependency tests** for trace line → projection plane → hinge line → half hinge line cascade

## Migration Notes

This is a **breaking architectural change** but should be transparent to most code since operations already call `world.addAction()`. The main changes are:
1. Operations always call `addAction()` (no more conditional)
2. Factories wrap their sequences with Push/Pop
3. Initialization code wraps with Push/Pop

Existing ProcessTree structure is preserved - we're just changing how actions get added to subprocesses.
