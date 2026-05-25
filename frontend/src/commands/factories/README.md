# Operation Sequence Factories

## Purpose

Operation Sequence Factories encapsulate common multi-operation patterns used across tools and command builders. They promote testability, reusability, and maintainability by centralizing complex sequencing logic.

## Design Principles

### Domain-Specific, Not Abstract

✅ **Good Examples**:
- `GuideSequenceFactory` - Handles guide creation with conditional sibling
- `IntersectionSequenceFactory` - Dispatches to correct intersection type and handles siblings
- `DeletionSequenceFactory` - Handles cascade deletion with topological sorting

❌ **Bad Examples**:
- `AuxiliaryElementFactory` - Too generic, caller must specify operations
- `GenericSequenceFactory` - Abstract pattern requiring caller to know internals

### When to Create a Factory

1. **Pattern appears in 2+ places** (actual duplication, not hypothetical)
2. **Sequence has conditional logic** (e.g., sibling creation, type detection)
3. **Pattern is domain-specific** (guides, intersections, deletion, not generic "create element")
4. **Factory can fully encapsulate logic** (caller doesn't need to know operation details)

### When NOT to Create a Factory

1. **Pattern appears only once** (no duplication yet)
2. **Logic is simple** (1-2 operations, no conditionals)
3. **Pattern is too generic** (each use case needs different operations)
4. **Caller would need to specify operations anyway** (breaks encapsulation)

## The Open Command Pattern

All factories follow the **Open Command Pattern**:

```typescript
// Factory signature
static createSequence(
  cmd: Command,           // ← Open command object
  ...parameters: any[],   // Domain-specific parameters
  world: World            // Context for conditional logic
): void {
  // Add operations via cmd.addAndExecute()
  // Operations execute immediately
  // Handle conditionals based on domain state
  // Return void (operations added to command)
}
```

**Why Open Command?**
- Tool creates command once, factory adds to it
- Multiple factories can contribute to same command
- Tool controls commit/push timing
- Operations execute immediately (world state updated for subsequent ops)

## Usage Examples

### GuideSequenceFactory

```typescript
// In GuideTool
const cmd = new Command('Create guide', world);

// Factory handles: primary guide op + conditional sibling op
GuideSequenceFactory.createGuideWithSibling(
  cmd,
  planeId,
  referenceLineId,
  throughPointId,
  world
);

// Tool still handles: process tree actions, commit, push, feedback
cmd.commit();
commandStack.push(cmd);
```

### IntersectionSequenceFactory

```typescript
// In IntersectionTool
const cmd = new Command('Create intersection', world);

// Factory handles: type detection + correct op dispatch + conditional sibling
IntersectionSequenceFactory.createIntersection(
  cmd,
  planeId,
  element1Id,    // Could be line or circle
  element2Id,    // Could be line or circle
  index,
  world
);

cmd.commit();
commandStack.push(cmd);
```

### DeletionSequenceFactory

```typescript
// In App.vue
const cmd = new Command('Delete elements', world);

// Factory handles: topological sort + type-specific RemoveOps + process tree cleanup
DeletionSequenceFactory.createCascadeDeletion(
  cmd,
  selectedIds,
  world
);

cmd.commit();
commandStack.push(cmd);
// Dependency graph is updated incrementally by world/projection-plane operations.
```

## Architecture

```
Tool (UI interaction)
  ↓
Factory (sequencing logic)
  ↓
Operations (atomic changes)
  ↓
Domain (world state)
```

**Responsibilities**:
- **Tool**: Mouse input, user feedback, command creation, commit/push
- **Factory**: Determine operation sequence, handle conditionals, add operations
- **Operation**: Single atomic change, serializable, undo/redo
- **Domain**: Maintain world state, enforce invariants

## Testing Strategy

### Unit Tests

Test factories in isolation with mock World:

```typescript
describe('GuideSequenceFactory', () => {
  it('creates single operation for non-HHL reference line', () => {
    const cmd = new Command('Test', mockWorld);
    GuideSequenceFactory.createGuideWithSibling(cmd, planeId, lineId, pointId, mockWorld);
    
    expect(cmd.operations).toHaveLength(1);
    expect(cmd.operations[0]).toBeInstanceOf(AddGuide2DPerpendicularToLineOp);
  });
  
  it('creates two operations for HHL reference line', () => {
    const cmd = new Command('Test', mockWorldWithHHL);
    GuideSequenceFactory.createGuideWithSibling(cmd, planeId, hhlId, pointId, mockWorldWithHHL);
    
    expect(cmd.operations).toHaveLength(2);
    expect(cmd.operations[1]).toBeInstanceOf(AddSiblingGuide2DOp);
  });
});
```

### Integration Tests

Test with real World and CommandStack:

```typescript
it('guide factory creates both guides when using HHL', () => {
  const world = createTestWorld();
  const cmd = new Command('Create guide', world);
  
  GuideSequenceFactory.createGuideWithSibling(cmd, planeId, hhlId, pointId, world);
  cmd.commit();
  
  const guides = world.getAllGuides();
  expect(guides).toHaveLength(2);
  expect(guides[0].siblingGuideId).toBe(guides[1].id);
});
```

## Implementation Checklist

For each new factory:

- [ ] Extract repeated pattern from 2+ locations
- [ ] Implement static method with Open Command signature
- [ ] Handle all conditionals (type detection, sibling creation, etc.)
- [ ] Add unit tests (3-6 scenarios covering conditionals)
- [ ] Add integration tests (end-to-end with real World)
- [ ] Refactor callers to use factory
- [ ] Verify all existing tests still pass
- [ ] Document in this README

## Current Factories

### GuideSequenceFactory

**Purpose**: Create guide with conditional sibling on complementary plane

**Logic**:
1. Create primary guide (AddGuide2DPerpendicularToLineOp)
2. Check if reference line is HalfHingeLine
3. If HHL, create sibling guide (AddSiblingGuide2DOp)

**Tests**: `GuideSequenceFactory.spec.ts`

### DeletionSequenceFactory

**Purpose**: Handle cascade deletion with topological sorting

**Logic**:
1. Get deletion order (dependents first, roots last)
2. For each element, add type-specific RemoveOp
3. Add process tree cleanup operations

**Tests**: `DeletionSequenceFactory.spec.ts`

### IntersectionSequenceFactory

**Purpose**: Dispatch to correct intersection type and handle siblings

**Logic**:
1. Query element types from world
2. Dispatch to correct operation (line-line, line-circle, circle-circle)
3. Check if either element is HalfHingeLine
4. If HHL, add sibling intersection operation

**Tests**: `IntersectionSequenceFactory.spec.ts`

## Future Patterns

Consider extracting when pattern appears in 2+ places:
- CircleSequenceFactory (if auxiliary point + circle pattern becomes complex)
- SegmentSequenceFactory (if auxiliary points + segment pattern becomes complex)
- Transport operations (if transport logic becomes complex)

**Remember**: Only create factory if complexity warrants it. Simple 1-2 operation sequences may not need factories.
