/**
 * Unit Tests: CircleTool
 * 
 * Tests the tool for creating circles by center and circumference points:
 * - Two-click workflow (center → circumference → circle)
 * - Point snapping behavior for both clicks
 * - No duplicate points created when snapping
 * - Minimum radius validation
 * - Success/failure messages
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - Phase 56 (T983-T985)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircleTool } from '@/tools/CircleTool';
import { World } from '@/domain/world/World';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import type { ToolContext } from '@/tools/ITool';
import { Vector3, Matrix3 } from 'three';
import { Paper } from '@/domain/presentation/Paper';

describe('CircleTool', () => {
  let tool: CircleTool;
  let world: World;
  let commandStack: CommandStack;
  let horizontalPlaneId: string;
  let paper: Paper;

  beforeEach(() => {
    tool = new CircleTool();
    world = new World();
    commandStack = new CommandStack();
    paper = new Paper();
    
    // Get actual plane ID from initialized world
    horizontalPlaneId = world.getProjectionPlaneByLabel('P_H').id!;
  });

  describe('Tool Identity', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('circle');
    });
  });

  describe('Two-Click Workflow', () => {
    it('should require two clicks to create circle', () => {
      // Create center point
      const centerCmd = new Command('Create center point', world);
      const centerOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 100, 1));
      centerCmd.addAndExecute(centerOp);
      centerCmd.commit();
      commandStack.push(centerCmd);
      const centerPointId = centerOp.outputs.pointId as string;

      // First click - select center
      const firstClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const firstResult = tool.handleClick(firstClickContext);
      expect(firstResult.success).toBe(true);
      expect(firstResult.message).toContain('Selected center point');

      // Second click - create circumference point and circle
      const secondClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(200, 100, 1),
        canvasCoords: new Vector3(250, 150, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const secondResult = tool.handleClick(secondClickContext);
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('Created circle');

      // Verify circle was created
      const plane = world.getProjectionPlaneById(horizontalPlaneId);
      const circles = plane?.getAllCircles() || [];
      const userCircles = circles.filter((c: any) => c.id?.startsWith(horizontalPlaneId));
      expect(userCircles.length).toBe(1);
    });
  });

  describe('T983: Both Points Snap (No Duplicates)', () => {
    it('should snap to existing points for both center and circumference', () => {
      // Create two existing points
      const setupCmd = new Command('Setup test points', world);
      
      const centerOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 100, 1));
      setupCmd.addAndExecute(centerOp);
      const centerPointId = centerOp.outputs.pointId as string;
      
      const circumferenceOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(200, 100, 1));
      setupCmd.addAndExecute(circumferenceOp);
      const circumferencePointId = circumferenceOp.outputs.pointId as string;
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Count initial points
      const plane = world.getProjectionPlaneById(horizontalPlaneId);
      const initialPointCount = plane?.getAllPoints().length || 0;

      // First click - snap to center point (within 50px snap radius in canvas space)
      const firstClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const firstResult = tool.handleClick(firstClickContext);
      expect(firstResult.success).toBe(true);
      expect(firstResult.message).toContain('Selected center point');

      // Second click - snap to circumference point
      const secondClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(200, 100, 1),
        canvasCoords: new Vector3(200, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const secondResult = tool.handleClick(secondClickContext);
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('Created circle');
      expect(secondResult.message).toContain('snapped'); // Should indicate snap

      // Verify NO new points were created (both snapped to existing)
      const finalPointCount = plane?.getAllPoints().length || 0;
      expect(finalPointCount).toBe(initialPointCount);

      // Verify circle was created with existing points
      const circle = plane?.getAllCircles().find((c: any) => c.id?.startsWith(horizontalPlaneId));
      expect(circle).toBeDefined();
      expect(circle?.centerPointId).toBe(centerPointId);
      expect(circle?.circumferencePointId).toBe(circumferencePointId);
    });
  });

  describe('T984: Mixed Behavior (Center Snaps, Circumference Creates)', () => {
    it('should snap center to existing point and create new circumference point', () => {
      // Create only center point
      const setupCmd = new Command('Setup center point', world);
      const centerOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 100, 1));
      setupCmd.addAndExecute(centerOp);
      const centerPointId = centerOp.outputs.pointId as string;
      setupCmd.commit();
      commandStack.push(setupCmd);

      // Count initial points
      const plane = world.getProjectionPlaneById(horizontalPlaneId);
      const initialPointCount = plane?.getAllPoints().length || 0;

      // First click - snap to existing center point
      const firstClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const firstResult = tool.handleClick(firstClickContext);
      expect(firstResult.success).toBe(true);

      // Second click - create new circumference point (far from existing points)
      const secondClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(300, 300, 1),
        canvasCoords: new Vector3(400, 400, 1), // Far from any existing point
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const secondResult = tool.handleClick(secondClickContext);
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('Created circle');
      expect(secondResult.message).toContain('created'); // Should indicate new point created

      // Verify ONE new point was created (circumference)
      const finalPointCount = plane?.getAllPoints().length || 0;
      expect(finalPointCount).toBe(initialPointCount + 1);

      // Verify circle uses snapped center and new circumference point
      const circle = plane?.getAllCircles().find((c: any) => c.id?.startsWith(horizontalPlaneId));
      expect(circle).toBeDefined();
      expect(circle?.centerPointId).toBe(centerPointId);
      expect(circle?.circumferencePointId).not.toBe(centerPointId); // Different point

      // Verify radius calculation is correct
      const center = plane?.getPoint(centerPointId);
      const circumference = plane?.getPoint(circle!.circumferencePointId);
      expect(center).toBeDefined();
      expect(circumference).toBeDefined();
      
      const centerRealization = center?.realize2D(world);
      const circumferenceRealization = circumference?.realize2D(world);
      const expectedRadius = Math.sqrt(
        Math.pow(circumferenceRealization!.position.x - centerRealization!.position.x, 2) +
        Math.pow(circumferenceRealization!.position.y - centerRealization!.position.y, 2)
      );
      expect(expectedRadius).toBeCloseTo(Math.sqrt(200*200 + 200*200), 1); // ~282.84
    });
  });

  describe('T985: Minimum Radius Validation with Snapped Points', () => {
    it('should reject circle when snapped points are too close (minimum radius)', () => {
      // Create two points very close together (less than 0.001 units apart)
      const setupCmd = new Command('Setup close points', world);
      
      const centerOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 100, 1));
      setupCmd.addAndExecute(centerOp);
      
      const closeOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100.0005, 100, 1)); // 0.0005 units away
      setupCmd.addAndExecute(closeOp);
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // First click - snap to center point
      const firstClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const firstResult = tool.handleClick(firstClickContext);
      expect(firstResult.success).toBe(true);

      // Second click - snap to close point (should fail minimum radius check)
      const secondClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100.0005, 100, 1),
        canvasCoords: new Vector3(100.0005, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const secondResult = tool.handleClick(secondClickContext);
      expect(secondResult.success).toBe(false);
      expect(secondResult.message).toContain('Radius too small'); // Minimum radius validation

      // Verify no circle was created
      const plane = world.getProjectionPlaneById(horizontalPlaneId);
      const circles = plane?.getAllCircles().filter((c: any) => c.id?.startsWith(horizontalPlaneId)) || [];
      expect(circles.length).toBe(0);
    });

    it('should accept circle when snapped points meet minimum radius', () => {
      // Create two points with acceptable distance (> 0.001 units)
      const setupCmd = new Command('Setup acceptable points', world);
      
      const centerOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 100, 1));
      setupCmd.addAndExecute(centerOp);
      
      const validOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100.002, 100, 1)); // 0.002 units away
      setupCmd.addAndExecute(validOp);
      
      setupCmd.commit();
      commandStack.push(setupCmd);

      // First click - snap to center
      const firstClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const firstResult = tool.handleClick(firstClickContext);
      expect(firstResult.success).toBe(true);

      // Second click - snap to valid point
      const secondClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100.002, 100, 1),
        canvasCoords: new Vector3(100.002, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const secondResult = tool.handleClick(secondClickContext);
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('Created circle');

      // Verify circle was created
      const plane = world.getProjectionPlaneById(horizontalPlaneId);
      const circles = plane?.getAllCircles().filter((c: any) => c.id?.startsWith(horizontalPlaneId)) || [];
      expect(circles.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid plane', () => {
      const context: ToolContext = {
        planeId: 'invalid_plane',
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const result = tool.handleClick(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Plane');
    });

    it('should reject invalid coordinates', () => {
      const context: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 0), // Invalid homogeneous coordinate (w = 0)
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };

      const result = tool.handleClick(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('coordinate');
    });
  });

  describe('Tool State Reset', () => {
    it('should reset state after successful circle creation', () => {
      // Create center point
      const setupCmd = new Command('Setup center', world);
      const centerOp = new AddFreePoint2DOp(horizontalPlaneId, new Vector3(100, 100, 1));
      setupCmd.addAndExecute(centerOp);
      setupCmd.commit();
      commandStack.push(setupCmd);

      // First click
      const firstClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };
      tool.handleClick(firstClickContext);

      // Second click
      const secondClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(200, 100, 1),
        canvasCoords: new Vector3(200, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };
      const result = tool.handleClick(secondClickContext);
      expect(result.success).toBe(true);

      // Third click should start new circle (state reset)
      const thirdClickContext: ToolContext = {
        planeId: horizontalPlaneId,
        planeCoords: new Vector3(100, 100, 1),
        canvasCoords: new Vector3(100, 100, 1),
        commandStack,
        world,
        paper,
        paperToPlaneTransform: new Matrix3().identity()
      };
      const thirdResult = tool.handleClick(thirdClickContext);
      expect(thirdResult.success).toBe(true);
      expect(thirdResult.message).toContain('Selected center point'); // Back to first state
    });
  });
});
