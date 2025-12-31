/**
 * Unit Tests: PointTool
 * 
 * Tests the tool for creating free points:
 * - handleClick() creates CreateFreePointCommand
 * - Coordinate validation (Vector3 homogeneous)
 * - Plane existence validation in World
 * - Tool returns success/failure correctly
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T075b
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PointTool } from '@/tools/PointTool';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import type { ToolContext } from '@/tools/ITool';
import { Vector3 } from 'three';

describe('PointTool', () => {
  let tool: PointTool;
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    tool = new PointTool();
    world = new World();
    world.initializeFixedElements();
    commandStack = new CommandStack();
  });

  describe('Tool Identity', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('point');
    });
  });

  describe('Click Handling', () => {
    it('should create free point on valid click', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Created point');
      
      // Verify point was created in World
      const allPoints = world.getAllPoints();
      const userPoints = allPoints.filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(1);
      expect(userPoints[0].planeId).toBe('plane_H');
    });

    it('should add command to command stack', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      tool.handleClick(context);

      expect(commandStack.canUndo()).toBe(true);
    });

    it('should create point with correct coordinates', () => {
      const planeCoords = new Vector3(150, 250, 1);
      const context: ToolContext = {
        planeId: 'plane_V',
        planeCoords,
        commandStack,
        world
      };

      tool.handleClick(context);

      const allPoints = world.getAllPoints();
      const userPoints = allPoints.filter(p => p.id?.startsWith('point_'));
      const createdPoint = userPoints[0];
      
      expect(createdPoint.type).toBe('free');
      const position = (createdPoint as any).position;
      expect(position.x).toBe(150);
      expect(position.y).toBe(250);
      expect(position.z).toBe(1);
    });

    it('should create point on correct plane', () => {
      const context: ToolContext = {
        planeId: 'plane_V',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      tool.handleClick(context);

      const allPoints = world.getAllPoints();
      const userPoints = allPoints.filter(p => p.id?.startsWith('point_'));
      expect(userPoints[0].planeId).toBe('plane_V');
    });
  });

  describe('Coordinate Validation', () => {
    it('should accept valid Vector3 homogeneous coordinates', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
    });

    it('should reject NaN coordinates', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(NaN, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });

    it('should reject Infinity coordinates', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(Infinity, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });
  });

  describe('Plane Validation', () => {
    it('should accept valid plane_H', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
    });

    it('should accept valid plane_V', () => {
      const context: ToolContext = {
        planeId: 'plane_V',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
    });

    it('should reject invalid plane ID', () => {
      const context: ToolContext = {
        planeId: 'invalid_plane',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Plane not found');
      expect(result.message).toContain('invalid_plane');
    });

    it('should not create point for invalid plane', () => {
      const context: ToolContext = {
        planeId: 'invalid_plane',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      tool.handleClick(context);

      // No point should be created
      const allPoints = world.getAllPoints();
      const userPoints = allPoints.filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return failure for invalid coordinates', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(NaN, NaN, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it('should handle command execution errors', () => {
      // Create a spy on commandStack.execute to throw error
      const executeSpy = vi.spyOn(commandStack, 'execute').mockImplementation(() => {
        throw new Error('Mock execution error');
      });

      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create point');
      expect(result.message).toContain('Mock execution error');

      executeSpy.mockRestore();
    });

    it('should not pollute command stack on validation failure', () => {
      const context: ToolContext = {
        planeId: 'invalid_plane',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      tool.handleClick(context);

      // Command stack should remain empty
      expect(commandStack.canUndo()).toBe(false);
    });
  });

  describe('Multiple Operations', () => {
    it('should create multiple points in sequence', () => {
      const positions = [
        new Vector3(100, 100, 1),
        new Vector3(200, 200, 1),
        new Vector3(300, 300, 1)
      ];

      positions.forEach(pos => {
        const context: ToolContext = {
          planeId: 'plane_H',
          planeCoords: pos,
          commandStack,
          world
        };
        const result = tool.handleClick(context);
        expect(result.success).toBe(true);
      });

      // Verify all points exist
      const allPoints = world.getAllPoints();
      const userPoints = allPoints.filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(3);
    });

    it('should maintain command stack for multiple operations', () => {
      for (let i = 0; i < 3; i++) {
        const context: ToolContext = {
          planeId: 'plane_H',
          planeCoords: new Vector3(100 * i, 100 * i, 1),
          commandStack,
          world
        };
        tool.handleClick(context);
      }

      // Should be able to undo all 3 operations
      expect(commandStack.canUndo()).toBe(true);
      commandStack.undo();
      commandStack.undo();
      commandStack.undo();
      expect(commandStack.canUndo()).toBe(false);
    });
  });

  describe('Success/Failure Messages', () => {
    it('should return descriptive success message', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Created point');
      expect(result.message).toMatch(/point_\d+/); // Should include point ID
    });

    it('should return descriptive failure message for invalid coordinates', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(NaN, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });

    it('should return descriptive failure message for invalid plane', () => {
      const context: ToolContext = {
        planeId: 'nonexistent_plane',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Plane not found');
      expect(result.message).toContain('nonexistent_plane');
    });
  });

  describe('Integration with Command Pattern', () => {
    it('should allow undo after point creation', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      tool.handleClick(context);

      // Point should exist
      let userPoints = world.getAllPoints().filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(1);

      // Undo
      commandStack.undo();

      // Point should be removed
      userPoints = world.getAllPoints().filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(0);
    });

    it('should allow redo after undo', () => {
      const context: ToolContext = {
        planeId: 'plane_H',
        planeCoords: new Vector3(100, 200, 1),
        commandStack,
        world
      };

      tool.handleClick(context);
      commandStack.undo();

      // Redo
      commandStack.redo();

      // Point should be restored
      const userPoints = world.getAllPoints().filter(p => p.id?.startsWith('point_'));
      expect(userPoints.length).toBe(1);
    });
  });
});
