/**
 * Unit Tests: PointTool
 * 
 * Tests the tool for creating free points:
 * - handleClick() builds generic Command with AddFreePoint2DOp
 * - Coordinate validation (Vector3 homogeneous)
 * - Plane existence validation in World
 * - Tool returns success/failure correctly
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - R019
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PointTool } from '@/tools/PointTool';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { OperationContext } from '@/commands/operations/OperationContext';
import type { ToolContext } from '@/tools/ITool';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { Vector3 } from 'three';
import { CanvasPresentationSelector } from '@/application/canvasPresentation/CanvasPresentationSelector';
import { createToolInteractionReadPort } from '@/application/tools/ToolInteractionReadPort';

function liveInteractionQuery(worldRef: () => any, visibilityModelRef: () => VisibilityModel, operationContextRef: () => OperationContext, planeIdRef: () => string): CanvasInteractionQuery {
  return {
    hitTest(canvasPos: any, snapRadiusPixels: number, context: any, selectionMask?: any) {
      const world = worldRef();
      const activePlaneId = context.activePlaneId ?? planeIdRef();
      const operationContext = operationContextRef();
      const model = new CanvasPresentationSelector().select(world, { zoom: 1, panX: 0, panY: 0, width: 800, height: 600 }, { activePlaneId, visibilityModel: visibilityModelRef(), processTree: operationContext.processTree, realizations: operationContext.realizations });
      return new CanvasInteractionQuery(model.queryItems).hitTest(canvasPos, snapRadiusPixels, context, selectionMask);
    }
  } as CanvasInteractionQuery;
}
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import { FreePoint2D } from '@/domain/world/Point';
import { createTestWorld, getHorizontalPlane, getVerticalPlane } from '../../helpers/worldHelpers';

describe('PointTool', () => {
  let tool: PointTool;
  let world: World;
  let visibilityModel: VisibilityModel;
  let commandStack: CommandStack;
  let operationContext: OperationContext;
  let horizontalPlaneId: string;
  let verticalPlaneId: string;
  let interactionQuery: CanvasInteractionQuery;

  // Helper to create complete ToolContext
  const createToolContext = (planeId: string, planeCoords: Vector3, canvasCoords = { x: 100, y: 100 }): ToolContext => ({
    planeId,
    planeCoords,
    canvasCoords,
    commandSink: new CanvasToolController({ operationContext, commands: new RuntimeCommandProducer(operationContext, commandStack) }),
    readPort: createToolInteractionReadPort(world, operationContext.realizations),
    interactionQuery,
      viewport: { zoom: 1, panX: 0, panY: 0 },
    paperToPlaneTransform: undefined, // Mock tool store
  });

  let initialUndoDepth: number;

  beforeEach(() => {
    tool = new PointTool();
    const { world: w, visibilityModel: vm, commandStack: cs, operationContext: oc } = createTestWorld();
    world = w;
    visibilityModel = vm;
    commandStack = cs;
    operationContext = oc;
    interactionQuery = liveInteractionQuery(() => world, () => visibilityModel, () => operationContext, () => horizontalPlaneId);
    // Get actual plane IDs from initialized world
    horizontalPlaneId = getHorizontalPlane(world).id!;
    verticalPlaneId = getVerticalPlane(world).id!;
    // Record initial undo count after initialization
    // Use a trick: undo until we can't, then count how many we did, then redo them all
    let undoCount = 0;
    while (commandStack.canUndo()) {
      commandStack.undo();
      undoCount++;
    }
    for (let i = 0; i < undoCount; i++) {
      commandStack.redo();
    }
    initialUndoDepth = undoCount;
  });

  describe('Tool Identity', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('point');
    });
  });

  describe('Click Handling', () => {
    it('should create free point on valid click', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('completed successfully');
      
      // Verify point was created in World
      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs format: proj_plane_3/point2d10
      // Filter out locked points (origin points) to count only user-created points
      const userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints.length).toBe(1);
      expect(userPoints[0].planeId).toBe(horizontalPlaneId);
    });

    it('should add command to command stack', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      tool.handleClick(context);

      expect(commandStack.canUndo()).toBe(true);
    });

    it('should create point with correct coordinates', () => {
      const planeCoords = new Vector3(150, 250, 1);
      const context = createToolContext(verticalPlaneId, planeCoords);

      tool.handleClick(context);

      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs
      const userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      const createdPoint = userPoints[0];
      
      expect(createdPoint).toBeInstanceOf(FreePoint2D);
      const position = (createdPoint as any).position;
      expect(position.x).toBe(150);
      expect(position.y).toBe(250);
      expect(position.z).toBe(1);
    });

    it('should create point on correct plane', () => {
      const context = createToolContext(
        verticalPlaneId,
        new Vector3(100, 200, 1)
      );

      tool.handleClick(context);

      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs
      const userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints[0].planeId).toBe(verticalPlaneId);
    });
  });

  describe('Plane position input', () => {
    it('accepts direct plane position input and creates a free point', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(0, 0, 1)
      );

      expect(tool.acceptsPlanePositionInput()).toBe(true);
      expect(tool.getPlanePositionInputLabel()).toBe('position');

      const result = tool.handlePlanePositionInput(context, new Vector3(-20, 105, 1));

      expect(result.success).toBe(true);
      const userPoints = getHorizontalPlane(world).getAllPoints().filter(p => !p.locked);
      expect(userPoints).toHaveLength(1);
      const position = (userPoints[0] as any).position;
      expect(position.x).toBe(-20);
      expect(position.y).toBe(105);
      expect(position.z).toBe(1);
    });
  });

  describe('Coordinate Validation', () => {
    it('should accept valid Vector3 homogeneous coordinates', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
    });

    it('should reject NaN coordinates', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(NaN, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });

    it('should reject Infinity coordinates', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(Infinity, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });
  });

  describe('Plane Validation', () => {
    it('should accept valid plane_H', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
    });

    it('should accept valid plane_V', () => {
      const context = createToolContext(
        verticalPlaneId,
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
    });

    it('should reject invalid plane ID', () => {
      const context = createToolContext(
        'invalid_plane',
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('target plane not found');
      expect(result.message).toContain('invalid_plane');
    });

    it('should not create point for invalid plane', () => {
      const context = createToolContext(
        'invalid_plane',
        new Vector3(100, 200, 1)
      );

      tool.handleClick(context);

      // No point should be created
      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs
      const userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return failure for invalid coordinates', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(NaN, NaN, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it('should handle command execution errors', () => {
      // Create a spy on commandStack.push to throw error
      const pushSpy = vi.spyOn(commandStack, 'push').mockImplementation(() => {
        throw new Error('Mock execution error');
      });

      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create free point');
      expect(result.message).toContain('Mock execution error');

      pushSpy.mockRestore();
    });

    it('should not pollute command stack on validation failure', () => {
      const context = createToolContext(
        'invalid_plane',
        new Vector3(100, 200, 1)
      );

      tool.handleClick(context);

      // Count current undo depth
      let currentDepth = 0;
      while (commandStack.canUndo()) {
        commandStack.undo();
        currentDepth++;
      }
      // Restore stack
      for (let i = 0; i < currentDepth; i++) {
        commandStack.redo();
      }
      
      // Command stack should remain at initial depth (no new commands added)
      expect(currentDepth).toBe(initialUndoDepth);
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
        const context = createToolContext(horizontalPlaneId, pos);
        const result = tool.handleClick(context);
        expect(result.success).toBe(true);
      });

      // Verify all points exist
      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs
      const userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints.length).toBe(3);
    });

    it('should maintain command stack for multiple operations', () => {
      for (let i = 0; i < 3; i++) {
        const context = createToolContext(
          horizontalPlaneId,
          new Vector3(100 * i, 100 * i, 1)
        );
        tool.handleClick(context);
      }

      // Should be able to undo all 3 operations (back to initial depth)
      expect(commandStack.canUndo()).toBe(true);
      commandStack.undo();
      commandStack.undo();
      commandStack.undo();
      
      // Count final depth
      let finalDepth = 0;
      while (commandStack.canUndo()) {
        commandStack.undo();
        finalDepth++;
      }
      // Restore stack
      for (let i = 0; i < finalDepth; i++) {
        commandStack.redo();
      }
      for (let i = 0; i < 3; i++) {
        commandStack.redo();
      }
      
      expect(finalDepth).toBe(initialUndoDepth);
    });
  });

  describe('Success/Failure Messages', () => {
    it('should return descriptive success message', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('completed successfully');
      // Message format changed in ArgumentCollectorTool migration
    });

    it('should return descriptive failure message for invalid coordinates', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(NaN, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });

    it('should return descriptive failure message for invalid plane', () => {
      const context = createToolContext(
        'nonexistent_plane',
        new Vector3(100, 200, 1)
      );

      const result = tool.handleClick(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('target plane not found');
      expect(result.message).toContain('nonexistent_plane');
    });
  });

  describe('Integration with Command Pattern', () => {
    it('should allow undo after point creation', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      tool.handleClick(context);

      // Point should exist
      let allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs
      let userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints.length).toBe(1);

      // Undo
      commandStack.undo();

      // Point should be removed
      allPoints = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints.length).toBe(0);
    });

    it('should allow redo after undo', () => {
      const context = createToolContext(
        horizontalPlaneId,
        new Vector3(100, 200, 1)
      );

      tool.handleClick(context);
      commandStack.undo();

      // Redo
      commandStack.redo();

      // Point should be restored
      const allPoints: any[] = [];
      for (const plane of world.getAllProjectionPlanes().values()) {
        allPoints.push(...plane.getAllPoints());
      }
      // Phase 63: Hierarchical IDs
      const userPoints = allPoints.filter(p => p.id?.includes('/point2d') && !p.locked);
      expect(userPoints.length).toBe(1);
    });
  });
});
