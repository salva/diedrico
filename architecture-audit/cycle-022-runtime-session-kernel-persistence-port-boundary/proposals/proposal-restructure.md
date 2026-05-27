# Proposal Restructure — Promote runtime ownership into an application session kernel with explicit ports

## Summary

This alternative asks whether the right fix is one conceptual layer higher than the direct proposal. Instead of adding only a small app-shell runtime-session wrapper, introduce an application-level session kernel boundary that becomes the composition root for runtime state, session lifecycle, persistence translation, and command-history exposure. App-shell use cases consume kernel ports (`SessionLifecyclePort`, `SessionPersistencePort`, `SessionHistoryPort`, `SessionReadPort`) rather than a single concrete `World`/`CommandStack` wrapper.

The restructure path is appropriate only if review concludes the app-shell is already accumulating multiple runtime responsibilities that the direct session wrapper would centralize too weakly: project lifecycle, autosave, keyboard undo/redo, active-plane observation, selection-delete command service wiring, and future leaf command producers. It still must not redesign `ProjectService` schema/replay, command descriptors, backend, rendering, or leaf command producers inside Wave 022.

## Files to change

Production:

- New application-kernel package or module group, e.g. `frontend/src/application/sessionKernel/`
  - `ApplicationSessionKernel.ts` or `RuntimeSessionKernel.ts`: owns `World`, `CommandStack`, initialization lifecycle, clear/reset, restore, snapshot, version, active-plane fallback/dirty marking.
  - `SessionKernelPorts.ts`: defines narrow ports consumed by app-shell use cases. Possible split:
    - `SessionLifecyclePort`: initialize default world, reset for new project, clear for sign-out, restore loaded project.
    - `SessionPersistencePort`: snapshot current project and validate/restore external project payloads through adapter-private DTOs.
    - `SessionHistoryPort`: undo/redo/count access for keyboard and command-boundary services if needed.
    - `SessionReadPort`: active-plane/version/world read access required by current UI/rendering until later waves replace it.
  - `SessionKernelPersistenceAdapter.ts` if separating persistence adapter from app-shell naming improves ownership.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Compose the kernel once and pass only needed kernel ports to app-shell use cases.
  - Continue returning raw `world`/`commandStack` only as explicit current UI integration outputs if required by existing components; do not let app-shell persistence/use-case ports depend on them.
  - Wire `SelectionDeletionCommandService` through a command-service adapter from the kernel rather than a raw pair directly, if achievable without generic command-kernel migration.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Remove `CommandStack`, `World`, and `ProjectData` imports from app-shell port contracts.
  - Keep Drive/browser/auth/store ports in app-shell if they are UI/integration concerns, or move project-session persistence definitions to the kernel module.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Consume `SessionLifecyclePort`/`SessionPersistencePort` rather than concrete world/command stack or app-shell raw persistence port.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Consume `SessionReadPort` for version and `SessionPersistencePort` for snapshots.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Optional and bounded: consume `SessionHistoryPort` for undo/redo instead of direct `CommandStack`, only if review accepts this as necessary to make the kernel coherent. If this starts migrating command execution semantics, stop.
- `frontend/src/application/appShell/ActivePlaneUseCases.ts` and `SelectionUseCases.ts`
  - Optional and bounded: consume `SessionReadPort`/selection-specific adapters only if needed to avoid kernel leakage. Do not redesign selection/delete public APIs.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Either move/rename under `sessionKernel` or leave as adapter-private bridge; in both cases it remains the only `ProjectService` bridge in the app-shell/session area.
- `frontend/src/application/world/initializeWorld.ts`
  - Remain semantically unchanged; kernel becomes its primary caller.
- `frontend/src/services/ProjectService.ts`
  - No semantic changes. At most import-path adjustments if adapter relocation requires it.

Tests:

- Add focused tests under `frontend/tests/unit/application/sessionKernel/` for kernel lifecycle, snapshot/restore, initialization fallback, and version/history behavior.
- Update app-shell tests to mock kernel ports rather than concrete `World`/`CommandStack` pairs.
- Update architecture boundary tests to enforce no app-shell port/use-case imports of `World`, `CommandStack`, `ProjectData`, or `ProjectService`, except for explicitly allowed composition and adapter files.

## Files/tests/docs/fixtures to DELETE

