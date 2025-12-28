/**
 * Unit tests for Create3DPointCommand
 * Tests 3D point creation from compatible 2D projections and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Create3DPointCommand } from '@/commands/Create3DPointCommand';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import { useWorldStore } from '@/stores/worldStore';
import { useViewStore } from '@/stores/viewStore';
import { setActivePinia, createPinia } from 'pinia';

describe('Create3DPointCommand', () => {
  let worldStore: ReturnType<typeof useWorldStore>;
  let viewStore: ReturnType<typeof useViewStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    worldStore = useWorldStore();
    viewStore = useViewStore();
    worldStore.initializeWorkspace();
  });

  describe('validation', () => {
    it('should reject if horizontal projection does not exist', () => {
      const command = new Create3DPointCommand(
        {
          projectionHId: 'nonexistent-point',
          projectionVId: 'some-point',
          actionId: 'test-action'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
    });

    it('should reject if vertical projection does not exist', () => {
      // Create a point on horizontal plane
      const pointH = new CreateFreePointCommand(
        { x: 100, y: 100, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: 'nonexistent-point',
          actionId: 'test-action'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
    });

    it('should reject if horizontal projection is infeasible', () => {
      // Create points
      const pointH = new CreateFreePointCommand(
        { x: 100, y: 100, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const pointV = new CreateFreePointCommand(
        { x: 100, y: 100, planeId: 'P_V', actionId: 'test-action' },
        worldStore
      );
      const resultV = pointV.execute();

      // Mark horizontal projection as infeasible
      const point = worldStore.elements2D.get(resultH.outputs?.pointId!);
      if (point) {
        point.infeasible = true;
      }

      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: resultV.outputs?.pointId!,
          actionId: 'test-action'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('infeasible');
    });

    it('should accept compatible feasible projections', () => {
      // Create feasible points on both planes
      const pointH = new CreateFreePointCommand(
        { x: 100, y: 100, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const pointV = new CreateFreePointCommand(
        { x: 100, y: 100, planeId: 'P_V', actionId: 'test-action' },
        worldStore
      );
      const resultV = pointV.execute();

      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: resultV.outputs?.pointId!,
          actionId: 'test-action'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(true);
    });
  });

  describe('execution', () => {
    it('should create a 3D point from two compatible projections', () => {
      // Create projections
      const pointH = new CreateFreePointCommand(
        { x: 100, y: -50, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const pointV = new CreateFreePointCommand(
        { x: 100, y: 150, planeId: 'P_V', actionId: 'test-action' },
        worldStore
      );
      const resultV = pointV.execute();

      // Create 3D point
      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: resultV.outputs?.pointId!,
          actionId: 'test-action-3d',
          name: 'A'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs?.point3DId).toBeDefined();

      // Verify 3D point exists in worldStore
      const point3D = worldStore.elements3D.get(result.outputs?.point3DId!);
      expect(point3D).toBeDefined();
      expect(point3D?.kind).toBe('Point3DFromProjections');
      expect(point3D?.name).toBe('A');
      expect(point3D?.createdBy).toBe('test-action-3d');

      if (point3D && point3D.kind === 'Point3DFromProjections') {
        expect(point3D.projectionHId).toBe(resultH.outputs?.pointId);
        expect(point3D.projectionVId).toBe(resultV.outputs?.pointId);
      }
    });

    it('should add dependency edges from projections to 3D point', () => {
      // Create projections
      const pointH = new CreateFreePointCommand(
        { x: 100, y: -50, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const pointV = new CreateFreePointCommand(
        { x: 100, y: 150, planeId: 'P_V', actionId: 'test-action' },
        worldStore
      );
      const resultV = pointV.execute();

      // Create 3D point
      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: resultV.outputs?.pointId!,
          actionId: 'test-action-3d'
        },
        worldStore
      );

      const result = command.execute();
      expect(result.success).toBe(true);

      // Check dependency edges
      const dependencyService = worldStore.dependencyGraph;
      const point3DPath = `/world/elements3D/${result.outputs?.point3DId}`;
      const pointHPath = `/world/elements2D/${resultH.outputs?.pointId}`;
      const pointVPath = `/world/elements2D/${resultV.outputs?.pointId}`;

      // 3D point should depend on both projections
      const ancestors = dependencyService.getAncestors(point3DPath);
      expect(ancestors).toContain(pointHPath);
      expect(ancestors).toContain(pointVPath);
    });

    it('should fail if projections are incompatible', () => {
      // Create infeasible projection
      const pointH = new CreateFreePointCommand(
        { x: 100, y: -50, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const pointV = new CreateFreePointCommand(
        { x: 100, y: 150, planeId: 'P_V', actionId: 'test-action' },
        worldStore
      );
      const resultV = pointV.execute();

      // Mark one as infeasible
      const point = worldStore.elements2D.get(resultH.outputs?.pointId!);
      if (point) {
        point.infeasible = true;
      }

      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: resultV.outputs?.pointId!,
          actionId: 'test-action-3d'
        },
        worldStore
      );

      const result = command.execute();
      expect(result.success).toBe(false);
      expect(result.error).toContain('infeasible');
    });
  });

  describe('undo', () => {
    it('should remove the 3D point and dependency edges', () => {
      // Create projections
      const pointH = new CreateFreePointCommand(
        { x: 100, y: -50, planeId: 'P_H', actionId: 'test-action' },
        worldStore
      );
      const resultH = pointH.execute();

      const pointV = new CreateFreePointCommand(
        { x: 100, y: 150, planeId: 'P_V', actionId: 'test-action' },
        worldStore
      );
      const resultV = pointV.execute();

      // Create 3D point
      const command = new Create3DPointCommand(
        {
          projectionHId: resultH.outputs?.pointId!,
          projectionVId: resultV.outputs?.pointId!,
          actionId: 'test-action-3d'
        },
        worldStore
      );

      const result = command.execute();
      expect(result.success).toBe(true);

      const point3DId = result.outputs?.point3DId!;
      expect(worldStore.elements3D.has(point3DId)).toBe(true);

      // Commit and undo
      command.commit();
      command.undo();

      // Verify 3D point is removed
      expect(worldStore.elements3D.has(point3DId)).toBe(false);
    });
  });
});
