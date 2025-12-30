#!/bin/bash
# Fix plane.spec.ts to use Vector4

cd /home/salva/g/diedrico/frontend

# Fix Plane3D constructor arrays to use Vector4
# Pattern: new Plane3D([a, b, c, d], [e, f, g, h], ...)
# Replace with: new Plane3D(new Vector4(a, b, c, d), new Vector4(e, f, g, h), ...)

sed -i 's/new Plane3D(\n *\[\([0-9.-]\+\), *\([0-9.-]\+\), *\([0-9.-]\+\), *\([0-9.-]\+\)\],\n *\[\([0-9.-]\+\), *\([0-9.-]\+\), *\([0-9.-]\+\), *\([0-9.-]\+\)\]/new Plane3D(\n        new Vector4(\1, \2, \3, \4),\n        new Vector4(\5, \6, \7, \8)/g' tests/unit/domain/plane.spec.ts

# Add Vector4 import if not present
if ! grep -q "import.*Vector4.*from.*three" tests/unit/domain/plane.spec.ts; then
  sed -i "1i import { Vector4 } from 'three';" tests/unit/domain/plane.spec.ts
fi

echo "plane.spec.ts updated"
