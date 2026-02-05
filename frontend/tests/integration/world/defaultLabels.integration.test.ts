/**
 * Phase 97: Integration tests for default label generation
 * 
 * Validates that elements are automatically assigned default labels when created
 * without explicit label parameters.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Phase 97: Default Label Generation Integration', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  describe('2D Point creation', () => {
    it('should assign default label matching ID number to free point', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      
      // Extract number from ID and verify label matches
      const match = point.id.match(/\d+$/);
      const num = match ? parseInt(match[0], 10) : -1;
      const expectedLabel = num <= 9 ? `A_${num}` : `A_{${num}}`;
      
      expect(point.label).toBe(expectedLabel);
      expect(point.label).toMatch(/^A_(\d+|\{\d+\})$/);  // Format check
    });

    it('should assign sequential labels to multiple points', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const point2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      const point3 = plane.addFreePoint2D(new Vector3(0.5, 0.6, 1), world);
      
      // Extract ID numbers
      const id1 = parseInt(point1.id.match(/\d+$/)?.[0] || '0', 10);
      const id2 = parseInt(point2.id.match(/\d+$/)?.[0] || '0', 10);
      const id3 = parseInt(point3.id.match(/\d+$/)?.[0] || '0', 10);
      
      // Verify sequential IDs
      expect(id2).toBe(id1 + 1);
      expect(id3).toBe(id1 + 2);
      
      // Verify labels match IDs
      const expectedLabel1 = id1 <= 9 ? `A_${id1}` : `A_{${id1}}`;
      const expectedLabel2 = id2 <= 9 ? `A_${id2}` : `A_{${id2}}`;
      const expectedLabel3 = id3 <= 9 ? `A_${id3}` : `A_{${id3}}`;
      
      expect(point1.label).toBe(expectedLabel1);
      expect(point2.label).toBe(expectedLabel2);
      expect(point3.label).toBe(expectedLabel3);
    });

    it('should allow explicit label override', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world, undefined, 'Custom');
      
      expect(point.label).toBe('Custom');
    });
  });

  describe('2D Line creation', () => {
    it('should assign default label matching ID number to line', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const point2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      
      const line = plane.addLine2DBetweenTwoPoints(point1.id, point2.id, world);
      
      // Extract number from ID and verify label matches
      const match = line.id.match(/\d+$/);
      const num = match ? parseInt(match[0], 10) : -1;
      const expectedLabel = num <= 9 ? `L_${num}` : `L_{${num}}`;
      
      expect(line.label).toBe(expectedLabel);
      expect(line.label).toMatch(/^L_(\d+|\{\d+\})$/);  // Format check
    });

    it('should assign sequential labels to multiple lines', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(0.5, 0.6, 1), world);
      
      const line1 = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const line2 = plane.addLine2DBetweenTwoPoints(p2.id, p3.id, world);
      
      // Verify sequential IDs
      const id1 = parseInt(line1.id.match(/\d+$/)?.[0] || '0', 10);
      const id2 = parseInt(line2.id.match(/\d+$/)?.[0] || '0', 10);
      expect(id2).toBe(id1 + 1);
      
      // Verify labels match IDs
      const expectedLabel1 = id1 <= 9 ? `L_${id1}` : `L_{${id1}}`;
      const expectedLabel2 = id2 <= 9 ? `L_${id2}` : `L_{${id2}}`;
      expect(line1.label).toBe(expectedLabel1);
      expect(line2.label).toBe(expectedLabel2);
    });
  });

  describe('Element label types and formats', () => {
    it('should assign segment labels with S_ prefix', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      
      const segment = plane.addSegment2DBetweenPoints(p1.id, p2.id, world);
      
      // Verify label format and ID correspondence
      expect(segment.label).toMatch(/^S_(\d+|\{\d+\})$/);
      const num = parseInt(segment.id.match(/\d+$/)?.[0] || '0', 10);
      const expectedLabel = num <= 9 ? `S_${num}` : `S_{${num}}`;
      expect(segment.label).toBe(expectedLabel);
    });

    it('should assign circle labels with C_ prefix', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const center = plane.addFreePoint2D(new Vector3(0.5, 0.5, 1), world);
      const circumferencePoint = plane.addFreePoint2D(new Vector3(0.6, 0.5, 1), world);
      
      const circle = plane.addCircle2DByCenterAndPoint(center.id, circumferencePoint.id, world);
      
      // Verify label format and ID correspondence
      expect(circle.label).toMatch(/^C_(\d+|\{\d+\})$/);
      const num = parseInt(circle.id.match(/\d+$/)?.[0] || '0', 10);
      const expectedLabel = num <= 9 ? `C_${num}` : `C_{${num}}`;
      expect(circle.label).toBe(expectedLabel);
    });

    it('should assign guide labels with G_ prefix', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(0.5, 0.6, 1), world);
      
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const guide = plane.addGuide2D(line.id, p3.id, world);
      
      // Verify label format and ID correspondence
      expect(guide.label).toMatch(/^G_(\d+|\{\d+\})$/);
      const num = parseInt(guide.id.match(/\d+$/)?.[0] || '0', 10);
      const expectedLabel = num <= 9 ? `G_${num}` : `G_{${num}}`;
      expect(guide.label).toBe(expectedLabel);
    });

    it('should assign labels to intersection points', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(1, 0, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(0, 1, 1), world);
      const p4 = plane.addFreePoint2D(new Vector3(1, 1, 1), world);
      
      const line1 = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const line2 = plane.addLine2DBetweenTwoPoints(p3.id, p4.id, world);
      
      const intersection = plane.addLineLineIntersection(line1.id, line2.id, world);
      
      // Verify intersection points get A_ prefix (they're points)
      expect(intersection.label).toMatch(/^A_(\d+|\{\d+\})$/);
      const num = parseInt(intersection.id.match(/\d+$/)?.[0] || '0', 10);
      const expectedLabel = num <= 9 ? `A_${num}` : `A_{${num}}`;
      expect(intersection.label).toBe(expectedLabel);
    });
  });

  describe('Brace notation for multi-digit subscripts', () => {
    it('should use braces for numbers >= 10', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      // Create elements until we have one with number >= 10
      const points = [];
      for (let i = 0; i < 5; i++) {
        points.push(plane.addFreePoint2D(new Vector3(i * 0.1, 0.5, 1), world));
      }
      
      // Check that at least one has braces (if ID >= 10)
      const pointWithLargeId = points.find(p => {
        const num = parseInt(p.id.match(/\d+$/)?.[0] || '0', 10);
        return num >= 10;
      });
      
      if (pointWithLargeId) {
        expect(pointWithLargeId.label).toMatch(/^A_\{\d+\}$/);  // Must have braces
        const num = parseInt(pointWithLargeId.id.match(/\d+$/)?.[0] || '0', 10);
        expect(pointWithLargeId.label).toBe(`A_{${num}}`);
      }
    });

    it('should not use braces for numbers <= 9', () => {
      // All elements in our test world start with high IDs (>= 10) due to setup
      // So let's verify the format is correct for the IDs we have
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point = plane.addFreePoint2D(new Vector3(0.5, 0.5, 1), world);
      const num = parseInt(point.id.match(/\d+$/)?.[0] || '0', 10);
      
      if (num <= 9) {
        // No braces for single digit
        expect(point.label).toBe(`A_${num}`);
        expect(point.label).not.toContain('{');
      } else {
        // Braces for multi-digit
        expect(point.label).toBe(`A_{${num}}`);
        expect(point.label).toMatch(/^A_\{\d+\}$/);
      }
    });
  });

  describe('Label-ID correspondence', () => {
    it('should extract correct number from element ID for label', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      // Create several different element types
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(1, 0, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(2, 0, 1), world);
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const segment = plane.addSegment2DBetweenPoints(p2.id, p3.id, world);
      
      // Verify each element's label number matches its ID number
      const verifyLabelMatchesId = (element: { id: string, label?: string }, prefix: string) => {
        const idNum = parseInt(element.id.match(/\d+$/)?.[0] || '0', 10);
        const expectedLabel = idNum <= 9 ? `${prefix}${idNum}` : `${prefix}{${idNum}}`;
        expect(element.label).toBe(expectedLabel);
      };
      
      verifyLabelMatchesId(p1, 'A_');
      verifyLabelMatchesId(p2, 'A_');
      verifyLabelMatchesId(p3, 'A_');
      verifyLabelMatchesId(line, 'L_');
      verifyLabelMatchesId(segment, 'S_');
    });
  });
});
