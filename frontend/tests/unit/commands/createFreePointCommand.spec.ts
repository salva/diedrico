/**
 * Unit Tests: CreateFreePointCommand
 * 
 * Tests the command for creating free points:
 * - Command execution creates point in World
 * - Command undo removes point from World
 * - Validation and error handling
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T075a
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import { World } from '@/domain/world/World';
import { FreePoint2D } from '@/domain/world/Point';
import { CommandStatus } from '@/commands/Command';
import { Vector3 } from 'three';

describe('CreateFreePointCommand', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.initializeFixedElements();
  });

  describe('Command Execution', () => {
    it('should create a free point in World', () => {
      const planePos = new Vector3(100, 200, 1);
      const planeId = 'plane_H';
      
      const command = new CreateFreePointCommand(planePos, planeId, world);
      command.execute();
      command.commit();
      
      // Verify point was created
      const pointId = command.getPointId();
      expect(pointId).toBeDefined();
      
      const point = world.getPointById(pointId!);
      expect(point).toBeDefined();
      expect(point?.type).toBe('free');
      expect((point as FreePoint2D).position.x).toBe(100);
      expect((point as FreePoint2D).position.y).toBe(200);
      expect(point?.planeId).toBe('plane_H');
    });

    it('should set correct point properties', () => {
      const planePos = new Vector3(300, 400, 1);
      const planeId = 'plane_V';
      
      const command = new CreateFreePointCommand(planePos, planeId, world);
      command.execute();
      command.commit();
      
      const pointId = command.getPointId();
      const point = world.getPointById(pointId!) as FreePoint2D;
      
      expect(point.id).toBe(pointId);
      expect(point.type).toBe('free');
      expect(point.position.x).toBe(300);
      expect(point.position.y).toBe(400);
      expect(point.position.z).toBe(1);
      expect(point.planeId).toBe('plane_V');
    });

    it('should generate unique point ID', () => {
      const planePos = new Vector3(100, 100, 1);
      
      const command1 = new CreateFreePointCommand(planePos, 'plane_H', world);
      command1.execute();
      command1.commit();
      
      const command2 = new CreateFreePointCommand(planePos, 'plane_H', world);
      command2.execute();
      command2.commit();
      
      const id1 = command1.getPointId();
      const id2 = command2.getPointId();
      
      expect(id1).not.toBe(id2);
      expect(world.getPointById(id1!)).toBeDefined();
      expect(world.getPointById(id2!)).toBeDefined();
    });

    it('should return undefined pointId before execution', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      
      expect(command.getPointId()).toBeUndefined();
    });

    it('should have committed status after execution', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      command.execute();
      command.commit();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });
  });

  describe('Command Undo', () => {
    it('should remove point from World when undone', () => {
      const planePos = new Vector3(100, 200, 1);
      const command = new CreateFreePointCommand(planePos, 'plane_H', world);
      
      command.execute();
      command.commit();
      
      const pointId = command.getPointId()!;
      expect(world.getPointById(pointId)).toBeDefined();
      
      // Undo
      command.undo();
      
      expect(world.getPointById(pointId)).toBeUndefined();
      expect(command.status).toBe(CommandStatus.Undone);
    });

    it('should restore point when redone', () => {
      const planePos = new Vector3(100, 200, 1);
      const command = new CreateFreePointCommand(planePos, 'plane_H', world);
      
      command.execute();
      command.commit();
      
      const pointId = command.getPointId()!;
      const originalPoint = world.getPointById(pointId) as FreePoint2D;
      
      // Undo then redo
      command.undo();
      expect(world.getPointById(pointId)).toBeUndefined();
      
      command.redo();
      
      const restoredPoint = world.getPointById(pointId) as FreePoint2D;
      expect(restoredPoint).toBeDefined();
      expect(restoredPoint.id).toBe(originalPoint.id);
      expect(restoredPoint.position.x).toBe(originalPoint.position.x);
      expect(restoredPoint.position.y).toBe(originalPoint.position.y);
      expect(restoredPoint.planeId).toBe(originalPoint.planeId);
    });
  });

  describe('Command Description', () => {
    it('should have descriptive message', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      
      expect(command.description).toContain('free point');
      expect(command.description).toContain('plane_H');
    });
  });

  describe('Multiple Points', () => {
    it('should create multiple points correctly', () => {
      const positions = [
        new Vector3(100, 100, 1),
        new Vector3(200, 200, 1),
        new Vector3(300, 300, 1)
      ];
      
      const commands = positions.map(pos => {
        const cmd = new CreateFreePointCommand(pos, 'plane_H', world);
        cmd.execute();
        cmd.commit();
        return cmd;
      });
      
      // Verify all points exist
      commands.forEach(cmd => {
        const pointId = cmd.getPointId()!;
        expect(world.getPointById(pointId)).toBeDefined();
      });
      
      // Verify World has 3 user points (plus fixed elements)
      const allPoints = world.getAllPoints();
      const userPoints = allPoints.filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(3);
    });
  });

  describe('Different Planes', () => {
    it('should create points on plane_H', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      command.execute();
      command.commit();
      
      const point = world.getPointById(command.getPointId()!);
      expect(point?.planeId).toBe('plane_H');
    });

    it('should create points on plane_V', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_V', world);
      command.execute();
      command.commit();
      
      const point = world.getPointById(command.getPointId()!);
      expect(point?.planeId).toBe('plane_V');
    });
  });

  describe('Command Metadata', () => {
    it('should have unique ID', () => {
      const command1 = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      const command2 = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      
      expect(command1.id).not.toBe(command2.id);
    });

    it('should have timestamp', () => {
      const before = new Date();
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      const after = new Date();
      
      expect(command.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(command.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', () => {
      // Create a command with invalid plane (if validation exists)
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'invalid_plane', world);
      
      // Note: Current implementation doesn't validate plane existence
      // This test documents expected behavior for future validation
      expect(() => {
        command.execute();
      }).not.toThrow(); // Currently doesn't throw, but may in future
    });
  });

  describe('Command Composition', () => {
    it('should use AddElementOp internally', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'plane_H', world);
      command.execute();
      
      // Verify the command has operations (from base Command class)
      expect(command['operations']).toBeDefined();
      expect(command['operations'].length).toBeGreaterThan(0);
      
      // First operation should be AddElementOp
      const firstOp = command['operations'][0];
      expect(firstOp.type).toBe('AddElement');
    });
  });
});
