# Operations API

Operations are internal command payloads. They are not UI-facing APIs.

Active operation descriptors live under `frontend/src/commands/operations` and are registered with `OperationRegistry`. Commands group operations, execute them, commit them, and expose serializable snapshots for `ProjectService`.

Current operation areas:

- `world` — geometry/world mutations such as adding elements, initialization, style updates, and removals.
- `processTree` — process-tree action/subprocess mutations.
- `viewState` — command-backed view-state changes that need undo/redo semantics.

UI tools and components should emit application intents handled by controllers/use cases. They should not construct operation sequences directly unless they are already inside the command/application layer.
