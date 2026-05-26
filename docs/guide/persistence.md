# Saving and loading

Diedrico persists current-schema project data from the frontend. A project file contains metadata, `nextElementId`, and committed command snapshots. Loading validates the schema, replays registered operation descriptors into a world, and restores committed history.

Unsupported schema versions are rejected. Current documentation should not rely on old migration paths or backend project APIs.

Google Drive integration, when configured, stores and retrieves the same project data through frontend Drive services.
