# Cycle 023 Wave-Plan Extension Note

## Purpose

Extend `architecture-audit/wave-plan.md` after Wave 022 because the current plan ended at the runtime-session/persistence boundary while central clean-architecture work remains. This stage is planning only: no production source, tests, package/tooling, backend, docs/spec source, debug surfaces, protected config, or implementation files were modified.

## Source-control hygiene

- Scoped pre-edit status was captured in `pre-status.stdout` / `pre-status.stderr`.
- The scoped status showed this Cycle 023 planning directory as untracked before the note/log files were written; no unrelated dirty state was reverted or incorporated.
- Evidence scans were written under `architecture-audit/cycle-023-wave-plan-extension/` only.
- Secret/protected files were not read. In particular, `.saivage/saivage.json`, auth profiles, env files, provider configs, and credential material were not opened or copied.

## Evidence inspected

Planning and recent completion evidence:

- `architecture-audit/wave-plan.md` was reread; `wave-index.stdout` confirms the current ordered entries ended at `Wave 022 — Runtime session kernel and persistence port boundary`.
- `architecture-audit/cycle-022-runtime-session-kernel-persistence-port-boundary/implementation-log.md` was reread. It marks Wave 022 complete and names residual risks: raw runtime-object accessors for active-plane, keyboard/history, selection, rendering-facing consumers, and adapter-private `ProjectSessionPersistenceAdapter` casts.
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/implementation-log.md` was sampled for predecessor context: selection/delete command construction was narrowed, but other command producers and broader runtime/session ownership remained future candidates.

Current source samples and scans:

- `source-appshell-runtime-evidence.stdout` captures line-numbered evidence for `RuntimeSession`, `AppShellRuntime`, `ActivePlaneUseCases`, `KeyboardShortcutRouter`, `SelectionUseCases`, and `ProjectSessionPersistenceAdapter`.
- `current-boundary-scan.stdout` captures remaining raw accessors and command producers across `frontend/src/application`, `frontend/src/components`, and `frontend/src/tools`.
- `source-command-producer-evidence.stdout` captures leaf command producers in world initialization, canvas movement/style, construction, process history, and the `SvgCanvas` move-session commit call.
- `source-persistence-cast-evidence.stdout` captures the current adapter-private casts and `ProjectService` bridge.

Key evidence:

- `RuntimeSession` owns concrete `World` and `CommandStack`, then exposes raw accessors `worldForView`, `commandStackForShortcuts`, `worldForUseCases`, and `commandStackForCommandServices` (`RuntimeSession.ts:16-33` in `source-appshell-runtime-evidence.stdout`).
- `AppShellRuntime` unwraps the session into raw `world`/`commandStack` and wires raw session objects to active-plane, selection deletion, selection, and keyboard (`AppShellRuntime.ts:15-18`, `39-41`, `68-69`).
- `ActivePlaneUseCases` needs only subscription, active-plane id/name, plane list, and active-plane update/cycle behavior, but imports full `World` (`ActivePlaneUseCases.ts:2`, `12`, `17`, `23`, `28`, `34`, `42`, `54`).
- `SelectionUseCases` needs active-plane selectable IDs and dependency cascade preview, but imports full `World` (`SelectionUseCases.ts:2`, `10`, `45-50`, `59`).
- `KeyboardShortcutRouter` needs undo/redo availability/execution, but imports full `CommandStack` (`KeyboardShortcutRouter.ts:1`, `17-18`, `97-100`).
- `ProjectSessionPersistenceAdapter` is the only app-shell bridge to `ProjectService`, but still casts opaque handles to concrete runtime objects (`ProjectSessionPersistenceAdapter.ts:8`, `22-23`).
- Remaining direct command producers are real but leaf-level: `initializeWorld`, `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, `ProcessHistoryUseCases`, and the already-reviewed `SelectionDeletionCommandService` path appear in `current-boundary-scan.stdout` and `source-command-producer-evidence.stdout`.

## Centrality ranking after Wave 022

### Selected next wave: Wave 023 — Runtime-session consumer ports and command-history boundary

This is the most central post-Wave-022 risk because Wave 022 created `RuntimeSession` but left several app-shell consumers able to bypass the boundary through raw `World`/`CommandStack` accessors. If later waves migrate leaf command producers or rendering consumers before this seam is tightened, they will either preserve the raw accessors or invent parallel facades. The narrow app-shell consumers already reveal behavior-sized ports: active-plane, selection/dependency preview, command-history undo/redo, and typed persistence adapter handles.

Wave 023 is therefore bounded to shrinking those consumer-facing runtime/session seams, not implementing leaf command-producer cleanup or persistence redesign.

### Deferred candidates

1. **Leaf command producers: canvas movement/style/construction/process-history.** These remain visible in `current-boundary-scan.stdout` and `source-command-producer-evidence.stdout`, but they are less central than the session/command-history ports they should consume. Moving them first would likely keep `World`/`CommandStack` accessors alive.
2. **ProjectSessionPersistenceAdapter private casts / deeper persistence contract.** A typed adapter handle is included as an optional bounded slice of Wave 023 only if it can delete casts without changing `ProjectService` internals. If cast removal requires command serialization/schema/API redesign, it is deferred to a future persistence-contract wave.
3. **Rendering-facing raw `World` exposure.** `worldForView()` remains relevant for descendants, but broad rendering/presentation/domain realization boundaries have their own prior waves and should not be reopened in this app-shell consumer-port extension.
4. **Backend/frontend stance.** Earlier plan entries and recent evidence indicate backend work is lower priority than active frontend runtime boundaries; no backend implementation belongs in this planning stage.
5. **Validation gate hardening.** Mandatory gates are currently green in the Wave 022 closure log; additional validation hardening is important but should follow this central runtime boundary rather than precede it.
6. **Placeholder/debug cleanup and docs/spec drift.** These are cleanup/documentation concerns and intentionally follow central domain/application/runtime boundaries.

## Wave-plan change made

Appended `Wave 023 — Runtime-session consumer ports and command-history boundary` to `architecture-audit/wave-plan.md` with required fields:

- status;
- scope;
- scope guard;
- current grounding with source and log citations;
- target outcome;
- explicit DELETE list;
- success criteria;
- dependencies;
- validation requirements;
- risks;
- no-backcompat rationale.

## No implementation performed

No production source, test source, package/tooling, backend, docs/spec source, debug placeholder, rendering/domain/service implementation, or protected config file was edited. The recommended next canonical stage is `cycle-023-fresh-scout-proposals` after review/correction of this wave-plan extension, not implementation.
