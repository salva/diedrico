/**
 * Unit Tests: World Operations
 * 
 * Tests atomic operations that mutate the World domain model:
 * - AddElementOp: Adds elements to World
 * - RemoveElementOp: Removes elements from World
 * - UpdateElementOp: Updates element properties
 * 
 * Each operation must be reversible (apply/undo) for command pattern support.
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T072a
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { FreePoint2D } from '@/domain/world/Point';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { AddElementOp, RemoveElementOp, UpdateElementOp } from '@/commands/operations/WorldOperations';
import { Vector3 } from 'three';

describe('WorldOperations', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.initializeFixedElements();
  });

  describe('AddElementOp', () => {
    it('should add a point to World', () => {
      const pointId = world.generatePointId();
      const pointData = {
        id: pointId,
        type: 'free',
        position: { x: 100, y: 200, z: 1 },
        planeId: 'plane_H',
        label: 'A_H'
      };

      const operation = new AddElementOp('point', pointData);
      const result = operation.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs?.elementId).toBe(pointId);
      
      // Verify point exists in World
      const point = world.getPointById(pointId);
      expect(point).toBeDefined();
      expect(point?.id).toBe(pointId);
      expect(point?.type).toBe('free');
      expect((point as FreePoint2D).position.x).toBe(100);
      expect((point as FreePoint2D).position.y).toBe(200);
    });

    it('should add a line to World', () => {
      // Create two points first
      const point1Id = world.generatePointId();
      const point2Id = world.generatePointId();
      
      const point1 = new FreePoint2D(
        point1Id,
        new Vector3(100, 100, 1),
        'plane_H',
        'A_H'
      );
      const point2 = new FreePoint2D(
        point2Id,
        new Vector3(200, 200, 1),
        'plane_H',
        'B_H'
      );
      
      world.addPoint(point1);
      world.addPoint(point2);

      // Add line connecting points
      const lineId = world.generateLineId();
      const lineData = {
        id: lineId,
        type: 'by-two-points',
        point1Id,
        point2Id,
        planeId: 'plane_H',
        label: 'line_1'
      };

      const operation = new AddElementOp('line', lineData);
      const result = operation.apply(world);

      expect(result.success).toBe(true);
      expect(result.outputs?.elementId).toBe(lineId);
      
      // Verify line exists in World
      const line = world.getLineById(lineId);
      expect(line).toBeDefined();
      expect(line?.id).toBe(lineId);
      expect(line?.type).toBe('by-two-points');
      expect((line as Line2DByTwoPoints).point1Id).toBe(point1Id);
      expect((line as Line2DByTwoPoints).point2Id).toBe(point2Id);
    });

    it('should handle errors for invalid element data', () => {
      const invalidData = {
        id: 'invalid',
        type: 'unknown-type'  // Invalid type
      };

      const operation = new AddElementOp('point' as any, invalidData);
      const result = operation.apply(world);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('RemoveElementOp', () => {
    it('should remove a point from World', () => {
      // Add a point first
      const pointId = world.generatePointId();
      const point = new FreePoint2D(
        pointId,
        new Vector3(100, 200, 1),
        'plane_H',
        'A_H'
      );
      world.addPoint(point);

      // Verify point exists
      expect(world.getPointById(pointId)).toBeDefined();

      // Remove point
      const operation = new RemoveElementOp('point', pointId);
      const result = operation.apply(world);

      expect(result.success).toBe(true);
      
      // Verify point is removed
      expect(world.getPointById(pointId)).toBeUndefined();
      
      // Verify beforeState was stored for undo
      expect(operation.parameters.beforeState).toBeDefined();
      expect(operation.parameters.beforeState!.id).toBe(pointId);
    });

    it('should undo point removal (restore point)', () => {
      // Add and remove a point
      const pointId = world.generatePointId();
      const point = new FreePoint2D(
        pointId,
        new Vector3(100, 200, 1),
        'plane_H',
        'A_H'
      );
      world.addPoint(point);

      const operation = new RemoveElementOp('point', pointId);
      operation.apply(world);
      
      expect(world.getPointById(pointId)).toBeUndefined();

      // Undo removal
      const undoResult = operation.undo(world);

      expect(undoResult.success).toBe(true);
      
      // Verify point is restored
      const restoredPoint = world.getPointById(pointId);
      expect(restoredPoint).toBeDefined();
      expect(restoredPoint?.id).toBe(pointId);
      expect((restoredPoint as FreePoint2D).position.x).toBe(100);
      expect((restoredPoint as FreePoint2D).position.y).toBe(200);
    });

    it('should remove a line from World', () => {
      // Create two points and a line
      const point1Id = world.generatePointId();
      const point2Id = world.generatePointId();
      const lineId = world.generateLineId();
      
      const point1 = new FreePoint2D(point1Id, new Vector3(100, 100, 1), 'plane_H');
      const point2 = new FreePoint2D(point2Id, new Vector3(200, 200, 1), 'plane_H');
      const line = new Line2DByTwoPoints(lineId, point1Id, point2Id, 'plane_H');
      
      world.addPoint(point1);
      world.addPoint(point2);
      world.addLine(line);

      // Remove line
      const operation = new RemoveElementOp('line', lineId);
      const result = operation.apply(world);

      expect(result.success).toBe(true);
      expect(world.getLineById(lineId)).toBeUndefined();
    });

    it('should handle errors for non-existent elements', () => {
      const operation = new RemoveElementOp('point', 'non-existent-id');
      const result = operation.apply(world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('UpdateElementOp', () => {
    it('should update point properties', () => {
      // Add a point
      const pointId = world.generatePointId();
      const point = new FreePoint2D(
        pointId,
        new Vector3(100, 200, 1),
        'plane_H',
        'A_H'
      );
      world.addPoint(point);

      // Update point label
      const updates = { label: 'B_H' };
      const operation = new UpdateElementOp('point', pointId, updates);
      const result = operation.apply(world);

      expect(result.success).toBe(true);
      
      // Verify label was updated
      const updatedPoint = world.getPointById(pointId);
      expect(updatedPoint?.label).toBe('B_H');
      
      // Verify beforeState was stored
      expect(operation.parameters.beforeState).toBeDefined();
      expect(operation.parameters.beforeState!.label).toBe('A_H');
    });

    it('should undo property updates', () => {
      // Add a point
      const pointId = world.generatePointId();
      const point = new FreePoint2D(
        pointId,
        new Vector3(100, 200, 1),
        'plane_H',
        'Original_Label'
      );
      world.addPoint(point);

      // Update and undo
      const operation = new UpdateElementOp('point', pointId, { label: 'New_Label' });
      operation.apply(world);
      
      expect(world.getPointById(pointId)?.label).toBe('New_Label');

      operation.undo(world);
      
      // Verify original label restored
      expect(world.getPointById(pointId)?.label).toBe('Original_Label');
    });

    it('should update FreePoint position', () => {
      const pointId = world.generatePointId();
      const point = new FreePoint2D(
        pointId,
        new Vector3(100, 200, 1),
        'plane_H',
        'A_H'
      );
      world.addPoint(point);

      // Update position
      const newPosition = new Vector3(300, 400, 1);
      const updates = { position: newPosition };
      const operation = new UpdateElementOp('point', pointId, updates);
      const result = operation.apply(world);

      expect(result.success).toBe(true);
      
      const updatedPoint = world.getPointById(pointId) as FreePoint2D;
      expect(updatedPoint.position.x).toBe(300);
      expect(updatedPoint.position.y).toBe(400);
    });

    it('should handle errors for non-existent elements', () => {
      const operation = new UpdateElementOp('point', 'non-existent-id', { label: 'Test' });
      const result = operation.apply(world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Operation Outputs', () => {
    it('should set outputs correctly in AddElementOp', () => {
      const pointId = world.generatePointId();
      const pointData = {
        id: pointId,
        type: 'free',
        position: { x: 100, y: 200, z: 1 },
        planeId: 'plane_H'
      };

      const operation = new AddElementOp('point', pointData);
      operation.apply(world);

      expect(operation.outputs.elementId).toBe(pointId);
      expect(operation.outputs.elementType).toBe('point');
    });
  });
});
