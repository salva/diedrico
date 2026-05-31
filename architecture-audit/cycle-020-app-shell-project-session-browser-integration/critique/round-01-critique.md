# Cycle 020 Critique Round 01 — App-shell project session and browser integration boundary

`synthesized_by: manager`  
`reason: critic_dispatch_unavailable`

## Dispatch availability

The Manager attempted to dispatch the required Critic twice in the same round. Both attempts failed before artifact creation with provider routing error: no context window configured for the selected critic model. Per the project failure-tolerance rule, this critique is synthesized by the Manager and the cycle may continue.

## Artifacts reviewed

- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/scope-check.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/proposals/proposal-direct.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/proposals/proposal-restructure.md`
- Wave 020 entry in `architecture-audit/wave-plan.md`
- Wave 019 closure evidence and Cycle 026 3D pointer-boundary hotfix evidence as cited by the scope-check

## Verdict

**Approved for canonical review with no blocking critique issues.**

The artifacts satisfy the design-deliverable protocol for this fresh-scout/proposal stage. They are design-only, cite current source evidence, acknowledge that several Wave 020 target seams already exist, and correctly bias the implementation toward bounded hardening/deletion rather than artificial churn. No wave-plan corrective edit is required before `cycle-020-review-round-01-post-019`.

## Rubric assessment

1. **Advances Wave 020 target outcome:** Pass. The direct proposal keeps `AppShellProductionRuntime.ts` as the production browser composition boundary, `createAppShellRuntime` as environment-free assembly, app-shell use cases over typed ports, `BrowserLastProjectRepository` as storage-key owner, and `ProjectSessionPersistenceAdapter` as the `ProjectService` bridge.
2. **Improves architecture and code quality:** Pass. The proposed improvement is focused on deleting obsolete hidden-construction expectations, narrowing dependency shapes, typed test fixtures, and dead exports rather than creating broad facades.
3. **Respects no-backcompat / aggressive-deletion priorities:** Pass. Both proposals explicitly require deletion of shims, dual factories, obsolete tests, duplicated keys, touched `as any` fixtures, and dead exports instead of compatibility wrappers.
4. **Avoids overfeaturism:** Pass. The direct proposal avoids UI feature work, Drive/auth internals, persistence schema, command descriptors, renderer/Three, backend/docs/specs, package/tooling, and validation-platform work. The restructure proposal is explicitly a fallback/stop path, not the preferred implementation.
5. **Introduces no hidden regression risks:** Pass with normal implementation vigilance. The artifacts protect Wave 019 Three boundaries, `.three-view-overlay` pointer ownership, keyboard routing, autosave timing, startup/session behavior, and dirty-workspace hygiene.
6. **Validation sufficiency:** Pass. The proposals require static scans, focused app-shell Vitest, root/frontend lint, full Vitest, root/frontend build, root/frontend e2e including current UI and keyboard shortcuts, live preview refresh, HTTP 200 probe, and credential-free live smoke.

## Non-blocking observations for the canonical reviewer

- The scope-check names `frontend/src/stores/viewStore.ts` as dirty in the scoped diff. Because it is a possible port-consumer surface but also dirty unrelated context, the implementation stage should avoid touching it unless the accepted proposal explicitly requires a narrow app-shell port compatibility edit.
- `AppShellPorts.ts` currently contains `createBrowserScheduler`; the direct proposal permits keeping it or moving it. The implementation decision should be evidence-driven: move/delete only if it reduces layering confusion without creating a re-export shim.
- The restructure proposal is useful as a guardrail but should not be selected unless canonical review finds a blocking flaw in the direct path.

## Approval

The scope-check and proposals are implementation-ready for `cycle-020-review-round-01-post-019`.
