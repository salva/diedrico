/**
 * Manual test script for 3D point reconstruction
 * Run with: npx tsx manual-test-point3d.ts
 */

import { World } from './src/domain/world/World';
import { Point3DFromProjections } from './src/domain/world/Point3D';
import { FreePoint2D } from './src/domain/world/Point';
import { Vector3 } from 'three';

console.log('=== Testing 3D Point Reconstruction ===\n');

// Create a test world
const world = World.createNew('test');

// Get planes
const planeH = world.getProjectionPlaneById('P_H');
const planeV = world.getProjectionPlaneById('P_V');

if (!planeH || !planeV) {
  console.error('ERROR: Could not get base planes');
  process.exit(1);
}

console.log('✓ Base planes found: P_H and P_V\n');

// User's test case:
// - P_V projection: (x=1, z=1) → plane coords (u=1, v=1)
// - P_H projection: (x=1, y=3) → plane coords (u=1, v=3)
// Expected 3D point: (x=1, y=3, z=1)

console.log('Test Case: User-specified coordinates');
console.log('--------------------------------------');
console.log('P_V projection: (u=1, v=1) → should give 3D (x=1, y=0, z=1)');
console.log('P_H projection: (u=1, v=3) → should give 3D (x=1, y=3, z=0)');
console.log('Expected combined 3D point: (x=1, y=3, z=1)\n');

// Create point on P_V at (u=1, v=1)
const pointV = new FreePoint2D(
  'point-v',
  'V',
  new Vector3(1, 1, 1),  // (u, v, w) homogeneous
  { color: '#FF6B35' }
);
planeV.addPoint(pointV);

// Create point on P_H at (u=1, v=3)
const pointH = new FreePoint2D(
  'point-h',
  'H',
  new Vector3(1, 3, 1),  // (u, v, w) homogeneous
  { color: '#FF6B35' }
);
planeH.addPoint(pointH);

console.log('✓ Created 2D projections');

// Create 3D point from projections
const point3D = new Point3DFromProjections(
  'point-3d',
  'P',
  'point-v',
  'point-h',
  'P_V',
  'P_H',
  { color: '#FF6B35' }
);

console.log('✓ Created Point3DFromProjections');

// Realize the 3D point
const realization = point3D.realize3D(world);

console.log('\nRealization Results:');
console.log('-------------------');
console.log('Feasible:', realization.isFeasible);

if (realization.isFeasible) {
  const [x, y, z] = realization.getCartesian();
  
  console.log(`Actual 3D coordinates: (x=${x.toFixed(3)}, y=${y.toFixed(3)}, z=${z.toFixed(3)})`);
  console.log(`Expected coordinates:  (x=1.000, y=3.000, z=1.000)`);
  
  // Check if coordinates match (within tolerance)
  const tolerance = 0.001;
  const xMatch = Math.abs(x - 1) < tolerance;
  const yMatch = Math.abs(y - 3) < tolerance;
  const zMatch = Math.abs(z - 1) < tolerance;
  
  console.log('\nValidation:');
  console.log(`  x: ${xMatch ? '✓' : '✗'} (${xMatch ? 'PASS' : 'FAIL'})`);
  console.log(`  y: ${yMatch ? '✓' : '✗'} (${yMatch ? 'PASS' : 'FAIL'})`);
  console.log(`  z: ${zMatch ? '✓' : '✗'} (${zMatch ? 'PASS' : 'FAIL'})`);
  
  if (xMatch && yMatch && zMatch) {
    console.log('\n✓✓✓ ALL TESTS PASSED ✓✓✓');
    process.exit(0);
  } else {
    console.log('\n✗✗✗ TESTS FAILED ✗✗✗');
    process.exit(1);
  }
} else {
  console.log('✗ Realization not feasible');
  process.exit(1);
}
