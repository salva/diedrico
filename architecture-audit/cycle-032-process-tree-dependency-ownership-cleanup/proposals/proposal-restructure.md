# Proposal Restructure — Split process-history/dependency read boundary before deletion

## Summary

If reviewers judge the direct cleanup too local, restructure at one conceptual layer higher: introduce a narrow process-history read/application boundary that owns all joins between construction history and dependency data, then delete the same dead process APIs and operation placeholders. This makes `ProcessTreeReadModel` consume explicit ports rather than the whole `World`, while still avoiding Wave 006b-style panel command-controller redesign.

## Target shape

- `ProcessTree` remains a pure construction-history aggregate with no dependency imports and no UI-specific related-action query.
- `DependencyService` remains the dependency graph owner.
- A small application module, e.g. `frontend/src/application/processHistory/ProcessHistoryReadService.ts` or equivalent, accepts narrow ports:
  - process history reader: all actions, root tree, version, active subprocess;
  - dependency reader: `getDependencies(elementId)`;
  - element description/feasibility reader if needed by existing read-model rendering.
- `RuntimeSession` wires the service from `World`, while `ActionsPanel.vue` continues to consume only `ProcessTreeReadPort` and `ProcessHistoryIntentSink`.

## Files to change

Likely source changes:

- Add a small application process-history read boundary under `frontend/src/application/processHistory/` or refactor `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts` to accept narrow ports instead of `World`.
- `frontend/src/application/appShell/RuntimeSession.ts`: wire the new boundary from current `World` methods without changing app-shell composition behavior.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`: adjust `ProcessTreeReadPort` types only if needed.
- Same direct-path deletions: unused `processStore.ts`; unimplemented `RemoveActionGroupFromProcessTreeOp` / `RemoveSubprocessFromProcessTreeOp`; descriptor registrations and tests; stale README entries.
- Focused tests for the new read boundary plus the same process/panel/persistence tests.

## Files/tests/docs/fixtures to DELETE

Same as proposal-direct:

- `frontend/src/stores/processStore.ts` if unused.
- Unimplemented process-tree operation classes and registry entries for action-group/subprocess removal.
- Round-trip tests for deleted unimplemented descriptors.
- Stale README entries or the README if it becomes placeholder-only.
- Tests asserting deprecated implicit action insertion or process-tree-owned dependency queries if discovered.

## Expected behavior change

No user-visible behavior change. The construction history panel should render the same tree, related highlighting, descriptions, infeasible flags, stack state, and command behavior. Internally, related-action lookup moves from a `World`-coupled read model to an explicit process-history/dependency read boundary. Deleted dead descriptors behave as in the direct proposal: unknown operation types are rejected.

## Risks and mitigations

- **Risk:** This may broaden into app-shell production composition redesign. **Mitigation:** restrict RuntimeSession changes to wiring the new read service; do not change project lifecycle, rendering, stores, or shell ownership.
- **Risk:** Description and infeasibility rendering still need world/domain element lookup. **Mitigation:** either keep those as explicit narrow ports or stop if the seam becomes a general selector/rendering redesign better suited to later waves.
- **Risk:** This overlaps Wave 006b panel/use-case cleanup. **Mitigation:** do not touch panel command intents beyond preserving existing injected ports.
- **Risk:** More files and tests than direct path. **Mitigation:** choose this only if critic/reviewer requires stronger ownership proof than deletion/static tests.

## Validation plan

In addition to the direct proposal's validation:

- Focused tests for the new process-history read boundary proving related-action IDs are computed from a dependency reader, not from ProcessTree APIs.
- Architecture/static test proving `ProcessTreeReadModel` or replacement does not require a full `World` if the port split is implemented.
- Existing app-shell RuntimeReadModels and Cycle027 architecture tests updated only to reflect the narrow read boundary.

Mandatory lint, focused/full Vitest, root/frontend build, Playwright e2e, live preview refresh/probe, and 3D overlay preservation remain required.

## Protected surfaces

Do not redesign ActionsPanel UI, command-controller surfaces, ProjectService persistence, OperationRegistry descriptor architecture beyond deletion, rendering/CSS/canvas/3D, Drive/auth, backend/docs/specs/package tooling, validation platform, or broader App.vue/RuntimeSession composition.

## Stop conditions

Stop and prefer proposal-direct or a wave-plan correction if the read-port split requires:

- new generalized selector framework,
- broad application shell refactor,
- moving DependencyService out of `World`,
- changing descriptor/description architecture,
- command descriptor redesign,
- or panel/toolbar command-intent work belonging to Wave 006b.

## No-backcompat rationale

The restructure path still deletes dead stores and unimplemented descriptors rather than preserving aliases. It only adds a read boundary if doing so removes current `World` coupling at the process-history/dependency seam without creating a parallel architecture.
