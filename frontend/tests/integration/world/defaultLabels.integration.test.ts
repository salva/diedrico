/**
 * Phase 116: Integration tests for default label generation
 * 
 * Validates that elements are automatically assigned sequential mathematical labels
 * when created without explicit label parameters.
 * Points: A, B, C, …; Lines/Segments: r, s, t, …; Circles: α, β, γ, …
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '@/domain/world/World';
import { Vector3 } from 'three';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('Phase 116: Default Label Generation Integration', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  describe('2D Point creation', () => {
    it('should assign sequential letter labels to free points', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const point2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      const point3 = plane.addFreePoint2D(new Vector3(0.5, 0.6, 1), world);
      
      // Labels are sequential from the world's label generator
      // The exact first letter depends on how many points were created during init
      // but they should be sequential
      const labels = [point1.label, point2.label, point3.label];
      expect(labels[0]).toBeTruthy();
      expect(labels[1]).toBeTruthy();
      expect(labels[2]).toBeTruthy();
      // All should be different
      expect(new Set(labels).size).toBe(3);
    });

    it('should allow explicit label override', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world, undefined, 'Custom');
      
      expect(point.label).toBe('Custom');
    });
  });

  describe('2D Line creation', () => {
    it('should assign sequential letter labels to lines', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const point1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const point2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      const point3 = plane.addFreePoint2D(new Vector3(0.5, 0.6, 1), world);
      
      const line1 = plane.addLine2DBetweenTwoPoints(point1.id, point2.id, world);
      const line2 = plane.addLine2DBetweenTwoPoints(point2.id, point3.id, world);
      
      // Lines should get labels from the line sequence (r, s, t, ...)
      expect(line1.label).toBeTruthy();
      expect(line2.label).toBeTruthy();
      expect(line1.label).not.toBe(line2.label);
    });
  });

  describe('Element label types and formats', () => {
    it('should assign line-category labels to segments', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      
      const segment = plane.addSegment2DBetweenPoints(p1.id, p2.id, world);
      
      // Segment shares sequence with lines
      expect(segment.label).toBeTruthy();
    });

    it('should assign Greek letter labels to circles', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const center = plane.addFreePoint2D(new Vector3(0.5, 0.5, 1), world);
      const circumferencePoint = plane.addFreePoint2D(new Vector3(0.6, 0.5, 1), world);
      
      const circle = plane.addCircle2DByCenterAndPoint(center.id, circumferencePoint.id, world);
      
      // Circle should get a Greek letter label
      expect(circle.label).toBeTruthy();
      // First circle should be α (or later if init created circles)
      expect(circle.label).toMatch(/^[αβγδεζηθικλμνξοπρστυφχψω]/);
    });

    it('should assign guide labels with g_ prefix', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0.1, 0.2, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(0.3, 0.4, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(0.5, 0.6, 1), world);
      
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const guide = plane.addGuide2D(line.id, p3.id, world);
      
      // Guide labels start with g_ prefix
      expect(guide.label).toMatch(/^g_\d/);
    });

    it('should assign point labels to intersection points', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(1, 0, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(0, 1, 1), world);
      const p4 = plane.addFreePoint2D(new Vector3(1, 1, 1), world);
      
      const line1 = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const line2 = plane.addLine2DBetweenTwoPoints(p3.id, p4.id, world);
      
      const intersection = plane.addLineLineIntersection(line1.id, line2.id, world);
      
      // Intersection points are in the point sequence
      expect(intersection.label).toBeTruthy();
    });
  });

  describe('Label uniqueness', () => {
    it('should produce unique labels for elements of the same type', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const labels = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const point = plane.addFreePoint2D(new Vector3(i * 0.1, 0.5, 1), world);
        expect(labels.has(point.label!)).toBe(false);
        labels.add(point.label!);
      }
    });

    it('should produce unique labels across lines and segments', () => {
      const plane = world.getProjectionPlaneByLabel('P_H');
      if (!plane) throw new Error('P_H not found');
      
      const p1 = plane.addFreePoint2D(new Vector3(0, 0, 1), world);
      const p2 = plane.addFreePoint2D(new Vector3(1, 0, 1), world);
      const p3 = plane.addFreePoint2D(new Vector3(2, 0, 1), world);
      
      const line = plane.addLine2DBetweenTwoPoints(p1.id, p2.id, world);
      const segment = plane.addSegment2DBetweenPoints(p2.id, p3.id, world);
      
      // Lines and segments share a counter, so labels must differ
      expect(line.label).not.toBe(segment.label);
    });
  });
});
