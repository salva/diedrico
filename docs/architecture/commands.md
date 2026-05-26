# Commands and operations

Commands are the undo/redo and persistence boundary for mutations. The UI does not directly mutate the domain model.

## Flow

1. A tool or component emits an application intent.
2. An application controller/use case validates the intent and builds one or more operation descriptors.
3. A `Command` executes the operations against `World` and is committed.
4. `CommandStack.push()` records committed, undoable commands and clears redo history.
5. Undo/redo calls the committed command's operation undo/redo behavior.

## Operations

Operations live under `frontend/src/commands/operations`. Active operation families are organized by current responsibility such as `world`, `processTree`, and `viewState`. Operation descriptors are registered through `OperationRegistry`; persistence replay deserializes descriptors through that registry rather than through a private service switch.

## Persistence relationship

`ProjectService` serializes committed commands plus project metadata and `nextElementId` using the current schema. Loading validates the schema, deserializes operation descriptors through the registry, replays them into a fresh `World`, and restores committed command history.

There is no active model where tools construct arbitrary command subclasses directly or call an `addAndExecute()` lifecycle from UI code.
