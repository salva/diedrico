/**
 * Integration Test: Point Creation Full Stack
 * 
 * Verifies the complete flow:
 * SvgCanvas click → PointTool → CreateFreePointCommand → AddElementOp → World
 * 
 * Tests:
 * - Full stack integration: tool delegation, command execution, world modification
 * - Undo removes point, redo restores it
 * - World reactivity (worldVersion counter) triggers correctly
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T076a
 * 
 * SKIPPED (Phase 45): Tests use hardcoded plane IDs ('projPlaneH', 'projPlaneV')
 * which will change to generated IDs in Phase 46/47.
 * Tests also expect flat IDs (point2d_1) instead of hierarchical IDs (proj_plane_H/point2d_1).
 * Will be reactivated and updated in Phase 47 Task T558.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PointTool } from '@/tools/PointTool';
import type { World } from '@/domain/world/World';
import { createTestWorld } from '../helpers/worldHelpers';
import { CommandStack } from '@/commands/CommandStack';
import type { ToolContext } from '@/tools/ITool';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { Vector3 } from 'three';

describe.skip('Integration: Point Creation Full Stack', () => {
  let tool: PointTool;
  let world: World;
  let commandStack: CommandStack;

  beforeEach(() => {
    tool = new PointTool();
    const testWorld = createTestWorld();
    world = testWorld.world;
    commandStack = testWorld.commandStack;
  });

  describe('Full Stack Flow', () => {
    it('should complete full flow: Tool → Command → Operation → World', () => {
      // Simulate SvgCanvas click providing context
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // 1. Tool receives click
      const result = tool.handleClick(context);

      // 2. Tool creates and executes command
      expect(result.success).toBe(true);
      expect(result.message).toContain('Created point');

      // 3. Command composes AddElementOp
      expect(commandStack.canUndo()).toBe(true);

      // 4. Operation modifies World
      const allPoints = world.getAllPoints2D();
      const userPoints = allPoints.filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(1);
      expect(userPoints[0].planeId).toBe('projPlaneH');

      // Verify point data matches input
      const createdPoint = userPoints[0];
      expect(createdPoint.type).toBe('free');
      const position = (createdPoint as any).position;
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });

    it('should flow through all architectural layers', () => {
      const context: ToolContext = {
        planeId: 'projPlaneV',
        planeCoords: new Vector3(300, 400, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Layer 1: Tool (interaction layer)
      const toolResult = tool.handleClick(context);
      expect(toolResult.success).toBe(true);

      // Layer 2: Command (composition layer)
      // Command should be on the stack
      expect(commandStack.canUndo()).toBe(true);

      // Layer 3: Operation (atomic action layer)
      // Operation executed as part of command

      // Layer 4: World (domain model layer)
      const userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(1);
      expect(userPoints[0].planeId).toBe('projPlaneV');
    });

    it('should maintain referential integrity through stack', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Execute tool
      const result = tool.handleClick(context);
      
      // Extract point ID from result message
      const match = result.message?.match(/point2d_\d+/);
      expect(match).toBeTruthy();
      const pointId = match![0];

      // Verify same point exists in World
      const worldPoint = world.getPoint2DById(pointId);
      expect(worldPoint).toBeDefined();
      expect(worldPoint?.id).toBe(pointId);
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should undo point creation (remove from World)', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Create point
      tool.handleClick(context);
      
      let userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(1);

      // Undo via CommandStack
      commandStack.undo();

      // Point should be removed from World
      userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(0);
    });

    it('should redo point creation (restore to World)', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Create point
      const result = tool.handleClick(context);
      const match = result.message?.match(/point2d_\d+/);
      const pointId = match![0];

      // Undo
      commandStack.undo();
      expect(world.getPoint2DById(pointId)).toBeUndefined();

      // Redo via CommandStack
      commandStack.redo();

      // Point should be restored to World
      const restoredPoint = world.getPoint2DById(pointId);
      expect(restoredPoint).toBeDefined();
      expect(restoredPoint?.id).toBe(pointId);
      expect(restoredPoint?.type).toBe('free');
    });

    it('should handle multiple undo/redo cycles', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Create point
      tool.handleClick(context);

      // Multiple undo/redo cycles
      for (let i = 0; i < 3; i++) {
        commandStack.undo();
        let userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
        expect(userPoints.length).toBe(0);

        commandStack.redo();
        userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
        expect(userPoints.length).toBe(1);
      }
    });

    it('should undo/redo multiple points in LIFO order', () => {
      const positions = [
        new Vector3(100, 100, 1),
        new Vector3(200, 200, 1),
        new Vector3(300, 300, 1)
      ];

      // Create 3 points
      const pointIds: string[] = [];
      positions.forEach(pos => {
        const context: ToolContext = {
          planeId: 'projPlaneH',
          planeCoords: pos,
          commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
          world
        };
        const result = tool.handleClick(context);
        const match = result.message?.match(/point2d_\d+/);
        pointIds.push(match![0]);
      });

      expect(world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/)).length).toBe(3);

      // Undo in LIFO order (last created removed first)
      commandStack.undo();
      expect(world.getPoint2DById(pointIds[2])).toBeUndefined(); // Last created removed
      expect(world.getPoint2DById(pointIds[1])).toBeDefined();
      expect(world.getPoint2DById(pointIds[0])).toBeDefined();

      commandStack.undo();
      expect(world.getPoint2DById(pointIds[1])).toBeUndefined();
      expect(world.getPoint2DById(pointIds[0])).toBeDefined();

      commandStack.undo();
      expect(world.getPoint2DById(pointIds[0])).toBeUndefined();

      // Redo restores in reverse LIFO (FIFO)
      commandStack.redo();
      expect(world.getPoint2DById(pointIds[0])).toBeDefined();
      expect(world.getPoint2DById(pointIds[1])).toBeUndefined();

      commandStack.redo();
      expect(world.getPoint2DById(pointIds[1])).toBeDefined();
      expect(world.getPoint2DById(pointIds[2])).toBeUndefined();

      commandStack.redo();
      expect(world.getPoint2DById(pointIds[2])).toBeDefined();
    });
  });

  describe('World State Management', () => {
    it('should maintain consistent World state after operations', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Create point
      tool.handleClick(context);
      
      const pointsAfterCreate = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(pointsAfterCreate.length).toBe(1);

      // Undo
      commandStack.undo();
      
      const pointsAfterUndo = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(pointsAfterUndo.length).toBe(0);

      // Redo
      commandStack.redo();
      
      const pointsAfterRedo = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(pointsAfterRedo.length).toBe(1);
    });

    it('should handle multiple state changes correctly', () => {
      // Create 3 points
      for (let i = 0; i < 3; i++) {
        const context: ToolContext = {
          planeId: 'projPlaneH',
          planeCoords: new Vector3(100 * i, 100 * i, 1),
          commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
          world
        };
        tool.handleClick(context);
      }

      let userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(3);

      // Undo all
      commandStack.undo();
      commandStack.undo();
      commandStack.undo();

      userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(0);

      // Redo all
      commandStack.redo();
      commandStack.redo();
      commandStack.redo();

      userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(3);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate validation errors through stack', () => {
      // Invalid plane
      const context: ToolContext = {
        planeId: 'invalid_plane',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      const result = tool.handleClick(context);

      // Tool catches validation error
      expect(result.success).toBe(false);
      expect(result.message).toContain('Plane not found');

      // World remains unchanged
      const userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(0);

      // Command stack remains empty
      expect(commandStack.canUndo()).toBe(false);
    });

    it('should handle coordinate validation errors', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(NaN, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');

      // No side effects
      const userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(0);
      expect(commandStack.canUndo()).toBe(false);
    });
  });

  describe('Architecture Compliance', () => {
    it('should follow Command Pattern principles', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Tool creates Command (not directly modifying World)
      tool.handleClick(context);

      // Command is encapsulated in CommandStack
      expect(commandStack.canUndo()).toBe(true);

      // Command can be undone/redone (reversible operations)
      commandStack.undo();
      expect(world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/)).length).toBe(0);
      
      commandStack.redo();
      expect(world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/)).length).toBe(1);
    });

    it('should maintain layer separation', () => {
      const context: ToolContext = {
        planeId: 'projPlaneH',
        planeCoords: new Vector3(100, 200, 1),
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Tool layer: handles user interaction
      const result = tool.handleClick(context);
      expect(result.success).toBe(true);

      // Command layer: encapsulates business logic
      // (CommandStack holds command instances)

      // Domain layer: stores data
      const userPoints = world.getAllPoints2D().filter(p => p.id?.match(/^point2d_\d+$/));
      expect(userPoints.length).toBe(1);

      // Each layer communicates only with adjacent layers
      // Tool → Command → Operation → World
      // Tool does NOT directly access World (goes through Command)
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent point data through full cycle', () => {
      const originalCoords = new Vector3(123, 456, 1);
      const originalPlane = 'projPlaneV';
      
      const context: ToolContext = {
        planeId: originalPlane,
        planeCoords: originalCoords,
        commandSink: new CanvasToolController({ world, commands: new RuntimeCommandProducer(world, commandStack), toolStore: {} as any }),
        world
      };

      // Create
      const result = tool.handleClick(context);
      const match = result.message?.match(/point2d_\d+/);
      const pointId = match![0];

      const createdPoint = world.getPoint2DById(pointId) as any;
      expect(createdPoint.position.x).toBe(123);
      expect(createdPoint.position.y).toBe(456);
      expect(createdPoint.planeId).toBe('projPlaneV');

      // Undo and redo
      commandStack.undo();
      commandStack.redo();

      const restoredPoint = world.getPoint2DById(pointId) as any;
      expect(restoredPoint.position.x).toBe(123);
      expect(restoredPoint.position.y).toBe(456);
      expect(restoredPoint.planeId).toBe('projPlaneV');
    });
  });
});
