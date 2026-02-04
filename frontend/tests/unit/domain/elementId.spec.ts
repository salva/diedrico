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
      const [containerId, localId] = parseElementId('projPlaneH/point2d1');
      expect(containerId).toBe('projPlaneH');
      expect(localId).toBe('point2d1');
    });

    it('should parse IDs with various element types', () => {
      expect(parseElementId('projPlaneV/line2d5')).toEqual(['projPlaneV', 'line2d5']);
      expect(parseElementId('projPlaneH/segment2d12')).toEqual(['projPlaneH', 'segment2d12']);
      expect(parseElementId('projPlaneV/circle2d3')).toEqual(['projPlaneV', 'circle2d3']);
      expect(parseElementId('projPlaneH/guide2d7')).toEqual(['projPlaneH', 'guide2d7']);
    });

    it('should parse IDs with underscores in components', () => {
      const [containerId, localId] = parseElementId('projPlanecustom123/point2d456');
      expect(containerId).toBe('projPlanecustom123');
      expect(localId).toBe('point2d456');
    });

    it('should throw on missing separator', () => {
      expect(() => parseElementId('projPlaneH')).toThrow(
        'Invalid element ID format: "projPlaneH". Expected format: "{containerId}/{localId}"'
      );
    });

    it('should throw on multiple separators', () => {
      expect(() => parseElementId('projPlaneH/point2d1/extra')).toThrow(
        'Invalid element ID format'
      );
    });

    it('should throw on empty container ID', () => {
      expect(() => parseElementId('/point2d1')).toThrow(
        'Both containerId and localId must be non-empty'
      );
    });

    it('should throw on empty local ID', () => {
      expect(() => parseElementId('projPlaneH/')).toThrow(
        'Both containerId and localId must be non-empty'
      );
    });

    it('should throw on empty string', () => {
      expect(() => parseElementId('')).toThrow('Invalid element ID format');
    });
  });

  describe('getContainerIdFromElementId', () => {
    it('should extract container ID from valid hierarchical ID', () => {
      expect(getContainerIdFromElementId('projPlaneH/point2d1')).toBe('projPlaneH');
      expect(getContainerIdFromElementId('projPlaneV/line2d5')).toBe('projPlaneV');
      expect(getContainerIdFromElementId('projPlanecustom/circle2d3')).toBe('projPlanecustom');
    });

    it('should throw on invalid ID format', () => {
      expect(() => getContainerIdFromElementId('invalid')).toThrow('Invalid element ID format');
    });
  });

  describe('getLocalIdFromElementId', () => {
    it('should extract local ID from valid hierarchical ID', () => {
      expect(getLocalIdFromElementId('projPlaneH/point2d1')).toBe('point2d1');
      expect(getLocalIdFromElementId('projPlaneV/line2d5')).toBe('line2d5');
      expect(getLocalIdFromElementId('projPlaneH/segment2d12')).toBe('segment2d12');
    });

    it('should throw on invalid ID format', () => {
      expect(() => getLocalIdFromElementId('invalid')).toThrow('Invalid element ID format');
    });
  });

  describe('buildElementId', () => {
    it('should build valid hierarchical ID from components', () => {
      expect(buildElementId('projPlaneH', 'point2d1')).toBe('projPlaneH/point2d1');
      expect(buildElementId('projPlaneV', 'line2d5')).toBe('projPlaneV/line2d5');
      expect(buildElementId('projPlanecustom', 'circle2d3')).toBe('projPlanecustom/circle2d3');
    });

    it('should throw on empty container ID', () => {
      expect(() => buildElementId('', 'point2d1')).toThrow(
        'Cannot build element ID: containerId="", localId="point2d1". Both must be non-empty.'
      );
    });

    it('should throw on empty local ID', () => {
      expect(() => buildElementId('projPlaneH', '')).toThrow(
        'Cannot build element ID: containerId="projPlaneH", localId="". Both must be non-empty.'
      );
    });

    it('should roundtrip with parseElementId', () => {
      const containerId = 'projPlaneH';
      const localId = 'point2d123';
      const id = buildElementId(containerId, localId);
      const [parsedContainer, parsedLocal] = parseElementId(id);
      
      expect(parsedContainer).toBe(containerId);
      expect(parsedLocal).toBe(localId);
    });
  });

  describe('validateElementId', () => {
    it('should pass validation when ID matches expected plane', () => {
      expect(() => validateElementId('projPlaneH/point2d1', 'projPlaneH')).not.toThrow();
      expect(() => validateElementId('projPlaneV/line2d5', 'projPlaneV')).not.toThrow();
      expect(() => validateElementId('projPlanecustom/circle2d3', 'projPlanecustom')).not.toThrow();
    });

    it('should throw when ID does not match expected plane', () => {
      expect(() => validateElementId('projPlaneH/point2d1', 'projPlaneV')).toThrow(
        'Element ID validation failed: element "projPlaneH/point2d1" claims to belong to plane "projPlaneH", ' +
        'but is being added to plane "projPlaneV"'
      );
    });

    it('should throw on invalid ID format', () => {
      expect(() => validateElementId('invalid', 'projPlaneH')).toThrow('Invalid element ID format');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: build, parse, validate', () => {
      const containerId = 'projPlaneH';
      const localId = 'point2d42';
      
      // Build
      const id = buildElementId(containerId, localId);
      expect(id).toBe('projPlaneH/point2d_42');
      
      // Parse
      const [parsedContainer, parsedLocal] = parseElementId(id);
      expect(parsedContainer).toBe(containerId);
      expect(parsedLocal).toBe(localId);
      
      // Extract individual components
      expect(getContainerIdFromElementId(id)).toBe(containerId);
      expect(getLocalIdFromElementId(id)).toBe(localId);
      
      // Validate
      expect(() => validateElementId(id, containerId)).not.toThrow();
      expect(() => validateElementId(id, 'projPlaneV')).toThrow();
    });

    it('should handle all element types', () => {
      const testCases = [
        { type: 'point2d', plane: 'projPlaneH' },
        { type: 'line2d', plane: 'projPlaneV' },
        { type: 'segment2d', plane: 'projPlaneH' },
        { type: 'circle2d', plane: 'projPlaneV' },
        { type: 'guide2d', plane: 'projPlaneH' }
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
