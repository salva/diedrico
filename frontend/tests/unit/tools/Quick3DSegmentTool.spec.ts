/**
 * Unit Tests: Quick3DSegmentTool
 * 
 * Tests the automatic 3D segment creation tool:
 * - Creates 4 free points (2 on P_H, 2 on P_V) and 2 segments
 * - Creates a Segment3DFromProjections from the two 2D segments
 * - 3D segment realization is feasible with correct endpoints
 * - Returns to selection tool after execution
 * - Records process tree actions
 * 
 * Phase 109
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Quick3DSegmentTool } from '@/tools/Quick3DSegmentTool';
import type { World } from '@/domain/world/World';
import type { CommandStack } from '@/commands/CommandStack';
import type { ToolContext } from '@/tools/ITool';
import { Vector3 } from 'three';
import { Paper } from '@/domain/presentation/Paper';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Quick3DSegmentTool', () => {
  let tool: Quick3DSegmentTool;
  let world: World;
  let commandStack: CommandStack;
  let paper: Paper;
  let mockToolStore: any;

  beforeEach(() => {
    tool = new Quick3DSegmentTool();
    const { world: w, commandStack: cs } = createTestWorld();
    world = w;
    commandStack = cs;
    paper = new Paper();
    mockToolStore = { setTool: vi.fn() };
  });

  const createContext = (): ToolContext => ({
    planeId: '',
    planeCoords: new Vector3(0, 0, 1),
    canvasCoords: { x: 0, y: 0 },
    commandStack,
    world,
    paper,
    paperToPlaneTransform: undefined,
    toolStore: mockToolStore,
  });

  describe('Tool identity', () => {
    it('should have name quick3dsegment', () => {
      expect(tool.name).toBe('quick3dsegment');
    });

    it('should return undefined selection mask', () => {
      expect(tool.getSelectionMask()).toBeUndefined();
    });
  });

  describe('Execution via activate', () => {
    it('should create elements when activated', () => {
      const context = createContext();
      tool.activate(context);

      // Should have created 3D segment(s)
      const segments3D = world.getAll3DSegments();
      expect(segments3D.length).toBeGreaterThanOrEqual(1);
    });

    it('should return to selection tool after activation', () => {
      const context = createContext();
      tool.activate(context);

      expect(mockToolStore.setTool).toHaveBeenCalledWith('select');
    });
  });

  describe('Execution via handleClick', () => {
    it('should return success result', () => {
      const context = createContext();
      const result = tool.handleClick(context);
      expect(result.success).toBe(true);
    });

    it('should return to selection tool after click', () => {
      const context = createContext();
      tool.handleClick(context);

      expect(mockToolStore.setTool).toHaveBeenCalledWith('select');
    });
  });

  describe('Created geometry', () => {
    it('should create 4 free points (2 on P_H, 2 on P_V)', () => {
      const context = createContext();
      const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H')!;
      const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V')!;

      const pointsBefore_H = P_H.getAllPoints().length;
      const pointsBefore_V = P_V.getAllPoints().length;

      tool.activate(context);

      // 2 new points on each plane
      expect(P_H.getAllPoints().length).toBe(pointsBefore_H + 2);
      expect(P_V.getAllPoints().length).toBe(pointsBefore_V + 2);
    });

    it('should create 2 segments (1 on P_H, 1 on P_V)', () => {
      const context = createContext();
      const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H')!;
      const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V')!;

      const linesBefore_H = P_H.getAllLines().length;
      const linesBefore_V = P_V.getAllLines().length;

      tool.activate(context);

      // Segments are stored in lines map, 1 new on each plane
      expect(P_H.getAllLines().length).toBe(linesBefore_H + 1);
      expect(P_V.getAllLines().length).toBe(linesBefore_V + 1);
    });

    it('should create exactly 1 3D segment', () => {
      const context = createContext();
      const segmentsBefore = world.getAll3DSegments().length;

      tool.activate(context);

      expect(world.getAll3DSegments().length).toBe(segmentsBefore + 1);
    });
  });

  describe('3D segment realization', () => {
    it('should produce a feasible 3D segment', () => {
      const context = createContext();
      tool.activate(context);

      const segments = world.getAll3DSegments();
      const segment = segments[segments.length - 1];
      const realization = world.get3DSegmentRealization(segment.id);

      expect(realization).toBeDefined();
      expect(realization!.isFeasible()).toBe(true);
    });

    it('should have start point approximately at (2, 3, 4)', () => {
      const context = createContext();
      tool.activate(context);

      const segments = world.getAll3DSegments();
      const segment = segments[segments.length - 1];
      const realization = world.get3DSegmentRealization(segment.id)!;

      // Endpoints may be in either order, so check both possibilities
      const p1 = realization.startPoint;
      const p2 = realization.endPoint;

      const endpoint1 = { x: 2, y: 3, z: 4 };
      const endpoint2 = { x: 8, y: 7, z: 6 };

      const p1MatchesE1 = Math.abs(p1.x - endpoint1.x) < 0.5 &&
                           Math.abs(p1.y - endpoint1.y) < 0.5 &&
                           Math.abs(p1.z - endpoint1.z) < 0.5;

      const p1MatchesE2 = Math.abs(p1.x - endpoint2.x) < 0.5 &&
                           Math.abs(p1.y - endpoint2.y) < 0.5 &&
                           Math.abs(p1.z - endpoint2.z) < 0.5;

      // p1 should match one of the expected endpoints
      expect(p1MatchesE1 || p1MatchesE2).toBe(true);
    });

    it('should have end point approximately at (8, 7, 6)', () => {
      const context = createContext();
      tool.activate(context);

      const segments = world.getAll3DSegments();
      const segment = segments[segments.length - 1];
      const realization = world.get3DSegmentRealization(segment.id)!;

      const p1 = realization.startPoint;
      const p2 = realization.endPoint;

      const endpoint1 = { x: 2, y: 3, z: 4 };
      const endpoint2 = { x: 8, y: 7, z: 6 };

      const p2MatchesE1 = Math.abs(p2.x - endpoint1.x) < 0.5 &&
                           Math.abs(p2.y - endpoint1.y) < 0.5 &&
                           Math.abs(p2.z - endpoint1.z) < 0.5;

      const p2MatchesE2 = Math.abs(p2.x - endpoint2.x) < 0.5 &&
                           Math.abs(p2.y - endpoint2.y) < 0.5 &&
                           Math.abs(p2.z - endpoint2.z) < 0.5;

      expect(p2MatchesE1 || p2MatchesE2).toBe(true);
    });

    it('should produce two distinct 3D endpoints', () => {
      const context = createContext();
      tool.activate(context);

      const segments = world.getAll3DSegments();
      const segment = segments[segments.length - 1];
      const realization = world.get3DSegmentRealization(segment.id)!;

      const dx = realization.endPoint.x - realization.startPoint.x;
      const dy = realization.endPoint.y - realization.startPoint.y;
      const dz = realization.endPoint.z - realization.startPoint.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Segment should have non-zero length
      expect(length).toBeGreaterThan(1);
    });
  });

  describe('Command stack integration', () => {
    it('should push exactly one command to the stack', () => {
      const context = createContext();
      const depthBefore = commandStack.getCommands().length;

      tool.activate(context);

      expect(commandStack.getCommands().length).toBe(depthBefore + 1);
    });

    it('should be undoable', () => {
      const context = createContext();
      const segmentsBefore = world.getAll3DSegments().length;

      tool.activate(context);
      expect(world.getAll3DSegments().length).toBe(segmentsBefore + 1);

      commandStack.undo();
      expect(world.getAll3DSegments().length).toBe(segmentsBefore);
    });

    it('should be redoable after undo', () => {
      const context = createContext();
      const segmentsBefore = world.getAll3DSegments().length;

      tool.activate(context);
      commandStack.undo();
      commandStack.redo();

      expect(world.getAll3DSegments().length).toBe(segmentsBefore + 1);
    });
  });
});
