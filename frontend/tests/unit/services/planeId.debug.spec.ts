/**
 * Debug test to check plane IDs
 */

import { describe, it } from 'vitest';
import { World } from '../../../src/domain/world/World';

describe('Plane ID Debug', () => {
  it('should check plane IDs', () => {
    const world = new World();
    
    const projPlaneH = world.projectionPlanes.get('proj_plane_H');
    console.log('projPlaneH exists:', !!projPlaneH);
    console.log('projPlaneH.id:', projPlaneH?.id);
    console.log('projPlaneH.id type:', typeof projPlaneH?.id);
    
    // Check if IDs are the same
    console.log('IDs match:', projPlaneH?.id === 'proj_plane_H');
  });
});
