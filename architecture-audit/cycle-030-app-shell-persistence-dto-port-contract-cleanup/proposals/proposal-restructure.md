# Cycle 030 Proposal Restructure — Split DTO ownership before app-shell port cleanup, or re-plan if command descriptors are the real contract owner

## Summary

This proposal tests whether the direct fix should move one conceptual layer higher: instead of having general app-shell ports import `ProjectService.ProjectData`, create a small persistence-contract module owned by the application/persistence boundary, then make both the adapter and app-shell ports use that contract. If implementation evidence shows even that cannot remove casts without command descriptor/schema changes, stop and re-plan Wave 030 as a broader command/persistence descriptor contract wave.

No source implementation should occur until this proposal is reviewed and a decision selects either this path or the direct path.

## Target architecture after implementation

Introduce a narrow current-project persistence contract module, for example:

- `frontend/src/application/appShell/ProjectSessionPersistenceContract.ts` or a similarly named application/persistence-boundary module.

That module owns type-level naming for the app-shell persistence payload:

- `ProjectSessionPersistencePayload` — the current project/session DTO used by snapshot/save/open/restore.
- `OpenedProjectSession` if the decision wants to move it out of `AppShellPorts.ts`, or keep `OpenedProjectSession` in `AppShellPorts.ts` while importing only the payload type.

The contract module may type-alias `ProjectData` from `ProjectService` initially, but it should not wrap data, copy schema fields, add runtime migration, or duplicate validation. Runtime validation and serialization still live in `ProjectService`; the new module is a boundary-name owner so app-shell ports do not expose service implementation names directly.

Persistence flow remains the same as the direct proposal, but app-shell use cases see a boundary-owned name rather than `ProjectData`:

`RuntimeSession snapshot handle → ProjectSessionPersistencePayload → Drive/local save/update → unknown loaded input → validation returns OpenedProjectSession<ProjectSessionPersistencePayload> → candidate restore → live restore`.

## Files to change

Expected production changes:

- Add `frontend/src/application/appShell/ProjectSessionPersistenceContract.ts`.
  - Export `ProjectSessionPersistencePayload` as the one current-schema payload type.
  - Prefer a type-only alias to `ProjectData` if the critic accepts that this is a boundary name, not a schema fork.
  - Do not duplicate the full schema interface unless reviewers reject the alias; duplicated schema ownership risks drift.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Delete `PersistedProjectSession` marker.
  - Import the new payload type from the contract module.
  - Retype `OpenedProjectSession.payload`, `ProjectSessionPersistencePort.snapshotCurrentSession`, and `restoreSession` to the new payload.
  - Optionally move `OpenedProjectSession` to the contract module if that simplifies ownership, but avoid broad app-shell port churn.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Use `ProjectData`/contract payload directly after `ProjectService.validateProjectData(data)`.
  - Remove double casts.
- `frontend/src/application/appShell/ProjectSessionKernel.ts`, `RuntimeSession.ts`, `ProjectSessionUseCases.ts`, `AutoSaveUseCases.ts`
  - Propagate the contract payload type through snapshot/save/autosave/open calls.
- `frontend/src/services/ProjectService.ts`
  - Prefer no source change. If needed, export `SerializedCommand` or mark `ProjectData` fields readonly only if doing so is a pure type contract improvement and does not affect replay/schema behavior.

Expected test changes:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Replace stale `PersistedProjectSession` expectations with assertions that exactly one persistence contract module/type names the payload.
  - Assert `ProjectSessionPersistenceContract.ts` contains no runtime service construction, no validation duplicate, no schema migration branches, and no `unknown as` casts.
  - Preserve tests that concrete `World`/`CommandStack` handles are adapter-local.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Replace untyped mocks with typed payload builders.
- Add/update focused tests for the adapter and runtime restore path as in the direct proposal.

## Files/tests/docs/fixtures to DELETE

