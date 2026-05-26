# State management

Pinia stores are UI/runtime holders. They are not a second domain model and should not own geometry mutation policy.

## Stores

- `toolStore` tracks the active tool, tool-family last-used choices, and contextual tool feedback.
- `selectionStore` tracks selected/hovered/highlighted ids for UI interaction.
- `settingsStore` persists user preferences such as grid, snap, default styles, and 3D display options in localStorage.
- `processStore`/`processTreeStore` expose process-tree panel state and interactions around the domain process tree.
- `viewStore` tracks viewport and view-specific state.
- `authStore` stores Drive auth/session status and delegates Drive API work to services.

## Rule of thumb

Stores can hold references and view state needed by components. Geometry, commands, persistence replay, and rendering selectors live in their dedicated domain/application/service layers.
