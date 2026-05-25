#!/usr/bin/env bash
set -euo pipefail
missing=0
for path in \
  frontend/src/components/workspace/Workspace2D.vue \
  frontend/src/components/workspace/ElementRenderer.vue \
  frontend/src/stores/worldStore.ts \
  frontend/src/composables/useSnapping.ts \
  frontend/src/composables/useElementGeometry.ts \
  frontend/src/types/ElementTypes.ts \
  frontend/src/components/dialogs/ElementPropertiesDialog.vue \
  frontend/src/components/panels/ElementGroup.vue \
  frontend/src/services/ValidationService.ts \
  frontend/tests/integration/formatUtils.integration.spec.ts \
  frontend/tests/e2e/dynamic-planes.spec.ts; do
  if test ! -e "$path"; then
    echo "deleted: $path"
  else
    echo "STILL EXISTS: $path"
    missing=1
  fi
done
printf '\nForbidden source/test reference scan (expected: only architecture test term list if any):\n'
grep -R "worldStore\|useWorldStore\|Workspace2D\|ElementRenderer\|ElementTypes\|useSnapping\|useElementGeometry" -n frontend/src frontend/tests || true
printf '\nE2E debug helper reference scan (expected: zero matches):\n'
grep -n "getWorld\|worldStore\|useWorldStore" frontend/tests/e2e/*.spec.ts || true
exit "$missing"
