#!/usr/bin/env bash
set -euo pipefail

echo "## ProjectSessionPersistenceAdapter RuntimeSession imports"
if grep -nE "from .*/RuntimeSession|from ['\"]\./RuntimeSession" frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts; then exit 10; else echo PASS_no_RuntimeSession_import_in_adapter; fi

echo "## ProjectSessionUseCases RuntimeSession imports"
if grep -nE "from .*/RuntimeSession|from ['\"]\./RuntimeSession" frontend/src/application/appShell/ProjectSessionUseCases.ts; then exit 11; else echo PASS_no_RuntimeSession_import_in_project_session_use_cases; fi

echo "## AppShellPorts concrete imports"
if grep -nE "^import type .*World|^import type .*CommandStack|^import type .*ProjectData|^import .*World|^import .*CommandStack|^import .*ProjectData" frontend/src/application/appShell/AppShellPorts.ts; then exit 12; else echo PASS_no_concrete_World_CommandStack_ProjectData_imports_in_AppShellPorts; fi

echo "## appShell ProjectService imports"
grep -RIn "ProjectService" frontend/src/application/appShell || true
project_service_files="$(grep -RIl "ProjectService" frontend/src/application/appShell | sort | tr '\n' ' ')"
test "$project_service_files" = "frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts "
echo PASS_ProjectService_adapter_private

echo "## obsolete RuntimeSession persistence exports"
if grep -nE "export (interface|type) RuntimeSessionPersistence(Snapshot|Restore)Handle" frontend/src/application/appShell/RuntimeSession.ts; then exit 13; else echo PASS_old_RuntimeSession_persistence_exports_absent; fi

echo "## selection delete construction location"
if grep -nE "SelectionDeletionCommand|delete selected|deleteSelected" frontend/src/application/selection/SelectionUseCases.ts; then exit 14; else echo PASS_selection_use_cases_do_not_construct_delete_commands; fi
grep -nE "SelectionDeletionCommand|DeleteSelectionCommand|delete" frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts
echo PASS_selection_delete_service_retains_command_construction_boundary

echo "## kernel and target modules exist"
test -f frontend/src/application/appShell/ProjectSessionKernel.ts
test -f frontend/src/application/appShell/ProjectSessionPersistenceTargets.ts
echo PASS_kernel_and_persistence_target_modules_present
