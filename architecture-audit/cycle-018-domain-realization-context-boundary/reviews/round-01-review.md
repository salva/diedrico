# Cycle 018 Review Round 01 — Domain realization context boundary

## Scope verification

Reviewed artifacts:

- `architecture-audit/cycle-018-domain-realization-context-boundary/scope-check.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md` (Wave 018 entry)
- `architecture-audit/cycle-018-wave-plan-extension/plan-extension-note.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log.md`
- current source evidence in `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, `frontend/src/domain/world/Element3D.ts`, `frontend/src/domain/world/Plane.ts`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`, and `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

Verified current-path correction: the active file is `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, not the stale `frontend/src/domain/world/ProjectionPlaneContext.ts` path named in the assignment.

Verified scope consistency: Wave 018 remains focused on the domain realization context boundary. Wave 019 three scene-host/runtime work, app-shell/backend/docs/debug cleanup, package/tooling churn, and broader command/persistence redesign remain out of scope in the scope-check and both proposals.

## Proposal scoring against the six review criteria

### Proposal A — `proposal-direct.md`

1. **Advances the wave target outcome** — **Strong**  
   Yes. It directly addresses the residual seam documented after Waves 016/017: read-port adapters still pass full `World` into domain realization APIs. It targets the exact contracts named in the Wave 018 entry.

2. **Improves architecture and code quality** — **Strong**  
   Reuses the existing `ProjectionElementRealizationContext` vocabulary instead of inventing a parallel abstraction, deletes `any`/concrete-`World` seams in `Element3D` and `Plane`, and keeps the boundary fix at the domain/application seam.

3. **Respects no-backcompat / aggressive deletion priorities** — **Strong**  
   Explicitly deletes old `any` signatures, concrete `World` realization signatures/imports, raw adapter realization calls, transitional overloads, and weak test helpers.

4. **Avoids overfeaturism** — **Strong**  
   Keeps ownership shape stable: domain elements still realize themselves, projection planes still own cache helpers, and read-port adapters remain the wrapping boundary. It does not try to fold in Wave 019 or redesign commands/tools/app-shell.

5. **Introduces new risks or hidden regressions** — **Acceptable / manageable**  
   Main risk is accidentally creating a renamed `World` facade or being forced into projection-plane mutation redesign. The proposal names both risks and includes stop conditions that are appropriate for this wave.

6. **Validation sufficiency** — **Strong**  
   Includes pre/post static scans, focused Vitest, full lint/Vitest/build, Playwright e2e, preview refresh, reachability probe, and live smoke. This matches the project validation runbook for a user-visible frontend/domain change.

### Proposal B — `proposal-restructure.md`

1. **Advances the wave target outcome** — **Partial**  
   It could solve the boundary, but only by moving one conceptual layer higher into a new realization query/service abstraction.

2. **Improves architecture and code quality** — **Mixed**  
   It may become cleaner if the direct path proves impossible, but based on current evidence it adds churn and abstraction before proving the existing typed context family is insufficient.

3. **Respects no-backcompat / aggressive deletion priorities** — **Adequate**  
   It does preserve deletion discipline if chosen.

4. **Avoids overfeaturism** — **Weaker than direct**  
   Higher risk of over-design because it centralizes realization dispatch and may reopen cache-ownership questions that the wave explicitly tries to avoid.

5. **Introduces new risks or hidden regressions** — **Higher risk**  
   More file churn, more cache-semantic risk, more chance of building a service-locator-shaped `RealizationQuery` that is only a renamed `World`.

6. **Validation sufficiency** — **Strong**  
   The validation plan is sufficient if this path were ever selected.

## Comparative recommendation

`proposal-direct.md` is the preferred implementation direction. It is more aligned with the actual Wave 018 target, uses current source vocabulary, deletes the known seam with less churn, and better respects the project's “clean architecture first, no compatibility shims” priorities.

`proposal-restructure.md` should remain a fallback only if implementation inventory proves the direct typed-context path necessarily expands into a god-context or forces projection-plane mutation ownership redesign.

## Decision recommendation

**NO BLOCKING ISSUES**

Proceed to `cycle-018-decision` with the following considerations recorded:

- Prefer `proposal-direct.md`.
- Preserve the stop condition that any forced projection-plane mutation ownership redesign or service-locator-shaped query abstraction must bounce to a reviewed delta/plan-edit cycle rather than being smuggled into implementation.
- In implementation, keep command/tool/UI call-site edits mechanical only; do not reopen those layers unless a reviewed scope change is approved.
