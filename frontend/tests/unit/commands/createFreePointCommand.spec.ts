/**
 * Unit Tests: CreateFreePointCommand
 * 
 * Tests the command for creating free points using World factory methods:
 * - Command execution creates point via World.addFreePoint2D()
 * - Command undo removes point via World.removePoint2D()
 * - Validation and error handling
 * - ID generation and reuse for redo
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T074k
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
  });

  describe('Command Execution', () => {
    it('should create a free point in World using factory method', () => {
      const planePos = new Vector3(100, 200, 1);
      const planeId = 'proj_plane_H';
      
      const command = new CreateFreePointCommand(planePos, planeId, world);
      command.execute();
      command.commit();
      
      // Verify point was created via factory method
      const pointId = command.getPointId();
      expect(pointId).toBeDefined();
      expect(pointId).toMatch(/^point2d_\d+$/); // Factory method generates this format
      
      const point = world.getPoint2DById(pointId!);
      expect(point).toBeDefined();
      expect(point?.type).toBe('free');
      expect((point as FreePoint2D).position.x).toBe(100);
      expect((point as FreePoint2D).position.y).toBe(200);
      expect(point?.planeId).toBe('proj_plane_H');
    });

    it('should set correct point properties', () => {
      const planePos = new Vector3(300, 400, 1);
      const planeId = 'proj_plane_V';
      
      const command = new CreateFreePointCommand(planePos, planeId, world);
      command.execute();
      command.commit();
      
      const pointId = command.getPointId();
      const point = world.getPoint2DById(pointId!) as FreePoint2D;
      
      expect(point.id).toBe(pointId);
      expect(point.type).toBe('free');
      expect(point.position.x).toBe(300);
      expect(point.position.y).toBe(400);
      expect(point.position.z).toBe(1);
      expect(point.planeId).toBe('proj_plane_V');
    });

    it('should generate unique point ID via factory method', () => {
      const planePos = new Vector3(100, 100, 1);
      
      const command1 = new CreateFreePointCommand(planePos, 'proj_plane_H', world);
      command1.execute();
      command1.commit();
      
      const command2 = new CreateFreePointCommand(planePos, 'proj_plane_H', world);
      command2.execute();
      command2.commit();
      
      const id1 = command1.getPointId();
      const id2 = command2.getPointId();
      
      expect(id1).not.toBe(id2);
      expect(world.getPoint2DById(id1!)).toBeDefined();
      expect(world.getPoint2DById(id2!)).toBeDefined();
    });

    it('should return undefined pointId before execution', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      
      expect(command.getPointId()).toBeUndefined();
    });

    it('should have committed status after execution', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      command.execute();
      command.commit();
      
      expect(command.status).toBe(CommandStatus.Committed);
    });
  });

  describe('Command Undo', () => {
    it('should remove point from World when undone using removal factory method', () => {
      const planePos = new Vector3(100, 200, 1);
      const command = new CreateFreePointCommand(planePos, 'proj_plane_H', world);
      
      command.execute();
      command.commit();
      
      const pointId = command.getPointId()!;
      expect(world.getPoint2DById(pointId)).toBeDefined();
      
      // Undo - should use World.removePoint2D()
      command.undo();
      
      expect(world.getPoint2DById(pointId)).toBeUndefined();
      expect(command.status).toBe(CommandStatus.Undone);
    });

    it('should restore point when redone with same ID', () => {
      const planePos = new Vector3(100, 200, 1);
      const command = new CreateFreePointCommand(planePos, 'proj_plane_H', world);
      
      command.execute();
      command.commit();
      
      const pointId = command.getPointId()!;
      const originalPoint = world.getPoint2DById(pointId) as FreePoint2D;
      
      // Undo then redo
      command.undo();
      expect(world.getPoint2DById(pointId)).toBeUndefined();
      
      command.redo();
      
      // Redo should reuse the same ID (critical for consistency)
      const restoredPoint = world.getPoint2DById(pointId) as FreePoint2D;
      expect(restoredPoint).toBeDefined();
      expect(restoredPoint.id).toBe(originalPoint.id);
      expect(restoredPoint.position.x).toBe(originalPoint.position.x);
      expect(restoredPoint.position.y).toBe(originalPoint.position.y);
      expect(restoredPoint.planeId).toBe(originalPoint.planeId);
    });
  });

  describe('Command Description', () => {
    it('should have descriptive message', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      
      expect(command.description).toContain('free point');
      expect(command.description).toContain('proj_plane_H');
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
        const cmd = new CreateFreePointCommand(pos, 'proj_plane_H', world);
        cmd.execute();
        cmd.commit();
        return cmd;
      });
      
      // Verify all points exist
      commands.forEach(cmd => {
        const pointId = cmd.getPointId()!;
        expect(world.getPoint2DById(pointId)).toBeDefined();
      });
      
      // Verify World has 3 user points with correct ID format
      const allPoints = world.getAllPoints2D();
      const userPoints = allPoints.filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Different Planes', () => {
    it('should create points on proj_plane_H', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      command.execute();
      command.commit();
      
      const point = world.getPoint2DById(command.getPointId()!);
      expect(point?.planeId).toBe('proj_plane_H');
    });

    it('should create points on proj_plane_V', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_V', world);
      command.execute();
      command.commit();
      
      const point = world.getPoint2DById(command.getPointId()!);
      expect(point?.planeId).toBe('proj_plane_V');
    });
  });

  describe('Command Metadata', () => {
    it('should have unique ID', () => {
      const command1 = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      const command2 = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      
      expect(command1.id).not.toBe(command2.id);
    });

    it('should have timestamp', () => {
      const before = new Date();
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      const after = new Date();
      
      expect(command.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(command.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Factory Method Integration', () => {
    it('should validate plane via factory method', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'invalid_plane', world);
      
      // Factory method should throw error for invalid plane
      expect(() => {
        command.execute();
      }).toThrow(/plane/i);
    });

    it('should use AddFreePoint2DOp which wraps factory method', () => {
      const command = new CreateFreePointCommand(new Vector3(100, 200, 1), 'proj_plane_H', world);
      command.execute();
      
      // Verify the command has operations (from base Command class)
      expect(command['operations']).toBeDefined();
      expect(command['operations'].length).toBeGreaterThan(0);
      
      // First operation should be AddFreePoint2DOp
      const firstOp = command['operations'][0];
      expect(firstOp.type).toBe('AddFreePoint2D');
    });
  });
});
