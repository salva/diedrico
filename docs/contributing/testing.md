# Testing

Diedrico uses a comprehensive testing strategy with Vitest for unit/integration tests and Playwright for E2E tests.

## Test Runner

### Unit & Integration Tests

```bash
cd frontend
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

Uses **Vitest** with `jsdom` environment.

### E2E Tests

```bash
cd frontend
npx playwright test
```

Uses **Playwright** with Chromium. Configuration in `playwright.config.ts`.

## Test Organization

```
frontend/tests/
├── unit/
│   ├── domain/           # Domain model tests
│   │   ├── math/         # Vector/matrix operations
│   │   ├── world/        # World, planes, elements
│   │   └── processTree/  # Process tree operations
│   ├── commands/         # Command and operation tests
│   ├── services/         # Service layer tests
│   ├── tools/            # Tool behavior tests
│   └── utils/            # Utility function tests
├── integration/
│   └── ...               # Cross-layer integration tests
└── e2e/
    └── ...               # Full browser tests
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { FreePoint2D } from '@/domain/world/FreePoint2D'

describe('FreePoint2D', () => {
  it('should realize at the specified coordinates', () => {
    const point = new FreePoint2D('p1', 'projPlane1', 3.5, 2.0)
    const world = createTestWorld()
    const realization = point.realize2D(world)

    expect(realization.feasible).toBe(true)
    expect(realization.position[0]).toBeCloseTo(3.5)
    expect(realization.position[1]).toBeCloseTo(2.0)
  })
})
```

### Test Helpers

Common patterns used in tests:

- `createTestWorld()` — creates a minimal `World` with base planes
- Direct operation calls — `op.apply(world)` to set up state
- Realization checks — validate geometry via `realize2D()` / `realize3D()`
- Feasibility checks — verify `realization.feasible` for valid/invalid inputs

## Test Categories

### Domain Tests

Test pure geometric logic: element creation, realization computation, dependency tracking, coordinate transformations.

### Command Tests

Test operation apply/undo/redo: verify world state after each step, ensure perfect reversal on undo.

### Service Tests

Test PaperService primitive generation, SVGRenderer transforms, ProjectService serialization/deserialization.

### Tool Tests

Test tool argument collection, multi-pick flows, keyboard shortcuts, tool switching.

### Integration Tests

Test complete workflows: create elements → modify → undo → verify.

### E2E Tests

Test the full UI: canvas clicks, panel interactions, selection behavior, keyboard shortcuts.

## Test Baseline

The project maintains a known baseline of pre-existing test results. When running the full test suite, compare against this baseline to detect regressions.

## Tips

- Run tests frequently during development
- New features should include tests covering:
  - Happy path (element creation, realization)
  - Edge cases (degenerate inputs, infeasibility)
  - Undo/redo correctness
  - Serialization round-trip
- Use `toBeCloseTo()` for floating-point comparisons
- Test feasibility propagation when adding dependent elements
