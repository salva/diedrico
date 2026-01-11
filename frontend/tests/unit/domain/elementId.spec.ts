/**
 * Unit tests for ElementId utilities (Phase 45)
 * 
 * Tests hierarchical ID parsing, building, and validation.
 * Format: {containerId}/{localId}
 */

import { describe, it, expect } from 'vitest';
import {
  parseElementId,
  getContainerIdFromElementId,
  getLocalIdFromElementId,
  buildElementId,
  validateElementId
} from '../../../src/domain/world/ElementId';

describe('ElementId Utilities', () => {
  describe('parseElementId', () => {
    it('should parse valid hierarchical ID', () => {
      const [containerId, localId] = parseElementId('proj_plane_H/point2d_1');
      expect(containerId).toBe('proj_plane_H');
      expect(localId).toBe('point2d_1');
    });

    it('should parse IDs with various element types', () => {
      expect(parseElementId('proj_plane_V/line2d_5')).toEqual(['proj_plane_V', 'line2d_5']);
      expect(parseElementId('proj_plane_H/segment2d_12')).toEqual(['proj_plane_H', 'segment2d_12']);
      expect(parseElementId('proj_plane_V/circle2d_3')).toEqual(['proj_plane_V', 'circle2d_3']);
      expect(parseElementId('proj_plane_H/guide2d_7')).toEqual(['proj_plane_H', 'guide2d_7']);
    });

    it('should parse IDs with underscores in components', () => {
      const [containerId, localId] = parseElementId('proj_plane_custom_123/point2d_456');
      expect(containerId).toBe('proj_plane_custom_123');
      expect(localId).toBe('point2d_456');
    });

    it('should throw on missing separator', () => {
      expect(() => parseElementId('proj_plane_H')).toThrow(
        'Invalid element ID format: "proj_plane_H". Expected format: "{containerId}/{localId}"'
      );
    });

    it('should throw on multiple separators', () => {
      expect(() => parseElementId('proj_plane_H/point2d_1/extra')).toThrow(
        'Invalid element ID format'
      );
    });

    it('should throw on empty container ID', () => {
      expect(() => parseElementId('/point2d_1')).toThrow(
        'Both containerId and localId must be non-empty'
      );
    });

    it('should throw on empty local ID', () => {
      expect(() => parseElementId('proj_plane_H/')).toThrow(
        'Both containerId and localId must be non-empty'
      );
    });

    it('should throw on empty string', () => {
      expect(() => parseElementId('')).toThrow('Invalid element ID format');
    });
  });

  describe('getContainerIdFromElementId', () => {
    it('should extract container ID from valid hierarchical ID', () => {
      expect(getContainerIdFromElementId('proj_plane_H/point2d_1')).toBe('proj_plane_H');
      expect(getContainerIdFromElementId('proj_plane_V/line2d_5')).toBe('proj_plane_V');
      expect(getContainerIdFromElementId('proj_plane_custom/circle2d_3')).toBe('proj_plane_custom');
    });

    it('should throw on invalid ID format', () => {
      expect(() => getContainerIdFromElementId('invalid')).toThrow('Invalid element ID format');
    });
  });

  describe('getLocalIdFromElementId', () => {
    it('should extract local ID from valid hierarchical ID', () => {
      expect(getLocalIdFromElementId('proj_plane_H/point2d_1')).toBe('point2d_1');
      expect(getLocalIdFromElementId('proj_plane_V/line2d_5')).toBe('line2d_5');
      expect(getLocalIdFromElementId('proj_plane_H/segment2d_12')).toBe('segment2d_12');
    });

    it('should throw on invalid ID format', () => {
      expect(() => getLocalIdFromElementId('invalid')).toThrow('Invalid element ID format');
    });
  });

  describe('buildElementId', () => {
    it('should build valid hierarchical ID from components', () => {
      expect(buildElementId('proj_plane_H', 'point2d_1')).toBe('proj_plane_H/point2d_1');
      expect(buildElementId('proj_plane_V', 'line2d_5')).toBe('proj_plane_V/line2d_5');
      expect(buildElementId('proj_plane_custom', 'circle2d_3')).toBe('proj_plane_custom/circle2d_3');
    });

    it('should throw on empty container ID', () => {
      expect(() => buildElementId('', 'point2d_1')).toThrow(
        'Cannot build element ID: containerId="", localId="point2d_1". Both must be non-empty.'
      );
    });

    it('should throw on empty local ID', () => {
      expect(() => buildElementId('proj_plane_H', '')).toThrow(
        'Cannot build element ID: containerId="proj_plane_H", localId="". Both must be non-empty.'
      );
    });

    it('should roundtrip with parseElementId', () => {
      const containerId = 'proj_plane_H';
      const localId = 'point2d_123';
      const id = buildElementId(containerId, localId);
      const [parsedContainer, parsedLocal] = parseElementId(id);
      
      expect(parsedContainer).toBe(containerId);
      expect(parsedLocal).toBe(localId);
    });
  });

  describe('validateElementId', () => {
    it('should pass validation when ID matches expected plane', () => {
      expect(() => validateElementId('proj_plane_H/point2d_1', 'proj_plane_H')).not.toThrow();
      expect(() => validateElementId('proj_plane_V/line2d_5', 'proj_plane_V')).not.toThrow();
      expect(() => validateElementId('proj_plane_custom/circle2d_3', 'proj_plane_custom')).not.toThrow();
    });

    it('should throw when ID does not match expected plane', () => {
      expect(() => validateElementId('proj_plane_H/point2d_1', 'proj_plane_V')).toThrow(
        'Element ID validation failed: element "proj_plane_H/point2d_1" claims to belong to plane "proj_plane_H", ' +
        'but is being added to plane "proj_plane_V"'
      );
    });

    it('should throw on invalid ID format', () => {
      expect(() => validateElementId('invalid', 'proj_plane_H')).toThrow('Invalid element ID format');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: build, parse, validate', () => {
      const containerId = 'proj_plane_H';
      const localId = 'point2d_42';
      
      // Build
      const id = buildElementId(containerId, localId);
      expect(id).toBe('proj_plane_H/point2d_42');
      
      // Parse
      const [parsedContainer, parsedLocal] = parseElementId(id);
      expect(parsedContainer).toBe(containerId);
      expect(parsedLocal).toBe(localId);
      
      // Extract individual components
      expect(getContainerIdFromElementId(id)).toBe(containerId);
      expect(getLocalIdFromElementId(id)).toBe(localId);
      
      // Validate
      expect(() => validateElementId(id, containerId)).not.toThrow();
      expect(() => validateElementId(id, 'proj_plane_V')).toThrow();
    });

    it('should handle all element types', () => {
      const testCases = [
        { type: 'point2d', plane: 'proj_plane_H' },
        { type: 'line2d', plane: 'proj_plane_V' },
        { type: 'segment2d', plane: 'proj_plane_H' },
        { type: 'circle2d', plane: 'proj_plane_V' },
        { type: 'guide2d', plane: 'proj_plane_H' }
      ];
      
      testCases.forEach(({ type, plane }) => {
        const localId = `${type}_123`;
        const id = buildElementId(plane, localId);
        
        expect(getContainerIdFromElementId(id)).toBe(plane);
        expect(getLocalIdFromElementId(id)).toBe(localId);
        expect(() => validateElementId(id, plane)).not.toThrow();
      });
    });
  });
});
