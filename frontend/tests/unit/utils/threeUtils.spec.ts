import { describe, it, expect } from 'vitest';
import { 
  Matrix4x3, 
  Matrix3x4, 
  mat4x3, 
  mat3x4,
  applyMatrix4x3,
  applyMatrix3x4,
  vec3,
  vec4
} from '../../../src/utils/threeUtils';

describe('threeUtils', () => {
  describe('Matrix4x3', () => {
    it('should create identity-like 4x3 matrix', () => {
      const m = new Matrix4x3();
      expect(m.elements).toEqual([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        0, 0, 0
      ]);
    });

    it('should set elements', () => {
      const m = new Matrix4x3().set(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
        10, 11, 12
      );
      expect(m.elements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('should clone correctly', () => {
      const m1 = mat4x3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
        10, 11, 12
      );
      const m2 = m1.clone();
      
      expect(m2.elements).toEqual(m1.elements);
      expect(m2).not.toBe(m1);
      expect(m2.elements).not.toBe(m1.elements);
    });
  });

  describe('Matrix3x4', () => {
    it('should create identity-like 3x4 matrix', () => {
      const m = new Matrix3x4();
      expect(m.elements).toEqual([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0
      ]);
    });

    it('should set elements', () => {
      const m = new Matrix3x4().set(
        1, 2, 3, 4,
        5, 6, 7, 8,
        9, 10, 11, 12
      );
      expect(m.elements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('should clone correctly', () => {
      const m1 = mat3x4(
        1, 2, 3, 4,
        5, 6, 7, 8,
        9, 10, 11, 12
      );
      const m2 = m1.clone();
      
      expect(m2.elements).toEqual(m1.elements);
      expect(m2).not.toBe(m1);
      expect(m2.elements).not.toBe(m1.elements);
    });
  });

  describe('applyMatrix4x3', () => {
    it('should transform Vector3 to Vector4 using identity-like matrix', () => {
      const v = vec3(10, 20, 1);
      const m = new Matrix4x3(); // identity-like
      const result = applyMatrix4x3(v, m);
      
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
      expect(result.z).toBe(1);
      expect(result.w).toBe(0);
    });

    it('should transform Vector3 to Vector4 with custom matrix', () => {
      const v = vec3(2, 3, 1);
      // Scale by 2 in x, 3 in y, 4 in z, and set w to 1
      const m = mat4x3(
        2, 0, 0,
        0, 3, 0,
        0, 0, 4,
        0, 0, 1
      );
      const result = applyMatrix4x3(v, m);
      
      expect(result.x).toBe(4);   // 2*2
      expect(result.y).toBe(9);   // 3*3
      expect(result.z).toBe(4);   // 1*4
      expect(result.w).toBe(1);   // 1*1
    });

    it('should be non-destructive', () => {
      const v = vec3(10, 20, 1);
      const m = mat4x3(
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        0, 0, 0
      );
      const originalX = v.x;
      const originalY = v.y;
      const originalZ = v.z;
      
      applyMatrix4x3(v, m);
      
      expect(v.x).toBe(originalX);
      expect(v.y).toBe(originalY);
      expect(v.z).toBe(originalZ);
    });
  });

  describe('applyMatrix3x4', () => {
    it('should transform Vector4 to Vector3 using identity-like matrix', () => {
      const v = vec4(10, 20, 30, 1);
      const m = new Matrix3x4(); // identity-like
      const result = applyMatrix3x4(v, m);
      
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
      expect(result.z).toBe(30);
    });

    it('should transform Vector4 to Vector3 with custom matrix', () => {
      const v = vec4(2, 3, 4, 1);
      // Project to XY plane and add offset
      const m = mat3x4(
        1, 0, 0, 10,  // u = x + 10
        0, 1, 0, 20,  // v = y + 20
        0, 0, 0, 1    // w = 1
      );
      const result = applyMatrix3x4(v, m);
      
      expect(result.x).toBe(12);  // 2 + 10
      expect(result.y).toBe(23);  // 3 + 20
      expect(result.z).toBe(1);   // 1
    });

    it('should be non-destructive', () => {
      const v = vec4(10, 20, 30, 1);
      const m = mat3x4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0
      );
      const originalX = v.x;
      const originalY = v.y;
      const originalZ = v.z;
      const originalW = v.w;
      
      applyMatrix3x4(v, m);
      
      expect(v.x).toBe(originalX);
      expect(v.y).toBe(originalY);
      expect(v.z).toBe(originalZ);
      expect(v.w).toBe(originalW);
    });
  });

  describe('Composition: 2D → 3D → 2D round-trip', () => {
    it('should preserve coordinates through round-trip transformation', () => {
      // 2D point in plane coordinates
      const point2D = vec3(100, 50, 1);
      
      // Simple reconstruction: map (u, v, 1) to (u, 0, v, 1)
      const reconstruction = mat4x3(
        1, 0, 0,  // x = u
        0, 0, 0,  // y = 0
        0, 1, 0,  // z = v
        0, 0, 1   // w = 1
      );
      
      // Transform to 3D
      const point3D = applyMatrix4x3(point2D, reconstruction);
      expect(point3D.x).toBe(100);
      expect(point3D.y).toBe(0);
      expect(point3D.z).toBe(50);
      expect(point3D.w).toBe(1);
      
      // Project back to 2D: map (x, y, z, w) to (x, z, 1)
      const projection = mat3x4(
        1, 0, 0, 0,  // u = x
        0, 0, 1, 0,  // v = z
        0, 0, 0, 1   // w = 1
      );
      
      const point2DAgain = applyMatrix3x4(point3D, projection);
      expect(point2DAgain.x).toBe(100);
      expect(point2DAgain.y).toBe(50);
      expect(point2DAgain.z).toBe(1);
    });
  });
});
