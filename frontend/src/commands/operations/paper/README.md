# Paper Operations

Operations modifying the rendering layer state.

**Scope**: PaperJS primitives, rendering caches, element visibility, visual feedback.

**Future Operations**:
- `InvalidateCacheOp` - Invalidate Paper.js rendering cache
- `SetVisibilityOp` - Show/hide element in rendering
- `UpdateHighlightOp` - Change highlight state

All Paper operations modify the presentation layer (canvas presentation renderer adapters) without affecting the domain model.
