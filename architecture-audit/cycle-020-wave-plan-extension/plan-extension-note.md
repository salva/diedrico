# Cycle 020 Wave-Plan Extension Note

## Scope and protected-surface check

This is a planning-only extension after Wave 019. I inspected current path-scoped status, the full wave-plan tail, Wave 018/019 implementation logs, the Wave 019 validation summary, baseline risk/map artifacts, and bounded current source samples. No production source, tests, package/tooling, backend implementation, docs/spec implementation content, or forbidden config/secret paths were edited or read.

Path-scoped status before the edit is captured in `.saivage/stages/cycle-020-wave-plan-extension/pre-edit-scoped-status.stdout`. It shows unrelated dirty frontend files under app-shell/commands/components/domain/stores plus an untracked `frontend/src/vite-env.d.ts`; those were not reverted or used as implementation input. The only intended changes in this task are `architecture-audit/wave-plan.md`, this note, captured evidence logs, and the task report.

## Evidence inspected

- `architecture-audit/wave-plan.md` currently ended at Wave 019 before this extension; captured heading scan: `.saivage/stages/cycle-020-wave-plan-extension/source-scan.stdout`.
- Wave 019 closure marks the 3D scene-host/runtime boundary complete with green mandatory validation and preview evidence, and recommends a reviewed Wave 020 plan extension before any next implementation (`architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log.md`, “Validation/preview closure — cycle-019-validation-and-preview-refresh”).
- Wave 018 closure confirms domain realization context cleanup completed and points Wave 019 as already completed next-step work (`architecture-audit/cycle-018-domain-realization-context-boundary/implementation-log.md`, “Validation/preview closure — cycle-018-validation-and-preview-refresh”).
- The baseline ranked app-shell concentration and UI/application leaks as central risks after domain/persistence/rendering foundations (`architecture-audit/baseline/risk-register.md`, R2 and R5; `architecture-audit/baseline/architecture-map.md`, “Entry points and workspace boundaries”).
- Current `App.vue` is now a much thinner shell that delegates to `runtime.actions`, creates runtime through `createAppShellRuntime`, and provides runtime world/command stack (`frontend/src/App.vue:107`, `frontend/src/App.vue:126`, `frontend/src/App.vue:142`, `frontend/src/App.vue:143`, `frontend/src/App.vue:171`). This means the old “shrink App.vue” premise is mostly complete, but the app-shell boundary still needs refinement.
- Current `createAppShellRuntime` still constructs `World`, `CommandStack`, default `GoogleDriveService`, default `ProjectService`, `window.localStorage`, browser scheduler, and installs keyboard handling on `window` (`frontend/src/application/appShell/AppShellRuntime.ts:21`-`29`, `frontend/src/application/appShell/AppShellRuntime.ts:101`).
- `AppShellPorts` still types persistence in terms of concrete `CommandStack`, `World`, and `ProjectData` (`frontend/src/application/appShell/AppShellPorts.ts:2`-`5`, `frontend/src/application/appShell/AppShellPorts.ts:24`-`28`).
- `ProjectSessionUseCases` mixes Drive calls, local-storage keys, world reset/initialization, command-stack clearing, persistence validation/deserialization, autosave start, and UI error state (`frontend/src/application/appShell/ProjectSessionUseCases.ts:27`-`58`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:96`-`135`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:188`-`198`).
- `AutoSaveUseCases` mixes dirty-version polling, debounce/status timers, persistence serialization, Drive update/create fallback, storage-key update, and auth/quota/file-deleted error policy (`frontend/src/application/appShell/AutoSaveUseCases.ts:30`-`64`, `frontend/src/application/appShell/AutoSaveUseCases.ts:92`-`119`).
- `SelectionUseCases` still owns delete command construction and dependency-preview reads (`frontend/src/application/appShell/SelectionUseCases.ts:33`-`40`, `frontend/src/application/appShell/SelectionUseCases.ts:59`-`65`), and `KeyboardShortcutRouter` installs/routs global keyboard intents (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:28`-`41`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:91`-`101`). These should be inventoried, but not necessarily all moved.
- Backend/frontend contract cleanup is lower priority now because current source has no `backend/` directory and root workspaces list only `frontend` (`package.json:7`-`9`); captured evidence: `.saivage/stages/cycle-020-wave-plan-extension/backend-contract-source-evidence.stdout`.
- Placeholder/debug cleanup is lower priority because the scan found no README-only `paper/`/`toolbar/` operation placeholder files and no selected debug/TODO hits in the scanned source (`.saivage/stages/cycle-020-wave-plan-extension/deferred-candidates-evidence.stdout`).
- Docs/spec drift remains real (`docs/` and `specs/` files exist in the scan), but it is deliberately deferred until structural app-shell boundaries are settled.

