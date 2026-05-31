#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' '--- forbidden production command seams ---'
rg -n "commandStackForDeferredCommandProducers|provide\(['\"]commandStack['\"]|inject(<[^>]+>)?\(['\"]commandStack['\"]|as CommandStack|runtime\.commandStack|provide\(['\"](commands|runtime|commandRuntime|appServices|runtimeContext)['\"]|inject\(['\"](commands|runtime|commandRuntime|appServices|runtimeContext)['\"]|execute\(commandBuilder" frontend/src || true
printf '%s\n' '--- expected typed runtime ports / keys ---'
rg -n "CanvasCommandProducerInjectionKey|ProcessHistoryCommandInjectionKey|CommandHistoryInjectionKey|canvasCommandProducerPort|processHistoryCommandPort|ToolCommandSink|ProcessHistoryIntentSink|commandHistoryPort|worldForView" frontend/src/application/appShell frontend/src/App.vue frontend/src/components/workspace/SvgCanvas.vue frontend/src/components/panels/ActionsPanel.vue frontend/src/components/toolbars/Toolbar.vue frontend/src/application/tools/CanvasToolController.ts frontend/src/application/processHistory/ProcessHistoryController.ts
