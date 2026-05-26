# Wave 009 app-shell scout findings

This research note supports `architecture-audit/cycle-009-app-shell-services/` artifacts.

Key evidence:

- `App.vue` imports command/domain/persistence/Drive services directly (`frontend/src/App.vue:115-126`) and constructs/provides `World`/`CommandStack` (`frontend/src/App.vue:147-153`).
- Project lifecycle and Drive/auth orchestration are inline (`frontend/src/App.vue:272-467`, `frontend/src/App.vue:657-790`).
- Autosave uses inline polling/debounce and `window as any.__autoSaveInterval` (`frontend/src/App.vue:474-621`).
- Selection cascade/delete/select-all are inline and build commands directly (`frontend/src/App.vue:242-267`, `frontend/src/App.vue:793-865`).
- Keyboard routing is inline and overlaps with `Toolbar.vue`'s global listener (`frontend/src/App.vue:879-1030`, `frontend/src/components/toolbars/Toolbar.vue:189-239`).
- StartupDialog file listing uses a global `CustomEvent('load-files')` bridge (`frontend/src/components/dialogs/StartupDialog.vue:105-118`, `frontend/src/App.vue:1035-1049`).
- Wave 008 extracted 3D rendering into presentation/runtime adapters and left App.vue untouched; its validation log records known pre-existing lint/build/full-test/e2e blockers.

Recommended direction: prefer a runtime/application-shell boundary (`AppShellRuntime`) over ad hoc composable extraction if the review accepts the scope, because it fixes stable `World`/`CommandStack` ownership and removes Vue component setup as the application coordinator.
