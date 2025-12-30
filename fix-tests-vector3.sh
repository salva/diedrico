#!/bin/bash
#Fix all test files to use Vector3 instead of arrays

cd /home/salva/g/diedrico/frontend

# Fix array-based FreePoint2D constructors to use Vector3
find tests -name "*.spec.ts" -type f -exec sed -i 's/new FreePoint2D(\[\([0-9.-]\+\), *\([0-9.-]\+\), *\([0-9.-]\+\)\]/new FreePoint2D(new Vector3(\1, \2, \3)/g' {} \;

# Fix .coordinates[0] to .position.x
find tests -name "*.spec.ts" -type f -exec sed -i 's/\.coordinates\[0\]/.position.x/g' {} \;

# Fix .coordinates[1] to .position.y  
find tests -name "*.spec.ts" -type f -exec sed -i 's/\.coordinates\[1\]/.position.y/g' {} \;

# Fix .coordinates[2] to .position.z
find tests -name "*.spec.ts" -type f -exec sed -i 's/\.coordinates\[2\]/.position.z/g' {} \;

# Fix expect().toEqual([...]) to work with Vector3
# This is more complex and needs case-by-case handling

echo "Test files updated to use Vector3"
