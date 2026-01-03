/**
 * coordinateTransform.spec.ts - Unit tests for coordinate transformation pipeline
 * 
 * Tests the complete transformation chain:
 * Screen → SVG → Paper → Plane (u,v) → 3D (x,y,z)
 * 
 * These transformations demonstrate the layered coordinate system architecture
 * and are critical for spatial understanding in the dihedral projection system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3, Vector4, Matrix3 } from 'three';
import {
  screenToSVG,
  svgToPaper,
  paperToPlane,
  planeTo3D,
  screenTo3D
} from '@/utils/coordinateTransform';
import { World } from '@/domain/world/World';
import { BaseProjectionPlane } from '@/domain/world/ProjectionPlane';

describe('Coordinate Transformation Pipeline', () => {
  describe('screenToSVG', () => {
    it('should convert screen coordinates to SVG coordinates', () => {
      // Create mock SVG element
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('viewBox', '0 0 1600 1000');
      
      // Mock getBoundingClientRect
      svgElement.getBoundingClientRect = () => ({
        left: 100,
        top: 50,
        width: 800,
        height: 500,
        right: 900,
        bottom: 550,
        x: 100,
        y: 50,
        toJSON: () => {}
      });
      
      // Test: screen (500, 300) should map to SVG coordinates
      const result = screenToSVG(500, 300, svgElement);
      
      expect(result).toBeInstanceOf(Vector3);
      expect(result.z).toBe(1); // Homogeneous coordinate
      
      // Screen (500, 300) relative to rect (100, 50) = (400, 250)
      // Scaled by viewBox (1600/800, 1000/500) = (800, 500)
      expect(result.x).toBeCloseTo(800);
      expect(result.y).toBeCloseTo(500);
    });
    
    it('should handle viewBox offset', () => {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('viewBox', '100 50 1600 1000');
      
      svgElement.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 500,
        right: 800,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => {}
      });
      
      const result = screenToSVG(400, 250, svgElement);
      
      // (400, 250) → (800, 500) + viewBox offset (100, 50) = (900, 550)
      expect(result.x).toBeCloseTo(900);
      expect(result.y).toBeCloseTo(550);
    });
  });
  
  describe('svgToPaper', () => {
    it('should apply inverse viewport transform (identity case)', () => {
      const svgPoint = new Vector3(800, 500, 1);
      const identityTransform = new Matrix3().identity();
      
      const result = svgToPaper(svgPoint, identityTransform);
      
      expect(result.x).toBeCloseTo(800);
      expect(result.y).toBeCloseTo(500);
      expect(result.z).toBe(1);
    });
    
    it('should apply inverse viewport transform (translation)', () => {
      const svgPoint = new Vector3(1000, 600, 1);
      
      // Viewport with translation (pan by 200, 100)
      const viewportTransform = new Matrix3().set(
        1, 0, 200,  // x' = x + 200
        0, 1, 100,  // y' = y + 100
        0, 0, 1
      );
      
      const result = svgToPaper(svgPoint, viewportTransform);
      
      // Inverse: (1000, 600) - (200, 100) = (800, 500)
      expect(result.x).toBeCloseTo(800);
      expect(result.y).toBeCloseTo(500);
    });
    
    it('should handle zoom transformation', () => {
      const svgPoint = new Vector3(1600, 1000, 1);
      
      // Viewport with 2x zoom
      const viewportTransform = new Matrix3().set(
        2, 0, 0,  // x' = 2x
        0, 2, 0,  // y' = 2y
        0, 0, 1
      );
      
      const result = svgToPaper(svgPoint, viewportTransform);
      
      // Inverse: (1600, 1000) / 2 = (800, 500)
      expect(result.x).toBeCloseTo(800);
      expect(result.y).toBeCloseTo(500);
    });
  });
  
  describe('paperToPlane', () => {
    let world: World;
    
    beforeEach(() => {
      world = new World();
      world.initializeFixedElements();
    });
    
    it('should convert paper coordinates to plane coordinates for P_H', () => {
      const paperPoint = new Vector3(800, 500, 1);
      
      const result = paperToPlane(paperPoint, 'proj_plane_H', world);
      
      expect(result).not.toBeNull();
      if (result) {
        // P_H transform: x' = u + 800, y' = -v + 500
        // Inverse: u = x' - 800, v = -(y' - 500)
        // (800, 500) → (0, 0) in plane coords
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(0);
        expect(result.z).toBe(1);
      }
    });
    
    it('should convert paper coordinates to plane coordinates for P_V', () => {
      const paperPoint = new Vector3(800, 500, 1);
      
      const result = paperToPlane(paperPoint, 'proj_plane_V', world);
      
      expect(result).not.toBeNull();
      if (result) {
        // P_V transform: x' = u + 800, y' = v + 500
        // Inverse: u = x' - 800, v = y' - 500
        // (800, 500) → (0, 0) in plane coords
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(0);
        expect(result.z).toBe(1);
      }
    });
    
    it('should return null for unknown plane', () => {
      const paperPoint = new Vector3(800, 500, 1);
      
      const result = paperToPlane(paperPoint, 'invalid_plane', world);
      
      expect(result).toBeNull();
    });
  });
  
  describe('planeTo3D', () => {
    let world: World;
    
    beforeEach(() => {
      world = new World();
      world.initializeFixedElements();
    });
    
    it('should convert P_H plane coordinates to 3D coordinates', () => {
      const planePoint = new Vector3(100, 50, 1);  // (u, v, 1)
      
      const result = planeTo3D(planePoint, 'proj_plane_H', world);
      
      expect(result).not.toBeNull();
      if (result) {
        // P_H: u→x, v→y, z=0, w=1 (homogeneous)
        // (100, 50, 1) in plane → (100, 50, 0, 1) in 3D homogeneous
        expect(result.x).toBeCloseTo(100);
        expect(result.y).toBeCloseTo(50);
        expect(result.z).toBeCloseTo(0);
        expect(result.w).toBeCloseTo(1);
      }
    });
    
    it('should convert P_V plane coordinates to 3D coordinates', () => {
      const planePoint = new Vector3(100, 50, 1);  // (u, v, 1)
      
      const result = planeTo3D(planePoint, 'proj_plane_V', world);
      
      expect(result).not.toBeNull();
      if (result) {
        // P_V: u→x, y=0, v→z, w=1 (homogeneous)
        // (100, 50, 1) in plane → (100, 0, 50, 1) in 3D homogeneous
        expect(result.x).toBeCloseTo(100);
        expect(result.y).toBeCloseTo(0);
        expect(result.z).toBeCloseTo(50);
        expect(result.w).toBeCloseTo(1);
      }
    });
    
    it('should return null for unknown plane', () => {
      const planePoint = new Vector3(100, 50, 1);
      
      const result = planeTo3D(planePoint, 'invalid_plane', world);
      
      expect(result).toBeNull();
    });
  });
  
  describe('screenTo3D (complete pipeline)', () => {
    let world: World;
    let svgElement: SVGSVGElement;
    
    beforeEach(() => {
      world = new World();
      world.initializeFixedElements();
      
      svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('viewBox', '0 0 1600 1000');
      
      svgElement.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 1600,
        height: 1000,
        right: 1600,
        bottom: 1000,
        x: 0,
        y: 0,
        toJSON: () => {}
      });
    });
    
    it('should transform screen coordinates to 3D for P_H (origin)', () => {
      const identityViewport = new Matrix3().identity();
      
      // Screen (800, 500) should map to origin in 3D space
      const result = screenTo3D(
        800, 500,
        svgElement,
        identityViewport,
        'proj_plane_H',
        world
      );
      
      expect(result.success).toBe(true);
      expect(result.coordinates).toBeDefined();
      if (result.coordinates) {
        expect(result.coordinates.x).toBeCloseTo(0);
        expect(result.coordinates.y).toBeCloseTo(0);
        expect(result.coordinates.z).toBeCloseTo(0);
      }
    });
    
    it('should transform screen coordinates to 3D for P_V (origin)', () => {
      const identityViewport = new Matrix3().identity();
      
      // Screen (800, 500) should map to origin in 3D space
      const result = screenTo3D(
        800, 500,
        svgElement,
        identityViewport,
        'proj_plane_V',
        world
      );
      
      expect(result.success).toBe(true);
      expect(result.coordinates).toBeDefined();
      if (result.coordinates) {
        expect(result.coordinates.x).toBeCloseTo(0);
        expect(result.coordinates.y).toBeCloseTo(0);
        expect(result.coordinates.z).toBeCloseTo(0);
      }
    });
    
    it('should handle errors gracefully for invalid plane', () => {
      const identityViewport = new Matrix3().identity();
      
      const result = screenTo3D(
        800, 500,
        svgElement,
        identityViewport,
        'invalid_plane',
        world
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
