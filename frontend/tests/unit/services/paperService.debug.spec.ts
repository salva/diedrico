/**
 * Debug test to isolate PaperService issue
 */

import { describe, it, expect } from 'vitest';
import { Vector3, Matrix3 } from 'three';
import { PaperService, type PrimitiveContext } from '../../../src/services/PaperService';
import { World } from '../../../src/domain/world/World';
import { FreePoint2D } from '../../../src/domain/world/Point';
import { BaseProjectionPlane } from '../../../src/domain/world/ProjectionPlane';

describe('PaperService Debug', () => {
  it('should isolate the issue', () => {
    const paperService = new PaperService();
    const world = new World();
    const planeTransforms = new Map<string, Matrix3>();

    // Setup transforms
    const projPlaneH = world.projectionPlanes.get('proj_plane_H') as BaseProjectionPlane;
    const phRealization = projPlaneH.realize2D();
    console.log('Setting transform for proj_plane_H');
    console.log('phRealization:', phRealization);
    console.log('phRealization.planeToPaper:', phRealization.planeToPaper);
    console.log('planeToPaper type:', typeof phRealization.planeToPaper);
    planeTransforms.set('proj_plane_H', phRealization.planeToPaper);
    console.log('After set, map size:', planeTransforms.size);
    console.log('After set, get result:', planeTransforms.get('proj_plane_H'));

    console.log('=== BEFORE adding point ===');
    console.log('Number of points in world:', world.getAllPoints2D().length);
    console.log('Point IDs:', world.getAllPoints2D().map(p => p.id));

    // Create and add a point
    const point = new FreePoint2D('test-point-1', new Vector3(100, 50, 1), projPlaneH.id!, 'a_H');
    console.log('Created point:', point.id, 'on plane:', point.planeId, 'visible:', point.visible);
    
    world.addPoint2D(point);

    console.log('\n=== AFTER adding point ===');
    console.log('Number of points in world:', world.getAllPoints2D().length);
    console.log('Point IDs:', world.getAllPoints2D().map(p => p.id));
    console.log('Point exists in world.points:', world.points.has(point.id!));

    // Check realization
    const realization = world.getPoint2DRealization(point.id!);
    console.log('\n=== REALIZATION ===');
    console.log('Realization exists:', !!realization);
    if (realization) {
      console.log('Realization position:', realization.position);
      console.log('Realization feasible:', realization.feasible);
    }

    // Check transform
    const transform = planeTransforms.get(point.planeId!);
    console.log('\n=== TRANSFORM ===');
    console.log('Transform exists:', !!transform);
    console.log('Transform value:', transform);
    console.log('PlaneId:', point.planeId);
    console.log('PlaneId type:', typeof point.planeId);
    console.log('Available plane transforms:', Array.from(planeTransforms.keys()));
    console.log('Direct access test:', planeTransforms.get('proj_plane_H'));

    // Generate primitives
    const context: PrimitiveContext = {
      world,
      planeTransforms,
    };

    console.log('\n=== GENERATING PRIMITIVES ===');
    const primitives = paperService.generatePrimitives(context);
    console.log('Number of primitives generated:', primitives.length);
    console.log('Primitive types:', primitives.map(p => p.type));

    expect(primitives.length).toBeGreaterThan(0);
  });
});
