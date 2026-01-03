/**
 * Unit Tests: Transport Calculations
 * 
 * Tests point transport geometric calculations between planes via guides.
 * Verifies homogeneous coordinate usage and principle-based algorithms.
 * 
 * Reference: specs/001-dihedral-learning-mvp/tasks.md - T124
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Transport Point via Guide
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  transportPointViaGuide,
  isGuidePerpendicular,
  validateTransportCompatibility
} from '../../../src/domain/calculations/Transport';
import { Line2DRealization2D } from '../../../src/domain/world/Line';
import { Guide2DRealization2D } from '../../../src/domain/world/Guide';

describe('Transport Calculations', () => {
  describe('transportPointViaGuide', () => {
    it('should transport a point along a perpendicular guide', () => {
      // Setup: Horizontal hinge line along X-axis (Y=0)
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),           // Point on line
        new Vector3(1, 0, 0)            // Direction (horizontal)
      );

      // Guide perpendicular to HL (vertical, along Y-axis)
      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),         // Point on guide (on the HL)
        new Vector3(0, 1, 0)            // Direction (vertical, perpendicular to HL)
      );

      // Source point above the HL at X=100, Y=50
      const sourcePoint = new Vector3(100, 50, 1);

      // Transport to target plane
      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      // Verify success
      expect(result.success).toBe(true);
      expect(result.transportedPosition).toBeDefined();

      // Verify transported point is at same distance below HL
      // (assuming dihedral convention: reflected across HL)
      expect(result.transportedPosition!.x).toBeCloseTo(100, 5);
      expect(result.transportedPosition!.y).toBeCloseTo(50, 5);  // Same signed distance
      expect(result.transportedPosition!.z).toBe(1);              // Homogeneous coordinate
    });

    it('should handle point not on guide by projecting onto guide', () => {
      // Hinge line along X-axis
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      // Guide at X=100, perpendicular to HL
      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(0, 1, 0)
      );

      // Source point offset from guide: X=120, Y=50
      const sourcePoint = new Vector3(120, 50, 1);

      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      // Should project point onto guide (X=100) then transport
      expect(result.success).toBe(true);
      expect(result.transportedPosition!.x).toBeCloseTo(100, 5);
      expect(result.transportedPosition!.y).toBeCloseTo(50, 5);
    });

    it('should reject invalid source point (direction vector)', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(0, 1, 0)
      );

      // Invalid: direction vector (z=0) instead of point (z=1)
      const directionVector = new Vector3(100, 50, 0);

      const result = transportPointViaGuide(
        directionVector,
        guide,
        hingeLine,
        'target_plane'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be a point');
    });

    it('should reject non-perpendicular guide', () => {
      // Hinge line along X-axis
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)            // Horizontal
      );

      // Guide NOT perpendicular (45-degree angle)
      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(1, 1, 0)            // Diagonal, not perpendicular
      );

      const sourcePoint = new Vector3(100, 50, 1);

      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not perpendicular');
    });

    it('should handle negative distances (point below hinge line)', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(0, 1, 0)
      );

      // Source point below HL
      const sourcePoint = new Vector3(100, -30, 1);

      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      expect(result.success).toBe(true);
      expect(result.transportedPosition!.x).toBeCloseTo(100, 5);
      expect(result.transportedPosition!.y).toBeCloseTo(-30, 5);  // Negative distance preserved
    });

    it('should work with arbitrary guide orientation', () => {
      // Diagonal hinge line
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0).normalize()  // 45-degree line
      );

      // Guide perpendicular to diagonal HL
      // Perpendicular to (1,1) is (-1,1) or (1,-1)
      const guide = new Guide2DRealization2D(
        new Vector3(50, 50, 1),           // Point on HL
        new Vector3(-1, 1, 0).normalize() // Perpendicular direction
      );

      const sourcePoint = new Vector3(60, 40, 1);

      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      expect(result.success).toBe(true);
      expect(result.transportedPosition).toBeDefined();
      // Actual coordinates depend on projection - just verify it succeeds
    });

    it('should normalize homogeneous coordinates', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(0, 1, 0)
      );

      // Source point with non-standard homogeneous coordinate
      const sourcePoint = new Vector3(200, 100, 2);  // Represents (100, 50) in Cartesian

      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      expect(result.success).toBe(true);
      // After normalization, should be same as (100, 50, 1)
      expect(result.transportedPosition!.x).toBeCloseTo(100, 5);
      expect(result.transportedPosition!.y).toBeCloseTo(50, 5);
      expect(result.transportedPosition!.z).toBe(1);
    });
  });

  describe('isGuidePerpendicular', () => {
    it('should return true for perpendicular guide and hinge line', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)  // Horizontal
      );

      const guide = new Guide2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(0, 1, 0)  // Vertical (perpendicular)
      );

      expect(isGuidePerpendicular(guide, hingeLine)).toBe(true);
    });

    it('should return false for non-perpendicular lines', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)  // Horizontal
      );

      const guide = new Guide2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0)  // 45-degree (not perpendicular)
      );

      expect(isGuidePerpendicular(guide, hingeLine)).toBe(false);
    });

    it('should handle custom tolerance', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      // Almost perpendicular (89.9 degrees)
      const almostPerpendicular = Math.PI / 2 - 0.001;  // Very close to 90°
      const guide = new Guide2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(Math.cos(almostPerpendicular), Math.sin(almostPerpendicular), 0)
      );

      // Default tolerance should accept
      expect(isGuidePerpendicular(guide, hingeLine)).toBe(true);

      // Stricter tolerance should reject
      expect(isGuidePerpendicular(guide, hingeLine, 0.0001)).toBe(false);
    });

    it('should work with arbitrary orientations', () => {
      // Diagonal hinge line
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 1, 0)  // 45-degree
      );

      // Perpendicular: rotate 90° → (-1, 1)
      const guide = new Guide2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(-1, 1, 0)
      );

      expect(isGuidePerpendicular(guide, hingeLine)).toBe(true);
    });
  });

  describe('validateTransportCompatibility', () => {
    it('should accept valid transport between different planes', () => {
      const result = validateTransportCompatibility(
        'plane_H',
        'plane_V',
        ['plane_H', 'plane_V']
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject transport to same plane', () => {
      const result = validateTransportCompatibility(
        'plane_H',
        'plane_H',  // Same as source
        ['plane_H', 'plane_V']
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be different');
    });

    it('should reject guide with wrong number of planes', () => {
      // Guide belongs to only 1 plane (invalid)
      const result = validateTransportCompatibility(
        'plane_H',
        'plane_V',
        ['plane_H']  // Missing plane_V
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exactly 2 planes');
    });

    it('should reject guide that does not connect source and target', () => {
      // Guide connects plane_H and plane_X, but we want plane_V
      const result = validateTransportCompatibility(
        'plane_H',
        'plane_V',
        ['plane_H', 'plane_X']  // Doesn't include plane_V
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must connect');
    });

    it('should accept auxiliary planes', () => {
      const result = validateTransportCompatibility(
        'plane_H',
        'plane_aux_1',
        ['plane_H', 'plane_aux_1']
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Constitution Compliance', () => {
    it('should use Three.js Vector3 for all coordinates (Principle V)', () => {
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(0, 1, 0)
      );

      const sourcePoint = new Vector3(100, 50, 1);

      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'target_plane'
      );

      // Verify result uses Vector3 (not arrays)
      expect(result.transportedPosition).toBeInstanceOf(Vector3);
      expect(result.transportedPosition!.isVector3).toBe(true);
    });

    it('should work with any plane configuration (Principle IV - no hardcoded cases)', () => {
      // Test with non-standard plane names
      const hingeLine = new Line2DRealization2D(
        new Vector3(0, 0, 1),
        new Vector3(1, 0, 0)
      );

      const guide = new Guide2DRealization2D(
        new Vector3(100, 0, 1),
        new Vector3(0, 1, 0)
      );

      const sourcePoint = new Vector3(100, 50, 1);

      // Use arbitrary plane name (not hardcoded P_H or P_V)
      const result = transportPointViaGuide(
        sourcePoint,
        guide,
        hingeLine,
        'custom_auxiliary_plane_42'
      );

      expect(result.success).toBe(true);
      // Algorithm should work regardless of plane naming
    });
  });
});
