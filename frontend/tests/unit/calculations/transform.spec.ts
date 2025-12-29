/**
 * transform.spec.ts
 * Unit tests for CoordinateTransform utilities
 * 
 * Tests cover:
 * - Plane intrinsic <u,v> ↔ Canvas (x,y) transformations
 * - Plane intrinsic → 3D transformations
 * - Matrix operations (translation, scale, viewport)
 * - Homogeneous coordinate operations per Constitution Principle V
 */

import { describe, it, expect } from 'vitest';
import {
  planeToCanvas,
  canvasToPlane,
  planeTo3D,
  createTranslationMatrix,
  createScaleMatrix,
  createViewportMatrix,
  multiplyMatrices,
  applyMatrix
} from '@/domain/calculations/CoordinateTransform';

describe('CoordinateTransform', () => {
  describe('planeToCanvas', () => {
    it('should transform P_H coordinates to canvas', () => {
      // P_H: origin at (400, 400), u→x, v→y
      const [x, y] = planeToCanvas(100, 50, 'plane_H', 400, 400);
      
      expect(x).toBe(500);  // 400 + 100
      expect(y).toBe(450);  // 400 + 50
    });

    it('should transform P_V coordinates to canvas with Z-flip', () => {
      // P_V: origin at (400, 400), u→x, v→-y (Z-up convention)
      const [x, y] = planeToCanvas(100, 50, 'plane_V', 400, 400);
      
      expect(x).toBe(500);  // 400 + 100
      expect(y).toBe(350);  // 400 - 50 (Z-up flips)
    });

    it('should handle negative coordinates', () => {
      const [x, y] = planeToCanvas(-50, -30, 'plane_H', 400, 400);
      
      expect(x).toBe(350);  // 400 - 50
      expect(y).toBe(370);  // 400 - 30
    });

    it('should handle custom canvas origin', () => {
      const [x, y] = planeToCanvas(10, 20, 'plane_H', 200, 300);
      
      expect(x).toBe(210);  // 200 + 10
      expect(y).toBe(320);  // 300 + 20
    });
  });

  describe('canvasToPlane', () => {
    it('should transform canvas coordinates to P_H', () => {
      const [u, v] = canvasToPlane(500, 450, 'plane_H', 400, 400);
      
      expect(u).toBe(100);  // 500 - 400
      expect(v).toBe(50);   // 450 - 400
    });

    it('should transform canvas coordinates to P_V with Z-flip', () => {
      const [u, v] = canvasToPlane(500, 350, 'plane_V', 400, 400);
      
      expect(u).toBe(100);  // 500 - 400
      expect(v).toBe(50);   // -(350 - 400) = 50 (Z-up flips)
    });

    it('should be inverse of planeToCanvas for P_H', () => {
      const originalU = 123;
      const originalV = -45;
      
      const [x, y] = planeToCanvas(originalU, originalV, 'plane_H');
      const [u, v] = canvasToPlane(x, y, 'plane_H');
      
      expect(u).toBeCloseTo(originalU);
      expect(v).toBeCloseTo(originalV);
    });

    it('should be inverse of planeToCanvas for P_V', () => {
      const originalU = 67;
      const originalV = 89;
      
      const [x, y] = planeToCanvas(originalU, originalV, 'plane_V');
      const [u, v] = canvasToPlane(x, y, 'plane_V');
      
      expect(u).toBeCloseTo(originalU);
      expect(v).toBeCloseTo(originalV);
    });
  });

  describe('planeTo3D', () => {
    it('should transform plane coordinates to 3D for P_H', () => {
      const coordinateSystem = {
        origin: [0, 0, 0, 1],
        uAxis: [1, 0, 0, 1],  // X-axis
        vAxis: [0, 1, 0, 1]   // Y-axis
      };
      
      const point3D = planeTo3D(100, 50, coordinateSystem);
      
      expect(point3D[0]).toBe(100);
      expect(point3D[1]).toBe(50);
      expect(point3D[2]).toBe(0);  // On Z=0 plane
    });

    it('should transform plane coordinates to 3D for P_V', () => {
      const coordinateSystem = {
        origin: [0, 0, 0, 1],
        uAxis: [1, 0, 0, 1],  // X-axis
        vAxis: [0, 0, 1, 1]   // Z-axis
      };
      
      const point3D = planeTo3D(100, 50, coordinateSystem);
      
      expect(point3D[0]).toBe(100);
      expect(point3D[1]).toBe(0);  // On Y=0 plane
      expect(point3D[2]).toBe(50);
    });

    it('should handle non-origin plane', () => {
      const coordinateSystem = {
        origin: [10, 20, 30, 1],
        uAxis: [1, 0, 0, 1],
        vAxis: [0, 1, 0, 1]
      };
      
      const point3D = planeTo3D(5, 3, coordinateSystem);
      
      expect(point3D[0]).toBe(15);  // 10 + 5*1
      expect(point3D[1]).toBe(23);  // 20 + 3*1
      expect(point3D[2]).toBe(30);  // 30 + 0
    });
  });

  describe('createTranslationMatrix', () => {
    it('should create translation matrix', () => {
      const matrix = createTranslationMatrix(10, 20);
      
      // Flat array format: [a, c, e, b, d, f]
      expect(matrix).toEqual([
        1, 0, 10,  // Row 1
        0, 1, 20   // Row 2
      ]);
    });

    it('should handle negative translations', () => {
      const matrix = createTranslationMatrix(-5, -10);
      
      expect(matrix[2]).toBe(-5);  // e (tx)
      expect(matrix[5]).toBe(-10); // f (ty)
    });
  });

  describe('createScaleMatrix', () => {
    it('should create scale matrix', () => {
      const matrix = createScaleMatrix(2, 3);
      
      // Flat array format: [a, c, e, b, d, f]
      expect(matrix).toEqual([
        2, 0, 0,  // Row 1
        0, 3, 0   // Row 2
      ]);
    });

    it('should handle uniform scaling', () => {
      const matrix = createScaleMatrix(1.5, 1.5);
      
      expect(matrix[0]).toBe(1.5);  // a (sx)
      expect(matrix[4]).toBe(1.5);  // d (sy)
    });
  });

  describe('createViewportMatrix', () => {
    it('should create viewport transformation matrix', () => {
      const matrix = createViewportMatrix(10, 20, 1.5);
      
      // Should combine scale and translation
      // Flat array: [a, c, e, b, d, f]
      expect(matrix[0]).toBe(1.5);  // a = scale X
      expect(matrix[4]).toBe(1.5);  // d = scale Y
      expect(matrix[2]).toBe(10);   // e = translate X
      expect(matrix[5]).toBe(20);   // f = translate Y
    });

    it('should handle identity viewport (no transform)', () => {
      const matrix = createViewportMatrix(0, 0, 1);
      
      expect(matrix).toEqual([
        1, 0, 0,  // Row 1
        0, 1, 0   // Row 2
      ]);
    });
  });

  describe('multiplyMatrices', () => {
    it('should multiply two matrices', () => {
      // m1 = scale by 2
      const m1 = [
        2, 0, 0,
        0, 2, 0
      ];
      // m2 = translate by (10, 20)
      const m2 = [
        1, 0, 10,
        0, 1, 20
      ];
      
      const result = multiplyMatrices(m1, m2);
      
      // Result should be scale * translate
      expect(result[0]).toBe(2);   // a = 2
      expect(result[4]).toBe(2);   // d = 2
      expect(result[2]).toBe(20);  // e = 2 * 10
      expect(result[5]).toBe(40);  // f = 2 * 20
    });

    it('should be associative', () => {
      const m1 = createScaleMatrix(2, 2);
      const m2 = createTranslationMatrix(5, 10);
      const m3 = createScaleMatrix(1.5, 1.5);
      
      const result1 = multiplyMatrices(multiplyMatrices(m1, m2), m3);
      const result2 = multiplyMatrices(m1, multiplyMatrices(m2, m3));
      
      // Results should be equal (within floating point precision)
      for (let i = 0; i < 6; i++) {
        expect(result1[i]).toBeCloseTo(result2[i]);
      }
    });
  });

  describe('applyMatrix', () => {
    it('should apply translation matrix to point', () => {
      const matrix = createTranslationMatrix(10, 20);
      const [x, y] = applyMatrix(matrix, 5, 3);
      
      expect(x).toBe(15);  // 5 + 10
      expect(y).toBe(23);  // 3 + 20
    });

    it('should apply scale matrix to point', () => {
      const matrix = createScaleMatrix(2, 3);
      const [x, y] = applyMatrix(matrix, 4, 5);
      
      expect(x).toBe(8);   // 4 * 2
      expect(y).toBe(15);  // 5 * 3
    });

    it('should apply combined transformation', () => {
      const scale = createScaleMatrix(2, 2);
      const translate = createTranslationMatrix(10, 20);
      const combined = multiplyMatrices(translate, scale);
      
      const [x, y] = applyMatrix(combined, 5, 3);
      
      expect(x).toBe(20);  // (5 * 2) + 10
      expect(y).toBe(26);  // (3 * 2) + 20
    });

    it('should handle homogeneous coordinates correctly', () => {
      // Custom matrix [2, 0, 5, 0, 3, 10]
      const matrix: [number, number, number, number, number, number] = [
        2, 0, 5,
        0, 3, 10
      ];
      
      const [x, y] = applyMatrix(matrix, 1, 1);
      
      expect(x).toBe(7);   // 2*1 + 0*1 + 5
      expect(y).toBe(13);  // 0*1 + 3*1 + 10
    });
  });

  describe('transformation pipeline', () => {
    it('should correctly chain plane → canvas → viewport', () => {
      // 1. Start with plane coordinates
      const u = 50;
      const v = 30;
      
      // 2. Transform to canvas
      const [canvasX, canvasY] = planeToCanvas(u, v, 'plane_H', 400, 400);
      
      // 3. Apply viewport transform (pan and zoom)
      const viewportMatrix = createViewportMatrix(20, 10, 1.5);
      const [finalX, finalY] = applyMatrix(viewportMatrix, canvasX, canvasY);
      
      // Verify transformations
      expect(canvasX).toBe(450);  // 400 + 50
      expect(canvasY).toBe(430);  // 400 + 30
      expect(finalX).toBe(695);   // (450 * 1.5) + 20
      expect(finalY).toBe(655);   // (430 * 1.5) + 10
    });

    it('should round-trip canvas → plane → canvas', () => {
      const originalX = 567;
      const originalY = 234;
      
      // Canvas → Plane
      const [u, v] = canvasToPlane(originalX, originalY, 'plane_H', 400, 400);
      
      // Plane → Canvas
      const [x, y] = planeToCanvas(u, v, 'plane_H', 400, 400);
      
      expect(x).toBe(originalX);
      expect(y).toBe(originalY);
    });
  });
});
