/**
 * plane.spec.ts
 * Unit tests for Plane3D class
 * 
 * Tests cover:
 * - Plane3DFixed construction
 * - Boundary setting and getters
 * - Coordinate system setup
 * - Point containment checks
 * 
 * Note: Plane3D is now abstract. Use Plane3DFixed for testing.
 * Static methods createPH/createPV removed - planes created via initialization ops.
 */

import { describe, it, expect } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { Plane3DFixed, Plane3DFromTraces } from "@/domain/world/Plane";
import { Plane3DRealization3D } from "@/domain/world/Element3DRealization3D";
import { World } from "@/domain/world/World";
import { Matrix4x3 } from "@/utils/threeUtils";

describe('Plane3DFixed', () => {
  describe('constructor', () => {
    it('should create a plane with point and normal', () => {
      const plane = new Plane3DFixed(
        'test_plane_1',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );

      expect(plane.point.x).toBe(0);
      expect(plane.point.y).toBe(0);
      expect(plane.point.z).toBe(0);
      expect(plane.point.w).toBe(1);
      expect(plane.normal.x).toBe(0);
      expect(plane.normal.y).toBe(0);
      expect(plane.normal.z).toBe(1);
      // expect(plane.type).toBe('projection'); // Type property removed
    });

    it('should normalize the normal vector', () => {
      const plane = new Plane3DFixed(
        'test_plane_2',
        new Vector4(0, 0, 0, 1),
        new Vector4(3, 0, 4, 0)  // Length 5, w=0 for direction
      );

      // Normal should be normalized to unit length
      expect(plane.normal.x).toBeCloseTo(0.6);  // 3/5
      expect(plane.normal.y).toBeCloseTo(0);
      expect(plane.normal.z).toBeCloseTo(0.8);  // 4/5
      expect(plane.normal.w).toBe(0);  // Direction vector
    });

    it('should throw error for zero normal vector', () => {
      expect(() => {
        new Plane3DFixed(
          'test_plane_3',
          new Vector4(0, 0, 0, 1),
          new Vector4(0, 0, 0, 1)  // Zero vector
        );
      }).toThrow('Cannot normalize zero vector');
    });

    it('should accept optional label', () => {
      const plane = new Plane3DFixed(
        'test_plane_4',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 1),
        'Test Plane3D'
      );

      expect(plane.label).toBe('Test Plane3D');
      // expect(plane.type).toBe('projection'); // Type property removed
    });
  });

  // Skip old createPH/createPV tests - these static methods were removed
  // Planes are now created via initialization operations
  describe.skip('createPH', () => {
    it('should create P_H horizontal projection plane', () => {
      const planeH = Plane3D.createPH();

      expect(planeH.point).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeH.normal).toEqual(new Vector4(0, 0, 1, 0));
      expect(planeH.label).toBe('P_H');
      // expect(planeH.type).toBe('projection'); // Type property removed
    });

    it('should set default boundaries for P_H', () => {
      const planeH = Plane3D.createPH();

      expect(planeH.minU).toBe(-400);
      expect(planeH.maxU).toBe(400);
      expect(planeH.minV).toBe(-400);
      expect(planeH.maxV).toBe(400);
    });

    it('should set coordinate system for P_H', () => {
      const planeH = Plane3D.createPH();

      expect(planeH.coordinateSystem).toBeDefined();
      expect(planeH.coordinateSystem?.origin).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeH.coordinateSystem?.uAxis).toEqual(new Vector4(1, 0, 0, 0));
      expect(planeH.coordinateSystem?.vAxis).toEqual(new Vector4(0, 1, 0, 0));
    });
  });

  describe.skip('createPV', () => {
    it('should create P_V vertical projection plane', () => {
      const planeV = Plane3D.createPV();

      expect(planeV.point).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeV.normal).toEqual(new Vector4(0, 1, 0, 0));
      expect(planeV.label).toBe('P_V');
      // expect(planeV.type).toBe('projection'); // Type property removed
    });

    it('should set default boundaries for P_V', () => {
      const planeV = Plane3D.createPV();

      expect(planeV.minU).toBe(-400);
      expect(planeV.maxU).toBe(400);
      expect(planeV.minV).toBe(-400);
      expect(planeV.maxV).toBe(400);
    });

    it('should set coordinate system for P_V', () => {
      const planeV = Plane3D.createPV();

      expect(planeV.coordinateSystem).toBeDefined();
      expect(planeV.coordinateSystem?.origin).toEqual(new Vector4(0, 0, 0, 1));
      expect(planeV.coordinateSystem?.uAxis).toEqual(new Vector4(1, 0, 0, 0));
      expect(planeV.coordinateSystem?.vAxis).toEqual(new Vector4(0, 0, 1, 0));
    });
  });

  describe('setBoundaries', () => {
    it('should set and get boundaries', () => {
      const plane = new Plane3DFixed(
        'test_plane_5',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );

      plane.setBoundaries(-100, 200, -150, 250);

      expect(plane.minU).toBe(-100);
      expect(plane.maxU).toBe(200);
      expect(plane.minV).toBe(-150);
      expect(plane.maxV).toBe(250);
    });

    it('should return default boundaries if not set', () => {
      const plane = new Plane3DFixed(
        'test_plane_6',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );

      // Default boundaries are -400 to 400
      expect(plane.minU).toBe(-400);
      expect(plane.maxU).toBe(400);
      expect(plane.minV).toBe(-400);
      expect(plane.maxV).toBe(400);
    });
  });

  describe('setCoordinateSystem', () => {
    it('should set coordinate system', () => {
      const plane = new Plane3DFixed(
        'test_plane_7',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );

      plane.setCoordinateSystem({
        origin: new Vector4(1, 2, 3, 1),
        uAxis: new Vector4(1, 0, 0, 0),
        vAxis: new Vector4(0, 1, 0, 0)
      });

      expect(plane.coordinateSystem?.origin).toEqual(new Vector4(1, 2, 3, 1));
      expect(plane.coordinateSystem?.uAxis).toEqual(new Vector4(1, 0, 0, 0));
      expect(plane.coordinateSystem?.vAxis).toEqual(new Vector4(0, 1, 0, 0));
    });
  });

  describe('containsPoint', () => {
    it('should return true for point on plane', () => {
      const plane = new Plane3DFixed(
        'test_plane_8',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)  // Z = 0 plane, normal direction
      );

      expect(plane.containsPoint(new Vector4(5, 3, 0, 1))).toBe(true);
      expect(plane.containsPoint(new Vector4(-10, 20, 0, 1))).toBe(true);
    });

    it('should return false for point not on plane', () => {
      const plane = new Plane3DFixed(
        'test_plane_9',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)  // Z = 0 plane, normal direction
      );

      expect(plane.containsPoint(new Vector4(0, 0, 1, 1))).toBe(false);
      expect(plane.containsPoint(new Vector4(5, 3, -2, 1))).toBe(false);
    });

    it('should use tolerance for near-plane points', () => {
      const plane = new Plane3DFixed(
        'test_plane_10',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)  // Z = 0 plane, normal direction
      );

      // Point very close to plane (within default tolerance)
      expect(plane.containsPoint(new Vector4(0, 0, 0.0000001, 1))).toBe(true);

      // Point outside tolerance
      expect(plane.containsPoint({ x: 0, y: 0, z: 0.001 }, 0.0001)).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create deep copy of plane', () => {
      const plane = new Plane3DFixed(
        'plane1',
        new Vector4(1, 2, 3, 1),
        new Vector4(0, 1, 0, 0),
        'Test'
      );
      plane.setBoundaries(-100, 100, -50, 50);
      plane.setCoordinateSystem({
        origin: new Vector4(0, 0, 0, 1),
        uAxis: new Vector4(1, 0, 0, 0),
        vAxis: new Vector4(0, 0, 1, 0)
      });

      const cloned = plane.clone();

      expect(cloned.id).toBe('plane1');
      expect(cloned.point).toEqual(plane.point);
      expect(cloned.normal).toEqual(plane.normal);
      expect(cloned.label).toBe('Test');
      expect(cloned.minU).toBe(-100);
      expect(cloned.coordinateSystem).toEqual(plane.coordinateSystem);
    });

    it('should create independent copy', () => {
      const plane = new Plane3DFixed(
        'plane2',
        new Vector4(0, 0, 0, 1),
        new Vector4(0, 0, 1, 0)
      );
      plane.setBoundaries(-100, 100, -100, 100);

      const cloned = plane.clone();
      cloned.setBoundaries(-200, 200, -200, 200);

      // Original should not be affected
      expect(plane.minU).toBe(-100);
      expect(plane.maxU).toBe(100);
      expect(cloned.minU).toBe(-200);
      expect(cloned.maxU).toBe(200);
    });
  });

  describe('realize3D', () => {
    describe('Plane3DFixed', () => {
      it('should compute plane equation for horizontal plane (z=0)', () => {
        // Horizontal plane: z = 0 → 0x + 0y + 1z + 0 = 0
        const plane = new Plane3DFixed(
          'plane_h',
          new Vector4(0, 0, 0, 1),  // Point at origin
          new Vector4(0, 0, 1, 0)   // Normal pointing up (Z-axis)
        );

        const realization = plane.realize3D();
        
        expect(realization).toBeInstanceOf(Plane3DRealization3D);
        expect(realization.normal.x).toBe(0);
        expect(realization.normal.y).toBe(0);
        expect(realization.normal.z).toBe(1);
        expect(Math.abs(realization.normal.w)).toBe(0);  // d = -(n·P) = -(0*0 + 0*0 + 1*0) = 0 (handle -0)
        expect(realization.isFeasible()).toBe(true);
      });

      it('should compute plane equation for vertical plane (y=0)', () => {
        // Vertical plane: y = 0 → 0x + 1y + 0z + 0 = 0
        const plane = new Plane3DFixed(
          'plane_v',
          new Vector4(0, 0, 0, 1),  // Point at origin
          new Vector4(0, 1, 0, 0)   // Normal pointing forward (Y-axis)
        );

        const realization = plane.realize3D();
        
        expect(realization).toBeInstanceOf(Plane3DRealization3D);
        expect(realization.normal.x).toBe(0);
        expect(realization.normal.y).toBe(1);
        expect(realization.normal.z).toBe(0);
        expect(Math.abs(realization.normal.w)).toBe(0);  // Handle -0 vs 0
        expect(realization.isFeasible()).toBe(true);
      });

      it('should compute plane equation for tilted plane', () => {
        // Plane through (1,2,3) with normal (1,1,1) normalized to (√3/3, √3/3, √3/3)
        // Equation: (1/√3)x + (1/√3)y + (1/√3)z = (1/√3)*1 + (1/√3)*2 + (1/√3)*3 = 6/√3 = 2√3
        // Or: (1/√3)x + (1/√3)y + (1/√3)z - 2√3 = 0
        const plane = new Plane3DFixed(
          'plane_tilted',
          new Vector4(1, 2, 3, 1),      // Point on plane
          new Vector4(1, 1, 1, 0)       // Normal (will be normalized)
        );

        const realization = plane.realize3D();
        
        // Normal should be normalized (1/√3, 1/√3, 1/√3)
        const sqrt3 = Math.sqrt(3);
        expect(realization.normal.x).toBeCloseTo(1/sqrt3, 5);
        expect(realization.normal.y).toBeCloseTo(1/sqrt3, 5);
        expect(realization.normal.z).toBeCloseTo(1/sqrt3, 5);
        
        // d = -n·P = -(1/√3 * 1 + 1/√3 * 2 + 1/√3 * 3) = -6/√3 = -2√3
        expect(realization.normal.w).toBeCloseTo(-2*sqrt3, 5);
        expect(realization.isFeasible()).toBe(true);
      });

      it('should compute plane equation for plane not through origin', () => {
        // Plane parallel to XY plane but at z=5
        // Equation: 0x + 0y + 1z - 5 = 0  →  z = 5
        const plane = new Plane3DFixed(
          'plane_offset',
          new Vector4(0, 0, 5, 1),  // Point at (0, 0, 5)
          new Vector4(0, 0, 1, 0)   // Normal pointing up
        );

        const realization = plane.realize3D();
        
        expect(realization.normal.x).toBe(0);
        expect(realization.normal.y).toBe(0);
        expect(realization.normal.z).toBe(1);
        // d = -n·P = -(0*0 + 0*0 + 1*5) = -5
        expect(realization.normal.w).toBe(-5);
        expect(realization.isFeasible()).toBe(true);
      });

      it('should verify point on plane satisfies equation', () => {
        const plane = new Plane3DFixed(
          'plane_test',
          new Vector4(1, 2, 3, 1),
          new Vector4(1, 1, 1, 0)
        );

        const realization = plane.realize3D();
        
        // Point (1,2,3) should be on the plane
        const testPoint = new Vector4(1, 2, 3, 1);
        const distanceToPlane = realization.evaluateAt(testPoint);
        expect(distanceToPlane).toBeCloseTo(0, 10);
      });

      it('should compute correct distance for point off plane', () => {
        // Horizontal plane at z=0
        const plane = new Plane3DFixed(
          'plane_h',
          new Vector4(0, 0, 0, 1),
          new Vector4(0, 0, 1, 0)
        );

        const realization = plane.realize3D();
        
        // Point at (0,0,5) should be distance 5 above plane
        const testPoint = new Vector4(0, 0, 5, 1);
        const signedDistance = realization.distanceToPoint(testPoint);
        expect(signedDistance).toBeCloseTo(5, 10);
        
        // Point at (0,0,-3) should be distance 3 below plane
        const testPoint2 = new Vector4(0, 0, -3, 1);
        const signedDistance2 = realization.distanceToPoint(testPoint2);
        expect(signedDistance2).toBeCloseTo(-3, 10);
      });

      it('should project point onto plane correctly', () => {
        // Horizontal plane at z=0
        const plane = new Plane3DFixed(
          'plane_h',
          new Vector4(0, 0, 0, 1),
          new Vector4(0, 0, 1, 0)
        );

        const realization = plane.realize3D();
        
        // Point (3, 4, 5) should project to (3, 4, 0)
        const testPoint = new Vector4(3, 4, 5, 1);
        const projected = realization.projectPoint(testPoint);
        
        expect(projected.x).toBeCloseTo(3, 10);
        expect(projected.y).toBeCloseTo(4, 10);
        expect(projected.z).toBeCloseTo(0, 10);
        expect(projected.w).toBe(1);
      });

      it('should handle plane with non-normalized normal', () => {
        // Normal (2, 0, 0) should be normalized to (1, 0, 0)
        // Plane at x=3: 1x + 0y + 0z - 3 = 0
        const plane = new Plane3DFixed(
          'plane_x3',
          new Vector4(3, 0, 0, 1),  // Point on plane
          new Vector4(2, 0, 0, 0)   // Non-unit normal (will be normalized)
        );

        const realization = plane.realize3D();
        
        // Normal should be normalized
        expect(realization.normal.x).toBeCloseTo(1, 10);
        expect(realization.normal.y).toBeCloseTo(0, 10);
        expect(realization.normal.z).toBeCloseTo(0, 10);
        
        // d = -n·P = -(1*3 + 0*0 + 0*0) = -3
        expect(realization.normal.w).toBeCloseTo(-3, 10);
      });
    });

    describe('Plane3DFromTraces', () => {
      it('should create plane with trace references', () => {
        const plane = new Plane3DFromTraces(
          'plane_from_traces',
          'Test Plane',
          'trace1_id',
          'trace2_id',
          'P_H',
          'P_V'
        );

        expect(plane.id).toBe('plane_from_traces');
        expect(plane.label).toBe('Test Plane');
        expect(plane.trace1).toBe('trace1_id');
        expect(plane.trace2).toBe('trace2_id');
        expect(plane.plane1Id).toBe('P_H');
        expect(plane.plane2Id).toBe('P_V');
        expect(plane.kind).toBe('Plane3DFromTraces');
      });

      it('should have dependencies on both traces and planes', () => {
        const plane = new Plane3DFromTraces(
          'plane_from_traces',
          'Test Plane',
          'trace1_id',
          'trace2_id',
          'P_H',
          'P_V'
        );

        const deps = plane.getDependencies();
        expect(deps).toContain('trace1_id');
        expect(deps).toContain('trace2_id');
        expect(deps).toContain('P_H');
        expect(deps).toContain('P_V');
        expect(deps.length).toBe(4);
      });

      it('should validate that traces are on different planes', () => {
        expect(Plane3DFromTraces.validateDifferentPlanes('P_H', 'P_V')).toBe(true);
        expect(Plane3DFromTraces.validateDifferentPlanes('P_H', 'P_H')).toBe(false);
        expect(Plane3DFromTraces.validateDifferentPlanes('P_V', 'P_V')).toBe(false);
      });

      it('should compute plane from two trace lines', () => {
        // Create mock world with trace lines
        // Line 1: along X axis on P_H plane (horizontal at z=0)
        // Line 2: along Z axis on P_V plane (vertical at y=0)
        const mockWorld = {
          getLine2D: (id: string) => {
            if (id === 'trace1_id') {
              return {
                planeId: 'P_H',
                realize2D: () => ({
                  point1: new Vector3(0, 0, 1),    // Origin in 2D (homogeneous)
                  point2: new Vector3(1, 0, 1),    // Along X in 2D
                  feasible: true
                })
              };
            } else if (id === 'trace2_id') {
              return {
                planeId: 'P_V',
                realize2D: () => ({
                  point1: new Vector3(0, 0, 1),    // Origin in 2D (homogeneous)
                  point2: new Vector3(0, 1, 1),    // Along Y (which maps to Z) in 2D
                  feasible: true
                })
              };
            }
            return null;
          },
          getProjectionPlaneById: (id: string) => {
            if (id === 'P_H' || id === 'P_V') {
              return { id };
            }
            return null;
          },
          getProjectionPlane3DRealization: (id: string) => {
            if (id === 'P_H') {
              // P_H maps (u,v,1) in 2D to (u, v, 0, 1) in 3D (horizontal plane at z=0)
              const matrix = new Matrix4x3();
              matrix.set(
                1, 0, 0,  // row 1: x = u
                0, 1, 0,  // row 2: y = v
                0, 0, 0,  // row 3: z = 0
                0, 0, 1   // row 4: w = 1
              );
              return { planeTo3D: matrix, feasible: true };
            } else if (id === 'P_V') {
              // P_V maps (u,v,1) in 2D to (u, 0, v, 1) in 3D (vertical plane at y=0)
              const matrix = new Matrix4x3();
              matrix.set(
                1, 0, 0,  // row 1: x = u
                0, 0, 0,  // row 2: y = 0
                0, 1, 0,  // row 3: z = v
                0, 0, 1   // row 4: w = 1
              );
              return { planeTo3D: matrix, feasible: true };
            }
            return null;
          }
        };

        const plane = new Plane3DFromTraces(
          'plane_from_traces',
          'Test Plane',
          'trace1_id',
          'trace2_id',
          'P_H',
          'P_V'
        );

        const realization = plane.realize3D(mockWorld);
        
        expect(realization).toBeInstanceOf(Plane3DRealization3D);
        expect(realization.isFeasible()).toBe(true);
        
        // Line 1 on P_H: (0,0,0) to (1,0,0) in 3D (along X axis)
        // Line 2 on P_V: (0,0,0) to (0,0,1) in 3D (along Z axis)
        // Cross product: (1,0,0) × (0,0,1) = (0, -1, 0)
        // Normal should be (0, ±1, 0) - perpendicular to both X and Z
        const normal = realization.getNormalVector();
        expect(Math.abs(normal.x)).toBeLessThan(0.01);
        expect(Math.abs(normal.y)).toBeCloseTo(1, 2);
        expect(Math.abs(normal.z)).toBeLessThan(0.01);
      });

      it('should clone with all properties', () => {
        const plane = new Plane3DFromTraces(
          'plane_from_traces',
          'Test Plane',
          'trace1_id',
          'trace2_id',
          'P_H',
          'P_V'
        );

        const cloned = plane.clone();
        
        expect(cloned.id).toBe(plane.id);
        expect(cloned.label).toBe(plane.label);
        expect(cloned.trace1).toBe(plane.trace1);
        expect(cloned.trace2).toBe(plane.trace2);
        expect(cloned.plane1Id).toBe(plane.plane1Id);
        expect(cloned.plane2Id).toBe(plane.plane2Id);
      });
    });
  });

  describe('Plane3DRealization3D', () => {
    it('should create realization with plane equation', () => {
      // Plane equation: 2x + 3y + 4z - 5 = 0
      const realization = new Plane3DRealization3D(
        new Vector4(2, 3, 4, -5)
      );

      expect(realization.normal.x).toBe(2);
      expect(realization.normal.y).toBe(3);
      expect(realization.normal.z).toBe(4);
      expect(realization.normal.w).toBe(-5);
      expect(realization.isFeasible()).toBe(true);
    });

    it('should extract normal vector without distance term', () => {
      const realization = new Plane3DRealization3D(
        new Vector4(2, 3, 4, -5)
      );

      const normalVector = realization.getNormalVector();
      
      expect(normalVector.x).toBe(2);
      expect(normalVector.y).toBe(3);
      expect(normalVector.z).toBe(4);
      expect(normalVector.w).toBe(0);  // Direction only, no translation
    });

    it('should evaluate plane equation at point', () => {
      // Plane: x + 2y + 3z - 10 = 0
      const realization = new Plane3DRealization3D(
        new Vector4(1, 2, 3, -10)
      );

      // Point (1, 2, 2): 1*1 + 2*2 + 3*2 - 10 = 1 + 4 + 6 - 10 = 1
      const result1 = realization.evaluateAt(new Vector4(1, 2, 2, 1));
      expect(result1).toBeCloseTo(1, 10);

      // Point (2, 2, 2): 1*2 + 2*2 + 3*2 - 10 = 2 + 4 + 6 - 10 = 2
      const result2 = realization.evaluateAt(new Vector4(2, 2, 2, 1));
      expect(result2).toBeCloseTo(2, 10);

      // Point on plane (0, 0, 10/3): 1*0 + 2*0 + 3*10/3 - 10 = 0
      const result3 = realization.evaluateAt(new Vector4(0, 0, 10/3, 1));
      expect(result3).toBeCloseTo(0, 10);
    });

    it('should compute signed distance to point', () => {
      // Horizontal plane: z = 0 → 0x + 0y + 1z + 0 = 0
      const realization = new Plane3DRealization3D(
        new Vector4(0, 0, 1, 0)
      );

      // Point above plane at (0, 0, 5)
      const dist1 = realization.distanceToPoint(new Vector4(0, 0, 5, 1));
      expect(dist1).toBeCloseTo(5, 10);

      // Point below plane at (0, 0, -3)
      const dist2 = realization.distanceToPoint(new Vector4(0, 0, -3, 1));
      expect(dist2).toBeCloseTo(-3, 10);

      // Point on plane
      const dist3 = realization.distanceToPoint(new Vector4(5, 5, 0, 1));
      expect(dist3).toBeCloseTo(0, 10);
    });

    it('should compute signed distance with non-normalized normal', () => {
      // Plane with non-unit normal: 2x + 0y + 0z - 6 = 0  →  x = 3
      // Normal magnitude = 2, so signed distance = evaluation / 2
      const realization = new Plane3DRealization3D(
        new Vector4(2, 0, 0, -6)
      );

      // Point at (5, 0, 0): evaluation = 2*5 - 6 = 4, distance = 4/2 = 2
      const dist = realization.distanceToPoint(new Vector4(5, 0, 0, 1));
      expect(dist).toBeCloseTo(2, 10);
    });

    it('should project point onto plane orthogonally', () => {
      // Vertical plane: y = 0
      const realization = new Plane3DRealization3D(
        new Vector4(0, 1, 0, 0)
      );

      // Point (3, 5, 7) should project to (3, 0, 7)
      const projected = realization.projectPoint(new Vector4(3, 5, 7, 1));
      
      expect(projected.x).toBeCloseTo(3, 10);
      expect(projected.y).toBeCloseTo(0, 10);
      expect(projected.z).toBeCloseTo(7, 10);
      expect(projected.w).toBe(1);
    });

    it('should project point onto tilted plane', () => {
      // Plane: x + y + z = 6 (normal = (1,1,1) normalized)
      const sqrt3 = Math.sqrt(3);
      const realization = new Plane3DRealization3D(
        new Vector4(1/sqrt3, 1/sqrt3, 1/sqrt3, -6/sqrt3)
      );

      // Point (0, 0, 0) projects to (2, 2, 2) on plane
      const projected = realization.projectPoint(new Vector4(0, 0, 0, 1));
      
      expect(projected.x).toBeCloseTo(2, 5);
      expect(projected.y).toBeCloseTo(2, 5);
      expect(projected.z).toBeCloseTo(2, 5);
      expect(projected.w).toBe(1);

      // Verify projected point is on plane
      const verification = realization.evaluateAt(projected);
      expect(verification).toBeCloseTo(0, 5);
    });

    it('should handle infeasible plane realization', () => {
      const realization = new Plane3DRealization3D(
        new Vector4(0, 0, 1, 0),
        false  // Mark as infeasible
      );

      expect(realization.isFeasible()).toBe(false);
    });
  });
});
