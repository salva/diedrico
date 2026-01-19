/**
 * Quick debug script to test Line3D reconstruction
 */
import { World } from './src/domain/world/World';
import { Line3DFromProjections } from './src/domain/world/Line3D';
import { Line2DByTwoPoints } from './src/domain/world/Line';
import { FreePoint2D } from './src/domain/world/Point';

const world = World.createEmpty();

// Test case: Line along x-axis
// P_H trace: horizontal line from (0,0) to (10,0) at z=0
// P_V trace: horizontal line from (0,0) to (10,0) at y=0
// Expected 3D line: along x-axis, direction = [1,0,0]

const P_H = world.getProjectionPlaneById('proj_plane_4')!;
const P_V = world.getProjectionPlaneById('proj_plane_3')!;

// Create points on P_H
const p1H = new FreePoint2D(world.generatePointId(), 'proj_plane_4', 'p1H', 0, 0, { color: '#000', size: 3 });
const p2H = new FreePoint2D(world.generatePointId(), 'proj_plane_4', 'p2H', 10, 0, { color: '#000', size: 3 });
P_H.addPoint(p1H);
P_H.addPoint(p2H);

// Create line on P_H
const lineH = new Line2DByTwoPoints(
  world.generateLineId(),
  'proj_plane_4',
  'L_H',
  p1H.id!,
  p2H.id!,
  { color: '#000', thickness: 1 }
);
P_H.addLine(lineH);

// Create points on P_V
const p1V = new FreePoint2D(world.generatePointId(), 'proj_plane_3', 'p1V', 0, 0, { color: '#000', size: 3 });
const p2V = new FreePoint2D(world.generatePointId(), 'proj_plane_3', 'p2V', 10, 0, { color: '#000', size: 3 });
P_V.addPoint(p1V);
P_V.addPoint(p2V);

// Create line on P_V
const lineV = new Line2DByTwoPoints(
  world.generateLineId(),
  'proj_plane_3',
  'L_V',
  p1V.id!,
  p2V.id!,
  { color: '#000', thickness: 1 }
);
P_V.addLine(lineV);

// Create 3D line
const line3D = new Line3DFromProjections(
  world.generate3DLineId(),
  'Test Line',
  lineH.id!,
  lineV.id!,
  'proj_plane_4',
  'proj_plane_3',
  { color: '#FF0000', thickness: 2 }
);

world.add3DLine(line3D);

// Get realization
const realization = world.get3DLineRealization(line3D.id!);

console.log('\n=== TEST RESULT ===');
console.log('Feasible:', realization?.isFeasible);
console.log('Point:', realization?.getPoint());
console.log('Direction:', realization?.getDirection());
console.log('\nExpected:');
console.log('- Direction should be parallel to [1,0,0]');
console.log('- Points (0,0,0) and (10,0,0) should lie on the line');
