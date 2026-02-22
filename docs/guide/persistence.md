# Persistence & Google Drive

Diedrico uses **command-sourcing** for persistence: projects are saved as a sequence of commands that can be replayed to reconstruct the state.

## Project File Format

Projects are stored as `.diedrico` JSON files:

```json
{
  "id": "project-uuid",
  "name": "My Construction",
  "schemaVersion": "6.0.0",
  "created": "2024-01-01T00:00:00.000Z",
  "modified": "2024-01-15T12:00:00.000Z",
  "nextElementId": 42,
  "commands": [
    {
      "operations": [
        {
          "type": "AddFreePoint2DOp",
          "parameters": { "planeId": "projPlane1", "u": 3.5, "v": 2.0 },
          "outputs": { "pointId": "projPlane1/point2d5" }
        }
      ]
    }
  ]
}
```

### Why Command-Sourcing?

- **Full replay**: The exact sequence of user actions is preserved
- **Undo/redo**: Native, since the command stack is the save format
- **Migration**: Schema upgrades can transform operation parameters
- **Compact**: Only stores deltas, not the full geometric state

## Google Drive Integration

Diedrico integrates directly with Google Drive from the browser — no backend required.

### How It Works

1. **OAuth2 authentication** via Google Identity Services
2. **`drive.file` scope** — the app can only access files it created
3. Files stored in a `diedrico/` folder in the user's Drive
4. Session persistence via `localStorage`

### Operations

| Action | Description |
|--------|-------------|
| Sign In | OAuth2 popup, grants `drive.file` + profile scopes |
| Save | Serializes current `World` + `CommandStack` → uploads JSON |
| Load | Downloads JSON → replays all commands to reconstruct state |
| List | Shows recent `.diedrico` files from the app folder |
| Delete | Removes a project file from Drive |

### Configuration

Google Drive requires a Google Cloud project with the Drive API enabled. See the [Google Drive Setup Guide](/GOOGLE_DRIVE_SETUP) for configuration details.

## ProjectService

The `ProjectService` handles serialization and deserialization:

- `serialize(world, commandStack)` → `ProjectData` JSON
- `deserializeAndReplay(data, world, commandStack)` → reconstructs state
- Automatic schema migration from older versions (snake_case → camelCase IDs, hierarchical IDs, etc.)

## Schema Versioning

| Version | Changes |
|---------|---------|
| 6.0.0 | Current — camelCase IDs, hierarchical element IDs |
| Earlier | Various migrations applied automatically on load |