- Delete the `PersistedProjectSession` marker and all references if replaced by `ProjectSessionPersistencePayload`.
- Delete `object` snapshot return types in the app-shell persistence path.
- Delete double casts in the adapter.
- Delete stale boundary-test expectations that app-shell ports must be free of all persistence DTO type names. Replace with a sharper rule: app-shell ports may depend on the persistence contract type, but not runtime `ProjectService` methods, concrete `World`, concrete `CommandStack`, schema validation logic, or replay implementation.
- Delete generic-object persistence mocks and `payload: data as never` test shims.
- Do not delete or copy `ProjectService` serialization/deserialization logic.

## Expected behavior change

None. This is a structural naming/typing cleanup around the same current schema and runtime behavior.

## Risks and mitigations

- **Risk: unnecessary layer.** A dedicated contract module could be over-architecture if it only aliases `ProjectData`. Mitigation: keep it type-only, tiny, and justified solely if reviewers reject direct `ProjectData` import into `AppShellPorts.ts`.
- **Risk: schema duplication.** Re-declaring `ProjectData` in the contract module could create two owners. Mitigation: prefer aliasing the current `ProjectService` DTO or move the type wholesale only if `ProjectService` imports it from the contract module without circular dependencies.
- **Risk: hidden command descriptor redesign.** If `ProjectData` still contains broad descriptor residuals and implementation tries to solve them here, the wave will overreach. Mitigation: stop and recommend a new command/persistence descriptor wave if descriptor typing blocks cast deletion.
- **Risk: Drive/auth scope creep.** Do not redesign Drive service internals. Only update project payload method types if local changes are trivial and credential-free tests remain green.

## Re-plan trigger: command descriptor contract is the actual blocker

If implementation discovers any of the following, do not continue this restructure under Wave 030:

- Removing the app-shell casts requires changing `OperationDescriptor`, operation output descriptors, process-tree action serialization, or `CommandSnapshot`.
- `ProjectService.validateProjectData(...)` cannot assert a stable DTO because descriptor shape is too broad for the current boundary.
- Replay correctness requires changing `OperationRegistry`, concrete operations, or command-stack restoration semantics.
- Tests fail because current command descriptors are semantically inconsistent rather than because app-shell types are stale.

In that case, write a plan-correction recommendation for a broader command/persistence descriptor contract wave. The app-shell DTO cleanup should become a follow-up after that central contract is fixed.

## Validation plan

Same mandatory validation cadence as the direct proposal, with one additional static/architecture check:

1. Confirm the new contract module is type-only and contains no runtime validation/replay/Drive/auth logic.
2. Confirm there is exactly one public app-shell payload type and no dual `ProjectData`/`PersistedProjectSession` public path.
3. Run focused app-shell boundary/use-case/adapter tests.
4. Run focused ProjectService tests if touched.
5. Run root/frontend lint, full Vitest, build, and Playwright/e2e.
6. Refresh preview and run credential-free live smoke preserving current UI and 3D overlay behavior.

## No-backcompat / aggressive deletion rationale

This proposal still deletes the old marker, generic `object` snapshot path, double casts, and stale mocks. It does not preserve compatibility with the old port shape. The only reason to add a contract module is to choose a cleaner owner for the current DTO name; it must not become a compatibility wrapper or parallel schema.

## Protected surfaces

Same as direct proposal: no command descriptor redesign, operation registry work, schema migration/backcompat, Drive/auth internals, backend/docs/specs, rendering/CSS/canvas/3D changes, package/tooling churn, UI feature work, or unrelated dirty-file normalization.

## Recommendation

Use this proposal only if review concludes that `AppShellPorts.ts` should not import `ProjectService.ProjectData` directly, even as a type. Otherwise prefer the direct proposal because it deletes the cast seam with fewer modules. If command descriptor typing is proven to be the true blocker, reject both implementation paths and perform a reviewed wave-plan correction before coding.
