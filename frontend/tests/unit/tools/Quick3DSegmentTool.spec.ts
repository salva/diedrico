/**
 * Unit Tests: Quick3DSegmentTool
 * 
 * Tests the geometrically constrained 3D segment creation tool:
 * - Creates line projections on P_H and P_V (4 free points + 2 lines)
 * - Creates 2 guides on P_H with sibling guides on P_V
 * - Creates 2 intersection points (sibling guide ∩ L_V) on P_V
 * - Creates segments on both planes and a 3D segment
 * - Construction is geometrically constrained via guide system
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
import { Point2DLineLineIntersection } from '@/domain/world/Point';

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
    it('should create 2 free points on P_H', () => {
      const context = createContext();
      const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H')!;

      const pointsBefore = P_H.getAllPoints().length;
      tool.activate(context);

      // 2 free points (segment/line endpoints on P_H)
      expect(P_H.getAllPoints().length).toBe(pointsBefore + 2);
    });

    it('should create 4 points on P_V (2 free + 2 intersection)', () => {
      const context = createContext();
      const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V')!;

      const pointsBefore = P_V.getAllPoints().length;
      tool.activate(context);

      // 2 free points (line definition) + 2 intersection points (guide ∩ L_V)
      expect(P_V.getAllPoints().length).toBe(pointsBefore + 4);
    });

    it('should create lines and guides on P_H (1 line + 2 guides + 1 segment)', () => {
      const context = createContext();
      const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H')!;

      const linesBefore = P_H.getAllLines().length;
      tool.activate(context);

      // L_H + guide1 + guide2 + segment = 4 new line-type elements
      expect(P_H.getAllLines().length).toBe(linesBefore + 4);
    });

    it('should create lines, sibling guides, and segment on P_V', () => {
      const context = createContext();
      const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V')!;

      const linesBefore = P_V.getAllLines().length;
      tool.activate(context);

      // L_V + siblingGuide1 + siblingGuide2 + segment = 4 new line-type elements
      expect(P_V.getAllLines().length).toBe(linesBefore + 4);
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

      expect(length).toBeGreaterThan(1);
    });
  });

  describe('Geometric constraints', () => {
    it('should use intersection points (not free points) for P_V segment endpoints', () => {
      const context = createContext();
      const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V')!;

      tool.activate(context);

      // P_V should have intersection points (Point2DLineLineIntersection)
      const allPoints = P_V.getAllPoints();
      const intersectionPoints = allPoints.filter(p => p instanceof Point2DLineLineIntersection);
      expect(intersectionPoints.length).toBeGreaterThanOrEqual(2);
    });

    it('should create guides on P_H', () => {
      const context = createContext();
      const P_H = world.getAllProjectionPlanes().find(p => p.name === 'P_H')!;

      tool.activate(context);

      const allLines = P_H.getAllLines();
      const guides = allLines.filter(l => l.type === 'guide');
      expect(guides.length).toBeGreaterThanOrEqual(2);
    });

    it('should create sibling guides on P_V', () => {
      const context = createContext();
      const P_V = world.getAllProjectionPlanes().find(p => p.name === 'P_V')!;

      tool.activate(context);

      const allLines = P_V.getAllLines();
      const siblingGuides = allLines.filter(l => l.type === 'sibling-guide');
      expect(siblingGuides.length).toBeGreaterThanOrEqual(2);
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
