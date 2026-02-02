import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../../src/domain/world/World';
import { ProjectionPlane } from '../../../src/domain/world/ProjectionPlane';

describe('World Active Plane Management', () => {
    let world: World;

    beforeEach(() => {
        world = new World();
    });

    it('should have a default active plane on initialization', () => {
        const activeId = world.getActivePlaneId();
        expect(activeId).toBeDefined();
        if (activeId) {
             expect(world.projectionPlanes.get(activeId)).toBeDefined();
        }
    });

    it('should update active plane when set manually', () => {
        const planes = world.getAllProjectionPlanes();
        if (planes.length < 2) {
            // Should have at least P_H and P_V
            throw new Error('World initialized with fewer than 2 planes');
        }
        
        const firstPlane = planes[0];
        const secondPlane = planes[1];

        // Ensure we start with something different to prove the change
        world.setActivePlaneId(firstPlane.id!);
        expect(world.getActivePlaneId()).toBe(firstPlane.id!);

        // Change validation
        world.setActivePlaneId(secondPlane.id!);
        expect(world.getActivePlaneId()).toBe(secondPlane.id!);
    });

    it('should self-heal when active plane is deleted', () => {
        // 1. Setup two planes
        const planes = world.getAllProjectionPlanes();
        const firstPlane = planes[0];
        const secondPlane = planes[1];
        
        expect(secondPlane).toBeDefined();

        // 2. Set active to second plane
        world.setActivePlaneId(secondPlane.id!);
        expect(world.getActivePlaneId()).toBe(secondPlane.id!);

        // 3. Force-delete the second plane from the map
        // (Simulating a deletion operation or undo that removes the plane)
        world.projectionPlanes.delete(secondPlane.id!);

        // 4. Verify getter handles the missing plane
        const healedId = world.getActivePlaneId();
        
        // Should fall back to another existing plane (likely the first one)
        // or at least be defined if there are planes left
        expect(healedId).toBeDefined();
        if (healedId) {
            expect(world.projectionPlanes.has(healedId)).toBe(true);
            expect(healedId).not.toBe(secondPlane.id!);
        }
    });
    
    it('should return undefined if all planes are deleted', () => {
        // Clear all planes
        world.projectionPlanes.clear();
        
        expect(world.getActivePlaneId()).toBeUndefined();
    });
});