- Delete raw `ProjectSessionPersistencePort` methods that accept or return concrete app-kernel/persistence implementation types.
- Delete app-shell use-case constructor fields for raw `World`/`CommandStack` where replaced by kernel ports.
- Delete static tests that preserve the old direct `new SelectionDeletionCommandService(world, commandStack)` wiring if the kernel exposes a clearer command-service factory/accessor.
- Delete tests/fakes that assert `ProjectData` is app-shell's persistence contract.
- Delete any app-shell-level persistence adapter naming that becomes misleading after relocation, but only if replaced by the kernel-owned adapter path in the same commit.
- Delete compatibility overloads or dual active paths between app-shell raw-pair persistence and kernel ports.

Do not delete command descriptor serialization tests, operation registry tests, Drive/auth tests, backend files, docs/specs, package/tooling, rendering tests, canvas/tool/process-history tests, or e2e specs unless a reviewed plan edit broadens scope.

## Expected behavior change

No intended user-visible behavior change. The restructuring changes internal ownership only: app-shell project/session/autosave/keyboard code consumes kernel-owned ports instead of raw runtime objects. Startup, new/open/create/sign-out, autosave, missing-remote-file recovery, active-plane setup, selection delete, undo/redo, and save-status behavior should remain equivalent.

## No-backcompat rationale

The application should not preserve app-shell raw-pair persistence as a compatibility layer once a kernel boundary exists. The old shape is an internal implementation detail that confuses ownership and would undermine future waves. Delete it rather than wrapping it.

## Validation plan

Same mandatory cadence as the direct proposal, with additional kernel-focused tests:

1. Pre-edit scoped status/diff and source-boundary scans for app-shell/session-kernel imports.
2. Focused Vitest for new `application/sessionKernel` tests plus existing app-shell runtime/use-case/boundary tests.
3. Static boundary tests proving:
   - app-shell ports/use cases do not import `World`, `CommandStack`, `ProjectData`, or `ProjectService`.
   - `ProjectService` is imported only by the kernel/app-shell persistence adapter.
   - optional `KeyboardShortcutRouter` changes consume only `SessionHistoryPort` and do not introduce a generic command executor.
4. Root/frontend lint.
5. Root/frontend full Vitest.
6. Root/frontend build.
7. Root/frontend e2e/Playwright for startup/session/keyboard behavior.
8. Live preview refresh/probe and Playwright/live smoke for startup/new project, save-status, delete/undo, and representative session behavior without real Drive credentials.

## Risks and mitigations

- **Risk: over-abstracting into an application-kernel platform.** Mitigation: split only the ports needed by current app-shell/session flows; no event bus, service locator, generic command executor, or broad module migration.
- **Risk: scope creep into keyboard/active-plane/selection.** Mitigation: touch those consumers only where the kernel must expose current world/history access clearly. Leave leaf command producers and rendering for later waves.
- **Risk: adapter relocation churn without architectural payoff.** Mitigation: relocate `ProjectSessionPersistenceAdapter` only if it makes `ProjectService` ownership clearer; otherwise keep it in app-shell and enforce adapter-private imports.
- **Risk: persistence redesign sneaks in.** Mitigation: keep `ProjectService` schema/replay and command descriptors unchanged. Stop if current API cannot be hidden without changing those internals.
- **Risk: more files changed than one cycle should handle.** Mitigation: prefer the direct proposal unless review finds direct wrapper would be an immediate god-object or would require follow-up churn in the next wave.

## Stop conditions for broader persistence schema/replay, command-kernel, backend, or application-kernel redesign

Stop and request a reviewed plan edit if implementation requires any of the following:

- Changing `ProjectService` schema/version, command snapshots, operation descriptor validation, `OperationRegistry`, or replay semantics.
- Replacing `CommandStack` behavior or introducing generic command execution for canvas/style/construction/process-history/toolbar.
- Moving rendering/canvas/Three consumers to new read ports beyond naming existing raw access as current integration output.
- Redesigning backend/frontend contracts, Drive/auth, package scripts, validation platform, docs/specs, or debug placeholders.
- Introducing a generalized application platform beyond the small session-kernel ports required by Wave 022.

## Comparison with direct proposal

Choose this restructure path only if review concludes that app-shell runtime ownership must be lifted into a reusable application-session kernel now because keyboard history, active-plane observation, selection-delete wiring, autosave versioning, and project lifecycle are too interdependent for a single app-shell session wrapper.

Otherwise, choose `proposal-direct.md`: it produces the targeted architectural improvement with fewer files, lower abstraction risk, and a smaller validation blast radius while still deleting the raw persistence pair contract.
