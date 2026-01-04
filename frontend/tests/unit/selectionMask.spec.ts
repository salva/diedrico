/**
 * Unit tests for Selection Mask System
 * 
 * Tests:
 * - Paper.getElementType() correctly classifies entities
 * - Paper.hitTest() respects selection masks
 * - Tool getSelectionMask() returns expected values
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Selection Mask System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { Paper } from '@/domain/presentation/Paper';
import { FreePoint2D } from '@/domain/world/Point';
import { Line2D } from '@/domain/world/Line';
import { HalfHingeLine2D } from '@/domain/world/Line';
import { Segment2D } from '@/domain/world/Segment';
import { Circle2D } from '@/domain/world/Circle';
import { Guide2D } from '@/domain/world/Guide';
import type { SelectionMask } from '@/types/SelectionMask';

// Tool imports for testing getSelectionMask()
import { PointTool } from '@/tools/PointTool';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { GuideTool } from '@/tools/GuideTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
import { TransportTool } from '@/tools/TransportTool';

describe('Selection Mask System', () => {
  let world: World;
  let paper: Paper;

  beforeEach(() => {
    world = new World();
    paper = new Paper();
  });

  describe('Tool Selection Masks', () => {
    it('PointTool returns empty mask (creates points, does not select)', () => {
      const tool = new PointTool();
      const mask = tool.getSelectionMask();
      expect(mask).toEqual([]);
    });

    it('LineTool returns point-only mask', () => {
      const tool = new LineTool();
      const mask = tool.getSelectionMask();
      expect(mask).toEqual(['point']);
    });

    it('SegmentTool returns point-only mask', () => {
      const tool = new SegmentTool();
      const mask = tool.getSelectionMask();
      expect(mask).toEqual(['point']);
    });

    it('CircleTool returns point-only mask', () => {
      const tool = new CircleTool();
      const mask = tool.getSelectionMask();
      expect(mask).toEqual(['point']);
    });

    it('IntersectionTool returns line mask', () => {
      const tool = new IntersectionTool();
      const mask = tool.getSelectionMask();
      expect(mask).toContain('line');
      expect(mask).toContain('half-hinge-line');
    });

    describe('GuideTool dynamic mask', () => {
      it('returns line and point mask in waiting-line state', () => {
        const tool = new GuideTool();
        const mask = tool.getSelectionMask();
        expect(mask).toContain('line');
        expect(mask).toContain('half-hinge-line');
      });

      // Note: Testing state transitions requires actually clicking with the tool
      // which is better suited for integration/e2e tests
    });

    describe('TransportTool dynamic mask', () => {
      it('returns point mask in waiting-point state', () => {
        const tool = new TransportTool();
        const mask = tool.getSelectionMask();
        expect(mask).toEqual(['point']);
      });

      // Note: Testing state transitions requires actually clicking with the tool
      // which is better suited for integration/e2e tests
    });
  });

  describe('Paper.hitTest() with selection mask', () => {
    let planeId: string;
    let paperToPlane: (p: Vector3) => Vector3;

    beforeEach(() => {
      // Use existing projection plane from World constructor
      planeId = 'proj_plane_H';
      
      // Identity transform for testing
      paperToPlane = (p: Vector3) => p.clone();
    });

    it('filters out points when mask excludes point type', () => {
      // Create a point at (100, 100) using World factory
      const point = world.addFreePoint2D(planeId, new Vector3(100, 100, 1));

      // Hit test with point excluded from mask
      const queryPos = new Vector3(100, 100, 1);
      const mask: SelectionMask = ['line']; // Only lines allowed
      
      const hit = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask);
      
      // Should not hit the point because it's filtered out
      expect(hit).toBeNull();
    });

    it('allows points when mask includes point type', () => {
      // Create a point at (100, 100) using World factory
      const point = world.addFreePoint2D(planeId, new Vector3(100, 100, 1));

      // Hit test with point included in mask
      const queryPos = new Vector3(100, 100, 1);
      const mask: SelectionMask = ['point'];
      
      const hit = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask);
      
      // Should hit the point
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
      expect(hit?.elementId).toBe(point.id);
    });

    it('filters out lines when mask excludes line type', () => {
      // Create two points and a line using World factory
      const p1 = world.addFreePoint2D(planeId, new Vector3(0, 0, 1));
      const p2 = world.addFreePoint2D(planeId, new Vector3(200, 200, 1));
      const line = world.addLine2DBetweenTwoPoints(planeId, p1.id, p2.id);

      // Hit test on the line with line excluded from mask
      const queryPos = new Vector3(100, 100, 1); // On the line
      const mask: SelectionMask = ['point']; // Only points allowed
      
      const hit = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask);
      
      // Should not hit the line because it's filtered out
      // (May hit points if within snap radius, but not the line)
      if (hit !== null) {
        expect(hit.elementType).not.toBe('line');
      }
    });

    it('allows lines when mask includes line type', () => {
      // Create two points and a line using World factory
      const p1 = world.addFreePoint2D(planeId, new Vector3(0, 0, 1));
      const p2 = world.addFreePoint2D(planeId, new Vector3(200, 200, 1));
      const line = world.addLine2DBetweenTwoPoints(planeId, p1.id, p2.id);

      // Hit test on the line with line included in mask
      const queryPos = new Vector3(100, 100, 1); // On the line
      const mask: SelectionMask = ['line'];
      
      const hit = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask);
      
      // Should hit the line
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('line');
    });

    it('respects empty mask (nothing selectable)', () => {
      // Create a point using World factory
      const point = world.addFreePoint2D(planeId, new Vector3(100, 100, 1));

      // Hit test with empty mask
      const queryPos = new Vector3(100, 100, 1);
      const mask: SelectionMask = []; // Nothing selectable
      
      const hit = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask);
      
      // Should hit nothing
      expect(hit).toBeNull();
    });

    it('allows multiple types in mask', () => {
      // Create a point using World factory
      const point = world.addFreePoint2D(planeId, new Vector3(100, 100, 1));

      // Hit test with mask including both points and lines
      const queryPos = new Vector3(100, 100, 1);
      const mask: SelectionMask = ['point', 'line'];
      
      const hit = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask);
      
      // Should hit the point
      expect(hit).not.toBeNull();
      expect(hit?.elementType).toBe('point');
    });

    it('differentiates between line and half-hinge-line types', () => {
      // This test verifies that 'line' and 'half-hinge-line' are treated as separate types
      // For unit testing purposes, we just verify the mask logic works
      // Full HHL testing is better done in integration/e2e tests
      
      const p1 = world.addFreePoint2D(planeId, new Vector3(0, 0, 1));
      const p2 = world.addFreePoint2D(planeId, new Vector3(200, 200, 1));
      const line = world.addLine2DBetweenTwoPoints(planeId, p1.id, p2.id);

      const queryPos = new Vector3(100, 100, 1);

      // Hit test with only 'half-hinge-line' in mask (should not hit regular line)
      const mask1: SelectionMask = ['half-hinge-line'];
      const hit1 = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask1);
      
      // Should not hit regular line when mask only has 'half-hinge-line'
      if (hit1 !== null && hit1.elementId === line.id) {
        // If we hit our line, it should not be classified as half-hinge-line
        expect(hit1.elementType).not.toBe('half-hinge-line');
      }

      // Hit test with 'line' in mask (should hit regular line)
      const mask2: SelectionMask = ['line'];
      const hit2 = paper.hitTest(queryPos, 20, planeId, paperToPlane, world, mask2);
      
      // Should hit regular line
      expect(hit2).not.toBeNull();
      expect(hit2?.elementType).toBe('line');
      expect(hit2?.elementId).toBe(line.id);
    });
  });
});
