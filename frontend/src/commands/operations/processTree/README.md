# ProcessTree Operations

Operations modifying the construction history tree.

**Scope**: construction-history actions and subprocess stack organization.

**Active operations** include adding action groups/actions, pushing and popping subprocesses, renaming/toggling process nodes, and `RemoveActionFromProcessTreeOp` for tombstone-based action deletion.

Dependency relations are queried through the dependency boundary; these operations only mutate the ProcessTree construction history.