## Ranking rationale

Wave 020 is ranked as **App-shell project session and browser integration boundary** because it is now the most central remaining runtime coordinator after Waves 016–019 completed presentation/read-port/realization/Three runtime work. The remaining app shell is not primarily a Vue component-size problem; it is a composition-boundary problem: core runtime/use-case modules still know how to create browser and Drive adapters, bind localStorage, call static persistence, install window keyboard handling, and expose persistence through concrete `World`/`CommandStack` types.

This wave is more central than docs/spec cleanup because future docs should describe the final app-shell composition, not the current hidden-global runtime. It is more central than backend/frontend contract work because the backend is absent from the active workspace in current evidence. It is more central than placeholder/debug cleanup because the main placeholder directories previously identified are already absent. It is also a better immediate follow-up than broad validation hardening because Wave 019 just closed with green mandatory gates, and app-shell/session changes are likely to need focused validation rather than a new validation platform.

## Added Wave 020 summary

`architecture-audit/wave-plan.md` now includes Wave 020 with required fields:

- title: **App-shell project session and browser integration boundary**
- scope: app-shell runtime/ports/session/autosave/keyboard/selection boundaries plus narrow ProjectService/GoogleDriveService adapter seams
- target outcome: explicit production composition boundary and testable use cases without hidden browser globals/static services
- explicit DELETE list: hidden default construction/global paths, duplicated local-storage keys, broad use-case error `any`, obsolete tests/wrappers, and dual paths
- success criteria: narrow ports/adapters, App.vue remains passive, focused tests, mandatory root/per-workspace validation where defined, stable validation-log capture, and live-preview/browser evidence
- dependencies: Waves 014–019
- validation requirements and risks, tightened after review to preserve the binding root/per-workspace cadence explicitly
- no-backcompat rationale

## Deferred candidates

- **Backend/frontend contract stance:** defer because `backend/` is absent and root workspaces currently include only `frontend` (`package.json:7`-`9`). If a backend is reintroduced or docs/source references resurface, schedule a specific contract/deletion wave.
- **Docs/spec reconciliation:** defer until after app-shell/session architecture is cleaned so docs do not freeze another intermediate boundary.
- **Placeholder/debug cleanup:** defer because current scans did not find the old README-only operation placeholder directories; any remaining debug/noise cleanup is peripheral.
- **Validation gate hardening:** defer until a concrete red/weak gate is observed; current Wave 019 closure records green validation and preview evidence.

## Review-blocker correction

The reviewer identified one blocker: Wave 020's validation wording was close but not explicit enough about preserving the mandatory root/per-workspace validation cadence and stable evidence capture. I corrected `architecture-audit/wave-plan.md` so Wave 020 now requires stable stdout/stderr logs under the Cycle 020 validation directory; root and every workspace where defined for lint, full Vitest, build, and Playwright/e2e; focused Vitest for touched app-shell/adapter modules; exact package-script evidence for any undefined command; live preview refresh bound to `0.0.0.0:5173`; HTTP 200 reachability; and Playwright MCP/live browser smoke for startup/new-project, keyboard, and visible save/status behavior. This is a planning-artifact correction only; no source implementation or package/tooling files were changed.

## Recommended next stage

Run `cycle-020-wave-plan-extension-review` before any Cycle 020 scout/proposals or implementation. If review accepts this extension, start the canonical `cycle-020-fresh-scout-proposals` stage for Wave 020 and re-read the app-shell/runtime source against the final reviewed entry.
