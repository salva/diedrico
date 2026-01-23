import { describe, it, expect } from 'vitest';
import { Matrix4x3, applyMatrix4x3 } from '../../src/utils/threeUtils';
import { Vector3, Vector4 } from 'three';

/**
 * Test Matrix4x3 transformations for projection planes
 * 
 * Verifies that matrix transformation matches manual vector arithmetic:
 * point_3d = origin_3d + u * u_3d + v * v_3d
 */
describe('ProjectionPlane Matrix4x3 Transformations', () => {
  
  it('should transform 2D point (1, 2, 1) correctly using matrix', () => {
    // Define a simple coordinate system in 3D
    const u_3d = new Vector3(1, 0, 0);      // U along X axis
    const v_3d = new Vector3(0, 1, 0);      // V along Y axis
    const origin_3d = new Vector3(5, 10, 0); // Origin at (5, 10, 0)
    
    // Build Matrix4x3 using same construction as projectionPlaneUtils.ts
    const matrix = new Matrix4x3();
    matrix.set(
      u_3d.x, v_3d.x, origin_3d.x,  // Row 0: x component
      u_3d.y, v_3d.y, origin_3d.y,  // Row 1: y component
      u_3d.z, v_3d.z, origin_3d.z,  // Row 2: z component
      0,      0,      1              // Row 3: w component
    );
    
    // Transform 2D point (u=1, v=2, w=1)
    const point2D = new Vector3(1, 2, 1);
    const result = applyMatrix4x3(point2D, matrix);
    
    // Manual calculation: origin + 1*u_3d + 2*v_3d
    const expected = new Vector3(
      origin_3d.x + 1 * u_3d.x + 2 * v_3d.x,
      origin_3d.y + 1 * u_3d.y + 2 * v_3d.y,
      origin_3d.z + 1 * u_3d.z + 2 * v_3d.z
    );
    const expectedHomogeneous = new Vector4(expected.x, expected.y, expected.z, 1);
    
    expect(result.x).toBeCloseTo(expectedHomogeneous.x);
    expect(result.y).toBeCloseTo(expectedHomogeneous.y);
    expect(result.z).toBeCloseTo(expectedHomogeneous.z);
    expect(result.w).toBeCloseTo(expectedHomogeneous.w);
    
    // Verify the actual result
    expect(result.x).toBeCloseTo(6);   // 5 + 1*1 + 2*0 = 6
    expect(result.y).toBeCloseTo(12);  // 10 + 1*0 + 2*1 = 12
    expect(result.z).toBeCloseTo(0);   // 0 + 1*0 + 2*0 = 0
    expect(result.w).toBeCloseTo(1);
  });
  
  it('should transform 2D point (-2, 3, 1) correctly using matrix', () => {
    // Define a simple coordinate system in 3D
    const u_3d = new Vector3(1, 0, 0);
    const v_3d = new Vector3(0, 1, 0);
    const origin_3d = new Vector3(5, 10, 0);
    
    // Build matrix
    const matrix = new Matrix4x3();
    matrix.set(
      u_3d.x, v_3d.x, origin_3d.x,
      u_3d.y, v_3d.y, origin_3d.y,
      u_3d.z, v_3d.z, origin_3d.z,
      0,      0,      1
    );
    
    // Transform 2D point (u=-2, v=3, w=1)
    const point2D = new Vector3(-2, 3, 1);
    const result = applyMatrix4x3(point2D, matrix);
    
    // Manual calculation: origin + (-2)*u_3d + 3*v_3d
    const expected = new Vector3(
      origin_3d.x + (-2) * u_3d.x + 3 * v_3d.x,
      origin_3d.y + (-2) * u_3d.y + 3 * v_3d.y,
      origin_3d.z + (-2) * u_3d.z + 3 * v_3d.z
    );
    const expectedHomogeneous = new Vector4(expected.x, expected.y, expected.z, 1);
    
    expect(result.x).toBeCloseTo(expectedHomogeneous.x);
    expect(result.y).toBeCloseTo(expectedHomogeneous.y);
    expect(result.z).toBeCloseTo(expectedHomogeneous.z);
    expect(result.w).toBeCloseTo(expectedHomogeneous.w);
    
    // Verify the actual result
    expect(result.x).toBeCloseTo(3);   // 5 + (-2)*1 + 3*0 = 3
    expect(result.y).toBeCloseTo(13);  // 10 + (-2)*0 + 3*1 = 13
    expect(result.z).toBeCloseTo(0);   // 0 + (-2)*0 + 3*0 = 0
    expect(result.w).toBeCloseTo(1);
  });
  
  it('should transform 2D direction (1, 2, 0) correctly (w=0)', () => {
    // Define coordinate system
    const u_3d = new Vector3(1, 0, 0);
    const v_3d = new Vector3(0, 1, 0);
    const origin_3d = new Vector3(5, 10, 0);
    
    // Build matrix
    const matrix = new Matrix4x3();
    matrix.set(
      u_3d.x, v_3d.x, origin_3d.x,
      u_3d.y, v_3d.y, origin_3d.y,
      u_3d.z, v_3d.z, origin_3d.z,
      0,      0,      1
    );
    
    // Transform 2D direction (u=1, v=2, w=0) - no translation!
    const direction2D = new Vector3(1, 2, 0);
    const result = applyMatrix4x3(direction2D, matrix);
    
    // Manual calculation: 1*u_3d + 2*v_3d (origin should NOT contribute!)
    const expected = new Vector3(
      1 * u_3d.x + 2 * v_3d.x,
      1 * u_3d.y + 2 * v_3d.y,
      1 * u_3d.z + 2 * v_3d.z
    );
    const expectedHomogeneous = new Vector4(expected.x, expected.y, expected.z, 0);
    
    expect(result.x).toBeCloseTo(expectedHomogeneous.x);
    expect(result.y).toBeCloseTo(expectedHomogeneous.y);
    expect(result.z).toBeCloseTo(expectedHomogeneous.z);
    expect(result.w).toBeCloseTo(expectedHomogeneous.w);
    
    // Verify the actual result (no origin offset!)
    expect(result.x).toBeCloseTo(1);   // 1*1 + 2*0 = 1
    expect(result.y).toBeCloseTo(2);   // 1*0 + 2*1 = 2
    expect(result.z).toBeCloseTo(0);   // 1*0 + 2*0 = 0
    expect(result.w).toBeCloseTo(0);   // Direction vector
  });
  
  it('should work with non-orthogonal oblique coordinate system', () => {
    // Define oblique coordinate system (like auxiliary plane)
    const u_3d = new Vector3(0.894, -0.447, 0).normalize();
    const v_3d = new Vector3(0.183, 0.365, -0.913).normalize();
    const origin_3d = new Vector3(20, 0, 0);
    
    // Build matrix
    const matrix = new Matrix4x3();
    matrix.set(
      u_3d.x, v_3d.x, origin_3d.x,
      u_3d.y, v_3d.y, origin_3d.y,
      u_3d.z, v_3d.z, origin_3d.z,
      0,      0,      1
    );
    
    // Transform point (u=1, v=2, w=1)
    const point2D = new Vector3(1, 2, 1);
    const result = applyMatrix4x3(point2D, matrix);
    
    // Manual calculation
    const u_normalized = new Vector3(0.894, -0.447, 0).normalize();
    const v_normalized = new Vector3(0.183, 0.365, -0.913).normalize();
    
    const expected = new Vector3(
      origin_3d.x + 1 * u_normalized.x + 2 * v_normalized.x,
      origin_3d.y + 1 * u_normalized.y + 2 * v_normalized.y,
      origin_3d.z + 1 * u_normalized.z + 2 * v_normalized.z
    );
    
    expect(result.x).toBeCloseTo(expected.x, 5);
    expect(result.y).toBeCloseTo(expected.y, 5);
    expect(result.z).toBeCloseTo(expected.z, 5);
    expect(result.w).toBeCloseTo(1);
  });
  
  it('should correctly extract U, V, origin from matrix (like ThreeView does)', () => {
    // Define coordinate system
    const u_3d = new Vector3(0.894, -0.447, 0);
    const v_3d = new Vector3(0.183, 0.365, -0.913);
    const origin_3d = new Vector3(20, 0, 0);
    
    // Build matrix
    const matrix = new Matrix4x3();
    matrix.set(
      u_3d.x, v_3d.x, origin_3d.x,
      u_3d.y, v_3d.y, origin_3d.y,
      u_3d.z, v_3d.z, origin_3d.z,
      0,      0,      1
    );
    
    // Extract like ThreeView.vue does (row-major storage)
    const e = matrix.elements;
    const Ux = e[0], Uy = e[3], Uz = e[6];  // First column
    const Vx = e[1], Vy = e[4], Vz = e[7];  // Second column
    const originW = e[11];
    const Ox = e[2] / originW;
    const Oy = e[5] / originW;
    const Oz = e[8] / originW;
    
    // Verify extraction is correct
    expect(Ux).toBeCloseTo(u_3d.x);
    expect(Uy).toBeCloseTo(u_3d.y);
    expect(Uz).toBeCloseTo(u_3d.z);
    
    expect(Vx).toBeCloseTo(v_3d.x);
    expect(Vy).toBeCloseTo(v_3d.y);
    expect(Vz).toBeCloseTo(v_3d.z);
    
    expect(Ox).toBeCloseTo(origin_3d.x);
    expect(Oy).toBeCloseTo(origin_3d.y);
    expect(Oz).toBeCloseTo(origin_3d.z);
  });
});
