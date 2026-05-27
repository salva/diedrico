# Proposal Restructure — Promote runtime ownership into an application session kernel with explicit ports

## Recommendation status

**Non-preferred fallback only. Do not implement this proposal in Cycle 022 unless review round 02 explicitly rejects `proposal-direct.md` as insufficient and records a new decision selecting this path.** The corrected preferred path is `proposal-direct.md`, because it fixes the reviewed runtime/session and persistence-port leak with lower abstraction and scope risk.

## Summary

This alternative asks whether the right fix is one conceptual layer higher than the direct proposal. Instead of adding only a small app-shell runtime-session wrapper, introduce an application-level session kernel boundary that becomes the composition root for runtime state, session lifecycle, persistence translation, and command-history exposure. App-shell use cases consume kernel ports (`SessionLifecyclePort`, `SessionPersistencePort`, narrow read/version ports) rather than a single concrete `World`/`CommandStack` wrapper.

The restructure path is fallback-only and appropriate only if review concludes the direct app-shell session wrapper cannot satisfy current project lifecycle/autosave/persistence dependencies without becoming an immediate god object or changing user-visible behavior. It must not migrate keyboard/history routing, active-plane observation, selection-delete ownership, future leaf command producers, `ProjectService` schema/replay, command descriptors, backend, rendering, or Drive/auth behavior inside Wave 022.

## Files to change

Production:

- New application-kernel package or module group, e.g. `frontend/src/application/sessionKernel/`
  - `ApplicationSessionKernel.ts` or `RuntimeSessionKernel.ts`: owns `World`, `CommandStack`, initialization lifecycle, clear/reset, restore, snapshot, version, active-plane fallback/dirty marking.
  - `SessionKernelPorts.ts`: defines narrow ports consumed by app-shell use cases. Possible split:
    - `SessionLifecyclePort`: initialize default world, reset for new project, clear for sign-out, restore loaded project.
    - `SessionPersistencePort`: snapshot current project and validate/restore external project payloads through adapter-private DTOs.
    - `SessionReadPort`: version/session-state read access required by autosave and current UI integration until later waves replace it.
    - Do **not** add `SessionHistoryPort` or migrate keyboard undo/redo in this cycle unless a reviewed delta replaces this fallback scope.
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
  - Out of scope for this corrected proposal. Keep keyboard undo/redo wiring unchanged unless a future reviewed delta specifically selects keyboard/history migration.
- `frontend/src/application/appShell/ActivePlaneUseCases.ts`, `SelectionUseCases.ts`, and `frontend/src/application/selectionDeletion/`
  - Out of scope except for preserving existing construction-site wiring from the current runtime objects or named accessors. Do not migrate active-plane or selection APIs into the kernel in Cycle 022.
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

No intended user-visible behavior change for successful flows. The restructuring changes internal ownership only: app-shell project/session/autosave code consumes kernel-owned ports instead of raw runtime objects. Keyboard, active-plane, selection-delete, rendering, and leaf command producer behavior remain wired as they are today except for construction-site accessors needed to preserve them. Startup, new/open/create/sign-out, autosave, missing-remote-file recovery, active-plane setup, selection delete, undo/redo, and save-status behavior should remain equivalent.

Open/restore failure semantics must match the corrected direct proposal if this fallback is ever selected: validate external project data before destructive reset and keep the previous active session, command stack, project metadata, dirty/version state, and autosave eligibility intact if validation or restore/deserialization fails. This is a session-boundary requirement, not permission to redesign persistence schema/replay.

## No-backcompat rationale

The application should not preserve app-shell raw-pair persistence as a compatibility layer once a kernel boundary exists. The old shape is an internal implementation detail that confuses ownership and would undermine future waves. Delete it rather than wrapping it.

## Validation plan

Same mandatory cadence as the direct proposal, with additional kernel-focused tests:

1. Pre-edit scoped status/diff and source-boundary scans for app-shell/session-kernel imports.
2. Focused Vitest for new `application/sessionKernel` tests plus existing app-shell runtime/use-case/boundary tests.
3. Failure-path focused tests equivalent to the corrected direct proposal: invalid/corrupt project payloads, restore/deserialization errors, command-stack/world state after failed open, and autosave/session boundary exception behavior.
4. Static boundary tests proving:
   - app-shell ports/use cases do not import `World`, `CommandStack`, `ProjectData`, or `ProjectService` except for explicitly approved composition/accessor boundaries.
   - `ProjectService` is imported only by the kernel/app-shell persistence adapter.
   - `KeyboardShortcutRouter`, active-plane use cases, and selection-delete APIs were not migrated by this fallback unless a reviewed delta explicitly allowed it.
5. Root/frontend lint.
6. Root/frontend full Vitest.
7. Root/frontend build.
8. Root/frontend e2e/Playwright for startup/session/keyboard behavior.
9. Live preview refresh/probe and Playwright/live smoke for startup/new project, save-status, delete/undo, and representative session behavior without real Drive credentials.

## Risks and mitigations

- **Risk: over-abstracting into an application-kernel platform.** Mitigation: split only the ports needed by current app-shell/session flows; no event bus, service locator, generic command executor, or broad module migration.
- **Risk: scope creep into keyboard/active-plane/selection.** Mitigation: this corrected fallback explicitly excludes keyboard/history, active-plane, and selection migration; only construction-site preservation through existing raw outputs or named accessors is allowed.
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

## Stop conditions against implementation discretion and scope creep

This proposal must not be treated as permission for discretionary broadening during implementation. Stop and request a reviewed delta if the implementer wants or needs to:

- migrate `KeyboardShortcutRouter` undo/redo/history access;
- migrate active-plane use cases or selection use cases into kernel ports;
- change `SelectionDeletionCommandService` public behavior or turn it into a generic command executor;
- alter rendering/canvas read models, leaf command producers, or process-history/toolbar command flows;
- change persistence schema/replay or Drive/auth internals;
- add a broad application platform, event bus, service locator, or general command-kernel abstraction.

## Comparison with direct proposal

Choose this restructure path only if review round 02 concludes that the corrected direct proposal cannot satisfy project lifecycle, autosave, and persistence-boundary needs without an immediate god object or hidden behavior regression. Keyboard history, active-plane observation, and selection-delete wiring are **not** grounds for selecting this fallback in Cycle 022; they are explicitly deferred unless future reviewed wave planning pulls them forward.

Otherwise, choose `proposal-direct.md`: it produces the targeted architectural improvement with fewer files, lower abstraction risk, and a smaller validation blast radius while still deleting the raw persistence pair contract and adding explicit failure-path validation.
